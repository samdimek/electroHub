'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';

export function CartIndicator() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ items: { quantity: number }[] }>('/api/cart')
      .then((data) => setCount(data.items.reduce((sum, i) => sum + i.quantity, 0)))
      .catch(() => setCount(null));
  }, []);

  return (
    <Link href="/cart" className="relative text-sm text-ink-200 hover:text-volt">
      Cart
      {count !== null && count > 0 && (
        <span className="ml-1 rounded-full bg-volt px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">
          {count}
        </span>
      )}
    </Link>
  );
}
