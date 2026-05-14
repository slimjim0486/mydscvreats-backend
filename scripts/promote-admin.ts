import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const confirmed = process.argv.includes("--yes");
  if (!email || !confirmed) {
    throw new Error("Usage: npm run admin:promote -- owner@example.com --yes");
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
    select: { id: true, email: true, role: true },
  });

  console.log(`Promoted ${user.email} (${user.id}) to ${user.role}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
