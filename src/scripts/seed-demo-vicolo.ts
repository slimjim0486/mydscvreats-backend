/**
 * Seed "Vicolo" as a fully working demo restaurant.
 *
 * Usage:  npx tsx src/scripts/seed-demo-vicolo.ts
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT = {
  slug: "vicolo",
  name: "Vicolo",
  description:
    "A celebration of Italy's greatest flavours — handmade pasta, wood-fired classics, and seasonal ingredients sourced from the Mediterranean. Tucked away like a hidden Roman alley, Vicolo brings the warmth of a Tuscan trattoria to the heart of Dubai.",
  cuisineType: "Italian",
  themeKey: "saffron" as const,
  location: "DIFC, Dubai",
  address: "Gate Village 3, DIFC, Dubai, UAE",
  phone: "+971 4 555 0456",
  logoUrl: "https://images.getbustan.com/demo-restaurants/vicolo/logo.jpg",
  coverImageUrl: "https://images.getbustan.com/demo-restaurants/vicolo/cover.jpg",
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
    name: "Antipasti",
    items: [
      {
        name: "Bruschetta Pomodoro",
        description: "Grilled sourdough with San Marzano tomatoes, basil, and aged balsamic",
        price: 22,
        aiNotes: "Vegan if requested without the Parmesan shavings (it comes with a light dusting by default — mention to the diner). Contains gluten. One of our lightest starters.",
      },
      {
        name: "Burrata e Prosciutto",
        description: "Fresh burrata with 24-month prosciutto di Parma, rocket, and truffle honey",
        price: 42,
        aiNotes: "Contains dairy (burrata) and pork (prosciutto). Gluten-free. Our most popular antipasto — the burrata is flown in from Puglia twice a week. Not suitable for anyone avoiding pork.",
      },
      {
        name: "Beef Carpaccio",
        description: "Thinly sliced wagyu beef with rocket, Parmigiano, capers, and lemon dressing",
        price: 48,
        aiNotes: "Gluten-free. Contains dairy (Parmigiano). Raw beef — flag to guests who may not be comfortable with raw meat. Premium dish, uses A5-grade wagyu. The lemon dressing is dairy-free.",
      },
      {
        name: "Arancini",
        description: "Crispy saffron risotto balls filled with mozzarella, served with marinara",
        price: 28,
        aiNotes: "Vegetarian. Contains gluten (breadcrumb coating) and dairy (mozzarella, butter in risotto). Deep-fried. Served as 3 pieces. Very popular with kids and as a sharing starter.",
      },
      {
        name: "Caprese Salad",
        description: "Buffalo mozzarella with vine-ripened tomatoes, fresh basil, and extra virgin olive oil",
        price: 36,
        aiNotes: "Vegetarian, gluten-free, nut-free. Contains dairy (buffalo mozzarella). Simple and fresh — best recommendation for guests wanting something light. Tomatoes are seasonal — best in winter months in Dubai.",
      },
    ],
  },
  {
    name: "Pasta & Risotto",
    items: [
      {
        name: "Cacio e Pepe",
        description: "Tonnarelli pasta with Pecorino Romano and cracked black pepper",
        price: 46,
        aiNotes: "Vegetarian. Contains gluten and dairy (Pecorino). Only 3 ingredients — simple but technique-driven. Our chef's signature dish. No cream is used — just pasta water and cheese emulsion. Very peppery.",
      },
      {
        name: "Pappardelle al Ragu",
        description: "Hand-rolled ribbon pasta with slow-cooked Tuscan beef and pork ragu",
        price: 52,
        aiNotes: "Contains gluten, dairy, and pork. The ragu is slow-cooked for 6 hours. Rich and hearty — our best-selling pasta. Good for cold weather or guests wanting comfort food. Contains both beef and pork.",
      },
      {
        name: "Truffle Risotto",
        description: "Carnaroli rice with porcini mushrooms, mascarpone, and shaved black truffle",
        price: 62,
        aiNotes: "Vegetarian, gluten-free. Contains dairy (mascarpone, butter, Parmesan). Our most premium pasta course. Black truffle is seasonal — we use preserved truffle in summer months. Very rich and indulgent.",
      },
      {
        name: "Spaghetti alle Vongole",
        description: "Spaghetti with fresh clams, white wine, garlic, chilli, and parsley",
        price: 54,
        aiNotes: "Contains gluten and shellfish. Dairy-free (bianco style, no cream). The clams are sourced fresh daily. Light, briny, garlicky — good for guests who want seafood without heaviness. Contains alcohol (wine).",
      },
      {
        name: "Lasagna della Nonna",
        description: "Layers of fresh pasta, bolognese, bechamel, and Parmigiano, baked golden",
        price: 48,
        aiNotes: "Contains gluten, dairy, and meat (beef and pork in the bolognese). Very filling — generous portion. Comfort food classic. Popular with families. Contains both beef and pork.",
      },
    ],
  },
  {
    name: "Secondi",
    items: [
      {
        name: "Osso Buco",
        description: "Braised veal shank in white wine and vegetables, served with gremolata and saffron risotto",
        price: 82,
        aiNotes: "Gluten-free (served with risotto, not bread). Contains dairy (butter in risotto). Our signature main — braised for 3 hours until fork-tender. Contains alcohol (white wine). Very generous portion with bone marrow.",
      },
      {
        name: "Branzino al Forno",
        description: "Whole roasted Mediterranean sea bass with lemon, olives, and cherry tomatoes",
        price: 76,
        aiNotes: "Gluten-free, dairy-free, nut-free. Whole fish served on the bone — we can fillet tableside on request. Light and Mediterranean. Best recommendation for health-conscious or dairy-free guests.",
      },
      {
        name: "Chicken Milanese",
        description: "Panko-crusted chicken breast with rocket, cherry tomatoes, and Parmesan",
        price: 58,
        aiNotes: "Contains gluten (panko crust), dairy (Parmesan), and eggs (in the coating). Crispy and golden. Popular with guests who want something familiar. Served with a lemon wedge.",
      },
      {
        name: "Vitello alla Griglia",
        description: "Grilled veal chop with rosemary roasted potatoes and salsa verde",
        price: 88,
        aiNotes: "Gluten-free. Dairy-free (salsa verde is herb and oil based). Our most premium main. The veal chop is 300g, cooked on charcoal. Salsa verde contains capers and anchovies — flag to guests with fish allergies.",
      },
    ],
  },
  {
    name: "Dolci",
    items: [
      {
        name: "Tiramisu",
        description: "Classic mascarpone cream with espresso-soaked ladyfingers and cocoa",
        price: 32,
        aiNotes: "Vegetarian. Contains gluten, dairy (mascarpone), eggs, and caffeine. Our house recipe — made fresh daily. Contains alcohol (Marsala wine). The most popular dessert by far.",
      },
      {
        name: "Panna Cotta",
        description: "Vanilla bean panna cotta with seasonal berry compote",
        price: 28,
        aiNotes: "Vegetarian, gluten-free, nut-free. Contains dairy (cream). Light and silky — the best dessert for guests who want something not too heavy after a big meal. Contains gelatin (not suitable for strict vegetarians/vegans).",
      },
      {
        name: "Cannoli Siciliani",
        description: "Crispy ricotta-filled cannoli with pistachio and dark chocolate",
        price: 26,
        aiNotes: "Vegetarian. Contains gluten, dairy (ricotta), and nuts (pistachios). Served as 2 pieces. Filled to order so the shell stays crispy. Contains pistachios — flag for nut allergies.",
      },
    ],
  },
  {
    name: "Bevande",
    items: [
      {
        name: "Espresso Doppio",
        description: "Double shot of house-roasted Italian espresso",
        price: 16,
        aiNotes: "Vegan, gluten-free, nut-free. High caffeine — double shot. Our beans are roasted in-house. Can be served as americano, macchiato, or with oat milk on request.",
      },
      {
        name: "Limoncello Spritz",
        description: "Homemade limoncello with prosecco, soda, and fresh lemon",
        price: 38,
        aiNotes: "Vegan, gluten-free, nut-free. Contains alcohol. Made with our house limoncello — we infuse Amalfi lemons for 30 days. Refreshing and light. Can be made non-alcoholic with lemon soda on request.",
      },
      {
        name: "Affogato",
        description: "Vanilla gelato drowned in a shot of hot espresso with amaretti crumble",
        price: 24,
        aiNotes: "Vegetarian. Contains dairy (gelato), gluten (amaretti), nuts (almonds in amaretti), and caffeine. Half dessert, half coffee — great for guests who can't decide. The amaretti can be removed for nut-free.",
      },
    ],
  },
];

async function main() {
  console.log("Seeding Vicolo demo restaurant...\n");

  // 1. Upsert demo user
  const user = await prisma.user.upsert({
    where: { clerkId: "demo_vicolo_owner" },
    update: {},
    create: {
      clerkId: "demo_vicolo_owner",
      email: "demo-vicolo@getbustan.com",
      fullName: "Demo Owner (Vicolo)",
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
    console.log("  Delete it first if you want to re-seed.");
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
