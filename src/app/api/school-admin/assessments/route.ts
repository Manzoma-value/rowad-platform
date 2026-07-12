// /api/school-admin/assessments
//   GET  — every measurement-model assessment across every teacher group in
//          this school, newest first, with the group name attached so the
//          flat "نماذج القياس" hub can list/filter/search without the admin
//          having to drill into a specific group first.
//   POST — create a new OPEN assessment inside a chosen group.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assessments = await prisma.groupAssessment.findMany({
    where: { school_id: auth.school.id },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      closed_at: true,
      group: { select: { id: true, name: true, _count: { select: { members: true } } } },
      _count: { select: { ratings: true } },
    },
  });

  const groups = await prisma.teacherGroup.findMany({
    where: { school_id: auth.school.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { members: true } } },
  });

  return NextResponse.json({ assessments, groups });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; group_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const title = body.title?.trim();
  const groupId = body.group_id?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!groupId) return NextResponse.json({ error: "group_id required" }, { status: 400 });

  const group = await prisma.teacherGroup.findFirst({
    where: { id: groupId, school_id: auth.school.id }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const assessment = await prisma.groupAssessment.create({
    data: {
      group_id: groupId,
      school_id: auth.school.id,
      created_by: auth.profile.id,
      title: title.slice(0, 160),
    },
    select: { id: true, title: true, status: true, group: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ assessment }, { status: 201 });
}
