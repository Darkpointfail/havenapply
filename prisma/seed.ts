import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Development-only accounts. Every seeded user has isDevAccount=true.
 * Passwords are printed once in the seed output — never use in production.
 */
async function main() {
  const password = "DevOnlyPass123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const accounts = [
    {
      email: "family.dev@havenapply.local",
      name: "Dev Family",
      role: Role.FAMILY,
    },
    {
      email: "staff.dev@havenapply.local",
      name: "Dev Staff",
      role: Role.STAFF,
    },
  ] as const;

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        passwordHash,
        isDevAccount: true,
      },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
        isDevAccount: true,
        emailVerified: new Date(),
      },
    });
  }

  console.log("Seeded DEV accounts (isDevAccount=true):");
  for (const account of accounts) {
    console.log(`  - ${account.role}: ${account.email} / ${password}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
