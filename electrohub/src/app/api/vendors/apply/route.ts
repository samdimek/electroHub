import { type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { vendorApplicationSchema } from '@/lib/validation/vendor';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { emails } from '@/lib/email';
import { verifyCaptcha } from '@/lib/captcha';
import { getClientIp } from '@/lib/rateLimit';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const body = vendorApplicationSchema.parse(await request.json());

    const captchaOk = await verifyCaptcha(body.captchaToken, getClientIp(request.headers));
    if (!captchaOk) throw new ApiError(400, 'Captcha verification failed');

    // ── Electronics-only enforcement ──────────────────────────────────
    // Every category the applicant selects must exist AND be flagged
    // isElectronics = true. If any category fails that check, the whole
    // application is rejected up front — this is the platform-level gate
    // that keeps non-electronics sellers off the marketplace.
    const categories = await db.category.findMany({ where: { id: { in: body.categoryIds } } });
    if (categories.length !== body.categoryIds.length) {
      throw new ApiError(400, 'One or more selected categories do not exist');
    }
    const nonElectronics = categories.filter((c) => !c.isElectronics);
    if (nonElectronics.length > 0) {
      throw new ApiError(
        400,
        `ElectroHub only accepts electronics vendors. These categories are not eligible: ${nonElectronics
          .map((c) => c.name)
          .join(', ')}`
      );
    }

    const existingMembership = await db.vendorMember.findFirst({ where: { userId: user.id } });
    if (existingMembership) {
      throw new ApiError(409, 'This account is already linked to a vendor store');
    }

    const baseSlug = slugify(body.storeName);
    let slug = baseSlug;
    let suffix = 1;
    while (await db.vendor.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const vendor = await db.vendor.create({
      data: {
        storeName: body.storeName,
        slug,
        description: body.description,
        businessEmail: body.businessEmail,
        businessPhone: body.businessPhone,
        taxId: body.taxId,
        status: 'PENDING',
        categories: { create: body.categoryIds.map((categoryId) => ({ categoryId })) },
        members: { create: { userId: user.id, role: 'VENDOR_OWNER' } },
      },
    });

    await db.user.update({ where: { id: user.id }, data: { role: 'VENDOR_OWNER' } });

    await writeAuditLog({
      actor: user,
      action: 'vendor.apply',
      entityType: 'Vendor',
      entityId: vendor.id,
      metadata: { storeName: vendor.storeName, categoryIds: body.categoryIds },
      request,
    });

    await emails.vendorApplicationReceived(body.businessEmail, vendor.storeName);

    return ok({ id: vendor.id, slug: vendor.slug, status: vendor.status }, 201);
  });
}
