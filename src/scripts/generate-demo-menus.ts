/**
 * Generate 20-item sample menu PDFs for 3 demo restaurants.
 *
 * Usage:  npx tsx src/scripts/generate-demo-menus.ts
 */

import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = join(__dirname, "../../../demo-restaurants");

// ── Menu data ─────────────────────────────────────────────────

interface MenuItem {
  name: string;
  description: string;
  price: number;
}

interface MenuSection {
  name: string;
  items: MenuItem[];
}

interface DemoRestaurant {
  name: string;
  slug: string;
  tagline: string;
  cuisine: string;
  sections: MenuSection[];
}

const RESTAURANTS: DemoRestaurant[] = [
  {
    name: "Zafran House",
    slug: "zafran-house",
    tagline: "Authentic Indian & Pakistani Cuisine",
    cuisine: "Indian / Pakistani",
    sections: [
      {
        name: "Starters",
        items: [
          { name: "Lamb Samosa", description: "Crispy pastry filled with spiced lamb mince, peas, and fresh herbs", price: 18 },
          { name: "Chicken Malai Tikka", description: "Cream-marinated chicken thigh, chargrilled in the tandoor, served with mint chutney", price: 28 },
          { name: "Seekh Kebab", description: "Hand-minced lamb kebabs with cumin, coriander, and green chilli, grilled on skewers", price: 32 },
          { name: "Vegetable Pakora", description: "Mixed seasonal vegetables in a crispy chickpea batter with tamarind dip", price: 16 },
          { name: "Dahi Puri Chaat", description: "Crispy puri shells filled with yoghurt, chickpeas, pomegranate, and tangy chutneys", price: 22 },
          { name: "Paneer Tikka", description: "Tandoor-roasted paneer cubes marinated in spiced yoghurt with peppers and onion", price: 26 },
        ],
      },
      {
        name: "Mains",
        items: [
          { name: "Butter Chicken", description: "Tandoori chicken in a velvety tomato-cream sauce with fenugreek and cardamom", price: 52 },
          { name: "Lamb Biryani", description: "Slow-cooked lamb layered with saffron basmati rice, crispy onions, and raita", price: 58 },
          { name: "Palak Paneer", description: "Creamy spinach curry with house-made paneer and a hint of garlic", price: 42 },
          { name: "Karahi Gosht", description: "Wok-tossed lamb with tomatoes, ginger, and green chillies in a karahi", price: 62 },
          { name: "Chicken Nihari", description: "Slow-braised chicken stew with bone marrow, warming spices, and fresh ginger", price: 48 },
          { name: "Tandoori Salmon", description: "Atlantic salmon fillet marinated in yoghurt and Kashmiri spices, roasted in the tandoor", price: 68 },
          { name: "Dal Makhani", description: "Black lentils simmered overnight with butter, cream, and smoky spices", price: 38 },
        ],
      },
      {
        name: "Breads",
        items: [
          { name: "Garlic Naan", description: "Soft leavened bread with roasted garlic and butter from the clay oven", price: 12 },
          { name: "Cheese Naan", description: "Naan stuffed with melted mozzarella and cheddar, brushed with ghee", price: 16 },
          { name: "Tandoori Roti", description: "Whole wheat flatbread baked on the tandoor wall, light and smoky", price: 8 },
        ],
      },
      {
        name: "Desserts & Drinks",
        items: [
          { name: "Gulab Jamun", description: "Warm milk-solid dumplings soaked in rose and cardamom syrup", price: 22 },
          { name: "Ras Malai", description: "Soft paneer discs in chilled sweetened milk with saffron and pistachios", price: 24 },
          { name: "Mango Lassi", description: "Creamy yoghurt blended with Alphonso mango pulp and a pinch of cardamom", price: 18 },
          { name: "Masala Chai", description: "House-brewed Assam tea simmered with ginger, cardamom, cinnamon, and milk", price: 14 },
        ],
      },
    ],
  },
  {
    name: "Vicolo",
    slug: "vicolo",
    tagline: "Trattoria Italiana dal Cuore",
    cuisine: "Italian",
    sections: [
      {
        name: "Antipasti",
        items: [
          { name: "Bruschetta Pomodoro", description: "Grilled sourdough with San Marzano tomatoes, basil, and aged balsamic", price: 22 },
          { name: "Burrata e Prosciutto", description: "Fresh burrata with 24-month prosciutto di Parma, rocket, and truffle honey", price: 42 },
          { name: "Beef Carpaccio", description: "Thinly sliced wagyu beef with rocket, Parmigiano, capers, and lemon dressing", price: 48 },
          { name: "Arancini", description: "Crispy saffron risotto balls filled with mozzarella, served with marinara", price: 28 },
          { name: "Caprese Salad", description: "Buffalo mozzarella with vine-ripened tomatoes, fresh basil, and extra virgin olive oil", price: 36 },
        ],
      },
      {
        name: "Pasta & Risotto",
        items: [
          { name: "Cacio e Pepe", description: "Tonnarelli pasta with Pecorino Romano and cracked black pepper", price: 46 },
          { name: "Pappardelle al Ragu", description: "Hand-rolled ribbon pasta with slow-cooked Tuscan beef and pork ragu", price: 52 },
          { name: "Truffle Risotto", description: "Carnaroli rice with porcini mushrooms, mascarpone, and shaved black truffle", price: 62 },
          { name: "Spaghetti alle Vongole", description: "Spaghetti with fresh clams, white wine, garlic, chilli, and parsley", price: 54 },
          { name: "Lasagna della Nonna", description: "Layers of fresh pasta, bolognese, bechamel, and Parmigiano, baked golden", price: 48 },
        ],
      },
      {
        name: "Secondi",
        items: [
          { name: "Osso Buco", description: "Braised veal shank in white wine and vegetables, served with gremolata and saffron risotto", price: 82 },
          { name: "Branzino al Forno", description: "Whole roasted Mediterranean sea bass with lemon, olives, and cherry tomatoes", price: 76 },
          { name: "Chicken Milanese", description: "Panko-crusted chicken breast with rocket, cherry tomatoes, and Parmesan", price: 58 },
          { name: "Vitello alla Griglia", description: "Grilled veal chop with rosemary roasted potatoes and salsa verde", price: 88 },
        ],
      },
      {
        name: "Dolci",
        items: [
          { name: "Tiramisu", description: "Classic mascarpone cream with espresso-soaked ladyfingers and cocoa", price: 32 },
          { name: "Panna Cotta", description: "Vanilla bean panna cotta with seasonal berry compote", price: 28 },
          { name: "Cannoli Siciliani", description: "Crispy ricotta-filled cannoli with pistachio and dark chocolate", price: 26 },
        ],
      },
      {
        name: "Bevande",
        items: [
          { name: "Espresso Doppio", description: "Double shot of house-roasted Italian espresso", price: 16 },
          { name: "Limoncello Spritz", description: "Homemade limoncello with prosecco, soda, and fresh lemon", price: 38 },
          { name: "Affogato", description: "Vanilla gelato drowned in a shot of hot espresso with amaretti crumble", price: 24 },
        ],
      },
    ],
  },
  {
    name: "Jade Garden",
    slug: "jade-garden",
    tagline: "Premium Chinese & Asian Dining",
    cuisine: "Chinese / Asian",
    sections: [
      {
        name: "Dim Sum",
        items: [
          { name: "Har Gow", description: "Crystal shrimp dumplings with a delicate translucent wrapper", price: 28 },
          { name: "Siu Mai", description: "Open-top pork and prawn dumplings topped with tobiko roe", price: 26 },
          { name: "Xiao Long Bao", description: "Shanghai soup dumplings filled with pork and rich broth", price: 32 },
          { name: "Crispy Spring Rolls", description: "Golden rolls filled with mixed vegetables and glass noodles, served with sweet chilli", price: 22 },
          { name: "Char Siu Bao", description: "Fluffy steamed buns filled with sweet barbecue pork", price: 24 },
        ],
      },
      {
        name: "Soups",
        items: [
          { name: "Hot & Sour Soup", description: "Silken tofu, wood ear mushrooms, bamboo shoots in a spicy-tangy broth", price: 24 },
          { name: "Wonton Soup", description: "Prawn and pork wontons in a clear ginger-scallion broth", price: 28 },
        ],
      },
      {
        name: "Mains",
        items: [
          { name: "Peking Duck", description: "Whole roasted duck carved tableside with pancakes, hoisin, cucumber, and scallion", price: 148 },
          { name: "Kung Pao Chicken", description: "Wok-fired chicken with roasted peanuts, dried chillies, and Sichuan pepper", price: 52 },
          { name: "Mapo Tofu", description: "Silken tofu in a fiery Sichuan peppercorn and fermented bean sauce", price: 42 },
          { name: "Sweet & Sour Grouper", description: "Crispy fried grouper fillet with a tangy pineapple and bell pepper glaze", price: 62 },
          { name: "Char Siu Pork", description: "Cantonese honey-glazed barbecue pork with mustard greens", price: 56 },
          { name: "Black Pepper Wagyu Beef", description: "Wok-seared wagyu strips with crushed black pepper, onion, and bell pepper", price: 78 },
        ],
      },
      {
        name: "Noodles & Rice",
        items: [
          { name: "Dan Dan Noodles", description: "Sichuan wheat noodles with chilli oil, minced pork, and preserved vegetables", price: 38 },
          { name: "Yang Chow Fried Rice", description: "Wok-fried jasmine rice with prawns, char siu, egg, and spring onion", price: 36 },
          { name: "Pad Thai", description: "Stir-fried rice noodles with prawns, crushed peanuts, bean sprouts, and tamarind", price: 44 },
        ],
      },
      {
        name: "Desserts & Tea",
        items: [
          { name: "Mango Pomelo Sago", description: "Chilled mango cream with pomelo segments and tapioca pearls", price: 28 },
          { name: "Sesame Balls", description: "Crispy glutinous rice balls filled with red bean paste, coated in sesame seeds", price: 22 },
          { name: "Jasmine Tea Pot", description: "Premium whole-leaf jasmine tea served in a traditional clay pot", price: 18 },
          { name: "Lychee Cooler", description: "Chilled lychee juice with lime, soda, and crushed ice", price: 22 },
        ],
      },
    ],
  },
];

