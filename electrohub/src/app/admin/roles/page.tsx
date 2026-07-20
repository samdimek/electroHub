'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Table, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'VENDOR_OWNER', 'VENDOR_STAFF', 'CUSTOMER'];

export default function AdminRolesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiFetch<UserRow[]>('/api/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function changeRole(id: string, role: string) {
    try {
      await apiFetch(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update role');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-100">Roles &amp; permissions</h1>
      <p className="text-sm text-ink-400">
        Only super admins can change roles. Fine-grained permission overrides are available via the API for
        exceptions (e.g. giving one staff member access to promotions).
      </p>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <select
                    defaultValue={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-ink-100"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <Badge tone={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Suspended'}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
