// One-off Sabt Pack runner for local dev + staging smoke tests.
//
// Usage:
//   npm run sabt-pack:trigger -- --restaurant=<id>
//   npm run sabt-pack:trigger -- --restaurant=<id> --week=2026-05-17
//   npm run sabt-pack:trigger -- --restaurant=<id> --send-email
//
// Modes:
//   default:        runs the orchestrator directly (no worker, no email).
//                   Useful for verifying generation works end-to-end without
//                   spamming inboxes. The dashboard banner is the delivery
//                   channel in this mode.
//   --send-email:   enqueues the same job through the pg-boss worker, which
//                   ALSO sends the "your Sabt Pack is ready" email via Resend.
//                   Lets you smoke-test the email delivery against a real
//                   restaurant whose owner email you control. Requires
//                   RESEND_API_KEY + RESEND_FROM_EMAIL configured.

import "dotenv/config";

const args = process.argv.slice(2);
function flag(name: string): string | true | null {
  for (const arg of args) {
    if (arg === `--${name}`) return true;
    if (arg.startsWith(`--${name}=`)) return arg.slice(name.length + 3);
  }
  return null;
}

const restaurantArg = flag("restaurant");
const restaurantId = typeof restaurantArg === "string" ? restaurantArg : null;
if (!restaurantId) {
  console.error(
    "Usage: npm run sabt-pack:trigger -- --restaurant=<id> [--week=YYYY-MM-DD] [--send-email]"
  );
  process.exit(1);
}

const weekArg = flag("week");
const weekStartDate = typeof weekArg === "string" ? weekArg : undefined;
const sendEmail = flag("send-email") === true;

async function main() {
  console.log(
    `[sabt-pack-trigger] restaurant=${restaurantId} week=${weekStartDate ?? "current"} sendEmail=${sendEmail}`
  );

  if (sendEmail) {
    // Go through the worker so the real Sunday-morning email is sent. The
    // worker handles generation, persistence, AND owner notification.
    const { enqueueSabtPackForRestaurant } = await import(
      "../src/queue/sabt-pack"
    );
    await enqueueSabtPackForRestaurant(restaurantId, weekStartDate);
    console.log(
      `[sabt-pack-trigger] enqueued via worker — generation + email will run asynchronously.`
    );
    console.log(
      `[sabt-pack-trigger] tail your worker logs for "[sabt-pack] ${restaurantId} delivered via email".`
    );
    return;
  }

  // Default mode: call the orchestrator directly. No worker, no email.
  const { runSabtPackGeneration, sundayOfThisWeekUae } = await import(
    "../src/services/sabt-pack/index"
  );

  const week = weekStartDate ?? sundayOfThisWeekUae();
  const result = await runSabtPackGeneration({
    restaurantId,
    weekStartDate: week,
  });

  console.log("[sabt-pack-trigger] result:", JSON.stringify(result, null, 2));

  if (result.status === "ready" || result.status === "partial") {
    const reviewUrl = `${process.env.FRONTEND_APP_URL ?? "http://localhost:3000"}/dashboard/ad-studio/weekly/${result.adProjectId}`;
    console.log(`[sabt-pack-trigger] review surface: ${reviewUrl}`);
    console.log(
      `[sabt-pack-trigger] no email sent (direct orchestrator call). Re-run with --send-email to test email delivery.`
    );
  }
}

main()
  .catch((error) => {
    console.error("[sabt-pack-trigger] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