// ── PDF generation ────────────────────────────────────────────

function generateMenuPDF(restaurant: DemoRestaurant, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Header ──────────────────────────────────────────────
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor("#1a1a1a")
      .text(restaurant.name, { align: "center" });

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#8a7a6a")
      .text(restaurant.tagline, { align: "center" });

    doc.moveDown(0.3);

    // Decorative line
    const lineY = doc.y;
    const centerX = doc.page.margins.left + pageWidth / 2;
    doc
      .moveTo(centerX - 60, lineY)
      .lineTo(centerX + 60, lineY)
      .strokeColor("#d4a574")
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);

    // ── Sections ────────────────────────────────────────────
    for (const section of restaurant.sections) {
      // Check if we need a new page (at least 100pt needed for a section header + 1 item)
      if (doc.y > doc.page.height - 160) {
        doc.addPage();
      }

      // Section header
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#5a4a3a")
        .text(section.name.toUpperCase(), { align: "left" });

      // Section underline
      const sectionLineY = doc.y + 2;
      doc
        .moveTo(doc.page.margins.left, sectionLineY)
        .lineTo(doc.page.margins.left + pageWidth, sectionLineY)
        .strokeColor("#e8ddd0")
        .lineWidth(0.5)
        .stroke();

      doc.moveDown(0.5);

      // Items
      for (const item of section.items) {
        // Check page break
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }

        const startY = doc.y;

        // Item name and price on same line
        const priceText = `AED ${item.price}`;
        const priceWidth = doc.font("Helvetica-Bold").fontSize(11).widthOfString(priceText);
        const nameWidth = pageWidth - priceWidth - 10;

        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor("#2a2a2a")
          .text(item.name, doc.page.margins.left, startY, { width: nameWidth, continued: false });

        // Price aligned right on the same line as name start
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor("#b8860b")
          .text(priceText, doc.page.margins.left, startY, { width: pageWidth, align: "right" });

        // Description below the name
        const descY = startY + 16;
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#7a7a7a")
          .text(item.description, doc.page.margins.left, descY, { width: pageWidth - 60 });

        // Ensure cursor is past the description
        if (doc.y < descY + 12) {
          doc.y = descY + 12;
        }

        doc.moveDown(0.4);
      }

      doc.moveDown(0.6);
    }

    // ── Footer ──────────────────────────────────────────────
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }

    doc.moveDown(1);

    const footerLineY = doc.y;
    doc
      .moveTo(centerX - 40, footerLineY)
      .lineTo(centerX + 40, footerLineY)
      .strokeColor("#d4a574")
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#aaa")
      .text("All prices in AED. Prices are inclusive of applicable taxes.", { align: "center" })
      .text("Please inform your server of any allergies or dietary requirements.", { align: "center" });

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  for (const restaurant of RESTAURANTS) {
    const outputPath = join(OUTPUT_DIR, restaurant.slug, "menu.pdf");
    console.log(`Generating ${restaurant.name} menu → ${outputPath}`);
    await generateMenuPDF(restaurant, outputPath);

    // Count items
    const itemCount = restaurant.sections.reduce((sum, s) => sum + s.items.length, 0);
    console.log(`  ${itemCount} items across ${restaurant.sections.length} sections\n`);
  }

  console.log("Done!");
}

main().catch(console.error);
