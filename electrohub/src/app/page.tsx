import Link from 'next/link';
import { db } from '@/lib/db';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ProductCard } from '@/components/storefront/ProductCard';

export const revalidate = 120;

async function getFeatured() {
  return db.product.findMany({
    where: { status: 'ACTIVE', vendor: { status: 'APPROVED' } },
    include: { images: { take: 1, orderBy: { position: 'asc' } }, vendor: { select: { storeName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
}

async function getCategories() {
  return db.category.findMany({ where: { isElectronics: true, parentId: null }, orderBy: { name: 'asc' }, take: 6 });
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([getFeatured(), getCategories()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow mb-4">Vendor-verified · Electronics only</p>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-ink-100 md:text-5xl">
            Every store here sells one thing: electronics.
          </h1>
          <p className="mt-4 max-w-xl text-ink-200">
            ElectroHub only approves vendors in electronics categories — audio, computing, components, wearables,
            and more. Every order ships with warranty tracking built in.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/products" className="rounded bg-volt px-5 py-2.5 text-sm font-medium text-ink-950 hover:bg-volt-dim">
              Browse the catalog
            </Link>
            <Link
              href="/vendor/apply"
              className="rounded border border-ink-600 px-5 py-2.5 text-sm font-medium text-ink-100 hover:border-volt"
            >
              Apply as a vendor
            </Link>
          </div>
        </section>

        {categories.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className="rounded-full border border-ink-700 px-4 py-1.5 text-xs text-ink-200 hover:border-volt hover:text-volt"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-100">Newest listings</h2>
            <Link href="/products" className="text-sm text-volt hover:underline">
              View all
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-ink-400">
              No products yet — once vendors are approved and list electronics, they will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
