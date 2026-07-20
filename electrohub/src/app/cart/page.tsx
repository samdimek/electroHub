'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/apiClient';
import { formatCents } from '@/components/ui/formatters';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface CartLine {
  productId: string;
  quantity: number;
  product: {
    title: string;
    priceCents: number;
    slug: string;
    images: { url: string }[];
    inventory: { quantityOnHand: number; quantityReserved: number } | null;
  } | null;
}

export default function CartPage() {
  const [items, setItems] = useState<CartLine[]>([]);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await apiFetch<{ items: CartLine[]; subtotalCents: number }>('/api/cart');
    setItems(data.items);
    setSubtotalCents(data.subtotalCents);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function updateQuantity(productId: string, quantity: number) {
    await apiFetch('/api/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) });
    load();
  }

  async function remove(productId: string) {
    await apiFetch('/api/cart', { method: 'DELETE', body: JSON.stringify({ productId }) });
    load();
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-ink-400">Loading cart…</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink-100">Your cart</h1>

      {items.length === 0 ? (
        <EmptyState title="Your cart is empty" description="Browse the catalog to find something to add." />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) =>
            item.product ? (
              <div key={item.productId} className="flex items-center gap-4 rounded border border-ink-700 p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-ink-800">
                  {item.product.images[0] && (
                    <Image src={item.product.images[0].url} alt={item.product.title} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <Link href={`/products/${item.product.slug}`} className="text-sm font-medium text-ink-100 hover:text-volt">
                    {item.product.title}
                  </Link>
                  <p className="readout text-xs text-ink-400">{formatCents(item.product.priceCents)} each</p>
                </div>
                <select
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                  className="rounded border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="readout w-20 text-right text-sm text-ink-100">
                  {formatCents(item.product.priceCents * item.quantity)}
                </span>
                <button onClick={() => remove(item.productId)} className="text-xs text-signal-red hover:underline">
                  Remove
                </button>
              </div>
            ) : null
          )}

          <div className="mt-4 flex items-center justify-between border-t border-ink-700 pt-4">
            <span className="text-sm text-ink-400">Subtotal</span>
            <span className="readout text-lg font-semibold text-ink-100">{formatCents(subtotalCents)}</span>
          </div>

          <Link href="/checkout" className="mt-2">
            <Button className="w-full">Proceed to checkout</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
