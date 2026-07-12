// GET /api/teacher/groups/[id]/assessments — list assessments visible from
// MY group. A model can target several groups at once, so this matches on
// the join table (target_groups) rather than the legacy single group_id —
// a multi-group model shows up in every one of its groups' lists.
// Hard membership guard: caller must be a member of the group.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const school = await prisma.school.findUnique({
    where: { id: auth.teacher.school_id },
    select: { features: true },
  });
  const openVisibility = !!(
    school?.features &&
    typeof school.features === "object" &&
    !Array.isArray(school.features) &&
    (school.features as Record<string, unknown>).teacher_groups_open_visibility === true
  );

  const membership = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    select: { joined_at: true },
  });
  if (!membership && !openVisibility) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.teacher.school_id },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessments = await prisma.groupAssessment.findMany({
    where: { target_groups: { some: { group_id: id } } },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      closed_at: true,
      _count: { select: { ratings: true, traits: true } },
    },
  });
  return NextResponse.json({ assessments, openVisibility, is_member: !!membership });
}
