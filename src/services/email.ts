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

  return client.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  });
}
