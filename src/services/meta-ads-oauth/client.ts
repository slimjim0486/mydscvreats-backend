// Thin Meta Marketing API client for the read paths Bustan needs.
//
// Endpoints used (May 2026, Graph API v24+):
//   GET /me/businesses                   — list business accounts
//   GET /me/adaccounts                   — list ad accounts
//   GET /act_{id}/insights               — pull campaign-level insights
//   GET /{campaign-id}/insights          — pull campaign + ad-level insights
//   GET /act_{id}/customaudiences        — (Phase 4) for autopilot reads

import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";

const GRAPH_BASE = (env.META_GRAPH_API_VERSION || "v24.0").replace(/^\/+|\/+$/g, "");

interface BusinessAccount {
  id: string;
  name: string;
}

interface AdAccount {
  id: string; // act_xxxxx
  account_id: string;
  name: string;
  currency: string;
  business?: BusinessAccount | null;
}

export interface MetaInsightsRow {
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  /** "yyyy-mm-dd" when time-series. Absent for lifetime totals. */
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  frequency?: string;
  /** Action-based metrics — Meta returns an array of {action_type, value}. */
  actions?: Array<{ action_type: string; value: string }>;
  /** Revenue (sales-objective) — same shape as actions. */
  action_values?: Array<{ action_type: string; value: string }>;
}

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = `https://graph.facebook.com/${GRAPH_BASE}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const json = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string; code?: number; type?: string } }
    | (T & { error?: { message?: string; code?: number } });
  if (!response.ok) {
    const err = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
    throw new ApiError(`Meta Graph API: ${err}`, 502);
  }
  // Some endpoints wrap results in `data`, others return the object directly.
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function listBusinesses(accessToken: string): Promise<BusinessAccount[]> {
  return graphGet<BusinessAccount[]>("me/businesses?fields=id,name&limit=50", accessToken);
}

export async function listAdAccounts(accessToken: string): Promise<AdAccount[]> {
  const fields = "id,account_id,name,currency,business{id,name}";
  return graphGet<AdAccount[]>(`me/adaccounts?fields=${encodeURIComponent(fields)}&limit=100`, accessToken);
}

/**
 * Pull insights for a Meta campaign at the AD level so we can map back to
 * Bustan's per-variant tracking. `campaignId` is the numeric Campaign ID the
 * owner pasted at link time.
 */
export async function getCampaignAdInsights(args: {
  accessToken: string;
  campaignId: string;
  /** "lifetime" pulls the entire campaign window; "last_7d", "last_14d", etc. */
  datePreset?: "lifetime" | "last_7d" | "last_14d" | "last_30d";
}): Promise<MetaInsightsRow[]> {
  const fields = [
    "ad_id",
    "adset_id",
    "campaign_id",
    "date_start",
    "date_stop",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "inline_link_clicks",
    "frequency",
    "actions",
    "action_values",
  ].join(",");
  const preset = args.datePreset ?? "lifetime";
  const path = `${args.campaignId}/insights?level=ad&fields=${encodeURIComponent(fields)}&date_preset=${preset}&limit=200`;
  return graphGet<MetaInsightsRow[]>(path, args.accessToken);
}
