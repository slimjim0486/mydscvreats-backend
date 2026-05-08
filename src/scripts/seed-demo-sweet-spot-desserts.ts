/**
 * Seed "Sweet Spot Desserts" as a fully working demo restaurant.
 *
 * Usage:  npx tsx src/scripts/seed-demo-sweet-spot-desserts.ts
 * Cleanup: npx tsx src/scripts/seed-demo-sweet-spot-desserts.ts --cleanup
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT = {
  slug: "sweet-spot-desserts",
  name: "Sweet Spot Desserts",
  description:
    "Where artistry meets indulgence. Sweet Spot Desserts is a boutique dessert kitchen crafting exquisite pastries, show-stopping cakes, and modern Middle Eastern-inspired sweets from our kitchen in the heart of Dubai. Every macaron is hand-piped, every cheesecake is slow-baked, and every croissant is laminated with 72 layers of real French butter. We blend classic French patisserie technique with local flavours — think pistachio kunafa cheesecake, saffron crème brûlée, and cardamom-spiced cookies. Whether you're celebrating a milestone with a custom cake, treating yourself to a box of handmade truffles, or simply craving a perfectly flaky pain au chocolat, Sweet Spot is your go-to for desserts that look as beautiful as they taste.",
  cuisineType: "Desserts & Bakery",
  themeKey: "saffron" as const,
  location: "Dubai, UAE",
  address: "City Walk, Al Safa Street, Dubai, UAE",
  phone: "+971 4 555 0321",
  logoUrl: "https://images.getbustan.com/demo-restaurants/sweet-spot-desserts/logo.jpg",
  coverImageUrl: "https://images.getbustan.com/demo-restaurants/sweet-spot-desserts/cover.jpg",
  operatingHours: {
    timezone: "Asia/Dubai",
    schedule: [
      { dayOfWeek: 0, isClosed: false, periods: [{ open: "09:00", close: "23:00" }] },
      { dayOfWeek: 1, isClosed: false, periods: [{ open: "09:00", close: "23:00" }] },
      { dayOfWeek: 2, isClosed: false, periods: [{ open: "09:00", close: "23:00" }] },
      { dayOfWeek: 3, isClosed: false, periods: [{ open: "09:00", close: "23:00" }] },
      { dayOfWeek: 4, isClosed: false, periods: [{ open: "09:00", close: "00:00" }] },
      { dayOfWeek: 5, isClosed: false, periods: [{ open: "09:00", close: "00:00" }] },
      { dayOfWeek: 6, isClosed: false, periods: [{ open: "09:00", close: "23:00" }] },
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
    name: "Signature Cakes",
    items: [
      {
        name: "Pistachio Kunafa Cheesecake",
        description:
          "Our best-seller — a dreamy fusion of creamy New York-style cheesecake layered with crunchy golden kunafa pastry, drizzled with rose-scented syrup, and crowned with crushed Antep pistachios.",
        price: 42,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (kunafa pastry), DAIRY (cream cheese, cream), EGGS, and TREE NUTS (pistachios). Our #1 best-seller and most Instagrammed item. The kunafa is a crispy layer, not soft — adds a unique textural contrast to the creamy cheesecake. Single slice serving. The rose syrup is subtle, not overpowering. Flag pistachios for nut allergies. This is the dish that put Sweet Spot on the map.",
        dietaryKeys: ["vegetarian", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Belgian Chocolate Fondant",
        description:
          "A rich, dark chocolate cake with a perfectly molten centre that flows like lava when you break through the crust. Served warm with vanilla bean ice cream and a dusting of cocoa.",
        price: 38,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE (uses almond flour). Contains DAIRY (butter, chocolate, ice cream), EGGS, and TREE NUTS (almond flour). Must be served warm — the molten centre is the hero. Made with 70% Belgian Callebaut chocolate. Baked to order, so allow 12-15 minutes. The ice cream is included. Our most indulgent dessert. Perfect for chocolate lovers.",
        dietaryKeys: ["vegetarian", "gluten_free", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Red Velvet Cake",
        description:
          "A tall, dramatic slice of moist red velvet sponge layered with tangy cream cheese frosting. Classic, elegant, and irresistibly good.",
        price: 36,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (cream cheese, butter), and EGGS. A classic American-style red velvet — the cream cheese frosting is tangy, not too sweet. The cake is naturally coloured with beetroot powder, not artificial dyes. Three-layer slice. One of our most popular cakes for custom orders too. Pairs beautifully with coffee.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
      {
        name: "Lotus Biscoff Cheesecake",
        description:
          "Smooth, creamy cheesecake infused with crushed Lotus Biscoff cookies on a buttery Biscoff biscuit base, topped with a caramelised cookie butter drizzle and cookie crumble.",
        price: 38,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (Biscoff cookies), DAIRY (cream cheese), EGGS, and SOY (Biscoff contains soy). The Biscoff flavour runs through every layer — base, filling, and topping. Very rich and sweet. Extremely popular with younger customers and on social media. If a guest loves caramel or cookie butter flavours, this is the one.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
      {
        name: "Mango Passion Fruit Mousse",
        description:
          "A light, tropical mousse cake with layers of mango-passion fruit curd, coconut dacquoise, and a mirror-smooth tropical glaze. Bright, fruity, and refreshing.",
        price: 40,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE. Contains DAIRY (cream), EGGS, and COCONUT (dacquoise base). Our lightest cake option — perfect for guests who find chocolate or cheese-based desserts too heavy. The tropical flavours are bright and refreshing. Beautiful presentation with the mirror glaze. Great summer dessert. Flag coconut for tree nut allergies.",
        dietaryKeys: ["vegetarian", "gluten_free", "contains_eggs"],
      },
    ],
  },
  {
    name: "Pastries",
    items: [
      {
        name: "Classic Butter Croissant",
        description:
          "A perfectly laminated croissant with 72 layers of French butter, baked until deeply golden with a shatteringly flaky exterior and a soft, honeycomb interior.",
        price: 18,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (French butter), and EGGS. Our croissants are laminated in-house over 3 days using premium French Isigny butter. The 72 layers create that signature flaky, airy texture. Baked fresh throughout the day. Best enjoyed warm — ask if the latest batch is ready. NUT-FREE. Our most popular breakfast item.",
        dietaryKeys: ["vegetarian", "contains_eggs", "nut_free"],
      },
      {
        name: "Pain au Chocolat",
        description:
          "Flaky, buttery croissant pastry wrapped around two batons of rich dark chocolate. Golden, warm, and utterly irresistible.",
        price: 20,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter, chocolate), and EGGS. Same laminated dough as our croissant. We use 55% dark chocolate batons — rich but not too bitter. Best served warm so the chocolate is slightly melted. A breakfast or afternoon treat classic. Very popular with kids.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
      {
        name: "Pistachio Croissant",
        description:
          "Our butter croissant filled with a luxurious pistachio frangipane cream and topped with crushed pistachios and a light sugar glaze.",
        price: 24,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter), EGGS, and TREE NUTS (pistachios). The pistachio frangipane is made in-house with real Sicilian pistachios — no artificial flavouring or colouring. Filled after baking so the cream stays fresh. Topped with whole crushed pistachios. Our most premium croissant. Viral on social media. Flag nuts.",
        dietaryKeys: ["vegetarian", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Almond Croissant",
        description:
          "A twice-baked croissant filled with almond frangipane, topped with sliced almonds and a dusting of icing sugar. Rich, nutty, and caramelised.",
        price: 22,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter), EGGS, and TREE NUTS (almonds). Twice-baked means extra crispy and caramelised on the outside. The almond frangipane is sweet, nutty, and moist. A classic French bakery item. Slightly sweeter and richer than the plain croissant — more of a dessert than a breakfast pastry. Flag almonds.",
        dietaryKeys: ["vegetarian", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Danish Pastry",
        description:
          "A swirl of flaky laminated pastry filled with vanilla custard and fresh seasonal berries, finished with an apricot glaze.",
        price: 20,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter, custard), and EGGS. The custard is vanilla bean — not artificial. Seasonal berries change throughout the year (strawberries, blueberries, raspberries). NUT-FREE. A lighter pastry option. Beautiful presentation. The apricot glaze adds a subtle sweetness and shine.",
        dietaryKeys: ["vegetarian", "contains_eggs", "nut_free"],
      },
    ],
  },
  {
    name: "Individual Desserts",
    items: [
      {
        name: "Saffron Crème Brûlée",
        description:
          "A silky vanilla custard infused with premium Iranian saffron, topped with a crackling caramelised sugar crust. A luxurious Middle Eastern twist on the French classic.",
        price: 32,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (cream, milk) and EGGS. The saffron gives the custard a beautiful golden colour and a subtle floral, honeyed flavour. We use premium Negin saffron threads. The sugar crust is torched to order for the perfect crack. One of our most elegant desserts. A wonderful bridge between French and Middle Eastern flavours.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free", "contains_eggs"],
      },
      {
        name: "Tiramisu",
        description:
          "Layers of espresso-soaked Savoiardi biscuits and light mascarpone cream, dusted with Valrhona cocoa. Classic Italian indulgence, made fresh daily.",
        price: 34,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (Savoiardi biscuits), DAIRY (mascarpone), EGGS, and CAFFEINE. Made fresh every morning — we don't serve it the same day it's made, it rests overnight for the best flavour. Contains a splash of Marsala wine (alcohol). The mascarpone is imported from Italy. NUT-FREE. Rich but not heavy — surprisingly light texture.",
        dietaryKeys: ["vegetarian", "contains_eggs", "nut_free"],
      },
      {
        name: "Rose & Raspberry Panna Cotta",
        description:
          "A trembling-set vanilla panna cotta delicately scented with rose water, topped with a vibrant raspberry compote and dried rose petals. Floral, fruity, and ethereal.",
        price: 28,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (cream) and GELATIN (not suitable for strict vegetarians). The rose water is subtle — just a whisper, not overpowering. The raspberry compote adds brightness and acidity to balance the cream. Beautiful presentation with the dried rose petals. Our lightest dessert — perfect after a heavy meal.",
        dietaryKeys: ["gluten_free", "nut_free"],
      },
      {
        name: "Tahini Chocolate Brownie",
        description:
          "A fudgy, intensely chocolatey brownie swirled with nutty tahini, sprinkled with flaky sea salt and toasted sesame seeds. Rich, salty-sweet, and utterly addictive.",
        price: 26,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter, chocolate), EGGS, and SESAME (tahini, sesame seeds). The tahini swirl adds a nutty, savoury complexity that elevates this beyond a regular brownie. Made with 65% dark chocolate. The sea salt on top is key — enhances both the chocolate and tahini. Served at room temperature for maximum fudginess. NUT-FREE (tahini is from sesame, not tree nuts — but flag sesame).",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
    ],
  },
  {
    name: "Cookies & Bites",
    items: [
      {
        name: "Brown Butter Chocolate Chip Cookie",
        description:
          "A thick, chewy cookie made with nutty brown butter, dark chocolate chunks, and a sprinkle of Maldon sea salt. Crispy edges, gooey centre.",
        price: 16,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (brown butter), and EGGS. The brown butter gives it a nutty, toffee-like depth that regular butter can't achieve. We use chunked chocolate, not chips — bigger, more satisfying pockets of melted chocolate. The sea salt on top is the finishing touch. Best warm. NUT-FREE. Our most popular cookie. Baked in small batches throughout the day.",
        dietaryKeys: ["vegetarian", "contains_eggs", "nut_free"],
      },
      {
        name: "Pistachio & White Chocolate Cookie",
        description:
          "A soft, chewy cookie studded with roasted pistachios and chunks of creamy white chocolate. Buttery, nutty, and melt-in-your-mouth.",
        price: 18,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter, white chocolate), EGGS, and TREE NUTS (pistachios). The pistachio-white chocolate combination is very popular in Dubai — a local favourite. We use whole roasted pistachios for crunch and texture. Rich, buttery, and indulgent. Our second best-selling cookie. Flag pistachios for nut allergies.",
        dietaryKeys: ["vegetarian", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Salted Caramel Stuffed Cookie",
        description:
          "A thick chocolate cookie with a molten salted caramel centre that oozes when you break it open. Decadent, gooey, and unforgettable.",
        price: 20,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN, DAIRY (butter, caramel), and EGGS. The caramel centre is liquid when warm — this is a messy, indulgent experience. Must be eaten fresh for the full ooze effect. NUT-FREE. Very popular on social media for the caramel reveal videos. Our most viral cookie. Best served warm — we can heat it on request.",
        dietaryKeys: ["vegetarian", "contains_eggs", "nut_free"],
      },
      {
        name: "French Macaron Box (6 pcs)",
        description:
          "A curated selection of six handmade French macarons: pistachio, rose, salted caramel, chocolate, vanilla, and passion fruit. Delicate, colourful, and exquisite.",
        price: 48,
        aiNotes:
          "GLUTEN-FREE (almond flour-based). Contains EGGS, DAIRY (buttercream/ganache fillings), and TREE NUTS (almonds in the shell, pistachios in pistachio macaron). Our macarons are made in-house with Italian meringue method — smooth tops, ruffled feet, and a delicate crunch that gives way to a chewy centre. Presented in a beautiful box — popular as gifts. Each macaron is individually hand-piped and filled. Flag multiple allergens.",
        dietaryKeys: ["gluten_free", "contains_nuts", "contains_eggs"],
      },
    ],
  },
  {
    name: "Ice Cream & Frozen",
    items: [
      {
        name: "Ashta Ice Cream with Kunafa Crumble",
        description:
          "Creamy Middle Eastern ashta (clotted cream) ice cream topped with crispy kunafa crumble, a drizzle of rose syrup, and crushed pistachios.",
        price: 28,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE (the ice cream — kunafa crumble contains gluten). Contains DAIRY (cream), EGGS, and TREE NUTS (pistachios). Ashta is a traditional Middle Eastern clotted cream — rich, floral, and uniquely Levantine. The kunafa crumble adds crunch. The rose syrup ties it all together. Very popular. A perfect fusion of local and Western dessert traditions. Flag pistachios and gluten (crumble).",
        dietaryKeys: ["vegetarian", "contains_nuts", "contains_eggs"],
      },
      {
        name: "Mango Sorbet",
        description:
          "A refreshing, dairy-free sorbet made with Alphonso mangoes — vibrant, tropical, and intensely fruity. Served in a chilled glass with fresh mint.",
        price: 22,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE, DAIRY-FREE. Made with real Alphonso mango pulp — no artificial flavours. Our only fully vegan frozen dessert. Light and refreshing — the best palate cleanser or a guilt-free treat. Great recommendation for dairy-free or vegan guests. The fresh mint adds a lovely aromatic finish.",
        dietaryKeys: ["vegan", "gluten_free", "nut_free", "dairy_free"],
      },
      {
        name: "Affogato",
        description:
          "A scoop of rich vanilla bean gelato drowned in a fresh shot of hot espresso. Simple, elegant, and the perfect balance of bitter and sweet.",
        price: 24,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (gelato) and CAFFEINE. Half dessert, half coffee — great for guests who want something light and sophisticated. The espresso is pulled fresh. Best enjoyed immediately — the contrast of hot and cold is the experience. Can be upgraded with a pistachio gelato for an extra 4 AED.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
    ],
  },
  {
    name: "Hot Drinks",
    items: [
      {
        name: "Spanish Latte",
        description:
          "A double espresso sweetened with condensed milk and topped with steamed milk. Rich, creamy, and caramel-sweet — Dubai's favourite coffee drink.",
        price: 22,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (milk, condensed milk) and CAFFEINE. The Spanish Latte is hugely popular in Dubai — it's sweeter than a regular latte due to the condensed milk. Great for guests who like their coffee sweet. Can be made with oat milk for the steamed portion (condensed milk remains). Our best-selling hot drink.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
      {
        name: "Matcha Latte",
        description:
          "Premium Japanese ceremonial-grade matcha whisked with steamed milk. Earthy, smooth, and vibrant green. Available hot or iced.",
        price: 24,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (milk) and CAFFEINE. We use ceremonial-grade Uji matcha — bright green, smooth, not bitter. Can be made with oat, almond, or coconut milk for dairy-free. Available hot or iced at the same price. Slightly sweetened by default — can be made unsweetened on request. Popular with health-conscious guests.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
      {
        name: "Hot Chocolate",
        description:
          "A luxurious hot chocolate made with real melted dark chocolate, steamed milk, and topped with a cloud of whipped cream and chocolate shavings.",
        price: 22,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, NUT-FREE. Contains DAIRY (milk, cream, chocolate). Made with real melted chocolate, not cocoa powder — much richer and creamier. The whipped cream is house-made. Kids and adults love it equally. Can be made with oat milk. Available only hot. Our best non-coffee drink.",
        dietaryKeys: ["vegetarian", "gluten_free", "nut_free"],
      },
      {
        name: "Turkish Coffee",
        description:
          "Finely ground Arabic coffee brewed slowly in a traditional cezve with cardamom. Served in a traditional cup with a piece of Turkish delight.",
        price: 18,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE (the coffee itself — the Turkish delight may contain pistachios, ask). Contains CAFFEINE. Brewed in the traditional copper cezve. Served with grounds — let it settle before sipping. The cardamom is freshly ground. Comes with a piece of Turkish delight (rose or pistachio, varies daily). A beautiful ritual. Not for guests who dislike strong coffee.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
    ],
  },
  {
    name: "Cold Drinks",
    items: [
      {
        name: "Iced Pistachio Latte",
        description:
          "A double espresso poured over ice and blended with house-made pistachio milk and a touch of vanilla. Creamy, nutty, and vibrant green.",
        price: 26,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE. Contains DAIRY (milk) and TREE NUTS (pistachios) and CAFFEINE. Our signature cold drink. The pistachio milk is made in-house — real pistachios, not flavoured syrup. Beautiful green colour for photos. Popular on Instagram. Slightly sweet. Our most premium iced drink. Flag pistachios for nut allergies.",
        dietaryKeys: ["vegetarian", "gluten_free", "contains_nuts"],
      },
      {
        name: "Fresh Strawberry Lemonade",
        description:
          "Freshly squeezed lemon juice blended with ripe strawberries, a touch of sugar, and sparkling water. Bright, refreshing, and naturally pink.",
        price: 20,
        aiNotes:
          "VEGAN, GLUTEN-FREE, NUT-FREE, DAIRY-FREE. Made with fresh strawberries and lemons — no concentrates or artificial flavours. The sparkling water adds a pleasant fizz. Our most refreshing drink. Great with desserts — the acidity cuts through sweetness. Available year-round. Can be made still instead of sparkling.",
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
  console.log("\nCleaning up Sweet Spot Desserts demo data...\n");

  const existing = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT.slug },
  });

  if (!existing) {
    console.log("No restaurant found with slug 'sweet-spot-desserts'. Nothing to clean up.");
    return;
  }

  await prisma.restaurant.delete({ where: { id: existing.id } });
  console.log(`  Deleted restaurant: ${existing.name} (${existing.slug})`);

  const user = await prisma.user.findUnique({
    where: { clerkId: "demo_sweet_spot_owner" },
    include: { restaurants: true },
  });
  if (user && user.restaurants.length === 0) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  Deleted demo user: ${user.email}`);
  }

  console.log("\nCleanup complete!");
}

async function seed() {
  console.log("Seeding Sweet Spot Desserts demo restaurant...\n");

  // 1. Upsert demo user
  const user = await prisma.user.upsert({
    where: { clerkId: "demo_sweet_spot_owner" },
    update: {},
    create: {
      clerkId: "demo_sweet_spot_owner",
      email: "demo-sweetspot@getbustan.com",
      fullName: "Demo Owner (Sweet Spot)",
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
  console.log(`\n  Live at: https://getbustan.com/${restaurant.slug}`);
  console.log(`\n  To clean up: npx tsx src/scripts/seed-demo-sweet-spot-desserts.ts --cleanup`);
  console.log("  Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
