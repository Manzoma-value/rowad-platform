// src/app/api/school-admin/reports/classes/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function scoreToPct(score: number, total: number): number {
  if (total <= 0) return 0;
  if (score > total) return Math.min(100, Math.round(score));
  return Math.round((score / total) * 100);
}

interface ModuleAttempt {
  score: number;
  total: number;
  passed: boolean;
  created_at: Date;
  module: {
    id: string;
    title: string;
    order: number;
    stage: { id: string; title: string; order: number };
  };
}

interface TraitAssessmentRef {
  module_id: string;
  student_id: string;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: classId } = await context.params;

  // ── Query 1: class + students + attempts ──
  const cls = await prisma.class.findFirst({
    where: { id: classId, school_id: auth.school.id },
    select: {
      id: true,
      name: true,
      teacher: {
        select: { profile: { select: { full_name: true } } },
      },
      students: {
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          profile: { select: { full_name: true } },
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
                  stage: { select: { id: true, title: true, order: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Query 2: trait assessments for all students in this class ──
  const studentIds = cls.students.map((s) => s.id);

  const rawTraitAssessments = await prisma.traitAssessment.findMany({
    where: { student_id: { in: studentIds } },
    select: { module_id: true, student_id: true },
  });

  const traitAssessments: TraitAssessmentRef[] = rawTraitAssessments;

  // Build map: studentId → Set of assessed module_ids
  const assessedMap = new Map<string, Set<string>>();
  traitAssessments.forEach((ta) => {
    if (!assessedMap.has(ta.student_id)) {
      assessedMap.set(ta.student_id, new Set());
    }
    assessedMap.get(ta.student_id)!.add(ta.module_id);
  });

  // ── Shape per student ──
  const students = cls.students.map((s) => {
    const attempts: ModuleAttempt[] = s.moduleAttempts;
    const assessedIds: Set<string> = assessedMap.get(s.id) ?? new Set();

    const avgScore =
      attempts.length > 0
        ? Math.round(
            attempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
              attempts.length,
          )
        : null;

    const passedIds: string[] = attempts.filter((a) => a.passed).map((a) => a.module.id);
    const pendingTraitAssessments = passedIds.filter(
      (mid) => !assessedIds.has(mid),
    ).length;

    const timeline = attempts.map((a) => ({
      date: a.created_at,
      module_id: a.module.id,
      module_title: a.module.title,
      stage_title: a.module.stage.title,
      score_pct: scoreToPct(a.score, a.total),
      passed: a.passed,
      trait_assessed: assessedIds.has(a.module.id),
    }));

    return {
      id: s.id,
      full_name: s.profile.full_name,
      attempts_count: attempts.length,
      passed_count: passedIds.length,
      avg_score: avgScore,
      trait_assessments_count: assessedIds.size,
      pending_trait_assessments: pendingTraitAssessments,
      timeline,
    };
  });

  // ── All unique modules for heatmap columns ──
  const moduleMap = new Map<
    string,
    { title: string; stage: string; order: number }
  >();
  cls.students.forEach((s) =>
    s.moduleAttempts.forEach((a) => {
      if (!moduleMap.has(a.module.id)) {
        moduleMap.set(a.module.id, {
          title: a.module.title,
          stage: a.module.stage.title,
          order: a.module.stage.order * 1000 + a.module.order,
        });
      }
    }),
  );

  const modules = [...moduleMap.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id, m]) => ({ id, title: m.title, stage: m.stage }));

  // ── Heatmap: student × module → score_pct or null ──
  const heatmap = cls.students.map((s) => {
    const attemptByModule = new Map<string, number>(
      s.moduleAttempts.map((a) => [a.module.id, scoreToPct(a.score, a.total)]),
    );
    return {
      student_id: s.id,
      student_name: s.profile.full_name,
      scores: modules.map((m) => attemptByModule.get(m.id) ?? null),
    };
  });

  // ── Score distribution ──
  const allAttempts = cls.students.flatMap((s) => s.moduleAttempts);
  const distribution = [
    { label: "0-25%", count: 0 },
    { label: "26-50%", count: 0 },
    { label: "51-75%", count: 0 },
    { label: "76-100%", count: 0 },
  ];
  allAttempts.forEach((a) => {
    const pct = scoreToPct(a.score, a.total);
    if (pct <= 25) distribution[0].count++;
    else if (pct <= 50) distribution[1].count++;
    else if (pct <= 75) distribution[2].count++;
    else distribution[3].count++;
  });

  // ── Class-level pending summary ──
  const totalPending = students.reduce(
    (sum, s) => sum + s.pending_trait_assessments,
    0,
  );

  return NextResponse.json({
    class: {
      id: cls.id,
      name: cls.name,
      teacher_name: cls.teacher?.profile?.full_name ?? null,
      pending_trait_assessments: totalPending,
    },
    students,
    modules,
    heatmap,
    distribution,
  });
}