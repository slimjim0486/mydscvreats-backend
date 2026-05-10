#!/usr/bin/env tsx
/**
 * Phase 3A smoke test for the Meta data-deletion + deauthorize callbacks.
 *
 * What it does:
 *  1. Forges a Meta `signed_request` payload (HMAC-SHA256 keyed with
 *     META_APP_SECRET) for a configurable Meta user_id.
 *  2. POSTs it as form-urlencoded to /api/webhooks/meta/data-deletion
 *     and /api/webhooks/meta/deauthorize.
 *  3. Reports the response status + body, and confirms the
 *     `confirmation_code` URL points at /data-deletion (not /legal/...).
 *  4. Also fires a NEGATIVE test — a payload with a wrong signature —
 *     and confirms the server returns 400 (not 200), proving the HMAC
 *     verification is doing its job.
 *
 * Usage:
 *   META_APP_SECRET=... \
 *   API_BASE=https://api.staging.getbustan.com \
 *   TEST_META_USER_ID=10000000000000000 \
 *   tsx backend/scripts/smoke-test-meta-callbacks.ts
 *
 * Run BEFORE submitting the Meta Tech Provider application — the
 * automated reviewer hits these endpoints and a failure is an instant
 * rejection.
 */

import crypto from "node:crypto";

const APP_SECRET = process.env.META_APP_SECRET;
const API_BASE = (process.env.API_BASE ?? "http://localhost:3001").replace(/\/$/, "");
const META_USER_ID = process.env.TEST_META_USER_ID ?? "10000000000000001";

if (!APP_SECRET) {
  console.error("META_APP_SECRET is required.");
  process.exit(1);
}

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function buildSignedRequest(opts: {
  userId: string;
  forgeBadSignature?: boolean;
}): string {
  const payload = {
    algorithm: "HMAC-SHA256",
    user_id: opts.userId,
    issued_at: Math.floor(Date.now() / 1000),
    expires: 0,
  };
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const correctSig = crypto
    .createHmac("sha256", APP_SECRET as string)
    .update(encodedPayload)
    .digest();
  const signature = opts.forgeBadSignature
    ? crypto.createHmac("sha256", "wrong-secret").update(encodedPayload).digest()
    : correctSig;
  return `${base64url(signature)}.${encodedPayload}`;
}

interface CallResult {
  status: number;
  body: string;
}

async function callCallback(path: string, signedRequest: string): Promise<CallResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ signed_request: signedRequest }).toString(),
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

interface Outcome {
  name: string;
  ok: boolean;
  detail: string;
}

const outcomes: Outcome[] = [];

function record(name: string, ok: boolean, detail: string) {
  outcomes.push({ name, ok, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name} — ${detail}`);
}

async function run() {
  console.log(`API base: ${API_BASE}`);
  console.log(`Meta user_id (test): ${META_USER_ID}`);
  console.log("");

  // 1. Valid data-deletion signed_request.
  const valid = buildSignedRequest({ userId: META_USER_ID });
  const dataDel = await callCallback("/api/webhooks/meta/data-deletion", valid);
  if (dataDel.status === 200) {
    let parsed: { url?: string; confirmation_code?: string } = {};
    try {
      parsed = JSON.parse(dataDel.body);
    } catch {
      // ignore
    }
    record(
      "data-deletion: valid signed_request returns 200",
      true,
      `confirmation_code=${parsed.confirmation_code ?? "<missing>"} url=${parsed.url ?? "<missing>"}`
    );
    record(
      "data-deletion: url path is /data-deletion (not /legal/...)",
      typeof parsed.url === "string" && parsed.url.includes("/data-deletion") && !parsed.url.includes("/legal/"),
      parsed.url ?? "url missing"
    );
    record(
      "data-deletion: confirmation_code is hex",
      typeof parsed.confirmation_code === "string" && /^[a-f0-9]{12,32}$/i.test(parsed.confirmation_code),
      parsed.confirmation_code ?? "missing"
    );
  } else {
    record(
      "data-deletion: valid signed_request returns 200",
      false,
      `status=${dataDel.status} body=${dataDel.body.slice(0, 200)}`
    );
  }

  // 2. Invalid signature — must NOT return 200.
  const forged = buildSignedRequest({ userId: META_USER_ID, forgeBadSignature: true });
  const dataDelBad = await callCallback("/api/webhooks/meta/data-deletion", forged);
  record(
    "data-deletion: forged signature is rejected (4xx)",
    dataDelBad.status >= 400 && dataDelBad.status < 500,
    `status=${dataDelBad.status}`
  );

  // 3. Valid deauthorize signed_request.
  const deauth = await callCallback("/api/webhooks/meta/deauthorize", valid);
  record(
    "deauthorize: valid signed_request returns 200",
    deauth.status === 200,
    `status=${deauth.status} body=${deauth.body.slice(0, 200)}`
  );

  // 4. Invalid deauthorize.
  const deauthBad = await callCallback("/api/webhooks/meta/deauthorize", forged);
  record(
    "deauthorize: forged signature is rejected (4xx)",
    deauthBad.status >= 400 && deauthBad.status < 500,
    `status=${deauthBad.status}`
  );

  // 5. Empty body.
  const emptyResp = await fetch(`${API_BASE}/api/webhooks/meta/data-deletion`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "",
  });
  record(
    "data-deletion: empty body is rejected (4xx)",
    emptyResp.status >= 400 && emptyResp.status < 500,
    `status=${emptyResp.status}`
  );

  console.log("");
  const failed = outcomes.filter((o) => !o.ok);
  if (failed.length === 0) {
    console.log(`✅ All ${outcomes.length} checks passed.`);
    process.exit(0);
  } else {
    console.log(`❌ ${failed.length}/${outcomes.length} checks failed.`);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(2);
});
