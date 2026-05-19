// src/app/api/teacher/reports/students/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function scoreToPct(score: number, total: number): number {
  if (total <= 0) return 0;
  if (score > total) return Math.min(100, Math.round(score));
  return Math.round((score / total) * 100);
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id: studentId }, teacher] = await Promise.all([
    context.params,
    prisma.teacher.findUnique({
      where: { profile_id: user.id },
      select: { id: true },
    }),
  ]);
  if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Query 1: student + attempts (no trait nesting) ──
  const student = await prisma.student.findFirst({
    where: { id: studentId, class: { teacher_id: teacher.id } },
    select: {
      id: true,
      profile: { select: { full_name: true, avatar_url: true } },
      class: { select: { id: true, name: true } },
      moduleAttempts: {
        orderBy: { created_at: "asc" },
        select: {
          score: true,
          total: true,
          passed: true,
          created_at: true,
          module: {
            select: {
              id: true,
              title: true,
              order: true,
              main_trait_id: true,
              stage: { select: { id: true, title: true, order: true } },
            },
          },
          answers: {
            select: {
              is_correct: true,
              question: { select: { type: true } },
            },
          },
        },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Query 2: trait assessments separately ──
  const rawAssessments = await prisma.traitAssessment.findMany({
    where: { student_id: studentId },
    orderBy: { submitted_at: "asc" },
    select: {
      id: true,
      module_id: true,
      general_note: true,
      submitted_at: true,
      updated_at: true,
      trait_scores: {
        select: {
          score: true,
          note: true,
          trait: {
            select: { id: true, name: true, maqsad: true },
          },
        },
      },
    },
  });

  // ── Explicit interfaces ──
  interface TraitScore {
    score: number;
    note: string | null;
    trait: { id: string; name: string; maqsad: string };
  }

  interface Assessment {
    id: string;
    module_id: string;
    general_note: string | null;
    submitted_at: Date;
    updated_at: Date;
    trait_scores: TraitScore[];
  }

  const assessments: Assessment[] = rawAssessments as Assessment[];
  const attempts = student.moduleAttempts;
  const assessedModuleIds = new Set<string>(assessments.map((a) => a.module_id));

  // ── Question score stats ──
  const avgScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
            attempts.length,
        )
      : null;

  const timeline = attempts.map((a) => ({
    date: a.created_at,
    module_id: a.module.id,
    module_title: a.module.title,
    stage_title: a.module.stage.title,
    stage_order: a.module.stage.order,
    module_order: a.module.order,
    score_pct: scoreToPct(a.score, a.total),
    passed: a.passed,
    score: a.score,
    total: a.total,
    trait_assessed: assessedModuleIds.has(a.module.id),
  }));

  const byType: Record<string, { correct: number; total: number }> = {};
  attempts.forEach((a) =>
    a.answers.forEach((ans) => {
      const type = ans.question.type;
      if (!byType[type]) byType[type] = { correct: 0, total: 0 };
      byType[type].total++;
      if (ans.is_correct) byType[type].correct++;
    }),
  );

  const type_accuracy = Object.entries(byType).map(([type, val]) => ({
    type,
    correct: val.correct,
    total: val.total,
    pct: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
  }));

  const stageMap = new Map<string, { title: string; order: number; scores: number[] }>();
  attempts.forEach((a) => {
    const sid = a.module.stage.id;
    if (!stageMap.has(sid))
      stageMap.set(sid, { title: a.module.stage.title, order: a.module.stage.order, scores: [] });
    stageMap.get(sid)!.scores.push(scoreToPct(a.score, a.total));
  });

  const stage_breakdown = [...stageMap.values()]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      title: s.title,
      avg_score:
        s.scores.length > 0
          ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
          : null,
      modules_done: s.scores.length,
    }));

  // ── Pending trait assessments ──
  const pending_trait_assessments = attempts
  .filter((a) => !assessedModuleIds.has(a.module.id))
    .map((a) => ({
      module_id: a.module.id,
      module_title: a.module.title,
      stage_title: a.module.stage.title,
      stage_order: a.module.stage.order,
      completed_at: a.created_at,
    }));

  // ── Trait radar: normalize each score against its max weight ──
  const traitTotals = new Map<
    string,
    { name: string; maqsad: string; sum: number; count: number }
  >();

  assessments.forEach((assessment) => {
    const moduleAttempt = attempts.find((a) => a.module.id === assessment.module_id);
    const mainTraitId = moduleAttempt?.module.main_trait_id ?? null;
    const otherCount = assessment.trait_scores.length - 1;

    assessment.trait_scores.forEach((ts) => {
      const isMain = ts.trait.id === mainTraitId;
      const maxScore = isMain ? 50 : otherCount > 0 ? 50 / otherCount : 50;
      const normalized = maxScore > 0 ? (ts.score / maxScore) * 100 : 0;

      const existing = traitTotals.get(ts.trait.id);
      if (existing) {
        existing.sum += normalized;
        existing.count += 1;
      } else {
        traitTotals.set(ts.trait.id, {
          name: ts.trait.name,
          maqsad: ts.trait.maqsad,
          sum: normalized,
          count: 1,
        });
      }
    });
  });

  const trait_radar = Array.from(traitTotals.entries()).map(([id, v]) => ({
    trait_id: id,
    name: v.name,
    maqsad: v.maqsad,
    average: Math.round((v.sum / v.count) * 10) / 10,
  }));

  // ── Trait assessments per module ──
  const trait_assessments = assessments.map((a) => {
    const moduleAttempt = attempts.find((att) => att.module.id === a.module_id);
    const total = a.trait_scores.reduce((sum, ts) => sum + ts.score, 0);
    return {
      module_id: a.module_id,
      module_title: moduleAttempt?.module.title ?? "",
      stage_title: moduleAttempt?.module.stage.title ?? "",
      total_score: Math.round(total * 10) / 10,
      general_note: a.general_note,
      submitted_at: a.submitted_at,
      updated_at: a.updated_at,
      trait_scores: a.trait_scores.map((ts) => ({
        trait_id: ts.trait.id,
        trait_name: ts.trait.name,
        maqsad: ts.trait.maqsad,
        score: ts.score,
        note: ts.note,
      })),
    };
  });

  return NextResponse.json({
    student: {
      id: student.id,
      full_name: student.profile.full_name,
      avatar_url: student.profile.avatar_url,
      class_name: student.class?.name ?? null,
      attempts_count: attempts.length,
      passed_count: attempts.filter((a) => a.passed).length,
      avg_score: avgScore,
      trait_assessments_count: assessments.length,
      pending_trait_assessments_count: pending_trait_assessments.length,
    },
    timeline,
    type_accuracy,
    stage_breakdown,
    pending_trait_assessments,
    trait_assessments,
    trait_radar,
  });
}