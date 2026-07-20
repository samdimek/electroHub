import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { warrantyClaimUpdateSchema } from '@/lib/validation/warranty';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'WARRANTY_WRITE');
    const body = warrantyClaimUpdateSchema.parse(await request.json());

    const claim = await db.warrantyClaim.findUnique({
      where: { id: params.id },
      include: { warranty: { include: { product: { include: { vendor: { include: { members: true } } } } } } },
    });
    if (!claim) throw new ApiError(404, 'Claim not found');

    if (!isAdmin(user) && !claim.warranty.product.vendor.members.some((m) => m.userId === user.id)) {
      throw new ApiError(403, 'You do not have access to this claim');
    }

    const updated = await db.warrantyClaim.update({
      where: { id: params.id },
      data: { status: body.status, resolution: body.resolution },
    });

    if (body.status === 'RESOLVED' || body.status === 'REJECTED') {
      await db.warranty.update({
        where: { id: claim.warrantyId },
        data: { status: body.status === 'RESOLVED' ? 'ACTIVE' : 'VOID' },
      });
    }

    await writeAuditLog({
      actor: user,
      action: 'warranty.claim_update',
      entityType: 'WarrantyClaim',
      entityId: updated.id,
      metadata: { status: body.status },
      request,
    });

    return ok(updated);
  });
}
