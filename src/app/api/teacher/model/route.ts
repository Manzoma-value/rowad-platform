// api/teacher/model/route.ts — teacher's view of النموذج التعليمي للرواد.
// CRITICAL: never leaks the answer key (correct row/column) or the score.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { shuffle, stageForStatus } from "@/lib/rowad";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { teacher } = auth;
  const status = teacher.onboarding_status;
  const stage = stageForStatus(status);

  // School's model + levels (row labels are safe to send)
  const model = await prisma.rowadModel.findUnique({
    where: { school_id: teacher.school_id },
    select: {
      id: true,
      title_ar: true,
      title_sq: true,
      levels: {
        orderBy: { order: "asc" },
        select: { order: true, name_ar: true, name_sq: true },
      },
    },
  });

  // ── Surface the most recent rejection notes for the stage the teacher
  // is currently working on (after a REJECTED attempt) — so they can see
  // why and what to fix. Never includes the score.
  const lastRejection = stage
    ? await prisma.rowadSubmission.findFirst({
        where: {
          teacher_id: teacher.id,
          stage,
          status: "REJECTED",
        },
        orderBy: { reviewed_at: "desc" },
        select: {
          attempt_number: true,
          reviewed_at: true,
          reviewer_notes: true,
        },
      })
    : null;

  // How many attempts has this teacher used at this stage so far?
  const previousAttempts = stage
    ? await prisma.rowadSubmission.count({
        where: { teacher_id: teacher.id, stage },
      })
    : 0;

  // Base payload (used for waiting/active screens too)
  const base = {
    onboarding_status: status,
    stage, // "STAGE1" | "STAGE2" | null
    title_ar: model?.title_ar ?? "النموذج التعليمي للرواد",
    title_sq: model?.title_sq ?? null,
    levels: model?.levels ?? [],
    last_rejection: lastRejection,
    previous_attempts: previousAttempts,
  };

  // Only hand out cards when a board is actually fillable
  if (!model || !stage) {
    return NextResponse.json({ ...base, cards: [], placements: [] });
  }

  const detailed = stage === "STAGE2";

  // Concepts — strip the answer key (maqsad/level/order) entirely, then shuffle.
  const concepts = await prisma.rowadConcept.findMany({
    where: { model_id: model.id },
    select: {
      id: true,
      name_ar: true,
      name_sq: true,
      ...(detailed
        ? {
            strategic_ar: true,
            strategic_sq: true,
            description_ar: true,
            description_sq: true,
            duty_ar: true,
            duty_sq: true,
            reward_ar: true,
            reward_sq: true,
            fruit_ar: true,
            fruit_sq: true,
            verification_ar: true,
            verification_sq: true,
          }
        : {}),
    },
  });

  const cards = shuffle(concepts);

  // Resume the in-progress draft for the current (teacher, stage) — the
  // most recent IN_PROGRESS row. After a rejection the previous attempt
  // is REJECTED, so this finds nothing and the teacher starts blank.
  const draft = await prisma.rowadSubmission.findFirst({
    where: {
      teacher_id: teacher.id,
      stage,
      status: "IN_PROGRESS",
    },
    orderBy: { created_at: "desc" },
    select: {
      placements: {
        select: {
          concept_id: true,
          placed_maqsad: true,
          placed_level: true,
        },
      },
    },
  });

  const placements = draft
    ? draft.placements.map((p) => ({
        concept_id: p.concept_id,
        maqsad: p.placed_maqsad,
        level: p.placed_level,
      }))
    : [];

  return NextResponse.json({ ...base, cards, placements });
}
