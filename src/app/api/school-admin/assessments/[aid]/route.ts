// /api/school-admin/assessments/[aid]
//   GET    — full payload: members snapshot + every rating row. Same shape
//            as the group-scoped route, just addressed by assessment id
//            alone (the group is resolved server-side + tenant-checked).
//   PATCH  — rename or change status (OPEN ↔ CLOSED).
//   DELETE — hard delete (cascades to ratings).
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  const assessment = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      closed_at: true,
      group: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              teacher: {
                select: {
                  id: true,
                  profile: { select: { id: true, full_name: true, email: true } },
                },
              },
            },
          },
        },
      },
      ratings: {
        select: {
          rater_teacher_id: true,
          target_teacher_id: true,
          s_lineage: true,
          s_atonement: true,
          s_awareness: true,
          s_zeal: true,
          s_distinct: true,
          updated_at: true,
        },
      },
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = assessment.group.members.map((m) => ({
    teacher_id: m.teacher.id,
    profile: m.teacher.profile,
  }));

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at,
      closed_at: assessment.closed_at,
      group: { id: assessment.group.id, name: assessment.group.name },
      members,
      ratings: assessment.ratings,
    },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  let body: { title?: string; status?: "OPEN" | "CLOSED" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const existing = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const trimmed = body.title.trim();
    if (!trimmed) return NextResponse.json({ error: "title required" }, { status: 400 });
    data.title = trimmed.slice(0, 160);
  }
  if (body.status === "OPEN" || body.status === "CLOSED") {
    data.status = body.status;
    data.closed_at = body.status === "CLOSED" ? new Date() : null;
  }

  const assessment = await prisma.groupAssessment.update({
    where: { id: aid },
    data,
    select: { id: true, title: true, status: true, closed_at: true },
  });
  return NextResponse.json({ assessment });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  const existing = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.groupAssessment.delete({ where: { id: aid } }).catch(() => null);
  return NextResponse.json({ success: true });
}
