// /api/school-admin/workshops/[id]/videos/[videoId]/questions — POST create
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { cleanQuestionOptions, MAX_QUESTIONS_PER_VIDEO } from "@/lib/workshop-videos";

export const dynamic = "force-dynamic";

const questionSelect = {
  id: true,
  type: true,
  text: true,
  correct_answer: true,
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
    select: { id: true, _count: { select: { questions: true } } },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video._count.questions >= MAX_QUESTIONS_PER_VIDEO) {
    return NextResponse.json({ error: "Too many questions on this video" }, { status: 400 });
  }

  let body: {
    type?: "MCQ" | "TF";
    text?: string;
    correct_answer?: string;
    timestamp_seconds?: number;
    options?: string[];
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const type = body.type === "TF" ? "TF" : body.type === "MCQ" ? "MCQ" : null;
  const text = body.text?.trim();
  const timestampSeconds = Number(body.timestamp_seconds);
  if (!type || !text || !Number.isFinite(timestampSeconds) || timestampSeconds < 0) {
    return NextResponse.json({ error: "type, text and a valid timestamp_seconds are required" }, { status: 400 });
  }

  let correctAnswer = "";
  let options: string[] = [];
  if (type === "TF") {
    if (body.correct_answer !== "true" && body.correct_answer !== "false") {
      return NextResponse.json({ error: "correct_answer must be true or false" }, { status: 400 });
    }
    correctAnswer = body.correct_answer;
  } else {
    options = cleanQuestionOptions(body.options);
    if (options.length < 2) return NextResponse.json({ error: "at least 2 options required" }, { status: 400 });
    correctAnswer = body.correct_answer?.trim() ?? "";
    if (!correctAnswer || !options.includes(correctAnswer)) {
      return NextResponse.json({ error: "correct_answer must match one of the options" }, { status: 400 });
    }
  }

  const order = video._count.questions;
  const question = await prisma.workshopVideoQuestion.create({
    data: {
      video_id: videoId,
      type,
      text: text.slice(0, 500),
      correct_answer: correctAnswer,
      timestamp_seconds: Math.round(timestampSeconds),
      order,
      options: options.length ? { create: options.map((text, index) => ({ text, order: index })) } : undefined,
    },
    select: questionSelect,
  });
  return NextResponse.json({ question }, { status: 201 });
}
