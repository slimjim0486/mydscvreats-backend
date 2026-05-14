/**
 * Seed script: Creates one fictional Dubai restaurant flagged as is_demo=true,
 * so the full app (onboarding, menu, AI tags, dashboard, CRM, SEO analysis,
 * GBP, GSC, AggregateRating, etc.) can be exercised end-to-end without
 * polluting public SEO surfaces.
 *
 * The restaurant is fictional but plausible — no risk of impersonating a real
 * Dubai business. The is_demo flag emits `noindex` on the public page and
 * excludes it from the sitemap, llms.txt, explore directory, location pages,
 * and similar-restaurants results.
 *
 * Usage:
 *   1. Sign up with a test email in the app
 *   2. Copy the Clerk user ID from the Clerk dashboard
 *   3. Run:  npx tsx prisma/seed-demo-restaurant.ts <clerkUserId>
 *
 * To tear down:  npx tsx prisma/seed-demo-restaurant.ts <clerkUserId> --cleanup
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_SLUG = "zaytoun-kitchen-demo";

const RESTAURANT = {
  name: "Zaytoun Kitchen",
  slug: DEMO_SLUG,
  cuisineType: "Levantine",
  description:
    "Modern Levantine grill — charcoal-fired mezze, shawarma, and wood-oven manakish, served in a sun-bleached courtyard tucked into JLT Cluster Y.",
  location: "Jumeirah Lakes Towers, Dubai",
  address: "Cluster Y, JLT, Dubai, United Arab Emirates",
  phone: "+971 4 555 0142",
  website: null as string | null,
  whatsappNumber: "+971 50 555 0142",
  operatingHours: {
    timezone: "Asia/Dubai",
    schedule: [
      { dayOfWeek: 0, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 1, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 2, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 3, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 4, isClosed: false, periods: [{ open: "11:00", close: "00:30" }] },
      { dayOfWeek: 5, isClosed: false, periods: [{ open: "11:00", close: "00:30" }] },
      { dayOfWeek: 6, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
    ],
  },
};

const SECTIONS = [
  {
    name: "Cold Mezze",
    items: [
      { name: "Hummus Beiruti", price: 26, description: "Chickpea purée, fresh garlic, chilli, parsley, olive oil." },
      { name: "Baba Ghanoush", price: 28, description: "Smoked aubergine, tahini, lemon, pomegranate." },
      { name: "Muhammara", price: 30, description: "Roasted red pepper, walnut, pomegranate molasses, Aleppo pepper." },
      { name: "Tabbouleh", price: 28, description: "Parsley, bulgur, tomato, mint, lemon, extra virgin olive oil." },
      { name: "Labneh & Za'atar", price: 24, description: "Strained yogurt with wild za'atar and Najd olive oil." },
    ],
  },
  {
    name: "Hot Mezze",
    items: [
      { name: "Falafel (5 pcs)", price: 26, description: "Fava bean and chickpea fritters, tahini, pickles." },
      { name: "Cheese Sambousek (4 pcs)", price: 30, description: "Akkawi and halloumi in a crisp pastry shell." },
      { name: "Spicy Potato Harra", price: 28, description: "Cubed potato, garlic, coriander, fresh chilli." },
      { name: "Manakish Za'atar", price: 22, description: "Wood-oven flatbread with wild za'atar and olive oil." },
      { name: "Manakish Cheese & Sujuk", price: 34, description: "Akkawi cheese, spiced beef sujuk, wood-oven baked." },
    ],
  },
  {
    name: "From the Charcoal Grill",
    items: [
      { name: "Lamb Shish", price: 88, description: "Charcoal-grilled lamb cubes, sumac onions, grilled tomato." },
      { name: "Chicken Taouk", price: 64, description: "Marinated chicken thigh, toum garlic sauce, charred lemon." },
      { name: "Mixed Grill Platter", price: 145, description: "Lamb shish, chicken taouk, kafta, served with rice and grilled veg. Serves 2." },
      { name: "Kafta Halabi", price: 72, description: "Minced lamb skewer with parsley, onion, Aleppo pepper." },
      { name: "Grilled Sea Bream", price: 110, description: "Whole sea bream, harra spice, charred lemon, herb oil." },
    ],
  },
  {
    name: "Shawarma & Wraps",
    items: [
      { name: "Chicken Shawarma Wrap", price: 32, description: "Spit-roasted chicken thigh, garlic toum, pickles, fries." },
      { name: "Beef Shawarma Wrap", price: 36, description: "Slow-marinated beef, tahini, tomato, parsley, sumac onion." },
      { name: "Shawarma Plate", price: 58, description: "Choice of chicken or beef shawarma over saffron rice, salad, hummus." },
    ],
  },
  {
    name: "Drinks",
    items: [
      { name: "Fresh Mint Lemonade", price: 22, description: "Fresh lemon, mint, a touch of orange blossom." },
      { name: "Ayran", price: 14, description: "Salted yogurt drink." },
      { name: "Karak Chai", price: 12, description: "Strong cardamom-spiced milk tea." },
      { name: "Sparkling Water (500ml)", price: 18, description: "San Pellegrino." },
    ],
  },
  {
    name: "Sweets",
    items: [
      { name: "Knafeh Nabulsieh", price: 36, description: "Crisp kataifi, melted akkawi, orange-blossom syrup, pistachio." },
      { name: "Baklava Mixed Plate", price: 32, description: "Six pieces — pistachio, walnut, cashew, finished with rose syrup." },
      { name: "Mhalabieh", price: 22, description: "Milk pudding with rose water, pistachio, candied orange." },
    ],
  },
];

async function main() {
  const clerkId = process.argv[2];
  const isCleanup = process.argv.includes("--cleanup");

  if (!clerkId) {
    console.error(
      "Usage:\n" +
        "  npx tsx prisma/seed-demo-restaurant.ts <clerkUserId>\n" +
        "  npx tsx prisma/seed-demo-restaurant.ts <clerkUserId> --cleanup"
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    console.error(`No user found with clerkId "${clerkId}". Make sure you've signed in at least once.`);
    process.exit(1);
  }

  if (isCleanup) {
    const existing = await prisma.restaurant.findUnique({ where: { slug: DEMO_SLUG } });
    if (!existing) {
      console.log("No demo restaurant to clean up.");
      return;
    }
    await prisma.restaurant.delete({ where: { id: existing.id } });
    console.log(`Deleted demo restaurant: ${RESTAURANT.name} (${DEMO_SLUG})`);
    return;
  }

  const existing = await prisma.restaurant.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    console.error(
      `Demo restaurant "${DEMO_SLUG}" already exists. Run with --cleanup first:\n` +
        `  npx tsx prisma/seed-demo-restaurant.ts ${clerkId} --cleanup`
    );
    process.exit(1);
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      slug: RESTAURANT.slug,
      name: RESTAURANT.name,
      description: RESTAURANT.description,
      cuisineType: RESTAURANT.cuisineType,
      location: RESTAURANT.location,
      address: RESTAURANT.address,
      phone: RESTAURANT.phone,
      website: RESTAURANT.website,
      whatsappNumber: RESTAURANT.whatsappNumber,
      operatingHours: RESTAURANT.operatingHours as Prisma.InputJsonValue,
      ownerId: user.id,
      isPublished: true,
      isDemo: true,
      subscriptionStatus: "trial",
    },
  });

  console.log(`Created demo restaurant: ${restaurant.name} (${restaurant.slug})`);

  for (let si = 0; si < SECTIONS.length; si++) {
    const sectionDef = SECTIONS[si];
    const section = await prisma.menuSection.create({
      data: {
        restaurantId: restaurant.id,
        name: sectionDef.name,
        displayOrder: si,
      },
    });

    const itemData: Prisma.MenuItemCreateManyInput[] = sectionDef.items.map(
      (item, ii) => ({
        sectionId: section.id,
        restaurantId: restaurant.id,
        name: item.name,
        description: item.description,
        price: new Prisma.Decimal(item.price),
        currency: "AED",
        displayOrder: ii,
        isAvailable: true,
      })
    );

    await prisma.menuItem.createMany({ data: itemData });
    console.log(`  Section "${sectionDef.name}" — ${itemData.length} items`);
  }

  console.log("\n--- Summary ---");
  console.log(`Slug: ${restaurant.slug}`);
  console.log(`Public URL: /${restaurant.slug}  (emits noindex, excluded from sitemap)`);
  console.log(`Dashboard: /dashboard  (the demo pill + toggle live on /dashboard/appearance)`);
  console.log(`\nTo clean up later:\n  npx tsx prisma/seed-demo-restaurant.ts ${clerkId} --cleanup`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
