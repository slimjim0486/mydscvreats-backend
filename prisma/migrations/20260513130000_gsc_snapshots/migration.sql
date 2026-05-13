-- Daily Google Search Console snapshot per restaurant, populated by the
-- backend gsc-sync cron. Single Bustan-side OAuth feeds all restaurants
-- by slicing the API response with a `page` URL filter.

CREATE TABLE "gsc_snapshots" (
  "id"            TEXT PRIMARY KEY,
  "restaurant_id" TEXT NOT NULL,
  "date"          DATE NOT NULL,
  "impressions"   INTEGER NOT NULL DEFAULT 0,
  "clicks"        INTEGER NOT NULL DEFAULT 0,
  "ctr"           DECIMAL(5,4) NOT NULL DEFAULT 0,
  "position"      DECIMAL(6,2) NOT NULL DEFAULT 0,
  "top_queries"   JSONB,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gsc_snapshots_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "restaurants" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "gsc_snapshots_restaurant_id_date_key"
  ON "gsc_snapshots" ("restaurant_id", "date");

CREATE INDEX "gsc_snapshots_restaurant_id_date_desc_idx"
  ON "gsc_snapshots" ("restaurant_id", "date" DESC);
