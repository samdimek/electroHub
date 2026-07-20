'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';

interface ProductRow {
  id: string;
  title: string;
  sku: string;
  inventory: { quantityOnHand: number; lowStockThreshold: number } | null;
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiFetch<{ products: ProductRow[] }>('/api/products?scope=mine')
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function adjust(productId: string, delta: number) {
    const reason = delta > 0 ? 'Manual restock' : 'Manual correction';
    setBusyId(productId);
    try {
      await apiFetch(`/api/inventory/${productId}`, { method: 'POST', body: JSON.stringify({ quantityDelta: delta, reason }) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Inventory</h1>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>On hand</Th>
              <Th>Threshold</Th>
              <Th>Adjust</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <Td>{p.title}</Td>
                <Td className="readout">{p.sku}</Td>
                <Td
                  className={`readout ${
                    p.inventory && p.inventory.quantityOnHand <= p.inventory.lowStockThreshold ? 'text-signal-amber' : ''
                  }`}
                >
                  {p.inventory?.quantityOnHand ?? '—'}
                </Td>
                <Td className="readout">{p.inventory?.lowStockThreshold ?? '—'}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => adjust(p.id, 10)}
                      className="rounded border border-ink-600 px-2 py-1 text-xs text-ink-100 hover:border-volt"
                    >
                      +10
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => adjust(p.id, -1)}
                      className="rounded border border-ink-600 px-2 py-1 text-xs text-ink-100 hover:border-signal-red"
                    >
                      −1
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
