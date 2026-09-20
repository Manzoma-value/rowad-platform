// Re-runnable presentation seed for rowad.manzoma.sa.
//
// It creates a separate demo environment, provisions its sole administrator,
// removes every other admin membership from that environment, and adds safe
// fictional data. Albania credentials are never copied or reused here.
//
// Run after deployment with production environment variables available:
//   npm run seed:white-label-demo

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { seedRowadModel } from "./rowad-concepts";

const databaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("Missing DATABASE_URL");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const DEMO_SLUG = process.env.NEXT_PUBLIC_WHITE_LABEL_DEMO_SCHOOL_SLUG ?? "rowad-demo";
const ADMIN_EMAIL = (process.env.WHITE_LABEL_ADMIN_EMAIL ?? "manzoma@rowad.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.WHITE_LABEL_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.WHITE_LABEL_ADMIN_NAME ?? "Manzoma Admin";

const demoTeachers = [
  { email: "sara.hassan@rowad-demo.example", fullName: "Sara Hassan" },
  { email: "omar.khalid@rowad-demo.example", fullName: "Omar Khalid" },
];

const demoStudents = [
  { email: "amal.ahmed@rowad-demo.example", fullName: "Amal Ahmed", city: "Riyadh", age: 16, status: "CLASS_ASSIGNED" as const },
  { email: "yousef.ali@rowad-demo.example", fullName: "Yousef Ali", city: "Jeddah", age: 17, status: "CLASS_ASSIGNED" as const },
  { email: "lina.salem@rowad-demo.example", fullName: "Lina Salem", city: "Dammam", age: 16, status: "SCHOOL_PLACEMENT_SUBMITTED" as const },
  { email: "adam.noor@rowad-demo.example", fullName: "Adam Noor", city: "Madinah", age: 15, status: "SCHOOL_PLACEMENT_SUBMITTED" as const },
  { email: "maryam.ibrahim@rowad-demo.example", fullName: "Maryam Ibrahim", city: "Riyadh", age: 17, status: "INTAKE_SUBMITTED" as const },
];

async function findOrCreateClass(schoolId: string, name: string, teacherId: string) {
  const existing = await prisma.class.findFirst({ where: { school_id: schoolId, name } });
  if (existing) {
    return prisma.class.update({ where: { id: existing.id }, data: { teacher_id: teacherId } });
  }
  return prisma.class.create({ data: { school_id: schoolId, name, teacher_id: teacherId } });
}

async function findAuthUserId(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text FROM auth.users WHERE lower(email) = ${email} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

async function provisionWhiteLabelAdmin(schoolId: string) {
  let userId = await findAuthUserId(ADMIN_EMAIL);

  if (!userId) {
    if (!ADMIN_PASSWORD) {
      throw new Error("WHITE_LABEL_ADMIN_PASSWORD is required when creating the white-label administrator");
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME, role: "SCHOOL_ADMIN" },
    });
    if (error || !data.user) throw new Error(`Could not create white-label administrator: ${error?.message}`);
    userId = data.user.id;
  } else if (ADMIN_PASSWORD) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME, role: "SCHOOL_ADMIN" },
    });
    if (error) throw new Error(`Could not update white-label administrator: ${error.message}`);
  }

  const conflictingProfile = await prisma.profile.findUnique({ where: { email: ADMIN_EMAIL } });
  if (conflictingProfile && conflictingProfile.id !== userId) {
    throw new Error("The white-label email belongs to a profile with a different authentication id");
  }

  await prisma.profile.upsert({
    where: { id: userId },
    update: {
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: "SCHOOL_ADMIN",
      is_active: true,
      is_view_only: false,
      view_only_expires_at: null,
    },
    create: {
      id: userId,
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: "SCHOOL_ADMIN",
      is_active: true,
    },
  });

  await prisma.schoolAdminMember.upsert({
    where: { school_id_profile_id: { school_id: schoolId, profile_id: userId } },
    update: {},
    create: { school_id: schoolId, profile_id: userId },
  });

  const revoked = await prisma.schoolAdminMember.deleteMany({
    where: { school_id: schoolId, profile_id: { not: userId } },
  });

  return revoked.count;
}

