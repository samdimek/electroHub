import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';
import type { VendorStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'VENDORS_APPROVE');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as VendorStatus | null;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = 20;

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where: status ? { status } : undefined,
        include: { categories: { include: { category: true } }, _count: { select: { products: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.vendor.count({ where: status ? { status } : undefined }),
    ]);

    return ok({ vendors, total, page, pageSize });
  });
}
