import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { orderStatusUpdateSchema } from '@/lib/validation/order';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { emails } from '@/lib/email';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'ORDERS_WRITE');
    const body = orderStatusUpdateSchema.parse(await request.json());

    const order = await db.order.findUnique({ where: { id: params.id }, include: { user: true } });
    if (!order) throw new ApiError(404, 'Order not found');

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw new ApiError(400, `Cannot transition order from ${order.status} to ${body.status}`);
    }

    const updated = await db.order.update({ where: { id: order.id }, data: { status: body.status } });

    await writeAuditLog({
      actor: user,
      action: 'order.status_update',
      entityType: 'Order',
      entityId: order.id,
      metadata: { from: order.status, to: body.status },
      request,
    });

    await emails.orderStatusUpdate(order.user.email, order.orderNumber, body.status);

    return ok(updated);
  });
}
