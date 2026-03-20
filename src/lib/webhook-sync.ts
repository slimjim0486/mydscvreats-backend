import crypto from "node:crypto";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function getSyncSecret() {
  if (!env.BACKEND_WEBHOOK_SYNC_SECRET) {
    throw new ApiError("Webhook sync is not configured", 503);
  }

  return env.BACKEND_WEBHOOK_SYNC_SECRET;
}

function timingSafeHexMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyWebhookSyncRequest(input: {
  payload: string;
  signatureHeader: string | undefined;
  timestampHeader: string | undefined;
  nowMs?: number;
}) {
  const secret = getSyncSecret();
  const { payload, signatureHeader, timestampHeader, nowMs = Date.now() } = input;

  if (!signatureHeader || !timestampHeader) {
    throw new ApiError("Missing webhook sync signature", 401);
  }

  if (!/^\d+$/.test(timestampHeader)) {
    throw new ApiError("Invalid webhook sync timestamp", 401);
  }

  const timestampSeconds = Number(timestampHeader);
  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - timestampSeconds);

  if (!Number.isFinite(timestampSeconds) || ageSeconds > TIMESTAMP_TOLERANCE_SECONDS) {
    throw new ApiError("Expired webhook sync signature", 401);
  }

  const providedSignature = signatureHeader.replace(/^sha256=/, "");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestampHeader}.${payload}`)
    .digest("hex");

  if (!timingSafeHexMatch(expectedSignature, providedSignature)) {
    throw new ApiError("Invalid webhook sync signature", 401);
  }
}
