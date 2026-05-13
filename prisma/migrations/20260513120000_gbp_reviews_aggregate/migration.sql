-- Persist aggregate review metrics from SEO analysis runs onto GbpConnection
-- so the public restaurant page can emit AggregateRating JSON-LD.

ALTER TABLE "gbp_connections" ADD COLUMN "average_rating" DECIMAL(2,1);
ALTER TABLE "gbp_connections" ADD COLUMN "review_count" INTEGER;
ALTER TABLE "gbp_connections" ADD COLUMN "reviews_synced_at" TIMESTAMP(3);
