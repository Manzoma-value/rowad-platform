import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("Missing DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const demoSlug = process.env.NEXT_PUBLIC_WHITE_LABEL_DEMO_SCHOOL_SLUG ?? "rowad-demo";
const albaniaSlug = "rowad-albania";
const allowedEmail = (process.env.WHITE_LABEL_ADMIN_EMAIL ?? "manzoma@rowad.com").trim().toLowerCase();

async function main() {
  const [demo, albania] = await Promise.all([
    prisma.school.findUnique({ where: { slug: demoSlug }, select: { id: true } }),
    prisma.school.findUnique({ where: { slug: albaniaSlug }, select: { id: true } }),
  ]);

  assert(demo, `White-label environment '${demoSlug}' does not exist`);
  assert(albania, `Albania environment '${albaniaSlug}' does not exist`);
  assert.notEqual(demo.id, albania.id, "White-label and Albania must use different school records");

  const demoAdmins = await prisma.schoolAdminMember.findMany({
    where: { school_id: demo.id },
    select: {
      profile_id: true,
      profile: { select: { email: true, role: true, is_active: true } },
    },
  });

  assert.equal(demoAdmins.length, 1, "White-label must have exactly one administrator membership");
  const soleAdmin = demoAdmins[0];
  assert.equal(soleAdmin.profile.email?.toLowerCase(), allowedEmail);
  assert.equal(soleAdmin.profile.role, "SCHOOL_ADMIN");
  assert.equal(soleAdmin.profile.is_active, true);

  const crossTenantMemberships = await prisma.schoolAdminMember.count({
    where: {
      profile_id: soleAdmin.profile_id,
      school_id: { not: demo.id },
    },
  });
  assert.equal(
    crossTenantMemberships,
    0,
    "The white-label administrator must not have memberships in another environment",
  );

  const albaniaAdminIds = await prisma.schoolAdminMember.findMany({
    where: { school_id: albania.id },
    select: { profile_id: true },
  });
  const albaniaIds = new Set(albaniaAdminIds.map(({ profile_id }) => profile_id));
  assert.equal(
    demoAdmins.some(({ profile_id }) => albaniaIds.has(profile_id)),
    false,
    "Albania and white-label administrator memberships must not overlap",
  );

  console.log("Database isolation audit passed: separate environments and one exclusive white-label administrator.");
}

main()
  .catch((error) => {
    console.error("Database isolation audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
