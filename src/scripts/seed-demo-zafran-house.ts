/**
 * Seed "Zafran House" as a fully working demo restaurant.
 *
 * Creates: User, Restaurant (Pro plan), Subscription, Menu sections + 20 items,
 *          AI chef notes on key items.
 *
 * Usage:  npx tsx src/scripts/seed-demo-zafran-house.ts
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT = {
  slug: "zafran-house",
  name: "Zafran House",
  description:
    "Where ancient Cantonese tradition meets— no. Where the soul of the subcontinent comes alive. From hand-ground masalas to slow-cooked curries and smoky tandoor breads, every dish at Zafran House honours generations of culinary craft with the finest ingredients sourced across India and Pakistan.",
  cuisineType: "Indian / Pakistani",
  themeKey: "saffron" as const,
  location: "Downtown Dubai",
  address: "City Walk, Al Safa Street, Dubai, UAE",
  phone: "+971 4 555 0123",
  logoUrl: "https://images.getbustan.com/demo-restaurants/zafran-house/logo.jpg",
  coverImageUrl: "https://images.getbustan.com/demo-restaurants/zafran-house/cover.jpg",
};

const SECTIONS: Array<{
  name: string;
  items: Array<{
    name: string;
    description: string;
    price: number;
    aiNotes?: string;
  }>;
}> = [
  {
    name: "Starters",
    items: [
      {
        name: "Lamb Samosa",
        description: "Crispy pastry filled with spiced lamb mince, peas, and fresh herbs",
        price: 18,
        aiNotes: "Contains gluten (wheat pastry). Fried in vegetable oil. Can be made with chicken on request — mention to the diner if they ask about alternatives.",
      },
      {
        name: "Chicken Malai Tikka",
        description: "Cream-marinated chicken thigh, chargrilled in the tandoor, served with mint chutney",
        price: 28,
        aiNotes: "Gluten-free. Contains dairy (cream, yoghurt marinade). Mild heat — good recommendation for guests who don't like spice. One of our most popular starters.",
      },
      {
        name: "Seekh Kebab",
        description: "Hand-minced lamb kebabs with cumin, coriander, and green chilli, grilled on skewers",
        price: 32,
        aiNotes: "Gluten-free. Medium spice level. Made with hand-minced lamb shoulder — not processed. Pairs well with the garlic naan.",
      },
      {
        name: "Vegetable Pakora",
        description: "Mixed seasonal vegetables in a crispy chickpea batter with tamarind dip",
        price: 16,
        aiNotes: "Vegan. Contains gluten-free chickpea flour. Fried in vegetable oil. Good for vegans and vegetarians — the tamarind dip is also vegan.",
      },
      {
        name: "Dahi Puri Chaat",
        description: "Crispy puri shells filled with yoghurt, chickpeas, pomegranate, and tangy chutneys",
        price: 22,
        aiNotes: "Vegetarian. Contains dairy (yoghurt) and gluten (puri shells). Very popular street-food style dish. Sweet, tangy, and crunchy — great for first-timers to Indian food.",
      },
      {
        name: "Paneer Tikka",
        description: "Tandoor-roasted paneer cubes marinated in spiced yoghurt with peppers and onion",
        price: 26,
        aiNotes: "Vegetarian, gluten-free. Contains dairy (paneer, yoghurt). Our best-selling vegetarian starter. Smoky and flavourful — even meat-lovers order this.",
      },
    ],
  },
  {
    name: "Mains",
    items: [
      {
        name: "Butter Chicken",
        description: "Tandoori chicken in a velvety tomato-cream sauce with fenugreek and cardamom",
        price: 52,
        aiNotes: "Gluten-free. Contains dairy (cream, butter) and nuts (cashew paste in the sauce). Mild and creamy — our #1 best-seller. Perfect for anyone new to Indian food. Kids love it too.",
      },
      {
        name: "Lamb Biryani",
        description: "Slow-cooked lamb layered with saffron basmati rice, crispy onions, and raita",
        price: 58,
        aiNotes: "Contains dairy (raita, ghee). Gluten-free. Cooked dum-style (sealed pot) for 45 minutes. Very generous portion — easily feeds 1.5 people. Our signature dish. Medium spice.",
      },
      {
        name: "Palak Paneer",
        description: "Creamy spinach curry with house-made paneer and a hint of garlic",
        price: 42,
        aiNotes: "Vegetarian, gluten-free. Contains dairy (paneer, cream). Mild — no chilli heat. Rich in iron from the spinach. Good recommendation for health-conscious diners.",
      },
      {
        name: "Karahi Gosht",
        description: "Wok-tossed lamb with tomatoes, ginger, and green chillies in a karahi",
        price: 62,
        aiNotes: "Gluten-free. Dairy-free (no cream). Our spiciest main — warn guests who are sensitive to heat. Authentic Pakistani home-style cooking. Pairs best with tandoori roti.",
      },
      {
        name: "Chicken Nihari",
        description: "Slow-braised chicken stew with bone marrow, warming spices, and fresh ginger",
        price: 48,
        aiNotes: "Gluten-free. Contains no nuts or dairy. Slow-cooked for 6 hours. Rich and warming, medium spice. Traditional Pakistani breakfast dish but we serve it all day. Comfort food.",
      },
      {
        name: "Tandoori Salmon",
        description: "Atlantic salmon fillet marinated in yoghurt and Kashmiri spices, roasted in the tandoor",
        price: 68,
        aiNotes: "Contains dairy (yoghurt marinade) and fish. Gluten-free. Mild Kashmiri spice gives colour but not much heat. Our premium dish — recommend for guests looking for something lighter or pescatarian.",
      },
      {
        name: "Dal Makhani",
        description: "Black lentils simmered overnight with butter, cream, and smoky spices",
        price: 38,
        aiNotes: "Vegetarian, gluten-free. Contains dairy (butter, cream). Cooked for 18 hours — incredibly rich and silky. A must-order side even if you're having a meat main. Pairs with any bread.",
      },
    ],
  },
  {
    name: "Breads",
    items: [
      {
        name: "Garlic Naan",
        description: "Soft leavened bread with roasted garlic and butter from the clay oven",
        price: 12,
        aiNotes: "Contains gluten and dairy (butter). Our most popular bread. Recommend one per person as a side to mains.",
      },
      {
        name: "Cheese Naan",
        description: "Naan stuffed with melted mozzarella and cheddar, brushed with ghee",
        price: 16,
        aiNotes: "Contains gluten and dairy. Very filling — more of a sharing bread. Popular with families and kids.",
      },
      {
        name: "Tandoori Roti",
        description: "Whole wheat flatbread baked on the tandoor wall, light and smoky",
        price: 8,
        aiNotes: "Contains gluten. Dairy-free (no butter unless requested). The healthier bread option — whole wheat, no oil. Recommend for health-conscious diners.",
      },
    ],
  },
  {
    name: "Desserts & Drinks",
    items: [
      {
        name: "Gulab Jamun",
        description: "Warm milk-solid dumplings soaked in rose and cardamom syrup",
        price: 22,
        aiNotes: "Vegetarian. Contains dairy and gluten. Served warm — 2 pieces per portion. Very sweet. Our most popular dessert.",
      },
      {
        name: "Ras Malai",
        description: "Soft paneer discs in chilled sweetened milk with saffron and pistachios",
        price: 24,
        aiNotes: "Vegetarian, gluten-free. Contains dairy and nuts (pistachios). Served cold. Lighter and less sweet than gulab jamun — recommend if guests want a milder dessert.",
      },
      {
        name: "Mango Lassi",
        description: "Creamy yoghurt blended with Alphonso mango pulp and a pinch of cardamom",
        price: 18,
        aiNotes: "Vegetarian, gluten-free. Contains dairy. Made with real Alphonso mango — seasonal quality varies. Also works as a cooling drink to balance spicy mains.",
      },
      {
        name: "Masala Chai",
        description: "House-brewed Assam tea simmered with ginger, cardamom, cinnamon, and milk",
        price: 14,
        aiNotes: "Vegetarian, gluten-free. Contains dairy (milk). Caffeine content similar to black tea. Can be made with oat milk on request for dairy-free guests.",
      },
    ],
  },
];

async function main() {
  console.log("Seeding Zafran House demo restaurant...\n");

  // 1. Upsert a demo user
  const user = await prisma.user.upsert({
    where: { clerkId: "demo_zafran_house_owner" },
    update: {},
    create: {
      clerkId: "demo_zafran_house_owner",
      email: "demo-zafran@getbustan.com",
      fullName: "Demo Owner (Zafran House)",
      role: "restaurant_owner",
    },
  });
  console.log(`  User: ${user.id} (${user.email})`);

  // 2. Check if restaurant already exists
  const existing = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT.slug },
  });

  if (existing) {
    console.log(`\n  Restaurant "${RESTAURANT.name}" already exists (${existing.id}).`);
    console.log("  Delete it first if you want to re-seed:");
    console.log(`    DELETE FROM restaurants WHERE slug = '${RESTAURANT.slug}';`);
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
      isPublished: true,
      subscriptionStatus: "active",
      ownerId: user.id,
    },
  });
  console.log(`  Restaurant: ${restaurant.id} (${restaurant.slug})`);

  // 4. Create Pro subscription (no Stripe IDs — internal demo)
  const subscription = await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date("2099-12-31"),
    },
  });
  console.log(`  Subscription: ${subscription.id} (Pro, active)`);

  // 5. Create menu sections and items
  let totalItems = 0;
  let notesCount = 0;

  for (const [sectionIndex, section] of SECTIONS.entries()) {
    const dbSection = await prisma.menuSection.create({
      data: {
        restaurantId: restaurant.id,
        name: section.name,
        displayOrder: sectionIndex,
      },
    });

    for (const [itemIndex, item] of section.items.entries()) {
      await prisma.menuItem.create({
        data: {
          sectionId: dbSection.id,
          restaurantId: restaurant.id,
          name: item.name,
          description: item.description,
          price: item.price,
          currency: "AED",
          aiNotes: item.aiNotes ?? null,
          isAvailable: true,
          displayOrder: itemIndex,
        },
      });

      totalItems++;
      if (item.aiNotes) notesCount++;
    }

    console.log(`  Section "${section.name}": ${section.items.length} items`);
  }

  console.log(`\n  Total: ${totalItems} items, ${notesCount} with AI chef notes`);
  console.log(`\n  Live at: https://getbustan.com/${restaurant.slug}`);
  console.log("  Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
