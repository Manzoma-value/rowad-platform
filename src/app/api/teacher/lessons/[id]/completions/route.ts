// GET /api/teacher/lessons/[id]/completions — per-class roster of which
// students attempted the lesson + % completion.
//
// A lesson is "completed" by a student if they have a LessonAttempt row
// with completed_at set. "Started but not completed" = LessonAttempt row
// with completed_at NULL.
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

  const lesson = await prisma.lesson.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: {
      id: true,
      title: true,
      class_id: true,
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
          completed_at: true,
          created_at: true,
        },
      },
    },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const byStudent = new Map<string, { completed_at: Date | null; score: number | null; total: number | null }>();
  for (const a of lesson.attempts) {
    byStudent.set(a.student_id, {
      completed_at: a.completed_at,
      score: a.score,
      total: a.total,
    });
  }

  const roster = lesson.class.students.map((s) => {
    const att = byStudent.get(s.id);
    return {
      student_id: s.id,
      full_name: s.profile.full_name,
      status: att?.completed_at ? "completed" : att ? "in_progress" : "not_started",
      score: att?.score ?? null,
      total: att?.total ?? null,
      completed_at: att?.completed_at ?? null,
    };
  });

  const completed = roster.filter((r) => r.status === "completed").length;
  const inProgress = roster.filter((r) => r.status === "in_progress").length;
  const total = roster.length;
  const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return NextResponse.json({
    lesson: { id: lesson.id, title: lesson.title, class: lesson.class.id ? { id: lesson.class.id, name: lesson.class.name } : null },
    summary: { total, completed, in_progress: inProgress, completion_pct: completionPct },
    roster,
  });
}
