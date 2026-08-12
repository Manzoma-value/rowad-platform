// PUT /api/teacher/groups/[id]/assessments/[aid]/ratings/[targetId]
//   Body: { scores: number[] } — one int per this model's trait, each in
//   [0,100], summing to exactly 100 (Rowad rule of 100). Array length must
//   match the assessment's trait count.
//   First submission creates the current reading. A replacement is accepted
//   only after the current reading has been locked for a full 24 hours, and
//   archives the prior reading for the timeline. Rejected when CLOSED.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import {
  canReplaceRating,
  isValid100,
  nextRatingAllowedAt,
  type ScoresTuple,
} from "@/lib/rowad-assessment";
import { Prisma } from "@prisma/client";

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
      target_groups: { select: { group: { select: { id: true, members: { select: { teacher_id: true } } } } } },
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.status === "CLOSED") {
    return NextResponse.json({ error: "Assessment is closed" }, { status: 409 });
  }

  // Teachers rate only colleagues in the group they entered through. The
  // same model may cover another cohort for shared spectra, but it never
  // turns the two cohorts into one cross-rating pool.
  const entryGroup = assessment.target_groups.find((link) => link.group.id === id);
  const targetIsInMyGroup = entryGroup?.group.members.some((member) => member.teacher_id === targetId) ?? false;
  if (!targetIsInMyGroup) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const key = {
    assessment_id: aid,
    rater_teacher_id: auth.teacher.id,
    target_teacher_id: targetId,
  };
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.assessmentRating.findUnique({
      where: { assessment_id_rater_teacher_id_target_teacher_id: key },
      select: { scores: true, updated_at: true },
    });
    const now = new Date();

    if (existing && !canReplaceRating(existing.updated_at, now)) {
      return {
        blocked: true as const,
        nextAllowedAt: nextRatingAllowedAt(existing.updated_at),
      };
    }

    let historyArchived = false;
    if (existing) {
      const archived = await tx.assessmentRatingRevision.createMany({
        data: [{
          ...key,
          scores: existing.scores as Prisma.InputJsonValue,
          replacement_scores: scores,
          original_updated_at: existing.updated_at,
          archived_at: now,
        }],
        skipDuplicates: true,
      });
      historyArchived = archived.count > 0;
    }

    if (existing) {
      const rating = await tx.assessmentRating.update({
        where: { assessment_id_rater_teacher_id_target_teacher_id: key },
        data: { scores, updated_at: now },
        select: { target_teacher_id: true, scores: true, updated_at: true },
      });
      return { blocked: false as const, rating, historyArchived };
    }

    const rating = await tx.assessmentRating.create({
      data: {
        ...key,
        scores,
        // Legacy columns remain NOT NULL. Mirror the first five values only
        // for schema compatibility; all application reads use `scores`.
        s_lineage: scores[0] ?? 0,
        s_atonement: scores[1] ?? 0,
        s_awareness: scores[2] ?? 0,
        s_zeal: scores[3] ?? 0,
        s_distinct: scores[4] ?? 0,
      },
      select: { target_teacher_id: true, scores: true, updated_at: true },
    });
    return { blocked: false as const, rating, historyArchived };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result.blocked) {
    const remainingMs = Math.max(0, result.nextAllowedAt.getTime() - Date.now());
    return NextResponse.json({
      error: "rating_cooldown",
      next_allowed_at: result.nextAllowedAt,
      remaining_ms: remainingMs,
    }, { status: 429 });
  }

  // Bump the assessment's updated_at so admin lists reorder when ratings stream in.
  await prisma.groupAssessment.update({
    where: { id: aid }, data: { updated_at: new Date() },
  });

  return NextResponse.json({
    rating: {
      ...result.rating,
      next_allowed_at: nextRatingAllowedAt(result.rating.updated_at),
    },
    history_archived: result.historyArchived,
  });
}
