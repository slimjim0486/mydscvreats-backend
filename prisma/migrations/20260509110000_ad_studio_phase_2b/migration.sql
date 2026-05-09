-- Phase 2B: performance feedback loop. Manual-entry MVP; OAuth autopilot in Phase 4.

CREATE TYPE "AdLiveCampaignStatus" AS ENUM ('draft', 'linked', 'reporting', 'paused', 'ended');
CREATE TYPE "AdPerformanceSource" AS ENUM ('owner_reported', 'meta_api', 'tiktok_api', 'snap_api');

CREATE TABLE "ad_live_campaigns" (
  "id"                  TEXT PRIMARY KEY,
  "project_id"          TEXT NOT NULL REFERENCES "ad_projects"("id") ON DELETE CASCADE,
  "platform"            TEXT NOT NULL,
  "external_campaign_id" TEXT NOT NULL,
  "external_ad_set_ids" TEXT[] NOT NULL DEFAULT '{}',
  "external_ad_ids"     TEXT[] NOT NULL DEFAULT '{}',
  "status"              "AdLiveCampaignStatus" NOT NULL DEFAULT 'linked',
  "launched_at"         TIMESTAMP(3),
  "last_synced_at"      TIMESTAMP(3),
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ad_live_campaigns_platform_external_campaign_id_key"
  ON "ad_live_campaigns" ("platform", "external_campaign_id");
CREATE INDEX "ad_live_campaigns_project_id_status_idx"
  ON "ad_live_campaigns" ("project_id", "status");
CREATE INDEX "ad_live_campaigns_project_id_launched_at_idx"
  ON "ad_live_campaigns" ("project_id", "launched_at");

CREATE TABLE "ad_performance_snapshots" (
  "id"               TEXT PRIMARY KEY,
  "live_campaign_id" TEXT NOT NULL REFERENCES "ad_live_campaigns"("id") ON DELETE CASCADE,
  "creative_id"      TEXT,
  "variant"          INTEGER,
  "source"           "AdPerformanceSource" NOT NULL DEFAULT 'owner_reported',
  "reported_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "days_live"        INTEGER NOT NULL,
  "spend_aed"        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "impressions"      INTEGER NOT NULL DEFAULT 0,
  "reach"            INTEGER,
  "clicks"           INTEGER NOT NULL DEFAULT 0,
  "conversions"      INTEGER NOT NULL DEFAULT 0,
  "revenue_aed"      DECIMAL(12, 2),
  "ctr_pct"          DECIMAL(6, 3),
  "cpm_aed"          DECIMAL(10, 2),
  "cpc_aed"          DECIMAL(10, 2),
  "cpa_aed"          DECIMAL(10, 2),
  "frequency"        DECIMAL(6, 2),
  "extra_json"       JSONB,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ad_performance_snapshots_live_campaign_id_reported_at_idx"
  ON "ad_performance_snapshots" ("live_campaign_id", "reported_at");
CREATE INDEX "ad_performance_snapshots_live_campaign_id_creative_id_repor_idx"
  ON "ad_performance_snapshots" ("live_campaign_id", "creative_id", "reported_at");
