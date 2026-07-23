'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCents, formatDate } from '@/components/ui/formatters';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  placedAt: string;
  items: { titleSnapshot: string; quantity: number; totalCents: number }[];
  warranties: { id: string; productId: string; expiresAt: string; status: string }[];
}

export function OrderHistoryClient() {
  const searchParams = useSearchParams();
  const confirmed = searchParams.get('confirmed');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimText, setClaimText] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    apiFetch<{ orders: OrderRow[] }>('/api/orders')
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function fileClaim(warrantyId: string) {
    const description = claimText[warrantyId];
    if (!description || description.trim().length < 10) {
      alert('Describe the issue in at least 10 characters.');
      return;
    }
    await apiFetch(`/api/warranty/${warrantyId}/claim`, { method: 'POST', body: JSON.stringify({ description }) });
    alert('Claim filed — the vendor has been notified.');
    load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink-100">Your orders</h1>

      {confirmed && (
        <div className="mb-6 rounded border border-volt/40 bg-volt/10 px-4 py-3 text-sm text-volt">
          Order {confirmed} confirmed — a receipt has been emailed to you.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Your purchases will show up here." />
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((o) => (
            <div key={o.id} className="rounded border border-ink-700 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="readout text-sm text-ink-100">{o.orderNumber}</p>
                  <p className="text-xs text-ink-400">{formatDate(o.placedAt)}</p>
                </div>
                <Badge tone="info">{o.status}</Badge>
              </div>
              <ul className="mb-3 flex flex-col gap-1 text-sm text-ink-200">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{i.titleSnapshot} × {i.quantity}</span>
                    <span className="readout">{formatCents(i.totalCents)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-ink-800 pt-3 text-sm">
                <span className="text-ink-400">Total</span>
                <span className="readout text-ink-100">{formatCents(o.totalCents)}</span>
              </div>

              {o.warranties.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-ink-800 pt-4">
                  <p className="eyebrow">Warranty</p>
                  {o.warranties.map((w) => (
                    <div key={w.id} className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-200">Expires {formatDate(w.expiresAt)}</span>
                        <Badge tone={w.status === 'ACTIVE' ? 'success' : 'neutral'}>{w.status}</Badge>
                      </div>
                      {w.status === 'ACTIVE' && (
                        <div className="flex gap-2">
                          <input
                            placeholder="Describe the issue…"
                            value={claimText[w.id] ?? ''}
                            onChange={(e) => setClaimText({ ...claimText, [w.id]: e.target.value })}
                            className="flex-1 rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-xs text-ink-100"
                          />
                          <button
                            onClick={() => fileClaim(w.id)}
                            className="rounded border border-ink-600 px-3 py-1.5 text-xs text-ink-100 hover:border-volt"
                          >
                            File claim
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
