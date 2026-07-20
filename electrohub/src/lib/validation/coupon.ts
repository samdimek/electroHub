import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(30).regex(/^[A-Z0-9_-]+$/),
  description: z.string().trim().max(300).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().nonnegative(),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});
