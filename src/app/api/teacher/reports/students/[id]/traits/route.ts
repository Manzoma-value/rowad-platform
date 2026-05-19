// src/app/api/school-admin/reports/classes/[classId]/traits/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

// GET /api/school-admin/reports/classes/[classId]/traits
export async function GET(
  _req: Request,
  context: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await context.params;

  const cls = await prisma.class.findFirst({
    where: { id: classId, school_id: auth.school.id },
    select: {
      id: true,
      name: true,
      students: {
        select: { id: true, profile: { select: { full_name: true, avatar_url: true } } },
      },
    },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const studentIds = cls.students.map((s) => s.id);

  const allAssessments = await prisma.traitAssessment.findMany({
    where: { student_id: { in: studentIds } },
    select: {
      student_id: true,
      module: { select: { main_trait_id: true } },
      trait_scores: {
        select: {
          score: true,
          trait: { select: { id: true, name: true, maqsad: true } },
        },
      },
    },
  });

  // Class-wide radar: average normalized score per trait across all students
  const traitTotals = new Map<string, { name: string; maqsad: string; sum: number; count: number }>();

  for (const a of allAssessments) {
    const otherCount = a.trait_scores.length - 1;
    for (const ts of a.trait_scores) {
      const isMain = a.module.main_trait_id === ts.trait.id;
      const maxScore = isMain ? 50 : otherCount > 0 ? 50 / otherCount : 50;
      const normalized = maxScore > 0 ? (ts.score / maxScore) * 100 : 0;

      const existing = traitTotals.get(ts.trait.id);
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

  const classRadar = Array.from(traitTotals.entries()).map(([id, v]) => ({
    trait_id: id,
    name: v.name,
    maqsad: v.maqsad,
    class_average: Math.round((v.sum / v.count) * 10) / 10,
  }));

  // Per-student summary for comparison
  const studentSummaries = cls.students.map((s) => {
    const studentAssessments = allAssessments.filter((a) => a.student_id === s.id);
    const studentTraits = new Map<string, { name: string; sum: number; count: number }>();

    for (const a of studentAssessments) {
      const otherCount = a.trait_scores.length - 1;
      for (const ts of a.trait_scores) {
        const isMain = a.module.main_trait_id === ts.trait.id;
        const maxScore = isMain ? 50 : otherCount > 0 ? 50 / otherCount : 50;
        const normalized = maxScore > 0 ? (ts.score / maxScore) * 100 : 0;

        const existing = studentTraits.get(ts.trait.id);
        if (existing) {
          existing.sum += normalized;
          existing.count += 1;
        } else {
          studentTraits.set(ts.trait.id, {
            name: ts.trait.name,
            sum: normalized,
            count: 1,
          });
        }
      }
    }

    return {
      student_id: s.id,
      full_name: s.profile.full_name,
      avatar_url: s.profile.avatar_url,
      assessments_count: studentAssessments.length,
      trait_averages: Array.from(studentTraits.entries()).map(([id, v]) => ({
        trait_id: id,
        name: v.name,
        average: Math.round((v.sum / v.count) * 10) / 10,
      })),
    };
  });

  return NextResponse.json({
    class: { id: cls.id, name: cls.name },
    student_count: cls.students.length,
    class_radar: classRadar,
    students: studentSummaries,
  });
}