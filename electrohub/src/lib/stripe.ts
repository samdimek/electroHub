import Stripe from 'stripe';

// Secure payment tokenization: the browser uses Stripe.js/Elements to turn
// raw card details into a PaymentMethod token that never transits our
// servers (PCI SAQ-A scope). Our backend only ever handles that token id
// and Stripe's PaymentIntent id — see src/app/api/checkout/route.ts.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});
