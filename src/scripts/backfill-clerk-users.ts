// One-shot backfill for users whose DB email is the JIT placeholder
// `<clerkId>@clerk.local`. Reads the real email/name from Clerk via the
// Backend SDK and updates the DB row.
//
// Usage:
//   npx tsx src/scripts/backfill-clerk-users.ts            # all placeholder rows
//   npx tsx src/scripts/backfill-clerk-users.ts --clerk-id user_xxx   # one user
//   npx tsx src/scripts/backfill-clerk-users.ts --dry-run             # report only
//
// Safe to re-run: only writes when the Clerk record has a real email and the
// resulting value differs from what's already stored.

import { createClerkClient } from "@clerk/backend";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

interface Args {
  clerkId: string | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { clerkId: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--clerk-id") {
      args.clerkId = argv[i + 1] ?? null;
      i++;
    } else if (arg.startsWith("--clerk-id=")) {
      args.clerkId = arg.slice("--clerk-id=".length);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!env.CLERK_SECRET_KEY) {
    console.error("CLERK_SECRET_KEY is required");
    process.exit(1);
  }

  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  const where = args.clerkId
    ? { clerkId: args.clerkId }
    : { email: { endsWith: "@clerk.local" } };

  const targets = await prisma.user.findMany({ where });

  console.log(
    `Backfill: ${targets.length} user(s)${args.dryRun ? " [DRY RUN]" : ""}`
  );

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of targets) {
    try {
      const clerkUser = await clerk.users.getUser(user.clerkId);

      const primaryEmail =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        null;

      const fullName =
        [clerkUser.firstName, clerkUser.lastName]
          .filter((p): p is string => typeof p === "string" && p.length > 0)
          .join(" ") || null;

      if (!primaryEmail) {
        console.log(`  skip ${user.clerkId} — no email in Clerk`);
        skipped++;
        continue;
      }

      const willChange =
        user.email !== primaryEmail ||
        (fullName !== null && user.fullName !== fullName);

      if (!willChange) {
        console.log(`  noop ${user.clerkId} (${primaryEmail})`);
        skipped++;
        continue;
      }

      console.log(
        `  ${args.dryRun ? "would update" : "update"} ${user.clerkId}: ` +
          `${user.email} -> ${primaryEmail}` +
          (fullName ? ` | name="${fullName}"` : "")
      );

      if (!args.dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: primaryEmail,
            ...(fullName !== null && { fullName }),
          },
        });
      }
      synced++;
    } catch (err) {
      console.error(`  fail ${user.clerkId}:`, err);
      failed++;
    }
  }

  console.log(
    `\nDone. ${args.dryRun ? "would-sync" : "synced"}=${synced} skipped=${skipped} failed=${failed}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
