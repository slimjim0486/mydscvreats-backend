import { ApiError, isApiError } from "@/lib/errors";
import type { Context } from "hono";
import { ZodError } from "zod";

export function getPagination(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "25");

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 25,
  };
}

export function assert(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) {
    throw new ApiError(message, status);
  }
}

export function errorResponse(c: Context, error: unknown) {
  if (isApiError(error)) {
    return c.json(
      {
        error: error.message,
        details: error.details,
      },
      error.status as 400
    );
  }

  // H3 fix: ZodError needs an explicit branch — otherwise it falls into
  // the generic 500 path and the user sees "Internal server error" for
  // what is really a schema mismatch. Format the issues into a 400 so
  // the dashboard can surface "phoneNumber: Required" instead of bouncing
  // through Sentry.
  if (error instanceof ZodError) {
    return c.json(
      {
        error: "Invalid request",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400
    );
  }

  // Anything else is unexpected. Log the full error server-side, but
  // return a generic message — Postgres errors, stack traces, and
  // internal env paths must never leak to the client.
  console.error("[errorResponse] unhandled", error);
  return c.json({ error: "Internal server error" }, 500);
}
