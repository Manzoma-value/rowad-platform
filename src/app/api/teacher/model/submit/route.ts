// api/teacher/model/submit/route.ts — final submission of a stage.
// Computes is_correct + score SERVER-SIDE. The response carries NO score.
//
// Multi-attempt model:
//   - Reuses the open IN_PROGRESS draft for this (teacher, stage) if it exists.
//   - Otherwise creates a fresh attempt row with attempt_number = max + 1
//     (used after a rejection — previous attempt's row is preserved as history).
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { stageForStatus, TOTAL_CELLS, COLUMN_ORDER } from "@/lib/rowad";
import type { Maqsad, RowadStage } from "@prisma/client";

export const dynamic = "force-dynamic";

type InPlacement = { concept_id: string; maqsad: Maqsad; level: number };

export async function POST(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { teacher } = auth;

  let body: { stage?: RowadStage; placements?: InPlacement[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const stage = body.stage;
  const placements = body.placements ?? [];

  // Stage must match the teacher's current onboarding step
  const allowedStage = stageForStatus(teacher.onboarding_status);
  if (!stage || stage !== allowedStage) {
    return NextResponse.json(
      { error: "هذه المرحلة غير متاحة لك حالياً" },
      { status: 409 },
    );
  }

  // Must place all 25 cards
  if (!Array.isArray(placements) || placements.length !== TOTAL_CELLS) {
    return NextResponse.json(
      { error: "يجب وضع جميع البطاقات الـ25 قبل الإرسال" },
      { status: 400 },
    );
  }

  const model = await prisma.rowadModel.findUnique({
    where: { school_id: teacher.school_id },
    select: { id: true, concepts: { select: { id: true, maqsad: true, level: true } } },
  });
  if (!model) {
    return NextResponse.json({ error: "النموذج غير موجود" }, { status: 404 });
  }

  const answerKey = new Map(model.concepts.map((c) => [c.id, c]));
  const seenConcepts = new Set<string>();
  const seenCells = new Set<string>();

  const rows: {
    concept_id: string;
    placed_maqsad: Maqsad;
    placed_level: number;
    is_correct: boolean;
  }[] = [];

  for (const p of placements) {
    const concept = answerKey.get(p.concept_id);
    if (!concept) {
      return NextResponse.json({ error: "بطاقة غير صالحة" }, { status: 400 });
    }
    if (seenConcepts.has(p.concept_id)) {
      return NextResponse.json({ error: "بطاقة مكررة" }, { status: 400 });
    }
    if (!COLUMN_ORDER.includes(p.maqsad) || p.level < 1 || p.level > 5) {
      return NextResponse.json({ error: "موضع غير صالح" }, { status: 400 });
    }
    const cellKey = `${p.level}:${p.maqsad}`;
    if (seenCells.has(cellKey)) {
      return NextResponse.json(
        { error: "لا يمكن وضع بطاقتين في الخانة نفسها" },
        { status: 400 },
      );
    }
    seenConcepts.add(p.concept_id);
    seenCells.add(cellKey);

    rows.push({
      concept_id: p.concept_id,
      placed_maqsad: p.maqsad,
      placed_level: p.level,
      is_correct: concept.maqsad === p.maqsad && concept.level === p.level,
    });
  }

  const score = rows.filter((r) => r.is_correct).length;
  // Stage 1 → STAGE1_REVIEW. Stage 2 → STAGE2_REVIEW (admin must approve before AWAITING_CLASS).
  const nextStatus = stage === "STAGE1" ? "STAGE1_REVIEW" : "STAGE2_REVIEW";

  await prisma.$transaction(async (tx) => {
    // Find the open draft for this (teacher, stage), if any.
    const draft = await tx.rowadSubmission.findFirst({
      where: { teacher_id: teacher.id, stage, status: "IN_PROGRESS" },
      select: { id: true },
      orderBy: { created_at: "desc" },
    });

    let submissionId: string;
    if (draft) {
      // Reuse the in-progress row — this is still the same attempt.
      const updated = await tx.rowadSubmission.update({
        where: { id: draft.id },
        data: {
          status: "SUBMITTED",
          score,
          total: TOTAL_CELLS,
          submitted_at: new Date(),
          reviewer_id: null,
          reviewer_notes: null,
          reviewed_at: null,
        },
        select: { id: true },
      });
      submissionId = updated.id;
    } else {
      // No draft — direct submit. Pick the next attempt_number.
      const last = await tx.rowadSubmission.findFirst({
        where: { teacher_id: teacher.id, stage },
        orderBy: { attempt_number: "desc" },
        select: { attempt_number: true },
      });
      const created = await tx.rowadSubmission.create({
        data: {
          model_id: model.id,
          teacher_id: teacher.id,
          school_id: teacher.school_id,
          stage,
          attempt_number: (last?.attempt_number ?? 0) + 1,
          status: "SUBMITTED",
          score,
          total: TOTAL_CELLS,
          submitted_at: new Date(),
        },
        select: { id: true },
      });
      submissionId = created.id;
    }

    await tx.rowadPlacement.deleteMany({ where: { submission_id: submissionId } });
    await tx.rowadPlacement.createMany({
      data: rows.map((r) => ({ ...r, submission_id: submissionId })),
    });

    await tx.teacher.update({
      where: { id: teacher.id },
      data: { onboarding_status: nextStatus },
    });
  });

  // Deliberately NO score in the response.
  return NextResponse.json({ success: true, status: nextStatus });
}
