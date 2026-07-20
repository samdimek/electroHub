'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCents } from '@/components/ui/formatters';

interface ProductRow {
  id: string;
  title: string;
  sku: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  priceCents: number;
  category: { name: string };
  inventory: { quantityOnHand: number; lowStockThreshold: number } | null;
}

const STATUS_TONE = { DRAFT: 'neutral', ACTIVE: 'success', ARCHIVED: 'danger' } as const;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ products: ProductRow[] }>('/api/products?scope=mine')
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">All products</h1>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" description="Products appear here once vendors start listing." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>SKU</Th>
              <Th>Category</Th>
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
                <Td>{p.category.name}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </Td>
                <Td className="readout">{formatCents(p.priceCents)}</Td>
                <Td className="readout">{p.inventory?.quantityOnHand ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
