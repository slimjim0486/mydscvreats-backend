import crypto from "node:crypto";
import { Hono } from "hono";
import type { Context } from "hono";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * C3 fix: Meta App Review requires every app that requests user data to
 * expose two callback URLs:
 *
 *   1. Data Deletion Callback   — POST  /api/webhooks/meta/data-deletion
 *   2. Deauthorize Callback     — POST  /api/webhooks/meta/deauthorize
 *
 * Both receive a `signed_request` field (form-encoded) containing a
 * base64url-encoded JSON payload signed with the App Secret using
 * HMAC-SHA256. We MUST verify the signature before trusting any field,
 * then act:
 *
 *   - data-deletion → erase all PII tied to that Meta `user_id`. The
 *     callback also expects a JSON response with a `url` (status page) and
 *     a `confirmation_code` so the user can check progress.
 *   - deauthorize    → revoke the WhatsApp/Ads integration token rows so
 *     we stop calling Meta on their behalf. No body required (acks 200).
 *
 * Tech Provider apps that don't ship these are auto-rejected.
 */

const STATUS_PAGE_BASE = env.FRONTEND_APP_URL.replace(/\/$/, "");

function decodeBase64Url(input: string): Buffer {
  // base64url → base64
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, "base64");
}

interface SignedRequestPayload {
  algorithm?: string;
  user_id?: string;
  issued_at?: number;
  expires?: number;
}

function parseSignedRequest(
  signed: string | undefined | null
): SignedRequestPayload | null {
  if (!signed || !env.META_APP_SECRET) return null;
  const parts = signed.split(".");
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts;
  let providedSig: Buffer;
  let payloadBuf: Buffer;
  try {
    providedSig = decodeBase64Url(encodedSig);
    payloadBuf = decodeBase64Url(encodedPayload);
  } catch {
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(encodedPayload)
    .digest();

  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(payloadBuf.toString("utf8")) as SignedRequestPayload;
  } catch {
    return null;
  }

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    return null;
  }
  // Reject stale payloads (>5 min) to bound replay window.
  if (typeof payload.issued_at === "number") {
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.issued_at;
    if (ageSeconds > 300 || ageSeconds < -60) return null;
  }
  return payload;
}

async function readSignedRequest(c: Context): Promise<string | null> {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await c.req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    return typeof json?.signed_request === "string" ? json.signed_request : null;
  }
  // Default: form-urlencoded (Meta's standard).
  const form = (await c.req.parseBody().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const value = form?.signed_request;
  return typeof value === "string" ? value : null;
}

/**
 * Erase or anonymize data tied to a single Meta user. Bustan does not
 * store Meta user IDs as a primary key on customer records (we key on
 * phone), but a Meta `user_id` is tied to ad accounts / WABAs the owner
 * connected. The deletion path:
 *
 *  - revoke any MetaAdsIntegration / WhatsAppIntegration whose connect
 *    flow used this Meta user (we record `metaUserId` on the integration
 *    when available — best-effort lookup).
 *  - drop OAuth state tied to this user.
 */
async function eraseMetaUserData(metaUserId: string, confirmationCode: string) {
  // We use a single transaction so partial deletion never produces an
  // inconsistent "still connected but token wiped" state visible to the
  // owner dashboard.
  await prisma.$transaction(async (tx) => {
    // MetaAdsIntegration: clear all token + scope material. Keep the row
    // so the owner sees "disconnected by Meta — re-authorize".
    await tx.metaAdsIntegration.updateMany({
      where: { metaUserId },
      data: {
        status: "disconnected",
        accessTokenCipher: null,
        tokenLastFour: null,
        tokenExpiresAt: null,
        scopes: [],
        pendingState: null,
        pendingStateAt: null,
        connectedAt: null,
        // M-2: null metaUserId so a second deletion is a no-op rather
        // than re-running the erase against the same row forever.
        metaUserId: null,
        lastError: `data_deletion:${confirmationCode}`,
      },
    });

    // WhatsAppIntegration: same treatment for any integration linked to
    // this Meta user. WhatsAppIntegration links via `metaUserId` when set.
    await tx.whatsAppIntegration.updateMany({
      where: { metaUserId },
      data: {
        status: "disconnected",
        accessTokenCipher: "",
        tokenLastFour: null,
        wabaId: null,
        metaUserId: null,
        lastError: `data_deletion:${confirmationCode}`,
      },
    });
  });
}

export const metaDataDeletionRoute = new Hono()
  /**
   * Data deletion callback. Meta calls this when a user removes the app
   * from their Facebook account or invokes the privacy "delete my data"
   * flow. We MUST respond with JSON:
   *   { url: <status URL>, confirmation_code: <opaque string> }
   * within 30 seconds. The actual erase work can be async — Meta only
   * needs the receipt.
   */
  .post("/meta/data-deletion", async (c) => {
    const signed = await readSignedRequest(c);
    const payload = parseSignedRequest(signed);
    if (!payload?.user_id) {
      // Returning 200 with an error body keeps Meta from retry-storming;
      // they only re-call on 5xx. We still log the rejection.
      console.warn("[meta-data-deletion] invalid signed_request");
      return c.json({ error: "invalid_signed_request" }, 400);
    }

    const confirmationCode = crypto.randomBytes(8).toString("hex");
    // Fire-and-forget: erase work continues even if the response is
    // already being serialized. Meta only requires the ack.
    eraseMetaUserData(payload.user_id, confirmationCode).catch((error) => {
      console.error(
        "[meta-data-deletion] erase failed",
        { metaUserId: payload.user_id, confirmationCode },
        error
      );
    });

    return c.json({
      url: `${STATUS_PAGE_BASE}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  })
  /**
   * Deauthorize callback. Fired when a user (or owner) removes the app
   * from their Facebook account. Meta does NOT expect a JSON body — a
   * 200 with no payload satisfies the contract.
   */
  .post("/meta/deauthorize", async (c) => {
    const signed = await readSignedRequest(c);
    const payload = parseSignedRequest(signed);
    if (!payload?.user_id) {
      return c.text("invalid_signed_request", 400);
    }

    const confirmationCode = crypto.randomBytes(8).toString("hex");
    // Same erase path as deletion — deauthorize also implies the user
    // wants us to stop using their token. Erase happens in background.
    eraseMetaUserData(payload.user_id, `deauth:${confirmationCode}`).catch(
      (error) => {
        console.error(
          "[meta-deauthorize] revoke failed",
          { metaUserId: payload.user_id },
          error
        );
      }
    );

    return c.json({ ok: true });
  });
