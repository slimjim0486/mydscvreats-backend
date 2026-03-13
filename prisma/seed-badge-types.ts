import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BADGE_TYPES = [
  // Promotion badges
  { key: "best_seller", label: "Best Seller", icon: "flame", color: "#FFDCD6", textColor: "#9E3B2D", category: "promotion", displayOrder: 0 },
  { key: "new", label: "New", icon: "sparkles", color: "#D9F4E5", textColor: "#206B48", category: "promotion", displayOrder: 1 },
  { key: "chefs_pick", label: "Chef's Pick", icon: "chef-hat", color: "#F2E2B9", textColor: "#7A5211", category: "promotion", displayOrder: 2 },
  { key: "popular", label: "Popular", icon: "trending-up", color: "#E8D5F5", textColor: "#6B3FA0", category: "promotion", displayOrder: 3 },
  { key: "must_try", label: "Must Try", icon: "heart", color: "#FFDCD6", textColor: "#9E3B2D", category: "promotion", displayOrder: 4 },

  // Seasonal / time-limited
  { key: "limited_time", label: "Limited Time", icon: "clock", color: "#FFF0D4", textColor: "#8C6217", category: "seasonal", displayOrder: 5 },
  { key: "ramadan_special", label: "Ramadan Special", icon: "moon", color: "#E0D4F7", textColor: "#4A3080", category: "seasonal", displayOrder: 6 },
  { key: "seasonal", label: "Seasonal", icon: "sun", color: "#FFF0D4", textColor: "#8C6217", category: "seasonal", displayOrder: 7 },
  { key: "eid_special", label: "Eid Special", icon: "star", color: "#F2E2B9", textColor: "#7A5211", category: "seasonal", displayOrder: 8 },

  // Value badges
  { key: "discount", label: "Discount", icon: "percent", color: "#D9F4E5", textColor: "#206B48", category: "value", displayOrder: 9 },
  { key: "value_deal", label: "Value Deal", icon: "tag", color: "#D9F4E5", textColor: "#206B48", category: "value", displayOrder: 10 },
  { key: "family_size", label: "Family Size", icon: "users", color: "#DDE8F8", textColor: "#2A5A8C", category: "value", displayOrder: 11 },
];

async function main() {
  console.log("Seeding badge types...");

  for (const badge of BADGE_TYPES) {
    await prisma.badgeType.upsert({
      where: { key: badge.key },
      update: {
        label: badge.label,
        icon: badge.icon,
        color: badge.color,
        textColor: badge.textColor,
        category: badge.category,
        displayOrder: badge.displayOrder,
      },
      create: badge,
    });
  }

  console.log(`Seeded ${BADGE_TYPES.length} badge types.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
