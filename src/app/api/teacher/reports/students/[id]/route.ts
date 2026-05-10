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

  // Verify student is in one of this teacher's classes
  const student = await prisma.student.findFirst({
    where: { id: studentId, class: { teacher_id: teacher.id } },
    select: {
      id: true,
      profile: { select: { full_name: true } },
      class: { select: { id: true, name: true } },
      moduleAttempts: {
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
          answers: {
            select: {
              is_correct: true,
              question: { select: { type: true } },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attempts = student.moduleAttempts;

  const avgScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
            attempts.length,
        )
      : null;

  const timeline = attempts.map((a) => ({
    date: a.created_at,
    module_title: a.module.title,
    stage_title: a.module.stage.title,
    stage_order: a.module.stage.order,
    module_order: a.module.order,
    score_pct: scoreToPct(a.score, a.total),
    passed: a.passed,
    score: a.score,
    total: a.total,
  }));

  // Per question-type accuracy
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

  // Stage breakdown
  const stageMap = new Map<
    string,
    { title: string; order: number; scores: number[] }
  >();
  attempts.forEach((a) => {
    const sid = a.module.stage.id;
    if (!stageMap.has(sid)) {
      stageMap.set(sid, {
        title: a.module.stage.title,
        order: a.module.stage.order,
        scores: [],
      });
    }
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

  return NextResponse.json({
    student: {
      id: student.id,
      full_name: student.profile.full_name,
      class_name: student.class?.name ?? null,
      attempts_count: attempts.length,
      passed_count: attempts.filter((a) => a.passed).length,
      avg_score: avgScore,
    },
    timeline,
    type_accuracy,
    stage_breakdown,
  });
}