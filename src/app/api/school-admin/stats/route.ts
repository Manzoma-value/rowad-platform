// api/school-admin/stats/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Auth-dependent response — must never be cached across users/sessions.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let school;
  let adminName: string | null = null;
  try {
    const membership = await prisma.schoolAdminMember.findFirst({
      where: { profile_id: user.id },
      select: {
        school: { select: { id: true, name: true, name_alt: true, language: true, slug: true, is_active: true } },
        profile: { select: { full_name: true } },
      },
    });
    school = membership?.school ?? null;
    adminName = membership?.profile?.full_name ?? null;
  } catch (err) {
    console.error("[school-admin/stats] DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  if (!school.is_active)
    return NextResponse.json({ error: "school_deactivated", school });

  // Batch 1 — counts
  const [teacherCount, studentCount, classCount, pendingPlacements] =
    await Promise.all([
      prisma.teacher.count({ where: { school_id: school.id } }),
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