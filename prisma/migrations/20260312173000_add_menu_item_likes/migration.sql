CREATE TABLE "menu_item_likes" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "path" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_likes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_item_likes_restaurant_id_created_at_idx" ON "menu_item_likes"("restaurant_id", "created_at");
CREATE INDEX "menu_item_likes_menu_item_id_created_at_idx" ON "menu_item_likes"("menu_item_id", "created_at");

ALTER TABLE "menu_item_likes"
ADD CONSTRAINT "menu_item_likes_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_item_likes"
ADD CONSTRAINT "menu_item_likes_menu_item_id_fkey"
FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
