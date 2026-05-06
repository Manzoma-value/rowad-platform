import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/prisma";

export const revalidate = 30;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Batch 1 — counts (4 queries)
  const [schoolCount, teacherCount, studentCount, pendingSubmissions] =
    await Promise.all([
      prisma.school.count(),
      prisma.teacher.count(),
      prisma.student.count(),
      prisma.assessmentAttempt.count({
        where: { review_status: "PENDING", assessment: { type: "PLATFORM_INTAKE" } },
      }),
    ]);

  // Batch 2 — the rest (3 queries)
  const [totalSubmissions, hasIntakeAssessment, studentsByStatus] =
    await Promise.all([
      prisma.assessmentAttempt.count({
        where: { assessment: { type: "PLATFORM_INTAKE" } },
      }),
      prisma.assessment.findFirst({ where: { type: "PLATFORM_INTAKE" } }),
      prisma.student.groupBy({
        by: ["onboarding_status"],
        _count: { onboarding_status: true },
      }),
    ]);

  return NextResponse.json({
    schoolCount,
    teacherCount,
    studentCount,
    pendingSubmissions,
    totalSubmissions,
    hasIntakeAssessment: !!hasIntakeAssessment,
    studentsByStatus: studentsByStatus.map((s) => ({
      status: s.onboarding_status,
      count: s._count.onboarding_status,
    })),
  });
}