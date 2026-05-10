// src/app/api/student/roadmap/modules/[id]/attempt/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve params + body + student in parallel
  const [{ id: moduleId }, body, student] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
    prisma.student.findUnique({
      where: { profile_id: user.id },
      select: { id: true, school_id: true },
    }),
  ]);

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!student.school_id) return NextResponse.json({ error: "Not assigned to a school" }, { status: 403 });

  const { answers } = body as {
    answers: { question_id: string; answer: string }[];
  };

  if (!Array.isArray(answers) || answers.length === 0)
    return NextResponse.json({ error: "answers array required" }, { status: 400 });

  // Verify module ownership + one-attempt check in parallel
  const [mod, existing] = await Promise.all([
    prisma.roadmapModule.findFirst({
      where: {
        id: moduleId,
        stage: { roadmap: { school_id: student.school_id } },
      },
      select: {
        id: true,
        questions: {
          select: {
            id: true,
            type: true,
            correct_answer: true,
            matching_pairs: {
              select: { left: true, right: true },
            },
          },
        },
      },
    }),
    prisma.moduleAttempt.findUnique({
      where: {
        module_id_student_id: {
          module_id: moduleId,
          student_id: student.id,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  // Clean 400 instead of ugly Prisma unique constraint crash
  if (existing) return NextResponse.json({ error: "Already attempted" }, { status: 400 });

  if (mod.questions.length === 0)
    return NextResponse.json({ error: "Module has no questions" }, { status: 400 });

  // Grade answers
  let score = 0;
  const answerData = answers.map(({ question_id, answer }) => {
    const question = mod.questions.find((q) => q.id === question_id);
    if (!question) return { question_id, answer, is_correct: false };

    let is_correct = false;

    if (question.type === "MCQ" || question.type === "TF" || question.type === "WRITTEN") {
      is_correct =
        question.correct_answer !== null &&
        answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    }

    if (question.type === "MATCHING") {
      try {
        const submitted: Record<string, string> = JSON.parse(answer);
        is_correct = question.matching_pairs.every(
          (pair) =>
            submitted[pair.left]?.trim().toLowerCase() ===
            pair.right.trim().toLowerCase()
        );
      } catch {
        is_correct = false;
      }
    }

    if (is_correct) score++;
    return { question_id, answer, is_correct };
  });

  const total = mod.questions.length;
  const passed = total > 0 && score / total >= 0.7; // 70% pass threshold

  const attempt = await prisma.moduleAttempt.create({
    data: {
      module_id: moduleId,
      student_id: student.id,
      score,
      total,
      passed,
      answers: { create: answerData },
    },
    select: { score: true, total: true, passed: true },
  });

  return NextResponse.json({ attempt });
}