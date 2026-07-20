import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requireAnyRole } from '@/lib/rbac';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';
import type { Permission, Role } from '@prisma/client';

const PERMISSION_VALUES = [
  'PRODUCTS_READ', 'PRODUCTS_WRITE', 'INVENTORY_WRITE', 'ORDERS_READ', 'ORDERS_WRITE',
  'CUSTOMERS_READ', 'CUSTOMERS_WRITE', 'PROMOTIONS_WRITE', 'ANALYTICS_READ',
  'WARRANTY_WRITE', 'VENDORS_APPROVE', 'ROLES_WRITE', 'AUDIT_LOG_READ',
] as const;

const bodySchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'VENDOR_OWNER', 'VENDOR_STAFF', 'CUSTOMER']).optional(),
  permissions: z.array(z.enum(PERMISSION_VALUES)).optional(),
});

/**
 * Only SUPER_ADMIN can change roles/permissions — this is the one action
 * in the platform that is not gated by a Permission flag (a STAFF user
 * could otherwise grant themselves ROLES_WRITE and escalate).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const admin = await requireUser();
    requireAnyRole(admin, ['SUPER_ADMIN']);
    const body = bodySchema.parse(await request.json());

    if (params.id === admin.id && body.role && body.role !== 'SUPER_ADMIN') {
      throw new ApiError(400, 'You cannot demote your own account');
    }

    const updated = await db.user.update({
      where: { id: params.id },
      data: {
        role: body.role as Role | undefined,
        permissions: body.permissions as Permission[] | undefined,
      },
    });

    await writeAuditLog({
      actor: admin,
      action: 'user.role_update',
      entityType: 'User',
      entityId: updated.id,
      metadata: { role: body.role, permissions: body.permissions },
      request,
    });

    return ok({ id: updated.id, role: updated.role, permissions: updated.permissions });
  });
}
