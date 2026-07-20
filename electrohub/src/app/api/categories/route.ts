import { db } from '@/lib/db';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';
import { cached, cacheKeys } from '@/lib/redis';

/**
 * Public endpoint. Only electronics categories are ever created in this
 * platform (see prisma/seed.ts), but the isElectronics filter is kept
 * explicit here as a second guard rather than relying on "we only ever
 * insert electronics rows."
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    const categories = await cached(
      cacheKeys.categoryTree(),
      () => db.category.findMany({ where: { isElectronics: true }, orderBy: { name: 'asc' } }),
      600
    );
    return ok(categories);
  });
}
