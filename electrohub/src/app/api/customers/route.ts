import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'CUSTOMERS_READ');

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = 25;

    const where = {
      role: 'CUSTOMER' as const,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { name: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    // Order totals aren't in the User row, so pull them in one grouped query.
    const orderTotals = await db.order.groupBy({
      by: ['userId'],
      where: { userId: { in: customers.map((c) => c.id) }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      _sum: { totalCents: true },
    });
    const totalsByUser = new Map(orderTotals.map((t) => [t.userId, t._sum.totalCents ?? 0]));

    const enriched = customers.map((c) => ({ ...c, lifetimeValueCents: totalsByUser.get(c.id) ?? 0 }));

    return ok({ customers: enriched, total, page, pageSize });
  });
}

/** Admin can suspend/reactivate a customer account. */
export async function PATCH(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const admin = await requireUser();
    requirePermission(admin, 'CUSTOMERS_WRITE');
    const { userId, isActive } = await request.json();
    if (typeof userId !== 'string' || typeof isActive !== 'boolean') {
      throw new ApiError(400, 'userId and isActive are required');
    }

    const updated = await db.user.update({ where: { id: userId }, data: { isActive } });

    await writeAuditLog({
      actor: admin,
      action: isActive ? 'customer.reactivate' : 'customer.suspend',
      entityType: 'User',
      entityId: userId,
      request,
    });

    return ok({ id: updated.id, isActive: updated.isActive });
  });
}