async function main() {
  console.log("Seeding Rowad white-label presentation environment...");

  const school = await prisma.school.upsert({
    where: { slug: DEMO_SLUG },
    update: {
      name: "منصة بناء الأهلية (الرواد)",
      name_alt: "Binaa Al-Ahliyyah (Al Rowad)",
      language: "en",
      description: "A private white-label environment used for product demonstrations.",
      is_active: true,
      color_bg: "#0B0B0C",
      color_primary: "#6B1E2D",
      color_secondary: "#B8A082",
      features: {},
    },
    create: {
      name: "منصة بناء الأهلية (الرواد)",
      name_alt: "Binaa Al-Ahliyyah (Al Rowad)",
      slug: DEMO_SLUG,
      language: "en",
      description: "A private white-label environment used for product demonstrations.",
      color_bg: "#0B0B0C",
      color_primary: "#6B1E2D",
      color_secondary: "#B8A082",
      features: {},
    },
  });

  await seedRowadModel(prisma, school.id);
  const revokedAdminCount = await provisionWhiteLabelAdmin(school.id);

  const teachers = [] as { id: string; profile_id: string }[];
  for (const person of demoTeachers) {
    const profile = await prisma.profile.upsert({
      where: { email: person.email },
      update: { full_name: person.fullName, role: "TEACHER", is_active: true },
      create: { id: randomUUID(), email: person.email, full_name: person.fullName, role: "TEACHER" },
    });
    const teacher = await prisma.teacher.upsert({
      where: { profile_id: profile.id },
      update: { school_id: school.id, onboarding_status: "ACTIVE" },
      create: { profile_id: profile.id, school_id: school.id, onboarding_status: "ACTIVE" },
      select: { id: true, profile_id: true },
    });
    teachers.push(teacher);
  }

  const foundation = await findOrCreateClass(school.id, "Foundation Cohort", teachers[0].id);
  const leadership = await findOrCreateClass(school.id, "Leadership Cohort", teachers[1].id);

  const students = [] as { id: string; status: string }[];
  for (let index = 0; index < demoStudents.length; index += 1) {
    const person = demoStudents[index];
    const profile = await prisma.profile.upsert({
      where: { email: person.email },
      update: { full_name: person.fullName, role: "STUDENT", is_active: true },
      create: { id: randomUUID(), email: person.email, full_name: person.fullName, role: "STUDENT" },
    });
    const classId = person.status === "CLASS_ASSIGNED" ? (index % 2 === 0 ? foundation.id : leadership.id) : null;
    const student = await prisma.student.upsert({
      where: { profile_id: profile.id },
      update: { school_id: school.id, class_id: classId, city: person.city, age: person.age, onboarding_status: person.status },
      create: { profile_id: profile.id, school_id: school.id, class_id: classId, city: person.city, age: person.age, onboarding_status: person.status },
      select: { id: true },
    });
    students.push({ id: student.id, status: person.status });
  }

  let assessment = await prisma.assessment.findFirst({
    where: { school_id: school.id, type: "SCHOOL_PLACEMENT" },
    select: { id: true },
  });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: { school_id: school.id, type: "SCHOOL_PLACEMENT", title: "Rowad Demo Placement Assessment", is_active: true },
      select: { id: true },
    });
  }
  const questionCount = await prisma.assessmentQuestion.count({ where: { assessment_id: assessment.id } });
  if (questionCount === 0) {
    await prisma.assessmentQuestion.create({
      data: {
        assessment_id: assessment.id,
        type: "MCQ",
        text: "Which learning format best supports your current goals?",
        correct_answer: "Guided cohort",
        order: 0,
        options: { create: ["Guided cohort", "Self-paced study", "Peer learning", "Project-based learning"].map((text, order) => ({ text, order })) },
      },
    });
  }

  for (const student of students.filter((item) => item.status === "SCHOOL_PLACEMENT_SUBMITTED")) {
    const existingAttempt = await prisma.assessmentAttempt.findFirst({
      where: { assessment_id: assessment.id, student_id: student.id },
      select: { id: true },
    });
    if (!existingAttempt) {
      await prisma.assessmentAttempt.create({
        data: { assessment_id: assessment.id, student_id: student.id, assigned_school_id: school.id, review_status: "PENDING" },
      });
    }
  }

  const announcement = "Welcome to Binaa Al-Ahliyyah (Al Rowad) — this private workspace is ready for your presentation.";
  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { school_id: school.id, class_id: foundation.id, content: announcement },
    select: { id: true },
  });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: { school_id: school.id, class_id: foundation.id, teacher_id: teachers[0].id, content: announcement },
    });
  }

  console.log(`Done. White-label access is assigned to one administrator; ${revokedAdminCount} previous membership(s) revoked.`);
  console.log(`Demo environment: ${school.name_alt} (${DEMO_SLUG})`);
}

main()
  .catch((error) => {
    console.error("White-label demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
