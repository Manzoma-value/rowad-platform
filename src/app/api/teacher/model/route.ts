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

  // Base payload (used for waiting/active screens too)
  const base = {
    onboarding_status: status,
    stage, // "STAGE1" | "STAGE2" | null
    title_ar: model?.title_ar ?? "النموذج التعليمي للرواد",
    title_sq: model?.title_sq ?? null,
    levels: model?.levels ?? [],
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

  // Resume any in-progress draft for this stage (teacher's own placements only)
  const draft = await prisma.rowadSubmission.findUnique({
    where: { teacher_id_stage: { teacher_id: teacher.id, stage } },
    select: {
      status: true,
      placements: {
        select: {
          concept_id: true,
          placed_maqsad: true,
          placed_level: true,
        },
      },
    },
  });

  const placements =
    draft && draft.status === "IN_PROGRESS"
      ? draft.placements.map((p) => ({
          concept_id: p.concept_id,
          maqsad: p.placed_maqsad,
          level: p.placed_level,
        }))
      : [];

  return NextResponse.json({ ...base, cards, placements });
}
