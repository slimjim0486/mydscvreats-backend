// Step-by-step Meta Ads Manager upload guide.
// Markdown — opens in any text editor / GitHub / Notion.

import { campaignArchetypes, type CampaignType, type CountryCode } from "@/services/ad-studio";
import { getCountryRuleFootnote } from "./audience-builder";

interface GuideInput {
  projectName: string;
  restaurantName: string;
  campaignType: CampaignType;
  countries: CountryCode[];
  budgetAed: number;
  durationWeeks: number | null;
  variantCount: number;
  destinationUrl: string;
}

export function buildUploadGuide(input: GuideInput): string {
  const archetype = campaignArchetypes.find((c) => c.id === input.campaignType);
  const dailyAed = Math.round(input.budgetAed / ((input.durationWeeks ?? 4) * 7));

  return [
    `# Meta Ads Manager Upload Guide`,
    `**Project:** ${input.projectName}`,
    `**Restaurant:** ${input.restaurantName}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "Bustan exported your campaign as a Meta-ready bundle. Follow these steps to launch.",
    "Total time: ~10 minutes if you have a Meta Business Account already connected.",
    "",
    "---",
    "",
    "## What's in this ZIP",
    "",
    "```",
    `meta-campaign.json           # The full campaign + ad sets + ads structure`,
    `audiences/                   # Saved Audience descriptors (one .json per recipe)`,
    `creatives/                   # Per-variant images in 4 Meta-required aspect ratios`,
    `  ├─ variant-1/`,
    `  │   ├─ hero-9x16.jpg       # Reels, Stories, CTWA`,
    `  │   ├─ hero-4x5.jpg        # Feed (mobile-best)`,
    `  │   ├─ hero-1x1.jpg        # Carousel, Square`,
    `  │   ├─ hero-191x1.jpg      # Audience Network, PMax landscape`,
    `  │   └─ creative.json       # Per-variant copy + bilingual text`,
    `  └─ ...                     # one folder per variant`,
    `tracking/                    # Pixel & Conversions API recommendations`,
    `manifest.json                # Index of everything in the bundle`,
    `upload-guide.md              # This file`,
    "```",
    "",
    "---",
    "",
    "## Step 1 — Open Meta Ads Manager",
    "",
    `1. Go to [Ads Manager](https://www.facebook.com/adsmanager) on your laptop (mobile is unreliable for bulk operations).`,
    `2. Confirm the Business Account dropdown shows ${input.restaurantName}'s Page.`,
    "",
    "## Step 2 — Create the audiences",
    "",
    `Open \`audiences/audiences.csv\` in Excel / Numbers / Sheets. Open Ads Manager → Audiences → Create audience → Saved audience.`,
    "",
    `For each row in the CSV: paste the **Audience Name**, set **Locations** to the listed countries, set **Age** range, paste the **Detailed Targeting** interests. Save each one — you'll reference them in Step 4.`,
    "",
    `Full step-by-step: \`audiences/README.md\`.`,
    "",
    `${getCountryRuleFootnote(input.countries)}`,
    "",
    "## Step 3 — Create the campaign",
    "",
    `1. Click **Create** in Ads Manager.`,
    `2. Choose objective: **${objectiveLabel(input.campaignType)}**.`,
    `3. Campaign name: \`${input.projectName}\` (or paste from \`meta-campaign.json\` → \`campaign.name\`).`,
    `4. Set status: **Paused** (we'll un-pause after review).`,
    `5. Special ad categories: leave empty unless your offer falls under credit/employment/housing/social-issues — restaurants don't.`,
    "",
    "## Step 4 — Create the ad sets",
    "",
    `Open \`meta-campaign.json\` → \`ad_sets\` array. For each ad set:`,
    "",
    `1. Click **+ Ad set** in your campaign.`,
    `2. Set the ad set name from \`name\`.`,
    `3. Daily budget: AED ${dailyAed}/day (=\`daily_budget_minor_units\` ÷ 100).`,
    `4. Schedule: set start + end dates (Bustan estimates ${input.durationWeeks ?? 4} weeks).`,
    `5. Audience: pick the Saved Audience you created in Step 2.`,
    `6. Optimization & delivery: set per the JSON's \`optimization_goal\` and \`billing_event\`.`,
    `7. Placements: leave **Advantage+ Placements** ON unless you have a specific reason.`,
    `8. If targeting Saudi Arabia, also enable Snapchat as a placement (open separate Snap Ads Manager — Bustan exports a Meta bundle only).`,
    "",
    "## Step 5 — Create the ads (variants)",
    "",
    `Bustan generated ${input.variantCount} variants. Each becomes one ad inside the ad set:`,
    "",
    `1. Click **+ Ad** in your ad set.`,
    `2. Use **Single Image or Video** format.`,
    `3. **Fastest path**: upload \`creatives/variant-N/hero-1x1.jpg\` and Meta auto-fits all placements. **Pixel-perfect path**: upload all four (\`hero-9x16\` for Reels/Stories, \`hero-4x5\` for Feed, \`hero-1x1\` for Carousel/Square, \`hero-191x1\` for Audience Network).`,
    `4. Paste the \`bustan_copy_variants.en\` from each variant's \`creative.json\` into the headline + primary text + description fields.`,
    `5. CTA: select per the variant's \`call_to_action.type\` (e.g., **WHATSAPP_MESSAGE**, **ORDER_NOW**, **GET_OFFER**).`,
    `6. Destination URL: \`${input.destinationUrl}\`.`,
    `7. For **Arabic variants**: create a duplicate ad with the \`bustan_copy_variants.ar\` text, OR use Meta's Multi-language ads feature.`,
    "",
    "## Step 6 — Sanity check before spending money",
    "",
    "Before you click **Active**, take 60 seconds to confirm:",
    "",
    `- **Daily budget**: AED ${dailyAed}/day. Total over ${input.durationWeeks ?? 4} weeks ≈ **AED ${input.budgetAed.toLocaleString()}**. Is that the number you signed off on?`,
    `- **Destination URL works on a phone**: open ${input.destinationUrl} on your mobile. Does it load? Does WhatsApp open if it's a wa.me link?`,
    `- **Page selected** is your real Page (not a personal account or test page).`,
    `- **Ad preview** matches what you approved in Bustan — Arabic renders right-to-left, hero image isn't squished.`,
    `- **Pause-trigger** in your head: if frequency hits 3.5 in 48h or CTR drops > 30% week-over-week, pause and email support@getbustan.com.`,
    "",
    "If anything's off, fix it before you un-pause. The first 48 hours of spend train Meta's algorithm — wasted budget here costs you 2x later.",
    "",
    "## Step 7 — Connect Pixel & Conversions API (if running for Sales/Leads)",
    "",
    `Open \`tracking/meta-pixel-events.md\`. Configure your Meta Pixel + CAPI on the ad set's tracking section.`,
    "",
    `For CTWA (Click-to-WhatsApp) campaigns, no Pixel is needed — Meta tracks the conversation natively.`,
    "",
    "## Step 8 — Review and un-pause",
    "",
    `1. Go to your campaign → Preview each ad. Confirm the image, headline, primary text, and CTA all look right.`,
    `2. Confirm Arabic variants render right-to-left correctly.`,
    `3. Confirm the destination URL works on a phone (most clicks are mobile).`,
    `4. Set the campaign status to **Active**.`,
    "",
    "## Step 9 — Watch the first 48 hours",
    "",
    archetype
      ? `KB benchmarks for **${archetype.name}** (Bustan):
- CTR: ${archetype.benchmarks.ctrPct?.[0] ?? "?"}–${archetype.benchmarks.ctrPct?.[1] ?? "?"}%
- CPM: AED ${archetype.benchmarks.cpmAed?.[0] ?? "?"}–${archetype.benchmarks.cpmAed?.[1] ?? "?"}
- CPA: AED ${archetype.benchmarks.cpaAed?.[0] ?? "?"}–${archetype.benchmarks.cpaAed?.[1] ?? "?"}
${archetype.benchmarks.roas ? `- ROAS: ${archetype.benchmarks.roas[0]}x–${archetype.benchmarks.roas[1]}x` : ""}`
      : "Watch CTR, CPM, and CPA against your baseline.",
    "",
    "**Kill criteria** (per Bustan KB pacing rules):",
    "- Frequency > 3.5",
    "- 7-day CTR decay > 30%",
    "- 14-day CPA inflation > 40%",
    "- Save-rate trending zero on Reels/TikTok placements",
    "",
    "**Scaling**: increase budget by ≤20% every 3-4 days while CPA holds.",
    "",
    "**Refresh creative**: every 14-21 days for evergreen, every 7 days during a 4-week intensive.",
    "",
    "---",
    "",
    "## Common gotchas",
    "",
    "- **No Pixel ID embedded**: Bustan doesn't know your Pixel. Add it manually under Tracking.",
    "- **Page ID placeholder**: every ad's \`object_story_spec.page_id\` says \`<<REPLACE_WITH_YOUR_META_PAGE_ID>>\`. Ads Manager populates this automatically when you select your Page.",
    "- **CTWA destination**: if your CTA is WHATSAPP_MESSAGE, set the Page-attached WhatsApp number in Meta Business Settings — Bustan can't embed it in JSON.",
    "- **Saudi placements**: Snapchat is a separate platform — Bustan's Meta bundle covers IG/FB/Audience Network only.",
    "- **Approval delays**: ads with food + family imagery sometimes get held for review in KSA placements; 12-48 hours is normal.",
    "",
    "---",
    "",
    "## Need help?",
    "",
    "Email support@getbustan.com or message us on WhatsApp from your Bustan dashboard.",
    "",
    "Generated by Bustan Ad Creative Studio.",
  ].join("\n");
}

