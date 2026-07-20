import { z } from 'zod';

// Enforcement of "electronics vendors only" starts here: vendors must
// pick at least one categoryId, and the API handler (see
// src/app/api/vendors/apply/route.ts) verifies every submitted
// categoryId maps to a Category row where isElectronics = true before
// the application is even accepted as PENDING.
export const vendorApplicationSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  businessEmail: z.string().trim().email(),
  businessPhone: z.string().trim().max(30).optional(),
  taxId: z.string().trim().max(60).optional(),
  categoryIds: z.array(z.string().cuid()).min(1, 'Select at least one electronics category'),
  captchaToken: z.string().min(1),
});

export const vendorRejectionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
