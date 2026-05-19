// src/app/api/teacher/reports/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function scoreToPct(score: number, total: number): number {
  if (total <= 0) return 0;
  if (score > total) return Math.min(100, Math.round(score));
  return Math.round((score / total) * 100);
}

interface StudentAttempt {
  module_id: string;
  score: number;
  total: number;
  passed: boolean;
}

interface RawStudent {
  id: string;
  profile: { full_name: string };
  moduleAttempts: StudentAttempt[];
}

interface TraitAssessmentRef {
  module_id: string;
  student_id: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findUnique({
    where: { profile_id: user.id },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Query 1: classes + students + attempts (no trait nesting) ──
  const classes = await prisma.class.findMany({
    where: { teacher_id: teacher.id },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      name: true,
      created_at: true,
      _count: { select: { students: true } },
      students: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
          moduleAttempts: {
            select: {
              module_id: true,
              score: true,
              total: true,
              passed: true,
            },
          },
        },
      },
    },
  });

  // ── Query 2: all trait assessments for students in these classes ──
  const studentIds = classes.flatMap((cls) => cls.students.map((s) => s.id));

  const rawTraitAssessments = await prisma.traitAssessment.findMany({
    where: { student_id: { in: studentIds } },
    select: { module_id: true, student_id: true },
  });

  const traitAssessments: TraitAssessmentRef[] = rawTraitAssessments;

  // Build a map: studentId → Set of assessed module_ids
  const assessedMap = new Map<string, Set<string>>();
  traitAssessments.forEach((ta) => {
    if (!assessedMap.has(ta.student_id)) {
      assessedMap.set(ta.student_id, new Set());
    }
    assessedMap.get(ta.student_id)!.add(ta.module_id);
  });

  // ── Build response ──
  const data = classes.map((cls) => {
    const students: RawStudent[] = cls.students;
    const allAttempts: StudentAttempt[] = students.flatMap((s) => s.moduleAttempts);
    const totalAttempts = allAttempts.length;

    const avgScore =
      totalAttempts > 0
        ? Math.round(
            allAttempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
              totalAttempts,
          )
        : null;

    const distribution = [0, 0, 0, 0];
    allAttempts.forEach((a) => {
      const pct = scoreToPct(a.score, a.total);
      if (pct <= 25) distribution[0]++;
      else if (pct <= 50) distribution[1]++;
      else if (pct <= 75) distribution[2]++;
      else distribution[3]++;
    });

    const builtStudents = students.map((s) => {
      const attempts: StudentAttempt[] = s.moduleAttempts;
      const assessedIds: Set<string> = assessedMap.get(s.id) ?? new Set();
     const allModuleIds: string[] = attempts.map((a) => a.module_id);
const pendingCount = allModuleIds.filter((mid) => !assessedIds.has(mid)).length;

      const studentAvg =
        attempts.length > 0
          ? Math.round(
              attempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
                attempts.length,
            )
          : null;

      return {
        id: s.id,
        full_name: s.profile.full_name,
        attempts_count: attempts.length,
        avg_score: studentAvg,
        trait_assessments_count: assessedIds.size,
        pending_trait_assessments: pendingCount,
      };
    });

    const totalPending = builtStudents.reduce(
      (sum, s) => sum + s.pending_trait_assessments,
      0,
    );

    return {
      id: cls.id,
      name: cls.name,
      student_count: cls._count.students,
      total_attempts: totalAttempts,
      avg_score: avgScore,
      score_distribution: distribution,
      pending_trait_assessments: totalPending,
      students: builtStudents,
    };
  });

  return NextResponse.json({ classes: data });
}