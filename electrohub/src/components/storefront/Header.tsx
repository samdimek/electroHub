import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { CartIndicator } from './CartIndicator';

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-100">
          <span className="inline-block h-2 w-2 rounded-full bg-volt shadow-[0_0_8px_theme(colors.volt.DEFAULT)]" />
          ElectroHub
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-200 md:flex">
          <Link href="/products" className="hover:text-volt">
            Shop
          </Link>
          <Link href="/vendor/apply" className="hover:text-volt">
            Sell electronics
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <CartIndicator />
          {user ? (
            <Link href={user.role === 'CUSTOMER' ? '/account' : '/admin'} className="text-sm text-ink-200 hover:text-volt">
              {user.name.split(' ')[0]}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded bg-volt px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-volt-dim"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
