import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { couponSchema } from '@/lib/validation/coupon';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PROMOTIONS_WRITE');

    const where = isAdmin(user)
      ? {}
      : { vendorId: (await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } }))?.id ?? 'never' };

    const coupons = await db.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
    return ok(coupons);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PROMOTIONS_WRITE');
    const body = couponSchema.parse(await request.json());

    const vendor = isAdmin(user) ? null : await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });
    if (!isAdmin(user) && !vendor) throw new ApiError(400, 'No vendor store associated with this account');

    const existing = await db.coupon.findUnique({ where: { code: body.code } });
    if (existing) throw new ApiError(409, 'Coupon code already exists');

    const coupon = await db.coupon.create({
      data: {
        ...body,
        vendorId: vendor?.id,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    });

    await writeAuditLog({
      actor: user,
      action: 'coupon.create',
      entityType: 'Coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code },
      request,
    });

    return ok(coupon, 201);
  });
}
