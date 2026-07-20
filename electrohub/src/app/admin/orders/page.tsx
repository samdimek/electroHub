'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatCents, formatDate } from '@/components/ui/formatters';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  placedAt: string;
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  PROCESSING: 'info',
  SHIPPED: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ orders: OrderRow[] }>(`/api/orders${status ? `?status=${status}` : ''}`)
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-ink-100">
          <option value="">All statuses</option>
          {['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Status</Th>
              <Th>Total</Th>
              <Th>Placed</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <Td className="readout">{o.orderNumber}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>{o.status}</Badge>
                </Td>
                <Td className="readout">{formatCents(o.totalCents)}</Td>
                <Td>{formatDate(o.placedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
