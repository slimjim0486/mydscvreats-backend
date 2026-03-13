-- CreateTable
CREATE TABLE "badge_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#F2E2B9',
    "text_color" TEXT NOT NULL DEFAULT '#7A5211',
    "category" TEXT NOT NULL DEFAULT 'promotion',
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "badge_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_badges" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badge_types_key_key" ON "badge_types"("key");

-- CreateIndex
CREATE INDEX "menu_item_badges_menu_item_id_idx" ON "menu_item_badges"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_badges_menu_item_id_badge_id_key" ON "menu_item_badges"("menu_item_id", "badge_id");

-- AddForeignKey
ALTER TABLE "menu_item_badges" ADD CONSTRAINT "menu_item_badges_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_badges" ADD CONSTRAINT "menu_item_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
