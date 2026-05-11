-- Ad Studio: operator-selectable image provider (Gemini default, GPT Image alt).
-- Adds an enum + column so the dashboard can show a provider badge per creative
-- and so cost analytics can break spend down per model.

CREATE TYPE "AdImageProvider" AS ENUM ('menu_item', 'gemini', 'openai');

ALTER TABLE "ad_creatives"
  ADD COLUMN IF NOT EXISTS "image_provider" "AdImageProvider";

-- Backfill existing AI-generated rows: anything with a non-null heroImageUrl
-- and no menu-item source must have come from Gemini (the only AI provider
-- before this migration). Menu-photo-reuse rows get the `menu_item` value.
-- Rows without a hero image (failed / pending) stay null.
UPDATE "ad_creatives"
SET "image_provider" = CASE
  WHEN "hero_image_source_menu_item_id" IS NOT NULL THEN 'menu_item'::"AdImageProvider"
  WHEN "hero_image_url" IS NOT NULL THEN 'gemini'::"AdImageProvider"
  ELSE NULL
END
WHERE "image_provider" IS NULL;
