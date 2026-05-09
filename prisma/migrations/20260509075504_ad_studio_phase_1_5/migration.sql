-- Phase 1.5 polish pass: progress signal + viral share token
ALTER TABLE "ad_projects"
  ADD COLUMN "generation_phase" TEXT,
  ADD COLUMN "share_token" TEXT;

CREATE UNIQUE INDEX "ad_projects_share_token_key" ON "ad_projects" ("share_token");
