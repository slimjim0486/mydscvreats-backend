import type { CopyFramework } from "./types";

// =============================================================================
// COPY FRAMEWORKS — restaurant-tuned (Q2 2026)
// =============================================================================
//
// Each framework includes:
//   - Beats: the structural steps the AI must fill
//   - Examples: 2-3 cuisine-specific renderings, including at least one Arabic
//
// Universal caption rules (apply across frameworks):
//   - Value-prop in line 1 (mobile preview shows ~100 chars)
//   - TikTok captions 80-150 chars; IG Reels 125-220; Meta primary 90-150
//   - 5 hashtags max on Instagram (Dec 2025 cap); intent-based
//   - 1-3 emojis = young/fresh; 4+ reads spam
//   - Arabic punctuation (؟ ، ؛) preserved in RTL captions

export const copyFrameworks: CopyFramework[] = [
  {
    id: "aida",
    name: "AIDA",
    acronym: "AIDA",
    description: "Attention → Interest → Desire → Action. The classic short-form copy spine, adapted for food video and image ads.",
    beats: [
      { step: "Attention", instruction: "Sensory hook or unexpected claim. Pair with frame-1 visual." },
      { step: "Interest", instruction: "Specific reason this is different (sourcing, technique, lineage)." },
      { step: "Desire", instruction: "Proof (rating, count, quote) + craving trigger." },
      { step: "Action", instruction: "Single CTA, friction-removed (WhatsApp/Talabat link)." },
    ],
    examples: [
      {
        cuisine: "italian",
        language: "en",
        body: "That sound? It's burrata, splitting open. Hand-pulled daily, flown from Puglia weekly. 4.9★ on 600+ reviews. Pasta? Made at 6am, every morning. Reserve tonight via WhatsApp →",
      },
      {
        cuisine: "lebanese",
        language: "ar",
        body: "المنقوشة الأصلية اللي بتذكرك بصبحيات تيتا. بعجن كل يوم على الصاج، بطحين قمح بلدي. ٤.٨ نجوم في تلاباط، أكثر من ١٢٠٠ تقييم. اطلب توصيل خلال ٢٥ دقيقة →",
      },
      {
        cuisine: "asian",
        language: "en",
        body: "Steam rising. Pho broth. 12 hours. We don't compromise the bones. Order now on Careem.",
      },
      {
        cuisine: "cafe",
        language: "en",
        body: "Single-origin, roasted Tuesday. Tasted like blueberry jam. The barista is staring at you. Walk in before noon.",
      },
    ],
    bestFor: ["tofu", "mofu"],
  },
  {
    id: "pas",
    name: "Problem-Agitate-Solution",
    acronym: "PAS",
    description: "Direct-response classic. Best for delivery, weekday-fill, and conversion campaigns where the audience has a felt pain point.",
    beats: [
      { step: "Problem", instruction: "Specific friction in the audience's day (hunger, boredom, repetition, time pressure)." },
      { step: "Agitate", instruction: "Twist the knife — cold fries, same 8 places on the app, lukewarm coffee." },
      { step: "Solution", instruction: "Be specific. Restaurant name + concrete promise." },
    ],
    examples: [
      {
        cuisine: "burger",
        language: "en",
        body: "Hungry. Tired. Friday. → Talabat is showing you the same 8 places. Fries always arrive cold. → Glaze does not. Hot in 22 min. Tap to order.",
      },
      {
        cuisine: "fine_dining",
        language: "en",
        body: "Thursday night dinner shouldn't feel like another work meeting. → Chain restaurants. Loud music. A menu you've memorized. → 12 seats. One chef. A 9-course tasting that took 2 years to design.",
      },
      {
        cuisine: "khaleeji",
        language: "ar",
        body: "تعبت من الأكل العادي؟ كل مطعم بنفس الذوق؟ تعال مجلس الزعفران – أكل إماراتي بيت.",
      },
    ],
    bestFor: ["bofu", "mofu"],
  },
  {
    id: "fab",
    name: "Feature-Advantage-Benefit",
    acronym: "FAB",
    description: "Best for menu-item descriptions, dish hero ads, and carousel cards.",
    beats: [
      { step: "Feature", instruction: "What it physically is (cut, ingredient, technique)." },
      { step: "Advantage", instruction: "Why this differs from competitors (sourcing, time, ratio)." },
      { step: "Benefit", instruction: "What the diner experiences." },
    ],
    examples: [
      {
        cuisine: "burger",
        language: "en",
        body: "Feature: A5 wagyu, dry-aged 28 days. Advantage: 2x marbling of standard prime. Benefit: It melts. You don't chew, you experience.",
      },
      {
        cuisine: "manakish",
        language: "en",
        body: "Feature: Stone oven, 480°C. Advantage: 90-second bake. Benefit: Crisp bottom, soft crumb — like Beirut, not a delivery box.",
      },
      {
        cuisine: "mandi",
        language: "en",
        body: "Feature: 7 courses for 4 people, AED 320. Advantage: AED 80/person vs AED 145 hotel buffet. Benefit: Family Iftar without the food coma or the bill shock.",
      },
    ],
    bestFor: ["mofu", "bofu"],
  },
  {
    id: "four_us",
    name: "The 4 Us",
    acronym: "4U",
    description: "Useful, Urgent, Unique, Ultra-specific. The headline framework — works for static posters, ad headlines, search descriptions.",
    beats: [
      { step: "Useful", instruction: "Concrete benefit." },
      { step: "Urgent", instruction: "Time bound — date, day, deadline." },
      { step: "Unique", instruction: "What only this restaurant does." },
      { step: "Ultra-specific", instruction: "Number, neighborhood, count." },
    ],
    examples: [
      {
        cuisine: "fine_dining",
        language: "en",
        body: "The only 12-seat omakase in town (book by Friday — last 2 seats this month)",
      },
      {
        cuisine: "mandi",
        language: "en",
        body: "Iftar for 4 at AED 295 — set menu of 9 dishes, ends Sunday at the City Walk branch",
      },
      {
        cuisine: "mandi",
        language: "ar",
        body: "أكبر صحن مندي بالمدينة لـ٦ أشخاص، بـ٢٤٩ درهم — حتى الجمعة فقط",
      },
    ],
    bestFor: ["bofu"],
  },
  {
    id: "direct_response_classic",
    name: "Big Promise / Bigger Promise / Proof / CTA",
    description: "Direct-response classic. Best for delivery and discount-driven Meta/TikTok ads.",
    beats: [
      { step: "Big Promise", instruction: "The headline claim (e.g., 'best burger in your area'). Adapt to the restaurant's actual city." },
      { step: "Bigger Promise", instruction: "The mechanic ('AED 45 delivered in 22 min')." },
      { step: "Proof", instruction: "Quantified social proof." },
      { step: "CTA", instruction: "One action." },
    ],
    examples: [
      {
        cuisine: "burger",
        language: "en",
        body: "The best burger in your neighborhood. AED 45 delivered, hot in 22 min. 4.9★ on Talabat — 1,800+ orders this month. Tap to order on Talabat →",
      },
    ],
    bestFor: ["bofu"],
  },
  {
    id: "storytelling_arc_6_beat",
    name: "6-Beat Short-Form Storytelling",
    description: "For 15-30s video ads with narrative arc. Used for founder origin, dish stories, single-day campaigns.",
    beats: [
      { step: "Hook (1s)", instruction: "Surprising visual or claim." },
      { step: "Normal world (2-3s)", instruction: "Setup — what was true before." },
      { step: "Disruption (3-5s)", instruction: "The twist — what changed." },
      { step: "Struggle (5-10s)", instruction: "Tension — the journey." },
      { step: "Resolution (10-15s)", instruction: "The product as answer." },
      { step: "CTA (15s)", instruction: "Action." },
    ],
    examples: [
      {
        cuisine: "indian",
        language: "en",
        body: "1) 'My grandmother's biryani recipe almost died with her.' 2) Her kitchen in Hyderabad. 1962. Charcoal smoke. 14 hours. 3) I moved to Dubai. The biryanis here? Nothing like hers. 4) 200 attempts. The lamb wouldn't fall. The rice wouldn't separate. 5) Then we found her notebook. 6) Bait Hyderabad. Marina. Open Thursday.",
      },
    ],
    bestFor: ["tofu", "mofu"],
  },
  {
    id: "founder_origin_template",
    name: "Founder/Origin Template",
    description: "Humanize the brand. Long-form caption template that pairs with the founder-origin video archetype.",
    beats: [
      { step: "I [opened/started] [this place]", instruction: "Personal hook." },
      { step: "because [personal reason]", instruction: "Rooted in food memory or frustration." },
      { step: "Most [type of food] in [city] is [problem]", instruction: "Set the contrast." },
      { step: "Ours is [specific differentiator]", instruction: "Our claim." },
      { step: "We [unusual practice]", instruction: "Hand-pull, ferment 72hr, source from one farm." },
      { step: "You'll taste it the first bite", instruction: "Sensory close." },
    ],
    examples: [
      {
        cuisine: "khaleeji",
        language: "en",
        body: "I opened Bait Najdi because my mother's harees recipe was being forgotten. Most Najdi food in Riyadh comes from a freezer. Ours is wheat-stoned every dawn. We slow-cook the lamb 9 hours. You'll taste it the first bite.",
      },
    ],
    bestFor: ["tofu", "mofu"],
  },
  {
    id: "social_proof_review_headline",
    name: "Review-as-Headline (Social Proof Leverage)",
    description: "Pull a verbatim guest review and use it as the headline. Body shows 3 more 5★ snippets + dish hero + CTA.",
    beats: [
      { step: "Headline", instruction: "Verbatim review quote in quotes — pick a vivid one." },
      { step: "Attribution", instruction: "First name + source (Google, Talabat, Tripadvisor)." },
      { step: "Body", instruction: "3 more short positive snippets." },
      { step: "CTA", instruction: "Reservation or order." },
    ],
    examples: [
      {
        cuisine: "kunafa",
        language: "en",
        body: "\"I'd fly back to Dubai just for this kunafa.\" — Sara, 5★ Google review. \"Best in the city.\" — Mohammed. \"My dad cried.\" — Layla. \"Cheese pull is not a meme — it's real.\" — Yousef. Reserve via WhatsApp →",
      },
    ],
    bestFor: ["mofu", "bofu"],
  },
  {
    id: "curiosity_gap",
    name: "Curiosity Gap",
    description: "Open with a question or partial reveal that the body fulfills.",
    beats: [
      { step: "The gap", instruction: "Question or claim with a missing piece." },
      { step: "The fulfillment", instruction: "Reveal in the next line/scene." },
    ],
    examples: [
      {
        cuisine: "premium_casual",
        language: "en",
        body: "You won't believe what they do with the bread basket at Em Sherif. (Hint: it's not bread.)",
      },
    ],
    bestFor: ["tofu"],
  },
  {
    id: "loss_aversion",
    name: "Loss Aversion",
    description: "Frame around what the diner stands to miss — works for LTOs, seasonal menus, last-of-X moments.",
    beats: [
      { step: "Stake", instruction: "What's leaving (mango season, the menu, the offer)." },
      { step: "Time", instruction: "Specific date." },
      { step: "Action", instruction: "How to lock it in." },
    ],
    examples: [
      {
        cuisine: "dessert",
        language: "en",
        body: "3 days left of mango season. After May 28, it's gone for a year.",
      },
      {
        cuisine: "mandi",
        language: "ar",
        body: "آخر أسبوع لقائمة إفطار المطعم — بعد العيد بترجع للقائمة العادية",
      },
    ],
    bestFor: ["bofu"],
  },
  {
    id: "listicle",
    name: "Listicle / Numbered",
    description: "Save-bait. Numbered reasons or items.",
    beats: [
      { step: "Headline", instruction: "Number + claim." },
      { step: "Body", instruction: "Numbered list." },
    ],
    examples: [
      {
        cuisine: "lebanese",
        language: "en",
        body: "5 reasons people drive to Sharjah just for our musakhan.",
      },
    ],
    bestFor: ["mofu"],
  },
  {
    id: "comparison",
    name: "Comparison / Differentiation",
    description: "The 'only X in [city] that Y' framing — confidence-projecting.",
    beats: [
      { step: "Differentiator", instruction: "What only you do." },
      { step: "Substantiation", instruction: "Why it matters." },
    ],
    examples: [
      {
        cuisine: "premium_casual",
        language: "en",
        body: "The only restaurant in JBR that grills its lamb on charcoal, not gas.",
      },
      {
        cuisine: "fine_dining",
        language: "en",
        body: "Most omakase in Dubai is 12 courses for AED 800. Ours is 9 courses for AED 350 — and we own the boat.",
      },
    ],
    bestFor: ["mofu"],
  },
  {
    id: "reverse_pitch",
    name: "Reverse Pitch (Anti-Hype)",
    description: "Refuse the hype playbook. Opinionated, focused.",
    beats: [
      { step: "Refusals", instruction: "What you don't do." },
      { step: "Commitment", instruction: "What you do." },
    ],
    examples: [
      {
        cuisine: "manakish",
        language: "en",
        body: "We don't do brunch. We don't do delivery. We don't do shisha. We do one thing: the best Manakish in the UAE. Open 6am-2pm. Closed Sundays. Walk in.",
      },
    ],
    bestFor: ["mofu", "bofu"],
  },
];

