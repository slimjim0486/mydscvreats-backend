import { Hono } from "hono";
import { env } from "@/lib/env";
import {
  extractWebhookMessageBody,
  mapWebhookMessageType,
  mapWebhookStatus,
  normalizeWhatsAppPhone,
  verifyMetaSignature,
} from "@/lib/whatsapp-business";
import { prisma } from "@/lib/prisma";

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
  const fromPhone = normalizeWhatsAppPhone(String(input.message.from ?? ""));
  if (!fromPhone || !input.message.id) {
    return;
  }

  const body = extractWebhookMessageBody(input.message);
  const occurredAt = toWebhookDate(input.message.timestamp);
  const displayName = input.contactName ?? fromPhone;
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
      },
    });

    if (message) {
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

    await tx.whatsAppMessageStatusEvent.create({
      data: {
        restaurantId: input.integration.restaurantId,
        integrationId: input.integration.id,
        messageId: message?.id ?? null,
        providerMessageId,
        status,
        recipientPhone: input.status.recipient_id
          ? normalizeWhatsAppPhone(String(input.status.recipient_id))
          : null,
        errorCode,
        errorMessage,
        rawPayload: input.status,
        occurredAt,
      },
    });
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

    if (!verifyMetaSignature(rawBody, c.req.header("x-hub-signature-256"))) {
      return c.text("Invalid signature", 403);
    }

    const payload = JSON.parse(rawBody) as Record<string, any>;
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
