import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ownerProfile = await requireOwner();
  if (!ownerProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const { written_grades, reviewer_notes, assigned_school_id } = await req.json();

  if (!assigned_school_id)
    return NextResponse.json({ error: "assigned_school_id is required" }, { status: 400 });

  // Verify attempt exists + get student_id — only fetch what we need
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id },
    select: { id: true, student_id: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update all written grades in parallel
  const gradeUpdates = written_grades && typeof written_grades === "object"
    ? Object.entries(written_grades as Record<string, boolean>).map(
        ([answerId, isCorrect]) =>
          prisma.assessmentAnswer.update({
            where: { id: answerId },
            data: { is_correct: isCorrect },
            select: { id: true }, // minimal select
          })
      )
    : [];

  await Promise.all(gradeUpdates);

  // Count score from DB (source of truth after updates)
  const [correctCount, totalCount] = await Promise.all([
    prisma.assessmentAnswer.count({
      where: { attempt_id: id, is_correct: true },
    }),
    prisma.assessmentAnswer.count({
      where: { attempt_id: id },
    }),
  ]);

  // Update attempt + student in parallel
  const [updated] = await Promise.all([
    prisma.assessmentAttempt.update({
      where: { id },
      data: {
        review_status: "REVIEWED",
        reviewer_id: ownerProfile.id,
        reviewer_notes: reviewer_notes || null,
        assigned_school_id,
        score: correctCount,
        total: totalCount,
        reviewed_at: new Date(),
      },
      select: { id: true, review_status: true, score: true, total: true },
    }),
    prisma.student.update({
      where: { id: attempt.student_id },
      data: {
        onboarding_status: "SCHOOL_ASSIGNED",
        school_id: assigned_school_id,
      },
      select: { id: true }, // minimal select
    }),
  ]);

  return NextResponse.json({ attempt: updated, score: correctCount, total: totalCount });
}