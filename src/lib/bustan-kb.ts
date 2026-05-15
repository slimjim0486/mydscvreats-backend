/**
 * Bustan Knowledge Base — compact, customer-safe snippets surfaced to Sous Chef
 * (and any other diner-facing assistant) so it can answer occasional questions
 * about Bustan itself when a diner asks.
 *
 * Keep this file lean: every word lives in the system prompt context window of
 * every Sous Chef call. The full deep KB lives in `docs/knowledge-base/` and
 * the customer-facing rendered version is at /help and /faq.
 *
 * Topics must stay in sync with the public /faq and /help pages. If a feature
 * ships or a price changes, update here too so Sous Chef gives the same
 * answer the public pages do.
 */

export type BustanKbTopic =
  | "overview"
  | "pricing"
  | "trial"
  | "signup"
  | "ai_features"
  | "menu_import"
  | "public_page"
  | "whatsapp"
  | "whatsapp_compliance"
  | "languages"
  | "data_privacy"
  | "refunds"
  | "support"
  | "for_owners";

interface BustanKbEntry {
  topic: BustanKbTopic;
  summary: string;
  links?: string[];
}

export const BUSTAN_KB: Record<BustanKbTopic, BustanKbEntry> = {
  overview: {
    topic: "overview",
    summary:
      "Bustan is a growth platform built for UAE restaurants. It hosts a beautiful public menu page (like the one you're looking at), and gives the restaurant owner tools to keep diners coming back via WhatsApp campaigns, AI-generated ads, and SEO. Bustan is a trading name of Jasmine Entertainment FZE in Sharjah Publishing City, UAE.",
    links: ["https://getbustan.com", "https://getbustan.com/help"],
  },
  pricing: {
    topic: "pricing",
    summary:
      "Bustan has three public plans, all in AED through Stripe: Draft is free for building privately. Pro is AED 299.99 per month for one restaurant ready to publish. Portfolio is AED 499.99 per month flat for up to 3 brands, with AED 99 per extra brand. Enterprise (4+ brands, white-label, SLAs) is custom. All paid plans include a 14-day free trial of full Pro features.",
    links: ["https://getbustan.com/#pricing", "https://getbustan.com/faq"],
  },
  trial: {
    topic: "trial",
    summary:
      "Bustan offers a 14-day free trial of full Pro features with no credit card required. Restaurants get a reminder email 3 days before it ends. If they don't pick a plan, their page goes back to Draft (private) and their data is kept.",
    links: ["https://getbustan.com/faq"],
  },
  signup: {
    topic: "signup",
    summary:
      "Any restaurant owner can list their restaurant on Bustan by going to getbustan.com and clicking 'List Your Restaurant'. Onboarding takes about 10-15 minutes: sign up, upload your menu (PDF, photo, or text), review the AI extraction, pick photos, choose a theme, and publish.",
    links: ["https://getbustan.com/dashboard", "https://getbustan.com/help#getting-started"],
  },
  ai_features: {
    topic: "ai_features",
    summary:
      "Bustan ships several AI features for restaurant owners: AI menu extraction from PDFs/photos, AI dish image generation, photo enhancement for uploaded shots, an AI description writer, a dietary tagger (vegan, halal, gluten-free, etc.), a Menu Insights scorecard, an Ad Creative Studio for Meta ads, a weekly Sabt Pack of 7 social posts, and AI assistants — Sous Chef (for diners, on the public page) and Owner Chat (for the owner, in the dashboard). All AI runs on Anthropic Claude (text) and Google Gemini / OpenAI (images). Anthropic does not train its models on Bustan customer data.",
    links: ["https://getbustan.com/help#ai", "https://getbustan.com/help#marketing"],
  },
  menu_import: {
    topic: "menu_import",
    summary:
      "Bustan can import a restaurant's existing menu from a PDF (up to 8 pages), JPG/PNG/WebP photo, or pasted text. The AI extracts sections, dish names, descriptions, and prices. The owner reviews the draft before it commits to the live menu.",
    links: ["https://getbustan.com/help#menu"],
  },
  public_page: {
    topic: "public_page",
    summary:
      "Every restaurant on Bustan gets a hosted page at getbustan.com/their-slug, with their menu, photos, dietary tags, operating hours, an 'Open now' badge, a WhatsApp CTA, delivery app links, promotions, and (on Pro+) the Sous Chef chat you're using right now. The page is mobile-first and Google-friendly out of the box.",
    links: ["https://getbustan.com/help#public-page"],
  },
  whatsapp: {
    topic: "whatsapp",
    summary:
      "Bustan offers two levels of WhatsApp. The free click-to-WhatsApp button opens a pre-filled message to the restaurant's number. On Pro and Portfolio, restaurants can connect their real WhatsApp Business Account via Meta's Embedded Signup to use Bustan as their WhatsApp inbox, template manager, and campaign tool. Bustan is the registered Meta Tech Provider; restaurants own their number and can disconnect anytime. WhatsApp messaging fees are billed by Meta directly to the restaurant — Bustan does not mark up.",
    links: ["https://getbustan.com/help#whatsapp"],
  },
  whatsapp_compliance: {
    topic: "whatsapp_compliance",
    summary:
      "WhatsApp marketing has strict rules and Meta will throttle, demote, or ban numbers that spam. Core rules: (1) Only message customers who explicitly opted in — never scraped lists or POS exports without confirmation. (2) Keep marketing to ≤ 1–2 messages per customer per week; daily marketing gets numbers blocked. (3) After 24 hours of customer silence you can only message via approved templates; freeform text only works inside the 24-hour customer-service window. (4) Categorise templates correctly — Utility for confirmations/updates, Marketing for promos; mis-categorising is a fast way to get an account flagged. (5) Watch your Meta quality rating: Green is healthy, Yellow means pause campaigns immediately, Red means stop sending and let it recover over 7 clean days. Bustan automates: opted-in-only filtering on every campaign, permanent opt-out on STOP keywords, per-(customer, template) frequency cap, daily tier-budget reservation, and correctly-categorised pre-shipped templates. The owner is responsible for getting honest opt-in, choosing reasonable frequency, monitoring quality rating, and warming up new numbers. Full guidance and recovery playbook: getbustan.com/help#whatsapp-compliance and getbustan.com/faq.",
    links: [
      "https://getbustan.com/help#whatsapp-compliance",
      "https://getbustan.com/faq#whatsapp-compliance",
    ],
  },
  languages: {
    topic: "languages",
    summary:
      "Today Bustan's dashboard and public menu pages render in English. Full Arabic menu fields and an Arabic public-page toggle are on the active product roadmap.",
  },
  data_privacy: {
    topic: "data_privacy",
    summary:
      "Bustan complies with UAE Federal Decree-Law No. 45 of 2021 (UAE PDPL). Data is stored on Railway (Postgres, US) and Cloudflare R2; authentication is via Clerk; payments are handled by Stripe (PCI DSS Level 1); WhatsApp tokens are encrypted at rest. Diner data on a public page is limited to anonymous analytics. The full privacy policy is at getbustan.com/privacy and data deletion requests can be made at getbustan.com/data-deletion or support@getbustan.com.",
    links: ["https://getbustan.com/privacy", "https://getbustan.com/data-deletion"],
  },
  refunds: {
    topic: "refunds",
    summary:
      "Fees already paid for a Bustan subscription are generally non-refundable, except where UAE consumer-protection law requires a refund or where Bustan materially reduces features the customer paid for (notify within 14 days). Cancellations stop renewal — the plan stays active until the end of the paid period. Goodwill refunds are handled case-by-case by emailing support@getbustan.com.",
    links: ["https://getbustan.com/terms", "https://getbustan.com/faq"],
  },
  support: {
    topic: "support",
    summary:
      "Bustan's support team can be reached at support@getbustan.com — usually a same-day reply on UAE business days. For deeper questions there's a public Knowledge Base at getbustan.com/help and an FAQ at getbustan.com/faq.",
    links: [
      "mailto:support@getbustan.com",
      "https://getbustan.com/help",
      "https://getbustan.com/faq",
    ],
  },
  for_owners: {
    topic: "for_owners",
    summary:
      "If a diner is themselves a restaurant owner who wants to list their restaurant on Bustan, point them to getbustan.com and the 'List Your Restaurant' button. The first 14 days are free, no credit card required, and most restaurants are live in under 15 minutes from sign-up.",
    links: ["https://getbustan.com", "https://getbustan.com/help#getting-started"],
  },
};

