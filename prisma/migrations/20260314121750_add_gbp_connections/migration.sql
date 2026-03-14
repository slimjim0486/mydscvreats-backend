-- CreateEnum
CREATE TYPE "GbpConnectionStatus" AS ENUM ('not_connected', 'self_reported', 'verified');

-- CreateTable
CREATE TABLE "gbp_connections" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "status" "GbpConnectionStatus" NOT NULL DEFAULT 'not_connected',
    "gbp_url" TEXT,
    "place_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gbp_connections_restaurant_id_key" ON "gbp_connections"("restaurant_id");

-- AddForeignKey
ALTER TABLE "gbp_connections" ADD CONSTRAINT "gbp_connections_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
