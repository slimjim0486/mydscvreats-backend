-- P1 — Click-to-WhatsApp ad attribution bridge.
-- Promotes Meta `referral` payload from rawPayload (which the 30d retention
-- sweep nulls) to typed columns on Customer, plus a per-ad mapping table so
-- the webhook resolver can attribute back to the specific Bustan creative.

-- 1. Customer referral columns ----------------------------------------------

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "referral_ctwa_clid"     TEXT,
  ADD COLUMN IF NOT EXISTS "referral_source_id"     TEXT,
  ADD COLUMN IF NOT EXISTS "referral_source_type"   TEXT,
  ADD COLUMN IF NOT EXISTS "referral_source_url"    TEXT,
  ADD COLUMN IF NOT EXISTS "referral_headline"      TEXT,
  ADD COLUMN IF NOT EXISTS "referral_body"          TEXT,
  ADD COLUMN IF NOT EXISTS "referral_media_url"     TEXT,
  ADD COLUMN IF NOT EXISTS "referral_captured_at"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "referral_ad_project_id" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_creative_id"   TEXT;

-- FK: project/creative deletion sets attribution to null (preserves
-- customer history; we never want to cascade-delete a paying restaurant's
-- customer because they cleaned up old projects).
ALTER TABLE "customers"
  DROP CONSTRAINT IF EXISTS "customers_referral_ad_project_id_fkey";
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_referral_ad_project_id_fkey"
  FOREIGN KEY ("referral_ad_project_id") REFERENCES "ad_projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customers"
  DROP CONSTRAINT IF EXISTS "customers_referral_creative_id_fkey";
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_referral_creative_id_fkey"
  FOREIGN KEY ("referral_creative_id") REFERENCES "ad_creatives"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial indexes — most customers have no attribution, so the index stays
-- tiny and is the hot path for the Ad Studio CRM-impact aggregation.
CREATE INDEX IF NOT EXISTS "customers_referral_ad_project_id_idx"
  ON "customers" ("referral_ad_project_id")
  WHERE "referral_ad_project_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "customers_referral_creative_id_idx"
  ON "customers" ("referral_creative_id")
  WHERE "referral_creative_id" IS NOT NULL;

-- 2. AdLiveCampaign GIN index for ad-id resolution -------------------------
-- Webhook handler resolves Meta source_id → AdLiveCampaign by searching the
-- existing String[] external_ad_ids array. GIN keeps that O(log n).
CREATE INDEX IF NOT EXISTS "ad_live_campaigns_external_ad_ids_gin_idx"
  ON "ad_live_campaigns" USING GIN ("external_ad_ids");

-- 3. AdLiveCampaignAdMapping table -----------------------------------------
-- Per-ad → creative-variant mapping. Owners populate this at link-campaign
-- time so the resolver can attribute a CTWA conversation to a specific
-- Bustan creative (not just the project).
CREATE TABLE IF NOT EXISTS "ad_live_campaign_ad_mappings" (
  "id"               TEXT NOT NULL,
  "live_campaign_id" TEXT NOT NULL,
  "creative_id"      TEXT,
  "platform"         TEXT NOT NULL,
  "external_ad_id"   TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ad_live_campaign_ad_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ad_live_campaign_ad_mappings_platform_external_ad_id_key"
  ON "ad_live_campaign_ad_mappings" ("platform", "external_ad_id");

CREATE INDEX IF NOT EXISTS "ad_live_campaign_ad_mappings_live_campaign_id_idx"
  ON "ad_live_campaign_ad_mappings" ("live_campaign_id");

CREATE INDEX IF NOT EXISTS "ad_live_campaign_ad_mappings_creative_id_idx"
  ON "ad_live_campaign_ad_mappings" ("creative_id");

ALTER TABLE "ad_live_campaign_ad_mappings"
  ADD CONSTRAINT "ad_live_campaign_ad_mappings_live_campaign_id_fkey"
  FOREIGN KEY ("live_campaign_id") REFERENCES "ad_live_campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ad_live_campaign_ad_mappings"
  ADD CONSTRAINT "ad_live_campaign_ad_mappings_creative_id_fkey"
  FOREIGN KEY ("creative_id") REFERENCES "ad_creatives"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
