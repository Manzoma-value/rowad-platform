// The permanent QR identifies the workshop. The server resolves the current
// calendar day on every scan and records at most one check-in per teacher/day.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isWorkshopWorkDay, workshopDateKey, workshopDayDate } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const workshop = await prisma.workshop.findUnique({
    where: { attendance_token: code },
    select: { id: true, title: true, status: true, school: { select: { slug: true } } },
  });
  if (!workshop) return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  return NextResponse.json({
    workshop_id: workshop.id,
    workshop_title: workshop.title,
    school_slug: workshop.school.slug,
    status: workshop.status,
  });
}

export async function POST(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!code) return NextResponse.json({ error: "no_code" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      is_active: true,
      teacher: { select: { id: true, school_id: true } },
    },
  });
  if (!profile?.is_active || profile.role !== "TEACHER" || !profile.teacher) {
    return NextResponse.json({ error: "not_a_teacher" }, { status: 403 });
  }

  const workshop = await prisma.workshop.findUnique({
    where: { attendance_token: code },
    select: {
      id: true,
      school_id: true,
      status: true,
      title: true,
      schedule: true,
      start_date: true,
      end_date: true,
    },
  });
  if (!workshop) return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  if (workshop.school_id !== profile.teacher.school_id) {
    return NextResponse.json({ error: "wrong_school" }, { status: 403 });
  }
  if (workshop.status === "CLOSED") {
    return NextResponse.json({ error: "workshop_closed" }, { status: 410 });
  }

  const dayKey = workshopDateKey(new Date(), process.env.WORKSHOP_TIME_ZONE ?? "Europe/Tirane");
  if (!isWorkshopWorkDay(workshop.schedule, dayKey, workshop.start_date, workshop.end_date)) {
    return NextResponse.json({ error: "not_training_day" }, { status: 409 });
  }
  const today = workshopDayDate(dayKey);

  const key = {
    workshop_id: workshop.id,
    teacher_id: profile.teacher.id,
    day_date: today,
  };
  const existing = await prisma.workshopAttendance.findUnique({
    where: { workshop_id_teacher_id_day_date: key },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.workshopEnrollment.upsert({
      where: { workshop_id_teacher_id: { workshop_id: workshop.id, teacher_id: profile.teacher.id } },
      create: { workshop_id: workshop.id, teacher_id: profile.teacher.id, source: "QR" },
      update: {},
    }),
    prisma.workshopAttendance.upsert({
      where: { workshop_id_teacher_id_day_date: key },
      create: { ...key, source: "QR" },
      update: {},
    }),
  ]);

  return NextResponse.json({
    success: true,
    already_recorded: !!existing,
    attendance_date: dayKey,
    workshop_id: workshop.id,
    workshop_title: workshop.title,
  });
}
