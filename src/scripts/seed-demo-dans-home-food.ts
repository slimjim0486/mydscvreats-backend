/**
 * Seed "Dan's Home Food" as a fully working demo restaurant.
 *
 * Usage:  npx tsx src/scripts/seed-demo-dans-home-food.ts
 * Cleanup: npx tsx src/scripts/seed-demo-dans-home-food.ts --cleanup
 */

import { prisma } from "@/lib/prisma";

const RESTAURANT = {
  slug: "dans-home-food",
  name: "Dan's Home Food",
  description:
    "Authentic British comfort food, handmade from scratch in the heart of Dubai. Founded by British chef and butcher Daniel Pickin during the 2020 pandemic, Dan's Home Food brings the real taste of the UK to the UAE — from gluten-free battered cod and hand-cut chips to house-made pies with full-bottomed shortcrust pastry. Every pasty is hand-crimped, every batter mixed fresh, and every chip hand-cut daily. A taste of home, delivered to your door.",
  cuisineType: "British",
  themeKey: "midnight" as const,
  location: "Al Barsha 3, Dubai",
  address: "54 62nd St, Al Barsha - Al Barsha 3, Dubai, UAE",
  phone: "",
  website: "https://danshomefood.com",
  whatsappNumber: "",
  whatsappPrefill: "Hi Dan! I'd like to place an order from Dan's Home Food",
  logoUrl:
    "https://media.licdn.com/dms/image/v2/C4D0BAQH4-ip8939Zzw/company-logo_200_200/company-logo_200_200/0/1630563684545?e=2147483647&v=beta&t=pjhVX2ugnIBUFytqF5qRuauLwbRDngRlgeYI0WwY798",
  coverImageUrl:
    "https://rs-menus-api.roocdn.com/images/7f915160-6377-4d20-9b4e-69d7a514ff07/image.jpeg?width=1200&height=630&fit=crop",
  operatingHours: {
    timezone: "Asia/Dubai",
    schedule: [
      { dayOfWeek: 0, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
      { dayOfWeek: 1, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
      { dayOfWeek: 2, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
      { dayOfWeek: 3, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
      { dayOfWeek: 4, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
      { dayOfWeek: 5, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
      { dayOfWeek: 6, isClosed: false, periods: [{ open: "11:00", close: "23:00" }] },
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
    name: "Mains",
    items: [
      {
        name: "Cod and Chips",
        description:
          "Thick, meaty Atlantic cod fillets dipped in our signature homemade gluten-free batter and fried until golden and shatteringly crisp. Served with a generous portion of hand-cut chip-shop style chips, Maldon sea salt, malt vinegar, and a fresh lemon wedge.",
        price: 81,
        aiNotes:
          "GLUTEN-FREE batter — this is a major selling point and should always be highlighted. The chips are cooked in soybean oil (flag for soy allergies). Only the fish and chips are included; condiments like mushy peas, gravy, curry sauce, and tartare are separate add-ons. This is the #1 best-seller and highest-rated item on Deliveroo — customers call it 'the best fish and chips in Dubai'. The cod is sourced fresh, never frozen. Portion is very generous. Recommend pairing with Minted Mushy Peas and Tartare Sauce for the full British chippy experience.",
        dietaryKeys: ["gluten_free"],
      },
      {
        name: "Beef Pie and Mash",
        description:
          "A hearty house-made beef mince pie encased in buttery, golden full-bottomed shortcrust pastry, served with creamy buttery mash and a drizzle of chilli vinegar. Choose between rich house-made gravy or classic parsley sauce.",
        price: 65,
        aiNotes:
          "Contains GLUTEN (pastry) and DAIRY (butter in pastry and mash). The pie is fully encased — full-bottomed shortcrust, not just a pastry lid. Gravy or parsley sauce comes on the side — guest's choice. IMPORTANT: the parsley sauce may contain traces of shellfish — always flag this for guests with shellfish allergies. The beef is freshly minced in-house (Dan was a butcher in the UK). This is the second most popular item. True British pub classic — great recommendation for homesick expats.",
        dietaryKeys: [],
      },
      {
        name: "Chicken and Leek Pie with Chips",
        description:
          "Succulent chicken breast pieces and gently braised leeks enveloped in a delicious herby white sauce, all wrapped in Dan's signature buttery full-bottomed shortcrust pastry. Served with your choice of hand-cut chips or creamy mash.",
        price: 65,
        aiNotes:
          "Contains GLUTEN (pastry), DAIRY (butter, cream in white sauce), and EGG (egg wash on pastry). The chicken is breast meat only — no dark meat. The white sauce is herb-infused and creamy. Guest chooses between chips or mash as the side. A slightly lighter alternative to the Beef Pie for guests who prefer chicken. Very comforting, homestyle flavour.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Cottage Pie",
        description:
          "A British classic — seasoned beef mince topped with a thick layer of fluffy mashed potato and melted golden cheddar cheese, baked until bubbling and crisp on top.",
        price: 54,
        aiNotes:
          "Contains DAIRY (cheese, butter in mash) and GLUTEN (trace amounts possible). No pastry crust — the topping is mashed potato, making it lighter than the traditional pies. Topped with real cheddar cheese, baked golden. Good option for guests who want a pie-style dish but find pastry too heavy. Comfort food at its best. Portion is filling on its own — no side needed.",
        dietaryKeys: [],
      },
      {
        name: "Chilli Con Carne",
        description:
          "A medium-spiced house recipe chilli slow-cooked with premium beef mince, kidney beans, tomatoes, and a blend of smoky spices. Served with steamed rice, a dollop of cool sour cream, and fresh spring onion.",
        price: 51,
        aiNotes:
          "Contains GLUTEN and DAIRY (sour cream). Medium heat level — not overly spicy but has a nice kick. Served with rice (not chips). Good option for guests who want something a bit different from the British classics. Can also be ordered as a Jacket Potato topping (see Jacket Potatoes section) for a heartier meal. The mince is prepared fresh in-house.",
        dietaryKeys: ["mild"],
      },
      {
        name: "Cheese and Onion Pasty with Chips",
        description:
          "Strong red cheddar cheese and caramelised red onion folded through creamy mashed potato, all wrapped in golden buttery shortcrust pastry. Served with hand-cut chips or mash.",
        price: 59,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (pastry), DAIRY (cheddar, butter), and EGG (egg wash). This is the best vegetarian main on the menu — highly recommend for veggie guests. The red cheddar gives it a strong, satisfying cheese flavour. Southwest England-style crimped pasty, hand-made. Guest chooses chips or mash. Very filling.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
      {
        name: "Beef Pasty",
        description:
          "A traditional Southwest England-style Cornish pasty filled with seasoned beef, potato, swede, and onion in a hand-crimped buttery shortcrust pastry. Served with hand-cut chips or creamy mash.",
        price: 59,
        aiNotes:
          "Contains GLUTEN (pastry), DAIRY (butter in pastry), and EGG (egg wash). Traditional Cornish-style pasty — Dan is passionate about getting the crimp right. Filled with beef, potato, swede (rutabaga), and onion — classic filling. Each pasty is hand-made and hand-crimped individually. Guest chooses chips or mash as the side. A nod to the mining heritage of Cornwall.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Macaroni and Cheese Pie with Chips",
        description:
          "Indulgent creamy macaroni and cheese baked with a crispy golden breadcrumb topping, served inside an open shortcrust pastry shell. Pure comfort in every bite. Served with hand-cut chips.",
        price: 65,
        aiNotes:
          "LACTO-OVO VEGETARIAN. Contains GLUTEN (pasta, breadcrumb, pastry), DAIRY (cheese sauce, cheese), and EGG. This is mac and cheese INSIDE a pie — a unique British twist that guests love. The breadcrumb topping adds crunch. Very indulgent and filling. Great for cheese lovers and vegetarians looking for something hearty. Kid-friendly too.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
      {
        name: "Breaded Whole-Tail Shrimp and Chips",
        description:
          "Plump whole-tail shrimp coated in a light, crispy breadcrumb and fried golden. Served with hand-cut chips cooked in soybean oil, Maldon salt, malt vinegar, and a lemon wedge.",
        price: 70,
        aiNotes:
          "Contains GLUTEN (breadcrumb coating) and SHELLFISH. The shrimp come with the tails on — let guests know so they're not surprised. An alternative to the cod for seafood lovers who want something different. Chips are cooked in soybean oil (flag for soy allergies). Good portion of whole-tail shrimp — these are premium, not small popcorn shrimp.",
        dietaryKeys: ["contains_shellfish"],
      },
    ],
  },
  {
    name: "Specials",
    items: [
      {
        name: "Irish Chicken Roll",
        description:
          "A Dublin deli classic — crispy fried chicken, melted cheese, fresh tomato, crunchy lettuce, and creamy mayo, all rolled up and served with hand-cut chips, house coleslaw, and Dan's signature curry sauce.",
        price: 72,
        aiNotes:
          "Contains GLUTEN (roll, chicken coating), DAIRY (cheese, mayo), and EGG (mayo, chicken coating). The Irish Chicken Roll is a cult favourite in Ireland — if a guest is Irish or has been to Dublin, they'll know exactly what this is and be thrilled to see it. Comes with three sides: chips, coleslaw, AND curry sauce. Very generous and filling. The curry sauce is house-made from scratch.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Chicken Balti Pie",
        description:
          "The famous football match-day chicken Balti, reimagined as a pie. Succulent chicken pieces in a rich, mildly spiced Balti curry sauce, encased in Dan's signature shortcrust pastry.",
        price: 44,
        aiNotes:
          "Contains DAIRY (butter in pastry, cream in Balti sauce) and GLUTEN (pastry). MILD spice level — aromatic rather than hot. This is a football culture icon in the UK — Balti pies are sold at almost every football stadium. Great value at 44 AED — one of the most affordable mains. Perfect for guests who want a curry twist on the pie concept. Pie only — no side included, so suggest adding chips or mash.",
        dietaryKeys: ["mild"],
      },
      {
        name: "Veggie Cheese Pie",
        description:
          "A medley of broccoli, carrots, onions, peas, and garlic in a velvety bechamel sauce, baked inside Dan's signature shortcrust pie crust and topped with melted cheese.",
        price: 42,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (pastry), DAIRY (bechamel, cheese), and likely EGG (egg wash). Great value vegetarian option at 42 AED. Packed with vegetables in a creamy bechamel. The cheese on top adds extra richness. Good recommendation alongside the Cheese and Onion Pasty for vegetarian guests. Pie only — suggest adding a side of chips or mash.",
        dietaryKeys: ["vegetarian"],
      },
      {
        name: "Breakfast Pasty",
        description:
          "A hearty sausage, melted cheese, and baked bean melt wrapped in golden shortcrust pastry. All-day breakfast in your hand — no fork needed.",
        price: 22,
        aiNotes:
          "Contains GLUTEN (pastry) and DAIRY (cheese). Best value item on the menu at just 22 AED. Available all day despite the name. Think of it as a Full English Breakfast in pasty form. Great as a snack, light meal, or add-on to a larger order. Very popular as an impulse add-on. Perfect for guests ordering for the first time who want to try something affordable.",
        dietaryKeys: [],
      },
    ],
  },
  {
    name: "Burgers",
    items: [
      {
        name: "DHF Chicken Burger",
        description:
          "Tender whole chicken breast coated in Dan's secret DHF spice blend, topped with melted cheddar cheese, house-made burger sauce, and crunchy house slaw, served in a soft brioche bun.",
        price: 43,
        aiNotes:
          "Contains EGG (coating), DAIRY (cheddar, burger sauce), and GLUTEN (brioche bun, coating). 'DHF' stands for Dan's Home Food — it's their signature spice blend, a well-guarded recipe. The chicken is a whole breast, not a processed patty. The house slaw and burger sauce are both made in-house. No chips included — suggest adding a side of Chips or Curly Fries. Good alternative for guests who want something other than fish or pies.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Cod Burger",
        description:
          "A thick cod fillet smothered in Dan's signature homemade gluten-free batter, served in a soft brioche bun with crunchy house slaw and tangy tartare sauce.",
        price: 45,
        aiNotes:
          "Contains EGG (tartare sauce), GLUTEN (brioche bun — note: the batter itself is gluten-free but the bun is not), and DAIRY (bun). This is basically the famous Cod and Chips reimagined as a burger. The batter is gluten-free but the brioche bun contains gluten — important distinction. Good for guests who love the fish but want a handheld option. Suggest adding chips on the side.",
        dietaryKeys: ["contains_eggs"],
      },
    ],
  },
  {
    name: "Jacket Potatoes",
    items: [
      {
        name: "Jacket Potato with Tuna",
        description:
          "A perfectly baked fluffy jacket potato split open, buttered, and generously topped with Dan's house-made tuna mayo, finished with a sprinkling of fresh spring onion.",
        price: 45,
        aiNotes:
          "Contains DAIRY (butter), FISH (tuna), EGG (mayo), and ONION. The tuna mayo is made in-house — 'DHF Tuna Mayo' is their own recipe, not from a tin. Jacket potatoes are baked fresh. A lighter option compared to pies and fish & chips. Good for guests wanting something filling but not fried. The spring onion adds a fresh finish.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Jacket Potato with Cheese and Beans",
        description:
          "A classic British comfort combo — fluffy baked jacket potato loaded with melted red cheddar cheese and hearty baked beans.",
        price: 42,
        aiNotes:
          "VEGETARIAN. Contains DAIRY (butter, cheddar cheese). Simple, nostalgic, and satisfying — this is THE classic British jacket potato filling. Uses red cheddar which has a stronger, more flavourful taste than regular cheddar. Very popular comfort food choice. Great value at 42 AED. Kid-friendly. One of the lighter options on the menu.",
        dietaryKeys: ["vegetarian"],
      },
      {
        name: "Jacket Potato with Chilli Con Carne",
        description:
          "Fluffy baked jacket potato topped with Dan's slow-cooked medium-spiced house chilli, a dollop of cool sour cream, and a scattering of fresh chopped parsley.",
        price: 48,
        aiNotes:
          "Contains GLUTEN and DAIRY (sour cream, butter). Same great house chilli as the standalone Chilli Con Carne, but served on a jacket potato instead of rice. The sour cream cools down the medium spice. A heartier, more filling way to enjoy the chilli. Good recommendation for guests torn between comfort food and something with a kick.",
        dietaryKeys: ["mild"],
      },
    ],
  },
  {
    name: "All-Day Meal Deals",
    items: [
      {
        name: "Toasted Tuna Cheese Melt",
        description:
          "Dan's house tuna mayo and melted cheese pressed between golden toasted bread, served with a packet of crisps and a soft drink of your choice.",
        price: 38,
        aiNotes:
          "MEAL DEAL — includes sandwich + crisps + drink for 38 AED. Best value full meal on the menu. Contains FISH (tuna), DAIRY (cheese), EGG (mayo), and GLUTEN (bread). Popular lunch option. The tuna mayo is house-made. Great for guests on a budget or wanting a quick, complete meal without choosing sides separately.",
        dietaryKeys: ["contains_eggs"],
      },
      {
        name: "Toasted Coronation Chicken Sandwich",
        description:
          "Classic British coronation chicken — tender chicken in a mildly spiced, creamy curry mayo — toasted between golden bread. Served with crisps and a soft drink.",
        price: 38,
        aiNotes:
          "MEAL DEAL — includes sandwich + crisps + drink for 38 AED. Contains GLUTEN (bread), DAIRY, and EGG (mayo). Coronation Chicken was invented for Queen Elizabeth II's coronation in 1953 — great British food trivia to share. Mildly spiced curry mayo, not hot at all. A quintessentially British sandwich flavour that UK expats will love seeing on the menu.",
        dietaryKeys: ["mild", "contains_eggs"],
      },
      {
        name: "Toasted Egg Mayo Sandwich",
        description:
          "Simple, classic, and satisfying — creamy egg mayo toasted between golden bread, served with crisps and a soft drink.",
        price: 38,
        aiNotes:
          "MEAL DEAL — includes sandwich + crisps + drink for 38 AED. VEGETARIAN. Contains GLUTEN (bread), DAIRY (butter), and EGG (obviously). The simplest meal deal option. Good for guests who want something plain and reliable. Kid-friendly. A British sandwich shop staple.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
    ],
  },
  {
    name: "Sandwiches",
    items: [
      {
        name: "Tuna Mayo Sandwich",
        description:
          "Dan's house-made tuna mayo served cold in a freshly buttered baguette. Simple, fresh, and satisfying.",
        price: 37,
        aiNotes:
          "Contains EGG (mayo), DAIRY (butter), GLUTEN (baguette), and FISH (tuna). This is the sandwich-only version without the meal deal (crisps + drink). The baguette is fresh. Good for guests who just want a quick, light bite. Slightly cheaper than the toasted meal deal version at 37 AED vs 38 AED — but no crisps or drink included, so the meal deal is better value.",
        dietaryKeys: ["contains_eggs"],
      },
    ],
  },
  {
    name: "Soup",
    items: [
      {
        name: "Potato & Leek Soup",
        description:
          "A warming, hearty bowl of silky smooth potato and leek soup — completely plant-based, gluten-free, and dairy-free. Pure comfort in a bowl.",
        price: 38,
        aiNotes:
          "VEGAN, GLUTEN-FREE, DAIRY-FREE. Contains ONION (leeks are in the onion/allium family — flag for guests with allium sensitivity). This is the ONLY fully vegan item on the main menu — very important for vegan guests. Also the only gluten-free and dairy-free starter/side option. Perfect pairing with a Brioche Roll for non-vegan/GF guests. Great recommendation for health-conscious guests or as a light starter before a heavier main.",
        dietaryKeys: ["vegan", "gluten_free", "dairy_free"],
      },
    ],
  },
  {
    name: "Salad",
    items: [
      {
        name: "Dan's House Salad",
        description:
          "A colourful, crunchy salad of fresh romaine and iceberg lettuce, shredded carrots, red cabbage, juicy tomato, crisp red radish, and shaved cheddar cheese, dressed with creamy ranch dressing.",
        price: 32,
        aiNotes:
          "VEGETARIAN. Contains DAIRY (cheddar cheese, ranch dressing) and EGG (ranch dressing typically contains egg). The only salad on the menu — great for guests wanting something fresh alongside a heavier main. Can potentially be made without cheese and with oil/vinegar instead of ranch for dairy-free guests — suggest asking. Good as a side to share or as a lighter standalone option. At 32 AED it's one of the most affordable items.",
        dietaryKeys: ["vegetarian", "contains_eggs"],
      },
    ],
  },
  {
    name: "Kids Meals",
    items: [
      {
        name: "Kids Fish and Chips",
        description:
          "Bite-sized pieces of fresh cod in Dan's famous homemade gluten-free batter, served with a smaller portion of hand-cut chips, a lemon wedge, and vinegar.",
        price: 52,
        aiNotes:
          "GLUTEN-FREE batter (same as the adult Cod and Chips). Smaller portion designed for children but still generous. This is the #3 most popular item overall — loved by kids and parents alike. The gluten-free batter is a huge plus for parents of kids with gluten sensitivity. The cod is the same quality as the adult portion, just cut into smaller pieces. Parents frequently reorder this one.",
        dietaryKeys: ["gluten_free"],
      },
      {
        name: "Homemade Chicken Nuggets and Chips",
        description:
          "Real chicken breast hand-cut and coated in a light, crispy breadcrumb — nothing processed, nothing frozen. Served with a generous portion of hand-cut chips.",
        price: 42,
        aiNotes:
          "Contains GLUTEN (breadcrumb), DAIRY, and EGG (in coating). These are HOMEMADE — a key selling point versus fast-food nuggets. Made from real chicken breast, hand-cut in the kitchen, not frozen or pre-formed. Customers rave about these — reviews say 'the best nuggets they've ever had'. A great value kids meal at 42 AED. Also popular with adults who want a lighter, simpler meal.",
        dietaryKeys: ["contains_eggs"],
      },
    ],
  },
  {
    name: "Sides",
    items: [
      {
        name: "Chips",
        description:
          "Proper British chip-shop style hand-cut chips, cooked in soybean oil and served with a Maldon salt sachet and ketchup.",
        price: 22,
        aiNotes:
          "VEGETARIAN, GLUTEN-FREE, DAIRY-FREE. Cooked in soybean oil — flag for SOY allergies. These are hand-cut daily, not frozen. Chip-shop style means they're thick-cut with fluffy insides and crispy edges. The most commonly added side to any order. Generous portion. Also available as part of many mains already.",
        dietaryKeys: ["vegetarian", "gluten_free", "dairy_free"],
      },
      {
        name: "Minted Mushy Peas",
        description:
          "Creamy, buttery mushy peas with a fresh hint of garden mint and a touch of malt vinegar. A chip-shop essential.",
        price: 15,
        aiNotes:
          "GLUTEN-FREE. Contains DAIRY (butter). The classic accompaniment to fish and chips in British cuisine. Mushy peas are marrowfat peas cooked until soft and creamy — not regular green peas. The mint and vinegar lift the flavour. Strongly recommend pairing with the Cod and Chips for the authentic British chippy experience. Very affordable at 15 AED.",
        dietaryKeys: ["gluten_free"],
      },
      {
        name: "BBQ Chicken Wings",
        description:
          "Tender, juicy chicken wings smothered in a sticky, smoky BBQ sauce and finished with a dusting of fresh parsley.",
        price: 38,
        aiNotes:
          "Contains GLUTEN (BBQ sauce likely contains gluten). A great sharing starter or add-on. The BBQ sauce is smoky and sticky. Served as a substantial side — works well as a standalone snack or shared appetiser. Good alternative starter for guests who want something meaty before their main.",
        dietaryKeys: [],
      },
      {
        name: "Chip Butty",
        description:
          "A truly British guilty pleasure — a generous pile of hand-cut chips stuffed inside a soft, pillowy potato bread bun. Carbs on carbs, and proud of it.",
        price: 25,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (bun) and DAIRY (butter on the bun). The Chip Butty is an iconic British snack — chips in a bread roll, that's it. It's carbs on carbs and it's glorious. At 25 AED it's a fun, affordable add-on. Great conversation starter on the menu. If a guest asks 'what's a chip butty?' — it's one of Britain's most beloved simple pleasures.",
        dietaryKeys: ["vegetarian"],
      },
      {
        name: "Buffalo Chicken Wings",
        description:
          "Tender chicken wings tossed in a tangy, spicy buffalo sauce and finished with a scattering of fresh parsley. For those who like it hot.",
        price: 38,
        aiNotes:
          "Contains GLUTEN. SPICIER than the BBQ wings — the buffalo sauce has a vinegary heat. Good for guests who prefer heat over sweetness. Same quality wings as the BBQ version, just different sauce. Recommend offering both options when a guest asks about wings, mentioning the spice level difference.",
        dietaryKeys: ["spicy"],
      },
      {
        name: "Curly Fries",
        description:
          "Lightly seasoned, crispy curly fries — a fun, slightly spiced alternative to the classic hand-cut chips.",
        price: 22,
        aiNotes:
          "VEGETARIAN. Contains GLUTEN (seasoning coating). A fun alternative to the regular hand-cut chips. Slightly spiced seasoning on the outside. Same price as regular chips at 22 AED, so it's purely a preference choice. Popular with kids and as a change of pace from the chip-shop chips.",
        dietaryKeys: ["vegetarian"],
      },
      {
        name: "House Slaw",
        description:
          "Crunchy, fresh homemade coleslaw with shredded red cabbage, red onion, and a touch of parsley, dressed in creamy mayonnaise. Gluten-free.",
        price: 16,
        aiNotes:
          "GLUTEN-FREE. Contains EGG (mayonnaise). Homemade — not store-bought. The red cabbage gives it a vibrant colour and crunch. Great pairing with burgers, the Irish Chicken Roll, or as a fresh contrast to the heavier fried items. Affordable at 16 AED. Fresh and crunchy.",
        dietaryKeys: ["gluten_free", "contains_eggs"],
      },
      {
        name: "Baked Beans",
        description:
          "Classic British baked beans in a rich, slightly sweet tomato sauce. A comforting staple side.",
        price: 13,
        aiNotes:
          "VEGAN-FRIENDLY (standard baked beans contain no animal products). GLUTEN-FREE. The cheapest side at 13 AED. A British pantry staple. Perfect alongside jacket potatoes, pies, or on their own. Simple, reliable, and nostalgic for British expats. Can be added to almost any meal.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Mashed Potato",
        description:
          "Smooth, creamy buttery mashed potato made fresh daily. The perfect companion to any pie.",
        price: 16,
        aiNotes:
          "Contains DAIRY (butter, cream). GLUTEN-FREE. Made fresh daily from real potatoes — not instant. The recommended side with any of the pies (Beef Pie, Chicken and Leek Pie, Balti Pie). Rich and buttery. Also a great swap for chips if a guest prefers something softer.",
        dietaryKeys: ["vegetarian", "gluten_free"],
      },
      {
        name: "Brioche Roll",
        description:
          "A soft, golden potato bread roll. Perfect for mopping up gravy, curry sauce, or mushy peas.",
        price: 7,
        aiNotes:
          "Contains GLUTEN. The cheapest item on the entire menu at 7 AED. A nice add-on to suggest with soup (Potato & Leek), pies (for gravy soaking), or any saucy dish. Soft, pillowy texture. Good impulse add-on to mention at checkout.",
        dietaryKeys: [],
      },
    ],
  },
  {
    name: "Condiments",
    items: [
      {
        name: "Gravy",
        description:
          "Rich, savoury house-made gravy crafted from real meat drippings and stock. A must-have with pies and mash.",
        price: 16,
        aiNotes:
          "Contains GLUTEN. May contain traces of SOYA, MILK, and EGG. Made in-house from scratch — not from a packet. Essential pairing with the Beef Pie and Mash. Also great drizzled over chips (chips and gravy is a Northern English classic). Always suggest gravy when a guest orders any pie.",
        dietaryKeys: [],
      },
      {
        name: "Curry Sauce",
        description:
          "Dan's signature house-made chip-shop curry sauce, crafted from onions, garlic, and a secret spice blend. A British chippy essential.",
        price: 16,
        aiNotes:
          "Contains GLUTEN. May contain traces of SOY, CELERY, and DAIRY. House-made from scratch with Dan's secret spice blend — this isn't from a jar. Chip-shop curry sauce is a beloved British tradition — poured over chips or alongside fish. Always suggest when a guest orders fish and chips or any chips. The 'secret spice blend' is a talking point.",
        dietaryKeys: [],
      },
      {
        name: "Tartare Sauce",
        description:
          "Classic tartare sauce made with mayo, crunchy gherkins, briny capers, finely diced shallots, and fresh parsley.",
        price: 7,
        aiNotes:
          "Contains EGG (mayo base). GLUTEN-FREE. The traditional accompaniment to fish and chips. House-made with real gherkins and capers. At 7 AED it's an easy add-on to suggest with any fish dish (Cod and Chips, Cod Burger, Kids Fish and Chips, Breaded Shrimp). Always mention tartare sauce when someone orders fish.",
        dietaryKeys: ["gluten_free", "contains_eggs"],
      },
    ],
  },
  {
    name: "Desserts",
    items: [
      {
        name: "Sticky Toffee Pudding",
        description:
          "A decadent, moist date sponge pudding drenched in luscious salted butterscotch sauce. The quintessential British dessert — warm, indulgent, and impossible to resist.",
        price: 30,
        aiNotes:
          "Contains GLUTEN and DAIRY (butter, cream in butterscotch sauce). Sticky Toffee Pudding is one of Britain's most iconic desserts — dates make the sponge incredibly moist. The salted butterscotch sauce is rich and indulgent. Served warm. The ONLY dessert on the menu, so this is the go-to recommendation for anyone with a sweet tooth. Perfect way to finish a meal. Very popular — definitely suggest it to anyone who hasn't tried it.",
        dietaryKeys: [],
      },
    ],
  },
  {
    name: "Drinks",
    items: [
      {
        name: "Coca-Cola",
        description: "Classic Coca-Cola — ice-cold and refreshing.",
        price: 9,
        aiNotes: "Standard soft drink. Part of the meal deal options (sandwich + crisps + drink). Caffeine-containing.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Coke Light 300ml",
        description: "Lighter, zero-sugar Coca-Cola — all the taste, none of the guilt.",
        price: 9,
        aiNotes: "Zero sugar option. Good for guests watching sugar intake. Part of meal deal options. Caffeine-containing.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Fanta",
        description: "Bright, bubbly orange Fanta.",
        price: 9,
        aiNotes: "Caffeine-free. Popular with kids. Part of meal deal options.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Diet Sprite",
        description: "Crisp, refreshing, sugar-free lemon-lime Sprite.",
        price: 9,
        aiNotes: "Zero sugar, caffeine-free. Part of meal deal options.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Sprite",
        description: "Classic lemon-lime Sprite — cool and fizzy.",
        price: 9,
        aiNotes: "Caffeine-free. Part of meal deal options. Popular with kids.",
        dietaryKeys: ["vegan", "gluten_free"],
      },
      {
        name: "Arwa Water",
        description: "Still mineral water. Clean and simple.",
        price: 6,
        aiNotes: "Cheapest drink option at 6 AED. Part of meal deal options. Good to suggest for health-conscious guests.",
        dietaryKeys: ["vegan", "gluten_free"],
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
  console.log("\nCleaning up Dan's Home Food demo data...\n");

  const existing = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT.slug },
  });

  if (!existing) {
    console.log("No restaurant found with slug 'dans-home-food'. Nothing to clean up.");
    return;
  }

  // Delete restaurant (cascades to sections, items, tags, etc.)
  await prisma.restaurant.delete({ where: { id: existing.id } });
  console.log(`  Deleted restaurant: ${existing.name} (${existing.slug})`);

  // Clean up the demo user if no other restaurants
  const user = await prisma.user.findUnique({
    where: { clerkId: "demo_dans_home_food_owner" },
    include: { restaurants: true },
  });
  if (user && user.restaurants.length === 0) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  Deleted demo user: ${user.email}`);
  }

  console.log("\nCleanup complete!");
}

async function seed() {
  console.log("Seeding Dan's Home Food demo restaurant...\n");

  // 1. Upsert demo user
  const user = await prisma.user.upsert({
    where: { clerkId: "demo_dans_home_food_owner" },
    update: {},
    create: {
      clerkId: "demo_dans_home_food_owner",
      email: "demo-dans@getbustan.com",
      fullName: "Daniel Pickin",
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
      website: RESTAURANT.website,
      whatsappNumber: RESTAURANT.whatsappNumber,
      whatsappPrefill: RESTAURANT.whatsappPrefill,
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
  console.log(`\n  To clean up: npx tsx src/scripts/seed-demo-dans-home-food.ts --cleanup`);
  console.log("  Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
