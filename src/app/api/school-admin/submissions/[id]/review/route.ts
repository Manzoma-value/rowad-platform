// api/school-admin/submissions/[id]/review/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, { written_grades, reviewer_notes, assigned_class_id }] =
    await Promise.all([context.params, req.json()]);

  if (!assigned_class_id)
    return NextResponse.json({ error: "assigned_class_id is required" }, { status: 400 });

  // Verify attempt exists + belongs to this school, get student_id only
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id, assessment: { school_id: auth.school.id } },
    select: { id: true, student_id: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update all written grades in parallel
  const gradeUpdates =
    written_grades && typeof written_grades === "object"
      ? Object.entries(written_grades as Record<string, boolean>).map(
          ([answerId, isCorrect]) =>
            prisma.assessmentAnswer.update({
              where: { id: answerId },
              data: { is_correct: isCorrect },
              select: { id: true },
            })
        )
      : [];

  await Promise.all(gradeUpdates);

  // Count score using DB aggregation (faster than fetching all rows)
  const [correctCount, totalCount] = await Promise.all([
    prisma.assessmentAnswer.count({
      where: { attempt_id: id, is_correct: true },
    }),
    prisma.assessmentAnswer.count({
      where: { attempt_id: id },
    }),
  ]);

  // Update attempt + student in parallel
  await Promise.all([
    prisma.assessmentAttempt.update({
      where: { id },
      data: {
        review_status: "REVIEWED",
        reviewer_id: auth.profile.id,
        reviewer_notes: reviewer_notes || null,
        assigned_class_id,
        score: correctCount,
        total: totalCount,
        reviewed_at: new Date(),
      },
      select: { id: true },
    }),
    prisma.student.update({
      where: { id: attempt.student_id },
      data: {
        onboarding_status: "CLASS_ASSIGNED",
        class_id: assigned_class_id,
      },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({ success: true, score: correctCount, total: totalCount });
}