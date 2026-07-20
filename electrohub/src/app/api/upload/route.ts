import { type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { createPresignedUpload } from '@/lib/s3';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { z } from 'zod';

const requestSchema = z.object({
  folder: z.enum(['products', 'vendor-logos', 'vendor-banners', 'bulk-imports']),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});

/**
 * Returns a short-lived presigned S3 PUT URL. The browser uploads the
 * file directly to S3 with this URL — the file bytes never pass through
 * our server, which keeps large image/CSV uploads cheap on serverless
 * function execution time and memory.
 */
export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PRODUCTS_WRITE');
    const body = requestSchema.parse(await request.json());

    try {
      const presigned = await createPresignedUpload(body);
      return ok(presigned);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Unable to create upload URL');
    }
  });
}
