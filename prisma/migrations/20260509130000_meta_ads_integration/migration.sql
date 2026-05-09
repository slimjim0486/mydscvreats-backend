-- Phase 2C: Meta Marketing API OAuth autopilot.

CREATE TYPE "MetaAdsIntegrationStatus" AS ENUM (
  'pending', 'connected', 'expired', 'needs_reconsent', 'disconnected', 'failed'
);

CREATE TABLE "meta_ads_integrations" (
  "id"                  TEXT PRIMARY KEY,
  "restaurant_id"       TEXT NOT NULL UNIQUE REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "status"              "MetaAdsIntegrationStatus" NOT NULL DEFAULT 'pending',
  "business_id"         TEXT,
  "business_name"       TEXT,
  "ad_account_id"       TEXT,
  "ad_account_name"     TEXT,
  "page_id"             TEXT,
  "page_name"           TEXT,
  "pixel_id"            TEXT,
  "access_token_cipher" TEXT,
  "token_last_four"     TEXT,
  "token_expires_at"    TIMESTAMP(3),
  "scopes"              TEXT[] NOT NULL DEFAULT '{}',
  "connected_at"        TIMESTAMP(3),
  "last_synced_at"      TIMESTAMP(3),
  "last_error"          TEXT,
  "pending_state"       TEXT,
  "pending_state_at"    TIMESTAMP(3),
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL
);
CREATE INDEX "meta_ads_integrations_status_idx" ON "meta_ads_integrations" ("status");

ALTER TABLE "ad_live_campaigns"
  ADD COLUMN "meta_integration_id" TEXT REFERENCES "meta_ads_integrations"("id") ON DELETE SET NULL,
  ADD COLUMN "auto_sync" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "last_sync_error" TEXT;

CREATE INDEX "ad_live_campaigns_meta_integration_id_auto_sync_last_synced_idx"
  ON "ad_live_campaigns" ("meta_integration_id", "auto_sync", "last_synced_at");
