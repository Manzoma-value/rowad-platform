import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isWorkshopWorkDay, workshopDateKey, workshopDayDate } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: "invalid_token" }, { status: 400 });

  const [workshop, profile] = await Promise.all([
    prisma.workshop.findUnique({
      where: { signup_token: token },
      select: {
        id: true,
        school_id: true,
        status: true,
        schedule: true,
        start_date: true,
        end_date: true,
      },
    }),
    prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        is_active: true,
        teacher: { select: { id: true, school_id: true, onboarding_status: true, workshop_signup_id: true } },
      },
    }),
  ]);

  if (!workshop) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (workshop.status === "CLOSED") {
    return NextResponse.json({ error: "workshop_closed" }, { status: 410 });
  }
  if (!profile?.is_active) {
    return NextResponse.json({ error: "account_inactive" }, { status: 403 });
  }
  if (profile.role !== "TEACHER" || !profile.teacher) {
    return NextResponse.json({ error: "not_teacher" }, { status: 403 });
  }
  if (profile.teacher.school_id !== workshop.school_id) {
    return NextResponse.json({ error: "school_mismatch" }, { status: 409 });
  }
  const teacher = profile.teacher;

  const dayKey = workshopDateKey(new Date(), process.env.WORKSHOP_TIME_ZONE ?? "Europe/Tirane");
  const countsAsAttendance = isWorkshopWorkDay(
    workshop.schedule,
    dayKey,
    workshop.start_date,
    workshop.end_date,
  );

  await prisma.$transaction(async (tx) => {
    await tx.teacher.update({
      where: { id: teacher.id },
      data: { workshop_signup_id: teacher.workshop_signup_id ?? workshop.id },
    });
    await tx.workshopEnrollment.upsert({
      where: { workshop_id_teacher_id: { workshop_id: workshop.id, teacher_id: teacher.id } },
      create: { workshop_id: workshop.id, teacher_id: teacher.id, source: "QR" },
      update: {},
    });
    if (countsAsAttendance) {
      const dayDate = workshopDayDate(dayKey);
      await tx.workshopAttendance.upsert({
        where: {
          workshop_id_teacher_id_day_date: {
            workshop_id: workshop.id,
            teacher_id: teacher.id,
            day_date: dayDate,
          },
        },
        create: {
          workshop_id: workshop.id,
          teacher_id: teacher.id,
          day_date: dayDate,
          source: "QR",
        },
        update: {},
      });
    }
  });

  return NextResponse.json({
    success: true,
    workshop_id: workshop.id,
    onboarding_status: teacher.onboarding_status,
    attendance_recorded: countsAsAttendance,
  });
}
