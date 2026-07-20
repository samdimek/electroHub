'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCents, formatDate } from '@/components/ui/formatters';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lifetimeValueCents: number;
  _count: { orders: number };
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  function load(query: string) {
    setLoading(true);
    apiFetch<{ customers: CustomerRow[] }>(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then((data) => setCustomers(data.customers))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(''), []);

  async function toggleActive(id: string, isActive: boolean) {
    await apiFetch('/api/customers', { method: 'PATCH', body: JSON.stringify({ userId: id, isActive: !isActive }) });
    load(q);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Customers</h1>

      <form onSubmit={(e) => (e.preventDefault(), load(q))} className="max-w-sm">
        <Input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Orders</Th>
              <Th>Lifetime value</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <Td>{c.name}</Td>
                <Td>{c.email}</Td>
                <Td className="readout">{c._count.orders}</Td>
                <Td className="readout">{formatCents(c.lifetimeValueCents)}</Td>
                <Td>{formatDate(c.createdAt)}</Td>
                <Td>
                  <Badge tone={c.isActive ? 'success' : 'danger'}>{c.isActive ? 'Active' : 'Suspended'}</Badge>
                </Td>
                <Td>
                  <button onClick={() => toggleActive(c.id, c.isActive)} className="text-xs text-volt hover:underline">
                    {c.isActive ? 'Suspend' : 'Reactivate'}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
