import type { Context } from "hono";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

type RateLimitBucket = {
  count: number;
  resetAt: number;
  lastSeenAt: number;
};

declare global {
  var __mydscvrPublicRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

const rateLimitStore =
  globalThis.__mydscvrPublicRateLimitStore ??
  (globalThis.__mydscvrPublicRateLimitStore = new Map<string, RateLimitBucket>());

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  return new Set(
    [env.FRONTEND_APP_URL, "https://getbustan.com", "https://mydscvr.ai"].map((origin) =>
      origin.replace(/\/$/, "")
    )
  );
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 1_000) {
    return;
  }

  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now && now - bucket.lastSeenAt > 5 * 60_000) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIp(c: Context) {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-real-ip") ??
    c.req.header("true-client-ip") ??
    "unknown"
  );
}

export function assertAllowedPublicOrigin(c: Context) {
  const requestOrigin = normalizeOrigin(
    c.req.header("origin") ?? c.req.header("referer") ?? null
  );

  if (!requestOrigin) {
    throw new ApiError("Public request origin is required", 403);
  }

  if (!getAllowedOrigins().has(requestOrigin)) {
    throw new ApiError("Origin not allowed", 403);
  }
}

export function consumeRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const existing = rateLimitStore.get(options.key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
      lastSeenAt: now,
    });

    return {
      allowed: true,
      remaining: Math.max(options.limit - 1, 0),
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= options.limit) {
    existing.lastSeenAt = now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      ),
    };
  }

  existing.count += 1;
  existing.lastSeenAt = now;

  return {
    allowed: true,
    remaining: Math.max(options.limit - existing.count, 0),
    retryAfterSeconds: 0,
  };
}

export function assertRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const result = consumeRateLimit(options);

  if (!result.allowed) {
    throw new ApiError("Too many requests", 429, {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}
