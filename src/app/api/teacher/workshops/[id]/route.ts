import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { effectiveWorkshopSchedule } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.teacher.school_id },
    select: {
      id: true,
      title: true,
      description: true,
      audience: true,
      audience_other: true,
      start_date: true,
      end_date: true,
      schedule: true,
      notes: true,
      materials: true,
      status: true,
      is_live: true,
      live_started_at: true,
      attendance: {
        where: { teacher_id: auth.teacher.id },
        select: { id: true, day_date: true },
        orderBy: { day_date: "asc" },
      },
      enrollments: {
        where: { teacher_id: auth.teacher.id },
        select: { id: true },
        take: 1,
      },
      signed_up_teachers: {
        where: { id: auth.teacher.id },
        select: { id: true },
        take: 1,
      },
      messages: {
        orderBy: { created_at: "asc" },
        take: 200,
        select: {
          id: true,
          body: true,
          created_at: true,
          author: { select: { id: true, full_name: true, role: true, avatar_url: true } },
        },
      },
    },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { attendance, enrollments, signed_up_teachers: signedUpTeachers, ...detail } = workshop;
  const attended = attendance.length > 0;
  const hasAccess = attended || enrollments.length > 0 || signedUpTeachers.length > 0;
  const schedule = effectiveWorkshopSchedule(detail.schedule, detail.start_date, detail.end_date);
  return NextResponse.json({
    workshop: {
      ...detail,
      schedule,
      notes: hasAccess ? detail.notes : null,
      materials: hasAccess ? detail.materials : [],
      messages: hasAccess ? detail.messages : [],
    },
    attended,
    has_access: hasAccess,
    attendance_days: attendance.map((entry) => entry.day_date),
  });
}
