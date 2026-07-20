import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { hasPermission, isAdmin } from '@/lib/rbac';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';
import type { OrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as OrderStatus | null;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = 20;

    let where: any = { userId: user.id }; // default: customers only see their own orders

    if (isAdmin(user) && hasPermission(user, 'ORDERS_READ')) {
      where = status ? { status } : {};
    } else if (hasPermission(user, 'ORDERS_READ') && !isAdmin(user)) {
      // Vendor staff/owner: orders containing at least one of their items.
      const vendor = await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });
      where = vendor ? { items: { some: { vendorId: vendor.id } } } : { id: 'never-matches' };
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: { items: true },
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.order.count({ where }),
    ]);

    return ok({ orders, total, page, pageSize });
  });
}
