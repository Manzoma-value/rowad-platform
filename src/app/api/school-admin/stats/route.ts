// api/school-admin/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";

// Auth-dependent response — must never be cached across users/sessions.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const school = {
    id: auth.school.id,
    name: auth.school.name,
    name_alt: auth.school.name_alt,
    language: auth.school.language,
    slug: auth.school.slug,
    is_active: auth.school.is_active,
  };
  const adminName = auth.profile.full_name;

  if (!school.is_active)
    return NextResponse.json({ error: "school_deactivated", school });

  // Batch 1 — counts
  const [teacherCount, studentCount, classCount, pendingPlacements] =
    await Promise.all([
      prisma.teacher.count({
        where: {
          school_id: school.id,
          onboarding_status: "ACTIVE",
          profile: { is_active: true },
        },
      }),
      prisma.student.count({ where: { school_id: school.id } }),
      prisma.class.count({ where: { school_id: school.id } }),
      prisma.assessmentAttempt.count({
        where: {
          assessment: { school_id: school.id, type: "SCHOOL_PLACEMENT" },
          review_status: "PENDING",
        },
      }),
    ]);

  // Batch 2 — assessment check + status breakdown
  const [hasPlacementAssessment, studentsByStatus] = await Promise.all([
    prisma.assessment
      .findFirst({
        where: { school_id: school.id, type: "SCHOOL_PLACEMENT" },
        select: { id: true },
      })
      .then(Boolean),
    prisma.student.groupBy({
      by: ["onboarding_status"],
      where: { school_id: school.id },
      _count: { onboarding_status: true },
    }),
  ]);

  return NextResponse.json({
    school,
    adminName,
    teacherCount,
    studentCount,
    classCount,
    pendingPlacements,
    hasPlacementAssessment,
    studentsByStatus: studentsByStatus.map((s) => ({
      status: s.onboarding_status,
      count: s._count.onboarding_status,
    })),
  });
}
