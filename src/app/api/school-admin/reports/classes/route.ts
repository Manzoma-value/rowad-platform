// src/app/api/school-admin/reports/classes/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

// Handles both old format (score=65, total=1 → percentage stored directly)
// and new format (score=3, total=5 → raw count)
function scoreToPct(score: number, total: number): number {
  if (total <= 0) return 0;
  // If score > total it was stored as a percentage directly
  if (score > total) return Math.min(100, Math.round(score));
  return Math.round((score / total) * 100);
}

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classes = await prisma.class.findMany({
    where: { school_id: auth.school.id },
    select: {
      id: true,
      name: true,
      created_at: true,
      teacher: {
        select: { profile: { select: { full_name: true } } },
      },
      _count: { select: { students: true } },
      students: {
        select: {
          id: true,
          moduleAttempts: {
            select: { score: true, total: true, passed: true },
          },
        },
      },
    },
    orderBy: { created_at: "asc" },
  });

  const data = classes.map((cls) => {
    const allAttempts = cls.students.flatMap((s) => s.moduleAttempts);
    const totalAttempts = allAttempts.length;
    const passedAttempts = allAttempts.filter((a) => a.passed).length;

    const avgScore =
      totalAttempts > 0
        ? Math.round(
            allAttempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
              totalAttempts,
          )
        : null;

    // Score distribution: [0-25, 26-50, 51-75, 76-100]
    const distribution = [0, 0, 0, 0];
    allAttempts.forEach((a) => {
      const pct = scoreToPct(a.score, a.total);
      if (pct <= 25) distribution[0]++;
      else if (pct <= 50) distribution[1]++;
      else if (pct <= 75) distribution[2]++;
      else distribution[3]++;
    });

    const studentStats = cls.students.map((s) => {
      const attempts = s.moduleAttempts;
      const studentAvg =
        attempts.length > 0
          ? Math.round(
              attempts.reduce((sum, a) => sum + scoreToPct(a.score, a.total), 0) /
                attempts.length,
            )
          : null;
      return {
        student_id: s.id,
        attempts_count: attempts.length,
        passed_count: attempts.filter((a) => a.passed).length,
        avg_score: studentAvg,
      };
    });

    return {
      id: cls.id,
      name: cls.name,
      teacher_name: cls.teacher?.profile?.full_name ?? null,
      student_count: cls._count.students,
      total_attempts: totalAttempts,
      passed_attempts: passedAttempts,
      avg_score: avgScore,
      score_distribution: distribution,
      student_stats: studentStats,
    };
  });

  return NextResponse.json({ classes: data });
}