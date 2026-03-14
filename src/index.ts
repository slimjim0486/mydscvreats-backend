import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@/lib/env";
import { startMenuImageWorker } from "@/queue/image-generation";
import { analyticsRoute } from "@/routes/analytics";
import { aiRoute } from "@/routes/ai";
import { aiFeaturesRoute } from "@/routes/ai-features";
import { chatRoute } from "@/routes/chat";
import { dietaryTagsRoute } from "@/routes/dietary-tags";
import { menuBadgesRoute } from "@/routes/menu-badges";
import { menuRoute } from "@/routes/menu";
import { previewRoute } from "@/routes/preview";
import { restaurantsRoute } from "@/routes/restaurants";
import { shortLinksRoute } from "@/routes/short-links";
import { subscriptionsRoute } from "@/routes/subscriptions";
import { uploadRoute } from "@/routes/upload";
import { gbpRoute } from "@/routes/gbp";
import { whatsappRoute } from "@/routes/whatsapp";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [env.FRONTEND_APP_URL, "https://mydscvr.ai"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/restaurants", restaurantsRoute);
app.route("/api/short-links", shortLinksRoute);
app.route("/api/preview", previewRoute);
app.route("/api/menu", menuRoute);
app.route("/api/menu", aiRoute);
app.route("/api/chat", chatRoute);
app.route("/api/ai", aiFeaturesRoute);
app.route("/api/dietary-tags", dietaryTagsRoute);
app.route("/api/menu-badges", menuBadgesRoute);
app.route("/api/subscriptions", subscriptionsRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/upload", uploadRoute);
app.route("/api/whatsapp", whatsappRoute);
app.route("/api/gbp", gbpRoute);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`mydscvr Eats backend listening on http://localhost:${info.port}`);
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
