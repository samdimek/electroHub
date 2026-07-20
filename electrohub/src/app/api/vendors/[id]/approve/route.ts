import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { emails } from '@/lib/email';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const admin = await requireUser();
    requirePermission(admin, 'VENDORS_APPROVE');

    const vendor = await db.vendor.findUnique({ where: { id: params.id }, include: { categories: { include: { category: true } } } });
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    // Defense in depth: re-verify electronics-only at approval time too,
    // in case categories were edited after the original application.
    const hasNonElectronics = vendor.categories.some((vc) => !vc.category.isElectronics);
    if (hasNonElectronics) {
      throw new ApiError(400, 'This vendor has a non-electronics category and cannot be approved');
    }

    const updated = await db.vendor.update({
      where: { id: vendor.id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedById: admin.id, rejectionReason: null },
    });

    await writeAuditLog({
      actor: admin,
      action: 'vendor.approve',
      entityType: 'Vendor',
      entityId: vendor.id,
      request,
    });

    await emails.vendorApproved(vendor.businessEmail, vendor.storeName);

    return ok({ id: updated.id, status: updated.status });
  });
}
