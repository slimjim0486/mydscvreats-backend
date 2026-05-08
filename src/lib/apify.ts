import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

const APIFY_API_BASE = "https://api.apify.com/v2";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_ACTOR_COST_USD = 0.08;

export interface ApifyRunResult<T> {
  actorId: string;
  items: T[];
  estimatedCostUsd: number;
}

function actorIdToPath(actorId: string) {
  return encodeURIComponent(actorId.replace("/", "~"));
}

export async function runActor<T = Record<string, unknown>>(
  actorId: string | null | undefined,
  input: unknown,
  options: { timeoutMs?: number; estimateCostUsd?: number } = {}
): Promise<ApifyRunResult<T>> {
  if (!actorId) {
    return {
      actorId: "",
      items: [],
      estimatedCostUsd: 0,
    };
  }

  if (!env.APIFY_API_TOKEN) {
    throw new ApiError("Apify is not configured for SEO analysis.", 503);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = new URL(`${APIFY_API_BASE}/acts/${actorIdToPath(actorId)}/run-sync-get-dataset-items`);
  url.searchParams.set("token", env.APIFY_API_TOKEN);
  url.searchParams.set("timeout", String(Math.ceil(timeoutMs / 1000)));
  url.searchParams.set("clean", "true");
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs + 5_000);

  try {
    console.info("Starting Apify actor", { actorId, timeoutMs });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input ?? {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn("Apify actor failed", {
        actorId,
        status: response.status,
        body: text.slice(0, 500),
      });
      throw new ApiError(
        `Apify actor ${actorId} failed with ${response.status}${text ? `: ${text.slice(0, 240)}` : ""}`,
        502
      );
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : [payload];
    console.info("Apify actor completed", { actorId, itemCount: items.length });

    return {
      actorId,
      items: items as T[],
      estimatedCostUsd: options.estimateCostUsd ?? DEFAULT_ACTOR_COST_USD,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`Apify actor ${actorId} timed out.`, 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
