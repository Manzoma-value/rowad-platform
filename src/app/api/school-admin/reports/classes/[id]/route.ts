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

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: classId } = await context.params;

  const cls = await prisma.class.findFirst({
    where: { id: classId, school_id: auth.school.id },
    select: {
      id: true,
      name: true,
      teacher: {
        select: { profile: { select: { full_name: true } } },
      },
      students: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
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
            },
            orderBy: { created_at: "asc" },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Shape per student
  const students = cls.students.map((s) => {
    const attempts = s.moduleAttempts;
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
      score_pct: scoreToPct(a.score, a.total),
      passed: a.passed,
    }));

    return {
      id: s.id,
      full_name: s.profile.full_name,
      attempts_count: attempts.length,
      passed_count: attempts.filter((a) => a.passed).length,
      avg_score: avgScore,
      timeline,
    };
  });

  // All unique modules across all students (for heatmap columns)
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

  // Heatmap: student × module → score_pct or null
  const heatmap = cls.students.map((s) => {
    const attemptByModule = new Map(
      s.moduleAttempts.map((a) => [
        a.module.id,
        scoreToPct(a.score, a.total),
      ]),
    );
    return {
      student_id: s.id,
      student_name: s.profile.full_name,
      scores: modules.map((m) => attemptByModule.get(m.id) ?? null),
    };
  });

  // Score distribution for bar chart
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

  return NextResponse.json({
    class: {
      id: cls.id,
      name: cls.name,
      teacher_name: cls.teacher?.profile?.full_name ?? null,
    },
    students,
    modules,
    heatmap,
    distribution,
  });
}