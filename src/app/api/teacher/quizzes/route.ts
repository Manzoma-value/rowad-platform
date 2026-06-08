// api/teacher/quizzes/route.ts
//
// LIST view: returns lean per-quiz metadata + counts (no question payload,
// no per-attempt rows). The detail endpoint at /api/teacher/quizzes/[id]
// returns the heavy nested data for expanded view.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

interface QuestionInput {
  type: "MCQ" | "TF" | "WRITTEN";
  text: string;
  correct_answer: string;
  options?: string[];
}

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quizzes = await prisma.quiz.findMany({
    where: { teacher_id: auth.teacher.id },
    select: {
      id: true,
      name: true,
      created_at: true,
      class: { select: { id: true, name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(quizzes);
}

export async function POST(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, classId, questions } = body;
  if (!name || !classId || !questions?.length)
    return NextResponse.json(
      { error: "name, classId and questions are required" },
      { status: 400 },
    );

  // Tenant guard
  const ownsClass = await prisma.class.findFirst({
    where: { id: classId, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!ownsClass)
    return NextResponse.json({ error: "Class not found or not yours" }, { status: 404 });

  const quiz = await prisma.quiz.create({
    data: {
      name,
      class_id: classId,
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
      questions: {
        create: questions.map((q: QuestionInput, index: number) => ({
          type: q.type,
          text: q.text,
          correct_answer: q.correct_answer || null,
          order: index + 1,
          ...(q.type === "MCQ" && q.options?.length
            ? {
                options: {
                  create: q.options.map((opt: string, i: number) => ({
                    text: opt,
                    order: i + 1,
                  })),
                },
              }
            : {}),
        })),
      },
    },
    select: {
      id: true,
      name: true,
      class: { select: { id: true, name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}
