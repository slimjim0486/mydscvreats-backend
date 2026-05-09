-- CreateEnum
CREATE TYPE "AdProjectStatus" AS ENUM ('draft', 'generating', 'ready', 'exported', 'archived', 'failed');

-- CreateEnum
CREATE TYPE "AdCreativeStatus" AS ENUM ('pending', 'generating', 'ready', 'approved', 'failed');

-- CreateTable
CREATE TABLE "ad_projects" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campaign_type" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "countries" TEXT[],
    "cuisines" TEXT[],
    "target_platforms" TEXT[],
    "budget_tier" TEXT NOT NULL,
    "budget_aed" INTEGER NOT NULL,
    "duration_weeks" INTEGER,
    "starts_on" TIMESTAMP(3),
    "ends_on" TIMESTAMP(3),
    "primary_dish_id" TEXT,
    "brand_voice" TEXT,
    "status" "AdProjectStatus" NOT NULL DEFAULT 'draft',
    "brief_json" JSONB NOT NULL,
    "kb_version_at_gen" TEXT,
    "last_error" TEXT,
    "generation_cost_usd" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "variant" INTEGER NOT NULL,
    "archetype_id" TEXT NOT NULL,
    "hook_id" TEXT,
    "cta_id" TEXT,
    "copy_framework_id" TEXT,
    "language" TEXT NOT NULL DEFAULT 'bilingual',
    "headline" TEXT NOT NULL,
    "primary_text" TEXT NOT NULL,
    "cta_text" TEXT NOT NULL,
    "headline_ar" TEXT,
    "primary_text_ar" TEXT,
    "cta_text_ar" TEXT,
    "hero_image_url" TEXT,
    "hero_image_prompt" TEXT,
    "hero_image_source_menu_item_id" TEXT,
    "status" "AdCreativeStatus" NOT NULL DEFAULT 'pending',
    "safety_flags" JSONB,
    "generation_cost_usd" DECIMAL(10,4),
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_exports" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "manifest_json" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_projects_restaurant_id_status_created_at_idx" ON "ad_projects"("restaurant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "ad_projects_restaurant_id_created_at_idx" ON "ad_projects"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "ad_creatives_project_id_status_idx" ON "ad_creatives"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ad_creatives_project_id_variant_key" ON "ad_creatives"("project_id", "variant");

-- CreateIndex
CREATE INDEX "ad_exports_project_id_created_at_idx" ON "ad_exports"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "ad_exports_expires_at_idx" ON "ad_exports"("expires_at");

-- AddForeignKey
ALTER TABLE "ad_projects" ADD CONSTRAINT "ad_projects_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ad_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_exports" ADD CONSTRAINT "ad_exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ad_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "whatsapp_message_status_events_provider_message_id_occurred_at_" RENAME TO "whatsapp_message_status_events_provider_message_id_occurred_idx";
