CREATE TYPE "DomainStatus" AS ENUM ('pending', 'verifying', 'active', 'failed');

ALTER TABLE "page_views"
  ADD COLUMN "hostname" TEXT;

CREATE TABLE "restaurant_domains" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "status" "DomainStatus" NOT NULL DEFAULT 'pending',
  "verification_target" TEXT NOT NULL,
  "verified_at" TIMESTAMP(3),
  "last_checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "restaurant_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_domains_restaurant_id_key"
  ON "restaurant_domains"("restaurant_id");

CREATE UNIQUE INDEX "restaurant_domains_hostname_key"
  ON "restaurant_domains"("hostname");

CREATE INDEX "restaurant_domains_restaurant_id_status_idx"
  ON "restaurant_domains"("restaurant_id", "status");

ALTER TABLE "restaurant_domains"
  ADD CONSTRAINT "restaurant_domains_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id")
  REFERENCES "restaurants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
