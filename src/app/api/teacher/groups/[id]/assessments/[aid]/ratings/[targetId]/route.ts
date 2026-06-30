// PUT /api/teacher/groups/[id]/assessments/[aid]/ratings/[targetId]
//   Body: { s_lineage, s_atonement, s_awareness, s_zeal, s_distinct } — ints,
//   each in [0,100], summing to exactly 100 (Rowad rule of 100).
//   Idempotent upsert: keyed on (assessment, rater, target).
//   Rejected if the assessment is CLOSED.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { isValid100, type ScoresTuple } from "@/lib/rowad-assessment";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string; aid: string; targetId: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, aid, targetId } = await context.params;

  // Caller must be a member of the group, AND so must the target.
  const [iAmMember, targetIsMember] = await Promise.all([
    prisma.teacherGroupMember.findUnique({
      where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
      select: { teacher_id: true },
    }),
    prisma.teacherGroupMember.findUnique({
      where: { group_id_teacher_id: { group_id: id, teacher_id: targetId } },
      select: { teacher_id: true },
    }),
  ]);
  if (!iAmMember || !targetIsMember) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assessment = await prisma.groupAssessment.findFirst({
    where: { id: aid, group_id: id },
    select: { id: true, status: true },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.status === "CLOSED") {
    return NextResponse.json({ error: "Assessment is closed" }, { status: 409 });
  }

  let body: { s_lineage?: number; s_atonement?: number; s_awareness?: number; s_zeal?: number; s_distinct?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const tuple: ScoresTuple = [
    Number(body.s_lineage   ?? -1),
    Number(body.s_atonement ?? -1),
    Number(body.s_awareness ?? -1),
    Number(body.s_zeal      ?? -1),
    Number(body.s_distinct  ?? -1),
  ];
  if (!isValid100(tuple)) {
    return NextResponse.json(
      { error: "Scores must be five non-negative integers summing to 100" },
      { status: 400 },
    );
  }

  const data = {
    s_lineage:   tuple[0],
    s_atonement: tuple[1],
    s_awareness: tuple[2],
    s_zeal:      tuple[3],
    s_distinct:  tuple[4],
  };

  const rating = await prisma.assessmentRating.upsert({
    where: {
      assessment_id_rater_teacher_id_target_teacher_id: {
        assessment_id: aid,
        rater_teacher_id: auth.teacher.id,
        target_teacher_id: targetId,
      },
    },
    create: {
      assessment_id: aid,
      rater_teacher_id: auth.teacher.id,
      target_teacher_id: targetId,
      ...data,
    },
    update: data,
    select: {
      target_teacher_id: true,
      ...Object.fromEntries(Object.keys(data).map((k) => [k, true])) as Record<keyof typeof data, true>,
      updated_at: true,
    },
  });

  // Bump the assessment's updated_at so admin lists reorder when ratings stream in.
  await prisma.groupAssessment.update({
    where: { id: aid }, data: { updated_at: new Date() },
  });

  return NextResponse.json({ rating });
}
