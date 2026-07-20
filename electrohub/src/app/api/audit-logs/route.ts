import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'AUDIT_LOG_READ');

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;
    const actorEmail = searchParams.get('actorEmail') ?? undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = 50;

    const where = {
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...(entityType ? { entityType } : {}),
      ...(actorEmail ? { actorEmail: { contains: actorEmail, mode: 'insensitive' as const } } : {}),
    };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return ok({ logs, total, page, pageSize });
  });
}
