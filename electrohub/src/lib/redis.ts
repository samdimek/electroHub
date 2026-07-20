import { Redis } from '@upstash/redis';

// Upstash's REST-based client works over plain HTTPS fetch calls, which
// is what makes it usable from Vercel's serverless/edge functions (a
// normal TCP redis client can't hold a persistent connection there).
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DEFAULT_TTL_SECONDS = 60 * 5;

/** Read-through cache helper: return the cached value, or compute + store it. */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;

  const value = await fn();
  await redis.set(key, value, { ex: ttlSeconds });
  return value;
}

/** Invalidate one or more cache keys, e.g. after a product/inventory write. */
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redis.del(...keys);
}

/** Invalidate every key under a prefix by scanning (use sparingly). */
export async function invalidatePrefix(prefix: string): Promise<void> {
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
    if (keys.length) await redis.del(...keys);
    cursor = Number(nextCursor);
  } while (cursor !== 0);
}

export const cacheKeys = {
  productList: (params: string) => `products:list:${params}`,
  product: (slug: string) => `products:item:${slug}`,
  categoryTree: () => 'categories:tree',
  analyticsSummary: (vendorId: string, range: string) => `analytics:${vendorId}:${range}`,
};
