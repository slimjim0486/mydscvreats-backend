CREATE TABLE "menu_item_images" (
  "id" TEXT NOT NULL,
  "menu_item_id" TEXT NOT NULL,
  "slot" INTEGER NOT NULL,
  "image_url" TEXT,
  "image_status" TEXT NOT NULL DEFAULT 'none',
  "prompt_modifier" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "menu_item_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "menu_item_images_menu_item_id_slot_key"
  ON "menu_item_images"("menu_item_id", "slot");

CREATE INDEX "menu_item_images_menu_item_id_created_at_idx"
  ON "menu_item_images"("menu_item_id", "created_at");

ALTER TABLE "menu_item_images"
  ADD CONSTRAINT "menu_item_images_menu_item_id_fkey"
  FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
