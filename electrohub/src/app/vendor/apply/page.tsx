'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Turnstile } from '@/components/ui/Turnstile';

interface Category {
  id: string;
  name: string;
}

export default function VendorApplyPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [form, setForm] = useState({ storeName: '', description: '', businessEmail: '', businessPhone: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/vendors/apply', {
        method: 'POST',
        body: JSON.stringify({ ...form, categoryIds: selectedCategoryIds, captchaToken }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink-100">Application received</h1>
        <p className="text-sm text-ink-400">
          We review every ElectroHub vendor application to confirm the store sells electronics. You&rsquo;ll hear back within
          2 business days.
        </p>
        <Button className="mt-6" onClick={() => router.push('/')}>
          Back to shop
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink-100">Apply to sell on ElectroHub</h1>
      <p className="mb-8 text-sm text-ink-400">
        ElectroHub only approves stores selling electronics. Applications outside eligible categories are declined
        automatically.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Store name"
          required
          value={form.storeName}
          onChange={(e) => setForm({ ...form, storeName: e.target.value })}
        />
        <div className="flex flex-col gap-1.5">
          <label className="eyebrow">Store description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-volt focus:outline-none"
          />
        </div>
        <Input
          label="Business email"
          type="email"
          required
          value={form.businessEmail}
          onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
        />
        <Input
          label="Business phone (optional)"
          value={form.businessPhone}
          onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
        />

        <div>
          <p className="eyebrow mb-2">Electronics categories you sell in</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCategory(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  selectedCategoryIds.includes(c.id)
                    ? 'border-volt bg-volt/10 text-volt'
                    : 'border-ink-600 text-ink-200 hover:border-ink-400'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {categories.length === 0 && <p className="text-xs text-ink-400">Loading categories…</p>}
        </div>

        <Turnstile onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" disabled={loading || !captchaToken || selectedCategoryIds.length === 0} className="w-full">
          {loading ? 'Submitting…' : 'Submit application'}
        </Button>
      </form>
    </div>
  );
}
