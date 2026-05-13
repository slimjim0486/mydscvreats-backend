#!/usr/bin/env tsx
/**
 * One-time helper to mint a Google Search Console refresh token for Bustan.
 *
 * Why this exists:
 *   Phase 3.1 of SEO uses a SINGLE Bustan-side OAuth (we own getbustan.com in
 *   GSC; per-restaurant OAuth is not needed). This script runs the OAuth dance
 *   locally and prints the refresh token so you can paste it into Railway env
 *   as GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN.
 *
 * Prerequisites (one-time, in Google Cloud Console):
 *   1. Enable "Google Search Console API" on your project.
 *   2. Create OAuth 2.0 Client of type "Web application".
 *   3. Add `http://localhost:53682/callback` to "Authorized redirect URIs".
 *   4. Make sure your Google account (the one verified for getbustan.com in GSC)
 *      is added as a Test User on the OAuth consent screen, OR the app is in
 *      Production.
 *   5. Export GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET into the
 *      shell that runs this script.
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_ID=… \
 *   GOOGLE_OAUTH_CLIENT_SECRET=… \
 *   tsx backend/scripts/get-gsc-refresh-token.ts
 *
 * The script opens (well, prints) the consent URL. Open it in a browser,
 * approve, you'll be redirected to localhost:53682, the script captures the
 * code and exchanges it for a refresh token, prints it. Done.
 */

import http from "node:http";
import { URL } from "node:url";
import { exec } from "node:child_process";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in env."
  );
  process.exit(1);
}

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // forces refresh_token to be issued
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCode(code: string): Promise<{
  refresh_token?: string;
  access_token: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{
    refresh_token?: string;
    access_token: string;
    expires_in: number;
  }>;
}

async function main() {
  const state = Math.random().toString(36).slice(2);
  const authUrl = buildAuthUrl(state);

  console.log("\n1. Open this URL in your browser (the Google account that owns the GSC property):\n");
  console.log(authUrl);
  console.log("\n2. After consent, you'll be redirected to localhost — this script will capture the code.\n");

  // Best-effort auto-open (silently fails if no GUI / wrong platform)
  const openCmd =
    process.platform === "darwin"
      ? `open "${authUrl}"`
      : process.platform === "win32"
        ? `start "" "${authUrl}"`
        : `xdg-open "${authUrl}"`;
  exec(openCmd, () => undefined);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const u = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (u.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const returnedCode = u.searchParams.get("code");
      const returnedState = u.searchParams.get("state");
      const error = u.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>OAuth error: ${error}</h1>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }
      if (!returnedCode || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>Invalid callback (missing code or state mismatch).</h1>");
        server.close();
        reject(new Error("Invalid callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h1>OK — token received.</h1><p>You can close this tab. Return to the terminal.</p>"
      );
      server.close();
      resolve(returnedCode);
    });
    server.listen(REDIRECT_PORT, "127.0.0.1");
  });

  const tokens = await exchangeCode(code);

  if (!tokens.refresh_token) {
    console.error(
      "\nNo refresh_token in response. This usually means you've previously consented for this client + account without `prompt=consent`. Try revoking access at https://myaccount.google.com/permissions and re-running.\n"
    );
    process.exit(1);
  }

  console.log("\n3. SUCCESS. Set this in your environment:\n");
  console.log(`GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log(
    "(Add it to Railway via dashboard → Service → Variables. Then trigger a redeploy.)\n"
  );
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
