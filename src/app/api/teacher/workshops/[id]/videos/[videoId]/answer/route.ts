// /api/teacher/workshops/[id]/videos/[videoId]/answer
//   POST — grade one in-video question and record it. First answer for a
//   given question sticks (idempotent replay-safe): resubmitting the same
//   question just returns the originally graded result.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { notifyProfiles, schoolAdminProfileIds } from "@/lib/notifications";
import { markWorkshopActivityAttendance } from "@/lib/workshop-attendance";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, videoId } = await context.params;
  const { teacher } = auth;

  const body = await req.json().catch(() => ({})) as { question_id?: string; answer?: string | string[] };
  const questionId = body.question_id;
  if (!questionId || (typeof body.answer !== "string" && !Array.isArray(body.answer))) {
    return NextResponse.json({ error: "question_id and answer required" }, { status: 400 });
  }

  const video = await prisma.workshopVideo.findFirst({
    where: {
      id: videoId,
      workshop_id: id,
      workshop: {
        school_id: teacher.school_id,
        OR: [
          { enrollments: { some: { teacher_id: teacher.id, status: "APPROVED" } } },
          { signed_up_teachers: { some: { id: teacher.id } } },
          { attendance: { some: { teacher_id: teacher.id } } },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      workshop: { select: { school_id: true, title: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const question = await prisma.workshopVideoQuestion.findFirst({
    where: { id: questionId, video_id: videoId },
    select: {
      id: true,
      type: true,
      text: true,
      correct_answer: true,
      answer_mode: true,
      correct_answers: true,
      options: { select: { text: true } },
    },
  });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isWritten = question.type === "TEXT";
  let persistedValue = "";
  let isCorrect = false;

  if (isWritten) {
    const written = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!written) return NextResponse.json({ error: "answer required" }, { status: 400 });
    persistedValue = written.slice(0, 4000);
  } else if (question.type === "TF") {
    const submitted = typeof body.answer === "string" ? body.answer.trim().toLowerCase() : "";
    if (submitted !== "true" && submitted !== "false") return NextResponse.json({ error: "invalid answer" }, { status: 400 });
    persistedValue = submitted;
    isCorrect = submitted === question.correct_answer.trim().toLowerCase();
  } else {
    const submitted = (Array.isArray(body.answer) ? body.answer : [body.answer])
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    const uniqueSubmitted = [...new Set(submitted.map((item) => item.toLocaleLowerCase()))];
    const optionByValue = new Map(question.options.map((option) => [option.text.toLocaleLowerCase(), option.text]));
    const selected = [...new Set(submitted.map((item) => optionByValue.get(item.toLocaleLowerCase())).filter((item): item is string => Boolean(item)))];
    const expectedCount = question.answer_mode === "MULTIPLE" ? 2 : 1;
    if (selected.length !== uniqueSubmitted.length || selected.length < expectedCount || (question.answer_mode !== "MULTIPLE" && selected.length !== 1)) {
      return NextResponse.json({ error: "invalid answer selection" }, { status: 400 });
    }
    persistedValue = question.answer_mode === "MULTIPLE" ? JSON.stringify(selected) : selected[0];
    const correctAnswers = question.correct_answers.length
      ? question.correct_answers
      : question.correct_answer.trim() ? [question.correct_answer.trim()] : [];
    const selectedSet = new Set(selected.map((item) => item.toLocaleLowerCase()));
    const correctSet = new Set(correctAnswers.map((item) => item.toLocaleLowerCase()));
    isCorrect = question.answer_mode === "NONE"
      || (selectedSet.size === correctSet.size && [...selectedSet].every((item) => correctSet.has(item)));
  }

  const attempt = await prisma.workshopVideoAttempt.upsert({
    where: { video_id_teacher_id: { video_id: videoId, teacher_id: teacher.id } },
    create: { video_id: videoId, teacher_id: teacher.id, score: 0, total: video._count.questions },
    update: {},
    select: { id: true },
  });

  const persistedAnswer = await prisma.workshopVideoAnswer.upsert({
    where: { attempt_id_question_id: { attempt_id: attempt.id, question_id: questionId } },
    create: {
      attempt_id: attempt.id,
      question_id: questionId,
      answer: persistedValue,
      is_correct: isCorrect,
      grading_status: isWritten ? "PENDING_REVIEW" : "AUTO_GRADED",
    },
    update: {},
    select: {
      id: true,
      question_id: true,
      answer: true,
      is_correct: true,
      grading_status: true,
      feedback: true,
    },
  });

  const answers = await prisma.workshopVideoAnswer.findMany({
    where: { attempt_id: attempt.id },
    select: {
      id: true,
      question_id: true,
      answer: true,
      is_correct: true,
      grading_status: true,
      feedback: true,
    },
  });
  const score = answers.filter((a) => a.is_correct).length;
  const total = video._count.questions;
  const updated = await prisma.workshopVideoAttempt.update({
    where: { id: attempt.id },
    data: {
      score,
      total,
      completed_at: answers.length >= total ? new Date() : null,
    },
    select: { score: true, total: true, completed_at: true },
  });
  const attendance = await markWorkshopActivityAttendance(id, teacher.id);

  const adminIds = await schoolAdminProfileIds(video.workshop.school_id);
  await notifyProfiles(adminIds, {
    type: "WORKSHOP_ANSWER",
    title_ar: "إجابة جديدة في ورشة",
    title_sq: "Përgjigje e re në trajnim",
    title_en: "New workshop answer",
    body_ar: `${auth.profile.full_name} أجاب عن سؤال في «${video.title}»`,
    body_sq: `${auth.profile.full_name} iu përgjigj një pyetjeje në “${video.title}”`,
    body_en: `${auth.profile.full_name} answered a question in “${video.title}”`,
    href: `/workshops/${id}`,
    actor_id: auth.profile.id,
    event_key: `workshop-video-answer:${persistedAnswer.id}`,
  }).catch(() => undefined);

  const persisted = answers.find((a) => a.question_id === questionId)!;
  return NextResponse.json({
    answer_id: persisted.id,
    is_correct: persisted.is_correct,
    submitted_answer: persisted.answer,
    grading_status: persisted.grading_status,
    feedback: persisted.feedback,
    attempt: updated,
    attendance,
  });
}
