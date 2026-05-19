// src/app/api/school-admin/reports/students/[studentId]/traits/route.ts
// Also used by teacher — teacher version is below in a separate file
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

// GET /api/school-admin/reports/students/[studentId]/traits
export async function GET(
  _req: Request,
  context: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await context.params;

  // Verify student belongs to this school
  const student = await prisma.student.findFirst({
    where: { id: studentId, school_id: auth.school.id },
    select: {
      id: true,
      profile: { select: { full_name: true, avatar_url: true } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // Get all trait assessments for this student with full context
  const assessments = await prisma.traitAssessment.findMany({
    where: { student_id: studentId },
    orderBy: { submitted_at: "asc" },
    select: {
      id: true,
      general_note: true,
      submitted_at: true,
      updated_at: true,
      teacher: {
        select: { profile: { select: { full_name: true } } },
      },
      module: {
        select: {
          id: true,
          title: true,
          main_trait_id: true,
          stage: {
            select: {
              id: true,
              title: true,
              order: true,
            },
          },
        },
      },
      trait_scores: {
        select: {
          id: true,
          score: true,
          note: true,
          trait: {
            select: {
              id: true,
              name: true,
              maqsad: true,
              definition: true,
            },
          },
        },
      },
    },
  });

  // Build per-trait averages across all modules for radar chart
  const traitTotals = new Map<string, { name: string; maqsad: string; sum: number; count: number }>();

  for (const a of assessments) {
    for (const ts of a.trait_scores) {
      const existing = traitTotals.get(ts.trait.id);
      // Normalize score to percentage of its max weight for fair averaging
      const isMain = a.module.main_trait_id === ts.trait.id;
      const otherCount = a.trait_scores.length - 1;
      const maxScore = isMain ? 50 : otherCount > 0 ? 50 / otherCount : 50;
      const normalized = maxScore > 0 ? (ts.score / maxScore) * 100 : 0;

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
    }
  }

  const radarData = Array.from(traitTotals.entries()).map(([id, v]) => ({
    trait_id: id,
    name: v.name,
    maqsad: v.maqsad,
    average: Math.round((v.sum / v.count) * 10) / 10, // one decimal
  }));

  // Module completion totals
  const moduleTotals = assessments.map((a) => {
    const total = a.trait_scores.reduce((sum, ts) => sum + ts.score, 0);
    return {
      module_id: a.module.id,
      module_title: a.module.title,
      stage_id: a.module.stage.id,
      stage_title: a.module.stage.title,
      stage_order: a.module.stage.order,
      main_trait_id: a.module.main_trait_id,
      total_score: Math.round(total * 10) / 10,
      general_note: a.general_note,
      teacher_name: a.teacher.profile.full_name,
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
      class: student.class,
    },
    assessments_count: assessments.length,
    radar: radarData,
    modules: moduleTotals,
  });
}