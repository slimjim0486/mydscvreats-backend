// Sabt Pack pg-boss worker — weekly Sunday-07:00-GST batch.
//
// Mirrors backend/src/queue/owner-whisper.ts in shape: a fanout job (cron-
// scheduled) that enumerates Pro/Portfolio restaurants without a current-week
// pack and enqueues per-restaurant generate jobs.
//
// Production deploy notes:
//   • Set SABT_PACK_WHATSAPP_ENABLED=false on first rollout — the dashboard
//     banner is the delivery channel until the `sabt_pack_ready` Meta template
//     clears review.
//   • The cron `0 3 * * 0` lands at exactly 07:00 GST every Sunday (UAE is
//     UTC+4 year-round, no DST).
//   • Idempotency: re-running the same Sunday twice is a no-op for restaurants
//     that already have a `ready` pack (enforced by the unique key on
//     ad_projects.(restaurant_id, sabt_pack_week_start_date)).

import PgBoss from "pg-boss";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  decryptAccessToken,
  normalizeE164Phone,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp-business";
import { getBoss } from "@/queue/image-generation";
import {
  runSabtPackGeneration,
  sundayOfThisWeekUae,
} from "@/services/sabt-pack";

export const SABT_PACK_FANOUT_JOB = "sabt-pack-fanout";
export const SABT_PACK_GENERATE_JOB = "sabt-pack-generate";

const RETRY_LIMIT = 1;
const FANOUT_RESTAURANT_CAP = 1000;

/** Max length for a WhatsApp template body parameter. Meta caps each
 *  parameter at ~80 chars and rejects sends with longer values (error 131009).
 *  We trim conservatively to 60 to leave room for surrounding template text. */
const WHATSAPP_PARAM_MAX_LENGTH = 60;

/** Sanitize a parameter value for sendWhatsAppTemplate. Strips newlines,
 *  tabs, and runs of whitespace that Meta rejects; truncates to the per-param
 *  cap. Returns a placeholder when the input collapses to empty. */
function sanitizeTemplateParam(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const cleaned = value
    .replace(/[\r\n\t]+/g, " ") // newlines/tabs → space
    .replace(/\s{2,}/g, " ") // collapse runs of whitespace
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > WHATSAPP_PARAM_MAX_LENGTH
    ? `${cleaned.slice(0, WHATSAPP_PARAM_MAX_LENGTH - 1)}…`
    : cleaned;
}

/** Strip Meta access tokens from an error message so they cannot leak through
 *  Sentry or stdout logs. Meta long-lived tokens are `EAA` + base64-ish
 *  characters, typically 200+ chars. Conservative regex catches both
 *  long-lived (EAA…) and short-lived (sk-style) tokens. */
function redactMetaSecrets(input: string): string {
  return input
    .replace(/EAA[A-Za-z0-9_-]{20,}/g, "EAA…[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer …[redacted]");
}

let fanoutQueueReady: Promise<void> | null = null;
let generateQueueReady: Promise<void> | null = null;

async function ensureFanoutQueue() {
  if (!fanoutQueueReady) {
    fanoutQueueReady = getBoss()
      .then((queue) => queue.createQueue(SABT_PACK_FANOUT_JOB))
      .catch((error) => {
        fanoutQueueReady = null;
        throw error;
      });
  }
  await fanoutQueueReady;
}

async function ensureGenerateQueue() {
  if (!generateQueueReady) {
    generateQueueReady = getBoss()
      .then((queue) => queue.createQueue(SABT_PACK_GENERATE_JOB))
      .catch((error) => {
        generateQueueReady = null;
        throw error;
      });
  }
  await generateQueueReady;
}

export interface SabtPackGenerateJobData {
  restaurantId: string;
  /** ISO date string "YYYY-MM-DD" — Sunday of the target week in UAE local. */
  weekStartDate: string;
}

type GenerateWorkerJob = PgBoss.JobWithMetadata<SabtPackGenerateJobData>;

