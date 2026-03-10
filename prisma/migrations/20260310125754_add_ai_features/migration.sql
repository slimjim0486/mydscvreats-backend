-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "ai_description_status" TEXT,
ADD COLUMN     "original_description" TEXT;

-- CreateTable
CREATE TABLE "dietary_tags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL DEFAULT 'dietary',

    CONSTRAINT "dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_dietary_tags" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "menu_item_dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_analyses" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "analysis_type" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "menu_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tags_key_key" ON "dietary_tags"("key");

-- CreateIndex
CREATE INDEX "menu_item_dietary_tags_menu_item_id_idx" ON "menu_item_dietary_tags"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_dietary_tags_menu_item_id_tag_id_key" ON "menu_item_dietary_tags"("menu_item_id", "tag_id");

-- CreateIndex
CREATE INDEX "menu_analyses_restaurant_id_analysis_type_idx" ON "menu_analyses"("restaurant_id", "analysis_type");

-- CreateIndex
CREATE INDEX "ai_usage_logs_restaurant_id_feature_created_at_idx" ON "ai_usage_logs"("restaurant_id", "feature", "created_at");

-- AddForeignKey
ALTER TABLE "menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "dietary_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
