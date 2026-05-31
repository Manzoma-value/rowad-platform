// api/student/lessons/[id]/route.ts — single lesson, correct answers stripped
import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";

// Fisher-Yates shuffle — keeps API deterministic-ish per request, fresh shuffle each fetch
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { student } = auth;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id,
      is_published: true,
      class_id: student.class_id ?? undefined,
    },
    select: {
      id: true,
      title: true,
      description: true,
      is_graded: true,
      created_at: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
      linked_quiz: { select: { id: true, name: true } },
      contents: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, order: true,
          body: true, image_url: true, alt_text: true,
          video_url: true, video_title: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true, order: true,
          // ⚠️ correct_answer intentionally NOT selected for security
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
          matching_pairs: {
            orderBy: { order: "asc" },
            select: { id: true, left: true, right: true, order: true },
          },
        },
      },
      attempts: {
        where: { student_id: student.id },
        select: { score: true, total: true, completed_at: true },
        take: 1,
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // For MATCHING questions, return left side (in order) + right side shuffled
  // so the right values don't leak the correct pairing through position.
  const safeQuestions = lesson.questions.map((q) => {
    if (q.type === "MATCHING") {
      const lefts = q.matching_pairs.map((p) => ({ id: p.id, text: p.left }));
      const rights = shuffle(q.matching_pairs.map((p) => p.right));
      return {
        id: q.id,
        type: q.type,
        text: q.text,
        order: q.order,
        lefts,
        rights,
      };
    }
    return {
      id: q.id,
      type: q.type,
      text: q.text,
      order: q.order,
      options: q.options,
    };
  });

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      is_graded: lesson.is_graded,
      created_at: lesson.created_at,
      teacher_name: lesson.teacher.profile.full_name,
      linked_quiz: lesson.linked_quiz,
      contents: lesson.contents,
      questions: safeQuestions,
      attempt: lesson.attempts[0] ?? null,
    },
  });
}
