import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.BACKEND_WEBHOOK_SYNC_SECRET = "0123456789abcdef0123456789abcdef";

test("accepts a valid signed webhook sync payload", async () => {
  const { verifyWebhookSyncRequest } = await import("./webhook-sync.js");
  const payload = JSON.stringify({ type: "checkout.session.completed" });
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signature = crypto
    .createHmac("sha256", process.env.BACKEND_WEBHOOK_SYNC_SECRET as string)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  assert.doesNotThrow(() =>
    verifyWebhookSyncRequest({
      payload,
      timestampHeader: timestamp,
      signatureHeader: `sha256=${signature}`,
    })
  );
});

test("rejects a tampered webhook sync signature", async () => {
  const { verifyWebhookSyncRequest } = await import("./webhook-sync.js");
  const payload = JSON.stringify({ type: "checkout.session.completed" });
  const timestamp = `${Math.floor(Date.now() / 1000)}`;

  assert.throws(
    () =>
      verifyWebhookSyncRequest({
        payload,
        timestampHeader: timestamp,
        signatureHeader: "sha256=deadbeef",
      }),
    /Invalid webhook sync signature/
  );
});

test("rejects an expired webhook sync signature", async () => {
  const { verifyWebhookSyncRequest } = await import("./webhook-sync.js");
  const payload = JSON.stringify({ type: "checkout.session.completed" });
  const nowMs = Date.now();
  const timestamp = `${Math.floor((nowMs - 10 * 60_000) / 1000)}`;
  const signature = crypto
    .createHmac("sha256", process.env.BACKEND_WEBHOOK_SYNC_SECRET as string)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  assert.throws(
    () =>
      verifyWebhookSyncRequest({
        payload,
        timestampHeader: timestamp,
        signatureHeader: `sha256=${signature}`,
        nowMs,
      }),
    /Expired webhook sync signature/
  );
});
