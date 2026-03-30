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

function getDbName() {
  try {
    const url = new URL(process.env.DATABASE_URL || "");
    const name = url.pathname?.replace(/^\//, "");
    return name || "lostfound";
  } catch {
    return "lostfound";
  }
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function ensurePublicUserGrants() {
  const dbName = getDbName();
  const publicPassword = process.env.PUBLIC_DB_PASSWORD || "public_app_password";

  // Create role if missing (no-op if it exists)
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'public_app') THEN CREATE ROLE public_app LOGIN PASSWORD ${quoteLiteral(publicPassword)}; END IF; END $$;`
  );

  await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE ${quoteIdent(dbName)} TO public_app;`);
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO public_app;`);
  await prisma.$executeRawUnsafe(`GRANT SELECT ON TABLE "Device" TO public_app;`);
  await prisma.$executeRawUnsafe(`GRANT SELECT ON TABLE "Message" TO public_app;`);
  await prisma.$executeRawUnsafe(`GRANT INSERT ON TABLE "Message" TO public_app;`);
  await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE "DeviceScan" FROM public_app;`);
  await prisma.$executeRawUnsafe(`GRANT INSERT ON TABLE "DeviceScan" TO public_app;`);
}

async function seedIfEmpty() {
  console.log("Checking if database needs seeding...");

  await waitForDb(10, 1000);

  await ensurePublicUserGrants();

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
