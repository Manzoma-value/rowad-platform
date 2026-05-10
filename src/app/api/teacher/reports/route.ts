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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findUnique({
    where: { profile_id: user.id },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classes = await prisma.class.findMany({
    where: { teacher_id: teacher.id },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
      students: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
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

    const students = cls.students.map((s) => {
      const attempts = s.moduleAttempts;
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
        passed_count: attempts.filter((a) => a.passed).length,
        avg_score: studentAvg,
      };
    });

    return {
      id: cls.id,
      name: cls.name,
      student_count: cls._count.students,
      total_attempts: totalAttempts,
      avg_score: avgScore,
      score_distribution: distribution,
      students,
    };
  });

  return NextResponse.json({ classes: data });
}