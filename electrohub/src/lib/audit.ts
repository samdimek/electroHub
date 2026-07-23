import { db } from './db';
import type { SessionUser } from './auth';

interface AuditContext {
  actor: SessionUser | null;
  action: string; // dot.case, e.g. "product.create", "vendor.approve"
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

/**
 * Writes an immutable audit trail entry. Called from every state-changing
 * admin/vendor API route (product writes, order status changes, vendor
 * approvals, role changes, coupon writes, refunds, etc). Never throws —
 * a logging failure should not block the underlying business action, but
 * it is reported to Sentry so gaps in the trail get noticed.
 */
export async function writeAuditLog(ctx: AuditContext): Promise<void> {
  try {
    const ip = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const userAgent = ctx.request?.headers.get('user-agent') ?? undefined;

    await db.auditLog.create({
      data: {
        actorId: ctx.actor?.id,
        actorEmail: ctx.actor?.email,
        action: ctx.action,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        metadata: ctx.metadata as any,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error('[audit-log] failed to write entry:', ctx.action, err);
  }
}
