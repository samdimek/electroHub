import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-2xl font-semibold text-ink-100">This page isn&rsquo;t on the board</h1>
      <p className="max-w-sm text-sm text-ink-400">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link href="/" className="mt-2 rounded bg-volt px-4 py-2 text-sm font-medium text-ink-950 hover:bg-volt-dim">
        Back to shop
      </Link>
    </div>
  );
}
