/**
 * Flip the WhatsApp Ordering v1 feature flag for a restaurant.
 *
 *   npm run orders-v1:enable  -- <slug>           # enable
 *   npm run orders-v1:enable  -- <slug> --off     # disable
 *
 * Pilot rollout pattern: enable one restaurant at a time, watch for
 * 24h, then enable the next. Per [[project_pricing_v2]] no extra fee.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2]?.trim();
  const disable = process.argv.includes("--off");
  if (!slug) {
    throw new Error(
      "Usage: npm run orders-v1:enable -- <restaurant-slug> [--off]"
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      whatsappNumber: true,
      ordersV1Enabled: true,
      whatsappIntegration: { select: { status: true, operatorPhoneVerifiedAt: true } },
    },
  });
  if (!restaurant) {
    throw new Error(`Restaurant not found: ${slug}`);
  }

  // Hard preconditions for enable (skip checks on --off).
  if (!disable) {
    if (!restaurant.whatsappNumber) {
      throw new Error(
        `[abort] ${restaurant.slug} has no whatsappNumber set. Orders v1 promises ` +
          `"receipt on WhatsApp" — refusing to enable without a number to receive ` +
          `operator alerts.`
      );
    }
    if (restaurant.whatsappIntegration?.status !== "connected") {
      throw new Error(
        `[abort] ${restaurant.slug} does not have a connected WhatsApp Business ` +
          `integration. Customer + restaurant alerts cannot send. Connect Meta ` +
          `WhatsApp first, then re-run this script.`
      );
    }
    if (!restaurant.whatsappIntegration.operatorPhoneVerifiedAt) {
      console.warn(
        `[warn] ${restaurant.slug} operator phone is NOT yet verified. After enabling, ` +
          `the operator must send the literal text "CONFIRM" from ${restaurant.whatsappNumber} ` +
          `to the WABA before Accept/Reject taps will be honored. Order creation works either way.`
      );
    }
  }

  const next = !disable;
  if (restaurant.ordersV1Enabled === next) {
    console.log(`No change — ${restaurant.slug} ordersV1Enabled already ${next}`);
    return;
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { ordersV1Enabled: next },
  });

  console.log(
    `${next ? "Enabled" : "Disabled"} orders v1 for ${restaurant.name} (${restaurant.slug}).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
