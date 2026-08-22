// /api/school-admin/workshops/videos/questions/[id] — item-level PUT/DELETE
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { cleanCorrectAnswers, cleanQuestionOptions, type WorkshopVideoAnswerMode } from "@/lib/workshop-videos";

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

async function questionForAdmin(id: string, schoolId: string) {
  return prisma.workshopVideoQuestion.findFirst({
    where: { id, video: { workshop: { school_id: schoolId } } },
    select: { id: true, type: true, video: { select: { duration_seconds: true } } },
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const existing = await questionForAdmin(id, auth.school.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    text?: string;
    correct_answer?: string;
    answer_mode?: WorkshopVideoAnswerMode;
    correct_answers?: string[];
    timestamp_seconds?: number;
    options?: string[];
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  if (body.text !== undefined) {
    const text = body.text.trim();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    data.text = text.slice(0, 500);
  }
  if (body.timestamp_seconds !== undefined) {
    const ts = Number(body.timestamp_seconds);
    if (!Number.isFinite(ts) || ts < 0) return NextResponse.json({ error: "invalid timestamp_seconds" }, { status: 400 });
    const duration = existing.video.duration_seconds;
    if (duration && ts > duration) {
      return NextResponse.json({ error: "timestamp is past the end of the video" }, { status: 400 });
    }
    data.timestamp_seconds = Math.round(ts);
  }

  if (existing.type === "TEXT") {
    data.correct_answer = "";
    data.answer_mode = "SINGLE";
    data.correct_answers = [];
  } else if (existing.type === "TF") {
    if (body.correct_answer !== undefined) {
      if (body.correct_answer !== "true" && body.correct_answer !== "false") {
        return NextResponse.json({ error: "correct_answer must be true or false" }, { status: 400 });
      }
      data.correct_answer = body.correct_answer;
      data.answer_mode = "SINGLE";
      data.correct_answers = [];
    }
  } else if (body.options !== undefined || body.correct_answer !== undefined || body.correct_answers !== undefined || body.answer_mode !== undefined) {
    const options = cleanQuestionOptions(body.options);
    if (options.length < 2) return NextResponse.json({ error: "at least 2 options required" }, { status: 400 });
    const answerMode: WorkshopVideoAnswerMode = body.answer_mode === "MULTIPLE" || body.answer_mode === "NONE" ? body.answer_mode : "SINGLE";
    let correctAnswers = cleanCorrectAnswers(body.correct_answers ?? (body.correct_answer ? [body.correct_answer] : []), options);
    if (answerMode === "SINGLE" && correctAnswers.length !== 1) return NextResponse.json({ error: "choose exactly one correct answer" }, { status: 400 });
    if (answerMode === "MULTIPLE" && correctAnswers.length < 2) return NextResponse.json({ error: "choose at least two correct answers" }, { status: 400 });
    if (answerMode === "NONE") correctAnswers = [];
    data.correct_answer = correctAnswers[0] ?? "";
    data.answer_mode = answerMode;
    data.correct_answers = correctAnswers;
    data.options = { deleteMany: {}, create: options.map((text, index) => ({ text, order: index })) };
  }

  const question = await prisma.workshopVideoQuestion.update({
    where: { id },
    data,
    select: questionSelect,
  });
  return NextResponse.json({ question });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const existing = await questionForAdmin(id, auth.school.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workshopVideoQuestion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
