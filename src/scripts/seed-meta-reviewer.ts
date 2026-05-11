/**
 * Seed Pro access for the Meta App Review reviewer account.
 *
 * Prerequisites:
 *   - meta-reviewer@getbustan.com already exists in Clerk (you created it)
 *   - CLERK_SECRET_KEY points at the same Clerk instance the user was created in
 *   - DATABASE_URL points at the target DB (Railway production for live review)
 *
 * Idempotent — safe to re-run. Will not duplicate restaurant, subscription, or user.
 *
 * Usage:
 *   # Local (against backend/.env)
 *   npx tsx src/scripts/seed-meta-reviewer.ts
 *
 *   # Railway production
 *   railway run --service backend npx tsx src/scripts/seed-meta-reviewer.ts
 */

import { createClerkClient } from "@clerk/backend";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const REVIEWER_EMAIL = "meta-reviewer@getbustan.com";

const RESTAURANT = {
  slug: "meta-reviewer-demo",
  name: "Bustan Sample Kitchen",
  description:
    "A demo restaurant used by the Meta App Review team to evaluate Bustan's WhatsApp Business CRM and ad-creative tools. Real menu data, real public page — sandbox WhatsApp number attached separately.",
  cuisineType: "Mediterranean",
  themeKey: "saffron" as const,
  location: "Dubai, UAE",
  address: "Demo address — Dubai Marina, Dubai, UAE",
  phone: "+971 4 555 0100",
  logoUrl: null as string | null,
  coverImageUrl: null as string | null,
};

async function main() {
  console.log("Seeding Pro access for Meta App Review account...\n");

  // 1. Validate Clerk secret is configured
  if (!env.CLERK_SECRET_KEY) {
    console.error("CLERK_SECRET_KEY is not set. Cannot look up the reviewer in Clerk.");
    process.exit(1);
  }

  // 2. Look up the reviewer in Clerk by email
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  console.log(`  [1/5] Looking up "${REVIEWER_EMAIL}" in Clerk...`);

  const clerkUsers = await clerk.users.getUserList({
    emailAddress: [REVIEWER_EMAIL],
    limit: 5,
  });

  if (clerkUsers.totalCount === 0 || clerkUsers.data.length === 0) {
    console.error(
      `  ✗ No Clerk user found with email "${REVIEWER_EMAIL}".\n` +
        `    Make sure the user exists in the Clerk instance pointed at by CLERK_SECRET_KEY.\n` +
        `    If you created the user in production Clerk, set CLERK_SECRET_KEY to the production secret key before running this script.`
    );
    process.exit(1);
  }

  const clerkUser = clerkUsers.data[0];
  console.log(`  ✓ Found in Clerk: ${clerkUser.id}`);

  const fullName =
    [clerkUser.firstName, clerkUser.lastName]
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .join(" ") || "Meta Reviewer";

  // 3. Upsert the User row in our DB to mirror the Clerk record
  console.log(`  [2/5] Upserting User row in DB...`);
  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email: REVIEWER_EMAIL,
      fullName,
    },
    create: {
      clerkId: clerkUser.id,
      email: REVIEWER_EMAIL,
      fullName,
      role: "restaurant_owner",
    },
  });
  console.log(`  ✓ User: ${user.id} (${user.email})`);

  // 4. Find or create the restaurant
  console.log(`  [3/5] Finding or creating restaurant "${RESTAURANT.slug}"...`);
  let restaurant = await prisma.restaurant.findFirst({
    where: {
      OR: [
        { slug: RESTAURANT.slug },
        { ownerId: user.id, name: RESTAURANT.name },
      ],
    },
  });

  if (restaurant) {
    if (restaurant.ownerId !== user.id) {
      console.error(
        `  ✗ Restaurant "${RESTAURANT.slug}" already exists with a different owner ` +
          `(${restaurant.ownerId} vs reviewer ${user.id}). Aborting to avoid clobbering.`
      );
      process.exit(1);
    }
    // Ensure key fields are up to date
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: RESTAURANT.name,
        description: RESTAURANT.description,
        cuisineType: RESTAURANT.cuisineType,
        themeKey: RESTAURANT.themeKey,
        location: RESTAURANT.location,
        address: RESTAURANT.address,
        phone: RESTAURANT.phone,
        isPublished: true,
        subscriptionStatus: "active",
      },
    });
    console.log(`  ✓ Updated existing restaurant: ${restaurant.id} (${restaurant.slug})`);
  } else {
    restaurant = await prisma.restaurant.create({
      data: {
        slug: RESTAURANT.slug,
        name: RESTAURANT.name,
        description: RESTAURANT.description,
        cuisineType: RESTAURANT.cuisineType,
        themeKey: RESTAURANT.themeKey,
        location: RESTAURANT.location,
        address: RESTAURANT.address,
        phone: RESTAURANT.phone,
        isPublished: true,
        subscriptionStatus: "active",
        ownerId: user.id,
      },
    });
    console.log(`  ✓ Created restaurant: ${restaurant.id} (${restaurant.slug})`);
  }

  // 5. Upsert Pro subscription
  console.log(`  [4/5] Setting Pro subscription...`);
  const farFuture = new Date("2099-12-31T23:59:59.000Z");

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      plan: "pro",
      status: "active",
      currentPeriodEnd: farFuture,
    },
    create: {
      restaurantId: restaurant.id,
      plan: "pro",
      status: "active",
      currentPeriodEnd: farFuture,
    },
  });
  console.log(`  ✓ Subscription: ${subscription.id} (plan=${subscription.plan}, status=${subscription.status})`);

  // 6. Final sanity log
  console.log(`  [5/5] Verification:`);
  const verify = await prisma.restaurant.findUnique({
    where: { id: restaurant.id },
    include: { subscription: true, owner: { select: { email: true, clerkId: true } } },
  });

  console.log(
    `\n  Restaurant URL: https://getbustan.com/${verify?.slug}\n` +
      `  Dashboard URL:  https://getbustan.com/dashboard\n` +
      `  Login email:    ${verify?.owner.email}\n` +
      `  Clerk ID:       ${verify?.owner.clerkId}\n` +
      `  Plan:           ${verify?.subscription?.plan}\n` +
      `  Status:         ${verify?.subscription?.status}\n` +
      `  Published:      ${verify?.isPublished}\n` +
      `  Period end:     ${verify?.subscription?.currentPeriodEnd?.toISOString()}\n`
  );

  console.log("Done. Meta reviewer can now log in and will see a Pro-tier dashboard.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
