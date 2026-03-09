import { ApiError, isApiError } from "@/lib/errors";
import type { Context } from "hono";

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

  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
}
