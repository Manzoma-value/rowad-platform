// /api/school-admin/workshops/[id]/videos/[videoId]/results
//   GET — per-teacher breakdown: did they watch the video, did they answer
//   its questions, their score, and every individual answer they gave.
//   Roster mirrors the attendance roster: anyone enrolled, signed up via the
//   account-creation QR, or with at least one attendance record.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, videoId } = await context.params;

  const video = await prisma.workshopVideo.findFirst({
    where: { id: videoId, workshop_id: id, workshop: { school_id: auth.school.id } },
    select: {
      id: true,
      title: true,
      questions: {
        orderBy: { timestamp_seconds: "asc" },
        select: { id: true, text: true, type: true, timestamp_seconds: true, order: true },
      },
    },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [teachers, views, attempts] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        school_id: auth.school.id,
        OR: [
          { workshop_enrollments: { some: { workshop_id: id } } },
          { workshop_signup_id: id },
          { workshop_attendance: { some: { workshop_id: id } } },
        ],
      },
      orderBy: { profile: { full_name: "asc" } },
      select: { id: true, profile: { select: { full_name: true, email: true, avatar_url: true } } },
    }),
    prisma.workshopVideoView.findMany({
      where: { video_id: videoId },
      select: { teacher_id: true, first_viewed_at: true, last_viewed_at: true, completed_at: true },
    }),
    prisma.workshopVideoAttempt.findMany({
      where: { video_id: videoId },
      select: {
        teacher_id: true,
        score: true,
        total: true,
        completed_at: true,
        answers: {
          select: { question_id: true, answer: true, is_correct: true, created_at: true },
        },
      },
    }),
  ]);

  const viewByTeacher = new Map(views.map((v) => [v.teacher_id, v]));
  const attemptByTeacher = new Map(attempts.map((a) => [a.teacher_id, a]));
  const questionById = new Map(video.questions.map((q) => [q.id, q]));

  const rows = teachers.map((teacher) => {
    const view = viewByTeacher.get(teacher.id) ?? null;
    const attempt = attemptByTeacher.get(teacher.id) ?? null;
    return {
      teacher_id: teacher.id,
      full_name: teacher.profile.full_name,
      email: teacher.profile.email,
      avatar_url: teacher.profile.avatar_url,
      viewed: !!view,
      first_viewed_at: view?.first_viewed_at ?? null,
      last_viewed_at: view?.last_viewed_at ?? null,
      watch_completed_at: view?.completed_at ?? null,
      score: attempt?.score ?? null,
      total: attempt?.total ?? video.questions.length,
      quiz_completed_at: attempt?.completed_at ?? null,
      answers: (attempt?.answers ?? [])
        .slice()
        .sort((a, b) => (questionById.get(a.question_id)?.order ?? 0) - (questionById.get(b.question_id)?.order ?? 0))
        .map((a) => ({
          question_id: a.question_id,
          question_text: questionById.get(a.question_id)?.text ?? "",
          answer: a.answer,
          is_correct: a.is_correct,
          answered_at: a.created_at,
        })),
    };
  });

  return NextResponse.json({
    video: { id: video.id, title: video.title, question_count: video.questions.length },
    teachers: rows,
  });
}
