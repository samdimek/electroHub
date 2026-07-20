import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { productSchema } from '@/lib/validation/product';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { cached, cacheKeys, invalidatePrefix } from '@/lib/redis';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Public storefront feed by default (cached, ACTIVE products from
 * APPROVED vendors only). Pass `?scope=mine` to instead get an
 * authenticated vendor/admin's own catalog (any status), used by the
 * vendor and admin product management screens.
 */
export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('scope') === 'mine') {
      const user = await requireUser();
      requirePermission(user, 'PRODUCTS_READ');
      const vendorId = searchParams.get('vendorId');

      const where = isAdmin(user)
        ? vendorId
          ? { vendorId }
          : {}
        : { vendor: { members: { some: { userId: user.id } } } };

      const products = await db.product.findMany({
        where,
        include: { images: { take: 1, orderBy: { position: 'asc' } }, inventory: true, category: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return ok({ products });
    }

    const q = searchParams.get('q')?.trim() ?? '';
    const categorySlug = searchParams.get('category') ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = 24;
    const cacheKey = cacheKeys.productList(`${q}:${categorySlug}:${page}`);

    const result = await cached(
      cacheKey,
      async () => {
        const where = {
          status: 'ACTIVE' as const,
          vendor: { status: 'APPROVED' as const },
          ...(categorySlug ? { category: { slug: categorySlug } } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: 'insensitive' as const } },
                  { searchKeywords: { contains: q, mode: 'insensitive' as const } },
                  { brand: { contains: q, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        };

        const [products, total] = await Promise.all([
          db.product.findMany({
            where,
            include: { images: { orderBy: { position: 'asc' }, take: 1 }, vendor: { select: { storeName: true, slug: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          db.product.count({ where }),
        ]);

        return { products, total, page, pageSize };
      },
      120
    );

    return ok(result);
  });
}

/** Vendor/admin product creation. */
export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PRODUCTS_WRITE');

    const body = productSchema.parse(await request.json());

    const vendor = isAdmin(user)
      ? await resolveVendorForAdmin(request)
      : await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });

    if (!vendor) throw new ApiError(400, 'No vendor store associated with this account');
    if (vendor.status !== 'APPROVED') throw new ApiError(403, 'Vendor store is not approved yet');

    const category = await db.category.findUnique({ where: { id: body.categoryId } });
    if (!category || !category.isElectronics) {
      throw new ApiError(400, 'Products may only be listed under electronics categories');
    }

    const baseSlug = slugify(body.title);
    let slug = baseSlug;
    let suffix = 1;
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const product = await db.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: body.categoryId,
        title: body.title,
        slug,
        description: body.description,
        brand: body.brand,
        sku: body.sku,
        status: body.status,
        priceCents: body.priceCents,
        compareAtCents: body.compareAtCents,
        warrantyMonths: body.warrantyMonths,
        attributes: body.attributes,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        searchKeywords: body.searchKeywords,
        weightGrams: body.weightGrams,
        images: body.images ? { create: body.images.map((img, i) => ({ ...img, position: i })) } : undefined,
        inventory: { create: { quantityOnHand: body.initialQuantity } },
      },
      include: { images: true, inventory: true },
    });

    await invalidatePrefix('products:list:');
    await writeAuditLog({
      actor: user,
      action: 'product.create',
      entityType: 'Product',
      entityId: product.id,
      metadata: { title: product.title, sku: product.sku, vendorId: vendor.id },
      request,
    });

    return ok(product, 201);
  });
}

async function resolveVendorForAdmin(request: NextRequest) {
  const vendorId = new URL(request.url).searchParams.get('vendorId');
  if (!vendorId) return null;
  return db.vendor.findUnique({ where: { id: vendorId } });
}
