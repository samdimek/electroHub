'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: string;
  isActive: boolean;
  redemptionCount: number;
  maxRedemptions: number | null;
}

export default function VendorCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE' as Coupon['type'], value: '10', maxRedemptions: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<Coupon[]>('/api/coupons')
      .then(setCoupons)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        }),
      });
      setForm({ code: '', type: 'PERCENTAGE', value: '10', maxRedemptions: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create coupon');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id: string) {
    await apiFetch(`/api/coupons/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Promotions</h1>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded border border-ink-700 p-4">
        <Input label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <div className="flex flex-col gap-1.5">
          <label className="eyebrow">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as Coupon['type'] })}
            className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100"
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED_AMOUNT">Fixed amount off</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </div>
        <Input
          label="Value"
          type="number"
          step="0.01"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
        <Input
          label="Max redemptions"
          type="number"
          placeholder="Unlimited"
          value={form.maxRedemptions}
          onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create coupon'}
        </Button>
        {error && <p className="w-full text-sm text-signal-red">{error}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : coupons.length === 0 ? (
        <EmptyState title="No coupons yet" description="Create one above to run a promotion." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Type</Th>
              <Th>Value</Th>
              <Th>Redemptions</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <Td className="readout">{c.code}</Td>
                <Td>{c.type.replace('_', ' ')}</Td>
                <Td className="readout">{c.type === 'PERCENTAGE' ? `${c.value}%` : c.type === 'FIXED_AMOUNT' ? `$${c.value}` : '—'}</Td>
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
