import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/bustan_test";
process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.IP_HASH_PEPPER = "test-only-ip-hash-pepper-1234";

test("normalizeUaePhone accepts the four canonical UAE shapes", async () => {
  const { normalizeUaePhone } = await import("./uae-phone.js");
  assert.equal(normalizeUaePhone("+971501234567"), "+971501234567");
  assert.equal(normalizeUaePhone("971501234567"), "+971501234567");
  assert.equal(normalizeUaePhone("0501234567"), "+971501234567");
  assert.equal(normalizeUaePhone("501234567"), "+971501234567");
});

test("normalizeUaePhone strips whitespace and punctuation", async () => {
  const { normalizeUaePhone } = await import("./uae-phone.js");
  assert.equal(normalizeUaePhone("+971 50 123 4567"), "+971501234567");
  assert.equal(normalizeUaePhone("(050) 123-4567"), "+971501234567");
  assert.equal(normalizeUaePhone(" 050 123 4567 "), "+971501234567");
});

test("normalizeUaePhone rejects non-UAE numbers", async () => {
  const { normalizeUaePhone } = await import("./uae-phone.js");
  assert.equal(normalizeUaePhone("+15551234567"), null); // US
  assert.equal(normalizeUaePhone("+447911123456"), null); // UK
  assert.equal(normalizeUaePhone("+966501234567"), null); // KSA
});

test("normalizeUaePhone rejects malformed input", async () => {
  const { normalizeUaePhone } = await import("./uae-phone.js");
  assert.equal(normalizeUaePhone(""), null);
  assert.equal(normalizeUaePhone(null), null);
  assert.equal(normalizeUaePhone(undefined), null);
  assert.equal(normalizeUaePhone("abc"), null);
  assert.equal(normalizeUaePhone("+9715012"), null); // too short
  assert.equal(normalizeUaePhone("+9714123456789012"), null); // wrong UAE prefix (not mobile)
});

test("normalizeUaePhone rejects UAE landline numbers (must be 5X)", async () => {
  const { normalizeUaePhone } = await import("./uae-phone.js");
  // UAE landline prefixes are 02 (Abu Dhabi), 04 (Dubai), 06 (Sharjah) etc.
  // Mobile is 050/052/054/055/056/058/059 — only 5X is valid for WhatsApp.
  assert.equal(normalizeUaePhone("+97142345678"), null);
  assert.equal(normalizeUaePhone("042345678"), null);
});
