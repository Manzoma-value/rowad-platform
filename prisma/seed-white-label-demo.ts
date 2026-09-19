// Re-runnable presentation seed for rowad.manzoma.sa.
//
// It creates a separate demo school, copies the existing rowad-albania
// school-admin memberships to it, and adds safe fictional data. Therefore the
// same real admin accounts can demonstrate the platform without ever seeing
// Albania's records on the white-label host.
//
// Run after deployment with production environment variables available:
//   npm run seed:white-label-demo

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedRowadModel } from "./rowad-concepts";

const databaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("Missing DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const DEMO_SLUG = process.env.NEXT_PUBLIC_WHITE_LABEL_DEMO_SCHOOL_SLUG ?? "rowad-demo";
const SOURCE_SLUG = "rowad-albania";

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

async function main() {
  console.log("Seeding Rowad white-label presentation environment...");

  const school = await prisma.school.upsert({
    where: { slug: DEMO_SLUG },
    update: {
      name: "مدرسة رواد النموذجية",
      name_alt: "Rowad Demo School",
      language: "en",
      description: "A fictional white-label school used for product demonstrations.",
      is_active: true,
      color_bg: "#0B0B0C",
      color_primary: "#6B1E2D",
      color_secondary: "#B8A082",
      features: {},
    },
    create: {
      name: "مدرسة رواد النموذجية",
      name_alt: "Rowad Demo School",
      slug: DEMO_SLUG,
      language: "en",
      description: "A fictional white-label school used for product demonstrations.",
      color_bg: "#0B0B0C",
      color_primary: "#6B1E2D",
      color_secondary: "#B8A082",
      features: {},
    },
  });

  await seedRowadModel(prisma, school.id);

  const sourceSchool = await prisma.school.findUnique({
    where: { slug: SOURCE_SLUG },
    select: { id: true },
  });
  if (!sourceSchool) {
    throw new Error(`Source school '${SOURCE_SLUG}' was not found; cannot copy administrator access.`);
  }

  const sourceAdmins = await prisma.schoolAdminMember.findMany({
    where: { school_id: sourceSchool.id },
    select: { profile_id: true },
  });
  if (!sourceAdmins.length) {
    throw new Error(`No school administrators found for '${SOURCE_SLUG}'.`);
  }
  await prisma.schoolAdminMember.createMany({
    data: sourceAdmins.map(({ profile_id }) => ({ school_id: school.id, profile_id })),
    skipDuplicates: true,
  });

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

  const announcement = "Welcome to the Rowad Demo School — this fictional workspace is ready for your presentation.";
  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { school_id: school.id, class_id: foundation.id, content: announcement },
    select: { id: true },
  });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: { school_id: school.id, class_id: foundation.id, teacher_id: teachers[0].id, content: announcement },
    });
  }

  console.log(`Done. ${sourceAdmins.length} existing Albania admin account(s) can now use rowad.manzoma.sa.`);
  console.log(`Demo school: ${school.name_alt} (${DEMO_SLUG})`);
}

main()
  .catch((error) => {
    console.error("White-label demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
