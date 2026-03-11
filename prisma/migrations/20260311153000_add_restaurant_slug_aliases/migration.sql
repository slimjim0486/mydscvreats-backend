CREATE TABLE "restaurant_slug_aliases" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "restaurant_slug_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_slug_aliases_slug_key"
  ON "restaurant_slug_aliases"("slug");

CREATE INDEX "restaurant_slug_aliases_restaurant_id_created_at_idx"
  ON "restaurant_slug_aliases"("restaurant_id", "created_at");

ALTER TABLE "restaurant_slug_aliases"
  ADD CONSTRAINT "restaurant_slug_aliases_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id")
  REFERENCES "restaurants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
