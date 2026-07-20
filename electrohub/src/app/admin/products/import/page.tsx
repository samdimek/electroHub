'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';

interface Vendor {
  id: string;
  storeName: string;
}

export default function AdminImportPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    totalRows: number;
    created: number;
    failed: number;
    results: { row: number; sku: string; status: string; error?: string }[];
  } | null>(null);

  useEffect(() => {
    apiFetch<{ vendors: Vendor[] }>('/api/vendors?status=APPROVED')
      .then((data) => setVendors(data.vendors))
      .catch(() => setVendors([]));
  }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vendorId) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiFetch<typeof result>(`/api/products/import?vendorId=${vendorId}`, {
        method: 'POST',
        body: formData,
      });
      setResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Bulk import</h1>
      <p className="text-sm text-ink-400">
        Upload a CSV or Excel file to create or update products for a vendor. Expected columns: title, sku, category
        (slug), brand, price, quantity, warrantyMonths, status. Categories must be electronics categories.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="eyebrow">Vendor</label>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100"
        >
          <option value="">Select an approved vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.storeName}
            </option>
          ))}
        </select>
      </div>

      <label className={`w-fit rounded border px-4 py-2 text-sm ${vendorId ? 'cursor-pointer border-ink-600 text-ink-100 hover:border-volt' : 'cursor-not-allowed border-ink-700 text-ink-600'}`}>
        {importing ? 'Importing…' : 'Choose CSV / Excel file'}
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={!vendorId || importing} onChange={handleImport} />
      </label>

      {result && (
        <div className="rounded border border-ink-700 p-4 text-sm">
          <p className="mb-2 text-ink-100">
            {result.totalRows} rows · <span className="text-volt">{result.created} created/updated</span> ·{' '}
            <span className="text-signal-red">{result.failed} failed</span>
          </p>
          {result.results
            .filter((r) => r.status === 'error')
            .slice(0, 20)
            .map((r, i) => (
              <p key={i} className="text-xs text-signal-red">
                Row {r.row} ({r.sku || 'no SKU'}): {r.error}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
