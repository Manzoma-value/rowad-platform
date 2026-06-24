// POST /api/teacher/quizzes/[id]/submit — same pipeline as the lesson submit
// endpoint: DRAFT/REJECTED → PENDING_REVIEW.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true, review_status: true, is_legacy: true, module_id: true },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quiz.is_legacy) {
    return NextResponse.json({ error: "Legacy quizzes cannot be submitted" }, { status: 409 });
  }
  if (!quiz.module_id) {
    return NextResponse.json({ error: "Quiz is not tied to a concept" }, { status: 409 });
  }
  if (quiz.review_status === "PENDING_REVIEW") {
    return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
  }
  if (quiz.review_status === "APPROVED") {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  await prisma.quiz.update({
    where: { id },
    data: {
      review_status: "PENDING_REVIEW",
      submitted_at: new Date(),
      reviewer_id: null,
      reviewed_at: null,
    },
  });

  return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
}
