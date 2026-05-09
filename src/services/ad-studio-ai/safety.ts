// Safety pass — enforces KB cultural rules deterministically before any AI output is shown.
// Run BEFORE returning copy to the user, and BEFORE generating an image.

import {
  countryRules,
  universalNoGoList,
  pricingDisplayRules,
  type CountryCode,
} from "@/services/ad-studio";
import type { CopyVariant, SafetyVerdict } from "./types";

interface SafetyInput {
  countries: CountryCode[];
  copy: CopyVariant;
  imagePrompt?: string;
}

// Patterns the AI must never produce (case-insensitive substring match against generated text).
const FORBIDDEN_PATTERNS_BASE: Array<{ pattern: RegExp; rule: string; severity: "error" | "warning"; suggestedFix?: string }> = [
  { pattern: /\bpork\b|\bbacon\b|\bham\b/i, rule: "Pork imagery/word — universally suppressed in MENA", severity: "error", suggestedFix: "Replace with halal alternative or remove the reference." },
  { pattern: /\bcasino\b|gambl(e|ing)/i, rule: "Gambling reference — avoid across MENA", severity: "error" },
  { pattern: /\bpride flag\b|\brainbow flag\b|🌈/, rule: "LGBTQ+ coded imagery — universally avoided in MENA placements", severity: "error" },
  { pattern: /\b(left hand)\b/i, rule: "Reference to left-hand eating — culturally inappropriate in MENA", severity: "error" },
  { pattern: /\bbelly dancer\b|belly[- ]dancing/i, rule: "Belly-dancer imagery — avoid for F&B in MENA", severity: "warning" },
  { pattern: /quran(ic)?\b/i, rule: "Quranic reference in commercial creative is taboo", severity: "error", suggestedFix: "Remove religious-text references from promotional copy." },
  { pattern: /\bkaaba\b|al-?haram/i, rule: "Holy-site imagery in commercial creative is taboo", severity: "error" },
];

// Alcohol patterns are conditional on country — they must NOT appear in copy/image when ANY of the
// targeted countries bans alcohol imagery. The KB countryRules table is the source of truth.
const ALCOHOL_PATTERN = /\b(beer|wine|champagne|cocktail|spirit|whisk(e)?y|vodka|gin|rum|tequila|sake|prosecco|martini|happy hour|drink pairing)\b/i;

// 4U / 4Us: gambling and pork are global; alcohol depends on geo.

export function runSafetyPass(input: SafetyInput): SafetyVerdict {
  const flags: SafetyVerdict["flags"] = [];

  const haystacks: Array<{ field: SafetyVerdict["flags"][number]["field"]; text: string }> = [
    { field: "headline", text: input.copy.headline },
    { field: "primaryText", text: input.copy.primaryText },
    { field: "ctaText", text: input.copy.ctaText },
  ];
  if (input.copy.headlineAr) haystacks.push({ field: "headline", text: input.copy.headlineAr });
  if (input.copy.primaryTextAr) haystacks.push({ field: "primaryText", text: input.copy.primaryTextAr });
  if (input.copy.ctaTextAr) haystacks.push({ field: "ctaText", text: input.copy.ctaTextAr });
  if (input.imagePrompt) haystacks.push({ field: "imagePrompt", text: input.imagePrompt });

  // Universal forbidden patterns
  for (const { pattern, rule, severity, suggestedFix } of FORBIDDEN_PATTERNS_BASE) {
    for (const h of haystacks) {
      if (pattern.test(h.text)) {
        flags.push({ severity, field: h.field, rule, suggestedFix });
      }
    }
  }

  // Alcohol — country-aware
  const alcoholBannedCountries = input.countries.filter((c) => {
    const rules = countryRules.find((r) => r.country === c);
    return rules?.alcoholImagery === "banned" || rules?.alcoholImagery === "limited";
  });
  if (alcoholBannedCountries.length > 0) {
    for (const h of haystacks) {
      if (ALCOHOL_PATTERN.test(h.text)) {
        flags.push({
          severity: "error",
          field: h.field,
          rule: `Alcohol reference detected; targeted countries (${alcoholBannedCountries.join(", ")}) ban or limit alcohol imagery.`,
          suggestedFix: "Replace with mocktail / fresh juice / tea / coffee or remove the reference.",
        });
      }
    }
  }

  // Currency format check — verify any AED 1.234 / SAR 49 / KWD 4.5 references match required decimals
  for (const h of haystacks) {
    flags.push(...validateCurrencyDisplay(h.text, h.field));
  }

  const verdict: SafetyVerdict["verdict"] = flags.some((f) => f.severity === "error")
    ? "fail"
    : flags.length > 0
      ? "warn"
      : "pass";

  return { verdict, flags };
}

function sanitizeForFlagMessage(value: string): string {
  // The matched substring is reflected back to the frontend in safety flags.
  // React escapes by default but be defensive — strip anything that could be
  // mistaken for HTML/script tags.
  return value.replace(/[<>]/g, "").slice(0, 80);
}

function validateCurrencyDisplay(text: string, field: SafetyVerdict["flags"][number]["field"]): SafetyVerdict["flags"] {
  const flags: SafetyVerdict["flags"] = [];

  // Currencies that REQUIRE 3 decimals
  const threeDecimalCurrencies: Array<keyof typeof pricingDisplayRules.enforceDecimals> = ["KWD", "BHD", "OMR", "JOD"];

  for (const cur of threeDecimalCurrencies) {
    // Match "KWD 5", "KWD 5.5", "KWD 5.50", or "KWD 5.500". Capture decimals so we can
    // count them — undefined/empty means zero decimals (which is also a violation).
    const regex = new RegExp(`\\b${cur}\\s+\\d+(?:\\.(\\d{1,3}))?\\b`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const decimals = (match[1] ?? "").length;
      if (decimals < 3) {
        const safe = sanitizeForFlagMessage(match[0]);
        flags.push({
          severity: "error",
          field,
          rule: `${cur} must display 3 decimal places (high-value currency). Found: "${safe}"`,
          suggestedFix: `Convert "${safe}" to use 3 decimals (e.g., ${cur} 4.500).`,
        });
      }
    }
  }

  return flags;
}

// Apply universal MENA suppression list as a system-prompt-friendly text block.
export function getUniversalSuppressionPrompt(): string {
  return universalNoGoList.alwaysSuppressInGcc.map((s) => `- NEVER produce: ${s}`).join("\n");
}
