CREATE TABLE "restaurant_short_link_clicks" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "short_link_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "user_agent" TEXT,
  "referrer" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "restaurant_short_link_clicks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "restaurant_short_link_clicks_restaurant_id_created_at_idx"
  ON "restaurant_short_link_clicks"("restaurant_id", "created_at");

CREATE INDEX "restaurant_short_link_clicks_short_link_id_created_at_idx"
  ON "restaurant_short_link_clicks"("short_link_id", "created_at");

ALTER TABLE "restaurant_short_link_clicks"
  ADD CONSTRAINT "restaurant_short_link_clicks_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id")
  REFERENCES "restaurants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "restaurant_short_link_clicks"
  ADD CONSTRAINT "restaurant_short_link_clicks_short_link_id_fkey"
  FOREIGN KEY ("short_link_id")
  REFERENCES "restaurant_short_links"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
