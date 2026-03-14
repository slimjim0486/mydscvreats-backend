-- CreateTable
CREATE TABLE "branding_clicks" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "path" TEXT,
    "referrer" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branding_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branding_clicks_restaurant_id_created_at_idx" ON "branding_clicks"("restaurant_id", "created_at");

-- AddForeignKey
ALTER TABLE "branding_clicks" ADD CONSTRAINT "branding_clicks_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
