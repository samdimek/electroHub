import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import { db } from './db';
import { cached, invalidate, redis } from './redis';
import type { Role, Permission, User } from '@prisma/client';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'eh_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'isActive'> & {
  permissions: Permission[];
};

function hashToken(token: string): string {
  // Opaque, high-entropy random session tokens are safe to hash with plain
  // SHA-256 (unlike passwords, there's no offline guessing risk) — this
  // just avoids storing the literal bearer token at rest.
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a DB-backed session (so it can be revoked / audited / listed as
 * "active devices") and sets an httpOnly, Secure, SameSite=Lax cookie
 * holding only the opaque token. A parallel non-httpOnly CSRF cookie is
 * also set — see csrf.ts.
 */
export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string }
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.session.create({
    data: { userId, tokenHash, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db.session.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
    await invalidate(`session:${tokenHash}`);
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * Resolves the current request's session to a user, caching the lookup in
 * Redis for a short window so authenticated pages/API routes don't hit
 * Postgres on every request.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);

  const session = await cached(
    `session:${tokenHash}`,
    async () => {
      const s = await db.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!s || s.revokedAt || s.expiresAt < new Date() || !s.user.isActive) return null;
      return {
        id: s.user.id,
        email: s.user.email,
        name: s.user.name,
        role: s.user.role,
        isActive: s.user.isActive,
        permissions: s.user.permissions,
      } satisfies SessionUser;
    },
    30 // short TTL: role/permission changes propagate within 30s
  );

  return session;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('UNAUTHENTICATED', 'Sign in required');
  return user;
}

export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'LOCKED',
    message: string
  ) {
    super(message);
  }
}

/** Track failed logins in Redis for fast, cheap account lockout. */
export async function recordFailedLogin(email: string): Promise<number> {
  const key = `failedlogin:${email.toLowerCase()}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60 * 15);
  return count;
}

export async function clearFailedLogins(email: string): Promise<void> {
  await redis.del(`failedlogin:${email.toLowerCase()}`);
}

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'PRODUCTS_READ', 'PRODUCTS_WRITE', 'INVENTORY_WRITE', 'ORDERS_READ', 'ORDERS_WRITE',
    'CUSTOMERS_READ', 'CUSTOMERS_WRITE', 'PROMOTIONS_WRITE', 'ANALYTICS_READ',
    'WARRANTY_WRITE', 'VENDORS_APPROVE', 'ROLES_WRITE', 'AUDIT_LOG_READ',
  ],
  ADMIN: [
    'PRODUCTS_READ', 'PRODUCTS_WRITE', 'INVENTORY_WRITE', 'ORDERS_READ', 'ORDERS_WRITE',
    'CUSTOMERS_READ', 'CUSTOMERS_WRITE', 'PROMOTIONS_WRITE', 'ANALYTICS_READ',
    'WARRANTY_WRITE', 'VENDORS_APPROVE', 'AUDIT_LOG_READ',
  ],
  STAFF: ['PRODUCTS_READ', 'ORDERS_READ', 'CUSTOMERS_READ', 'ANALYTICS_READ'],
  VENDOR_OWNER: [
    'PRODUCTS_READ', 'PRODUCTS_WRITE', 'INVENTORY_WRITE', 'ORDERS_READ',
    'PROMOTIONS_WRITE', 'ANALYTICS_READ', 'WARRANTY_WRITE',
  ],
  VENDOR_STAFF: ['PRODUCTS_READ', 'ORDERS_READ', 'ANALYTICS_READ'],
  CUSTOMER: [],
};
