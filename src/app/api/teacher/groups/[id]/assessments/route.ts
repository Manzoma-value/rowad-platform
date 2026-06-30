// GET /api/teacher/groups/[id]/assessments — list assessments in MY group.
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

  const membership = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    select: { joined_at: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessments = await prisma.groupAssessment.findMany({
    where: { group_id: id },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      closed_at: true,
      _count: { select: { ratings: true } },
    },
  });
  return NextResponse.json({ assessments });
}
