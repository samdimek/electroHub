import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cartItemSchema } from '@/lib/validation/order';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';

async function getOrCreateCart(userId: string) {
  return db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { items: { include: { } } },
  });
}

export async function GET() {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const cart = await getOrCreateCart(user.id);
    const productIds = cart.items.map((i) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { take: 1, orderBy: { position: 'asc' } }, inventory: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const items = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: byId.get(item.productId) ?? null,
    }));

    const subtotalCents = items.reduce((sum, i) => sum + (i.product?.priceCents ?? 0) * i.quantity, 0);
    return ok({ items, subtotalCents });
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const body = cartItemSchema.parse(await request.json());

    const product = await db.product.findUnique({ where: { id: body.productId }, include: { inventory: true } });
    if (!product || product.status !== 'ACTIVE') throw new ApiError(404, 'Product not available');

    const available = (product.inventory?.quantityOnHand ?? 0) - (product.inventory?.quantityReserved ?? 0);
    if (available < body.quantity) throw new ApiError(400, `Only ${Math.max(available, 0)} in stock`);

    const cart = await getOrCreateCart(user.id);
    const item = await db.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: body.productId } },
      create: { cartId: cart.id, productId: body.productId, quantity: body.quantity },
      update: { quantity: body.quantity },
    });

    return ok(item);
  });
}

export async function DELETE(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const { productId } = await request.json();
    const cart = await getOrCreateCart(user.id);
    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return ok({ success: true });
  });
}
