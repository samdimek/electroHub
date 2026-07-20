import type { Permission, Role } from '@prisma/client';
import { AuthError, ROLE_DEFAULT_PERMISSIONS, type SessionUser } from './auth';

const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
const VENDOR_ROLES: Role[] = ['VENDOR_OWNER', 'VENDOR_STAFF'];

export function effectivePermissions(user: SessionUser): Set<Permission> {
  const set = new Set<Permission>(ROLE_DEFAULT_PERMISSIONS[user.role]);
  for (const p of user.permissions) set.add(p); // user-level overrides/grants
  return set;
}

export function hasPermission(user: SessionUser, permission: Permission): boolean {
  return effectivePermissions(user).has(permission);
}

/** Throws AuthError('FORBIDDEN') if the user lacks the permission. Use inside API routes. */
export function requirePermission(user: SessionUser, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new AuthError('FORBIDDEN', `Missing permission: ${permission}`);
  }
}

export function requireAnyRole(user: SessionUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError('FORBIDDEN', `Requires one of roles: ${roles.join(', ')}`);
  }
}

export function isAdmin(user: SessionUser): boolean {
  return ADMIN_ROLES.includes(user.role);
}

export function isVendor(user: SessionUser): boolean {
  return VENDOR_ROLES.includes(user.role);
}

export { ADMIN_ROLES, VENDOR_ROLES };
