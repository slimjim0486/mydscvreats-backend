import crypto from "node:crypto";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}`;

export const WHATSAPP_TEMPLATE_LIBRARY = [
  {
    name: "inactive_30",
    label: "30-day winback",
    type: "inactive_30",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}, we miss you at {{2}}. Your favorites are ready whenever you are. Reply here to order on WhatsApp.",
    variables: ["customer_name", "restaurant_name"],
  },
  {
    name: "weekend_special",
    label: "Weekend special",
    type: "weekend_special",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}, planning weekend food? {{2}} is taking WhatsApp orders now. Reply here to place yours.",
    variables: ["customer_name", "restaurant_name"],
  },
  {
    name: "new_promotion",
    label: "New promotion",
    type: "new_promotion",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}, {{2}} just added a new offer: {{3}}. Reply here and we will help you order.",
    variables: ["customer_name", "restaurant_name", "promotion_title"],
  },
  {
    name: "review_request",
    label: "Review request",
    type: "review_request",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}, thanks for ordering from {{2}}. If you enjoyed it, we would love a quick Google review.",
    variables: ["customer_name", "restaurant_name"],
  },
  {
    name: "birthday_offer",
    label: "Birthday offer",
    type: "birthday_offer",
    category: "MARKETING",
    language: "en",
    body: "Happy birthday, {{1}}. {{2}} has a birthday treat waiting for you. Reply here to claim it.",
    variables: ["customer_name", "restaurant_name"],
  },
] as const;

type TemplateName = (typeof WHATSAPP_TEMPLATE_LIBRARY)[number]["name"];

export type EmbeddedSignupSessionPayload = {
  event?: string;
  type?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFirstString(...values: unknown[]) {
  for (const value of values) {
    const next = readString(value);
    if (next) return next;
  }

  return null;
}

function isIgnorableOnboardingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("already subscribed") ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("duplicate")
  );
}

export function extractEmbeddedSignupCustomerAssets(session: EmbeddedSignupSessionPayload | null | undefined) {
  const data = session?.data ?? {};
  const nestedPhone = typeof data.phone_number === "object" && data.phone_number
    ? (data.phone_number as Record<string, unknown>)
    : {};
  const nestedWaba = typeof data.waba === "object" && data.waba
    ? (data.waba as Record<string, unknown>)
    : {};
  const event = readString(session?.event);

  return {
    event,
    wabaId: readFirstString(
      data.waba_id,
      data.wabaId,
      data.whatsapp_business_account_id,
      data.whatsappBusinessAccountId,
      nestedWaba.id
    ),
    phoneNumberId: readFirstString(
      data.phone_number_id,
      data.phoneNumberId,
      data.business_phone_number_id,
      data.businessPhoneNumberId,
      nestedPhone.id
    ),
    businessAccountId: readFirstString(
      data.business_id,
      data.businessId,
      data.business_account_id,
      data.businessAccountId
    ),
    displayPhoneNumber: readFirstString(
      data.display_phone_number,
      data.displayPhoneNumber,
      nestedPhone.display_phone_number,
      nestedPhone.displayPhoneNumber
    ),
    errorCode: readFirstString(data.error_code, data.errorCode),
    errorMessage: readFirstString(data.error_message, data.errorMessage),
    currentStep: readFirstString(data.current_step, data.currentStep),
    sessionId: readFirstString(data.session_id, data.sessionId),
  };
}

function getEncryptionKey() {
  if (!env.WHATSAPP_TOKEN_ENCRYPTION_KEY) {
    throw new ApiError(
      "WhatsApp token encryption is not configured. Add WHATSAPP_TOKEN_ENCRYPTION_KEY before connecting accounts.",
      503
    );
  }

  return crypto.createHash("sha256").update(env.WHATSAPP_TOKEN_ENCRYPTION_KEY).digest();
}

export function encryptAccessToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptAccessToken(cipherText: string) {
  const [version, ivValue, tagValue, encryptedValue] = cipherText.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new ApiError("Stored WhatsApp token is invalid.", 500);
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function getTokenLastFour(token: string) {
  return token.slice(-4);
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return `+${digits}`;
}

export function getEmbeddedSignupConfig() {
  return {
    available: Boolean(env.META_APP_ID && env.META_WHATSAPP_CONFIG_ID && env.META_APP_SECRET),
    appId: env.META_APP_ID ?? null,
    configId: env.META_WHATSAPP_CONFIG_ID ?? null,
    graphApiVersion: env.META_GRAPH_API_VERSION,
  };
}

export function verifyMetaSignature(rawBody: string, signature: string | undefined | null) {
  if (!env.META_APP_SECRET) {
    return true;
  }

  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");
  const received = signature.replace("sha256=", "");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

async function graphRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      payload?.message ??
      `Meta Graph API request failed with ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function exchangeEmbeddedSignupCode(code: string) {
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new ApiError("Meta app credentials are not configured.", 503);
  }

  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    code,
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.access_token) {
    throw new ApiError(payload?.error?.message ?? "Failed to finish WhatsApp signup.", 400);
  }

  return payload.access_token as string;
}

