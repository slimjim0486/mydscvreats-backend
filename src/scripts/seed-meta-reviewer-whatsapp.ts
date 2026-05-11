/**
 * Attach the test WhatsApp Business integration to the Meta reviewer restaurant.
 *
 * This bypasses the normal Embedded Signup flow by directly writing a
 * `WhatsAppIntegration` row with values from your Meta test WABA. The token
 * is encrypted with WHATSAPP_TOKEN_ENCRYPTION_KEY the same way Embedded
 * Signup would store it.
 *
 * Idempotent: re-running with a new token will update the cipher without
 * creating a duplicate row.
 *
 * Token source (in priority order):
 *   1. --access-token=EAA... CLI flag
 *   2. META_TEST_WHATSAPP_ACCESS_TOKEN env var
 *
 * Usage:
 *   npx tsx src/scripts/seed-meta-reviewer-whatsapp.ts --access-token=EAA...
 *   META_TEST_WHATSAPP_ACCESS_TOKEN=EAA... npx tsx src/scripts/seed-meta-reviewer-whatsapp.ts
 */

import { prisma } from "@/lib/prisma";
import { encryptAccessToken, getTokenLastFour } from "@/lib/whatsapp-business";

const RESTAURANT_SLUG = "meta-reviewer-demo";

// Values discovered via Graph API debug_token + phone number lookup on 2026-05-11.
// These are the Meta-provisioned test WABA values for the Bustan app.
const TEST_WABA = {
  wabaId: "3844919625800772",
  phoneNumberId: "977203228799889",
  displayPhoneNumber: "+15558095565",
  metaUserId: "10101576180763585",
} as const;

function parseArgs(argv: string[]) {
  let token: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith("--access-token=")) {
      token = arg.slice("--access-token=".length);
    }
  }
  return { token };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = args.token ?? process.env.META_TEST_WHATSAPP_ACCESS_TOKEN ?? null;

  if (!token) {
    console.error(
      `  ✗ No access token provided.\n` +
        `    Pass --access-token=EAA... or set META_TEST_WHATSAPP_ACCESS_TOKEN in env.`
    );
    process.exit(1);
  }

  if (!token.startsWith("EAA") || token.length < 100) {
    console.error(
      `  ✗ Token doesn't look like a Meta access token (expected EAA... prefix, ${token.length} chars provided).`
    );
    process.exit(1);
  }

  console.log(`Attaching test WhatsApp Business integration to "${RESTAURANT_SLUG}"...\n`);

  // 1. Find restaurant
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT_SLUG },
  });

  if (!restaurant) {
    console.error(
      `  ✗ Restaurant "${RESTAURANT_SLUG}" not found.\n` +
        `    Run seed-meta-reviewer.ts first.`
    );
    process.exit(1);
  }
  console.log(`  ✓ Restaurant: ${restaurant.id}`);

  // 2. Check no OTHER restaurant already owns this phoneNumberId (unique constraint)
  const conflicting = await prisma.whatsAppIntegration.findUnique({
    where: { phoneNumberId: TEST_WABA.phoneNumberId },
  });

  if (conflicting && conflicting.restaurantId !== restaurant.id) {
    console.error(
      `  ✗ phoneNumberId ${TEST_WABA.phoneNumberId} is already attached to a different restaurant ` +
        `(${conflicting.restaurantId}).\n` +
        `    Each WABA phone number can only be linked to one restaurant.\n` +
        `    Either detach it from that restaurant first, or use a different test number.`
    );
    process.exit(1);
  }

  // 3. Encrypt the token using the platform's existing helper
  const cipher = encryptAccessToken(token);
  const lastFour = getTokenLastFour(token);

  // 4. Upsert WhatsAppIntegration
  const now = new Date();
  const integration = await prisma.whatsAppIntegration.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      status: "connected",
      wabaId: TEST_WABA.wabaId,
      businessAccountId: TEST_WABA.wabaId,
      metaUserId: TEST_WABA.metaUserId,
      phoneNumberId: TEST_WABA.phoneNumberId,
      displayPhoneNumber: TEST_WABA.displayPhoneNumber,
      accessTokenCipher: cipher,
      tokenLastFour: lastFour,
      connectedAt: now,
      lastError: null,
    },
    create: {
      restaurantId: restaurant.id,
      status: "connected",
      wabaId: TEST_WABA.wabaId,
      businessAccountId: TEST_WABA.wabaId,
      metaUserId: TEST_WABA.metaUserId,
      phoneNumberId: TEST_WABA.phoneNumberId,
      displayPhoneNumber: TEST_WABA.displayPhoneNumber,
      accessTokenCipher: cipher,
      tokenLastFour: lastFour,
      connectedAt: now,
    },
  });

  console.log(`  ✓ Integration: ${integration.id}`);
  console.log(`    status:             ${integration.status}`);
  console.log(`    wabaId:             ${integration.wabaId}`);
  console.log(`    phoneNumberId:      ${integration.phoneNumberId}`);
  console.log(`    displayPhoneNumber: ${integration.displayPhoneNumber}`);
  console.log(`    metaUserId:         ${integration.metaUserId}`);
  console.log(`    tokenLastFour:      ${integration.tokenLastFour}`);
  console.log(`    connectedAt:        ${integration.connectedAt?.toISOString()}`);

  console.log(`\nDone. CRM dashboard will now show a connected WhatsApp Business Account.`);
  console.log(`Test it: log in at https://getbustan.com/sign-in → CRM tab.`);
  console.log(
    `\nNote: this token is the 24h temporary token from Meta API Setup and will expire. ` +
      `Re-run this script with a permanent System User token when you have one.`
  );
}

main()
  .catch((err) => {
    console.error("WhatsApp seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
