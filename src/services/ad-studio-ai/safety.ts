// Safety pass — deterministic checks before any AI output is shown.
// Cultural content filters (pork/alcohol/etc.) were removed: operators know their own
// market and false positives (e.g. "veal, not pork" tripping a pork regex) blocked
// legitimate creatives. This pass now only enforces technical correctness — currency
// decimal format for high-value GCC currencies.

import { pricingDisplayRules, type CountryCode } from "@/services/ad-studio";
import type { CopyVariant, SafetyVerdict } from "./types";

interface SafetyInput {
  countries: CountryCode[];
  copy: CopyVariant;
  imagePrompt?: string;
}

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

  // Currency format check — verify any KWD/BHD/OMR/JOD references match required 3 decimals
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
