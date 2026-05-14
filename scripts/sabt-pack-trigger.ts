// One-off Sabt Pack runner for local dev + staging smoke tests.
//
// Usage:
//   npm run sabt-pack:trigger -- --restaurant=<id>
//   npm run sabt-pack:trigger -- --restaurant=<id> --week=2026-05-17
//   npm run sabt-pack:trigger -- --restaurant=<id> --dry-run
//
// Modes:
//   --dry-run: forces SABT_PACK_WHATSAPP_ENABLED=false for this process so the
//              orchestrator runs to completion (creatives persisted, status
//              flipped to `ready`) but no WhatsApp send is attempted. The
//              dashboard banner becomes the delivery channel.
//   default:   uses whatever SABT_PACK_WHATSAPP_ENABLED is set to. In a real
//              staging env with the Meta template approved, this will send.

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
    "Usage: npm run sabt-pack:trigger -- --restaurant=<id> [--week=YYYY-MM-DD] [--dry-run]"
  );
  process.exit(1);
}

const weekArg = flag("week");
const weekStartDate = typeof weekArg === "string" ? weekArg : undefined;
const dryRun = flag("dry-run") === true;

if (dryRun) {
  process.env.SABT_PACK_WHATSAPP_ENABLED = "false";
}

async function main() {
  // Lazy-import so the env override takes effect before lib/env.ts parses.
  const { runSabtPackGeneration, sundayOfThisWeekUae } = await import(
    "../src/services/sabt-pack/index"
  );

  const week = weekStartDate ?? sundayOfThisWeekUae();
  console.log(
    `[sabt-pack-trigger] restaurant=${restaurantId} week=${week} dryRun=${dryRun}`
  );

  const result = await runSabtPackGeneration({
    restaurantId,
    weekStartDate: week,
  });

  console.log("[sabt-pack-trigger] result:", JSON.stringify(result, null, 2));

  if (result.status === "ready" && !dryRun) {
    console.log(
      `[sabt-pack-trigger] pack is ready; the WhatsApp send (if enabled) is delivered by the worker, not the script.`
    );
  }
  if (result.status === "ready" || result.status === "partial") {
    const reviewUrl = `${process.env.FRONTEND_APP_URL ?? "http://localhost:3000"}/dashboard/ad-studio/weekly/${result.adProjectId}`;
    console.log(`[sabt-pack-trigger] review surface: ${reviewUrl}`);
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
