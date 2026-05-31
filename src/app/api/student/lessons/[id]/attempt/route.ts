// api/student/lessons/[id]/attempt/route.ts — grade + record
import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";

interface AnswerInput {
  question_id: string;
  answer: string; // for MATCHING: JSON `{ "<left_id>": "<right_text>" }`
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: lessonId } = await context.params;
  const { student } = auth;

  const body = await req.json().catch(() => ({}));
  const answers = body.answers as AnswerInput[] | undefined;
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "answers array required" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      is_published: true,
      class_id: student.class_id ?? undefined,
    },
    select: {
      id: true,
      is_graded: true,
      questions: {
        select: {
          id: true,
          type: true,
          correct_answer: true,
          matching_pairs: { select: { id: true, left: true, right: true } },
        },
      },
    },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  if (lesson.questions.length === 0) {
    return NextResponse.json({ error: "Lesson has no questions" }, { status: 400 });
  }

  // ── GRADED MODE: reject repeat attempts ──
  if (lesson.is_graded) {
    const existing = await prisma.lessonAttempt.findUnique({
      where: { lesson_id_student_id: { lesson_id: lessonId, student_id: student.id } },
      select: { id: true, completed_at: true },
    });
    if (existing?.completed_at) {
      return NextResponse.json({ error: "Already attempted" }, { status: 400 });
    }
  }

  // ── Grade ──
  let score = 0;
  const graded = answers.map(({ question_id, answer }) => {
    const q = lesson.questions.find((x) => x.id === question_id);
    if (!q) return { question_id, answer, is_correct: false };

    let is_correct = false;

    if (q.type === "MCQ" || q.type === "TF" || q.type === "WRITTEN") {
      is_correct =
        q.correct_answer !== null &&
        answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
    } else if (q.type === "MATCHING") {
      try {
        // Client submits { "<left_id>": "<right_text>" }
        const submitted = JSON.parse(answer) as Record<string, string>;
        is_correct = q.matching_pairs.every((pair) => {
          const guess = submitted[pair.id];
          return guess?.trim().toLowerCase() === pair.right.trim().toLowerCase();
        });
      } catch {
        is_correct = false;
      }
    }

    if (is_correct) score++;
    return { question_id, answer, is_correct };
  });

  const total = lesson.questions.length;
  const completed_at = new Date();

  // ── Persist attempt (upsert so practice mode can be retaken) ──
  const attempt = await prisma.lessonAttempt.upsert({
    where: { lesson_id_student_id: { lesson_id: lessonId, student_id: student.id } },
    create: {
      lesson_id: lessonId,
      student_id: student.id,
      score,
      total,
      completed_at,
      answers: { create: graded },
    },
    update: {
      score,
      total,
      completed_at,
      answers: {
        deleteMany: {},      // clear previous answers (practice re-attempt)
        create: graded,
      },
    },
    select: { id: true, score: true, total: true, completed_at: true },
  });

  return NextResponse.json({
    attempt,
    is_graded: lesson.is_graded,
    // Per-question correctness so the viewer can show feedback
    results: graded.map(({ question_id, is_correct }) => ({ question_id, is_correct })),
  });
}
