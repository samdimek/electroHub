'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, Th, Td } from '@/components/ui/Table';
import { formatCents } from '@/components/ui/formatters';

interface Summary {
  revenueCents: number;
  orderCount: number;
  topProducts: { productId: string; title: string; unitsSold: number; revenueCents: number }[];
  lowStock: { productId: string; title: string; sku: string; quantityOnHand: number; threshold: number }[];
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch<Summary>(`/api/analytics/summary?range=${range}`).then(setSummary).catch(() => setSummary(null));
  }, [range]);

  const aov = summary && summary.orderCount > 0 ? summary.revenueCents / summary.orderCount : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Analytics</h1>
        <select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className="rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-ink-100">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <p className="eyebrow">Revenue</p>
            <p className="readout mt-2 text-2xl font-semibold text-ink-100">{summary ? formatCents(summary.revenueCents) : '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow">Orders</p>
            <p className="readout mt-2 text-2xl font-semibold text-ink-100">{summary?.orderCount ?? '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow">Avg. order value</p>
            <p className="readout mt-2 text-2xl font-semibold text-ink-100">{summary ? formatCents(aov) : '—'}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="eyebrow">Top products</p>
        </CardHeader>
        <CardBody>
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Units sold</Th>
                <Th>Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {summary?.topProducts.map((p) => (
                <tr key={p.productId}>
                  <Td>{p.title}</Td>
                  <Td className="readout">{p.unitsSold}</Td>
                  <Td className="readout">{formatCents(p.revenueCents)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
