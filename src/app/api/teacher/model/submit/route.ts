// api/teacher/model/submit/route.ts — game-mode scoring for the card game.
// Returns score/total immediately. No DB writes, no onboarding side-effects,
// no answer-key reveal. The client only learns how many it got right.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TOTAL_CELLS, COLUMN_ORDER, parseStage } from "@/lib/rowad";
import type { Maqsad } from "@prisma/client";

export const dynamic = "force-dynamic";

type InPlacement = { concept_id: string; maqsad: Maqsad; level: number };

async function resolveSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      role: true, is_active: true,
      teacher: { select: { school_id: true } },
      student: { select: { school_id: true } },
    },
  });
  if (!profile || !profile.is_active) return null;
  if (profile.role === "TEACHER") return profile.teacher?.school_id ?? null;
  if (profile.role === "STUDENT") return profile.student?.school_id ?? null;
  return null;
}

export async function POST(req: Request) {
  const schoolId = await resolveSchoolId();
  if (!schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    where: { school_id: schoolId },
    select: {
      concepts: { select: { id: true, maqsad: true, level: true } },
    },
  });
  if (!model) return NextResponse.json({ error: "no_model" }, { status: 404 });

  const answerKey = new Map(model.concepts.map((c) => [c.id, c]));
  const seenConcepts = new Set<string>();
  const seenCells = new Set<string>();

  let score = 0;
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
    if (concept.maqsad === p.maqsad && concept.level === p.level) score++;
  }

  // No persistence — game mode is stateless on the server.
  // The client tracks "best score" in localStorage if it wants.
  return NextResponse.json({ score, total: TOTAL_CELLS });
}
