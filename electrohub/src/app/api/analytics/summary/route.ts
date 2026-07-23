import { type NextRequest } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';
import { cached, cacheKeys } from '@/lib/redis';

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'ANALYTICS_READ');

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') ?? '30d';
    const days = RANGE_DAYS[range] ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const vendor = isAdmin(user) ? null : await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });
    const scopeKey = vendor?.id ?? 'platform';

    const summary = await cached(
      cacheKeys.analyticsSummary(scopeKey, range),
      async () => {
        const orderItemWhere = {
          order: { placedAt: { gte: since }, status: { in: PAID_STATUSES } },
          ...(vendor ? { vendorId: vendor.id } : {}),
        };

        const [revenueAgg, orderCount, topProducts, lowStock] = await Promise.all([
          db.orderItem.aggregate({ where: orderItemWhere, _sum: { totalCents: true } }),
          vendor
            ? db.order.count({ where: { placedAt: { gte: since }, items: { some: { vendorId: vendor.id } } } })
            : db.order.count({ where: { placedAt: { gte: since } } }),
          db.orderItem.groupBy({
            by: ['productId', 'titleSnapshot'],
            where: orderItemWhere,
            _sum: { quantity: true, totalCents: true },
            orderBy: { _sum: { totalCents: 'desc' } },
            take: 5,
          }),
          db.inventory.findMany({
            where: {
              quantityOnHand: { lte: 999999 },
              ...(vendor ? { product: { vendorId: vendor.id } } : {}),
            },
            include: { product: { select: { title: true, sku: true } } },
            take: 200,
          }),
        ]);

        const lowStockFiltered = lowStock
          .filter((inv) => inv.quantityOnHand <= inv.lowStockThreshold)
          .map((inv) => ({
            productId: inv.productId,
            title: inv.product.title,
            sku: inv.product.sku,
            quantityOnHand: inv.quantityOnHand,
            threshold: inv.lowStockThreshold,
          }));

        return {
          range,
          revenueCents: revenueAgg._sum.totalCents ?? 0,
          orderCount,
          topProducts: topProducts.map((p) => ({
            productId: p.productId,
            title: p.titleSnapshot,
            unitsSold: p._sum.quantity ?? 0,
            revenueCents: p._sum.totalCents ?? 0,
          })),
          lowStock: lowStockFiltered,
        };
      },
      300
    );

    return ok(summary);
  });
}
