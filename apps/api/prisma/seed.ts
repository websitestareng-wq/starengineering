import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const superAdminSecretKey = process.env.SEED_SUPER_ADMIN_SECRET_KEY;
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  const superAdminPhone = process.env.SEED_SUPER_ADMIN_PHONE;
  const superAdminName = process.env.SEED_SUPER_ADMIN_NAME || "Super Admin";

  const viewerPassword = process.env.SEED_ADMIN_VIEWER_PASSWORD;
  const viewerSecretKey = process.env.SEED_ADMIN_VIEWER_SECRET_KEY;
  const viewerEmail = process.env.SEED_ADMIN_VIEWER_EMAIL;
  const viewerPhone = process.env.SEED_ADMIN_VIEWER_PHONE;
  const viewerName = process.env.SEED_ADMIN_VIEWER_NAME || "Admin Viewer";

  if (
    !superAdminPassword ||
    !superAdminSecretKey ||
    !superAdminEmail ||
    !superAdminPhone ||
    !viewerPassword ||
    !viewerSecretKey ||
    !viewerEmail ||
    !viewerPhone
  ) {
    throw new Error("Missing required seed environment variables.");
  }

  const [
    superPasswordHash,
    superSecretKeyHash,
    viewerPasswordHash,
    viewerSecretKeyHash,
  ] = await Promise.all([
    bcrypt.hash(superAdminPassword, 12),
    bcrypt.hash(superAdminSecretKey, 12),
    bcrypt.hash(viewerPassword, 12),
    bcrypt.hash(viewerSecretKey, 12),
  ]);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      name: superAdminName,
      phone: superAdminPhone,
      passwordHash: superPasswordHash,
      secretKeyHash: superSecretKeyHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      name: superAdminName,
      email: superAdminEmail,
      phone: superAdminPhone,
      passwordHash: superPasswordHash,
      secretKeyHash: superSecretKeyHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: viewerEmail },
    update: {
      name: viewerName,
      phone: viewerPhone,
      passwordHash: viewerPasswordHash,
      secretKeyHash: viewerSecretKeyHash,
      role: UserRole.ADMIN_VIEWER,
      isActive: true,
    },
    create: {
      name: viewerName,
      email: viewerEmail,
      phone: viewerPhone,
      passwordHash: viewerPasswordHash,
      secretKeyHash: viewerSecretKeyHash,
      role: UserRole.ADMIN_VIEWER,
      isActive: true,
    },
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });