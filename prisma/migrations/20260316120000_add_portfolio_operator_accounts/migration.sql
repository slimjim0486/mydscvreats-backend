ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'portfolio';

CREATE TABLE "operator_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "brand_limit" INTEGER NOT NULL DEFAULT 10,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operator_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_accounts_owner_user_id_key" ON "operator_accounts"("owner_user_id");
CREATE INDEX "operator_accounts_status_idx" ON "operator_accounts"("status");

ALTER TABLE "restaurants"
ADD COLUMN "operator_account_id" TEXT;

CREATE INDEX "restaurants_operator_account_id_idx" ON "restaurants"("operator_account_id");

ALTER TABLE "menu_items"
ADD COLUMN "sold_out_date" DATE,
ADD COLUMN "special_starts_at" TIMESTAMP(3),
ADD COLUMN "special_ends_at" TIMESTAMP(3);

CREATE TABLE "menu_clone_logs" (
    "id" TEXT NOT NULL,
    "source_restaurant_id" TEXT NOT NULL,
    "target_restaurant_id" TEXT NOT NULL,
    "clone_type" TEXT NOT NULL,
    "source_section_id" TEXT,
    "items_copied" INTEGER NOT NULL DEFAULT 0,
    "sections_copied" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "menu_clone_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_clone_logs_source_restaurant_id_created_at_idx" ON "menu_clone_logs"("source_restaurant_id", "created_at");
CREATE INDEX "menu_clone_logs_target_restaurant_id_created_at_idx" ON "menu_clone_logs"("target_restaurant_id", "created_at");

ALTER TABLE "operator_accounts"
ADD CONSTRAINT "operator_accounts_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "restaurants"
ADD CONSTRAINT "restaurants_operator_account_id_fkey"
FOREIGN KEY ("operator_account_id") REFERENCES "operator_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
