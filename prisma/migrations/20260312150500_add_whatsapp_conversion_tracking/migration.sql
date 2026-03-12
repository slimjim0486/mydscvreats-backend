ALTER TABLE "restaurants"
ADD COLUMN "whatsapp_number" TEXT,
ADD COLUMN "whatsapp_prefill" TEXT;

CREATE TABLE "whatsapp_clicks" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "promotion_id" TEXT,
    "source" TEXT NOT NULL,
    "path" TEXT,
    "campaign" TEXT,
    "referrer" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_clicks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_clicks_restaurant_id_created_at_idx" ON "whatsapp_clicks"("restaurant_id", "created_at");
CREATE INDEX "whatsapp_clicks_menu_item_id_created_at_idx" ON "whatsapp_clicks"("menu_item_id", "created_at");
CREATE INDEX "whatsapp_clicks_promotion_id_created_at_idx" ON "whatsapp_clicks"("promotion_id", "created_at");

ALTER TABLE "whatsapp_clicks"
ADD CONSTRAINT "whatsapp_clicks_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_clicks"
ADD CONSTRAINT "whatsapp_clicks_menu_item_id_fkey"
FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_clicks"
ADD CONSTRAINT "whatsapp_clicks_promotion_id_fkey"
FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
