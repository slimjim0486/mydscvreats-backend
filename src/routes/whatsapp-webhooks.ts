import { Hono } from "hono";
import { env } from "@/lib/env";
import {
  extractWebhookMessageBody,
  mapWebhookMessageType,
  mapWebhookStatus,
  normalizeE164Phone,
  normalizeWhatsAppPhone,
  verifyMetaSignature,
} from "@/lib/whatsapp-business";
import { prisma } from "@/lib/prisma";

/**
 * H7 fix: cap webhook-supplied display names to prevent stored-XSS surfaces
 * (email subject lines, future plaintext exports). React's auto-escape
 * covers the dashboard render, but every other downstream surface needs
 * explicit truncation + control-char strip.
 */
function sanitizeDisplayName(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  // Strip C0/C1 control chars, zero-width, RTL/LTR overrides, bidi
  // isolates (FSI/PDI/LRI/RLI), and BOM. Explicit \u escapes so the
  // rule survives editor / encoding round-trips.
  const stripped = value.replace(
    /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,
    ""
  );
  return stripped.trim().slice(0, 120) || fallback;
}

/**
 * M3 fix: WhatsApp message status events can arrive out-of-order. Status
 * should monotonically advance: queued → sent → delivered → read; failed
 * is terminal. Without rank enforcement, a `delivered` arriving after
 * `read` overwrites the read timestamp.
 */
const STATUS_RANK: Record<string, number> = {
  received: 0,
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
};

function toWebhookDate(timestamp: unknown) {
  const seconds = Number(timestamp);
  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000);
  }
  return new Date();
}

function statusTimestamps(status: string, occurredAt: Date) {
  if (status === "sent") return { sentAt: occurredAt };
  if (status === "delivered") return { deliveredAt: occurredAt };
  if (status === "read") return { readAt: occurredAt };
  if (status === "failed") return { failedAt: occurredAt };
  return {};
}

function firstError(status: Record<string, any>) {
  const error = Array.isArray(status.errors) ? status.errors[0] : null;
  return {
    errorCode: error?.code ? String(error.code) : null,
    errorMessage: error?.title ?? error?.message ?? error?.details ?? null,
  };
}

export function getWhatsAppConsentCommand(body: string | null | undefined) {
  const normalized = body?.trim().toLowerCase();
  if (!normalized) return null;
  if (["stop", "unsubscribe", "opt out", "opt-out", "cancel"].includes(normalized)) {
    return "opt_out";
  }
  if (["start", "subscribe", "opt in", "opt-in", "yes"].includes(normalized)) {
    return "opt_in";
  }
  return null;
}

async function handleInboundMessage(input: {
  integration: {
    id: string;
    restaurantId: string;
    displayPhoneNumber: string;
  };
  message: Record<string, any>;
  contactName: string | null;
}) {
  // H6 fix: use the canonical E.164 normalizer so this matches what the
  // public cart path stores.
  const fromPhone = normalizeE164Phone(String(input.message.from ?? ""));
  if (!fromPhone || !input.message.id) {
    return;
  }

  const body = extractWebhookMessageBody(input.message);
  const occurredAt = toWebhookDate(input.message.timestamp);
  const displayName = sanitizeDisplayName(input.contactName, fromPhone);
  const consentCommand = getWhatsAppConsentCommand(body);

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: {
        restaurantId_normalizedPhone: {
          restaurantId: input.integration.restaurantId,
          normalizedPhone: fromPhone,
        },
      },
      create: {
        restaurantId: input.integration.restaurantId,
        normalizedPhone: fromPhone,
        phoneNumber: fromPhone,
        displayName,
      },
      update: {
        phoneNumber: fromPhone,
        displayName: input.contactName ?? undefined,
      },
      select: {
        id: true,
      },
    });

    if (consentCommand) {
      await tx.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          marketingOptIn: consentCommand === "opt_in",
          marketingOptInAt: consentCommand === "opt_in" ? occurredAt : undefined,
          marketingOptOutAt: consentCommand === "opt_out" ? occurredAt : null,
        },
      });

      await tx.customerConsent.create({
        data: {
          restaurantId: input.integration.restaurantId,
          customerId: customer.id,
          status: consentCommand,
          source: "whatsapp_keyword",
        },
      });
    }

    const conversation = await tx.whatsAppConversation.upsert({
      where: {
        restaurantId_customerPhone: {
          restaurantId: input.integration.restaurantId,
          customerPhone: fromPhone,
        },
      },
      create: {
        restaurantId: input.integration.restaurantId,
        integrationId: input.integration.id,
        customerId: customer.id,
        customerPhone: fromPhone,
        customerName: displayName,
        lastMessageAt: occurredAt,
        unreadCount: 1,
      },
      update: {
        integrationId: input.integration.id,
        customerId: customer.id,
        customerName: displayName,
        lastMessageAt: occurredAt,
        unreadCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
      },
    });

    await tx.whatsAppMessage.upsert({
      where: {
        providerMessageId: String(input.message.id),
      },
      create: {
        restaurantId: input.integration.restaurantId,
        integrationId: input.integration.id,
        conversationId: conversation.id,
        customerId: customer.id,
        providerMessageId: String(input.message.id),
        direction: "inbound",
        type: mapWebhookMessageType(input.message.type),
        status: "received",
        fromPhone,
        toPhone: normalizeWhatsAppPhone(input.integration.displayPhoneNumber),
        body,
        rawPayload: input.message,
        createdAt: occurredAt,
      },
      update: {
        conversationId: conversation.id,
        customerId: customer.id,
        body,
        rawPayload: input.message,
      },
    });
  });
}

