// Pre-flight validator for Meta export bundle.
//
// Surfaces problems BEFORE the user uploads to Ads Manager so they don't
// hit Meta's "headline exceeds 40 char" / "image too small" / "missing
// landing page" errors during a live launch.
//
// Returns ValidationIssue[]. Severity "error" blocks the export; "warning"
// is informational.

import { platformFormats } from "@/services/ad-studio";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  scope: "campaign" | "ad_set" | "ad" | "creative" | "destination";
  field: string;
  message: string;
  fix?: string;
}

export interface ValidatorInput {
  destinationUrl: string;
  creatives: Array<{
    variant: number;
    headline: string;
    primaryText: string;
    ctaText: string;
    headlineAr: string | null;
    primaryTextAr: string | null;
    ctaTextAr: string | null;
    heroImageUrl: string | null;
  }>;
}

const META_REELS = platformFormats.find((p) => p.id === "meta_reels");
const META_FEED = platformFormats.find((p) => p.id === "meta_feed");

// Tightest cap across both placements — drift-safe; if KB renames a placement
// or lowers a limit, validation tightens, never loosens.
function getMetaCharLimit(field: "headline" | "primary_text"): number {
  const candidates = [META_REELS, META_FEED]
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => p.characterLimits.find((l) => l.field === field)?.max)
    .filter((n): n is number => typeof n === "number");
  if (candidates.length === 0) {
    throw new Error(
      `KB schema drift — no ${field} character limit found on Meta placements. Please file a bug.`
    );
  }
  return Math.min(...candidates);
}

/**
 * Truncate user-controlled content before reflecting it back into a flag
 * message. Echoing > 20 chars is unnecessary for the user to recognize the
 * issue, and limits future PII-leakage risk if content gets paste-overridden.
 */
function safeEcho(s: string): string {
  return s.length <= 20 ? s : `${s.slice(0, 20)}…`;
}

export function validateMetaBundle(input: ValidatorInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Destination URL
  if (!input.destinationUrl) {
    issues.push({
      severity: "error",
      scope: "destination",
      field: "destinationUrl",
      message: "No destination URL set. Meta ads require a landing page (your menu page or WhatsApp link).",
      fix: "Set your restaurant's WhatsApp number or menu page URL before exporting.",
    });
  } else {
    try {
      const u = new URL(input.destinationUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:" && u.protocol !== "wa:") {
        issues.push({
          severity: "warning",
          scope: "destination",
          field: "destinationUrl",
          message: `Destination uses unusual protocol: ${u.protocol}. Meta typically requires https://.`,
        });
      }
    } catch {
      issues.push({
        severity: "error",
        scope: "destination",
        field: "destinationUrl",
        message: "Destination URL is malformed.",
      });
    }
  }

  // Per-creative validation
  const headlineMax = getMetaCharLimit("headline");
  const primaryMax = getMetaCharLimit("primary_text");

  for (const c of input.creatives) {
    if (c.headline.length > headlineMax) {
      const overage = c.headline.length - headlineMax;
      issues.push({
        severity: "error",
        scope: "ad",
        field: `variant ${c.variant} headline`,
        message: `Headline is ${overage} character${overage === 1 ? "" : "s"} too long for Meta (${c.headline.length} of ${headlineMax} max).`,
        fix: `Shorten "${safeEcho(c.headline)}" to ${headlineMax} chars or fewer.`,
      });
    }
    if (c.primaryText.length > primaryMax) {
      issues.push({
        severity: "warning",
        scope: "ad",
        field: `variant ${c.variant} primary text`,
        message: `Primary text is ${c.primaryText.length} chars; Meta truncates after ${primaryMax}.`,
        fix: "Front-load the value prop in the first ~125 characters.",
      });
    }
    if (c.ctaText.length > 40) {
      issues.push({
        severity: "warning",
        scope: "ad",
        field: `variant ${c.variant} cta`,
        message: `CTA text is ${c.ctaText.length} chars; Meta truncates long CTAs.`,
      });
    }

    // Arabic variant
    if (c.headlineAr && c.headlineAr.length > headlineMax) {
      issues.push({
        severity: "warning",
        scope: "ad",
        field: `variant ${c.variant} Arabic headline`,
        message: `Arabic headline is ${c.headlineAr.length} chars; Meta caps at ${headlineMax}.`,
      });
    }

    // Hero image present
    if (!c.heroImageUrl) {
      issues.push({
        severity: "error",
        scope: "creative",
        field: `variant ${c.variant} hero image`,
        message: "No hero image. Meta requires at least one image per ad.",
        fix: "Regenerate this variant's image, or remove the variant from the export.",
      });
    }
  }

  // Bundle has at least one variant
  if (input.creatives.length === 0) {
    issues.push({
      severity: "error",
      scope: "campaign",
      field: "creatives",
      message: "Bundle has zero creatives — nothing to upload.",
    });
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
