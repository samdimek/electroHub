import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { emails } from '@/lib/email';
import { writeAuditLog } from '@/lib/audit';

// Stripe webhooks are authenticated via HMAC signature (Stripe-Signature
// header), not our session/CSRF machinery — this route is intentionally
// exempt from the CSRF check in middleware.ts. It's still rate-limited.
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(err, { tags: { area: 'stripe-webhook' } });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as { id: string };
        const order = await db.order.findFirst({ where: { paymentIntentId: pi.id }, include: { user: true } });
        if (order && order.status === 'PENDING_PAYMENT') {
          await db.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
          await emails.orderStatusUpdate(order.user.email, order.orderNumber, 'PAID');
          await writeAuditLog({ actor: null, action: 'order.payment_confirmed', entityType: 'Order', entityId: order.id, request });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { id: string };
        const order = await db.order.findFirst({ where: { paymentIntentId: pi.id } });
        if (order) {
          await db.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
          await writeAuditLog({ actor: null, action: 'order.payment_failed', entityType: 'Order', entityId: order.id, request });
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent: string | null };
        if (charge.payment_intent) {
          const order = await db.order.findFirst({ where: { paymentIntentId: charge.payment_intent } });
          if (order) {
            await db.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
            await writeAuditLog({ actor: null, action: 'order.refunded', entityType: 'Order', entityId: order.id, request });
          }
        }
        break;
      }
      default:
        break; // Unhandled event types are ignored, not errored.
    }
  } catch (err) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(err, { tags: { area: 'stripe-webhook' }, extra: { eventType: event.type } });
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
