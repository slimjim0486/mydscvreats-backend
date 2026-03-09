CREATE TYPE "UserRole" AS ENUM ('restaurant_owner', 'admin');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'paused', 'cancelled');
CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'pro');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "clerk_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "full_name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'restaurant_owner',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurants" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cuisine_type" TEXT,
  "location" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "logo_url" TEXT,
  "cover_image_url" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
  "trial_ends_at" TIMESTAMP(3),
  "owner_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_sections" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "menu_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_items" (
  "id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "image_url" TEXT,
  "image_status" TEXT NOT NULL DEFAULT 'none',
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "plan" "SubscriptionPlan" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "current_period_end" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "page_views" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "user_agent" TEXT,
  "referrer" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");
CREATE INDEX "restaurants_owner_user_id_idx" ON "restaurants"("owner_user_id");
CREATE INDEX "menu_sections_restaurant_id_display_order_idx" ON "menu_sections"("restaurant_id", "display_order");
CREATE INDEX "menu_items_restaurant_id_display_order_idx" ON "menu_items"("restaurant_id", "display_order");
CREATE INDEX "menu_items_section_id_display_order_idx" ON "menu_items"("section_id", "display_order");
CREATE UNIQUE INDEX "subscriptions_restaurant_id_key" ON "subscriptions"("restaurant_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "page_views_restaurant_id_created_at_idx" ON "page_views"("restaurant_id", "created_at");

ALTER TABLE "restaurants"
  ADD CONSTRAINT "restaurants_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "menu_sections"
  ADD CONSTRAINT "menu_sections_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_section_id_fkey"
  FOREIGN KEY ("section_id") REFERENCES "menu_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "page_views"
  ADD CONSTRAINT "page_views_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
