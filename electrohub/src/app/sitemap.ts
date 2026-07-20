import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'https://electrohub.example';

  const products = await db.product.findMany({
    where: { status: 'ACTIVE', vendor: { status: 'APPROVED' } },
    select: { slug: true, updatedAt: true },
    take: 5000,
  });

  const categories = await db.category.findMany({ where: { isElectronics: true }, select: { slug: true } });

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({
      url: `${base}/products?category=${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
