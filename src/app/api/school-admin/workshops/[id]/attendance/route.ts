import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDay(value: unknown) {
  const day = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || dayKey(parsed) !== day ? null : parsed;
}

function attendanceDays(
  scheduleValue: unknown,
  startDate: Date | null,
  endDate: Date | null,
  recordedDays: Date[] = [],
) {
  const days = new Set(recordedDays.map(dayKey));
  const schedule = Array.isArray(scheduleValue)
    ? scheduleValue as Array<{ date?: string; type?: string }>
    : [];
  if (schedule.length) {
    for (const day of schedule) {
      if (day.type === "WORK" && /^\d{4}-\d{2}-\d{2}$/.test(day.date ?? "")) days.add(day.date!);
    }
  } else if (startDate && endDate) {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      days.add(dayKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return Array.from(days).sort();
}

async function getWorkshop(id: string, schoolId: string) {
  return prisma.workshop.findFirst({
    where: { id, school_id: schoolId },
    select: { id: true, title: true, start_date: true, end_date: true, schedule: true },
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await getWorkshop(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [teachers, records] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        school_id: auth.school.id,
        OR: [
          { workshop_enrollments: { some: { workshop_id: id } } },
          { workshop_signup_id: id },
          { workshop_attendance: { some: { workshop_id: id } } },
        ],
      },
      orderBy: { profile: { full_name: "asc" } },
      select: {
        id: true,
        onboarding_status: true,
        profile: { select: { full_name: true, email: true, avatar_url: true, is_active: true } },
      },
    }),
    prisma.workshopAttendance.findMany({
      where: { workshop_id: id },
      orderBy: { checked_in_at: "asc" },
      select: {
        id: true,
        teacher_id: true,
        day_date: true,
        checked_in_at: true,
        source: true,
        recorded_by: true,
      },
    }),
  ]);

  const days = attendanceDays(workshop.schedule, workshop.start_date, workshop.end_date, records.map((record) => record.day_date));
  const byTeacherAndDay = new Map(records.map((record) => [`${record.teacher_id}:${dayKey(record.day_date)}`, record]));

  return NextResponse.json({
    workshop: { id: workshop.id, title: workshop.title },
    days,
    teachers: teachers.map((teacher) => {
      const attendance = days.map((day) => {
        const record = byTeacherAndDay.get(`${teacher.id}:${day}`);
        return record ? {
          id: record.id,
          checked_in_at: record.checked_in_at,
          source: record.source,
          recorded_by: record.recorded_by,
        } : null;
      });
      return {
        teacher_id: teacher.id,
        full_name: teacher.profile.full_name,
        email: teacher.profile.email,
        avatar_url: teacher.profile.avatar_url,
        status: teacher.onboarding_status,
        is_active: teacher.profile.is_active,
        days_present: attendance.map(Boolean),
        attendance,
        total_present: attendance.filter(Boolean).length,
      };
    }),
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  let body: { teacher_id?: string; day_date?: string; checked_in_at?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const dayDate = parseDay(body.day_date);
  if (!body.teacher_id || !dayDate) {
    return NextResponse.json({ error: "teacher_id and valid day_date required" }, { status: 400 });
  }

  const [workshop, teacher] = await Promise.all([
    getWorkshop(id, auth.school.id),
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
  if (!attendanceDays(workshop.schedule, workshop.start_date, workshop.end_date).includes(body.day_date!)) {
    return NextResponse.json({ error: "Not a training day" }, { status: 409 });
  }

  const checkedInAt = body.checked_in_at ? new Date(body.checked_in_at) : new Date();
  if (Number.isNaN(checkedInAt.getTime())) {
    return NextResponse.json({ error: "Invalid check-in time" }, { status: 400 });
  }
  const key = { workshop_id: id, teacher_id: teacher.id, day_date: dayDate };
  const existing = await prisma.workshopAttendance.findUnique({
    where: { workshop_id_teacher_id_day_date: key },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Attendance already exists" }, { status: 409 });

  const [, attendance] = await prisma.$transaction([
    prisma.workshopEnrollment.upsert({
      where: { workshop_id_teacher_id: { workshop_id: id, teacher_id: teacher.id } },
      create: { workshop_id: id, teacher_id: teacher.id, source: "MANUAL", enrolled_by: auth.profile.id },
      update: {},
    }),
    prisma.workshopAttendance.create({
      data: {
        ...key,
        checked_in_at: checkedInAt,
        source: "MANUAL",
        recorded_by: auth.profile.id,
      },
      select: { id: true, checked_in_at: true, source: true, recorded_by: true },
    }),
  ]);

  return NextResponse.json({ attendance }, { status: 201 });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const attendanceId = new URL(req.url).searchParams.get("attendance_id");
  if (!attendanceId) return NextResponse.json({ error: "attendance_id required" }, { status: 400 });

  const record = await prisma.workshopAttendance.findFirst({
    where: {
      id: attendanceId,
      workshop_id: id,
      workshop: { school_id: auth.school.id },
    },
    select: { id: true },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.workshopAttendance.delete({ where: { id: record.id } });
  return NextResponse.json({ success: true });
}
