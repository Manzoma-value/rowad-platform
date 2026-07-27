// /api/teacher/workshops/[id]/videos
//   GET — this workshop's videos (no correct answers leaked), plus the
//   current teacher's own view/attempt state for each so the player can
//   skip re-pausing on rewatch and show prior score.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { teacher } = auth;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: teacher.school_id },
    select: {
      id: true,
      enrollments: { where: { teacher_id: teacher.id }, select: { id: true }, take: 1 },
      signed_up_teachers: { where: { id: teacher.id }, select: { id: true }, take: 1 },
      attendance: { where: { teacher_id: teacher.id }, select: { id: true }, take: 1 },
    },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const hasAccess = workshop.enrollments.length > 0 || workshop.signed_up_teachers.length > 0 || workshop.attendance.length > 0;
  if (!hasAccess) return NextResponse.json({ videos: [] });

  const videos = await prisma.workshopVideo.findMany({
    where: { workshop_id: id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      url: true,
      mime_type: true,
      order: true,
      questions: {
        orderBy: { timestamp_seconds: "asc" },
        select: {
          id: true,
          type: true,
          text: true,
          timestamp_seconds: true,
          order: true,
          options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
        },
      },
      views: { where: { teacher_id: teacher.id }, select: { completed_at: true, first_viewed_at: true } },
      attempts: {
        where: { teacher_id: teacher.id },
        select: {
          score: true,
          total: true,
          completed_at: true,
          answers: { select: { question_id: true, answer: true, is_correct: true } },
        },
      },
    },
  });

  return NextResponse.json({
    videos: videos.map((video) => {
      const { views, attempts, ...rest } = video;
      return {
        ...rest,
        viewed: views.length > 0,
        watch_completed: !!views[0]?.completed_at,
        attempt: attempts[0] ? {
          score: attempts[0].score,
          total: attempts[0].total,
          completed_at: attempts[0].completed_at,
          answers: attempts[0].answers,
        } : null,
      };
    }),
  });
}
