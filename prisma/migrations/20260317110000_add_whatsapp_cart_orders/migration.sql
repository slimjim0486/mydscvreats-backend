CREATE TABLE "whatsapp_cart_orders" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "click_id" TEXT NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "item_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_cart_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_cart_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_cart_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_cart_orders_click_id_key" ON "whatsapp_cart_orders"("click_id");
CREATE INDEX "whatsapp_cart_orders_restaurant_id_created_at_idx" ON "whatsapp_cart_orders"("restaurant_id", "created_at");
CREATE INDEX "whatsapp_cart_order_items_order_id_idx" ON "whatsapp_cart_order_items"("order_id");
CREATE INDEX "whatsapp_cart_order_items_menu_item_id_idx" ON "whatsapp_cart_order_items"("menu_item_id");

ALTER TABLE "whatsapp_cart_orders"
ADD CONSTRAINT "whatsapp_cart_orders_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_cart_orders"
ADD CONSTRAINT "whatsapp_cart_orders_click_id_fkey"
FOREIGN KEY ("click_id") REFERENCES "whatsapp_clicks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_cart_order_items"
ADD CONSTRAINT "whatsapp_cart_order_items_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "whatsapp_cart_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_cart_order_items"
ADD CONSTRAINT "whatsapp_cart_order_items_menu_item_id_fkey"
FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