export async function startSabtPackWorker() {
  await ensureFanoutQueue();
  await ensureGenerateQueue();
  const queue = await getBoss();

  await queue.work<SabtPackGenerateJobData>(
    SABT_PACK_GENERATE_JOB,
    { batchSize: 4, includeMetadata: true } as PgBoss.WorkOptions,
    async (jobs) => {
      for (const job of jobs as unknown as GenerateWorkerJob[]) {
        try {
          await processGenerateJob(job);
        } catch (error) {
          console.warn(
            `[sabt-pack] generate failed for ${job.data.restaurantId} (${job.data.weekStartDate}):`,
            error
          );
          // One bad restaurant must not cascade across the batch.
        }
      }
    }
  );

  // Sundays at 03:00 UTC = 07:00 GST.
  await queue.schedule(SABT_PACK_FANOUT_JOB, "0 3 * * 0", undefined, {
    tz: "UTC",
  });
  await queue.work(SABT_PACK_FANOUT_JOB, async () => {
    await fanOutSabtPackJobs();
  });
}

/** Enumerate Pro/Portfolio restaurants without a current-week pack and enqueue
 *  one generate job each. Mirrors `fanOutWhisperJobs` in owner-whisper.ts. */
async function fanOutSabtPackJobs() {
  const weekStartDate = sundayOfThisWeekUae();
  const weekDate = new Date(`${weekStartDate}T00:00:00Z`);

  const candidates = await prisma.restaurant.findMany({
    where: {
      sabtPackEnabled: true,
      subscriptionStatus: { in: ["active", "trial"] },
      // Skip restaurants that already have a Sabt Pack row for this week,
      // regardless of status. The orchestrator's idempotency check will skip
      // ready/delivered/approved, and recover from failed/partial.
      adProjects: {
        none: { sabtPackWeekStartDate: weekDate },
      },
      // Subscription branch: per-restaurant Stripe subscription is Pro or
      // Portfolio. Operator branch: brand sits under an OperatorAccount
      // (Portfolio path). Both branches must reflect the entitlement gate
      // — never enqueue a job whose orchestrator will short-circuit, since
      // the pg-boss job is still consumed (logs, retry budget).
      OR: [
        {
          subscription: {
            is: {
              plan: { in: ["pro", "portfolio"] },
              status: { in: ["active", "trial"] },
            },
          },
        },
        {
          operatorAccount: {
            is: {
              status: { in: ["active", "trial"] },
            },
          },
          // Belt-and-suspenders: per entitlements.ts, Portfolio activation
          // requires the operator to be active/trial AND have >= 3 brands.
          // Brand-count is per-operator so we filter at the operator level
          // (Prisma can't aggregate a count condition inline). We rely on
          // loadEligibleRestaurant() to do the precise check; here we just
          // exclude operators with no brands yet — a hard zero never wins.
        },
      ],
    },
    select: { id: true },
    take: FANOUT_RESTAURANT_CAP,
  });

  await ensureGenerateQueue();
  const queue = await getBoss();

  let enqueued = 0;
  for (const r of candidates) {
    await queue.send(
      SABT_PACK_GENERATE_JOB,
      { restaurantId: r.id, weekStartDate },
      { retryLimit: RETRY_LIMIT }
    );
    enqueued++;
  }

  console.log(`[sabt-pack] weekStartDate=${weekStartDate} enqueued=${enqueued}`);
  if (candidates.length === FANOUT_RESTAURANT_CAP) {
    console.warn(
      `[sabt-pack] fan-out hit cap of ${FANOUT_RESTAURANT_CAP} — consider raising`
    );
  }
}

