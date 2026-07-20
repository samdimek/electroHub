import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink-100">Hi, {user.name.split(' ')[0]}</h1>
        <p className="mb-8 text-sm text-ink-400">{user.email}</p>

        <div className="flex flex-col gap-3">
          <Link href="/account/orders" className="rounded border border-ink-700 px-4 py-3 text-sm text-ink-100 hover:border-volt">
            Order history &amp; warranty
          </Link>
          <Link href="/products" className="rounded border border-ink-700 px-4 py-3 text-sm text-ink-100 hover:border-volt">
            Continue shopping
          </Link>
          {(user.role === 'VENDOR_OWNER' || user.role === 'VENDOR_STAFF') && (
            <Link href="/vendor/dashboard" className="rounded border border-ink-700 px-4 py-3 text-sm text-ink-100 hover:border-volt">
              Vendor dashboard
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
