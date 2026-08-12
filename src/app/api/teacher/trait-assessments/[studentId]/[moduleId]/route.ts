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

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  context: { params: Promise<{ studentId: string; moduleId: string }> },
) {
  const [auth, { studentId, moduleId }] = await Promise.all([requireTeacher(), context.params]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All auth + data queries in parallel
  const mod = await prisma.roadmapModule.findFirst({
      where: { id: moduleId, stage: { roadmap: { school_id: auth.teacher.school_id } } },
      select: {
        id: true,
        title: true,
        trait_links: {
          orderBy: { position: "asc" },
          select: { trait_id: true, guidance_ar: true, guidance_sq: true },
        },
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
                name_sq: true,
                definition: true,
                definition_sq: true,
                elements: {
                  orderBy: { order: "asc" },
                  select: { id: true, text: true, text_sq: true, order: true },
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
  const [student, attempt, existing, educatorReadings] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, class: { teacher_id: auth.teacher.id } },
      select: {
        id: true,
        profile: { select: { full_name: true, avatar_url: true } },
        class: { select: { id: true, name: true } },
      },
    }),
    prisma.moduleAttempt.findUnique({
      where: {
        module_id_student_id: { module_id: moduleId, student_id: studentId },
      },
      select: { score: true, total: true, passed: true },
    }),
    prisma.traitAssessment.findUnique({
      where: {
        module_id_student_id_teacher_id: {
          module_id: moduleId,
          student_id: studentId,
          teacher_id: auth.teacher.id,
        },
      },
      select: {
        id: true,
        general_note: true,
        submitted_at: true,
        updated_at: true,
        observed_at: true,
        snapshots: {
          orderBy: { created_at: "desc" },
          take: 6,
          select: { id: true, scores: true, general_note: true, observed_at: true, created_at: true },
        },
        trait_scores: {
          select: { trait_id: true, score: true, note: true },
        },
      },
    }),
    prisma.traitAssessment.findMany({
      where: { module_id: moduleId, student_id: studentId },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        teacher_id: true,
        observed_at: true,
        updated_at: true,
        teacher: { select: { profile: { select: { full_name: true } } } },
        trait_scores: { select: { trait_id: true, score: true } },
      },
    }),
  ]);

  if (!student)
    return NextResponse.json(
      { error: "Beneficiary not found or not in your group" },
      { status: 404 },
    );
  if (!attempt)
    return NextResponse.json(
      { error: "Beneficiary has not completed this module" },
      { status: 400 },
    );

  return NextResponse.json({
    student: {
      id: student.id,
      full_name: student.profile.full_name,
      avatar_url: student.profile.avatar_url,
      class_name: student.class?.name ?? null,
    },
    module: {
      id: mod.id,
      title: mod.title,
      trait_links: mod.trait_links,
    },
    stage: { id: mod.stage.id, title: mod.stage.title },
    traits: mod.stage.traits,
    attempt,
    assessment: existing ?? null,
    educator_readings: educatorReadings.map((reading) => ({
      id: reading.id,
      educator_name: reading.teacher.profile.full_name,
      is_mine: reading.teacher_id === auth.teacher.id,
      observed_at: reading.observed_at,
      updated_at: reading.updated_at,
      scores: reading.trait_scores,
    })),
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

  const { scores, general_note, observed_at } = body as {
    scores: ScoreInput[];
    general_note?: string;
    observed_at?: string;
  };

  if (!Array.isArray(scores) || scores.length === 0)
    return NextResponse.json(
      { error: "scores array required" },
      { status: 400 },
    );

  // Auth + module + student — all parallel
  const mod = await prisma.roadmapModule.findFirst({
      where: { id: moduleId, stage: { roadmap: { school_id: auth.teacher.school_id } } },
      select: {
        id: true,
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
        module_id_student_id_teacher_id: {
          module_id: moduleId,
          student_id: studentId,
          teacher_id: auth.teacher.id,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!student)
    return NextResponse.json(
      { error: "Beneficiary not found or not in your group" },
      { status: 404 },
    );
  if (!attempt)
    return NextResponse.json(
      { error: "Beneficiary has not completed this module" },
      { status: 400 },
    );

  // Validate scores
  const stageTraitIds = new Set(mod.stage.traits.map((t) => t.id));
  const submittedTraitIds = new Set(scores.map((score) => score.trait_id));
  if (scores.length !== stageTraitIds.size)
    return NextResponse.json(
      { error: "A score is required for every trait" },
      { status: 400 },
    );
  if (submittedTraitIds.size !== scores.length)
    return NextResponse.json({ error: "Each trait may appear only once" }, { status: 400 });
  for (const s of scores) {
    if (!stageTraitIds.has(s.trait_id))
      return NextResponse.json(
        { error: `Trait ${s.trait_id} does not belong to this stage` },
        { status: 400 },
      );
    if (typeof s.score !== "number" || !Number.isInteger(s.score) || s.score < 0 || s.score > 100)
      return NextResponse.json(
        { error: "score must be a non-negative number" },
        { status: 400 },
      );
  }

  const total = scores.reduce((sum, s) => sum + s.score, 0);
  if (total !== 100)
    return NextResponse.json(
      { error: "Trait points must total exactly 100" },
      { status: 400 },
    );

  const scoreRows = scores.map((s) => ({
    trait_id: s.trait_id,
    score: s.score,
    note: s.note?.trim() || null,
  }));

  const gnote = general_note?.trim() || null;
  const observedAt = observed_at ? new Date(observed_at) : new Date();
  if (Number.isNaN(observedAt.getTime()))
    return NextResponse.json({ error: "Invalid observation date" }, { status: 400 });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (observedAt > tomorrow)
    return NextResponse.json({ error: "Observation date cannot be in the future" }, { status: 400 });
  const snapshotScores = scoreRows.map((score) => ({
    trait_id: score.trait_id,
    score: score.score,
    note: score.note,
  }));

  let assessment;

  if (existing) {
    assessment = await prisma.$transaction(async (tx) => {
      await tx.traitEvaluation.deleteMany({ where: { assessment_id: existing.id } });
      const updated = await tx.traitAssessment.update({
        where: { id: existing.id },
        data: {
          general_note: gnote,
          observed_at: observedAt,
          trait_scores: { create: scoreRows },
        },
        select: {
          id: true, general_note: true, observed_at: true, submitted_at: true, updated_at: true,
          trait_scores: { select: { trait_id: true, score: true, note: true } },
        },
      });
      await tx.traitAssessmentSnapshot.create({
        data: { assessment_id: existing.id, scores: snapshotScores, general_note: gnote, observed_at: observedAt },
      });
      return updated;
    });
  } else {
    assessment = await prisma.traitAssessment.create({
      data: {
        module_id: moduleId,
        student_id: studentId,
        teacher_id: auth.teacher.id,
        general_note: gnote,
        observed_at: observedAt,
        trait_scores: { create: scoreRows },
        snapshots: {
          create: { scores: snapshotScores, general_note: gnote, observed_at: observedAt },
        },
      },
      select: {
        id: true,
        general_note: true,
        submitted_at: true, observed_at: true,
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