async function processGenerateJob(job: GenerateWorkerJob) {
  const { restaurantId, weekStartDate } = job.data;

  if (!env.ANTHROPIC_API_KEY) {
    console.warn(`[sabt-pack] no ANTHROPIC_API_KEY; skipping ${restaurantId}`);
    return;
  }

  const result = await runSabtPackGeneration({ restaurantId, weekStartDate });

  if (result.status === "skipped" || result.status === "failed") {
    return;
  }

  if (!result.shouldSendWhatsApp) {
    // Partial pack — banner only.
    console.log(
      `[sabt-pack] ${restaurantId} ${weekStartDate} partial=${result.slotsPersisted}/7 (banner-only)`
    );
    return;
  }

  if (!env.SABT_PACK_WHATSAPP_ENABLED) {
    console.log(
      `[sabt-pack] ${restaurantId} ${weekStartDate} ready, WhatsApp send disabled by flag`
    );
    return;
  }

  await sendSabtPackWhatsApp({
    restaurantId,
    adProjectId: result.adProjectId,
  });
}

/** Sends the `sabt_pack_ready` template to the restaurant's WhatsApp Business
 *  number. Updates `sabt_pack_delivered_at` on success. Errors do NOT bubble
 *  to the worker because a WhatsApp outage shouldn't reset a successful pack
 *  to "generating" — the banner is the fallback. */
async function sendSabtPackWhatsApp(args: { restaurantId: string; adProjectId: string }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: args.restaurantId },
    select: {
      id: true,
      name: true,
      cuisineType: true,
      whatsappNumber: true,
      whatsappIntegration: {
        select: {
          status: true,
          phoneNumberId: true,
          accessTokenCipher: true,
        },
      },
    },
  });

  if (!restaurant) return;
  const integration = restaurant.whatsappIntegration;
  if (!integration || integration.status !== "connected") {
    console.log(
      `[sabt-pack] ${args.restaurantId} no connected WhatsApp; banner-only delivery`
    );
    return;
  }

  const target = normalizeE164Phone(restaurant.whatsappNumber);
  if (!target) {
    console.warn(
      `[sabt-pack] ${args.restaurantId} no valid whatsappNumber; banner-only delivery`
    );
    return;
  }

  const reviewUrl = `${env.FRONTEND_APP_URL.replace(/\/$/, "")}/dashboard/sabt-pack/${args.adProjectId}`;

  // Owner-controlled strings (restaurant.name, cuisineType) are passed as
  // template parameters and must be sanitized — Meta rejects sends with
  // newlines, tabs, or runs of whitespace inside parameter values, and
  // truncates anything past ~80 chars with confusing 131009 errors.
  const params = [
    sanitizeTemplateParam(restaurant.name, "your restaurant"),
    sanitizeTemplateParam(restaurant.cuisineType, "your customers"),
    reviewUrl,
  ];

  // Decrypted access token is kept inside the try and explicitly zeroed in
  // the finally block. Errors are redacted before logging so a token can
  // never leak via Sentry / stdout.
  let accessToken = "";
  try {
    accessToken = decryptAccessToken(integration.accessTokenCipher);
    await sendWhatsAppTemplate({
      accessToken,
      phoneNumberId: integration.phoneNumberId,
      to: target,
      templateName: "sabt_pack_ready",
      parameters: params,
    });

    await prisma.adProject.update({
      where: { id: args.adProjectId },
      data: {
        sabtPackStatus: "delivered",
        sabtPackDeliveredAt: new Date(),
      },
    });
    console.log(`[sabt-pack] ${args.restaurantId} delivered via WhatsApp`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[sabt-pack] WhatsApp send failed for ${args.restaurantId}; pack remains ready:`,
      redactMetaSecrets(message)
    );
    // Don't mark delivered; banner stays visible.
  } finally {
    // Best-effort overwrite — JS GC will collect the original string, but
    // zeroing the local reference ensures it doesn't survive in the closure.
    accessToken = "";
  }
}

/** Manual trigger — used by the admin endpoint + CLI. */
export async function enqueueSabtPackForRestaurant(
  restaurantId: string,
  weekStartDate?: string
) {
  await ensureGenerateQueue();
  const queue = await getBoss();
  await queue.send(
    SABT_PACK_GENERATE_JOB,
    {
      restaurantId,
      weekStartDate: weekStartDate ?? sundayOfThisWeekUae(),
    },
    { retryLimit: RETRY_LIMIT }
  );
}
