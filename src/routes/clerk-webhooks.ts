import { Hono } from "hono";
import { Webhook, WebhookVerificationError } from "svix";
import { env } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface ClerkUserDeletedPayload {
  id: string;
  deleted?: boolean;
}

interface ClerkEvent {
  type: string;
  data: ClerkUserPayload | ClerkUserDeletedPayload | Record<string, unknown>;
}

export function pickPrimaryEmail(data: ClerkUserPayload): string | null {
  const addresses = data.email_addresses ?? [];
  if (addresses.length === 0) return null;

  if (data.primary_email_address_id) {
    const primary = addresses.find((a) => a.id === data.primary_email_address_id);
    if (primary?.email_address) return primary.email_address;
  }

  return addresses[0]?.email_address ?? null;
}

export function pickFullName(data: ClerkUserPayload): string | null {
  const parts = [data.first_name, data.last_name].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function handleClerkUserUpsert(data: ClerkUserPayload) {
  const email = pickPrimaryEmail(data);
  if (!email) {
    return { skipped: true as const, reason: "no-primary-email" };
  }

  const fullName = pickFullName(data);

  await prisma.user.upsert({
    where: { clerkId: data.id },
    update: {
      email,
      ...(fullName !== null && { fullName }),
    },
    create: {
      clerkId: data.id,
      email,
      fullName,
    },
  });

  return { synced: true as const, email };
}

export const clerkWebhooksRoute = new Hono();

clerkWebhooksRoute.post("/", async (c) => {
  try {
    if (!env.CLERK_WEBHOOK_SECRET) {
      throw new ApiError("Clerk webhook is not configured", 503);
    }

    const svixId = c.req.header("svix-id");
    const svixTimestamp = c.req.header("svix-timestamp");
    const svixSignature = c.req.header("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new ApiError("Missing Svix headers", 401);
    }

    const payload = await c.req.text();

    let event: ClerkEvent;
    try {
      const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkEvent;
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        throw new ApiError("Invalid webhook signature", 401);
      }
      throw err;
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const result = await handleClerkUserUpsert(event.data as ClerkUserPayload);
        return c.json({ ok: true, event: event.type, ...result });
      }
      case "user.deleted": {
        // Soft-skip: hard-deleting a user cascades to restaurants/menus/etc and is
        // typically driven by an explicit account-closure flow, not a webhook.
        // Log and ack so Clerk doesn't retry.
        const data = event.data as ClerkUserDeletedPayload;
        console.log(`[clerk-webhook] user.deleted clerk_id=${data.id} (no-op)`);
        return c.json({ ok: true, event: event.type, skipped: true });
      }
      default:
        return c.json({ ok: true, event: event.type, ignored: true });
    }
  } catch (error) {
    return errorResponse(c, error);
  }
});
