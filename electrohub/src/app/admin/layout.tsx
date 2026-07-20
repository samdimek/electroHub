import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/vendors', label: 'Vendors' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/products/import', label: 'Bulk import' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/promotions', label: 'Promotions' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/warranty', label: 'Warranty' },
  { href: '/admin/roles', label: 'Roles & permissions' },
  { href: '/admin/audit-logs', label: 'Audit logs' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) redirect('/login?next=/admin');

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-ink-700 bg-ink-900 p-6">
        <p className="mb-1 font-display text-lg font-semibold text-ink-100">Admin</p>
        <p className="eyebrow mb-6">{user.role.replace('_', ' ')}</p>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded px-3 py-2 text-ink-200 hover:bg-ink-800 hover:text-volt">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
