import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { Badge } from '@/components/ui/Badge';
import { formatCents } from '@/components/ui/formatters';

async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: 'ACTIVE', vendor: { status: 'APPROVED' } },
    include: { images: { orderBy: { position: 'asc' } }, vendor: true, category: true, inventory: true },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description.slice(0, 155),
    openGraph: {
      title: product.metaTitle || product.title,
      description: product.metaDescription || product.description.slice(0, 155),
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const available = (product.inventory?.quantityOnHand ?? 0) - (product.inventory?.quantityReserved ?? 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.images.map((i) => i.url),
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: product.vendor.storeName },
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 py-10 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded border border-ink-700 bg-ink-800">
          {product.images[0] ? (
            <Image src={product.images[0].url} alt={product.images[0].alt || product.title} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-600 eyebrow">No image available</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="eyebrow">
              {product.vendor.storeName} · {product.category.name}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-100">{product.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="readout text-2xl font-semibold text-ink-100">{formatCents(product.priceCents, product.currency)}</span>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <span className="readout text-sm text-ink-400 line-through">
                {formatCents(product.compareAtCents, product.currency)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {product.brand && <Badge tone="neutral">{product.brand}</Badge>}
            {product.warrantyMonths > 0 && <Badge tone="success">{product.warrantyMonths}-month warranty</Badge>}
            <Badge tone={available > 0 ? 'info' : 'danger'}>{available > 0 ? `${available} in stock` : 'Out of stock'}</Badge>
          </div>

          <AddToCartButton productId={product.id} maxQuantity={available} />

          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-200">{product.description}</p>

          {product.attributes && Object.keys(product.attributes as object).length > 0 && (
            <div className="mt-2 rounded border border-ink-700">
              <p className="eyebrow border-b border-ink-700 px-4 py-2">Specifications</p>
              <dl className="divide-y divide-ink-800">
                {Object.entries(product.attributes as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="flex justify-between px-4 py-2 text-sm">
                    <dt className="text-ink-400">{key}</dt>
                    <dd className="readout text-ink-100">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
