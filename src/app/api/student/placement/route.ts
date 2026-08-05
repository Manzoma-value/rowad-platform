// api/student/placement/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getStudent(userId: string) {
  return prisma.student.findUnique({ where: { profile_id: userId } });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await getStudent(user.id);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!student.school_id) return NextResponse.json({ error: "No platform assigned" }, { status: 400 });

  if (student.onboarding_status !== "SCHOOL_ASSIGNED") {
    return NextResponse.json({ error: "Not in placement stage" }, { status: 400 });
  }

  const assessment = await prisma.assessment.findFirst({
    where: { type: "SCHOOL_PLACEMENT", school_id: student.school_id, is_active: true },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!assessment) return NextResponse.json({ error: "No active placement assessment" }, { status: 404 });

  // Get school name for display
  const school = await prisma.school.findUnique({ where: { id: student.school_id } });

  return NextResponse.json({ assessment, school });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await getStudent(user.id);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (student.onboarding_status !== "SCHOOL_ASSIGNED") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const { assessment_id, answers } = await req.json();
  if (!assessment_id || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const questions = await prisma.assessmentQuestion.findMany({ where: { assessment_id } });
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

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
          return { question_id: a.question_id, answer: a.answer, is_correct };
        }),
      },
    },
  });

  await prisma.student.update({
    where: { id: student.id },
    data: { onboarding_status: "SCHOOL_PLACEMENT_SUBMITTED" },
  });

  return NextResponse.json({ success: true, attempt_id: attempt.id });
}