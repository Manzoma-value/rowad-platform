import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const [auth, { id: studentId }] = await Promise.all([requireTeacher(), context.params]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findFirst({
    where: { id: studentId, class: { teacher_id: auth.teacher.id } },
    select: {
      id: true,
      profile: { select: { full_name: true, avatar_url: true } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });

  const assessments = await prisma.traitAssessment.findMany({
    where: { student_id: studentId },
    select: {
      trait_scores: {
        select: {
          score: true,
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
      id: student.id,
      full_name: student.profile.full_name,
      avatar_url: student.profile.avatar_url,
      class: student.class,
    },
    assessments_count: assessments.length,
    trait_radar: [...totals.entries()].map(([traitId, value]) => ({
      trait_id: traitId,
      name: value.name,
      maqsad: value.maqsad,
      average: Math.round((value.sum / value.count) * 10) / 10,
    })),
  });
}