async function handleStatus(input: {
  integration: {
    id: string;
    restaurantId: string;
  };
  status: Record<string, any>;
}) {
  if (!input.status.id) {
    return;
  }

  const providerMessageId = String(input.status.id);
  const status = mapWebhookStatus(input.status.status);
  const occurredAt = toWebhookDate(input.status.timestamp);
  const { errorCode, errorMessage } = firstError(input.status);
  const timestamps = statusTimestamps(status, occurredAt);

  await prisma.$transaction(async (tx) => {
    const message = await tx.whatsAppMessage.findUnique({
      where: {
        providerMessageId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (message) {
      // M3 fix: status must monotonically advance. Skip an out-of-order
      // status event (e.g. `delivered` arriving after `read`) to preserve
      // the higher-rank state already recorded.
      const currentRank = STATUS_RANK[message.status as string] ?? 0;
      const newRank = STATUS_RANK[status] ?? 0;
      if (newRank > currentRank || status === "failed") {
        await tx.whatsAppMessage.update({
          where: {
            id: message.id,
          },
          data: {
            status,
            ...timestamps,
            rawPayload: input.status,
          },
        });
      }
    }

    await tx.messageLog
      .update({
        where: {
          providerMessageId,
        },
        data: {
          status,
          errorCode,
          errorMessage,
          ...timestamps,
        },
      })
      .catch(() => null);

    // M4: idempotent status events — same (providerMessageId, status,
    // occurredAt) tuple from a Meta retry should not duplicate. We don't
    // have a unique constraint yet (would need migration), so use upsert
    // semantics via a defensive findFirst+create.
    const existing = await tx.whatsAppMessageStatusEvent.findFirst({
      where: {
        providerMessageId,
        status,
        occurredAt,
      },
      select: { id: true },
    });
    if (!existing) {
      await tx.whatsAppMessageStatusEvent.create({
        data: {
          restaurantId: input.integration.restaurantId,
          integrationId: input.integration.id,
          messageId: message?.id ?? null,
          providerMessageId,
          status,
          recipientPhone: input.status.recipient_id
            ? normalizeE164Phone(String(input.status.recipient_id))
            : null,
          errorCode,
          errorMessage,
          rawPayload: input.status,
          occurredAt,
        },
      });
    }
  });
}

export const whatsappWebhooksRoute = new Hono()
  .get("/meta/whatsapp", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");

    if (
      mode === "subscribe" &&
      token &&
      env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ) {
      return c.text(challenge ?? "", 200);
    }

    return c.text("Forbidden", 403);
  })
  .post("/meta/whatsapp", async (c) => {
    const rawBody = await c.req.text();

    // H1 fix: cap body size. Meta payloads are <50KB; anything bigger is
    // either malformed or a DoS attempt. 1MB is generous.
    const MAX_BODY_BYTES = 1_000_000;
    if (rawBody.length > MAX_BODY_BYTES) {
      return c.text("Payload too large", 413);
    }

    if (!verifyMetaSignature(rawBody, c.req.header("x-hub-signature-256"))) {
      return c.text("Invalid signature", 403);
    }

    // H1 fix: guard JSON.parse — malformed body bombs to 500, Meta interprets
    // 5xx as transient and retries with exponential backoff (storm).
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody) as Record<string, any>;
    } catch {
      return c.text("Bad request", 400);
    }
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;

        if (!phoneNumberId) {
          continue;
        }

        const integration = await prisma.whatsAppIntegration.findUnique({
          where: {
            phoneNumberId: String(phoneNumberId),
          },
          select: {
            id: true,
            restaurantId: true,
            displayPhoneNumber: true,
          },
        });

        if (!integration) {
          continue;
        }

        await prisma.whatsAppIntegration.update({
          where: {
            id: integration.id,
          },
          data: {
            lastWebhookAt: new Date(),
            lastError: null,
          },
        });

        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const messages = Array.isArray(value.messages) ? value.messages : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];

        for (const message of messages) {
          const contact = contacts.find((entry: Record<string, any>) => entry.wa_id === message.from);
          await handleInboundMessage({
            integration,
            message,
            contactName: contact?.profile?.name ?? null,
          });
        }

        for (const status of statuses) {
          await handleStatus({
            integration,
            status,
          });
        }
      }
    }

    return c.json({ ok: true });
  });
