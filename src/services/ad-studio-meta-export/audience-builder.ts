// Meta Saved Audience builder.
//
// We don't (and shouldn't) ship hashed Custom Audience CSVs from Bustan in
// Phase 2A — that requires opt-in customer-data export with PDPL/GDPR
// consent we haven't built yet. Phase 4 autopilot will sync via Meta
// Conversions API.
//
// What we DO ship: a single `audiences.csv` an owner can open in Excel /
// Numbers / Google Sheets and copy values from while creating Saved Audiences
// in Ads Manager. Plus a README walkthrough.
//
// Why CSV not JSON: Meta has no Saved-Audience JSON import. JSON files were a
// confession that the format pretended to be machine-uploadable. The owner is
// the consumer here — they need a tabular reference, not a JSON tree.

import { audienceRecipes, countryRules, type CountryCode } from "@/services/ad-studio";

export interface SavedAudienceFile {
  filename: string;
  content: string;
}

interface BuildAudienceInput {
  recipeIds: string[];
  countries: CountryCode[];
}

export function buildSavedAudienceFiles(input: BuildAudienceInput): SavedAudienceFile[] {
  const recipes = input.recipeIds
    .map((id) => audienceRecipes.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r) && r!.platform === "meta");

  // Single CSV that opens in Excel / Numbers / Google Sheets.
  const csv = buildAudienceCsv(recipes, input.countries);
  const readme = buildAudienceReadme(recipes, input.countries);

  return [
    { filename: "audiences/audiences.csv", content: csv },
    { filename: "audiences/README.md", content: readme },
  ];
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildAudienceCsv(
  recipes: typeof audienceRecipes,
  countries: CountryCode[]
): string {
  const header = [
    "Audience Name",
    "Recipe ID",
    "Countries",
    "Age Min",
    "Age Max",
    "Detailed Targeting (paste into Ads Manager)",
    "Best For",
    "Custom Audience?",
    "Scaling Notes",
    "Setup Description",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of recipes) {
    const interestSuggestions = extractInterestsFromSetup(r.setup);
    const isCustom =
      r.id.includes("whatsapp_engagers") ||
      r.id.includes("page_visitors") ||
      r.id.includes("lookalike");
    lines.push(
      [
        r.name,
        r.id,
        countries.join(" + "),
        "22",
        "50",
        interestSuggestions.join(" | "),
        r.bestFor.join(", "),
        isCustom ? "Yes (Phase 4 autopilot will sync; manually rebuild from your CRM/Pixel for now)" : "No",
        r.scalingNotes ?? "",
        r.setup,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

function extractInterestsFromSetup(setup: string): string[] {
  const m = setup.match(/Interest[s]?:\s*([^.]+)/i);
  if (!m) return ["Restaurants", "Foodie"];
  return m[1]!
    .split(/[,/]/)
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter((s) => s.length > 1)
    .slice(0, 6);
}

function buildAudienceReadme(
  recipes: typeof audienceRecipes,
  countries: CountryCode[]
): string {
  const lines: string[] = [
    "# Audiences",
    "",
    "Bustan ships your campaign's recommended audiences as a single CSV you can",
    "open in Excel, Numbers, or Google Sheets. Meta does NOT support direct",
    "Saved-Audience import — Bustan gives you the targeting fields, you click",
    "through Ads Manager once.",
    "",
    "## Steps",
    "",
    "1. Open `audiences.csv` in Excel / Numbers / Google Sheets.",
    "2. Open Ads Manager → Audiences.",
    "3. Click **Create audience → Saved audience**.",
    "4. For each row in the CSV:",
    "   a. Paste the **Audience Name** column.",
    "   b. Set **Locations** to the **Countries** column.",
    "   c. Set **Age** to **Age Min**–**Age Max**.",
    "   d. Under **Detailed Targeting**, paste the interests from the **Detailed Targeting** column (comma-separated).",
    "   e. Click **Create**. Repeat for each row.",
    "",
    "5. In your campaign's ad sets, select the matching Saved Audience by name.",
    "",
    `## Targeted countries: ${countries.join(", ")}`,
    "",
    `## Recipes in this bundle: ${recipes.length}`,
    "",
    ...recipes.map((r) => `- **${r.name}** — ${r.setup.slice(0, 100)}${r.setup.length > 100 ? "…" : ""}`),
    "",
    "## Custom Audiences (Phase 4)",
    "",
    "Custom Audiences from your WhatsApp engagers, menu-page visitors, or POS",
    "customer list are NOT included — they require PDPL/GDPR-compliant consent",
    "flows we haven't shipped yet. Phase 4 (autopilot) will sync them via Meta",
    "Conversions API once you connect your Business Account. Rows in the CSV",
    "marked **Custom Audience? = Yes** require you to rebuild them manually",
    "from your own first-party data for now.",
  ];

  if (countries.includes("SA")) {
    lines.push(
      "",
      "## ⚠ KSA targeting note",
      "",
      "Saudi Arabia is in your target list. Confirm before launching:",
      "- No alcohol references in copy or imagery",
      "- Modesty rules respected (no bare shoulders/midriff/thighs)",
      "- Calorie disclosure where pricing claims are made",
      "Bustan's safety pass enforces these in copy; you're still responsible",
      "for the final ad set up in Ads Manager."
    );
  }

  // Country compliance reminder
  const ksaTargeted = countries.includes("SA");
  if (ksaTargeted) {
    lines.push(
      "",
      "## ⚠ KSA targeting note",
      "",
      "Saudi Arabia is in your target list. Meta will route your ad through Snap-",
      "compatible content reviews when relevant. Confirm:",
      "- No alcohol references in copy or imagery",
      "- Modesty rules respected (no bare shoulders/midriff/thighs)",
      "- Calorie disclosure where pricing claims are made",
      "Bustan's safety pass enforces these in copy; you're still responsible for",
      "the final ad set up in Ads Manager."
    );
  }

  return lines.join("\n");
}

/**
 * Lightweight country-rule footnote for the upload guide.
 */
export function getCountryRuleFootnote(countries: CountryCode[]): string {
  const rules = countries
    .map((c) => countryRules.find((r) => r.country === c))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (rules.length === 0) return "";
  return rules
    .map(
      (r) =>
        `- **${r.country}**: alcohol ${r.alcoholImagery}, modesty ${r.modestyLevel}, calorie disclosure ${r.calorieDisclosureRequired ? "required" : "n/a"}, primary dialect ${r.primaryDialect}.`
    )
    .join("\n");
}