// =============================================================================
// BILINGUAL CAPTION PATTERNS — UAE/GCC norms
// =============================================================================

export const bilingualPatterns = {
  "arabic-on-top": {
    description: "Hero creative conceived in Arabic; English subtitle line below.",
    bestFor: ["KSA Khaleeji-targeted", "Sharjah", "Qatar", "Kuwait", "Bahrain"],
    layout: `[Arabic headline]
[Arabic body line]
[Arabic CTA + phone]

[English headline]
[English body line]
[English CTA + phone]`,
  },
  "english-on-top": {
    description: "English headline; Arabic subtext below.",
    bestFor: ["Dubai Marina/JBR/DIFC", "Doha West Bay", "Cairo cosmopolitan", "Beirut", "Amman"],
    layout: `[English headline]
[English body line]
[English CTA]

[Arabic headline]
[Arabic body line]
[Arabic CTA]`,
  },
  "arabic-only": {
    description: "Pure Arabic, no English.",
    bestFor: ["KSA conservative regions", "Egypt outside Cairo", "Jordan outside Amman", "All-Khaleeji influencer placements"],
  },
  "english-only": {
    description: "Pure English.",
    bestFor: ["Tourist-heavy Dubai/Doha hotels", "Lebanon Christian-area F&B", "Expat-only events"],
  },
} as const;

