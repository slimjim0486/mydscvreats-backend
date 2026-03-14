CREATE TYPE "MenuSourceImageReviewStatus" AS ENUM (
  'pending',
  'confirmed',
  'dismissed'
);

CREATE TABLE "menu_source_image_candidates" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "source_page_number" INTEGER NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "review_status" "MenuSourceImageReviewStatus" NOT NULL DEFAULT 'pending',
  "suggested_menu_item_id" TEXT,
  "assigned_menu_item_id" TEXT,
  "linked_image_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "menu_source_image_candidates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_source_image_candidates_restaurant_id_review_status_created_at_idx"
  ON "menu_source_image_candidates"("restaurant_id", "review_status", "created_at");

CREATE INDEX "menu_source_image_candidates_suggested_menu_item_id_idx"
  ON "menu_source_image_candidates"("suggested_menu_item_id");

CREATE INDEX "menu_source_image_candidates_assigned_menu_item_id_idx"
  ON "menu_source_image_candidates"("assigned_menu_item_id");

CREATE INDEX "menu_source_image_candidates_linked_image_id_idx"
  ON "menu_source_image_candidates"("linked_image_id");

ALTER TABLE "menu_source_image_candidates"
  ADD CONSTRAINT "menu_source_image_candidates_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_source_image_candidates"
  ADD CONSTRAINT "menu_source_image_candidates_suggested_menu_item_id_fkey"
  FOREIGN KEY ("suggested_menu_item_id") REFERENCES "menu_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "menu_source_image_candidates"
  ADD CONSTRAINT "menu_source_image_candidates_assigned_menu_item_id_fkey"
  FOREIGN KEY ("assigned_menu_item_id") REFERENCES "menu_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "menu_source_image_candidates"
  ADD CONSTRAINT "menu_source_image_candidates_linked_image_id_fkey"
  FOREIGN KEY ("linked_image_id") REFERENCES "menu_item_images"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
