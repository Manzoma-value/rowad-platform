// /api/school-admin/teacher-groups/[id]/assessments
//   GET  — list every assessment in this group (most recent first).
//   POST — create a new OPEN assessment.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  // Tenant guard via the group
  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessments = await prisma.groupAssessment.findMany({
    where: { group_id: id },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      closed_at: true,
      _count: { select: { ratings: true } },
    },
  });
  return NextResponse.json({ assessments });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessment = await prisma.groupAssessment.create({
    data: {
      group_id: id,
      school_id: auth.school.id,
      created_by: auth.profile.id,
      title: title.slice(0, 160),
    },
    select: { id: true, title: true, status: true },
  });
  return NextResponse.json({ assessment }, { status: 201 });
}
