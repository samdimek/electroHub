'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/components/ui/formatters';

interface VendorRow {
  id: string;
  storeName: string;
  businessEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  categories: { category: { name: string } }[];
  _count: { products: number };
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
};

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<{ vendors: VendorRow[] }>(`/api/vendors?status=${statusFilter}`)
      .then((data) => setVendors(data.vendors))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  async function approve(id: string) {
    await apiFetch(`/api/vendors/${id}/approve`, { method: 'POST' });
    load();
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejection (shown to the vendor):');
    if (!reason) return;
    await apiFetch(`/api/vendors/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Vendors</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-ink-100"
        >
          <option value="PENDING">Pending review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : vendors.length === 0 ? (
        <EmptyState title="Nothing here" description="No vendors match this filter right now." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Store</Th>
              <Th>Categories</Th>
              <Th>Products</Th>
              <Th>Applied</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id}>
                <Td>
                  <p className="text-ink-100">{v.storeName}</p>
                  <p className="text-xs text-ink-400">{v.businessEmail}</p>
                </Td>
                <Td className="text-xs text-ink-300">{v.categories.map((c) => c.category.name).join(', ')}</Td>
                <Td className="readout">{v._count.products}</Td>
                <Td>{formatDate(v.createdAt)}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[v.status]}>{v.status}</Badge>
                </Td>
                <Td>
                  {v.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve(v.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => reject(v.id)}>
                        Reject
                      </Button>
                    </div>
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
