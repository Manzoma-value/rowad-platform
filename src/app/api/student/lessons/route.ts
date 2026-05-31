// api/student/lessons/route.ts — list published lessons for the student's class
import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { student } = auth;
  if (!student.class_id) {
    return NextResponse.json({ lessons: [] });
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      class_id: student.class_id,
      is_published: true,
    },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      is_graded: true,
      created_at: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
      linked_quiz: { select: { id: true, name: true } },
      _count: { select: { contents: true, questions: true } },
      attempts: {
        where: { student_id: student.id },
        select: { score: true, total: true, completed_at: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      is_graded: l.is_graded,
      created_at: l.created_at,
      teacher_name: l.teacher.profile.full_name,
      linked_quiz: l.linked_quiz,
      content_count: l._count.contents,
      question_count: l._count.questions,
      attempt: l.attempts[0] ?? null,
    })),
  });
}
