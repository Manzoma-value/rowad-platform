// GET /api/teacher/quizzes/[id]/completions — per-class roster + completion %.
// A quiz attempt is one row per (quiz_id, student_id) (unique), so existence
// of an attempt = completed (no in-progress state for quizzes).
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: {
      id: true,
      name: true,
      class: {
        select: {
          id: true,
          name: true,
          students: {
            select: {
              id: true,
              profile: { select: { full_name: true } },
            },
            orderBy: { profile: { full_name: "asc" } },
          },
        },
      },
      attempts: {
        select: {
          student_id: true,
          score: true,
          total: true,
          submitted_at: true,
        },
      },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const byStudent = new Map(quiz.attempts.map((a) => [a.student_id, a]));
  const roster = quiz.class.students.map((s) => {
    const att = byStudent.get(s.id);
    return {
      student_id: s.id,
      full_name: s.profile.full_name,
      status: att ? "completed" : "not_started",
      score: att?.score ?? null,
      total: att?.total ?? null,
      submitted_at: att?.submitted_at ?? null,
    };
  });
  const completed = roster.filter((r) => r.status === "completed").length;
  const total = roster.length;
  const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return NextResponse.json({
    quiz: { id: quiz.id, name: quiz.name, class: { id: quiz.class.id, name: quiz.class.name } },
    summary: { total, completed, in_progress: 0, completion_pct: completionPct },
    roster,
  });
}
