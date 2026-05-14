-- Sabt Pack v1: weekly auto-generated 7-post bundle for Pro/Portfolio restaurants.
-- Additive only. Reuses ad_projects + ad_creatives to inherit existing flows
-- (Meta export, share token, safety pass, regenerate). New rows are tagged via
-- sabt_pack_* fields. Idempotency: unique (restaurant_id, sabt_pack_week_start_date).

-- CreateEnum
CREATE TYPE "sabt_pack_status" AS ENUM ('queued', 'generating', 'ready', 'delivered', 'partial', 'failed', 'approved');

-- AlterTable: master toggle on Restaurant; default true means Pro/Portfolio
-- restaurants get Sabt Pack automatically without owner config.
ALTER TABLE "restaurants" ADD COLUMN "sabt_pack_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: AdProject becomes the persistence root for a weekly pack.
ALTER TABLE "ad_projects"
  ADD COLUMN "sabt_pack_week_start_date" DATE,
  ADD COLUMN "sabt_pack_status" "sabt_pack_status",
  ADD COLUMN "sabt_pack_delivered_at" TIMESTAMP(3),
  ADD COLUMN "sabt_pack_approved_at" TIMESTAMP(3),
  ADD COLUMN "sabt_pack_theme_of_week" TEXT;

-- AlterTable: AdCreative slots within a pack. slideshow_frames stores 5 R2 URLs
-- for slot 1 only; gbp_post_body stores the 1,500-char body for slot 7 only.
ALTER TABLE "ad_creatives"
  ADD COLUMN "sabt_pack_slot" INTEGER,
  ADD COLUMN "sabt_pack_slot_format" TEXT,
  ADD COLUMN "sabt_pack_slideshow_frames" JSONB,
  ADD COLUMN "gbp_post_body" TEXT,
  ADD COLUMN "scheduled_for" DATE;

-- Idempotency key — re-running the Sunday cron is a no-op for restaurants that
-- already have a pack for that week.
CREATE UNIQUE INDEX "ad_projects_restaurant_id_sabt_pack_week_start_date_key"
  ON "ad_projects"("restaurant_id", "sabt_pack_week_start_date");

-- Index supports the cron fanout query (find restaurants without a ready pack
-- this week) and the dashboard banner query (find ready packs).
CREATE INDEX "ad_projects_sabt_pack_status_week_idx"
  ON "ad_projects"("sabt_pack_status", "sabt_pack_week_start_date");

-- Index for fast slot lookups when rendering the review surface.
CREATE INDEX "ad_creatives_project_id_sabt_pack_slot_idx"
  ON "ad_creatives"("project_id", "sabt_pack_slot");
