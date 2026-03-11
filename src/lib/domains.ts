import { resolveCname } from "node:dns/promises";
import { env } from "@/lib/env";

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeHostname(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function getFrontendHostname() {
  return normalizeHostname(new URL(env.FRONTEND_APP_URL).hostname);
}

export function getCustomDomainCnameTarget() {
  return normalizeHostname(env.CUSTOM_DOMAIN_CNAME_TARGET ?? getFrontendHostname());
}

export function isAppHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const appHostname = getFrontendHostname();

  return normalized === appHostname || normalized === `www.${appHostname}`;
}

export function isValidCustomHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);

  return (
    HOSTNAME_PATTERN.test(normalized) &&
    normalized.split(".").length >= 3 &&
    !isAppHostname(normalized)
  );
}

export async function verifyCustomDomainHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const target = getCustomDomainCnameTarget();

  try {
    const records = await resolveCname(normalized);
    const normalizedRecords = records.map((record) => normalizeHostname(record));
    const matches = normalizedRecords.includes(target);

    return {
      hostname: normalized,
      target,
      records: normalizedRecords,
      status: matches ? ("active" as const) : ("failed" as const),
    };
  } catch {
    return {
      hostname: normalized,
      target,
      records: [] as string[],
      status: "pending" as const,
    };
  }
}
