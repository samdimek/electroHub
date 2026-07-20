'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: string;
  isActive: boolean;
  redemptionCount: number;
  maxRedemptions: number | null;
  vendorId: string | null;
}

export default function AdminPromotionsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<Coupon[]>('/api/coupons')
      .then(setCoupons)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function deactivate(id: string) {
    await apiFetch(`/api/coupons/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Promotions</h1>
      <p className="text-sm text-ink-400">Platform-wide and vendor-specific coupons. Vendor-specific coupons show their vendor id.</p>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : coupons.length === 0 ? (
        <EmptyState title="No coupons yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Scope</Th>
              <Th>Type</Th>
              <Th>Redemptions</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <Td className="readout">{c.code}</Td>
                <Td>{c.vendorId ? <span className="readout text-xs text-ink-400">{c.vendorId}</span> : 'Platform-wide'}</Td>
                <Td>{c.type.replace('_', ' ')}</Td>
                <Td className="readout">
                  {c.redemptionCount}
                  {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                </Td>
                <Td>
                  <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td>
                  {c.isActive && (
                    <button onClick={() => deactivate(c.id)} className="text-xs text-signal-red hover:underline">
                      Deactivate
                    </button>
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
