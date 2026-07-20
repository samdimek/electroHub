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
  claims: { id: string; status: string; description: string }[];
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  EXPIRED: 'neutral',
  CLAIMED: 'warning',
  VOID: 'danger',
};

export default function VendorWarrantyPage() {
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<WarrantyRow[]>('/api/warranty')
      .then(setWarranties)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function resolveClaim(claimId: string, status: 'APPROVED' | 'REJECTED' | 'RESOLVED') {
    await apiFetch(`/api/warranty/claims/${claimId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Warranty tracking</h1>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : warranties.length === 0 ? (
        <EmptyState title="No warranties yet" description="Warranties are created automatically when a covered product ships." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Order</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th>Open claim</Th>
            </tr>
          </thead>
          <tbody>
            {warranties.map((w) => {
              const openClaim = w.claims.find((c) => c.status === 'OPEN' || c.status === 'IN_REVIEW');
              return (
                <tr key={w.id}>
                  <Td>
                    {w.product.title} <span className="readout text-ink-400">({w.product.sku})</span>
                  </Td>
                  <Td className="readout">{w.order.orderNumber}</Td>
                  <Td className="readout">{formatDate(w.expiresAt)}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[w.status]}>{w.status}</Badge>
                  </Td>
                  <Td>
                    {openClaim ? (
                      <div className="flex flex-col gap-1">
                        <p className="max-w-xs text-xs text-ink-300">{openClaim.description}</p>
                        <div className="flex gap-2">
                          <button onClick={() => resolveClaim(openClaim.id, 'RESOLVED')} className="text-xs text-volt hover:underline">
                            Resolve
                          </button>
                          <button onClick={() => resolveClaim(openClaim.id, 'REJECTED')} className="text-xs text-signal-red hover:underline">
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-600">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
