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
        { signed_up_teachers: { some: { id: auth.teacher.id } } },
      ],
    },
    orderBy: [{ start_date: "asc" }, { created_at: "asc" }],
    select: {
      id: true, title: true, description: true, audience: true, audience_other: true,
      start_date: true, end_date: true, schedule: true, status: true, is_live: true,
      attendance: { where: { teacher_id: auth.teacher.id }, select: { day_date: true } },
      enrollments: { where: { teacher_id: auth.teacher.id }, select: { id: true }, take: 1 },
      signed_up_teachers: { where: { id: auth.teacher.id }, select: { id: true }, take: 1 },
    },
  });
  return NextResponse.json({
    workshops: workshops.map((workshop) => {
      const { enrollments, signed_up_teachers: signedUpTeachers, ...detail } = workshop;
      return {
        ...detail,
        schedule: effectiveWorkshopSchedule(workshop.schedule, workshop.start_date, workshop.end_date),
        attended: workshop.attendance.length > 0,
        has_access: workshop.attendance.length > 0 || enrollments.length > 0 || signedUpTeachers.length > 0,
        attendance_days: workshop.attendance.map((entry) => entry.day_date),
      };
    }),
  });
}
