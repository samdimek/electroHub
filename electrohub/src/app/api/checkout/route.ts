import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { checkoutSchema } from '@/lib/validation/order';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { emails } from '@/lib/email';
import { stripe } from '@/lib/stripe';
import { invalidatePrefix } from '@/lib/redis';

const FLAT_SHIPPING_CENTS = 999;
const TAX_RATE = 0.0; // Plug in a real tax provider (Stripe Tax, TaxJar) per-jurisdiction before going live.

function generateOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EH-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const body = checkoutSchema.parse(await request.json());

    const cart = await db.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Your cart is empty');

    // Server is the source of truth for price/availability — the client
    // never gets to say what anything costs.
    const products = await db.product.findMany({
      where: { id: { in: cart.items.map((i) => i.productId) } },
      include: { inventory: true, vendor: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotalCents = 0;
    for (const item of cart.items) {
      const product = byId.get(item.productId);
      if (!product || product.status !== 'ACTIVE') throw new ApiError(400, `A product in your cart is no longer available`);
      const available = (product.inventory?.quantityOnHand ?? 0) - (product.inventory?.quantityReserved ?? 0);
      if (available < item.quantity) throw new ApiError(400, `"${product.title}" only has ${available} in stock`);
      subtotalCents += product.priceCents * item.quantity;
    }

    // ── Coupon ──────────────────────────────────────────────────────
    let discountCents = 0;
    let couponId: string | undefined;
    if (body.couponCode) {
      const coupon = await db.coupon.findUnique({ where: { code: body.couponCode.toUpperCase() } });
      if (!coupon || !coupon.isActive) throw new ApiError(400, 'Invalid coupon code');
      if (coupon.startsAt && coupon.startsAt > new Date()) throw new ApiError(400, 'Coupon is not active yet');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, 'Coupon has expired');
      if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) {
        throw new ApiError(400, 'Coupon has reached its redemption limit');
      }
      if (coupon.minSubtotalCents && subtotalCents < coupon.minSubtotalCents) {
        throw new ApiError(400, `Coupon requires a minimum order of $${(coupon.minSubtotalCents / 100).toFixed(2)}`);
      }
      if (coupon.type === 'PERCENTAGE') discountCents = Math.round(subtotalCents * (Number(coupon.value) / 100));
      if (coupon.type === 'FIXED_AMOUNT') discountCents = Math.min(subtotalCents, Math.round(Number(coupon.value) * 100));
      couponId = coupon.id;
    }

    const shippingCents = body.couponCode && discountCents === subtotalCents ? 0 : FLAT_SHIPPING_CENTS;
    const taxableCents = Math.max(0, subtotalCents - discountCents);
    const taxCents = Math.round(taxableCents * TAX_RATE);
    const totalCents = taxableCents + taxCents + shippingCents;

    // ── Addresses ───────────────────────────────────────────────────
    const shippingAddress = await db.address.create({ data: { userId: user.id, ...body.shippingAddress } });
    const billingAddress = body.billingAddress
      ? await db.address.create({ data: { userId: user.id, ...body.billingAddress } })
      : shippingAddress;

    // ── Secure payment tokenization ────────────────────────────────
    // `paymentMethodId` is a Stripe PaymentMethod token created client-side
    // by Stripe.js from the raw card fields — the raw card number/CVC
    // never reaches this server (PCI SAQ-A scope). We only ever store the
    // resulting PaymentIntent id + card brand/last4 for display.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      payment_method: body.paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { userId: user.id },
    });

    if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
      throw new ApiError(402, 'Payment could not be completed. Please try a different payment method.');
    }

    const orderStatus = paymentIntent.status === 'succeeded' ? 'PAID' : 'PENDING_PAYMENT';
    const paymentMethod = paymentIntent.payment_method
      ? await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string)
      : null;

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: user.id,
          status: orderStatus,
          subtotalCents,
          discountCents,
          taxCents,
          shippingCents,
          totalCents,
          couponId,
          billingAddressId: billingAddress.id,
          shippingAddressId: shippingAddress.id,
          paymentIntentId: paymentIntent.id,
          paymentMethodBrand: paymentMethod?.card?.brand,
          paymentMethodLast4: paymentMethod?.card?.last4,
          items: {
            create: cart.items.map((item) => {
              const product = byId.get(item.productId)!;
              return {
                productId: product.id,
                vendorId: product.vendorId,
                titleSnapshot: product.title,
                skuSnapshot: product.sku,
                unitPriceCents: product.priceCents,
                quantity: item.quantity,
                totalCents: product.priceCents * item.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      for (const item of cart.items) {
        const product = byId.get(item.productId)!;
        await tx.inventory.update({
          where: { productId: product.id },
          data: { quantityOnHand: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryId: product.inventory!.id,
            type: 'SALE',
            quantity: -item.quantity,
            orderId: created.id,
          },
        });

        if (product.warrantyMonths > 0) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + product.warrantyMonths);
          await tx.warranty.create({
            data: { productId: product.id, orderId: created.id, expiresAt },
          });
        }
      }

      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { redemptionCount: { increment: 1 } } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    await invalidatePrefix('products:list:');

    await writeAuditLog({
      actor: user,
      action: 'order.place',
      entityType: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, totalCents },
      request,
    });

    const itemsHtml = order.items
      .map((i) => `<tr><td>${i.titleSnapshot} × ${i.quantity}</td><td style="text-align:right;">$${(i.totalCents / 100).toFixed(2)}</td></tr>`)
      .join('');
    await emails.orderConfirmation(user.email, order.orderNumber, `$${(order.totalCents / 100).toFixed(2)}`, itemsHtml);

    return ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      clientSecret: orderStatus === 'PENDING_PAYMENT' ? paymentIntent.client_secret : null,
    });
  });
}
