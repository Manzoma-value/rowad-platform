// api/teacher/quizzes/[id]/questions — POST a new question onto a quiz.
// Mirrors the lesson question authoring flow so both builders behave the same.
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

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true, is_legacy: true, review_status: true, _count: { select: { questions: true } } },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quiz.is_legacy) return NextResponse.json({ error: "Legacy quizzes are read-only" }, { status: 409 });
  if (quiz.review_status === "PENDING_REVIEW" || quiz.review_status === "APPROVED") {
    return NextResponse.json({ error: "Quiz is locked while under review" }, { status: 409 });
  }

  const body = await req.json().catch(() => null) as {
    type?: "MCQ" | "TF";
    text?: string;
    correct_answer?: string;
    options?: string[];
  } | null;

  const type = body?.type === "TF" ? "TF" : body?.type === "MCQ" ? "MCQ" : null;
  const text = body?.text?.trim();
  if (!type || !text) return NextResponse.json({ error: "type and text are required" }, { status: 400 });

  let correctAnswer = "";
  let options: string[] = [];
  if (type === "TF") {
    if (body?.correct_answer !== "true" && body?.correct_answer !== "false") {
      return NextResponse.json({ error: "correct_answer must be true or false" }, { status: 400 });
    }
    correctAnswer = body.correct_answer;
  } else {
    options = (Array.isArray(body?.options) ? body!.options : [])
      .map((option) => String(option ?? "").trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 8);
    if (options.length < 2) return NextResponse.json({ error: "at least 2 options required" }, { status: 400 });
    correctAnswer = body?.correct_answer?.trim() ?? "";
    if (!correctAnswer || !options.includes(correctAnswer)) {
      return NextResponse.json({ error: "correct_answer must match one of the options" }, { status: 400 });
    }
  }

  const question = await prisma.quizQuestion.create({
    data: {
      quiz_id: id,
      type,
      text: text.slice(0, 500),
      correct_answer: correctAnswer,
      order: quiz._count.questions + 1,
      ...(options.length
        ? { options: { create: options.map((option, index) => ({ text: option, order: index + 1 })) } }
        : {}),
    },
    select: questionSelect,
  });

  return NextResponse.json({ question }, { status: 201 });
}
