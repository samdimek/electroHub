'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiFetch } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card details are required');

      // Card data goes directly from the browser to Stripe here — it never
      // touches our server. We only receive back an opaque PaymentMethod id.
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      if (pmError || !paymentMethod) throw new Error(pmError?.message || 'Card could not be processed');

      const result = await apiFetch<{ orderNumber: string; status: string; clientSecret: string | null }>(
        '/api/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            shippingAddress: address,
            couponCode: couponCode || undefined,
            paymentMethodId: paymentMethod.id,
          }),
        }
      );

      if (result.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
        if (confirmError) throw new Error(confirmError.message || 'Payment confirmation failed');
      }

      router.push(`/account/orders?confirmed=${result.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-3">Shipping address</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Address line 1"
            required
            className="col-span-2"
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
          />
          <Input
            label="Address line 2 (optional)"
            className="col-span-2"
            value={address.line2}
            onChange={(e) => setAddress({ ...address, line2: e.target.value })}
          />
          <Input label="City" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
          <Input label="State" required value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
          <Input
            label="Postal code"
            required
            value={address.postalCode}
            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
          />
          <Input
            label="Country (ISO code)"
            required
            maxLength={2}
            value={address.country}
            onChange={(e) => setAddress({ ...address, country: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Coupon (optional)</p>
        <Input placeholder="SUMMER10" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
      </div>

      <div>
        <p className="eyebrow mb-3">Payment</p>
        <div className="rounded border border-ink-600 bg-ink-900 px-3 py-3">
          <CardElement
            options={{
              style: {
                base: { color: '#E6EAEE', fontSize: '14px', '::placeholder': { color: '#6B7684' } },
                invalid: { color: '#FF5D5D' },
              },
            }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-400">
          Card details are sent directly to Stripe and never touch ElectroHub&rsquo;s servers.
        </p>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? 'Placing order…' : 'Place order'}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink-100">Checkout</h1>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}
