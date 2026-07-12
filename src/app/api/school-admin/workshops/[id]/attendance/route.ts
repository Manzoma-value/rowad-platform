// GET /api/school-admin/workshops/[id]/attendance
// Returns the full attendance matrix: teachers × days with a boolean present
// cell + totals. Rows are teachers who either (a) signed up via this workshop,
// or (b) are otherwise active in the school (so an admin can see all teachers
// who could have attended). The client picks the columns from `days`.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// YYYY-MM-DD helper for stable keys.
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, title: true, start_date: true, end_date: true, schedule: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Teachers considered "in scope" for this workshop: anyone signed up via
  // this workshop, PLUS anyone with an attendance record for it (defensive).
  const rows = await prisma.$queryRaw<Array<{
    teacher_id: string;
    full_name: string;
    email: string | null;
    status: string;
  }>>`
    SELECT DISTINCT t.id AS teacher_id, p.full_name, p.email, t.onboarding_status::text AS status
    FROM teachers t
    JOIN profiles p ON p.id = t.profile_id
    WHERE t.school_id = ${auth.school.id}::uuid
      AND (
        t.workshop_signup_id = ${id}::uuid
        OR EXISTS (
          SELECT 1 FROM workshop_attendance wa
          WHERE wa.workshop_id = ${id}::uuid AND wa.teacher_id = t.id
        )
      )
    ORDER BY p.full_name ASC
  `;

  const attendance = await prisma.workshopAttendance.findMany({
    where: { workshop_id: id },
    select: { teacher_id: true, day_date: true, checked_in_at: true },
  });

  // Scheduled work days are attendance days. Rest/vacation entries never
  // count as absences. Legacy workshops still fall back to their date range.
  const days = new Set<string>();
  for (const a of attendance) days.add(dayKey(a.day_date));
  const schedule = Array.isArray(workshop.schedule) ? workshop.schedule as Array<{ date?: string; type?: string }> : [];
  if (schedule.length) {
    for (const day of schedule) if (day.type === "WORK" && /^\d{4}-\d{2}-\d{2}$/.test(day.date ?? "")) days.add(day.date!);
  } else if (workshop.start_date && workshop.end_date) {
    const cur = new Date(workshop.start_date);
    const end = new Date(workshop.end_date);
    while (cur <= end) {
      days.add(dayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  const dayList = Array.from(days).sort();

  // Presence map: teacher_id -> Set<dayKey>
  const present = new Map<string, Set<string>>();
  for (const a of attendance) {
    const set = present.get(a.teacher_id) ?? new Set<string>();
    set.add(dayKey(a.day_date));
    present.set(a.teacher_id, set);
  }

  const teachers = rows.map((r) => {
    const attendedDays = present.get(r.teacher_id) ?? new Set<string>();
    return {
      teacher_id: r.teacher_id,
      full_name: r.full_name,
      email: r.email,
      status: r.status,
      days_present: dayList.map((k) => attendedDays.has(k)),
      total_present: attendedDays.size,
    };
  });

  return NextResponse.json({
    workshop: { id: workshop.id, title: workshop.title },
    days: dayList,
    teachers,
  });
}
