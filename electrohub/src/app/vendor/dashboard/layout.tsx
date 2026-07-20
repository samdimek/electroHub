import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { isVendor } from '@/lib/rbac';

const NAV = [
  { href: '/vendor/dashboard', label: 'Overview' },
  { href: '/vendor/dashboard/products', label: 'Products' },
  { href: '/vendor/dashboard/orders', label: 'Orders' },
  { href: '/vendor/dashboard/coupons', label: 'Promotions' },
  { href: '/vendor/dashboard/warranty', label: 'Warranty' },
];

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Full role check happens here (Node.js runtime, DB-backed) — the edge
  // middleware only confirmed a session cookie exists.
  if (!user || !isVendor(user)) redirect('/login?next=/vendor/dashboard');

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-ink-700 bg-ink-900 p-6">
        <p className="mb-6 font-display text-lg font-semibold text-ink-100">Vendor</p>
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
