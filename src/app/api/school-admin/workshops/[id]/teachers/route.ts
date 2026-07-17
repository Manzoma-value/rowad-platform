import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function workshopInSchool(id: string, schoolId: string) {
  return prisma.workshop.findFirst({
    where: { id, school_id: schoolId },
    select: { id: true },
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (!await workshopInSchool(id, auth.school.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      school_id: auth.school.id,
      onboarding_status: "ACTIVE",
      profile: { is: { is_active: true } },
    },
    orderBy: { profile: { full_name: "asc" } },
    select: {
      id: true,
      profile: { select: { full_name: true, email: true, avatar_url: true } },
      workshop_enrollments: {
        where: { workshop_id: id },
        select: { id: true, source: true, enrolled_at: true },
        take: 1,
      },
      workshop_attendance: {
        where: { workshop_id: id },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    teachers: teachers.map((teacher) => ({
      teacher_id: teacher.id,
      full_name: teacher.profile.full_name,
      email: teacher.profile.email,
      avatar_url: teacher.profile.avatar_url,
      enrolled: teacher.workshop_enrollments.length > 0,
      enrollment: teacher.workshop_enrollments[0] ?? null,
      attendance_count: teacher.workshop_attendance.length,
    })),
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  let body: { teacher_id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.teacher_id) return NextResponse.json({ error: "teacher_id required" }, { status: 400 });

  const [workshop, teacher] = await Promise.all([
    workshopInSchool(id, auth.school.id),
    prisma.teacher.findFirst({
      where: {
        id: body.teacher_id,
        school_id: auth.school.id,
        onboarding_status: "ACTIVE",
        profile: { is: { is_active: true } },
      },
      select: { id: true },
    }),
  ]);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!teacher) return NextResponse.json({ error: "Teacher not active" }, { status: 409 });

  const enrollment = await prisma.workshopEnrollment.upsert({
    where: { workshop_id_teacher_id: { workshop_id: id, teacher_id: teacher.id } },
    create: {
      workshop_id: id,
      teacher_id: teacher.id,
      source: "MANUAL",
      enrolled_by: auth.profile.id,
    },
    update: {},
    select: { id: true, source: true, enrolled_at: true },
  });

  return NextResponse.json({ enrollment });
}
