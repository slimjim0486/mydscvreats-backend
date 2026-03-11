CREATE TABLE "restaurant_short_link_aliases" (
  "id" TEXT NOT NULL,
  "short_link_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "restaurant_short_link_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_short_link_aliases_code_key"
  ON "restaurant_short_link_aliases"("code");

CREATE INDEX "restaurant_short_link_aliases_short_link_id_created_at_idx"
  ON "restaurant_short_link_aliases"("short_link_id", "created_at");

ALTER TABLE "restaurant_short_link_aliases"
  ADD CONSTRAINT "restaurant_short_link_aliases_short_link_id_fkey"
  FOREIGN KEY ("short_link_id")
  REFERENCES "restaurant_short_links"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
