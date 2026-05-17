/**
 * Strict UAE E.164 normalization. Mirrors the frontend's
 * `apiClient.normalizeUaePhone` so the client-side hint matches the
 * trusted boundary check exactly.
 *
 * Returns a `+9715XXXXXXXX` string or null. Accepts common entry shapes:
 *   - +971501234567 (canonical)
 *   - 971501234567 (no plus)
 *   - 0501234567 (local with leading 0)
 *   - 501234567 (local without leading 0)
 *   - free-form punctuation/whitespace
 */

import { normalizeE164Phone } from "@/lib/whatsapp-business";

export const UAE_PHONE_RE = /^\+9715\d{8}$/;

export function normalizeUaePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const e164 = normalizeE164Phone(raw);
  if (e164 && UAE_PHONE_RE.test(e164)) {
    return e164;
  }
  const digits = raw.replace(/\D/g, "");
  if (/^05\d{8}$/.test(digits)) {
    const candidate = `+971${digits.slice(1)}`;
    if (UAE_PHONE_RE.test(candidate)) return candidate;
  }
  if (/^9715\d{8}$/.test(digits)) {
    const candidate = `+${digits}`;
    if (UAE_PHONE_RE.test(candidate)) return candidate;
  }
  if (/^5\d{8}$/.test(digits)) {
    const candidate = `+971${digits}`;
    if (UAE_PHONE_RE.test(candidate)) return candidate;
  }
  return null;
}
