-- CreateEnum
CREATE TYPE "SeoStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "seo_analyses" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "status" "SeoStatus" NOT NULL DEFAULT 'queued',
    "inputs_hash" TEXT NOT NULL,
    "overall_score" INTEGER,
    "gbp_score" INTEGER,
    "on_page_score" INTEGER,
    "rank_grid_score" INTEGER,
    "citations_score" INTEGER,
    "reviews_score" INTEGER,
    "raw_data" JSONB NOT NULL,
    "scorecard" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "error_message" TEXT,
    "cost_usd" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "seo_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seo_analyses_restaurant_id_created_at_idx" ON "seo_analyses"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "seo_analyses_inputs_hash_idx" ON "seo_analyses"("inputs_hash");

-- AddForeignKey
ALTER TABLE "seo_analyses" ADD CONSTRAINT "seo_analyses_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