const TOPIC_KEYWORDS: Record<BustanKbTopic, string[]> = {
  overview: ["bustan", "what is", "what's bustan", "who made", "company"],
  pricing: ["price", "pricing", "cost", "how much", "plan", "subscription", "monthly", "aed", "portfolio plan", "pro plan"],
  trial: ["trial", "free trial", "14 day", "14-day", "try it"],
  signup: ["sign up", "signup", "join bustan", "register", "create account", "list my restaurant", "get on bustan"],
  ai_features: ["ai", "artificial intelligence", "claude", "anthropic", "gemini", "chatgpt", "openai", "owner chat", "ad studio", "sabt pack", "menu insights"],
  menu_import: ["menu import", "upload menu", "import pdf", "extract menu"],
  public_page: ["public page", "this page", "menu page", "restaurant page", "url", "slug", "embed"],
  whatsapp: ["whatsapp", "wa.me", "messaging", "crm", "meta tech provider"],
  whatsapp_compliance: [
    "blocked",
    "banned",
    "throttled",
    "quality rating",
    "quality score",
    "yellow",
    "red rating",
    "messaging tier",
    "daily limit",
    "tier limit",
    "template rejected",
    "spam",
    "opt-in",
    "opt in",
    "opted in",
    "consent",
    "frequency cap",
    "compliance",
    "meta rules",
    "whatsapp policy",
    "stop sending",
    "24 hour window",
    "24-hour window",
    "customer service window",
    "warm up",
    "warmup",
    "list import",
  ],
  languages: ["arabic", "english", "language", "translate", "bilingual", "rtl"],
  data_privacy: ["privacy", "data", "gdpr", "pdpl", "delete my data", "data deletion", "tracking", "cookies"],
  refunds: ["refund", "cancel", "cancellation", "money back"],
  support: ["support", "help", "contact", "email", "human"],
  for_owners: ["i own a restaurant", "i'm a restaurant", "list my", "add my restaurant", "i have a restaurant"],
};

export function resolveBustanTopic(query: string): BustanKbTopic | null {
  const lower = query.toLowerCase();

  let bestTopic: BustanKbTopic | null = null;
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as [
    BustanKbTopic,
    string[],
  ][]) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        // Longer keyword match wins
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestTopic = topic;
        }
      }
    }
  }

  return bestTopic;
}

export function getBustanKbEntry(topic: BustanKbTopic): BustanKbEntry {
  return BUSTAN_KB[topic];
}

export function getAllBustanTopics(): BustanKbTopic[] {
  return Object.keys(BUSTAN_KB) as BustanKbTopic[];
}
