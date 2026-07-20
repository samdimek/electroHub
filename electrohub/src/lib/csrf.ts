import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'crypto';

const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'eh_csrf';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit cookie CSRF protection: a random token is set in a
 * readable (non-httpOnly) cookie. The frontend echoes it back as a
 * request header on every mutating call. A cross-site form post can
 * forge the cookie's presence (browsers still attach it) but cannot
 * read the cookie's value to put it in the header, so the two won't
 * match on a forged request.
 */
export function issueCsrfCookie(): string {
  const token = randomBytes(24).toString('hex');
  cookies().set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  return token;
}

export function verifyCsrf(request: Request): boolean {
  const cookieToken = cookies().get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { CSRF_COOKIE, CSRF_HEADER };
