import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { vendorRejectionSchema } from '@/lib/validation/vendor';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { emails } from '@/lib/email';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const admin = await requireUser();
    requirePermission(admin, 'VENDORS_APPROVE');
    const body = vendorRejectionSchema.parse(await request.json());

    const vendor = await db.vendor.findUnique({ where: { id: params.id } });
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const updated = await db.vendor.update({
      where: { id: vendor.id },
      data: { status: 'REJECTED', rejectionReason: body.reason },
    });

    await writeAuditLog({
      actor: admin,
      action: 'vendor.reject',
      entityType: 'Vendor',
      entityId: vendor.id,
      metadata: { reason: body.reason },
      request,
    });

    await emails.vendorRejected(vendor.businessEmail, vendor.storeName, body.reason);

    return ok({ id: updated.id, status: updated.status });
  });
}
