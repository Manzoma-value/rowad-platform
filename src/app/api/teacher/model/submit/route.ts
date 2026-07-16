// api/teacher/model/submit/route.ts — game-mode scoring for the card game.
// Returns score/total immediately. No answer-key reveal, no onboarding
// side-effects. Each play is persisted as a RowadGameSubmission so the
// admin can browse per-user score history (see /school-admin/game-scores).
import { NextResponse } from "next/server";
import { requireActivePlayer } from "@/lib/player-auth";
import { prisma } from "@/lib/prisma";
import { TOTAL_CELLS, COLUMN_ORDER, parseStage } from "@/lib/rowad";
import type { Maqsad, RowadStage } from "@prisma/client";

export const dynamic = "force-dynamic";

type InPlacement = { concept_id: string; maqsad: Maqsad; level: number };

export async function POST(req: Request) {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { stage?: string; placements?: InPlacement[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const stage = parseStage(body.stage);
  const placements = body.placements ?? [];
  if (!stage) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  if (!Array.isArray(placements) || placements.length !== TOTAL_CELLS) {
    return NextResponse.json(
      { error: "must_place_all", expected: TOTAL_CELLS },
      { status: 400 },
    );
  }

  const model = await prisma.rowadModel.findUnique({
    where: { school_id: player.school_id },
    select: {
      concepts: {
        select: {
          id: true,
          maqsad: true,
          level: true,
          name_ar: true,
          name_sq: true,
        },
      },
    },
  });
  if (!model) return NextResponse.json({ error: "no_model" }, { status: 404 });

  const answerKey = new Map(model.concepts.map((c) => [c.id, c]));
  const seenConcepts = new Set<string>();
  const seenCells = new Set<string>();

  let score = 0;
  const answers: Array<{
    concept_id: string;
    name_ar: string;
    name_sq: string | null;
    selected_maqsad: Maqsad;
    selected_level: number;
    correct_maqsad: Maqsad;
    correct_level: number;
    is_correct: boolean;
  }> = [];
  for (const p of placements) {
    const concept = answerKey.get(p.concept_id);
    if (!concept) return NextResponse.json({ error: "invalid_card" }, { status: 400 });
    if (seenConcepts.has(p.concept_id))
      return NextResponse.json({ error: "duplicate_card" }, { status: 400 });
    if (!COLUMN_ORDER.includes(p.maqsad) || p.level < 1 || p.level > 5)
      return NextResponse.json({ error: "invalid_position" }, { status: 400 });
    const cellKey = `${p.level}:${p.maqsad}`;
    if (seenCells.has(cellKey))
      return NextResponse.json({ error: "duplicate_cell" }, { status: 400 });
    seenConcepts.add(p.concept_id);
    seenCells.add(cellKey);
    const isCorrect = concept.maqsad === p.maqsad && concept.level === p.level;
    if (isCorrect) score++;
    answers.push({
      concept_id: concept.id,
      name_ar: concept.name_ar,
      name_sq: concept.name_sq,
      selected_maqsad: p.maqsad,
      selected_level: p.level,
      correct_maqsad: concept.maqsad,
      correct_level: concept.level,
      is_correct: isCorrect,
    });
  }

  // Persist this session so admins can review per-user scores. Errors here
  // don't block returning the score to the player.
  try {
    await prisma.rowadGameSubmission.create({
      data: {
        school_id: player.school_id,
        profile_id: player.profile_id,
        stage: stage as RowadStage,
        score,
        total: TOTAL_CELLS,
        answers,
      },
    });
  } catch (err) {
    console.error("[game submit] persist failed", err);
  }

  return NextResponse.json({ score, total: TOTAL_CELLS });
}
