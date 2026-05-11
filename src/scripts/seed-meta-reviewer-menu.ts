/**
 * Seed a sample menu for the Meta App Review reviewer restaurant.
 *
 * Clones the Vicolo (Italian) menu structure onto the
 * `meta-reviewer-demo` restaurant so reviewers see a populated dashboard
 * and public page.
 *
 * Idempotent: if menu sections already exist on this restaurant, the
 * script reports and exits without duplicating.
 *
 * Usage:
 *   npx tsx src/scripts/seed-meta-reviewer-menu.ts
 *   npx tsx src/scripts/seed-meta-reviewer-menu.ts --force   # wipe existing menu and re-seed
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT_SLUG = "meta-reviewer-demo";

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
        aiNotes: "Vegan if requested without the Parmesan shavings (it comes with a light dusting by default — mention to the diner). Contains gluten.",
      },
      {
        name: "Burrata e Prosciutto",
        description: "Fresh burrata with 24-month prosciutto di Parma, rocket, and truffle honey",
        price: 42,
        aiNotes: "Contains dairy (burrata) and pork (prosciutto). Gluten-free.",
      },
      {
        name: "Beef Carpaccio",
        description: "Thinly sliced wagyu beef with rocket, Parmigiano, capers, and lemon dressing",
        price: 48,
        aiNotes: "Gluten-free. Contains dairy (Parmigiano). Raw beef — flag to guests who may not be comfortable with raw meat.",
      },
      {
        name: "Arancini",
        description: "Crispy saffron risotto balls filled with mozzarella, served with marinara",
        price: 28,
        aiNotes: "Vegetarian. Contains gluten and dairy. Deep-fried. Served as 3 pieces.",
      },
      {
        name: "Caprese Salad",
        description: "Buffalo mozzarella with vine-ripened tomatoes, fresh basil, and extra virgin olive oil",
        price: 36,
        aiNotes: "Vegetarian, gluten-free, nut-free. Contains dairy.",
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
        aiNotes: "Vegetarian. Contains gluten and dairy. Chef's signature dish.",
      },
      {
        name: "Pappardelle al Ragu",
        description: "Hand-rolled ribbon pasta with slow-cooked Tuscan beef and pork ragu",
        price: 52,
        aiNotes: "Contains gluten, dairy, and pork. Ragu slow-cooked 6 hours.",
      },
      {
        name: "Truffle Risotto",
        description: "Carnaroli rice with porcini mushrooms, mascarpone, and shaved black truffle",
        price: 62,
        aiNotes: "Vegetarian, gluten-free. Contains dairy. Most premium pasta course.",
      },
      {
        name: "Spaghetti alle Vongole",
        description: "Spaghetti with fresh clams, white wine, garlic, chilli, and parsley",
        price: 54,
        aiNotes: "Contains gluten and shellfish. Dairy-free. Contains alcohol (wine).",
      },
      {
        name: "Lasagna della Nonna",
        description: "Layers of fresh pasta, bolognese, bechamel, and Parmigiano, baked golden",
        price: 48,
        aiNotes: "Contains gluten, dairy, and meat (beef and pork in the bolognese). Generous portion.",
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
        aiNotes: "Gluten-free. Contains dairy and alcohol. Braised for 3 hours.",
      },
      {
        name: "Branzino al Forno",
        description: "Whole roasted Mediterranean sea bass with lemon, olives, and cherry tomatoes",
        price: 76,
        aiNotes: "Gluten-free, dairy-free, nut-free. Whole fish, can be filleted tableside.",
      },
      {
        name: "Chicken Milanese",
        description: "Panko-crusted chicken breast with rocket, cherry tomatoes, and Parmesan",
        price: 58,
        aiNotes: "Contains gluten, dairy, and eggs. Crispy and golden.",
      },
      {
        name: "Vitello alla Griglia",
        description: "Grilled veal chop with rosemary roasted potatoes and salsa verde",
        price: 88,
        aiNotes: "Gluten-free, dairy-free. Salsa verde contains capers and anchovies — flag fish allergies.",
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
        aiNotes: "Vegetarian. Contains gluten, dairy, eggs, caffeine, and alcohol (Marsala).",
      },
      {
        name: "Panna Cotta",
        description: "Vanilla bean panna cotta with seasonal berry compote",
        price: 28,
        aiNotes: "Vegetarian, gluten-free, nut-free. Contains dairy and gelatin (not suitable for strict vegetarians).",
      },
      {
        name: "Cannoli Siciliani",
        description: "Crispy ricotta-filled cannoli with pistachio and dark chocolate",
        price: 26,
        aiNotes: "Vegetarian. Contains gluten, dairy, and nuts (pistachios).",
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
        aiNotes: "Vegan, gluten-free, nut-free. High caffeine — double shot.",
      },
      {
        name: "Limoncello Spritz",
        description: "Homemade limoncello with prosecco, soda, and fresh lemon",
        price: 38,
        aiNotes: "Vegan, gluten-free, nut-free. Contains alcohol. Made with house limoncello.",
      },
      {
        name: "Affogato",
        description: "Vanilla gelato drowned in a shot of hot espresso with amaretti crumble",
        price: 24,
        aiNotes: "Vegetarian. Contains dairy, gluten, nuts, and caffeine.",
      },
    ],
  },
];

function parseArgs(argv: string[]) {
  return {
    force: argv.includes("--force"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Seeding sample menu onto "${RESTAURANT_SLUG}"...\n`);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT_SLUG },
  });

  if (!restaurant) {
    console.error(
      `  ✗ Restaurant "${RESTAURANT_SLUG}" not found.\n` +
        `    Run seed-meta-reviewer.ts first to create the reviewer account + restaurant.`
    );
    process.exit(1);
  }

  const existingSections = await prisma.menuSection.count({
    where: { restaurantId: restaurant.id },
  });

  if (existingSections > 0 && !args.force) {
    console.log(
      `  ↺ Restaurant already has ${existingSections} menu section(s). Skipping to avoid duplicates.\n` +
        `    Re-run with --force to wipe and re-seed.`
    );
    return;
  }

  if (args.force && existingSections > 0) {
    console.log(`  ⚠ --force: deleting existing ${existingSections} menu sections + items...`);
    await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
    await prisma.menuSection.deleteMany({ where: { restaurantId: restaurant.id } });
    console.log(`    deleted.`);
  }

  let totalItems = 0;
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
    }
    console.log(`  ✓ "${section.name}" — ${section.items.length} items`);
  }

  console.log(`\n  Done. ${SECTIONS.length} sections, ${totalItems} items.`);
  console.log(`  Public menu live at: https://getbustan.com/${RESTAURANT_SLUG}`);
}

main()
  .catch((err) => {
    console.error("Menu seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
