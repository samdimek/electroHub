'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCents } from '@/components/ui/formatters';

interface ProductRow {
  id: string;
  title: string;
  sku: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  priceCents: number;
  inventory: { quantityOnHand: number; lowStockThreshold: number } | null;
}

const STATUS_TONE = { DRAFT: 'neutral', ACTIVE: 'success', ARCHIVED: 'danger' } as const;

export default function VendorProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const [importing, setImporting] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<{ products: ProductRow[] }>('/api/products?scope=mine')
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch<{ created: number; failed: number }>('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      setImportResult(result);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Products</h1>
        <div className="flex gap-3">
          <label className="cursor-pointer rounded border border-ink-600 px-4 py-2 text-sm text-ink-100 hover:border-volt">
            {importing ? 'Importing…' : 'Bulk import (CSV/Excel)'}
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <Link href="/vendor/dashboard/products/new">
            <Button>New product</Button>
          </Link>
        </div>
      </div>

      {importResult && (
        <p className="text-sm text-ink-200">
          Import finished — <span className="text-volt">{importResult.created} created/updated</span>,{' '}
          <span className="text-signal-red">{importResult.failed} failed</span>.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product or import a catalog via CSV/Excel." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>SKU</Th>
              <Th>Status</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <Td>{p.title}</Td>
                <Td className="readout">{p.sku}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </Td>
                <Td className="readout">{formatCents(p.priceCents)}</Td>
                <Td className="readout">
                  {p.inventory ? (
                    <span className={p.inventory.quantityOnHand <= p.inventory.lowStockThreshold ? 'text-signal-amber' : ''}>
                      {p.inventory.quantityOnHand}
                    </span>
                  ) : (
                    '—'
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
