/**
 * Seed "Levant Grill" as a fully working demo restaurant.
 *
 * Usage:  npx tsx src/scripts/seed-demo-levant-grill.ts
 * Cleanup: npx tsx src/scripts/seed-demo-levant-grill.ts --cleanup
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT = {
  slug: "levant-grill",
  name: "Levant Grill",
  description:
    "Born from a passion for the open flame and the generous spirit of Levantine hospitality, Levant Grill brings the soulful flavours of Lebanon to your table. Every kebab is hand-skewered with premium cuts, every mezze is made from scratch daily, and every flatbread is baked to order in our stone oven. From smoky charcoal-grilled lamb chops to silky hummus drizzled with single-origin olive oil, we honour time-tested recipes passed down through generations — while keeping things fresh, vibrant, and unmistakably Dubai. Whether you're sharing a mezze feast with friends or grabbing a quick shawarma wrap, Levant Grill is your neighbourhood Lebanese kitchen, made with love.",
  cuisineType: "Lebanese",
  themeKey: "saffron" as const,
  location: "Dubai, UAE",
  address: "Al Wasl Road, Jumeirah 1, Dubai, UAE",
  phone: "+971 4 555 0789",
  logoUrl: "https://eats-images.mydscvr.ai/demo-restaurants/levant-grill/logo.jpg",
  coverImageUrl: "https://eats-images.mydscvr.ai/demo-restaurants/levant-grill/cover.jpg",
  operatingHours: {
    timezone: "Asia/Dubai",
    schedule: [
      { dayOfWeek: 0, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 1, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 2, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 3, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
      { dayOfWeek: 4, isClosed: false, periods: [{ open: "11:00", close: "00:00" }] },
      { dayOfWeek: 5, isClosed: false, periods: [{ open: "11:00", close: "00:00" }] },
      { dayOfWeek: 6, isClosed: false, periods: [{ open: "11:00", close: "23:30" }] },
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
    name: "Cold Mezze",
    items: [
      {
        name: "Classic Hummus",
        description:
          "Silky-smooth chickpea purée blended with premium tahini, fresh lemon juice, and a hint of garlic, finished with a generous swirl of extra virgin olive oil and a dusting of paprika.",
        price: 22,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE. Our hummus is made fresh every morning using dried chickpeas soaked overnight — never from a tin. The tahini is single-origin from Nablus. Extremely popular as a starter or shared side. Served with warm flatbread (contains gluten) on the side — the hummus itself is GF. One of our most ordered items across delivery and dine-in.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free"],
      },
      {
        name: "Baba Ganoush",
        description:
          "Fire-roasted aubergine smoked over charcoal, blended with tahini, lemon, and garlic into a velvety, deeply smoky dip. Finished with pomegranate seeds and olive oil.",
        price: 24,
        aiNotes:
          "VEGAN, GLUTEN-FREE. The aubergines are roasted directly over live charcoal for an authentic smoky flavour — not oven-baked. The pomegranate seeds add a fresh pop of sweetness and colour. A lighter, smokier alternative to hummus. Paired with flatbread. Great for guests who love smoky flavours.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Fattoush Salad",
        description:
          "A vibrant Levantine salad of crisp romaine, juicy tomatoes, Persian cucumbers, radish, and fresh herbs, tossed with sumac vinaigrette and topped with shatteringly crisp fried pita chips.",
        price: 28,
        aiNotes:
          "VEGAN. Contains GLUTEN (fried pita chips). The sumac dressing is the signature — tangy, slightly floral, and uniquely Levantine. The pita chips are fried fresh and added just before serving so they stay crispy. Can be made without pita chips for a gluten-free version on request. Great as a shared starter or a light main.",
        dietaryKeys: ["vegan"],
      },
      {
        name: "Tabbouleh",
        description:
          "A lush, herb-forward salad of finely chopped flat-leaf parsley, fresh mint, bulgur wheat, ripe tomatoes, and spring onions, dressed in lemon juice and olive oil.",
        price: 22,
        aiNotes:
          "VEGAN. Contains GLUTEN (bulgur wheat). True Lebanese tabbouleh is 80% herbs, 20% grain — ours follows this tradition. Extremely fresh and vibrant. Light and palate-cleansing — great alongside heavier grilled meats. A staple of the Lebanese table.",
        dietaryKeys: ["vegan"],
      },
      {
        name: "Grilled Halloumi",
        description:
          "Thick slices of premium Cypriot halloumi, grilled until golden and caramelised on the outside with a warm, squeaky centre. Drizzled with honey and scattered with fresh mint and sesame seeds.",
        price: 32,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE. Contains DAIRY (halloumi) and SESAME. The halloumi is imported from Cyprus. Grilled to order — golden crust, soft inside. The honey-mint combination is a crowd favourite. Our most popular vegetarian mezze. Great for sharing or as a standalone starter.",
        dietaryKeys: ["vegetarian", "gluten_free"],
      },
      {
        name: "Labneh with Za'atar",
        description:
          "Thick, tangy strained yoghurt swirled with premium za'atar herb blend and a pool of extra virgin olive oil. Cool, creamy, and aromatic.",
        price: 20,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (yoghurt) and SESAME (in za'atar). Labneh is strained yoghurt — thicker and tangier than regular yoghurt. Za'atar is a Levantine spice blend (thyme, sumac, sesame). Very refreshing alongside grilled meats. Light and probiotic-rich. Served with flatbread on the side.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
    ],
  },
  {
    name: "Hot Mezze",
    items: [
      {
        name: "Falafel Plate",
        description:
          "Six crispy, golden falafel made from soaked chickpeas, fresh herbs, and spices — shatteringly crisp outside, vivid green and fluffy inside. Served with tahini sauce and pickled turnips.",
        price: 26,
        aiNotes:
          "VEGAN, DAIRY-FREE. Contains GLUTEN (trace amounts from frying, but the falafel itself is GF — depends on sensitivity level). Our falafel are made from raw soaked chickpeas, never tinned or pre-cooked — this is how traditional Lebanese falafel should be made. The green colour inside comes from fresh herbs (parsley, coriander). Deep-fried to order. Served as 6 pieces. Very popular.",
        dietaryKeys: ["vegan", "dairy_free"],
      },
      {
        name: "Lamb Sambousek",
        description:
          "Flaky, golden pastry parcels filled with spiced minced lamb, toasted pine nuts, and onions. Hand-folded and fried until perfectly crisp.",
        price: 30,
        aiNotes:
          "Contains GLUTEN (pastry) and TREE NUTS (pine nuts). Served as 4 pieces. Each sambousek is hand-folded in-house. The pine nuts add a buttery crunch. A classic Lebanese hot mezze — similar to empanadas but with Levantine spicing. Great as a shared starter. Flag pine nuts for nut allergies.",
        dietaryKeys: ["contains_nuts"],
      },
      {
        name: "Cheese Rakakat",
        description:
          "Crispy cigar-shaped pastry rolls filled with a blend of akkawi and halloumi cheese, delicately seasoned with mint. Served golden and piping hot.",
        price: 26,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (filo pastry) and DAIRY (akkawi + halloumi cheese). Served as 5 pieces. Rolled by hand using thin filo pastry. Akkawi is a mild white cheese from the Levant — it melts beautifully. The mint inside keeps them fresh. Popular with kids. Best eaten hot when the cheese is still stretchy.",
        dietaryKeys: ["vegetarian"],
      },
      {
        name: "Hummus with Lamb Shawarma",
        description:
          "Our signature hummus topped with tender, slow-roasted lamb shawarma, toasted pine nuts, and a drizzle of spiced butter. A showstopper.",
        price: 38,
        aiNotes:
          "Contains DAIRY (butter) and TREE NUTS (pine nuts). GLUTEN-FREE (the hummus and lamb — served with flatbread on the side which contains gluten). This is our premium hummus upgrade — the warm shawarma and melted butter transform the dish into a hearty starter or even a light main. The pine nuts are toasted to order. Extremely popular on weekends. Flag for nut allergies.",
        dietaryKeys: ["contains_nuts", "gluten_free"],
      },
      {
        name: "Chicken Wings with Garlic Sauce",
        description:
          "Crispy fried chicken wings tossed in our house garlic-lemon marinade, served with a generous pot of creamy, punchy Lebanese garlic toum.",
        price: 34,
        aiNotes:
          "Contains EGG (in the garlic toum — traditional toum is garlic, oil, and lemon but ours uses a touch of egg white for stability). DAIRY-FREE. GLUTEN-FREE (no coating on the wings — they're naked fried). The toum is extremely garlicky — warn guests who are sensitive. The wings are marinated for 24 hours. Served as 8 pieces. Great sharing dish.",
        dietaryKeys: ["gluten_free", "dairy_free", "contains_eggs"],
      },
    ],
  },
  {
    name: "From the Grill",
    items: [
      {
        name: "Mixed Grill Platter",
        description:
          "The ultimate charcoal feast — lamb kofta, shish tawook, lamb chops, and chicken wings, all grilled over live coals. Served with grilled tomato, onion, pickles, garlic toum, and warm flatbread.",
        price: 95,
        aiNotes:
          "Our SIGNATURE dish and the most popular main. Contains GLUTEN (flatbread) and EGG (toum). DAIRY-FREE. Serves 1-2 generously. Everything is grilled to order over natural lump charcoal — no gas grill. Includes 2 lamb kofta skewers, 2 chicken skewers, 2 lamb chops, and 4 wings. Very generous portion. The best way to experience Levant Grill for first-time visitors. Allow 15-20 minutes for preparation.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Shish Tawook",
        description:
          "Tender chicken breast cubes marinated in yoghurt, garlic, lemon, and a secret spice blend, then skewered and grilled over charcoal until juicy and lightly charred. Served with garlic toum and pickles.",
        price: 48,
        aiNotes:
          "Contains DAIRY (yoghurt marinade) and EGG (toum). The yoghurt marinade tenderises the chicken beautifully. Served as 2 generous skewers with rice or flatbread. Our best-selling individual grill item. The spice blend is a house secret — warm, aromatic, not spicy. Great for guests who prefer chicken over lamb.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Lamb Kofta",
        description:
          "Hand-minced lamb blended with onion, parsley, and aromatic spices, shaped onto flat skewers and grilled over charcoal. Served with tahini sauce and fresh salad.",
        price: 52,
        aiNotes:
          "DAIRY-FREE, GLUTEN-FREE (the kofta itself — served with flatbread which contains gluten). The lamb is hand-minced, not machine-ground, for a better texture. Seasoned with cumin, coriander, and a hint of cinnamon — traditional Levantine spicing. Served as 2 skewers. The tahini sauce is the traditional pairing. Juicy, flavourful, and aromatic.",
        dietaryKeys: ["dairy_free", "gluten_free"],
      },
      {
        name: "Lamb Chops",
        description:
          "Premium French-trimmed lamb cutlets, simply seasoned with sea salt, black pepper, and a brush of olive oil, then grilled to pink perfection over charcoal.",
        price: 78,
        aiNotes:
          "GLUTEN-FREE, DAIRY-FREE, NUT-FREE. Our most premium grill item. French-trimmed rack chops — 4 pieces per serving. Cooked medium by default — can adjust on request. Simple seasoning lets the quality of the lamb shine. Served with grilled vegetables. Best paired with hummus or baba ganoush on the side.",
        dietaryKeys: ["gluten_free", "dairy_free", "nut_free"],
      },
      {
        name: "Chicken Shawarma Plate",
        description:
          "Thinly sliced marinated chicken, slow-roasted on the vertical spit, served as a generous plate with garlic toum, pickled turnips, fries, and warm flatbread.",
        price: 42,
        aiNotes:
          "Contains GLUTEN (flatbread) and EGG (toum). The chicken is marinated in a blend of yoghurt, vinegar, and 7 spices, then roasted on the traditional vertical spit. Sliced to order. Very popular for delivery. Generous portion — can easily satisfy a big appetite. The fries are included in the plate price. A crowd-pleaser.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Lamb Shawarma Plate",
        description:
          "Slow-roasted lamb stacked and carved from the vertical spit, served with tahini, pickled vegetables, fresh tomato, and warm flatbread. Rich, tender, and deeply spiced.",
        price: 48,
        aiNotes:
          "Contains GLUTEN (flatbread). DAIRY-FREE. NUT-FREE. The lamb is layered with fat and spices on the spit and roasted for hours. Richer and more intense than the chicken shawarma. Served with tahini instead of toum (traditional pairing). Includes fries. A must-try for lamb lovers.",
        dietaryKeys: ["dairy_free", "nut_free"],
      },
    ],
  },
  {
    name: "Wraps",
    items: [
      {
        name: "Chicken Shawarma Wrap",
        description:
          "Freshly carved chicken shawarma rolled in a warm saj flatbread with garlic toum, pickled turnips, tomato, and fresh mint.",
        price: 28,
        aiNotes:
          "Contains GLUTEN (saj bread) and EGG (toum). DAIRY-FREE. The saj bread is baked fresh on a domed griddle. Quick, portable, and packed with flavour. Our most popular delivery item. Great value at 28 AED. Perfect for lunch on the go.",
        dietaryKeys: ["dairy_free", "contains_eggs"],
      },
      {
        name: "Falafel Wrap",
        description:
          "Freshly fried falafel wrapped in warm saj with hummus, tomato, pickles, and a drizzle of tahini. Crunchy, fresh, and satisfying.",
        price: 24,
        aiNotes:
          "VEGAN. Contains GLUTEN (saj bread). The falafel are fried to order, so they're crispy inside the wrap. Paired with hummus and tahini — double the chickpea goodness. Our best-selling vegan option. Affordable and filling at 24 AED.",
        dietaryKeys: ["vegan"],
      },
      {
        name: "Lamb Kofta Wrap",
        description:
          "Charcoal-grilled lamb kofta tucked into warm saj bread with tahini, fresh parsley, onion, and sumac. Smoky, herbaceous, and satisfying.",
        price: 30,
        aiNotes:
          "Contains GLUTEN (saj bread). DAIRY-FREE. The grilled kofta is sliced off the skewer directly into the wrap. The sumac adds a bright, lemony tang. A heartier alternative to the shawarma wrap. Great for guests who love smoky charcoal flavours.",
        dietaryKeys: ["dairy_free"],
      },
    ],
  },
  {
    name: "Mains",
    items: [
      {
        name: "Lamb Ouzi",
        description:
          "Slow-braised pulled lamb shoulder served over fragrant spiced rice with toasted almonds, pine nuts, and a rich cinnamon-scented broth. A traditional Levantine celebration dish.",
        price: 68,
        aiNotes:
          "Contains TREE NUTS (almonds, pine nuts). GLUTEN-FREE, DAIRY-FREE. This is a special-occasion dish in Lebanese culture — traditionally served at weddings and feasts. The lamb is braised for 4+ hours until fork-tender. The rice is cooked in the lamb broth for maximum flavour. Very generous, shareable portion. Our most premium main. Flag almonds and pine nuts for nut allergies.",
        dietaryKeys: ["gluten_free", "dairy_free", "contains_nuts"],
      },
      {
        name: "Chicken Musakhan",
        description:
          "Sumac-spiced roasted chicken thighs served over caramelised onion flatbread with toasted pine nuts and a drizzle of olive oil. A Palestinian-Levantine classic.",
        price: 52,
        aiNotes:
          "Contains GLUTEN (flatbread) and TREE NUTS (pine nuts). DAIRY-FREE. Musakhan is a beloved Palestinian dish — the chicken thighs are roasted with sumac, a tangy berry spice. The onions are caramelised slowly for over an hour. Rich, aromatic, and deeply comforting. Not spicy at all despite the vibrant colour. Flag pine nuts for allergies.",
        dietaryKeys: ["dairy_free", "contains_nuts"],
      },
      {
        name: "Grilled Sea Bass",
        description:
          "Whole Mediterranean sea bass, simply grilled with lemon, olive oil, and fresh herbs. Served with a side of tahini and a fattoush salad.",
        price: 72,
        aiNotes:
          "GLUTEN-FREE (the fish — fattoush contains pita chips with gluten). DAIRY-FREE, NUT-FREE. Whole fish served on the bone — we can fillet on request. Light, healthy, and Mediterranean. The best recommendation for health-conscious guests. The tahini sauce is the traditional Lebanese fish accompaniment, not tartar sauce.",
        dietaryKeys: ["gluten_free", "dairy_free", "nut_free"],
      },
    ],
  },
  {
    name: "Desserts",
    items: [
      {
        name: "Kunafa",
        description:
          "Golden, crispy shredded kataifi pastry filled with stretchy akkawi cheese, soaked in fragrant orange-blossom sugar syrup. Served warm with a scoop of ashta cream.",
        price: 32,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (kataifi pastry) and DAIRY (akkawi cheese, ashta cream). The most iconic Lebanese dessert. Must be served warm — the cheese should still be stretchy. The orange-blossom syrup is fragrant and floral, not overwhelmingly sweet. Ashta cream is a traditional clotted cream. Our best-selling dessert by far.",
        dietaryKeys: ["vegetarian"],
      },
      {
        name: "Baklava Assortment",
        description:
          "A selection of six handmade baklava pieces — pistachio, walnut, and cashew — layered in butter-brushed filo pastry and drenched in honey-rose syrup.",
        price: 28,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (filo pastry), DAIRY (butter), and TREE NUTS (pistachios, walnuts, cashews). Served as 6 pieces — 2 of each variety. Our baklava is baked in-house daily. Very sweet and rich — ideal for sharing. The rose syrup gives it a delicate floral note. Must flag ALL nut types for allergy-sensitive guests.",
        dietaryKeys: ["vegetarian", "contains_nuts"],
      },
      {
        name: "Mhalabiyeh",
        description:
          "A delicate milk pudding set with rose and orange-blossom water, topped with crushed pistachios and a drizzle of rose syrup. Light, floral, and silky.",
        price: 24,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE. Contains DAIRY (milk) and TREE NUTS (pistachios). A lighter dessert option compared to kunafa and baklava. Set with cornstarch, not gelatin, so it's vegetarian-friendly. The floral notes from rose and orange blossom are subtle and elegant. Can be made without pistachios for nut-free on request.",
        dietaryKeys: ["vegetarian", "gluten_free", "contains_nuts"],
      },
    ],
  },
  {
    name: "Beverages",
    items: [
      {
        name: "Fresh Lemonade with Mint",
        description:
          "Freshly squeezed lemon juice blended with sugar syrup, ice, and a generous handful of fresh mint leaves. The Lebanese classic.",
        price: 18,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE. Made fresh to order — not from concentrate. The fresh mint is what makes it distinctly Lebanese. Refreshing and palate-cleansing. Our most ordered drink. Can be made with less sugar on request.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free"],
      },
      {
        name: "Ayran",
        description:
          "A chilled, salted yoghurt drink — tangy, refreshing, and the traditional accompaniment to grilled meats across the Levant.",
        price: 14,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (yoghurt). Ayran is a savoury drink — yoghurt, water, and salt. Not sweet. The traditional pairing with kebabs and shawarma — it cuts through the richness of grilled meats. Very refreshing in hot weather. Some guests are surprised it's savoury, so mention that it's a salted yoghurt drink.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
      {
        name: "Arabic Coffee",
        description:
          "Traditional cardamom-spiced Arabic coffee, brewed slowly in the dallah and served in small cups. Light-bodied, aromatic, and warming.",
        price: 16,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE. Arabic coffee is very different from espresso — it's lighter, aromatic, and spiced with cardamom. Served without milk or sugar traditionally. Small portions — meant to be sipped slowly as part of hospitality. Usually served with dates. Caffeine-containing.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free"],
      },
      {
        name: "Jallab",
        description:
          "A traditional Levantine drink made from grape molasses, rose water, and date syrup, poured over crushed ice and topped with pine nuts and raisins.",
        price: 20,
        aiNotes:
          "VEGAN (if pine nuts are considered acceptable). Contains TREE NUTS (pine nuts on top). GLUTEN-FREE. Jallab is a beloved Ramadan and summer drink across Lebanon and Syria. Sweet, fruity, and aromatic with a deep purple colour. The pine nuts float on top. Can be made without pine nuts for nut-allergic guests. Very unique — recommend to adventurous diners.",
        dietaryKeys: ["vegan", "gluten_free", "contains_nuts"],
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
  console.log("\nCleaning up Levant Grill demo data...\n");

  const existing = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT.slug },
  });

  if (!existing) {
    console.log("No restaurant found with slug 'levant-grill'. Nothing to clean up.");
    return;
  }

  await prisma.restaurant.delete({ where: { id: existing.id } });
  console.log(`  Deleted restaurant: ${existing.name} (${existing.slug})`);

  const user = await prisma.user.findUnique({
    where: { clerkId: "demo_levant_grill_owner" },
    include: { restaurants: true },
  });
  if (user && user.restaurants.length === 0) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  Deleted demo user: ${user.email}`);
  }

  console.log("\nCleanup complete!");
}

async function seed() {
  console.log("Seeding Levant Grill demo restaurant...\n");

  // 1. Upsert demo user
  const user = await prisma.user.upsert({
    where: { clerkId: "demo_levant_grill_owner" },
    update: {},
    create: {
      clerkId: "demo_levant_grill_owner",
      email: "demo-levant@mydscvr.ai",
      fullName: "Demo Owner (Levant Grill)",
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
  console.log(`\n  To clean up: npx tsx src/scripts/seed-demo-levant-grill.ts --cleanup`);
  console.log("  Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
