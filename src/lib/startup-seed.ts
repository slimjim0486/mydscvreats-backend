import { prisma } from "@/lib/prisma";

const BADGE_TYPES = [
  { key: "best_seller", label: "Best Seller", icon: "flame", color: "#FFDCD6", textColor: "#9E3B2D", category: "promotion", displayOrder: 0 },
  { key: "new", label: "New", icon: "sparkles", color: "#D9F4E5", textColor: "#206B48", category: "promotion", displayOrder: 1 },
  { key: "chefs_pick", label: "Chef's Pick", icon: "chef-hat", color: "#F2E2B9", textColor: "#7A5211", category: "promotion", displayOrder: 2 },
  { key: "popular", label: "Popular", icon: "trending-up", color: "#E8D5F5", textColor: "#6B3FA0", category: "promotion", displayOrder: 3 },
  { key: "must_try", label: "Must Try", icon: "heart", color: "#FFDCD6", textColor: "#9E3B2D", category: "promotion", displayOrder: 4 },
  { key: "limited_time", label: "Limited Time", icon: "clock", color: "#FFF0D4", textColor: "#8C6217", category: "seasonal", displayOrder: 5 },
  { key: "ramadan_special", label: "Ramadan Special", icon: "moon", color: "#E0D4F7", textColor: "#4A3080", category: "seasonal", displayOrder: 6 },
  { key: "seasonal", label: "Seasonal", icon: "sun", color: "#FFF0D4", textColor: "#8C6217", category: "seasonal", displayOrder: 7 },
  { key: "eid_special", label: "Eid Special", icon: "star", color: "#F2E2B9", textColor: "#7A5211", category: "seasonal", displayOrder: 8 },
  { key: "discount", label: "Discount", icon: "percent", color: "#D9F4E5", textColor: "#206B48", category: "value", displayOrder: 9 },
  { key: "value_deal", label: "Value Deal", icon: "tag", color: "#D9F4E5", textColor: "#206B48", category: "value", displayOrder: 10 },
  { key: "family_size", label: "Family Size", icon: "users", color: "#DDE8F8", textColor: "#2A5A8C", category: "value", displayOrder: 11 },
];

const DIETARY_TAGS = [
  { key: "vegetarian", label: "Vegetarian", icon: "🥬", category: "dietary" },
  { key: "vegan", label: "Vegan", icon: "🌱", category: "dietary" },
  { key: "gluten_free", label: "Gluten Free", icon: "🌾", category: "dietary" },
  { key: "dairy_free", label: "Dairy Free", icon: "🥛", category: "dietary" },
  { key: "halal", label: "Halal", icon: "☪️", category: "dietary" },
  { key: "spicy", label: "Spicy", icon: "🌶️", category: "dietary" },
  { key: "mild", label: "Mild", icon: "😌", category: "dietary" },
  { key: "nut_free", label: "Nut Free", icon: "🥜", category: "allergen" },
  { key: "contains_nuts", label: "Contains Nuts", icon: "⚠️", category: "allergen" },
  { key: "contains_shellfish", label: "Contains Shellfish", icon: "🦐", category: "allergen" },
  { key: "contains_soy", label: "Contains Soy", icon: "🫘", category: "allergen" },
  { key: "contains_eggs", label: "Contains Eggs", icon: "🥚", category: "allergen" },
];

export async function seedReferenceData() {
  await Promise.all([
    ...BADGE_TYPES.map((badge) =>
      prisma.badgeType.upsert({
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
      })
    ),
    ...DIETARY_TAGS.map((tag) =>
      prisma.dietaryTag.upsert({
        where: { key: tag.key },
        update: {
          label: tag.label,
          icon: tag.icon,
          category: tag.category,
        },
        create: tag,
      })
    ),
  ]);
}
