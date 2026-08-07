import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string; answerId: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, answerId } = await context.params;
  const body = await req.json().catch(() => null) as { is_correct?: boolean; feedback?: string } | null;
  if (typeof body?.is_correct !== "boolean") return NextResponse.json({ error: "is_correct required" }, { status: 400 });
  const answer = await prisma.workshopQuizAnswer.findFirst({ where: { id: answerId, attempt: { quiz: { requirement: { workshop_id: id, workshop: { school_id: auth.school.id } } } } }, include: { attempt: { include: { quiz: { include: { _count: { select: { questions: true } } } } } } } });
  if (!answer) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  await prisma.workshopQuizAnswer.update({ where: { id: answer.id }, data: { is_correct: body.is_correct, grading_status: "GRADED", grader_id: auth.profile.id, graded_at: new Date(), feedback: body.feedback?.trim().slice(0, 1000) || null } });
  const answers = await prisma.workshopQuizAnswer.findMany({ where: { attempt_id: answer.attempt_id }, select: { is_correct: true, grading_status: true } });
  const score = answers.filter((item) => item.is_correct).length;
  const questionCount = answer.attempt.quiz._count.questions;
  const complete = answers.length === questionCount;
  const percent = questionCount ? Math.round((score / questionCount) * 100) : 0;
  await prisma.workshopQuizAttempt.update({ where: { id: answer.attempt_id }, data: { score, total: questionCount, completed_at: complete ? new Date() : null, passed_at: complete && percent >= answer.attempt.quiz.passing_score ? new Date() : null } });
  return NextResponse.json({ success: true });
}
