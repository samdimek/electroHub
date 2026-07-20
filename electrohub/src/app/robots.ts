import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || 'https://electrohub.example';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/vendor/dashboard', '/api', '/checkout', '/cart', '/account'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
