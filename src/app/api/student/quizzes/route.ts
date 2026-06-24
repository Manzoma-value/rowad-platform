// api/student/quizzes/route.ts — only APPROVED quizzes attached to the
// student's CURRENT concept.
import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { resolveStudentRoadmapState } from "@/lib/concept-progress";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { student } = auth;
  if (!student.class_id || !student.school_id) {
    return NextResponse.json({ quizzes: [], studentId: student.id, current_concept: null });
  }

  const state = await resolveStudentRoadmapState({
    student_id: student.id,
    class_id: student.class_id,
    school_id: student.school_id,
  });
  if (!state.current) {
    return NextResponse.json({ quizzes: [], studentId: student.id, current_concept: null, finished_all: true });
  }

  const quizzes = await prisma.quiz.findMany({
    where: {
      class_id: student.class_id,
      module_id: state.current.module_id,
      review_status: "APPROVED",
      is_legacy: false,
    },
    select: {
      id: true,
      name: true,
      created_at: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true, order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
        },
      },
      attempts: {
        where: { student_id: student.id },
        select: { id: true, score: true, total: true, submitted_at: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    quizzes,
    studentId: student.id,
    current_concept: {
      module_id: state.current.module_id,
      title: state.current.title,
      stage_title: state.current.stage_title,
    },
  });
}
