// api/teacher/model/draft/route.ts — autosave partial progress (status IN_PROGRESS)
// so a teacher can leave and resume before final submission. No score is returned.
//
// Multi-attempt model: the draft belongs to the *current* attempt for this stage.
// After a rejection a new attempt row is created on the first save.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { stageForStatus, COLUMN_ORDER } from "@/lib/rowad";
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
  const allowedStage = stageForStatus(teacher.onboarding_status);
  if (!stage || stage !== allowedStage) {
    return NextResponse.json({ error: "Stage not available" }, { status: 409 });
  }

  const model = await prisma.rowadModel.findUnique({
    where: { school_id: teacher.school_id },
    select: { id: true, concepts: { select: { id: true, maqsad: true, level: true } } },
  });
  if (!model) return NextResponse.json({ error: "No model" }, { status: 404 });

  const answerKey = new Map(model.concepts.map((c) => [c.id, c]));
  const seenConcepts = new Set<string>();
  const seenCells = new Set<string>();

  const rows: {
    concept_id: string;
    placed_maqsad: Maqsad;
    placed_level: number;
    is_correct: boolean;
  }[] = [];

  // Drafts may be partial (< 25); still validate each entry + dedupe.
  for (const p of placements) {
    const concept = answerKey.get(p.concept_id);
    if (!concept) continue;
    if (seenConcepts.has(p.concept_id)) continue;
    if (!COLUMN_ORDER.includes(p.maqsad) || p.level < 1 || p.level > 5) continue;
    const cellKey = `${p.level}:${p.maqsad}`;
    if (seenCells.has(cellKey)) continue;
    seenConcepts.add(p.concept_id);
    seenCells.add(cellKey);
    rows.push({
      concept_id: p.concept_id,
      placed_maqsad: p.maqsad,
      placed_level: p.level,
      is_correct: concept.maqsad === p.maqsad && concept.level === p.level,
    });
  }

  await prisma.$transaction(async (tx) => {
    // Find the open draft (IN_PROGRESS) for this (teacher, stage).
    const draft = await tx.rowadSubmission.findFirst({
      where: { teacher_id: teacher.id, stage, status: "IN_PROGRESS" },
      select: { id: true },
      orderBy: { created_at: "desc" },
    });

    let submissionId: string;
    if (draft) {
      submissionId = draft.id;
    } else {
      // No open draft → this is the first save of a new attempt
      // (either the very first, or a retry after rejection).
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
          status: "IN_PROGRESS",
        },
        select: { id: true },
      });
      submissionId = created.id;
    }

    await tx.rowadPlacement.deleteMany({ where: { submission_id: submissionId } });
    if (rows.length > 0) {
      await tx.rowadPlacement.createMany({
        data: rows.map((r) => ({ ...r, submission_id: submissionId })),
      });
    }
  });

  return NextResponse.json({ success: true });
}
