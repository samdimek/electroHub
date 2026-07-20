import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, hasPermission } from '@/lib/rbac';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';
import type { WarrantyStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as WarrantyStatus | null;

    let where: any;
    if (isAdmin(user) && hasPermission(user, 'WARRANTY_WRITE')) {
      where = status ? { status } : {};
    } else {
      const vendor = await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });
      if (vendor && hasPermission(user, 'WARRANTY_WRITE')) {
        where = { product: { vendorId: vendor.id }, ...(status ? { status } : {}) };
      } else {
        // Customers see only warranties tied to their own orders.
        where = { order: { userId: user.id }, ...(status ? { status } : {}) };
      }
    }

    const warranties = await db.warranty.findMany({
      where,
      include: { product: { select: { title: true, sku: true } }, order: { select: { orderNumber: true } }, claims: true },
      orderBy: { expiresAt: 'asc' },
      take: 200,
    });

    return ok(warranties);
  });
}
