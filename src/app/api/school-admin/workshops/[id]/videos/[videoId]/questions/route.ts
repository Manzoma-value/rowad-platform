// /api/school-admin/workshops/[id]/videos/[videoId]/questions — POST create
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { cleanCorrectAnswers, cleanQuestionOptions, MAX_QUESTIONS_PER_VIDEO, type WorkshopVideoAnswerMode } from "@/lib/workshop-videos";
import { notifyProfiles, workshopTeacherProfileIds } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const questionSelect = {
  id: true,
  type: true,
  text: true,
  correct_answer: true,
  answer_mode: true,
  correct_answers: true,
  timestamp_seconds: true,
  order: true,
  options: { orderBy: { order: "asc" as const }, select: { id: true, text: true, order: true } },
};

export async function POST(req: Request, context: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, videoId } = await context.params;

  const video = await prisma.workshopVideo.findFirst({
    where: { id: videoId, workshop_id: id, workshop: { school_id: auth.school.id } },
    select: {
      id: true,
      title: true,
      duration_seconds: true,
      workshop: { select: { title: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video._count.questions >= MAX_QUESTIONS_PER_VIDEO) {
    return NextResponse.json({ error: "Too many questions on this video" }, { status: 400 });
  }

  let body: {
    type?: "MCQ" | "TF" | "TEXT";
    text?: string;
    correct_answer?: string;
    answer_mode?: WorkshopVideoAnswerMode;
    correct_answers?: string[];
    timestamp_seconds?: number;
    options?: string[];
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const type = body.type === "TF" || body.type === "MCQ" || body.type === "TEXT"
    ? body.type
    : null;
  const text = body.text?.trim();
  const timestampSeconds = Number(body.timestamp_seconds);
  if (!type || !text || !Number.isFinite(timestampSeconds) || timestampSeconds < 0) {
    return NextResponse.json({ error: "type, text and a valid timestamp_seconds are required" }, { status: 400 });
  }
  // A question past the end of the video would never fire during playback.
  if (video.duration_seconds && timestampSeconds > video.duration_seconds) {
    return NextResponse.json({ error: "timestamp is past the end of the video" }, { status: 400 });
  }

  let correctAnswer = "";
  let answerMode: WorkshopVideoAnswerMode = "SINGLE";
  let correctAnswers: string[] = [];
  let options: string[] = [];
  if (type === "TEXT") {
    correctAnswer = "";
  } else if (type === "TF") {
    if (body.correct_answer !== "true" && body.correct_answer !== "false") {
      return NextResponse.json({ error: "correct_answer must be true or false" }, { status: 400 });
    }
    correctAnswer = body.correct_answer;
  } else {
    options = cleanQuestionOptions(body.options);
    if (options.length < 2) return NextResponse.json({ error: "at least 2 options required" }, { status: 400 });
    answerMode = body.answer_mode === "MULTIPLE" || body.answer_mode === "NONE" ? body.answer_mode : "SINGLE";
    correctAnswers = cleanCorrectAnswers(body.correct_answers ?? (body.correct_answer ? [body.correct_answer] : []), options);
    if (answerMode === "SINGLE" && correctAnswers.length !== 1) return NextResponse.json({ error: "choose exactly one correct answer" }, { status: 400 });
    if (answerMode === "MULTIPLE" && correctAnswers.length < 2) return NextResponse.json({ error: "choose at least two correct answers" }, { status: 400 });
    if (answerMode === "NONE") correctAnswers = [];
    correctAnswer = correctAnswers[0] ?? "";
  }

  const order = video._count.questions;
  const question = await prisma.workshopVideoQuestion.create({
    data: {
      video_id: videoId,
      type,
      text: text.slice(0, 500),
      correct_answer: correctAnswer,
      answer_mode: answerMode,
      correct_answers: correctAnswers,
      timestamp_seconds: Math.round(timestampSeconds),
      order,
      options: options.length ? { create: options.map((text, index) => ({ text, order: index })) } : undefined,
    },
    select: questionSelect,
  });
  const teacherIds = await workshopTeacherProfileIds(id);
  await notifyProfiles(teacherIds, {
    type: "WORKSHOP_UPDATE",
    title_ar: "سؤال جديد داخل فيديو",
    title_sq: "Pyetje e re brenda videos",
    title_en: "New in-video question",
    body_ar: `أضيف سؤال جديد إلى «${video.title}»`,
    body_sq: `U shtua një pyetje e re në “${video.title}”`,
    body_en: `A new question was added to “${video.title}”`,
    href: `/workshops/${id}`,
    actor_id: auth.profile.id,
    event_key: `workshop-video-question:${question.id}`,
  }).catch(() => undefined);
  return NextResponse.json({ question }, { status: 201 });
}
