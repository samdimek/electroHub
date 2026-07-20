import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export const s3 = new S3Client({
  region: process.env.S3_REGION,
  // Only set for non-AWS S3-compatible providers (Cloudflare R2, MinIO).
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

/**
 * Generates a short-lived, scoped presigned PUT URL so the browser can
 * upload a product image directly to S3 without the file ever passing
 * through our servers. Content-type is pinned into the signature so a
 * client can't swap in an executable/script disguised as an image.
 */
export async function createPresignedUpload(opts: {
  folder: 'products' | 'vendor-logos' | 'vendor-banners' | 'bulk-imports';
  filename: string;
  contentType: string;
}): Promise<PresignedUpload> {
  if (!ALLOWED_IMAGE_TYPES.has(opts.contentType) && opts.folder !== 'bulk-imports') {
    throw new Error('Unsupported content type');
  }

  const ext = opts.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const key = `${opts.folder}/${randomUUID()}.${ext}`;
  const expiresIn = 300; // 5 minutes

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: opts.contentType,
    ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicUrl = process.env.CDN_HOSTNAME
    ? `https://${process.env.CDN_HOSTNAME}/${key}`
    : `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl, expiresIn };
}

/** Server-side upload for things the server generates itself (e.g. export CSVs). */
export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    })
  );
}

export async function getSignedDownloadUrl(key: string, expiresIn = 300) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export { MAX_UPLOAD_BYTES };
