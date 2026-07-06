// POST /api/workshop-attend/[code]
// The teacher scans the daily QR (which resolves to /workshop/attend/[code]).
// That page issues this POST once the user is authenticated. We then verify:
//   - Code exists AND its day_date == today
//   - The workshop still OPEN
//   - The caller is a teacher of the same school
// and upsert a WorkshopAttendance row (unique on workshop×teacher×day).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function todayDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  if (!code) return NextResponse.json({ error: "no_code" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true, role: true, is_active: true,
      teacher: { select: { id: true, school_id: true, onboarding_status: true } },
    },
  });
  if (!profile?.is_active || profile.role !== "TEACHER" || !profile.teacher) {
    return NextResponse.json({ error: "not_a_teacher" }, { status: 403 });
  }

  const entry = await prisma.workshopAttendanceCode.findUnique({
    where: { code },
    select: {
      code: true,
      day_date: true,
      workshop: {
        select: { id: true, school_id: true, status: true, title: true },
      },
    },
  });
  if (!entry) return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  if (entry.workshop.school_id !== profile.teacher.school_id) {
    return NextResponse.json({ error: "wrong_school" }, { status: 403 });
  }
  if (entry.workshop.status === "CLOSED") {
    return NextResponse.json({ error: "workshop_closed" }, { status: 410 });
  }

  const today = todayDate();
  if (
    entry.day_date.getFullYear() !== today.getFullYear() ||
    entry.day_date.getMonth() !== today.getMonth() ||
    entry.day_date.getDate() !== today.getDate()
  ) {
    return NextResponse.json({ error: "expired_code" }, { status: 410 });
  }

  // Upsert on (workshop, teacher, day) — first scan of the day wins,
  // repeated scans are no-ops.
  await prisma.workshopAttendance.upsert({
    where: {
      workshop_id_teacher_id_day_date: {
        workshop_id: entry.workshop.id,
        teacher_id: profile.teacher.id,
        day_date: today,
      },
    },
    create: {
      workshop_id: entry.workshop.id,
      teacher_id: profile.teacher.id,
      day_date: today,
    },
    update: {}, // no-op — keep original checked_in_at
  });

  return NextResponse.json({
    success: true,
    workshop_title: entry.workshop.title,
  });
}
