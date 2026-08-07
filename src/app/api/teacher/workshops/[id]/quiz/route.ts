import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { canReadWorkshop, getWorkshopJourney } from "@/lib/workshop-journey";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function quizForTeacher(id: string, schoolId: string, teacherId: string) {
  const access = await canReadWorkshop(id, schoolId, teacherId);
  if (!access) return null;
  return prisma.workshopQuiz.findFirst({
    where: { requirement: { workshop_id: id, type: "QUIZ" } },
    include: {
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      attempts: { where: { teacher_id: teacherId }, include: { answers: true }, take: 1 },
    },
  });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const quiz = await quizForTeacher(id, auth.teacher.school_id, auth.teacher.id);
  if (!quiz) return NextResponse.json({ quiz: null });
  return NextResponse.json({ quiz: { id: quiz.id, title: quiz.title, description: quiz.description, passing_score: quiz.passing_score, questions: quiz.questions.map(({ correct_answer: _correct, ...question }) => question), attempt: quiz.attempts[0] ?? null } });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const quiz = await quizForTeacher(id, auth.teacher.school_id, auth.teacher.id);
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { question_id?: string; answer?: string } | null;
  const question = quiz.questions.find((item) => item.id === body?.question_id);
  const answer = String(body?.answer ?? "").trim().slice(0, 4000);
  if (!question || !answer) return NextResponse.json({ error: "question and answer required" }, { status: 400 });
  const isWritten = question.type === "TEXT";
  const isCorrect = !isWritten && question.correct_answer?.trim().toLowerCase() === answer.toLowerCase();
  const attempt = await prisma.workshopQuizAttempt.upsert({
    where: { quiz_id_teacher_id: { quiz_id: quiz.id, teacher_id: auth.teacher.id } },
    create: { quiz_id: quiz.id, teacher_id: auth.teacher.id, total: quiz.questions.length },
    update: { total: quiz.questions.length },
  });
  const saved = await prisma.workshopQuizAnswer.upsert({
    where: { attempt_id_question_id: { attempt_id: attempt.id, question_id: question.id } },
    create: { attempt_id: attempt.id, question_id: question.id, answer, is_correct: isCorrect, grading_status: isWritten ? "PENDING_REVIEW" : "AUTO_GRADED" },
    update: { answer, is_correct: isCorrect, grading_status: isWritten ? "PENDING_REVIEW" : "AUTO_GRADED", grader_id: null, graded_at: null },
  });
  const answers = await prisma.workshopQuizAnswer.findMany({ where: { attempt_id: attempt.id }, select: { is_correct: true, grading_status: true } });
  const score = answers.filter((item) => item.is_correct).length;
  const complete = answers.length === quiz.questions.length;
  const pending = answers.some((item) => item.grading_status === "PENDING_REVIEW");
  const percent = quiz.questions.length ? Math.round((score / quiz.questions.length) * 100) : 0;
  const passed = complete && !pending && percent >= quiz.passing_score;
  const updated = await prisma.workshopQuizAttempt.update({ where: { id: attempt.id }, data: { score, total: quiz.questions.length, completed_at: complete ? new Date() : null, passed_at: passed ? new Date() : null } });
  return NextResponse.json({ answer: { id: saved.id, question_id: saved.question_id, answer: saved.answer, is_correct: saved.is_correct, grading_status: saved.grading_status }, attempt: updated, journey: await getWorkshopJourney(id, auth.teacher.id) });
}
