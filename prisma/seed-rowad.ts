// Dedicated, re-runnable seeder for النموذج التعليمي للرواد.
// Run: npx tsx prisma/seed-rowad.ts
//
// 1. Ensures every school has its own Rowad model (levels + 25 concepts).
// 2. Sets all existing teachers to ACTIVE (so the current demo keeps working).
// 3. Creates/resets one test teacher in PENDING_APPLICATION with known credentials
//    so the staged flow can be exercised end-to-end.
//
// Intentionally separate from prisma/seed.ts.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { seedRowadModel } from "./rowad-concepts";

const databaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl) throw new Error("Missing DATABASE_URL");
if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const TEST_TEACHER_EMAIL = "rowad.teacher@test.com";
const TEST_TEACHER_PASSWORD = "Test123456";
const TEST_TEACHER_NAME = "معلم اختبار الرواد";

// Look up an auth user id directly from auth.users (avoids the flaky admin listUsers API)
async function findAuthUserId(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text FROM auth.users WHERE email = ${email} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

async function main() {
  console.log("🌱 Seeding النموذج التعليمي للرواد...\n");

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  for (const s of schools) {
    await seedRowadModel(prisma, s.id);
    console.log(`  ✅ model ensured for school: ${s.name}`);
  }

  const activated = await prisma.teacher.updateMany({
    data: { onboarding_status: "ACTIVE" },
  });
  console.log(`\n  ✅ set ${activated.count} existing teacher(s) to ACTIVE`);

  const targetSchool = schools[0];
  if (targetSchool) {
    let userId = await findAuthUserId(TEST_TEACHER_EMAIL);
    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_TEACHER_EMAIL,
        password: TEST_TEACHER_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: TEST_TEACHER_NAME, role: "TEACHER" },
      });
      if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
      userId = data.user.id;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: TEST_TEACHER_PASSWORD,
      });
    }

    await prisma.profile.upsert({
      where: { id: userId },
      update: { full_name: TEST_TEACHER_NAME, role: "TEACHER" },
      create: { id: userId, full_name: TEST_TEACHER_NAME, email: TEST_TEACHER_EMAIL, role: "TEACHER" },
    });
    await prisma.teacher.upsert({
      where: { profile_id: userId },
      update: { onboarding_status: "PENDING_APPLICATION", school_id: targetSchool.id },
      create: {
        profile_id: userId,
        school_id: targetSchool.id,
        onboarding_status: "PENDING_APPLICATION",
      },
    });
    // Note: rowadSubmission/rowadPlacement tables no longer exist (game mode).
    console.log(`\n  ✅ test teacher ready in "${targetSchool.name}" (PENDING_APPLICATION)`);
    console.log(`     email:    ${TEST_TEACHER_EMAIL}`);
    console.log(`     password: ${TEST_TEACHER_PASSWORD}`);
  }

  console.log("\n✅ Done.");
}

main()
  .catch((e) => {
    console.error("❌ Rowad seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
