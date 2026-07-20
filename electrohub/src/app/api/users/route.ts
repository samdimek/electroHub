import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requireAnyRole } from '@/lib/rbac';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const admin = await requireUser();
    requireAnyRole(admin, ['SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    const users = await db.user.findMany({
      where: q
        ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return ok(users);
  });
}
