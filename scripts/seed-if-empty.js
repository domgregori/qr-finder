const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function waitForDb(retries, delayMs) {
  for (let i = 0; i < retries; i += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function seedIfEmpty() {
  console.log("Checking if database needs seeding...");

  await waitForDb(10, 1000);

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Seed skipped: users already exist.");
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@lostfound.local";
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "Admin";

  const adminPassword = await bcrypt.hash(adminPasswordPlain, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });

  console.log(`Admin user created: ${adminEmail}`);
}

seedIfEmpty()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
