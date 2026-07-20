import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/argon2';
import { createSession } from '@/lib/auth';
import { issueCsrfCookie } from '@/lib/csrf';
import { verifyCaptcha } from '@/lib/captcha';
import { loginSchema } from '@/lib/validation/auth';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const GENERIC_ERROR = 'Invalid email or password';

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const body = loginSchema.parse(await request.json());
    const ip = getClientIp(request.headers);

    const captchaOk = await verifyCaptcha(body.captchaToken, ip);
    if (!captchaOk) throw new ApiError(400, 'Captcha verification failed');

    const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });

    // Constant-shape response whether or not the account exists, to avoid
    // leaking which emails are registered.
    if (!user) {
      throw new ApiError(401, GENERIC_ERROR);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiError(423, 'Account temporarily locked due to repeated failed logins. Try again later.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'This account has been disabled. Contact support.');
    }

    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      const failedCount = user.failedLoginCount + 1;
      const shouldLock = failedCount >= MAX_ATTEMPTS;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: shouldLock ? 0 : failedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
        },
      });
      await writeAuditLog({
        actor: null,
        action: 'user.login_failed',
        entityType: 'User',
        entityId: user.id,
        metadata: { email: user.email, locked: shouldLock },
        request,
      });
      throw new ApiError(401, GENERIC_ERROR);
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    await createSession(user.id, { ip, userAgent: request.headers.get('user-agent') ?? undefined });
    issueCsrfCookie();

    await writeAuditLog({
      actor: { ...user, permissions: user.permissions },
      action: 'user.login',
      entityType: 'User',
      entityId: user.id,
      request,
    });

    return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
  });
}
