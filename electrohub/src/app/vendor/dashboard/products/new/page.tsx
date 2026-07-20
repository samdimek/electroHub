'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Category {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    sku: '',
    categoryId: '',
    description: '',
    brand: '',
    priceCents: '',
    warrantyMonths: '0',
    initialQuantity: '0',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE',
  });

  useEffect(() => {
    apiFetch<Category[]>('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  async function uploadImage(): Promise<{ s3Key: string; url: string } | null> {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const presigned = await apiFetch<{ uploadUrl: string; key: string; publicUrl: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ folder: 'products', filename: imageFile.name, contentType: imageFile.type }),
      });
      await fetch(presigned.uploadUrl, { method: 'PUT', body: imageFile, headers: { 'Content-Type': imageFile.type } });
      return { s3Key: presigned.key, url: presigned.publicUrl };
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const image = await uploadImage();
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          priceCents: Math.round(Number(form.priceCents) * 100),
          warrantyMonths: Number(form.warrantyMonths),
          initialQuantity: Number(form.initialQuantity),
          images: image ? [{ ...image, alt: form.title }] : undefined,
        }),
      });
      router.push('/vendor/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create product');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink-100">New product</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="eyebrow">Category</label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-volt focus:outline-none"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="eyebrow">Description</label>
          <textarea
            rows={4}
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-volt focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Price (USD)"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.priceCents}
            onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
          />
          <Input
            label="Warranty (months)"
            type="number"
            min="0"
            value={form.warrantyMonths}
            onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
          />
          <Input
            label="Starting stock"
            type="number"
            min="0"
            value={form.initialQuantity}
            onChange={(e) => setForm({ ...form, initialQuantity: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="eyebrow">Product image</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="publish"
            type="checkbox"
            checked={form.status === 'ACTIVE'}
            onChange={(e) => setForm({ ...form, status: e.target.checked ? 'ACTIVE' : 'DRAFT' })}
          />
          <label htmlFor="publish" className="text-sm text-ink-200">
            Publish immediately
          </label>
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" disabled={submitting || uploading}>
          {uploading ? 'Uploading image…' : submitting ? 'Saving…' : 'Save product'}
        </Button>
      </form>
    </div>
  );
}
