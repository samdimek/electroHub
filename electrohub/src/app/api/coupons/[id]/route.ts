import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { couponSchema } from '@/lib/validation/coupon';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';

async function assertOwnership(userId: string, couponId: string, adminBypass: boolean) {
  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  if (!adminBypass && coupon.vendorId) {
    const vendor = await db.vendor.findFirst({ where: { id: coupon.vendorId, members: { some: { userId } } } });
    if (!vendor) throw new ApiError(403, 'You do not have access to this coupon');
  }
  return coupon;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PROMOTIONS_WRITE');
    await assertOwnership(user.id, params.id, isAdmin(user));

    const body = couponSchema.partial().parse(await request.json());
    const updated = await db.coupon.update({
      where: { id: params.id },
      data: {
        ...body,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    });

    await writeAuditLog({ actor: user, action: 'coupon.update', entityType: 'Coupon', entityId: updated.id, request });
    return ok(updated);
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PROMOTIONS_WRITE');
    await assertOwnership(user.id, params.id, isAdmin(user));

    const updated = await db.coupon.update({ where: { id: params.id }, data: { isActive: false } });
    await writeAuditLog({ actor: user, action: 'coupon.deactivate', entityType: 'Coupon', entityId: updated.id, request });
    return ok({ id: updated.id, isActive: updated.isActive });
  });
}
