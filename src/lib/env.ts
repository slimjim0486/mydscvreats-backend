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
  SOUS_CHEF_MODEL: z.string().default("claude-3-5-haiku-20241022"),
  SUPPORT_TRIAGE_MODEL: z.string().default("claude-sonnet-4-6"),
  GEMINI_API_KEY: optionalString(),
  GOOGLE_API_KEY: optionalString(),
  IP_HASH_PEPPER: isTestEnv
    ? z.string().min(16).default("test-only-ip-hash-pepper")
    : z.string().min(16),
  GOOGLE_IMAGE_MODEL: z.string().default("gemini-3-pro-image-preview"),
  GOOGLE_IMAGE_ALLOW_FALLBACK: z.coerce.boolean().default(false),
  GOOGLE_IMAGE_FALLBACK_MODEL: optionalString(),
  // OpenAI image generation (Ad Studio operator-selectable provider).
  // GPT Image is best-in-class for product/food photography per operator
  // testing; gated to Pro+ plans and to a daily per-restaurant cap. Cost
  // defaults to $0.19/image (high-quality 1024x1024) and should
  // be refreshed when the first invoice arrives.
  // OpenAI keys are `sk-…` (legacy ~51 chars) or `sk-proj-…` (newer 150+).
  // The prefix + min(40) keeps "placeholder" strings out without breaking
  // real keys.
  OPENAI_API_KEY: optionalString(z.string().regex(/^sk-/).min(40)),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  OPENAI_IMAGE_COST_USD: z.coerce.number().nonnegative().default(0.19),
  // gpt-image-1/2 high-quality renders routinely take 60–120s; raise on
  // Railway if you see timeouts. Clamped to 5 minutes to keep a hung
  // upstream from pinning a worker forever.
  OPENAI_IMAGE_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(120_000),
  /** Per-restaurant daily cap for OpenAI image regenerations. Defaults to 5
   *  to bound spend during the beta period. Owners can request a higher cap
   *  via support; long-term, the BYOK flow will move billing off our books. */
  AD_STUDIO_OPENAI_REGEN_PER_DAY: z.coerce.number().int().positive().default(5),
  APIFY_API_TOKEN: optionalString(),
  APIFY_ACTOR_GMAPS: z.string().default("compass/crawler-google-places"),
  APIFY_ACTOR_GMAPS_REVIEWS: z.string().default("compass/google-maps-reviews-scraper"),
  APIFY_ACTOR_GSEARCH: z.string().default("apify/google-search-scraper"),
  APIFY_ACTOR_WEB: z.string().default("apify/website-content-crawler"),
  APIFY_ACTOR_TALABAT: optionalString(),
  APIFY_ACTOR_DELIVEROO: optionalString(),
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
  /** OAuth config-id for Meta Ads access (separate from the WhatsApp Embedded Signup id) */
  META_ADS_CONFIG_ID: optionalString(),
  /** Encryption key for stored Meta Marketing API tokens. Distinct from WhatsApp's
   *  so a single key compromise doesn't cross integrations. */
  META_ADS_TOKEN_ENCRYPTION_KEY: optionalString(z.string().min(32)),
  /** Beta allowlist for Meta OAuth during dev-mode period (pre-Tech Provider).
   *  Comma-separated restaurant IDs. Anyone not in this list sees waitlist copy
   *  instead of a Connect button so they don't hit Meta's "app not available". */
  AD_STUDIO_META_BETA_RESTAURANT_IDS: optionalString(),
  META_GRAPH_API_VERSION: z.string().default("v24.0"),
  STRIPE_STARTER_PRICE_ID: optionalString(),
  STRIPE_PRO_PRICE_ID: optionalString(),
  STRIPE_PRO_PRICE_ID_V2: optionalString(),
  STRIPE_PORTFOLIO_PRICE_ID: optionalString(),
  STRIPE_PORTFOLIO_PRICE_ID_V2: optionalString(),
  STRIPE_PORTFOLIO_EXTRA_BRAND_PRICE_ID: optionalString(),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().positive().default(14),
  RESEND_API_KEY: optionalString(),
  RESEND_FROM_EMAIL: optionalString(z.string().email()),
  FRONTEND_APP_URL: z.string().url().default("http://localhost:3000"),
  // Ad Studio cost guardrails. Three separate per-restaurant pools so regen
  // doesn't eat full-project quota; export DoS is bounded; all contribute
  // to the global USD ceiling.
  AD_STUDIO_GENERATE_PER_DAY: z.coerce.number().int().positive().default(20),
  AD_STUDIO_REGEN_IMAGE_PER_DAY: z.coerce.number().int().positive().default(15),
  AD_STUDIO_EXPORT_PER_DAY: z.coerce.number().int().positive().default(10),
  AD_STUDIO_EXPORT_PER_HOUR: z.coerce.number().int().positive().default(3),
  AD_STUDIO_GLOBAL_USD_PER_DAY: z.coerce.number().nonnegative().default(50),
  // Phase 3A H2: WhatsApp Business messaging-tier daily cap (per-WABA).
  // Meta's tiers: 250 (initial) → 1k → 10k → 100k → unlimited. We default
  // to 1k since most newly-onboarded restaurants are at that tier; Phase
  // 3B P4 will surface the real value from the Graph API quality check.
  WHATSAPP_DAILY_TIER_LIMIT: z.coerce.number().int().positive().default(1000),
  // Per-(customer,template) frequency cap window in hours. A given recipient
  // cannot receive the same template more than once in this window.
  WHATSAPP_FREQUENCY_CAP_HOURS: z.coerce.number().int().positive().default(24),
  // Google Search Console — single OAuth (not per-restaurant). We OAuth once
  // as the verified owner of getbustan.com and slice the data per-restaurant
  // by URL filter. See backend/scripts/get-gsc-refresh-token.ts.
  GOOGLE_OAUTH_CLIENT_ID: optionalString(),
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString(),
  GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN: optionalString(),
  GOOGLE_SEARCH_CONSOLE_PROPERTY: z.string().default("sc-domain:getbustan.com"),
  // Sabt Pack — weekly auto-generated 7-post bundle. The WhatsApp send is
  // gated until the `sabt_pack_ready` Meta template clears review; flip this
  // to true in the staging env first, then production once the template is
  // approved. When off, the dashboard banner is the only delivery channel.
  SABT_PACK_WHATSAPP_ENABLED: z.coerce.boolean().default(false),
  // Per-restaurant weekly USD ceiling. Orchestrator forces menu-photo reuse
  // beyond this cap so a runaway image-gen pass cannot torch the Pro margin.
  SABT_PACK_MAX_USD_PER_RESTAURANT_PER_WEEK: z.coerce.number().nonnegative().default(0.3),
});

export const env = envSchema.parse(process.env);
