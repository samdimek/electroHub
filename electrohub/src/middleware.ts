import { NextResponse, type NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Middleware runs on the Edge runtime, so it cannot use Prisma (Node-only
// driver) or `next/headers` cookies() helpers from server components.
// It therefore does two cheap, edge-safe jobs and leaves fine-grained
// authorization (role/permission checks against the DB) to the Node.js
// runtime in API routes / server components:
//   1. Rate limiting (Upstash's REST client works fine over `fetch`).
//   2. CSRF double-submit check on mutating API requests.
//   3. Coarse "is there a session cookie at all" redirect for /admin and
//      /vendor pages — the real role check happens server-side after this.

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const authLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s'), prefix: 'rl:auth' });
const writeLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60 s'), prefix: 'rl:write' });
const readLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '60 s'), prefix: 'rl:read' });

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'eh_session';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'eh_csrf';
const CSRF_HEADER = 'x-csrf-token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Endpoints that legitimately can't carry our CSRF header: the login/
// register forms fire before a CSRF cookie exists yet (protected instead
// by CAPTCHA + rate limiting), and the Stripe webhook is authenticated
// via signature verification, not a browser session.
const CSRF_EXEMPT_PREFIXES = ['/api/auth/login', '/api/auth/register', '/api/webhooks/'];

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getIp(req);

  // ── Rate limiting ────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isAuthRoute = pathname.startsWith('/api/auth/');
    const limiter = isAuthRoute ? authLimiter : MUTATING_METHODS.has(req.method) ? writeLimiter : readLimiter;
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        }
      );
    }
  }

  // ── CSRF (double-submit cookie) on mutating API requests ───────────
  if (
    pathname.startsWith('/api/') &&
    MUTATING_METHODS.has(req.method) &&
    !CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
    const headerToken = req.headers.get(CSRF_HEADER);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 });
    }
  }

  // ── Coarse auth gate for admin/vendor page shells ──────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/vendor/dashboard')) {
    const hasSession = req.cookies.get(SESSION_COOKIE)?.value;
    if (!hasSession) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/vendor/dashboard/:path*'],
};
