// The permanent QR identifies the workshop. The server resolves the current
// calendar day on every scan and records at most one check-in per teacher/day.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function todayDate(): Date {
  const timeZone = process.env.WORKSHOP_TIME_ZONE ?? "Europe/Tirane";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00.000Z`);
}

function isScheduledWorkDay(
  scheduleValue: unknown,
  today: Date,
  startDate: Date | null,
  endDate: Date | null,
) {
  const key = today.toISOString().slice(0, 10);
  if (Array.isArray(scheduleValue) && scheduleValue.length > 0) {
    return scheduleValue.some((raw) => {
      if (!raw || typeof raw !== "object") return false;
      const day = raw as { date?: unknown; type?: unknown };
      return day.date === key && day.type === "WORK";
    });
  }
  if (startDate && key < startDate.toISOString().slice(0, 10)) return false;
  if (endDate && key > endDate.toISOString().slice(0, 10)) return false;
  return !!(startDate || endDate);
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

  const today = todayDate();
  if (!isScheduledWorkDay(workshop.schedule, today, workshop.start_date, workshop.end_date)) {
    return NextResponse.json({ error: "not_training_day" }, { status: 409 });
  }

  const key = {
    workshop_id: workshop.id,
    teacher_id: profile.teacher.id,
    day_date: today,
  };
  const existing = await prisma.workshopAttendance.findUnique({
    where: { workshop_id_teacher_id_day_date: key },
    select: { id: true },
  });
  if (!existing) {
    await prisma.workshopAttendance.create({ data: key });
  }

  return NextResponse.json({
    success: true,
    already_recorded: !!existing,
    attendance_date: today.toISOString().slice(0, 10),
    workshop_title: workshop.title,
  });
}
