'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCents, formatDate } from '@/components/ui/formatters';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  placedAt: string;
  items: { titleSnapshot: string; quantity: number }[];
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

const NEXT_STATUS: Record<string, string[]> = {
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<{ orders: OrderRow[] }>('/api/orders')
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id: string, status: string) {
    await apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Orders</h1>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders containing your products will show up here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Items</Th>
              <Th>Status</Th>
              <Th>Total</Th>
              <Th>Placed</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <Td className="readout">{o.orderNumber}</Td>
                <Td>{o.items.map((i) => `${i.titleSnapshot} ×${i.quantity}`).join(', ')}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>{o.status}</Badge>
                </Td>
                <Td className="readout">{formatCents(o.totalCents)}</Td>
                <Td>{formatDate(o.placedAt)}</Td>
                <Td>
                  {(NEXT_STATUS[o.status] ?? []).length > 0 ? (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && updateStatus(o.id, e.target.value)}
                      className="rounded border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-ink-100"
                    >
                      <option value="" disabled>
                        Update…
                      </option>
                      {(NEXT_STATUS[o.status] ?? []).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-ink-600">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
