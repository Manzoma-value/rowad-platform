// api/student/intake/route.ts
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/prisma";

async function getStudent(userId: string) {
  return prisma.student.findUnique({ where: { profile_id: userId } });
}

// GET — fetch the active platform intake assessment
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await getStudent(user.id);
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });

  // Only allow if still pending
  if (student.onboarding_status !== "PENDING_INTAKE") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const assessment = await prisma.assessment.findFirst({
    where: { type: "PLATFORM_INTAKE", is_active: true },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "No active intake assessment found" }, { status: 404 });
  }

  return NextResponse.json({ assessment });
}

// POST — submit answers
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await getStudent(user.id);
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });

  if (student.onboarding_status !== "PENDING_INTAKE") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const body = await req.json();
  const { assessment_id, answers } = body;
  // answers: { question_id: string, answer: string }[]

  if (!assessment_id || !answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  // Load questions to auto-grade MCQ and TF
  const questions = await prisma.assessmentQuestion.findMany({
    where: { assessment_id },
  });

  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

  // Create the attempt
  const attempt = await prisma.assessmentAttempt.create({
    data: {
      assessment_id,
      student_id: student.id,
      review_status: "PENDING",
      answers: {
        create: answers.map((a: { question_id: string; answer: string }) => {
          const q = questionMap[a.question_id];
          let is_correct: boolean | null = null;
          if (q && (q.type === "MCQ" || q.type === "TF")) {
            is_correct = q.correct_answer === a.answer;
          }
          return {
            question_id: a.question_id,
            answer: a.answer,
            is_correct,
          };
        }),
      },
    },
  });

  // Update student status to INTAKE_SUBMITTED
  await prisma.student.update({
    where: { id: student.id },
    data: { onboarding_status: "INTAKE_SUBMITTED" },
  });

  return NextResponse.json({ success: true, attempt_id: attempt.id });
}