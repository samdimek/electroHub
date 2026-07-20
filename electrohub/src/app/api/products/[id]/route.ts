import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { productUpdateSchema } from '@/lib/validation/product';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { invalidatePrefix, invalidate, cacheKeys } from '@/lib/redis';

async function assertOwnership(userId: string, productId: string, adminBypass: boolean) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { vendor: { include: { members: true } } } });
  if (!product) throw new ApiError(404, 'Product not found');
  if (!adminBypass && !product.vendor.members.some((m) => m.userId === userId)) {
    throw new ApiError(403, 'You do not have access to this product');
  }
  return product;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: { images: true, inventory: true, category: true, vendor: true },
    });
    if (!product) throw new ApiError(404, 'Product not found');
    return ok(product);
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PRODUCTS_WRITE');
    await assertOwnership(user.id, params.id, isAdmin(user));

    const body = productUpdateSchema.parse(await request.json());

    if (body.categoryId) {
      const category = await db.category.findUnique({ where: { id: body.categoryId } });
      if (!category || !category.isElectronics) {
        throw new ApiError(400, 'Products may only be listed under electronics categories');
      }
    }

    const { images, initialQuantity, ...rest } = body;
    const updated = await db.product.update({
      where: { id: params.id },
      data: rest,
      include: { images: true, inventory: true },
    });

    await invalidatePrefix('products:list:');
    await invalidate(cacheKeys.product(updated.slug));
    await writeAuditLog({
      actor: user,
      action: 'product.update',
      entityType: 'Product',
      entityId: updated.id,
      metadata: { changes: rest },
      request,
    });

    return ok(updated);
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PRODUCTS_WRITE');
    const product = await assertOwnership(user.id, params.id, isAdmin(user));

    // Soft delete via archiving rather than a hard delete, so historical
    // orders/warranties that reference this product stay intact.
    const archived = await db.product.update({ where: { id: params.id }, data: { status: 'ARCHIVED' } });

    await invalidatePrefix('products:list:');
    await invalidate(cacheKeys.product(product.slug));
    await writeAuditLog({ actor: user, action: 'product.archive', entityType: 'Product', entityId: product.id, request });

    return ok({ id: archived.id, status: archived.status });
  });
}
