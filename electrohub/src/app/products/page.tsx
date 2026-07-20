import { db } from '@/lib/db';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ProductCard } from '@/components/storefront/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop electronics',
  description: 'Browse electronics from vetted ElectroHub vendors — audio, computing, components, and more.',
};

async function getProducts(q: string, category: string) {
  return db.product.findMany({
    where: {
      status: 'ACTIVE',
      vendor: { status: 'APPROVED' },
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { brand: { contains: q, mode: 'insensitive' } },
              { searchKeywords: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { images: { take: 1, orderBy: { position: 'asc' } }, vendor: { select: { storeName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
}

async function getCategories() {
  return db.category.findMany({ where: { isElectronics: true }, orderBy: { name: 'asc' } });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const q = searchParams.q ?? '';
  const category = searchParams.category ?? '';
  const [products, categories] = await Promise.all([getProducts(q, category), getCategories()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-6 py-10">
        <aside className="hidden w-48 shrink-0 md:block">
          <p className="eyebrow mb-3">Category</p>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              <a href="/products" className={`block rounded px-2 py-1 ${!category ? 'text-volt' : 'text-ink-200 hover:text-volt'}`}>
                All electronics
              </a>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <a
                  href={`/products?category=${c.slug}`}
                  className={`block rounded px-2 py-1 ${category === c.slug ? 'text-volt' : 'text-ink-200 hover:text-volt'}`}
                >
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          <form action="/products" method="get" className="mb-6 flex gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search products, brands…"
              className="w-full rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-volt focus:outline-none"
            />
            <button className="rounded bg-volt px-4 py-2 text-sm font-medium text-ink-950 hover:bg-volt-dim">
              Search
            </button>
          </form>

          {products.length === 0 ? (
            <EmptyState title="No products match yet" description="Try a different search term or category." />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  slug={p.slug}
                  title={p.title}
                  priceCents={p.priceCents}
                  compareAtCents={p.compareAtCents}
                  imageUrl={p.images[0]?.url}
                  vendorName={p.vendor.storeName}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
