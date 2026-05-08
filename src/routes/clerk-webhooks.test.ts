import test from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "svix";

// Required by env.ts before module-level evaluation downstream.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test/test";

// 32-byte base64 secret that satisfies our min(20) zod schema and Svix.
const TEST_SECRET = "whsec_dGVzdHRlc3R0ZXN0dGVzdHRlc3R0ZXN0dGVzdHRlc3Q=";
process.env.CLERK_WEBHOOK_SECRET = TEST_SECRET;

function signedRequest(body: object) {
  const payload = JSON.stringify(body);
  const wh = new Webhook(TEST_SECRET);
  const msgId = `msg_${Date.now()}_${Math.random()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = wh.sign(msgId, new Date(timestamp * 1000), payload);
  return {
    payload,
    headers: {
      "content-type": "application/json",
      "svix-id": msgId,
      "svix-timestamp": String(timestamp),
      "svix-signature": signature,
    },
  };
}

test("pickPrimaryEmail prefers primary_email_address_id when set", async () => {
  const { pickPrimaryEmail } = await import("./clerk-webhooks.js");
  const email = pickPrimaryEmail({
    id: "user_x",
    email_addresses: [
      { id: "email_1", email_address: "secondary@example.com" },
      { id: "email_2", email_address: "primary@example.com" },
    ],
    primary_email_address_id: "email_2",
  });
  assert.equal(email, "primary@example.com");
});

test("pickPrimaryEmail falls back to first address when primary id missing", async () => {
  const { pickPrimaryEmail } = await import("./clerk-webhooks.js");
  const email = pickPrimaryEmail({
    id: "user_x",
    email_addresses: [{ id: "email_1", email_address: "first@example.com" }],
    primary_email_address_id: null,
  });
  assert.equal(email, "first@example.com");
});

test("pickPrimaryEmail returns null when no addresses", async () => {
  const { pickPrimaryEmail } = await import("./clerk-webhooks.js");
  assert.equal(pickPrimaryEmail({ id: "user_x", email_addresses: [] }), null);
  assert.equal(pickPrimaryEmail({ id: "user_x" }), null);
});

test("pickFullName joins first/last when both present", async () => {
  const { pickFullName } = await import("./clerk-webhooks.js");
  assert.equal(
    pickFullName({ id: "user_x", first_name: "Saleem", last_name: "Jadallah" }),
    "Saleem Jadallah"
  );
});

test("pickFullName returns single non-empty part", async () => {
  const { pickFullName } = await import("./clerk-webhooks.js");
  assert.equal(
    pickFullName({ id: "user_x", first_name: "Saleem", last_name: null }),
    "Saleem"
  );
});

test("pickFullName returns null when both parts empty", async () => {
  const { pickFullName } = await import("./clerk-webhooks.js");
  assert.equal(
    pickFullName({ id: "user_x", first_name: null, last_name: null }),
    null
  );
  assert.equal(
    pickFullName({ id: "user_x", first_name: "", last_name: "" }),
    null
  );
});

test("rejects request with missing Svix headers (401)", async () => {
  const { clerkWebhooksRoute } = await import("./clerk-webhooks.js");
  const res = await clerkWebhooksRoute.request("/", {
    method: "POST",
    body: JSON.stringify({ type: "user.created", data: {} }),
    headers: { "content-type": "application/json" },
  });
  assert.equal(res.status, 401);
});

test("rejects request with bad signature (401)", async () => {
  const { clerkWebhooksRoute } = await import("./clerk-webhooks.js");
  const { payload, headers } = signedRequest({
    type: "user.deleted",
    data: { id: "user_x" },
  });
  const res = await clerkWebhooksRoute.request("/", {
    method: "POST",
    body: payload,
    headers: {
      ...headers,
      "svix-signature":
        "v1,deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    },
  });
  assert.equal(res.status, 401);
});

test("user.deleted with valid signature returns ok no-op (no DB write)", async () => {
  const { clerkWebhooksRoute } = await import("./clerk-webhooks.js");
  const { payload, headers } = signedRequest({
    type: "user.deleted",
    data: { id: "user_test_delete", deleted: true },
  });
  const res = await clerkWebhooksRoute.request("/", {
    method: "POST",
    body: payload,
    headers,
  });
  assert.equal(res.status, 200);
  const json = (await res.json()) as {
    ok: boolean;
    event: string;
    skipped: boolean;
  };
  assert.equal(json.ok, true);
  assert.equal(json.event, "user.deleted");
  assert.equal(json.skipped, true);
});

test("unknown event type with valid signature returns ok ignored (no DB write)", async () => {
  const { clerkWebhooksRoute } = await import("./clerk-webhooks.js");
  const { payload, headers } = signedRequest({
    type: "session.created",
    data: { id: "sess_x" },
  });
  const res = await clerkWebhooksRoute.request("/", {
    method: "POST",
    body: payload,
    headers,
  });
  assert.equal(res.status, 200);
  const json = (await res.json()) as {
    ok: boolean;
    event: string;
    ignored: boolean;
  };
  assert.equal(json.ignored, true);
});
