// api/student/quizzes/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface SubmittedAnswer {
  questionId: string;
  answer: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [student, body] = await Promise.all([
    prisma.student.findUnique({
      where: { profile_id: user.id },
      select: { id: true },
    }),
    req.json() as Promise<{ quizId: string; answers: SubmittedAnswer[] }>,
  ]);

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const { quizId, answers } = body;

  // Check existing attempt + fetch questions in parallel
  const [existing, questions] = await Promise.all([
    prisma.quizAttempt.findUnique({
      where: { quiz_id_student_id: { quiz_id: quizId, student_id: student.id } },
      select: { id: true },
    }),
    prisma.quizQuestion.findMany({
      where: { quiz_id: quizId },
      select: { id: true, correct_answer: true },
    }),
  ]);

  if (existing) return NextResponse.json({ error: "Already attempted" }, { status: 400 });

  let score = 0;
  const answerData = answers.map((a) => {
    const question = questions.find((q) => q.id === a.questionId);
    const is_correct = question?.correct_answer === a.answer;
    if (is_correct) score++;
    return { question_id: a.questionId, answer: a.answer, is_correct };
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      quiz_id: quizId,
      student_id: student.id,
      score,
      total: questions.length,
      answers: { create: answerData },
    },
    select: { id: true, score: true, total: true },
  });

  return NextResponse.json({ score, total: questions.length, attempt });
}