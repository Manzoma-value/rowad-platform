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
const legacyAdminEmail = "manzoma@rowad.com";
const accessAccounts = [
  {
    email: "admin@manzoma.sa",
    role: "SCHOOL_ADMIN",
  },
  {
    email: "teacher@manzoma.sa",
    role: "TEACHER",
  },
  {
    email: "student@manzoma.sa",
    role: "STUDENT",
  },
] as const;

async function main() {
  const [demo, albania] = await Promise.all([
    prisma.school.findUnique({ where: { slug: demoSlug }, select: { id: true } }),
    prisma.school.findUnique({ where: { slug: albaniaSlug }, select: { id: true } }),
  ]);

  assert(demo, `White-label environment '${demoSlug}' does not exist`);
  assert(albania, `Albania environment '${albaniaSlug}' does not exist`);
  assert.notEqual(demo.id, albania.id, "White-label and Albania must use different school records");

  const [legacyAuthRows, legacyProfileCount] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM auth.users WHERE lower(email) = ${legacyAdminEmail}
    `,
    prisma.profile.count({ where: { email: { equals: legacyAdminEmail, mode: "insensitive" } } }),
  ]);
  assert.equal(Number(legacyAuthRows[0]?.count ?? 0), 0, "The legacy admin auth email must be retired");
  assert.equal(legacyProfileCount, 0, "The legacy admin profile email must be retired");

  const demoAdmins = await prisma.schoolAdminMember.findMany({
    where: { school_id: demo.id },
    select: {
      profile_id: true,
      profile: { select: { email: true, role: true, is_active: true } },
    },
  });

  assert.equal(demoAdmins.length, 1, "White-label must have exactly one administrator membership");
  const soleAdmin = demoAdmins[0];
  assert.equal(soleAdmin.profile.email?.toLowerCase(), accessAccounts[0].email);
  assert.equal(soleAdmin.profile.role, "SCHOOL_ADMIN");
  assert.equal(soleAdmin.profile.is_active, true);

  const profiles = await prisma.profile.findMany({
    where: { email: { in: accessAccounts.map(({ email }) => email) } },
    select: {
      id: true,
      email: true,
      role: true,
      is_active: true,
      school_admin_memberships: { select: { school_id: true } },
      teacher: { select: { school_id: true, onboarding_status: true } },
      student: { select: { school_id: true, class_id: true, onboarding_status: true } },
    },
  });
  assert.equal(profiles.length, 3, "All three closed white-label access profiles must exist");

  for (const expected of accessAccounts) {
    const profile = profiles.find((item) => item.email?.toLowerCase() === expected.email);
    assert(profile, `Missing white-label profile ${expected.email}`);
    assert.equal(profile.role, expected.role, `${expected.email} has the wrong role`);
    assert.equal(profile.is_active, true, `${expected.email} must be active`);

    if (expected.role === "SCHOOL_ADMIN") {
      assert.deepEqual(profile.school_admin_memberships.map(({ school_id }) => school_id), [demo.id]);
    } else if (expected.role === "TEACHER") {
      assert.equal(profile.teacher?.school_id, demo.id);
      assert.equal(profile.teacher?.onboarding_status, "ACTIVE");
    } else {
      assert.equal(profile.student?.school_id, demo.id);
      assert.equal(profile.student?.onboarding_status, "CLASS_ASSIGNED");
      assert(profile.student?.class_id, "The white-label student must belong to a demo class");
    }
  }

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

  console.log("Database isolation audit passed: three role-bound accounts in the separate white-label environment.");
}

main()
  .catch((error) => {
    console.error("Database isolation audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
