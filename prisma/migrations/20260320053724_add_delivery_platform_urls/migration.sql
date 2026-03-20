/*
  Warnings:

  - You are about to drop the column `clone_type` on the `menu_clone_logs` table. All the data in the column will be lost.
  - Added the required column `cloneType` to the `menu_clone_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "menu_clone_logs" DROP COLUMN "clone_type",
ADD COLUMN     "cloneType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "deliveroo_url" TEXT,
ADD COLUMN     "talabat_url" TEXT,
ADD COLUMN     "uber_eats_url" TEXT;

-- RenameIndex
ALTER INDEX "menu_source_image_candidates_restaurant_id_review_status_create" RENAME TO "menu_source_image_candidates_restaurant_id_review_status_cr_idx";