// =============================================================================
// STANDARD BOOKING / ORDER CTA LINE FORMAT
// =============================================================================

export const standardCtaBlock = {
  uae: {
    en: `Open daily 12 PM – 1 AM
[Address, Building, Emirate]
WhatsApp +971 XX XXX XXXX
Order via Talabat / Careem / Deliveroo`,
    ar: `يومياً 12 ظهراً - 1 صباحاً
[العنوان، المبنى، الإمارة]
واتساب +971 XX XXX XXXX
اطلب من تلاباط / كريم / ديليفروو`,
  },
  ksa: {
    en: `Open daily 12 PM – 1 AM
[Address, City, KSA]
WhatsApp +966 5X XXX XXXX
Order via Jahez / HungerStation / Mrsool`,
    ar: `يومياً 12 ظهراً - 1 صباحاً
[العنوان، المدينة]
واتساب +966 5X XXX XXXX
اطلب من جاهز / هنقرستيشن / مرسول`,
  },
  qatar: {
    en: `Open daily 12 PM – 1 AM
[Address, Doha]
WhatsApp +974 XXXX XXXX
Order via Snoonu / Talabat`,
    ar: `يومياً 12 ظهراً - 1 صباحاً
[العنوان، الدوحة]
واتساب +974 XXXX XXXX
اطلب من سنونو / تلاباط`,
  },
} as const;
