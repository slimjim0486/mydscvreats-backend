// Thin Sentry wrapper. If SENTRY_DSN is not set, init() is a no-op and
// captureException() just logs to stderr (so Railway still sees the error).
// This means we can ship error-capture call sites today and flip Sentry on
// later by pasting a DSN — no code changes required.

import * as Sentry from "@sentry/node";
import { env } from "@/lib/env";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!env.SENTRY_DSN) {
    console.log("[sentry] no DSN set — error capture will log to stderr only");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0,
    profilesSampleRate: 0,
  });

  initialized = true;
  console.log("[sentry] initialized");
}

type CaptureContext = {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
};

export function captureException(error: unknown, context?: CaptureContext): void {
  const tagPairs = context?.tags
    ? Object.entries(context.tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  const tagSuffix = tagPairs ? ` [${tagPairs}]` : "";
  console.error(
    `[capture]${tagSuffix}`,
    error instanceof Error ? error.message : error,
    context?.extra ?? ""
  );

  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, String(value));
      }
    }
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(
  message: string,
  level: "warning" | "error" = "warning",
  context?: CaptureContext
): void {
  console.warn(`[capture:${level}]`, message, context?.extra ?? "");

  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, String(value));
      }
    }
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureMessage(message, level);
  });
}
