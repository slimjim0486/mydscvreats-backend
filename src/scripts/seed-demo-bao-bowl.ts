/**
 * Seed "Bao & Bowl" as a fully working demo restaurant.
 *
 * Usage:  npx tsx src/scripts/seed-demo-bao-bowl.ts
 * Cleanup: npx tsx src/scripts/seed-demo-bao-bowl.ts --cleanup
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT = {
  slug: "bao-bowl",
  name: "Bao & Bowl",
  description:
    "Modern Asian street food, elevated. Bao & Bowl takes the bold, craveable flavours of East and Southeast Asian street markets and serves them in a clean, contemporary setting. Our pillowy-soft bao buns are steamed to order and stuffed with slow-braised meats, crispy tempura, and vibrant pickled vegetables. Our rice and noodle bowls are built for balance — punchy sauces, fresh herbs, crunchy toppings, and perfectly cooked proteins. Every bowl tells a story: from the 12-hour pork belly braise to the house-fermented kimchi, from the hand-folded gyoza to the charcoal-grilled teriyaki. Whether you're after a quick lunch bowl or a feast of bao and sides to share, Bao & Bowl is your passport to the flavours of Asia — right here in Dubai.",
  cuisineType: "Asian Fusion",
  themeKey: "midnight" as const,
  location: "Dubai, UAE",
  address: "Box Park, Al Wasl, Dubai, UAE",
  phone: "+971 4 555 0654",
  logoUrl: "https://eats-images.mydscvr.ai/demo-restaurants/bao-bowl/logo.jpg",
  coverImageUrl: "https://eats-images.mydscvr.ai/demo-restaurants/bao-bowl/cover.jpg",
  operatingHours: {
    timezone: "Asia/Dubai",
    schedule: [
      { dayOfWeek: 0, isClosed: false, periods: [{ open: "11:30", close: "23:00" }] },
      { dayOfWeek: 1, isClosed: false, periods: [{ open: "11:30", close: "23:00" }] },
      { dayOfWeek: 2, isClosed: false, periods: [{ open: "11:30", close: "23:00" }] },
      { dayOfWeek: 3, isClosed: false, periods: [{ open: "11:30", close: "23:00" }] },
      { dayOfWeek: 4, isClosed: false, periods: [{ open: "11:30", close: "00:00" }] },
      { dayOfWeek: 5, isClosed: false, periods: [{ open: "11:30", close: "00:00" }] },
      { dayOfWeek: 6, isClosed: false, periods: [{ open: "11:30", close: "23:00" }] },
    ],
  },
};

const SECTIONS: Array<{
  name: string;
  items: Array<{
    name: string;
    description: string;
    price: number;
    aiNotes: string;
    dietaryKeys?: string[];
  }>;
}> = [
  {
    name: "Bao Buns",
    items: [
      {
        name: "Braised Pork Belly Bao",
        description:
          "Our signature — a cloud-soft steamed bao bun cradling 12-hour braised pork belly glazed in a sticky soy-ginger reduction, topped with pickled daikon, crunchy peanuts, and fresh coriander.",
        price: 32,
        aiNotes:
          "Our #1 BEST-SELLER. Contains GLUTEN (bao bun), PORK, and PEANUTS. The pork belly is braised for 12 hours until meltingly tender — this is the dish that defines Bao & Bowl. Served as a single bao (generous size). The pickled daikon adds crunch and acidity to cut through the rich pork. Must flag PEANUTS and PORK. Not suitable for halal diets. This item is the most reordered on our menu.",
        dietaryKeys: ["contains_nuts"],
      },
      {
        name: "Crispy Chicken Bao",
        description:
          "A fluffy steamed bao filled with crunchy panko-fried chicken thigh, drizzled with sriracha mayo, and topped with house-made kimchi slaw and sesame seeds.",
        price: 30,
        aiNotes:
          "Contains GLUTEN (bao bun, panko coating), EGGS (mayo), and SESAME. DAIRY-FREE. NUT-FREE. The chicken thigh is buttermilk-marinated for tenderness, then panko-crusted. The sriracha mayo has a medium kick — not overwhelmingly spicy. The kimchi slaw is fermented in-house. Our most popular bao for guests who don't eat pork. Very satisfying crunch-to-soft ratio.",
        dietaryKeys: ["dairy_free", "nut_free", "contains_eggs"],
      },
      {
        name: "Glazed Mushroom Bao",
        description:
          "A steamed bao stuffed with king oyster mushrooms glazed in a sweet miso-hoisin sauce, with pickled cucumber ribbons and crispy shallots.",
        price: 28,
        aiNotes:
          "VEGAN. Contains GLUTEN (bao bun) and SOY (miso, hoisin). NUT-FREE. Our best vegan option. The king oyster mushrooms are seared until golden, then glazed — meaty texture and umami-rich. The pickled cucumber adds freshness and the crispy shallots add crunch. Very popular with non-vegans too — the miso-hoisin glaze is incredibly flavourful. Satisfying and complete.",
        dietaryKeys: ["vegan", "nut_free"],
      },
      {
        name: "Tempura Prawn Bao",
        description:
          "A steamed bao bun filled with golden tempura tiger prawns, spicy Kewpie mayo, shredded nori, and quick-pickled red cabbage.",
        price: 34,
        aiNotes:
          "Contains GLUTEN (bao bun, tempura batter), SHELLFISH (prawns), EGGS (mayo), and SOY. DAIRY-FREE. NUT-FREE. Tiger prawns are butterflied and tempura-fried to order for maximum crunch. The Kewpie mayo is Japanese-style — richer and more umami than regular mayo. Shredded nori adds an ocean flavour note. Our most premium bao. Flag shellfish allergy.",
        dietaryKeys: ["dairy_free", "nut_free", "contains_shellfish", "contains_eggs"],
      },
    ],
  },
  {
    name: "Rice Bowls",
    items: [
      {
        name: "Teriyaki Chicken Bowl",
        description:
          "Grilled chicken thigh glazed in our house teriyaki sauce, served over steamed jasmine rice with edamame, pickled ginger, avocado, sesame seeds, and a drizzle of sriracha.",
        price: 42,
        aiNotes:
          "Contains SOY (teriyaki sauce) and SESAME. GLUTEN-FREE (our teriyaki is made with tamari, not regular soy sauce). DAIRY-FREE, NUT-FREE. The chicken thigh is grilled over charcoal for smoky flavour, then glazed with our house teriyaki (soy, mirin, ginger, garlic). Very well-balanced bowl — protein, carbs, healthy fats, and vegetables. Our best-selling bowl. A complete, satisfying meal.",
        dietaryKeys: ["gluten_free", "dairy_free", "nut_free"],
      },
      {
        name: "Korean BBQ Beef Bowl",
        description:
          "Tender sliced bulgogi beef marinated in a sweet-savoury Korean BBQ sauce, served over rice with house-fermented kimchi, a fried egg, pickled carrot, and gochujang drizzle.",
        price: 48,
        aiNotes:
          "Contains SOY (bulgogi marinade), EGGS (fried egg), SESAME, and is MILDLY SPICY (gochujang). GLUTEN-FREE, DAIRY-FREE, NUT-FREE. The bulgogi is marinated for 24 hours in soy, pear, garlic, and sesame oil — the pear tenderises the beef beautifully. The kimchi is house-fermented for 2 weeks. The gochujang (Korean chilli paste) adds a sweet heat — medium spice level. Very popular with guests who love Korean flavours.",
        dietaryKeys: ["gluten_free", "dairy_free", "nut_free", "contains_eggs", "spicy"],
      },
      {
        name: "Tofu Katsu Curry Bowl",
        description:
          "Crispy panko-crusted tofu steaks served over rice with a fragrant Japanese-style golden curry sauce, pickled red cabbage, and fresh spring onions.",
        price: 38,
        aiNotes:
          "VEGAN (our curry sauce is made without dairy). Contains GLUTEN (panko coating) and SOY (tofu, soy sauce in curry). NUT-FREE. The tofu is pressed, marinated, then panko-crusted and fried until golden. The curry sauce is made from scratch — a Japanese-style golden curry with warming spices, not spicy hot. Mild heat level. Extremely satisfying even for non-vegetarians. Good value at 38 AED.",
        dietaryKeys: ["vegan", "nut_free", "mild"],
      },
      {
        name: "Salmon Poke Bowl",
        description:
          "Fresh cubed salmon tossed in a ponzu-sesame dressing, served over sushi rice with mango, avocado, edamame, crispy wonton strips, and tobiko fish roe.",
        price: 52,
        aiNotes:
          "Contains RAW FISH (salmon), SOY (ponzu), SESAME, GLUTEN (wonton strips), and FISH ROE (tobiko). DAIRY-FREE. NUT-FREE. The salmon is sashimi-grade, sourced fresh. The ponzu-sesame dressing is light, citrusy, and umami-rich. The mango adds tropical sweetness. This is our freshest, lightest bowl — perfect for health-conscious guests. The wonton strips add crunch. Flag raw fish for guests who prefer cooked proteins.",
        dietaryKeys: ["dairy_free", "nut_free"],
      },
    ],
  },
  {
    name: "Noodles",
    items: [
      {
        name: "Tonkotsu Ramen",
        description:
          "A rich, creamy pork bone broth simmered for 18 hours, served with thin ramen noodles, chashu pork belly, a soft-boiled marinated egg, nori, bamboo shoots, and spring onions.",
        price: 48,
        aiNotes:
          "Contains PORK (broth and chashu), GLUTEN (noodles), EGGS (soft-boiled egg), and SOY. DAIRY-FREE, NUT-FREE. The broth is our pride — simmered for 18 hours from pork bones until milky-white and intensely flavourful. The chashu pork belly is braised separately and torched before serving. The egg is marinated in soy and mirin for 12 hours. Not suitable for halal diets. A labour of love.",
        dietaryKeys: ["dairy_free", "nut_free", "contains_eggs"],
      },
      {
        name: "Pad Thai",
        description:
          "Wok-tossed rice noodles with tiger prawns, scrambled egg, bean sprouts, and chives in a tangy tamarind sauce, finished with crushed peanuts and a lime wedge.",
        price: 44,
        aiNotes:
          "Contains SHELLFISH (prawns), EGGS, PEANUTS, and SOY (fish sauce). GLUTEN-FREE (rice noodles), DAIRY-FREE. The wok-hei (breath of the wok) is key — we use high-heat commercial woks for authentic smoky flavour. The tamarind sauce is sweet, sour, and savoury. The peanuts are essential to Pad Thai but FLAG for nut allergies — can be omitted. Can be made with chicken or tofu instead of prawns.",
        dietaryKeys: ["gluten_free", "dairy_free", "contains_shellfish", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Dan Dan Noodles",
        description:
          "Springy wheat noodles swimming in a fiery Sichuan chilli oil and sesame paste sauce, topped with seasoned minced pork, crispy peanuts, and Sichuan peppercorns.",
        price: 40,
        aiNotes:
          "SPICY — Sichuan-style numbing heat. Contains GLUTEN (wheat noodles), PORK, PEANUTS, SOY, and SESAME. DAIRY-FREE. This dish has genuine Sichuan málà heat — the peppercorns create a unique tingling numbness on the tongue. Warn guests about the spice level. The sesame paste adds richness. Not suitable for halal diets. Can be made vegetarian with mushrooms instead of pork. Not for the faint-hearted.",
        dietaryKeys: ["spicy", "dairy_free", "contains_nuts"],
      },
      {
        name: "Veggie Yakisoba",
        description:
          "Stir-fried Japanese buckwheat noodles with shiitake mushrooms, bok choy, bell peppers, and bean sprouts in a sweet-savoury yakisoba sauce, topped with pickled ginger and nori.",
        price: 36,
        aiNotes:
          "VEGAN. Contains GLUTEN (noodles) and SOY (yakisoba sauce). NUT-FREE. Despite the name, yakisoba noodles are wheat-based (not pure buckwheat). The sauce is sweet, tangy, and savoury — similar to Worcestershire sauce. Loaded with vegetables. A great vegan noodle option. Light and satisfying. The pickled ginger adds a sharp, refreshing note.",
        dietaryKeys: ["vegan", "nut_free"],
      },
    ],
  },
  {
    name: "Starters & Sides",
    items: [
      {
        name: "Pork & Chive Gyoza (6 pcs)",
        description:
          "Hand-folded Japanese dumplings filled with seasoned pork and garlic chives, pan-fried until crispy on the bottom and served with a soy-vinegar dipping sauce.",
        price: 28,
        aiNotes:
          "Contains PORK, GLUTEN (wrapper), SOY, and SESAME (dipping sauce). DAIRY-FREE, NUT-FREE. Each gyoza is hand-folded daily. Pan-fried 'potsticker' style — crispy golden bottom, tender steamed top. Served as 6 pieces with dipping sauce. Not suitable for halal diets. Our most popular starter. Great for sharing.",
        dietaryKeys: ["dairy_free", "nut_free"],
      },
      {
        name: "Vegetable Gyoza (6 pcs)",
        description:
          "Delicate hand-folded dumplings filled with shiitake mushroom, cabbage, ginger, and water chestnut. Pan-fried golden and served with ponzu dipping sauce.",
        price: 26,
        aiNotes:
          "VEGAN. Contains GLUTEN (wrapper) and SOY (ponzu). NUT-FREE, DAIRY-FREE. The veggie filling is just as flavourful as the pork version — shiitake and ginger give it depth. Same hand-folded technique. Great vegan/vegetarian starter. Served as 6 pieces. Can also be steamed instead of pan-fried on request.",
        dietaryKeys: ["vegan", "nut_free", "dairy_free"],
      },
      {
        name: "Edamame",
        description:
          "Steamed young soybeans tossed in sea salt and a touch of sesame oil. Simple, addictive, and protein-packed.",
        price: 18,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE, DAIRY-FREE. Contains SOY (edamame are soybeans) and SESAME (sesame oil). The simplest and most popular side dish. Great as a snack while waiting for mains. High in protein. Can be ordered with chilli flakes or garlic on request. Affordable at 18 AED.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free", "dairy_free"],
      },
      {
        name: "Chicken Karaage",
        description:
          "Japanese-style double-fried chicken thigh pieces marinated in soy, ginger, and sake, coated in potato starch for an extra-crispy, juicy finish. Served with Kewpie mayo.",
        price: 32,
        aiNotes:
          "Contains SOY, EGGS (Kewpie mayo), and SAKE (alcohol in marinade — cooks off). GLUTEN-FREE (potato starch coating, not flour). DAIRY-FREE, NUT-FREE. Double-fried for maximum crunch. The potato starch coating is lighter and crunchier than regular flour. Marinated for 4 hours in soy, ginger, garlic, and sake. Served as 6-7 pieces. Our most popular non-bao starter.",
        dietaryKeys: ["gluten_free", "dairy_free", "nut_free", "contains_eggs"],
      },
      {
        name: "Miso Soup",
        description:
          "A comforting bowl of dashi broth with white miso paste, silken tofu, wakame seaweed, and spring onions. Light, warming, and umami-rich.",
        price: 16,
        aiNotes:
          "VEGAN (our dashi is kombu-based, not bonito). Contains SOY (miso, tofu). GLUTEN-FREE, NUT-FREE, DAIRY-FREE. Traditional Japanese comfort food. Very light — works as a starter or a side to any bowl. The white miso is milder and sweeter than red miso. The silken tofu is delicate. Great for cold weather or when a guest wants something warming before their main.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free", "dairy_free"],
      },
      {
        name: "Sweet Potato Fries with Sriracha Mayo",
        description:
          "Crispy sweet potato fries seasoned with sea salt and served with a creamy sriracha mayo dipping sauce.",
        price: 22,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE. Contains EGGS (mayo). NUT-FREE, DAIRY-FREE. The sweet potato fries are cut thick and fried until crispy outside, fluffy inside. The sriracha mayo has a medium kick. Popular as a side with any bao or bowl. Good for kids (without the spicy mayo). A crowd-pleasing side.",
        dietaryKeys: ["gluten_free", "dairy_free", "nut_free", "contains_eggs"],
      },
    ],
  },
  {
    name: "Desserts",
    items: [
      {
        name: "Matcha Soft Serve",
        description:
          "Creamy Japanese matcha soft-serve ice cream swirled into a cone and dusted with kinako (roasted soybean) powder. Earthy, smooth, and not too sweet.",
        price: 22,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE (the cone contains gluten — can be served in a cup for GF). Contains DAIRY (cream) and SOY (kinako). NUT-FREE. Made with ceremonial-grade matcha — vibrant green, smooth, and not bitter. The kinako powder adds a nutty, toasty flavour. Our most popular dessert. Very photogenic. Can be served in a cup if the guest is gluten-free.",
        dietaryKeys: ["vegetarian", "nut_free"],
      },
      {
        name: "Mochi Ice Cream (3 pcs)",
        description:
          "Three hand-made mochi rice cakes with ice cream centres: mango, black sesame, and strawberry. Chewy, cold, and delightful.",
        price: 26,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE. Contains DAIRY (ice cream) and SESAME (black sesame flavour). NUT-FREE. Mochi is a Japanese rice cake — the outer layer is soft and chewy, the inside is ice cream. Served as 3 pieces in different flavours. Hand-made in-house. Each piece is about 2 bites. Very popular as a light, fun dessert. Great for sharing or as a palate cleanser.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
      {
        name: "Banana Tempura with Black Sesame Ice Cream",
        description:
          "Ripe banana halves in a light, crispy tempura batter, served with a scoop of house-made black sesame ice cream, a drizzle of honey, and toasted sesame seeds.",
        price: 28,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (tempura batter), DAIRY (ice cream), EGGS (batter), and SESAME. NUT-FREE. The contrast of hot tempura and cold ice cream is the experience. The black sesame ice cream has a deep, nutty, toasty flavour — unlike anything else on the menu. Drizzled with honey. A warm, indulgent way to end a meal. Best eaten immediately.",
        dietaryKeys: ["vegetarian", "nut_free", "contains_eggs"],
      },
    ],
  },
  {
    name: "Drinks",
    items: [
      {
        name: "Yuzu Lemonade",
        description:
          "Sparkling lemonade made with Japanese yuzu citrus, honey, and soda water. Bright, aromatic, and uniquely refreshing.",
        price: 20,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE, DAIRY-FREE. Yuzu is a Japanese citrus fruit — floral, tangy, and more complex than regular lemon. Mixed with honey (technically not vegan if strict — can substitute with agave). Very refreshing alongside any bao or bowl. Our signature drink. The yuzu is imported from Japan.",
        dietaryKeys: ["gluten_free", "nut_free", "dairy_free"],
      },
      {
        name: "Thai Iced Tea",
        description:
          "A sweet, creamy Thai iced tea made with Ceylon tea, condensed milk, and crushed ice. Vibrant orange, indulgently sweet, and cooling.",
        price: 18,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (condensed milk). Contains CAFFEINE. The iconic bright orange colour comes from food-grade colouring in the tea mix — this is traditional and authentic. Very sweet — great for guests with a sweet tooth. Can be made with coconut milk for dairy-free. Popular pairing with any spicy dish.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
      {
        name: "Japanese Ramune Soda",
        description:
          "A classic Japanese marble soda in the iconic Codd-neck bottle. Available in original, melon, and strawberry flavours.",
        price: 16,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE, DAIRY-FREE. The fun is in opening the bottle — you push a marble into the neck to release the fizz. Very popular with kids and Instagram. Three flavours available: original (lemon-lime), melon, and strawberry. A fun, playful drink that adds to the experience.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free", "dairy_free"],
      },
      {
        name: "Jasmine Green Tea",
        description:
          "Fragrant whole-leaf jasmine green tea, brewed and served in a traditional ceramic teapot. Delicate, floral, and calming.",
        price: 14,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE, DAIRY-FREE. Contains CAFFEINE (moderate — less than coffee). Whole-leaf tea, not bags — higher quality and more aromatic. The jasmine scent is naturally infused into the tea leaves. Served hot in a pot that yields about 2-3 cups. The traditional palate cleanser and digestive aid. Perfect with any meal.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free", "dairy_free"],
      },
    ],
  },
];

// ── Main logic ──────────────────────────────────────────────────────

async function main() {
  const isCleanup = process.argv.includes("--cleanup");

  if (isCleanup) {
    await cleanup();
    return;
  }

  await seed();
}

async function cleanup() {
  console.log("\nCleaning up Bao & Bowl demo data...\n");

  const existing = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT.slug },
  });

  if (!existing) {
    console.log("No restaurant found with slug 'bao-bowl'. Nothing to clean up.");
    return;
  }

  await prisma.restaurant.delete({ where: { id: existing.id } });
  console.log(`  Deleted restaurant: ${existing.name} (${existing.slug})`);

  const user = await prisma.user.findUnique({
    where: { clerkId: "demo_bao_bowl_owner" },
    include: { restaurants: true },
  });
  if (user && user.restaurants.length === 0) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  Deleted demo user: ${user.email}`);
  }

  console.log("\nCleanup complete!");
}

async function seed() {
  console.log("Seeding Bao & Bowl demo restaurant...\n");

  // 1. Upsert demo user
  const user = await prisma.user.upsert({
    where: { clerkId: "demo_bao_bowl_owner" },
    update: {},
    create: {
      clerkId: "demo_bao_bowl_owner",
      email: "demo-baobowl@mydscvr.ai",
      fullName: "Demo Owner (Bao & Bowl)",
      role: "restaurant_owner",
    },
  });
  console.log(`  User: ${user.id} (${user.email})`);

  // 2. Check if exists
  const existing = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT.slug },
  });

  if (existing) {
    console.log(`\n  Restaurant "${RESTAURANT.name}" already exists (${existing.id}).`);
    console.log("  Run with --cleanup first to re-seed.");
    return;
  }

  // 3. Create restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      slug: RESTAURANT.slug,
      name: RESTAURANT.name,
      description: RESTAURANT.description,
      cuisineType: RESTAURANT.cuisineType,
      themeKey: RESTAURANT.themeKey,
      location: RESTAURANT.location,
      address: RESTAURANT.address,
      phone: RESTAURANT.phone,
      logoUrl: RESTAURANT.logoUrl,
      coverImageUrl: RESTAURANT.coverImageUrl,
      operatingHours: RESTAURANT.operatingHours,
      isPublished: true,
      subscriptionStatus: "active",
      ownerId: user.id,
    },
  });
  console.log(`  Restaurant: ${restaurant.id} (${restaurant.slug})`);

  // 4. Pro subscription
  const subscription = await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date("2099-12-31"),
    },
  });
  console.log(`  Subscription: ${subscription.id} (Pro, active)`);

  // 5. Fetch dietary tags for linking
  const allTags = await prisma.dietaryTag.findMany();
  const tagMap = new Map(allTags.map((t) => [t.key, t.id]));
  console.log(`  Found ${allTags.length} dietary tags in DB`);

  // 6. Create menu sections, items, and dietary tags
  let totalItems = 0;
  let notesCount = 0;
  let tagsLinked = 0;

  for (const [sectionIndex, section] of SECTIONS.entries()) {
    const dbSection = await prisma.menuSection.create({
      data: {
        restaurantId: restaurant.id,
        name: section.name,
        displayOrder: sectionIndex,
      },
    });

    for (const [itemIndex, item] of section.items.entries()) {
      const menuItem = await prisma.menuItem.create({
        data: {
          sectionId: dbSection.id,
          restaurantId: restaurant.id,
          name: item.name,
          description: item.description,
          price: item.price,
          currency: "AED",
          aiNotes: item.aiNotes,
          isAvailable: true,
          displayOrder: itemIndex,
        },
      });

      // Link dietary tags
      if (item.dietaryKeys && item.dietaryKeys.length > 0) {
        for (const key of item.dietaryKeys) {
          const tagId = tagMap.get(key);
          if (tagId) {
            await prisma.menuItemDietaryTag.create({
              data: {
                menuItemId: menuItem.id,
                tagId: tagId,
                source: "manual",
                confidence: 1.0,
              },
            });
            tagsLinked++;
          }
        }
      }

      totalItems++;
      if (item.aiNotes) notesCount++;
    }

    console.log(`  Section "${section.name}": ${section.items.length} items`);
  }

  // 7. Summary
  console.log(`\n--- Summary ---`);
  console.log(`  Restaurant: ${restaurant.name}`);
  console.log(`  Slug: ${restaurant.slug}`);
  console.log(`  Total items: ${totalItems}`);
  console.log(`  Items with AI notes: ${notesCount}`);
  console.log(`  Dietary tags linked: ${tagsLinked}`);
  console.log(`  Subscription: Pro (active)`);
  console.log(`\n  Live at: https://mydscvr.ai/${restaurant.slug}`);
  console.log(`\n  To clean up: npx tsx src/scripts/seed-demo-bao-bowl.ts --cleanup`);
  console.log("  Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
