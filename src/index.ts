import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@/lib/env";
import { analyticsRoute } from "@/routes/analytics";
import { aiRoute } from "@/routes/ai";
import { menuRoute } from "@/routes/menu";
import { restaurantsRoute } from "@/routes/restaurants";
import { subscriptionsRoute } from "@/routes/subscriptions";
import { uploadRoute } from "@/routes/upload";

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
app.route("/api/menu", menuRoute);
app.route("/api/menu", aiRoute);
app.route("/api/subscriptions", subscriptionsRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/upload", uploadRoute);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`mydscvr Eats backend listening on http://localhost:${info.port}`);
  }
);
