// AES-256-GCM token encryption for Meta Marketing API access tokens.
// Uses the same v1 wire format as services/whatsapp/encryption but a SEPARATE
// env var (META_ADS_TOKEN_ENCRYPTION_KEY) so a key rotation or compromise on
// one integration doesn't cascade to the other.

import crypto from "node:crypto";
import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";

function getEncryptionKey(): Buffer {
  if (!env.META_ADS_TOKEN_ENCRYPTION_KEY) {
    throw new ApiError(
      "Meta Ads token encryption is not configured. Add META_ADS_TOKEN_ENCRYPTION_KEY (32+ chars) before connecting accounts.",
      503
    );
  }
  return crypto.createHash("sha256").update(env.META_ADS_TOKEN_ENCRYPTION_KEY).digest();
}

export function encryptMetaAdsToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptMetaAdsToken(cipherText: string): string {
  const [version, ivValue, tagValue, encryptedValue] = cipherText.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new ApiError("Stored Meta Ads token is invalid.", 500);
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function getTokenLastFour(token: string): string {
  return token.slice(-4);
}
