import { z } from 'zod';

export const productSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(10000),
  brand: z.string().trim().max(100).optional(),
  sku: z.string().trim().min(1).max(64),
  categoryId: z.string().cuid(),
  priceCents: z.number().int().nonnegative(),
  compareAtCents: z.number().int().nonnegative().optional(),
  warrantyMonths: z.number().int().min(0).max(120).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  searchKeywords: z.string().trim().max(300).optional(),
  weightGrams: z.number().int().nonnegative().optional(),
  images: z
    .array(z.object({ s3Key: z.string(), url: z.string().url(), alt: z.string().optional() }))
    .max(10)
    .optional(),
  initialQuantity: z.number().int().nonnegative().default(0),
});

export const productUpdateSchema = productSchema.partial();

export const inventoryAdjustSchema = z.object({
  quantityDelta: z.number().int(),
  reason: z.string().trim().min(2).max(300),
});

// One row of a bulk CSV/Excel import. Column names are matched
// case-insensitively and mapped onto this shape in the import route.
export const productImportRowSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(10000).default(''),
  sku: z.string().trim().min(1).max(64),
  categorySlug: z.string().trim().min(1),
  brand: z.string().trim().max(100).optional().default(''),
  priceCents: z.coerce.number().int().nonnegative(),
  compareAtCents: z.coerce.number().int().nonnegative().optional(),
  quantity: z.coerce.number().int().nonnegative().default(0),
  warrantyMonths: z.coerce.number().int().min(0).max(120).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
});
