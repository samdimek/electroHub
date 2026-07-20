'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatCents } from '@/components/ui/formatters';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

interface Summary {
  revenueCents: number;
  orderCount: number;
  topProducts: { productId: string; title: string; unitsSold: number; revenueCents: number }[];
  lowStock: { productId: string; title: string; sku: string; quantityOnHand: number; threshold: number }[];
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    apiFetch<Summary>(`/api/analytics/summary?range=${range}`).then(setSummary).catch(() => setSummary(null));
  }, [range]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Platform dashboard</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-ink-100"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <p className="eyebrow">Gross revenue</p>
            <p className="readout mt-2 text-3xl font-semibold text-ink-100">{summary ? formatCents(summary.revenueCents) : '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow">Orders</p>
            <p className="readout mt-2 text-3xl font-semibold text-ink-100">{summary ? summary.orderCount : '—'}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="eyebrow">Top products by revenue</p>
        </CardHeader>
        <CardBody>
          {summary?.topProducts.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.topProducts.map((p) => ({ name: p.title.slice(0, 16), revenue: p.revenueCents / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242B33" />
                  <XAxis dataKey="name" tick={{ fill: '#6B7684', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B7684', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1A1F26', border: '1px solid #242B33', fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#C6FF3A" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-ink-400">No sales yet in this window.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="eyebrow text-signal-amber">Low stock across all vendors</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {summary?.lowStock.length ? (
            summary.lowStock.map((p) => (
              <div key={p.productId} className="flex justify-between text-sm">
                <span className="text-ink-100">
                  {p.title} <span className="text-ink-400">({p.sku})</span>
                </span>
                <span className="readout text-signal-amber">{p.quantityOnHand} left</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-400">Nothing below threshold.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
