import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@lostfound.local";
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "Admin";

  // Create test admin user
  const testPassword = await bcrypt.hash("johndoe123", 10);
  
  const testUser = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      password: testPassword,
      name: "Admin"
    }
  });

  console.log("Test user created:", testUser.email);

  // Create admin user with provided credentials
  const adminPassword = await bcrypt.hash(adminPasswordPlain, 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      name: adminName
    }
  });

  console.log("Admin user created:", adminUser.email);
  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
