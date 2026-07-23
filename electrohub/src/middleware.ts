import { NextResponse, type NextRequest } from 'next/server';

// Rate limiting (Upstash) is temporarily removed here while we isolate a
// persistent Next.js build failure — see chat history. CSRF protection
// and the coarse admin/vendor auth gate below have no external
// dependencies, so they're unaffected and remain fully active.

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'eh_session';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'eh_csrf';
const CSRF_HEADER = 'x-csrf-token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PREFIXES = ['/api/auth/login', '/api/auth/register', '/api/webhooks/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
