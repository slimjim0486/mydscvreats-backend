ALTER TABLE "menu_source_image_candidates"
ADD COLUMN "source_page_image_url" TEXT,
ADD COLUMN "crop_x" DOUBLE PRECISION,
ADD COLUMN "crop_y" DOUBLE PRECISION,
ADD COLUMN "crop_width" DOUBLE PRECISION,
ADD COLUMN "crop_height" DOUBLE PRECISION,
ADD COLUMN "text_overlap_score" DOUBLE PRECISION;
