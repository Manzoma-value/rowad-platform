import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-auth";

export async function GET() {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assessments = await prisma.traitAssessment.findMany({
    where: { student_id: auth.student.id },
    orderBy: { submitted_at: "asc" },
    select: {
      id: true,
      general_note: true,
      submitted_at: true,
      updated_at: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
      module: {
        select: {
          id: true,
          title: true,
          stage: { select: { id: true, title: true, order: true } },
        },
      },
      trait_scores: {
        select: {
          score: true,
          note: true,
          trait: { select: { id: true, name: true, maqsad: true } },
        },
      },
    },
  });

  const totals = new Map<string, { name: string; maqsad: string; sum: number; count: number }>();
  for (const assessment of assessments) {
    for (const score of assessment.trait_scores) {
      const current = totals.get(score.trait.id);
      if (current) {
        current.sum += score.score;
        current.count += 1;
      } else {
        totals.set(score.trait.id, {
          name: score.trait.name,
          maqsad: score.trait.maqsad,
          sum: score.score,
          count: 1,
        });
      }
    }
  }

  return NextResponse.json({
    student: {
      id: auth.student.id,
      full_name: auth.profile.full_name,
      avatar_url: auth.profile.avatar_url,
    },
    assessments_count: assessments.length,
    radar: [...totals.entries()].map(([traitId, value]) => ({
      trait_id: traitId,
      name: value.name,
      maqsad: value.maqsad,
      average: Math.round((value.sum / value.count) * 10) / 10,
    })),
    modules: assessments.map((assessment) => ({
      module_id: assessment.module.id,
      module_title: assessment.module.title,
      stage_title: assessment.module.stage.title,
      total_score: Math.round(assessment.trait_scores.reduce((sum, score) => sum + score.score, 0) * 10) / 10,
      general_note: assessment.general_note,
      teacher_name: assessment.teacher.profile.full_name,
      submitted_at: assessment.submitted_at,
      trait_scores: assessment.trait_scores.map((score) => ({
        trait_id: score.trait.id,
        trait_name: score.trait.name,
        maqsad: score.trait.maqsad,
        score: score.score,
        note: score.note,
      })),
    })),
  });
}
