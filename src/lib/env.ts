import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_IMAGE_MODEL: z.string().default("gemini-3-pro-image-preview"),
  GOOGLE_IMAGE_ALLOW_FALLBACK: z.coerce.boolean().default(false),
  GOOGLE_IMAGE_FALLBACK_MODEL: z.string().optional(),
  NANOBANANA_API_KEY: z.string().optional(),
  NANOBANANA_API_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("mydscvr-eats"),
  R2_PUBLIC_URL: z.string().url().default("https://images.mydscvr.ai"),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_JWT_ISSUER: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_STARTER_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().positive().default(14),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  FRONTEND_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
