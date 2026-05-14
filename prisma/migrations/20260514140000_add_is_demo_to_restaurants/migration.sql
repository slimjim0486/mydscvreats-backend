-- Mark seeded/test restaurants so they can be exercised through the app
-- end-to-end without leaking into public SEO surfaces (sitemap, llms.txt,
-- explore directory, location pages, AggregateRating JSON-LD, etc.).

ALTER TABLE "restaurants" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "restaurants_is_demo_idx" ON "restaurants" ("is_demo");
