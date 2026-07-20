'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';

interface LogRow {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (action) params.set('action', action);
    if (actorEmail) params.set('actorEmail', actorEmail);
    apiFetch<{ logs: LogRow[]; total: number }>(`/api/audit-logs?${params}`)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Audit logs</h1>
      <p className="text-sm text-ink-400">
        Every state-changing action across the platform — product writes, order status changes, vendor approvals,
        role changes, refunds — is recorded here immutably.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex flex-wrap gap-3"
      >
        <Input placeholder="Filter by action (e.g. product.create)" value={action} onChange={(e) => setAction(e.target.value)} />
        <Input placeholder="Filter by actor email" value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} />
      </form>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : logs.length === 0 ? (
        <EmptyState title="No matching log entries" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <Td className="readout text-xs">{new Date(l.createdAt).toLocaleString()}</Td>
                  <Td>{l.actorEmail ?? 'System'}</Td>
                  <Td className="readout">{l.action}</Td>
                  <Td className="readout text-xs text-ink-400">
                    {l.entityType}
                    {l.entityId ? `:${l.entityId.slice(0, 8)}…` : ''}
                  </Td>
                  <Td className="readout text-xs">{l.ip ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span>
              Page {page} · {total} total entries
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-ink-600 px-3 py-1 disabled:opacity-40">
                Previous
              </button>
              <button disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)} className="rounded border border-ink-600 px-3 py-1 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
