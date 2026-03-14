CREATE TYPE "MenuItemImageOrigin" AS ENUM (
  'legacy_unspecified',
  'mydscvr_ai',
  'owner_upload',
  'menu_source_upload'
);

CREATE TYPE "MenuItemImageDerivation" AS ENUM (
  'original',
  'truth_preserving_edit',
  'synthetic_generation'
);

ALTER TABLE "menu_item_images"
  ADD COLUMN "origin_type" "MenuItemImageOrigin" NOT NULL DEFAULT 'legacy_unspecified',
  ADD COLUMN "derivation_type" "MenuItemImageDerivation" NOT NULL DEFAULT 'original',
  ADD COLUMN "parent_image_id" TEXT;

UPDATE "menu_item_images"
SET
  "origin_type" = 'mydscvr_ai',
  "derivation_type" = 'synthetic_generation'
WHERE "image_status" IN ('generated', 'generating', 'failed');

ALTER TABLE "menu_item_images"
  ADD CONSTRAINT "menu_item_images_parent_image_id_fkey"
  FOREIGN KEY ("parent_image_id") REFERENCES "menu_item_images"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "menu_item_images_parent_image_id_idx"
  ON "menu_item_images"("parent_image_id");
