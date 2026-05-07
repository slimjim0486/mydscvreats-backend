-- CreateEnum
CREATE TYPE "CustomerConsentStatus" AS ENUM ('opt_in', 'opt_out');

-- CreateEnum
CREATE TYPE "OrderFulfillmentMethod" AS ENUM ('delivery', 'pickup');

-- CreateEnum
CREATE TYPE "OrderIntentStatus" AS ENUM ('sent_to_whatsapp', 'opened_whatsapp');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('inactive_30', 'weekend_special', 'new_promotion');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'logged');

-- CreateEnum
CREATE TYPE "MessageLogStatus" AS ENUM ('logged', 'skipped_opt_out');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "normalized_phone" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "marketing_opt_in_at" TIMESTAMP(3),
    "marketing_opt_out_at" TIMESTAMP(3),
    "last_order_at" TIMESTAMP(3),
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "total_spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_consents" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "CustomerConsentStatus" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "source" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_intents" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "click_id" TEXT,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'sent_to_whatsapp',
    "fulfillment_method" "OrderFulfillmentMethod" NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "total_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "item_count" INTEGER NOT NULL,
    "source_path" TEXT,
    "campaign" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_intent_items" (
    "id" TEXT NOT NULL,
    "order_intent_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_intent_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "promotion_id" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "name" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target_segment" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 0,
    "logged_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logged_at" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "campaign_id" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "status" "MessageLogStatus" NOT NULL DEFAULT 'logged',
    "body" TEXT NOT NULL,
    "whatsapp_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_restaurant_id_normalized_phone_key" ON "customers"("restaurant_id", "normalized_phone");

-- CreateIndex
CREATE INDEX "customers_restaurant_id_marketing_opt_in_idx" ON "customers"("restaurant_id", "marketing_opt_in");

-- CreateIndex
CREATE INDEX "customers_restaurant_id_last_order_at_idx" ON "customers"("restaurant_id", "last_order_at");

-- CreateIndex
CREATE INDEX "customer_consents_restaurant_id_created_at_idx" ON "customer_consents"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_consents_customer_id_created_at_idx" ON "customer_consents"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_intents_click_id_key" ON "order_intents"("click_id");

-- CreateIndex
CREATE INDEX "order_intents_restaurant_id_created_at_idx" ON "order_intents"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "order_intents_customer_id_created_at_idx" ON "order_intents"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "order_intent_items_order_intent_id_idx" ON "order_intent_items"("order_intent_id");

-- CreateIndex
CREATE INDEX "order_intent_items_menu_item_id_idx" ON "order_intent_items"("menu_item_id");

-- CreateIndex
CREATE INDEX "campaigns_restaurant_id_created_at_idx" ON "campaigns"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "campaigns_promotion_id_idx" ON "campaigns"("promotion_id");

-- CreateIndex
CREATE INDEX "message_logs_restaurant_id_created_at_idx" ON "message_logs"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "message_logs_customer_id_created_at_idx" ON "message_logs"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "message_logs_campaign_id_idx" ON "message_logs"("campaign_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "whatsapp_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intent_items" ADD CONSTRAINT "order_intent_items_order_intent_id_fkey" FOREIGN KEY ("order_intent_id") REFERENCES "order_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intent_items" ADD CONSTRAINT "order_intent_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
