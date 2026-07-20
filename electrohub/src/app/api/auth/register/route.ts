import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, isPasswordStrongEnough } from '@/lib/argon2';
import { createSession } from '@/lib/auth';
import { issueCsrfCookie } from '@/lib/csrf';
import { verifyCaptcha } from '@/lib/captcha';
import { registerSchema } from '@/lib/validation/auth';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { emails } from '@/lib/email';
import { getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const body = registerSchema.parse(await request.json());
    const ip = getClientIp(request.headers);

    const captchaOk = await verifyCaptcha(body.captchaToken, ip);
    if (!captchaOk) throw new ApiError(400, 'Captcha verification failed');

    if (!isPasswordStrongEnough(body.password)) {
      throw new ApiError(400, 'Password must be at least 10 characters and mix upper/lower/number/symbol');
    }

    const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      // Same generic message as a real success path's next step would
      // imply, to avoid confirming account existence via response
      // differences (basic user enumeration hardening).
      throw new ApiError(409, 'Unable to create account with these details');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        role: 'CUSTOMER',
      },
    });

    await createSession(user.id, { ip, userAgent: request.headers.get('user-agent') ?? undefined });
    issueCsrfCookie();

    await writeAuditLog({
      actor: { ...user, permissions: [] },
      action: 'user.register',
      entityType: 'User',
      entityId: user.id,
      request,
    });

    await emails.welcome(user.email, user.name);

    return ok({ id: user.id, name: user.name, email: user.email, role: user.role }, 201);
  });
}
