// GET /api/school-admin/workshops/[id]/requests
//   Lists every teacher-initiated request for this workshop (all statuses),
//   PENDING/WAITLISTED first, so the admin can review pending requests
//   alongside decision history.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  WAITLISTED: 1,
  APPROVED: 2,
  REJECTED: 3,
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await prisma.workshopEnrollment.findMany({
    where: { workshop_id: id, source: "REQUEST" },
    select: {
      teacher_id: true,
      status: true,
      source: true,
      enrolled_at: true,
      decided_at: true,
      teacher: {
        select: {
          profile: { select: { full_name: true, email: true, avatar_url: true } },
        },
      },
    },
    orderBy: { enrolled_at: "desc" },
  });

  const requests = rows
    .map((row) => ({
      teacher_id: row.teacher_id,
      full_name: row.teacher.profile.full_name,
      email: row.teacher.profile.email,
      avatar_url: row.teacher.profile.avatar_url,
      status: row.status,
      source: row.source,
      requested_at: row.enrolled_at,
      decided_at: row.decided_at,
    }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return NextResponse.json({ requests });
}
