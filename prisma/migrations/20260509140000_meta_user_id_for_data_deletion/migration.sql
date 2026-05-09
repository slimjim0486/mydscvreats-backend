-- Phase 3A C3: Meta App Review requires data-deletion + deauthorize
-- callbacks. Both receive a Meta `user_id` in the signed_request payload.
-- We need that ID indexed on each integration so the callback can fan out
-- to the right rows.

ALTER TABLE "whatsapp_integrations"
  ADD COLUMN IF NOT EXISTS "meta_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "whatsapp_integrations_meta_user_id_idx"
  ON "whatsapp_integrations" ("meta_user_id");

ALTER TABLE "meta_ads_integrations"
  ADD COLUMN IF NOT EXISTS "meta_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "meta_ads_integrations_meta_user_id_idx"
  ON "meta_ads_integrations" ("meta_user_id");

-- Phase 3A H2: new MessageLogStatus values for the WhatsApp tier and
-- per-(customer,template) frequency cap. ALTER TYPE ADD VALUE must run
-- outside a transaction in older Postgres; Prisma migrations are run
-- without a wrapping txn, so this is safe.
ALTER TYPE "MessageLogStatus" ADD VALUE IF NOT EXISTS 'skipped_frequency_cap';
ALTER TYPE "MessageLogStatus" ADD VALUE IF NOT EXISTS 'skipped_tier_cap';

-- Phase 3A C-2 (correctness): campaigns where every recipient was tier-
-- or frequency-capped need a status that isn't "sent". `held` makes
-- "we held N until tomorrow's tier window" first-class on the dashboard.
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'held';
