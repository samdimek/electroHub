import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true, shippingAddress: true, billingAddress: true, warranties: true },
    });
    if (!order) throw new ApiError(404, 'Order not found');

    if (order.userId !== user.id && !isAdmin(user)) {
      const vendor = await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });
      const ownsItem = vendor && order.items.some((i) => i.vendorId === vendor.id);
      if (!ownsItem) throw new ApiError(403, 'You do not have access to this order');
    }

    return ok(order);
  });
}
