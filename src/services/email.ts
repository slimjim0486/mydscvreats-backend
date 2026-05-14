import { Resend } from "resend";
import { env } from "@/lib/env";

let resend: Resend | null = null;

function getClient() {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }

  return resend;
}

export async function sendLifecycleEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const client = getClient();
  if (!client || !env.RESEND_FROM_EMAIL) {
    return null;
  }

  // The Resend SDK does NOT throw on send failures (unverified domain,
  // bounced recipient, rate-limit). It returns { data, error } where
  // error is non-null on failure. Without this check, callers wrap the
  // call in try/catch, see no exception, and assume success — which is
  // exactly how a "delivered" status can lie. Throw explicitly so the
  // caller's existing try/catch + status-update logic stays correct.
  const result = await client.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  });

  if (result.error) {
    const err = result.error as { name?: string; message?: string };
    throw new Error(
      `Resend rejected the send (${err.name ?? "unknown"}): ${err.message ?? JSON.stringify(result.error)}`
    );
  }

  return result;
}