export async function fetchWhatsAppPhoneNumber(input: {
  accessToken: string;
  phoneNumberId: string;
}) {
  return graphRequest<{
    id: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
  }>(
    `/${input.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
    input.accessToken
  );
}

export async function fetchWhatsAppAccountPhoneNumbers(input: {
  accessToken: string;
  wabaId: string;
}) {
  return graphRequest<{
    data?: Array<{
      id: string;
      display_phone_number?: string;
      verified_name?: string;
    }>;
  }>(
    `/${input.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&limit=100`,
    input.accessToken
  );
}

export async function subscribeWhatsAppBusinessAccount(input: {
  accessToken: string;
  wabaId: string;
}) {
  try {
    return await graphRequest<{ success?: boolean }>(
      `/${input.wabaId}/subscribed_apps`,
      input.accessToken,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
  } catch (error) {
    if (isIgnorableOnboardingError(error)) {
      return { success: true };
    }
    throw error;
  }
}

export async function registerWhatsAppPhoneNumber(input: {
  accessToken: string;
  phoneNumberId: string;
}) {
  try {
    return await graphRequest<{ success?: boolean }>(
      `/${input.phoneNumberId}/register`,
      input.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ messaging_product: "whatsapp" }),
      }
    );
  } catch (error) {
    if (isIgnorableOnboardingError(error)) {
      return { success: true };
    }
    throw error;
  }
}

export function buildTemplateParameters(input: {
  templateName: string;
  customerName: string;
  restaurantName: string;
  promotionTitle?: string | null;
}) {
  const fallbackPromotion = input.promotionTitle ?? "today's special";

  if (input.templateName === "new_promotion") {
    return [input.customerName, input.restaurantName, fallbackPromotion];
  }

  return [input.customerName, input.restaurantName];
}

export function renderTemplatePreview(templateName: string, parameters: string[]) {
  const template = WHATSAPP_TEMPLATE_LIBRARY.find((entry) => entry.name === templateName);
  if (!template) {
    return parameters.join(" ");
  }

  return parameters.reduce(
    (body, value, index) => body.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, "g"), value),
    template.body
  );
}

export async function sendWhatsAppTemplate(input: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  templateName: TemplateName | string;
  language?: string;
  parameters: string[];
}) {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: input.templateName,
      language: {
        code: input.language ?? "en",
      },
      components: input.parameters.length
        ? [
            {
              type: "body",
              parameters: input.parameters.map((value) => ({
                type: "text",
                text: value,
              })),
            },
          ]
        : undefined,
    },
  };

  const response = await graphRequest<{
    messages?: Array<{ id: string; message_status?: string }>;
  }>(`/${input.phoneNumberId}/messages`, input.accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const messageId = response.messages?.[0]?.id;
  if (!messageId) {
    throw new ApiError("Meta did not return a WhatsApp message id.", 502);
  }

  return messageId;
}

export async function sendWhatsAppText(input: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
}) {
  const response = await graphRequest<{
    messages?: Array<{ id: string; message_status?: string }>;
  }>(`/${input.phoneNumberId}/messages`, input.accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/\D/g, ""),
      type: "text",
      text: {
        preview_url: false,
        body: input.body,
      },
    }),
  });

  const messageId = response.messages?.[0]?.id;
  if (!messageId) {
    throw new ApiError("Meta did not return a WhatsApp message id.", 502);
  }

  return messageId;
}

export async function markWhatsAppMessageRead(input: {
  accessToken: string;
  phoneNumberId: string;
  messageId: string;
}) {
  return graphRequest<{ success?: boolean }>(`/${input.phoneNumberId}/messages`, input.accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: input.messageId,
    }),
  });
}

export async function createWhatsAppTemplate(input: {
  accessToken: string;
  wabaId: string;
  name: string;
  category: string;
  language: string;
  body: string;
}) {
  return graphRequest<{ id?: string; status?: string; category?: string }>(
    `/${input.wabaId}/message_templates`,
    input.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        category: input.category,
        language: input.language,
        components: [
          {
            type: "BODY",
            text: input.body,
          },
        ],
      }),
    }
  );
}

export async function fetchWhatsAppTemplates(input: {
  accessToken: string;
  wabaId: string;
}) {
  return graphRequest<{
    data?: Array<{
      id?: string;
      name: string;
      status?: string;
      category?: string;
      language?: string;
      components?: Array<{ type?: string; text?: string }>;
      rejected_reason?: string;
    }>;
  }>(
    `/${input.wabaId}/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100`,
    input.accessToken
  );
}

export function mapTemplateStatus(status: string | undefined) {
  const normalized = status?.toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "paused") return "paused";
  if (normalized === "disabled") return "disabled";
  if (normalized === "pending") return "pending";
  return "draft";
}

export function mapWebhookMessageType(type: string | undefined) {
  if (
    type === "text" ||
    type === "image" ||
    type === "audio" ||
    type === "video" ||
    type === "document" ||
    type === "button" ||
    type === "interactive" ||
    type === "template"
  ) {
    return type;
  }

  return "unknown";
}

export function extractWebhookMessageBody(message: Record<string, any>) {
  if (message.type === "text") {
    return message.text?.body ?? "";
  }
  if (message.type === "button") {
    return message.button?.text ?? "";
  }
  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title ??
      "[interactive message]"
    );
  }
  if (message.type && message[message.type]?.caption) {
    return message[message.type].caption;
  }

  return message.type ? `[${message.type} message]` : "[message]";
}

export function mapWebhookStatus(status: string | undefined) {
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (status === "failed") return "failed";
  return "queued";
}
