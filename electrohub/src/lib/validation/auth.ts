import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  captchaToken: z.string().min(1, 'Captcha verification required'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
  captchaToken: z.string().min(1, 'Captcha verification required'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(10).max(128),
});
