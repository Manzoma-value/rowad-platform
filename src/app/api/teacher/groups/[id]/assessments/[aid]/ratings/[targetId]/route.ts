// PUT /api/teacher/groups/[id]/assessments/[aid]/ratings/[targetId]
//   Body: { scores: number[] } — one int per this model's trait, each in
//   [0,100], summing to exactly 100 (Rowad rule of 100). Array length must
//   match the assessment's trait count.
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

  // Caller must be a member of the group they entered through.
  const iAmMember = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    select: { teacher_id: true },
  });
  if (!iAmMember) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessment = await prisma.groupAssessment.findFirst({
    where: { id: aid, target_groups: { some: { group_id: id } } },
    select: {
      id: true,
      status: true,
      traits: { select: { position: true } },
      target_groups: { select: { group: { select: { members: { select: { teacher_id: true } } } } } },
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.status === "CLOSED") {
    return NextResponse.json({ error: "Assessment is closed" }, { status: 409 });
  }

  // Target must belong to one of this model's linked groups (not
  // necessarily the URL group — a multi-group model pools everyone).
  const targetIsInPool = assessment.target_groups.some((link) =>
    link.group.members.some((m) => m.teacher_id === targetId),
  );
  if (!targetIsInPool) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { scores?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const raw = Array.isArray(body.scores) ? body.scores.map((n) => Number(n)) : [];
  const scores: ScoresTuple = raw;
  if (!isValid100(scores, assessment.traits.length)) {
    return NextResponse.json(
      { error: `Scores must be ${assessment.traits.length} non-negative integers summing to 100` },
      { status: 400 },
    );
  }

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
      scores,
      // Legacy columns are NOT NULL — mirror the first five entries (or 0)
      // purely to satisfy the historical schema; the app never reads them.
      s_lineage: scores[0] ?? 0,
      s_atonement: scores[1] ?? 0,
      s_awareness: scores[2] ?? 0,
      s_zeal: scores[3] ?? 0,
      s_distinct: scores[4] ?? 0,
    },
    update: { scores },
    select: { target_teacher_id: true, scores: true, updated_at: true },
  });

  // Bump the assessment's updated_at so admin lists reorder when ratings stream in.
  await prisma.groupAssessment.update({
    where: { id: aid }, data: { updated_at: new Date() },
  });

  return NextResponse.json({ rating });
}
