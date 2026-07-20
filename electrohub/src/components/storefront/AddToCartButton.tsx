'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';

export function AddToCartButton({ productId, maxQuantity }: { productId: string; maxQuantity: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) });
      setAdded(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart');
    } finally {
      setLoading(false);
    }
  }

  if (maxQuantity <= 0) {
    return <p className="text-sm text-signal-red">Out of stock</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded border border-ink-600 bg-ink-900 px-2 py-2 text-sm text-ink-100"
        >
          {Array.from({ length: Math.min(maxQuantity, 10) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Qty {n}
            </option>
          ))}
        </select>
        <Button onClick={handleAdd} disabled={loading}>
          {loading ? 'Adding…' : added ? 'Added ✓' : 'Add to cart'}
        </Button>
      </div>
      {error && <p className="text-xs text-signal-red">{error}</p>}
    </div>
  );
}
