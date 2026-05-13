import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@/lib/env";
import { startMenuImageWorker } from "@/queue/image-generation";
import { startAdStudioWorker } from "@/queue/ad-studio-jobs";
import { startWhatsAppRetentionWorker } from "@/queue/whatsapp-retention";
import { startOwnerChatMemoryWorker } from "@/queue/owner-chat-memory";
import { startOwnerWhisperWorker } from "@/queue/owner-whisper";
import { adStudioRoute, adStudioPublicRoute } from "@/routes/ad-studio";
import { analyticsRoute } from "@/routes/analytics";
import { auditRoute } from "@/routes/audit";
import { aiRoute } from "@/routes/ai";
import { aiFeaturesRoute } from "@/routes/ai-features";
import { chatRoute } from "@/routes/chat";
import { crmRoute } from "@/routes/crm";
import { dietaryTagsRoute } from "@/routes/dietary-tags";
import { menuBadgesRoute } from "@/routes/menu-badges";
import { menuRoute } from "@/routes/menu";
import { menuSourceImagesRoute } from "@/routes/menu-source-images";
import { previewRoute } from "@/routes/preview";
import { portfolioRoute } from "@/routes/portfolio";
import { restaurantsRoute } from "@/routes/restaurants";
import { shortLinksRoute } from "@/routes/short-links";
import { subscriptionsRoute } from "@/routes/subscriptions";
import { uploadRoute } from "@/routes/upload";
import { gbpRoute } from "@/routes/gbp";
import { seoRoute } from "@/routes/seo";
import { ownerChatRoute } from "@/routes/owner-chat";
import { menuPrintRoute, pdfExportRoute } from "@/routes/pdf-export";
import { whatsappRoute } from "@/routes/whatsapp";
import { whatsappWebhooksRoute } from "@/routes/whatsapp-webhooks";
import { metaDataDeletionRoute } from "@/routes/meta-data-deletion";
import { clerkWebhooksRoute } from "@/routes/clerk-webhooks";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [env.FRONTEND_APP_URL, "https://getbustan.com"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/restaurants", restaurantsRoute);
app.route("/api/portfolio", portfolioRoute);
app.route("/api/short-links", shortLinksRoute);
app.route("/api/preview", previewRoute);
app.route("/api/menu", menuRoute);
app.route("/api/menu", aiRoute);
app.route("/api/menu-source-images", menuSourceImagesRoute);
app.route("/api/chat", chatRoute);
app.route("/api/crm", crmRoute);
app.route("/api/owner-chat", ownerChatRoute);
app.route("/api/ai", aiFeaturesRoute);
app.route("/api/dietary-tags", dietaryTagsRoute);
app.route("/api/menu-badges", menuBadgesRoute);
app.route("/api/subscriptions", subscriptionsRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/audit", auditRoute);
app.route("/api/upload", uploadRoute);
app.route("/api/whatsapp", whatsappRoute);
app.route("/api/webhooks", whatsappWebhooksRoute);
app.route("/api/webhooks", metaDataDeletionRoute);
app.route("/api/webhooks/clerk", clerkWebhooksRoute);
app.route("/api/gbp", gbpRoute);
app.route("/api/seo", seoRoute);
app.route("/api/menu-print", menuPrintRoute);
app.route("/api/pdf-export", pdfExportRoute);
app.route("/api/ad-studio-public", adStudioPublicRoute);
app.route("/api/ad-studio", adStudioRoute);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Bustan backend listening on http://localhost:${info.port}`);
  }
);

// Start the pg-boss worker inline so image generation jobs are processed
startMenuImageWorker()
  .then(() => {
    console.log("pg-boss image worker started");
  })
  .catch((error) => {
    console.error("pg-boss worker failed to start", error);
  });

startAdStudioWorker()
  .then(() => {
    console.log("pg-boss ad-studio worker started");
  })
  .catch((error) => {
    console.error("pg-boss ad-studio worker failed to start", error);
  });

startWhatsAppRetentionWorker()
  .then(() => {
    console.log("pg-boss whatsapp-retention worker started");
  })
  .catch((error) => {
    console.error("pg-boss whatsapp-retention worker failed to start", error);
  });

startOwnerChatMemoryWorker()
  .then(() => {
    console.log("pg-boss owner-chat-memory worker started");
  })
  .catch((error) => {
    console.error("pg-boss owner-chat-memory worker failed to start", error);
  });

startOwnerWhisperWorker()
  .then(() => {
    console.log("pg-boss owner-whisper worker started");
  })
  .catch((error) => {
    console.error("pg-boss owner-whisper worker failed to start", error);
  });
