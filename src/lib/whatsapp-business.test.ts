import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/bustan_test";
process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.META_GRAPH_API_VERSION = "v25.0";

test("encrypts and decrypts WhatsApp access tokens", async () => {
  const { decryptAccessToken, encryptAccessToken } = await import("./whatsapp-business.js");
  const token = "EAAG_test_token_123456789";
  const encrypted = encryptAccessToken(token);

  assert.notEqual(encrypted, token);
  assert.match(encrypted, /^v1:/);
  assert.equal(decryptAccessToken(encrypted), token);
});

test("extracts WABA and phone number IDs from Embedded Signup session payloads", async () => {
  const { extractEmbeddedSignupCustomerAssets } = await import("./whatsapp-business.js");
  const assets = extractEmbeddedSignupCustomerAssets({
    type: "WA_EMBEDDED_SIGNUP",
    event: "FINISH",
    data: {
      waba_id: "1234567890",
      phone_number_id: "9876543210",
      business_id: "555",
      display_phone_number: "+971 50 123 4567",
    },
  });

  assert.equal(assets.event, "FINISH");
  assert.equal(assets.wabaId, "1234567890");
  assert.equal(assets.phoneNumberId, "9876543210");
  assert.equal(assets.businessAccountId, "555");
  assert.equal(assets.displayPhoneNumber, "+971 50 123 4567");
});

test("extracts nested Embedded Signup asset IDs", async () => {
  const { extractEmbeddedSignupCustomerAssets } = await import("./whatsapp-business.js");
  const assets = extractEmbeddedSignupCustomerAssets({
    type: "WA_EMBEDDED_SIGNUP",
    event: "FINISH",
    data: {
      waba: { id: "waba_nested" },
      phone_number: { id: "phone_nested", display_phone_number: "+971501234567" },
    },
  });

  assert.equal(assets.wabaId, "waba_nested");
  assert.equal(assets.phoneNumberId, "phone_nested");
  assert.equal(assets.displayPhoneNumber, "+971501234567");
});
