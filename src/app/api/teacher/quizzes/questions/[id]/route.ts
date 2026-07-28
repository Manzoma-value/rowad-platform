// api/teacher/quizzes/questions/[id] — PUT / DELETE a single quiz question.
// Flat path (not nested under the quiz) matching the lesson question routes.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const questionSelect = {
  id: true,
  type: true,
  text: true,
  correct_answer: true,
  order: true,
  options: { orderBy: { order: "asc" as const }, select: { id: true, text: true, order: true } },
};

async function questionForTeacher(id: string, teacherId: string) {
  return prisma.quizQuestion.findFirst({
    where: { id, quiz: { teacher_id: teacherId } },
    select: {
      id: true,
      type: true,
      quiz: { select: { id: true, is_legacy: true, review_status: true } },
    },
  });
}

function locked(quiz: { is_legacy: boolean; review_status: string }) {
  if (quiz.is_legacy) return "Legacy quizzes are read-only";
  if (quiz.review_status === "PENDING_REVIEW" || quiz.review_status === "APPROVED") {
    return "Quiz is locked while under review";
  }
  return null;
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const existing = await questionForTeacher(id, auth.teacher.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lockReason = locked(existing.quiz);
  if (lockReason) return NextResponse.json({ error: lockReason }, { status: 409 });

  const body = await req.json().catch(() => null) as {
    text?: string;
    correct_answer?: string;
    options?: string[];
  } | null;

  const data: Record<string, unknown> = {};
  if (body?.text !== undefined) {
    const text = body.text.trim();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    data.text = text.slice(0, 500);
  }

  if (existing.type === "TF") {
    if (body?.correct_answer !== undefined) {
      if (body.correct_answer !== "true" && body.correct_answer !== "false") {
        return NextResponse.json({ error: "correct_answer must be true or false" }, { status: 400 });
      }
      data.correct_answer = body.correct_answer;
    }
  } else if (body?.options !== undefined || body?.correct_answer !== undefined) {
    const options = (Array.isArray(body?.options) ? body!.options : [])
      .map((option) => String(option ?? "").trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 8);
    if (options.length < 2) return NextResponse.json({ error: "at least 2 options required" }, { status: 400 });
    const correctAnswer = body?.correct_answer?.trim() ?? "";
    if (!correctAnswer || !options.includes(correctAnswer)) {
      return NextResponse.json({ error: "correct_answer must match one of the options" }, { status: 400 });
    }
    data.correct_answer = correctAnswer;
    await prisma.quizOption.deleteMany({ where: { question_id: id } });
    data.options = { create: options.map((option, index) => ({ text: option, order: index + 1 })) };
  }

  const question = await prisma.quizQuestion.update({ where: { id }, data, select: questionSelect });
  return NextResponse.json({ question });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const existing = await questionForTeacher(id, auth.teacher.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lockReason = locked(existing.quiz);
  if (lockReason) return NextResponse.json({ error: lockReason }, { status: 409 });

  await prisma.quizQuestion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
