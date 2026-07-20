import { z } from 'zod';

export const warrantyClaimSchema = z.object({
  warrantyId: z.string().cuid(),
  description: z.string().trim().min(10).max(2000),
});

export const warrantyClaimUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED']),
  resolution: z.string().trim().max(2000).optional(),
});
