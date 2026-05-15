// Google Search Console API client.
//
// Single Bustan-side OAuth (NOT per restaurant). We OAuth once as the verified
// owner of getbustan.com, store the refresh token in env, and slice the
// searchAnalytics response per-restaurant via a `page` URL filter.
//
// The refresh token is long-lived (Google does not auto-expire it for active
// internal apps). If it ever revokes, getAccessToken() will throw and the cron
// will log loudly — re-run scripts/get-gsc-refresh-token.ts to mint a new one.

import { env } from "@/lib/env";
import { captureException } from "@/lib/sentry";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SC_API_BASE = "https://www.googleapis.com/webmasters/v3";

// Cache the access token in module memory until ~50min in. Tokens last 1h.
let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

export function isGscConfigured(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string> {
  if (!isGscConfigured()) {
    throw new Error(
      "Google Search Console not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN."
    );
  }

  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
    refresh_token: env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    cachedAccessToken = null;
    const error = new Error(
      `GSC token refresh failed (${response.status}): ${text}`
    );
    // 400/401 from oauth2.googleapis.com on a refresh_token grant almost
    // always means the token was revoked — every dashboard goes dark until
    // someone re-runs scripts/get-gsc-refresh-token.ts. Loud alert.
    captureException(error, {
      tags: { service: "gsc", scope: "token-refresh" },
      extra: { status: response.status, body: text },
    });
    throw error;
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedAccessToken = {
    token: payload.access_token,
    expiresAtMs: Date.now() + payload.expires_in * 1000,
  };
  return payload.access_token;
}

export type SearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchAnalyticsQuery = {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  dimensions?: Array<"date" | "query" | "page" | "country" | "device">;
  rowLimit?: number;
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: "query" | "page" | "country" | "device";
      operator?: "equals" | "notEquals" | "contains" | "notContains";
      expression: string;
    }>;
  }>;
};

export async function querySearchAnalytics(
  query: SearchAnalyticsQuery
): Promise<SearchAnalyticsRow[]> {
  const accessToken = await getAccessToken();
  const property = encodeURIComponent(env.GOOGLE_SEARCH_CONSOLE_PROPERTY);
  const url = `${SC_API_BASE}/sites/${property}/searchAnalytics/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GSC searchAnalytics failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { rows?: SearchAnalyticsRow[] };
  return payload.rows ?? [];
}
