// api/teacher/lessons/[id]/route.ts
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

// GET /api/teacher/lessons/[id] — full lesson with contents + questions
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const lesson = await prisma.lesson.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: {
      id: true,
      title: true,
      description: true,
      is_published: true,
      is_graded: true,
      linked_quiz_id: true,
      class_id: true,
      created_at: true,
      updated_at: true,
      class: { select: { id: true, name: true } },
      linked_quiz: { select: { id: true, name: true } },
      contents: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, order: true,
          body: true, image_url: true, alt_text: true, storage_path: true,
          video_url: true, video_title: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true, correct_answer: true, order: true,
          options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
          matching_pairs: { orderBy: { order: "asc" }, select: { id: true, left: true, right: true, order: true } },
        },
      },
    },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  // Teacher's classes + quizzes for the meta selectors
  const [classes, quizzes] = await Promise.all([
    prisma.class.findMany({
      where: { teacher_id: auth.teacher.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.quiz.findMany({
      where: { teacher_id: auth.teacher.id },
      select: { id: true, name: true, class_id: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return NextResponse.json({ lesson, classes, quizzes });
}

// PATCH /api/teacher/lessons/[id] — update meta
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.lesson.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { title, description, is_published, is_graded, linked_quiz_id, classId } = body;

  // Validate class ownership if changing class
  if (classId !== undefined && classId !== null) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacher_id: auth.teacher.id },
      select: { id: true },
    });
    if (!cls) return NextResponse.json({ error: "Class not yours" }, { status: 400 });
  }

  // Validate quiz ownership if changing quiz
  if (linked_quiz_id) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: linked_quiz_id, teacher_id: auth.teacher.id },
      select: { id: true },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz not yours" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof description === "string") data.description = description.trim() || null;
  if (typeof is_published === "boolean") data.is_published = is_published;
  if (typeof is_graded === "boolean") data.is_graded = is_graded;
  if (linked_quiz_id === null || typeof linked_quiz_id === "string") {
    data.linked_quiz_id = linked_quiz_id || null;
  }
  if (typeof classId === "string") data.class_id = classId;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const lesson = await prisma.lesson.update({
    where: { id },
    data,
    select: {
      id: true, title: true, description: true,
      is_published: true, is_graded: true, linked_quiz_id: true, class_id: true,
    },
  });

  return NextResponse.json({ lesson });
}

// DELETE /api/teacher/lessons/[id]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const existing = await prisma.lesson.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  await prisma.lesson.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
