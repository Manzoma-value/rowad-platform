// api/teacher/quizzes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

interface QuestionInput {
  type: "MCQ" | "TF" | "WRITTEN";
  text: string;
  correct_answer: string;
  options?: string[];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findUnique({
    where: { profile_id: user.id },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const quizzes = await prisma.quiz.findMany({
    where: { teacher_id: teacher.id },
    select: {
      id: true, name: true, created_at: true,
      class: { select: { id: true, name: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true, correct_answer: true, order: true,
          options: { select: { id: true, text: true, order: true } },
        },
      },
      attempts: {
        orderBy: { submitted_at: "desc" },
        select: {
          id: true, score: true, total: true, submitted_at: true,
          student: { select: { profile: { select: { full_name: true } } } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(quizzes);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [teacher, body] = await Promise.all([
    prisma.teacher.findUnique({
      where: { profile_id: user.id },
      select: { id: true, school_id: true },
    }),
    req.json(),
  ]);
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const { name, classId, questions } = body;
  if (!name || !classId || !questions?.length)
    return NextResponse.json({ error: "name, classId and questions are required" }, { status: 400 });

  // ── Tenant guard ──────────────────────────────────────────────────────────
  // The class must belong to this teacher. Without this check a teacher could
  // attach a quiz to another school's class by passing its id.
  const ownsClass = await prisma.class.findFirst({
    where: { id: classId, teacher_id: teacher.id },
    select: { id: true },
  });
  if (!ownsClass)
    return NextResponse.json({ error: "Class not found or not yours" }, { status: 404 });

  const quiz = await prisma.quiz.create({
    data: {
      name,
      class_id: classId,
      teacher_id: teacher.id,
      school_id: teacher.school_id,
      questions: {
        create: questions.map((q: QuestionInput, index: number) => ({
          type: q.type,
          text: q.text,
          correct_answer: q.correct_answer || null,
          order: index + 1,
          ...(q.type === "MCQ" && q.options?.length ? {
            options: {
              create: q.options.map((opt: string, i: number) => ({
                text: opt, order: i + 1,
              })),
            },
          } : {}),
        })),
      },
    },
    select: {
      id: true, name: true,
      questions: {
        select: {
          id: true, type: true, text: true, order: true,
          options: { select: { id: true, text: true, order: true } },
        },
      },
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}