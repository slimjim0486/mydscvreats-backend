import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/bustan_test";
process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.META_GRAPH_API_VERSION = "v25.0";

test("maps WhatsApp STOP-style messages to opt out", async () => {
  const { getWhatsAppConsentCommand } = await import("./whatsapp-webhooks.js");

  assert.equal(getWhatsAppConsentCommand("STOP"), "opt_out");
  assert.equal(getWhatsAppConsentCommand("unsubscribe"), "opt_out");
  assert.equal(getWhatsAppConsentCommand("opt out"), "opt_out");
});

test("maps WhatsApp START-style messages to opt in", async () => {
  const { getWhatsAppConsentCommand } = await import("./whatsapp-webhooks.js");

  assert.equal(getWhatsAppConsentCommand("START"), "opt_in");
  assert.equal(getWhatsAppConsentCommand("subscribe"), "opt_in");
  assert.equal(getWhatsAppConsentCommand("yes"), "opt_in");
});

test("falls back to WhatsApp links unless the exact template is approved", async () => {
  const { getCampaignDeliveryMode } = await import("./crm.js");

  assert.equal(
    getCampaignDeliveryMode({ integrationStatus: "connected", templateStatus: "approved" }),
    "meta_cloud_api"
  );
  assert.equal(
    getCampaignDeliveryMode({ integrationStatus: "connected", templateStatus: "pending" }),
    "whatsapp_link"
  );
  assert.equal(
    getCampaignDeliveryMode({ integrationStatus: "disconnected", templateStatus: "approved" }),
    "whatsapp_link"
  );
});
