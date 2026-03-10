import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Seeding dietary tags...");

  for (const tag of DIETARY_TAGS) {
    await prisma.dietaryTag.upsert({
      where: { key: tag.key },
      update: {
        label: tag.label,
        icon: tag.icon,
        category: tag.category,
      },
      create: tag,
    });
  }

  console.log(`Seeded ${DIETARY_TAGS.length} dietary tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
