import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// Separate limiter tiers so a burst on one endpoint class (e.g. login
// attempts) can't be used to reason about limits on another (e.g. the
// storefront product feed).
export const limiters = {
  // Auth endpoints: tight limit to slow down credential stuffing / brute force.
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'rl:auth',
  }),
  // Generic write APIs (product/order/coupon mutations).
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'rl:write',
  }),
  // Public read APIs (storefront browsing, search).
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '60 s'),
    prefix: 'rl:read',
  }),
  // Checkout / payment endpoints: stricter than generic writes.
  checkout: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'rl:checkout',
  }),
};

export type LimiterName = keyof typeof limiters;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Applies a rate limit keyed by client IP (+ optional extra key, e.g. email
 * on login so an attacker can't just rotate IPs against one account, or
 * vice versa).
 */
export async function checkRateLimit(
  name: LimiterName,
  ip: string,
  extraKey?: string
): Promise<RateLimitResult> {
  const key = extraKey ? `${ip}:${extraKey}` : ip;
  const result = await limiters[name].limit(key);
  return result;
}

export function getClientIp(headers: Headers): string {
  // Vercel sets x-forwarded-for; take the first (client-facing) hop.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? '127.0.0.1';
}
