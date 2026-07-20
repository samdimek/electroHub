import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { inventoryAdjustSchema } from '@/lib/validation/product';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { invalidatePrefix } from '@/lib/redis';

export async function GET(_request: NextRequest, { params }: { params: { productId: string } }) {
  return withApiErrorHandling(async () => {
    await requireUser();
    const inventory = await db.inventory.findUnique({
      where: { productId: params.productId },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!inventory) throw new ApiError(404, 'No inventory record for this product');
    return ok(inventory);
  });
}

/** Manual stock adjustment (restock, correction, damage write-off, etc). */
export async function POST(request: NextRequest, { params }: { params: { productId: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'INVENTORY_WRITE');
    const body = inventoryAdjustSchema.parse(await request.json());

    const product = await db.product.findUnique({
      where: { id: params.productId },
      include: { vendor: { include: { members: true } }, inventory: true },
    });
    if (!product) throw new ApiError(404, 'Product not found');
    if (!isAdmin(user) && !product.vendor.members.some((m) => m.userId === user.id)) {
      throw new ApiError(403, 'You do not have access to this product');
    }
    if (!product.inventory) throw new ApiError(400, 'No inventory record exists for this product');

    const newQuantity = product.inventory.quantityOnHand + body.quantityDelta;
    if (newQuantity < 0) throw new ApiError(400, 'Adjustment would result in negative stock');

    const [inventory] = await db.$transaction([
      db.inventory.update({
        where: { productId: params.productId },
        data: { quantityOnHand: newQuantity },
      }),
      db.inventoryMovement.create({
        data: {
          inventoryId: product.inventory.id,
          type: 'ADJUSTMENT',
          quantity: body.quantityDelta,
          reason: body.reason,
          createdById: user.id,
        },
      }),
    ]);

    await invalidatePrefix('products:list:');
    await writeAuditLog({
      actor: user,
      action: 'inventory.adjust',
      entityType: 'Product',
      entityId: product.id,
      metadata: { delta: body.quantityDelta, reason: body.reason, newQuantity },
      request,
    });

    return ok(inventory);
  });
}