function objectiveLabel(campaignType: CampaignType): string {
  switch (campaignType) {
    case "delivery_acquisition":
      return "Sales (Outcome → Sales)";
    case "catering_corporate_lead_gen":
      return "Leads (Outcome → Leads)";
    case "soft_launch_awareness":
      return "Awareness (Outcome → Awareness)";
    default:
      return "Engagement (Outcome → Engagement) or Leads — pick based on whether you're driving WhatsApp messages or website conversions";
  }
}

export function buildPixelEventsGuide(): string {
  return [
    "# Meta Pixel + Conversions API events",
    "",
    "## Recommended events for restaurant campaigns",
    "",
    "| Event | When to fire | Where |",
    "|---|---|---|",
    "| `PageView` | User lands on your Bustan menu page | Auto (Pixel) |",
    "| `ViewContent` | User scrolls / views a dish detail | Auto (Pixel) |",
    "| `Lead` | User clicks WhatsApp / books a table | Custom (Conversions API) |",
    "| `Schedule` | User confirms reservation date | Custom (Conversions API) |",
    "| `Purchase` | Order placed via aggregator | Custom (Conversions API) — webhook from Talabat/Careem/Deliveroo |",
    "",
    "## Why CAPI matters in 2026",
    "",
    "iOS 18+ and AdAttributionKit reduce browser-pixel attribution by 50-70%.",
    "Server-side Conversions API recovers most of that loss. Bustan's Phase 4",
    "autopilot will fire CAPI events automatically; until then, configure",
    "manually under your ad set's Tracking section in Ads Manager.",
    "",
    "## Setup",
    "",
    "1. Ads Manager → Events Manager → Connect data sources → Web → Pixel.",
    "2. Pixel ID: copy from Events Manager dashboard.",
    "3. CAPI: Events Manager → Settings → Conversions API → Set up manually.",
    "4. Add Pixel ID to your campaign's ad set under Tracking.",
    "",
    "Bustan menu pages already include the Pixel snippet — your owner dashboard's",
    "site-tracking section walks you through verification.",
  ].join("\n");
}
