// src/app/api/teacher/trait-assessments/[studentId]/[moduleId]/route.ts
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

// ── Types ────────────────────────────────────────────────────────────────────

interface ScoreInput {
  trait_id: string;
  score: number;
  note?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeWeights(
  traits: { id: string }[],
  mainTraitId: string | null,
) {
  const n = traits.length;
  const otherWeight = n > 1 ? 50 / (n - 1) : 0;
  return traits.map((t) => ({
    traitId: t.id,
    maxScore: t.id === mainTraitId ? 50 : otherWeight,
    isMain: t.id === mainTraitId,
  }));
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  context: { params: Promise<{ studentId: string; moduleId: string }> },
) {
  const [auth, { studentId, moduleId }] = await Promise.all([requireTeacher(), context.params]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All auth + data queries in parallel
  const mod = await prisma.roadmapModule.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        title: true,
        main_trait_id: true,
        stage: {
          select: {
            id: true,
            title: true,
            traits: {
              orderBy: { maqsad: "asc" },
              select: {
                id: true,
                maqsad: true,
                name: true,
                definition: true,
                elements: {
                  orderBy: { order: "asc" },
                  select: { id: true, text: true, order: true },
                },
              },
            },
          },
        },
      },
    });
  if (!mod)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  // Student auth + attempt + existing assessment — all parallel
  const [student, attempt, existing] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, class: { teacher_id: auth.teacher.id } },
      select: { id: true },
    }),
    prisma.moduleAttempt.findUnique({
      where: {
        module_id_student_id: { module_id: moduleId, student_id: studentId },
      },
      select: { score: true, total: true, passed: true },
    }),
    prisma.traitAssessment.findUnique({
      where: {
        module_id_student_id: { module_id: moduleId, student_id: studentId },
      },
      select: {
        id: true,
        general_note: true,
        submitted_at: true,
        updated_at: true,
        trait_scores: {
          select: { trait_id: true, score: true, note: true },
        },
      },
    }),
  ]);

  if (!student)
    return NextResponse.json(
      { error: "Student not found or not in your class" },
      { status: 404 },
    );
  if (!attempt)
    return NextResponse.json(
      { error: "Student has not completed this module" },
      { status: 400 },
    );

  return NextResponse.json({
    module: {
      id: mod.id,
      title: mod.title,
      main_trait_id: mod.main_trait_id,
    },
    stage: { id: mod.stage.id, title: mod.stage.title },
    traits: mod.stage.traits,
    weights: computeWeights(mod.stage.traits, mod.main_trait_id),
    attempt,
    assessment: existing ?? null,
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  context: { params: Promise<{ studentId: string; moduleId: string }> },
) {
  const [auth, { studentId, moduleId }, body] = await Promise.all([
    requireTeacher(),
    context.params,
    req.json().catch(() => ({})),
  ]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scores, general_note } = body as {
    scores: ScoreInput[];
    general_note?: string;
  };

  if (!Array.isArray(scores) || scores.length === 0)
    return NextResponse.json(
      { error: "scores array required" },
      { status: 400 },
    );

  // Auth + module + student — all parallel
  const mod = await prisma.roadmapModule.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        main_trait_id: true,
        stage: {
          select: {
            traits: { select: { id: true } },
          },
        },
      },
    });
  if (!mod)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  // Student + attempt + existing — all parallel
  const [student, attempt, existing] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, class: { teacher_id: auth.teacher.id } },
      select: { id: true },
    }),
    prisma.moduleAttempt.findUnique({
      where: {
        module_id_student_id: { module_id: moduleId, student_id: studentId },
      },
      select: { id: true },
    }),
    prisma.traitAssessment.findUnique({
      where: {
        module_id_student_id: { module_id: moduleId, student_id: studentId },
      },
      select: { id: true },
    }),
  ]);

  if (!student)
    return NextResponse.json(
      { error: "Student not found or not in your class" },
      { status: 404 },
    );
  if (!attempt)
    return NextResponse.json(
      { error: "Student has not completed this module" },
      { status: 400 },
    );

  // Validate scores
  const stageTraitIds = new Set(mod.stage.traits.map((t) => t.id));
  const weights = computeWeights(mod.stage.traits, mod.main_trait_id);
  const weightMap = new Map(weights.map((w) => [w.traitId, w.maxScore]));

  for (const s of scores) {
    if (!stageTraitIds.has(s.trait_id))
      return NextResponse.json(
        { error: `Trait ${s.trait_id} does not belong to this stage` },
        { status: 400 },
      );
    if (typeof s.score !== "number" || s.score < 0)
      return NextResponse.json(
        { error: "score must be a non-negative number" },
        { status: 400 },
      );
    const max = weightMap.get(s.trait_id) ?? 0;
    if (s.score > max + 0.01)
      // small tolerance for float rounding
      return NextResponse.json(
        { error: `Score for trait ${s.trait_id} exceeds max (${max})` },
        { status: 400 },
      );
  }

  const total = scores.reduce((sum, s) => sum + s.score, 0);
  if (total > 100.01)
    return NextResponse.json(
      { error: "Total score cannot exceed 100" },
      { status: 400 },
    );

  const scoreRows = scores.map((s) => ({
    trait_id: s.trait_id,
    score: s.score,
    note: s.note?.trim() || null,
  }));

  const gnote = general_note?.trim() || null;

  // ── Upsert without transaction ──
  // deleteMany + create/update separately is safe because
  // module_id + student_id is unique — no race condition possible.
  let assessment;

  if (existing) {
    // Delete old scores then update parent
    await prisma.traitEvaluation.deleteMany({
      where: { assessment_id: existing.id },
    });
    assessment = await prisma.traitAssessment.update({
      where: { id: existing.id },
      data: {
        teacher_id: auth.teacher.id,
        general_note: gnote,
        trait_scores: { create: scoreRows },
      },
      select: {
        id: true,
        general_note: true,
        submitted_at: true,
        updated_at: true,
        trait_scores: { select: { trait_id: true, score: true, note: true } },
      },
    });
  } else {
    assessment = await prisma.traitAssessment.create({
      data: {
        module_id: moduleId,
        student_id: studentId,
        teacher_id: auth.teacher.id,
        general_note: gnote,
        trait_scores: { create: scoreRows },
      },
      select: {
        id: true,
        general_note: true,
        submitted_at: true,
        updated_at: true,
        trait_scores: { select: { trait_id: true, score: true, note: true } },
      },
    });
  }

  return NextResponse.json(
    { assessment, total },
    { status: existing ? 200 : 201 },
  );
}
