CREATE TABLE "restaurant_short_links" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "restaurant_short_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_short_links_restaurant_id_key"
  ON "restaurant_short_links"("restaurant_id");

CREATE UNIQUE INDEX "restaurant_short_links_code_key"
  ON "restaurant_short_links"("code");

ALTER TABLE "restaurant_short_links"
  ADD CONSTRAINT "restaurant_short_links_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id")
  REFERENCES "restaurants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
