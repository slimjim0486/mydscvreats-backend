import "dotenv/config";
import { z } from "zod";

const optionalString = (schema: z.ZodString = z.string()) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.npm_lifecycle_event === "test";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  ANTHROPIC_API_KEY: optionalString(),
  GEMINI_API_KEY: optionalString(),
  GOOGLE_API_KEY: optionalString(),
  IP_HASH_PEPPER: isTestEnv
    ? z.string().min(16).default("test-only-ip-hash-pepper")
    : z.string().min(16),
  GOOGLE_IMAGE_MODEL: z.string().default("gemini-3-pro-image-preview"),
  GOOGLE_IMAGE_ALLOW_FALLBACK: z.coerce.boolean().default(false),
  GOOGLE_IMAGE_FALLBACK_MODEL: optionalString(),
  APIFY_API_TOKEN: optionalString(),
  APIFY_ACTOR_GMAPS: z.string().default("compass/crawler-google-places"),
  APIFY_ACTOR_GMAPS_REVIEWS: z.string().default("compass/google-maps-reviews-scraper"),
  APIFY_ACTOR_GSEARCH: z.string().default("apify/google-search-scraper"),
  APIFY_ACTOR_WEB: z.string().default("apify/website-content-crawler"),
  APIFY_ACTOR_TALABAT: optionalString(),
  APIFY_ACTOR_DELIVEROO: optionalString(),
  APIFY_ACTOR_CAREEM: optionalString(),
  NANOBANANA_API_KEY: optionalString(),
  NANOBANANA_API_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  R2_ACCOUNT_ID: optionalString(),
  R2_ACCESS_KEY_ID: optionalString(),
  R2_SECRET_ACCESS_KEY: optionalString(),
  R2_BUCKET_NAME: z.string().default("mydscvr-eats"),
  R2_PUBLIC_URL: z.string().url().default("https://images.getbustan.com"),
  CLERK_SECRET_KEY: optionalString(),
  CLERK_JWT_KEY: optionalString(),
  CLERK_JWT_ISSUER: optionalString(),
  CLERK_WEBHOOK_SECRET: optionalString(z.string().min(20)),
  STRIPE_SECRET_KEY: optionalString(),
  STRIPE_WEBHOOK_SECRET: optionalString(),
  BACKEND_WEBHOOK_SYNC_SECRET: optionalString(z.string().min(32)),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: optionalString(z.string().min(16)),
  WHATSAPP_TOKEN_ENCRYPTION_KEY: optionalString(z.string().min(32)),
  META_APP_ID: optionalString(),
  META_APP_SECRET: optionalString(),
  META_WHATSAPP_CONFIG_ID: optionalString(),
  META_GRAPH_API_VERSION: z.string().default("v24.0"),
  STRIPE_STARTER_PRICE_ID: optionalString(),
  STRIPE_PRO_PRICE_ID: optionalString(),
  STRIPE_PORTFOLIO_PRICE_ID: optionalString(),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().positive().default(14),
  RESEND_API_KEY: optionalString(),
  RESEND_FROM_EMAIL: optionalString(z.string().email()),
  FRONTEND_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
