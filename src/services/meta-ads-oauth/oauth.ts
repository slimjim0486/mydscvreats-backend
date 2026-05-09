// Meta OAuth 2.0 flow for Marketing API access.
//
// Three-step token exchange (per Meta Graph API May 2026):
//   1. Bustan builds an authorize URL with `state` (CSRF) + scopes.
//   2. User clicks, signs in to Meta, grants permissions, gets redirected
//      to our `/integrations/meta/callback` with `code` + `state`.
//   3. Bustan exchanges `code` → short-lived token → long-lived token (60d).
//
// Long-lived user access tokens last ~60 days. Bustan stores `tokenExpiresAt`
// and the daily cron will mark `status=expired` when within 7 days of TTL,
// so the UI can prompt re-consent.

import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";

/** Scopes Bustan needs for Phase 2C (read-only insights only).
 *  Submitting unused scopes is the fastest way to fail Meta app review, so
 *  we ship the minimum: `ads_read` (covers /me/adaccounts) and
 *  `read_insights` (covers /act_X/insights, /campaign/insights).
 *  Phase 4 will request `ads_management` (write) and `pages_show_list`
 *  (page picker) when those code paths actually exist. */
export const META_ADS_SCOPES = ["ads_read", "read_insights"] as const;

const GRAPH_BASE = (env.META_GRAPH_API_VERSION || "v24.0").replace(/^\/+|\/+$/g, "");

function requireConfig(): { appId: string; appSecret: string } {
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new ApiError(
      "Meta Ads OAuth is not configured. Set META_APP_ID and META_APP_SECRET.",
      503
    );
  }
  return { appId: env.META_APP_ID, appSecret: env.META_APP_SECRET };
}

export function buildAuthorizeUrl(args: { state: string; redirectUri: string }): string {
  const { appId } = requireConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: args.redirectUri,
    state: args.state,
    response_type: "code",
    scope: META_ADS_SCOPES.join(","),
    auth_type: "rerequest",
  });
  // Optional config-id powers Meta's "Login Connect with Marketing API" flow.
  if (env.META_ADS_CONFIG_ID) params.set("config_id", env.META_ADS_CONFIG_ID);
  return `https://www.facebook.com/${GRAPH_BASE}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForShortLivedToken(args: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresInSec: number | null }> {
  const { appId, appSecret } = requireConfig();
  const url = new URL(`https://graph.facebook.com/${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("code", args.code);

  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const json = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: { message?: string } }
    | null;

  if (!response.ok || !json?.access_token) {
    throw new ApiError(
      `Meta token exchange failed: ${json?.error?.message ?? response.status}`,
      502
    );
  }
  return {
    accessToken: json.access_token,
    expiresInSec: json.expires_in ?? null,
  };
}

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresInSec: number;
}> {
  const { appId, appSecret } = requireConfig();
  const url = new URL(`https://graph.facebook.com/${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const json = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: { message?: string } }
    | null;

  if (!response.ok || !json?.access_token) {
    throw new ApiError(
      `Meta long-lived token exchange failed: ${json?.error?.message ?? response.status}`,
      502
    );
  }
  // Long-lived user tokens default to ~60 days (5,184,000s) when no `expires_in` is returned.
  return {
    accessToken: json.access_token,
    expiresInSec: json.expires_in ?? 5_184_000,
  };
}

export async function fetchGrantedScopes(accessToken: string): Promise<string[]> {
  const url = `https://graph.facebook.com/${GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const json = (await response.json().catch(() => null)) as
    | { data?: Array<{ permission: string; status: string }> }
    | null;
  if (!response.ok || !json?.data) return [];
  return json.data.filter((p) => p.status === "granted").map((p) => p.permission);
}

/**
 * Phase 3A C-1 fix: resolve the Meta `user_id` so data-deletion /
 * deauthorize callbacks can fan out across this user's integrations.
 * Best-effort — null result keeps the connect flow alive.
 */
export async function fetchAdsMetaUserId(accessToken: string): Promise<string | null> {
  try {
    const url = `https://graph.facebook.com/${GRAPH_BASE}/me?fields=id&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const json = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!response.ok || typeof json?.id !== "string") return null;
    return json.id;
  } catch {
    return null;
  }
}
