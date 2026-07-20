import { destroySession, getCurrentUser } from '@/lib/auth';
import { withApiErrorHandling, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await getCurrentUser();
    await destroySession();
    if (user) {
      await writeAuditLog({ actor: user, action: 'user.logout', entityType: 'User', entityId: user.id, request });
    }
    return ok({ success: true });
  });
}
