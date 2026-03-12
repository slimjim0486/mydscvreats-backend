CREATE TYPE "PromotionType" AS ENUM ('discounted_item', 'deal', 'combo');

CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "badge_label" TEXT,
    "terms" TEXT,
    "promo_price" DECIMAL(10,2),
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_items" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'included',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_items_promotion_id_menu_item_id_key" ON "promotion_items"("promotion_id", "menu_item_id");
CREATE INDEX "promotions_restaurant_id_display_order_idx" ON "promotions"("restaurant_id", "display_order");
CREATE INDEX "promotions_restaurant_id_is_active_starts_at_ends_at_idx" ON "promotions"("restaurant_id", "is_active", "starts_at", "ends_at");
CREATE INDEX "promotion_items_menu_item_id_display_order_idx" ON "promotion_items"("menu_item_id", "display_order");
CREATE INDEX "promotion_items_promotion_id_display_order_idx" ON "promotion_items"("promotion_id", "display_order");

ALTER TABLE "promotions"
ADD CONSTRAINT "promotions_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotion_items"
ADD CONSTRAINT "promotion_items_promotion_id_fkey"
FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotion_items"
ADD CONSTRAINT "promotion_items_menu_item_id_fkey"
FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
