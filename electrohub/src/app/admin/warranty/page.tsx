'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/components/ui/formatters';

interface WarrantyRow {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOID';
  expiresAt: string;
  product: { title: string; sku: string };
  order: { orderNumber: string };
  claims: { id: string; status: string }[];
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  EXPIRED: 'neutral',
  CLAIMED: 'warning',
  VOID: 'danger',
};

export default function AdminWarrantyPage() {
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<WarrantyRow[]>(`/api/warranty${status ? `?status=${status}` : ''}`)
      .then(setWarranties)
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Warranty tracking</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-ink-100">
          <option value="">All statuses</option>
          {['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOID'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : warranties.length === 0 ? (
        <EmptyState title="No warranties match" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Order</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th>Open claims</Th>
            </tr>
          </thead>
          <tbody>
            {warranties.map((w) => (
              <tr key={w.id}>
                <Td>
                  {w.product.title} <span className="readout text-ink-400">({w.product.sku})</span>
                </Td>
                <Td className="readout">{w.order.orderNumber}</Td>
                <Td className="readout">{formatDate(w.expiresAt)}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[w.status]}>{w.status}</Badge>
                </Td>
                <Td className="readout">{w.claims.filter((c) => c.status === 'OPEN' || c.status === 'IN_REVIEW').length}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
