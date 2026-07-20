import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2), // ISO 3166-1 alpha-2
  phone: z.string().trim().max(30).optional(),
});

export const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  couponCode: z.string().trim().max(50).optional(),
  paymentMethodId: z.string().min(1), // Stripe PaymentMethod id (tokenized, never raw card data)
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
});

export const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(50),
});
