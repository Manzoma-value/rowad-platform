import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { effectiveWorkshopSchedule } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workshops = await prisma.workshop.findMany({
    where: {
      school_id: auth.teacher.school_id,
      OR: [
        { audience: { has: "TEACHERS" } },
        { enrollments: { some: { teacher_id: auth.teacher.id } } },
        { attendance: { some: { teacher_id: auth.teacher.id } } },
      ],
    },
    orderBy: [{ start_date: "asc" }, { created_at: "asc" }],
    select: {
      id: true, title: true, description: true, audience: true, audience_other: true,
      start_date: true, end_date: true, schedule: true, status: true, is_live: true,
      attendance: { where: { teacher_id: auth.teacher.id }, select: { day_date: true } },
    },
  });
  return NextResponse.json({
    workshops: workshops.map((workshop) => ({
      ...workshop,
      schedule: effectiveWorkshopSchedule(workshop.schedule, workshop.start_date, workshop.end_date),
      attended: workshop.attendance.length > 0,
      attendance_days: workshop.attendance.map((entry) => entry.day_date),
    })),
  });
}
