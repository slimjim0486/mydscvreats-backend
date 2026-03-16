/**
 * Seed script: Creates a complete Portfolio/Operator test scenario.
 *
 * Usage:
 *   1. Sign up with a test email (e.g. youremail+operator@gmail.com) in the app
 *   2. Copy the Clerk user ID from the Clerk dashboard
 *   3. Run:  npx tsx prisma/seed-operator-test.ts <clerkUserId>
 *
 * What it creates:
 *   - OperatorAccount (status: trial, 30-day window)
 *   - 4 restaurant brands with sample menus (activates portfolio at 3+)
 *   - Each brand gets 2-3 menu sections with 4-6 items each
 *   - Varied cuisine types for realistic cross-brand testing
 *
 * To tear down:  npx tsx prisma/seed-operator-test.ts <clerkUserId> --cleanup
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ── Brand definitions ──────────────────────────────────────────────

const BRANDS = [
  {
    name: "Saffron Cloud Kitchen",
    slug: "saffron-cloud-kitchen-test",
    cuisineType: "Indian",
    description: "Authentic North Indian cuisine, delivered fresh from our cloud kitchen.",
    sections: [
      {
        name: "Starters",
        items: [
          { name: "Samosa (2 pcs)", price: 12, description: "Crispy pastry filled with spiced potatoes and peas" },
          { name: "Paneer Tikka", price: 28, description: "Char-grilled cottage cheese marinated in yogurt and spices" },
          { name: "Chicken Malai Tikka", price: 32, description: "Creamy chicken skewers with mild spices" },
          { name: "Onion Bhaji", price: 14, description: "Crispy onion fritters with cumin and coriander" },
        ],
      },
      {
        name: "Mains",
        items: [
          { name: "Butter Chicken", price: 45, description: "Tender chicken in a rich tomato-cream sauce" },
          { name: "Dal Makhani", price: 32, description: "Slow-cooked black lentils with butter and cream" },
          { name: "Lamb Biryani", price: 52, description: "Fragrant basmati rice layered with spiced lamb" },
          { name: "Palak Paneer", price: 35, description: "Cottage cheese in a velvety spinach gravy" },
          { name: "Chicken Tikka Masala", price: 42, description: "Grilled chicken in a spiced tomato-onion sauce" },
        ],
      },
      {
        name: "Breads & Rice",
        items: [
          { name: "Garlic Naan", price: 8, description: "Soft bread with garlic and butter" },
          { name: "Steamed Basmati Rice", price: 10, description: "Fluffy long-grain basmati rice" },
          { name: "Cheese Naan", price: 12, description: "Naan stuffed with melted cheese" },
          { name: "Jeera Rice", price: 12, description: "Basmati rice tempered with cumin seeds" },
        ],
      },
    ],
  },
  {
    name: "Bao & Bowl",
    slug: "bao-and-bowl-test",
    cuisineType: "Asian Fusion",
    description: "Modern Asian street food — bao buns, rice bowls, and more.",
    sections: [
      {
        name: "Bao Buns",
        items: [
          { name: "Pork Belly Bao", price: 22, description: "Braised pork belly with pickled cucumber and hoisin" },
          { name: "Crispy Chicken Bao", price: 20, description: "Fried chicken with sriracha mayo and slaw" },
          { name: "Tofu Bao", price: 18, description: "Teriyaki-glazed tofu with avocado and sesame" },
          { name: "Beef Bao", price: 24, description: "Slow-cooked beef brisket with kimchi" },
        ],
      },
      {
        name: "Rice Bowls",
        items: [
          { name: "Teriyaki Salmon Bowl", price: 42, description: "Grilled salmon on sushi rice with edamame and pickled ginger" },
          { name: "Korean BBQ Beef Bowl", price: 38, description: "Marinated bulgogi on steamed rice with banchan" },
          { name: "Kung Pao Chicken Bowl", price: 34, description: "Spicy chicken with peanuts, peppers, on jasmine rice" },
          { name: "Veggie Buddha Bowl", price: 30, description: "Quinoa, roasted veggies, avocado, tahini dressing" },
          { name: "Katsu Curry Bowl", price: 36, description: "Panko-crusted chicken with Japanese curry and rice" },
        ],
      },
    ],
  },
  {
    name: "Levant Grill",
    slug: "levant-grill-test",
    cuisineType: "Lebanese",
    description: "Traditional Lebanese grills and mezze, made with love.",
    sections: [
      {
        name: "Mezze",
        items: [
          { name: "Hummus", price: 16, description: "Classic chickpea dip with tahini and olive oil" },
          { name: "Fattoush Salad", price: 18, description: "Crispy pita salad with sumac dressing" },
          { name: "Baba Ganoush", price: 18, description: "Smoky roasted eggplant dip" },
          { name: "Falafel (6 pcs)", price: 20, description: "Crispy chickpea fritters with tahini sauce" },
          { name: "Labneh", price: 14, description: "Strained yogurt with olive oil and za'atar" },
        ],
      },
      {
        name: "Grills",
        items: [
          { name: "Mixed Grill Platter", price: 65, description: "Lamb kofta, shish tawook, and lamb chops with rice" },
          { name: "Shish Tawook", price: 42, description: "Charcoal-grilled marinated chicken skewers" },
          { name: "Lamb Kofta", price: 45, description: "Spiced minced lamb skewers, grilled over charcoal" },
          { name: "Grilled Halloumi", price: 28, description: "Golden halloumi cheese with mint and lemon" },
        ],
      },
      {
        name: "Wraps",
        items: [
          { name: "Shawarma Wrap", price: 25, description: "Thinly sliced marinated chicken in fresh saj bread" },
          { name: "Falafel Wrap", price: 20, description: "Falafel with pickles, tahini, and fresh veggies" },
          { name: "Kofta Wrap", price: 28, description: "Lamb kofta with garlic sauce and tomatoes" },
        ],
      },
    ],
  },
  {
    name: "Sweet Spot Desserts",
    slug: "sweet-spot-desserts-test",
    cuisineType: "Desserts & Bakery",
    description: "Artisanal desserts and baked goods for every craving.",
    sections: [
      {
        name: "Cakes & Pastries",
        items: [
          { name: "Basque Cheesecake (slice)", price: 28, description: "Burnt-top creamy cheesecake, San Sebastian style" },
          { name: "Pistachio Kunafa", price: 32, description: "Crispy vermicelli with sweet cheese and pistachio" },
          { name: "Lotus Biscoff Cake (slice)", price: 26, description: "Caramelised biscuit sponge with Biscoff cream" },
          { name: "Chocolate Lava Cake", price: 30, description: "Warm chocolate fondant with a molten centre" },
        ],
      },
      {
        name: "Ice Cream & Frozen",
        items: [
          { name: "Pistachio Gelato", price: 18, description: "Authentic Italian-style pistachio gelato" },
          { name: "Mango Sorbet", price: 16, description: "Refreshing Alphonso mango sorbet, dairy-free" },
          { name: "Salted Caramel Sundae", price: 24, description: "Vanilla ice cream, salted caramel, candied pecans" },
          { name: "Acai Bowl", price: 28, description: "Frozen acai blended with banana, topped with granola and berries" },
        ],
      },
    ],
  },
];

// ── Main logic ─────────────────────────────────────────────────────

async function main() {
  const clerkId = process.argv[2];
  const isCleanup = process.argv.includes("--cleanup");

  if (!clerkId) {
    console.error(
      "Usage:\n" +
        "  npx tsx prisma/seed-operator-test.ts <clerkUserId>\n" +
        "  npx tsx prisma/seed-operator-test.ts <clerkUserId> --cleanup"
    );
    process.exit(1);
  }

  // Find the user
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    console.error(`No user found with clerkId "${clerkId}". Make sure you've signed in at least once.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  if (isCleanup) {
    await cleanup(user.id);
    return;
  }

  await seed(user.id);
}

async function cleanup(userId: string) {
  console.log("\n🧹 Cleaning up operator test data...\n");

  // Find operator account
  const operator = await prisma.operatorAccount.findUnique({
    where: { ownerId: userId },
    include: { brands: true },
  });

  if (!operator) {
    console.log("No operator account found for this user. Nothing to clean up.");
    return;
  }

  // Delete test brands (identified by -test slug suffix)
  const testBrands = operator.brands.filter((b) => b.slug.endsWith("-test"));
  for (const brand of testBrands) {
    // Cascade deletes menu sections, items, etc.
    await prisma.restaurant.delete({ where: { id: brand.id } });
    console.log(`  Deleted brand: ${brand.name} (${brand.slug})`);
  }

  // Delete operator account
  await prisma.operatorAccount.delete({ where: { id: operator.id } });
  console.log(`  Deleted operator account: ${operator.name}`);

  console.log("\nCleanup complete!");
}

async function seed(userId: string) {
  console.log("\nSeeding operator/portfolio test data...\n");

  // Check for existing operator account
  const existing = await prisma.operatorAccount.findUnique({
    where: { ownerId: userId },
  });
  if (existing) {
    console.error(
      "This user already has an operator account. Run with --cleanup first:\n" +
        `  npx tsx prisma/seed-operator-test.ts ${process.argv[2]} --cleanup`
    );
    process.exit(1);
  }

  // Create OperatorAccount (trial status, 30-day window)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  const operator = await prisma.operatorAccount.create({
    data: {
      name: "Test Cloud Kitchen Group",
      ownerId: userId,
      status: "trial",
      brandLimit: 10,
      currentPeriodEnd: trialEnd,
    },
  });
  console.log(`Created operator account: ${operator.name} (trial until ${trialEnd.toLocaleDateString()})`);

  // Create brands with menus
  for (const brandDef of BRANDS) {
    // Check slug uniqueness (add random suffix if taken)
    let slug = brandDef.slug;
    const slugExists = await prisma.restaurant.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: brandDef.name,
        slug,
        description: brandDef.description,
        cuisineType: brandDef.cuisineType,
        location: "Dubai, UAE",
        isPublished: true,
        subscriptionStatus: "trial",
        trialEndsAt: trialEnd,
        ownerId: userId,
        operatorAccountId: operator.id,
      },
    });

    console.log(`  Created brand: ${restaurant.name} (${slug})`);

    // Create sections and items
    for (let si = 0; si < brandDef.sections.length; si++) {
      const sectionDef = brandDef.sections[si];
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
      console.log(`    Section "${sectionDef.name}" — ${itemData.length} items`);
    }
  }

  // Summary
  console.log("\n--- Summary ---");
  console.log(`Operator account: ${operator.name} (${operator.id})`);
  console.log(`Status: trial (until ${trialEnd.toLocaleDateString()})`);
  console.log(`Brands created: ${BRANDS.length}`);
  console.log(`Activation state: ACTIVE (${BRANDS.length} >= 3 brands)`);
  console.log("\nYou can now log in with your test account and explore:");
  console.log("  - /dashboard/portfolio        → Portfolio overview");
  console.log("  - /dashboard/portfolio/analytics → Cross-brand analytics");
  console.log("  - Brand switcher in sidebar");
  console.log("  - Menu cloning between brands");
  console.log("  - QR code generation");
  console.log(`\nTo clean up later:\n  npx tsx prisma/seed-operator-test.ts ${process.argv[2]} --cleanup`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
