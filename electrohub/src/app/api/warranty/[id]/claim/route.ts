import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { warrantyClaimSchema } from '@/lib/validation/warranty';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const body = warrantyClaimSchema.parse({ ...(await request.json()), warrantyId: params.id });

    const warranty = await db.warranty.findUnique({ where: { id: params.id }, include: { order: true } });
    if (!warranty) throw new ApiError(404, 'Warranty not found');
    if (warranty.order.userId !== user.id) throw new ApiError(403, 'This warranty does not belong to your account');
    if (warranty.status === 'EXPIRED' || warranty.expiresAt < new Date()) {
      throw new ApiError(400, 'This warranty has expired');
    }
    if (warranty.status === 'VOID') throw new ApiError(400, 'This warranty is void');

    const claim = await db.warrantyClaim.create({
      data: { warrantyId: warranty.id, description: body.description },
    });
    await db.warranty.update({ where: { id: warranty.id }, data: { status: 'CLAIMED' } });

    await writeAuditLog({
      actor: user,
      action: 'warranty.claim_filed',
      entityType: 'WarrantyClaim',
      entityId: claim.id,
      metadata: { warrantyId: warranty.id },
      request,
    });

    return ok(claim, 201);
  });
}
