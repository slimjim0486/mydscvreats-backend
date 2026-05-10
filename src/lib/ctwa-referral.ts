/**
 * P1 — Click-to-WhatsApp ad attribution.
 *
 * When a customer taps a Click-to-WhatsApp ad on Meta, the first inbound
 * WhatsApp webhook message carries a `referral` object describing the ad
 * that drove them. We promote that into typed columns on Customer so the
 * 30-day rawPayload retention sweep doesn't wipe attribution.
 *
 * PDPL note: ad headline/body are user-visible marketing copy authored by
 * the restaurant — not the customer's PII. We still treat them as Personal
 * Data because they're attached to a phone number; never log them in
 * plaintext (only structural diagnostics like `hasReferral=true ad_id=xxx`).
 */

// Same control-char + bidi set as sanitizeDisplayName in
// whatsapp-webhooks.ts: C0/C1, zero-width, RTL/LTR overrides, FSI/PDI/
// LRI/RLI, BOM. Explicit \u escapes so the rule survives editor /
// encoding round-trips.
const CONTROL_AND_BIDI_RX =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export const REFERRAL_HEADLINE_MAX = 200;
export const REFERRAL_BODY_MAX = 500;
export const REFERRAL_URL_MAX = 2048;
export const REFERRAL_CTWA_CLID_MAX = 256;
export const REFERRAL_SOURCE_ID_MAX = 64;

function sanitizeText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.replace(CONTROL_AND_BIDI_RX, "").trim();
  if (!stripped) return null;
  return stripped.slice(0, maxLen);
}

function sanitizeUrl(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.replace(CONTROL_AND_BIDI_RX, "").trim();
  if (!stripped) return null;
  // Only allow http(s) URLs — defends against javascript: / data: URIs
  // landing in the tooltip surface (React's auto-escape handles dashboard
  // text, but we render in `title=` and `<a href>` too).
  if (!/^https?:\/\//i.test(stripped)) return null;
  return stripped.slice(0, maxLen);
}

function sanitizeOpaqueId(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  // Opaque IDs from Meta should be ASCII alphanumeric + underscore + hyphen.
  // Anything else is junk or a malicious payload — drop it.
  const stripped = value.replace(/[^A-Za-z0-9_\-]/g, "");
  if (!stripped) return null;
  return stripped.slice(0, maxLen);
}

function sanitizeSourceType(value: unknown): "ad" | "post" | null {
  if (typeof value !== "string") return null;
  const lowered = value.toLowerCase().trim();
  if (lowered === "ad") return "ad";
  if (lowered === "post") return "post";
  return null;
}

export type CtwaReferral = {
  ctwaClid: string;
  sourceId: string | null;
  sourceType: "ad" | "post";
  sourceUrl: string | null;
  headline: string | null;
  body: string | null;
  mediaUrl: string | null;
};

/**
 * Pull a CTWA referral out of an inbound WhatsApp webhook message.
 * Meta's payload shape (per Cloud API docs):
 *
 *   message.referral = {
 *     source_url, source_type, source_id, headline, body,
 *     media_type, image_url, video_url, thumbnail_url,
 *     ctwa_clid
 *   }
 *
 * Returns null if there's no referral, or if both `ctwa_clid` and
 * `source_id` are missing/unusable (without one or the other we can't
 * attribute anyway, so persisting the row is just retention noise).
 */
export function extractCtwaReferral(message: unknown): CtwaReferral | null {
  if (!message || typeof message !== "object") return null;
  const referral = (message as Record<string, unknown>).referral;
  if (!referral || typeof referral !== "object") return null;
  const r = referral as Record<string, unknown>;

  const ctwaClid = sanitizeOpaqueId(r.ctwa_clid, REFERRAL_CTWA_CLID_MAX);
  const sourceId = sanitizeOpaqueId(r.source_id, REFERRAL_SOURCE_ID_MAX);

  // Drop unattributable rows — we need at least one of these to do
  // anything useful downstream.
  if (!ctwaClid && !sourceId) return null;

  const sourceType = sanitizeSourceType(r.source_type) ?? "ad";

  // Prefer the highest-fidelity media URL Meta provides, in order of
  // usefulness for the inbox preview.
  const mediaUrl =
    sanitizeUrl(r.image_url, REFERRAL_URL_MAX) ??
    sanitizeUrl(r.video_url, REFERRAL_URL_MAX) ??
    sanitizeUrl(r.thumbnail_url, REFERRAL_URL_MAX);

  return {
    // Older Meta payloads sometimes omit ctwa_clid; fall back to a
    // source_id-based key so the "different ctwa_clid means re-attribute"
    // check downstream still has a stable identifier to compare against.
    ctwaClid: ctwaClid ?? `src:${sourceId}`,
    sourceId,
    sourceType,
    sourceUrl: sanitizeUrl(r.source_url, REFERRAL_URL_MAX),
    headline: sanitizeText(r.headline, REFERRAL_HEADLINE_MAX),
    body: sanitizeText(r.body, REFERRAL_BODY_MAX),
    mediaUrl,
  };
}
