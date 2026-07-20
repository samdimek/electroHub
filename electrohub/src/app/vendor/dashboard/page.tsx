'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { formatCents } from '@/components/ui/formatters';

interface Summary {
  revenueCents: number;
  orderCount: number;
  topProducts: { productId: string; title: string; unitsSold: number; revenueCents: number }[];
  lowStock: { productId: string; title: string; sku: string; quantityOnHand: number; threshold: number }[];
}

export default function VendorOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch<Summary>('/api/analytics/summary?range=30d').then(setSummary).catch(() => setSummary(null));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Overview</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="eyebrow">Revenue · last 30 days</p>
            <p className="readout mt-2 text-3xl font-semibold text-ink-100">
              {summary ? formatCents(summary.revenueCents) : '—'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow">Orders · last 30 days</p>
            <p className="readout mt-2 text-3xl font-semibold text-ink-100">{summary ? summary.orderCount : '—'}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="eyebrow">Top products</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {summary?.topProducts.length ? (
            summary.topProducts.map((p) => (
              <div key={p.productId} className="flex justify-between text-sm">
                <span className="text-ink-100">{p.title}</span>
                <span className="readout text-ink-400">
                  {p.unitsSold} sold · {formatCents(p.revenueCents)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-400">No sales yet in this window.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="eyebrow text-signal-amber">Low stock</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {summary?.lowStock.length ? (
            summary.lowStock.map((p) => (
              <div key={p.productId} className="flex justify-between text-sm">
                <span className="text-ink-100">
                  {p.title} <span className="text-ink-400">({p.sku})</span>
                </span>
                <span className="readout text-signal-amber">
                  {p.quantityOnHand} left · threshold {p.threshold}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-400">Nothing below its reorder threshold.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
