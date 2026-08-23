import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VOTE_ELIGIBLE_STATUSES = new Set(["PENDING_APPLICATION", "ACTIVE"]);
const MAX_NOTES_LENGTH = 1000;

type AnswerInput = { question_id?: unknown; value?: unknown };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!VOTE_ELIGIBLE_STATUSES.has(auth.teacher.onboarding_status)) {
    return NextResponse.json({ error: "vote_not_available" }, { status: 403 });
  }
  const { id } = await params;

  const vote = await prisma.vote.findFirst({
    where: { id, school_id: auth.teacher.school_id, status: "OPEN" },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!vote) return NextResponse.json({ error: "vote_not_available" }, { status: 404 });

  const body = await req.json().catch(() => null) as { answers?: unknown; notes?: unknown } | null;
  const rawAnswers = Array.isArray(body?.answers) ? (body!.answers as AnswerInput[]) : [];
  const answersByQuestion = new Map(rawAnswers.map((a) => [typeof a?.question_id === "string" ? a.question_id : "", typeof a?.value === "string" ? a.value : ""]));

  const answers: Array<{ question_id: string; value: string }> = [];
  for (const question of vote.questions) {
    const value = answersByQuestion.get(question.id) ?? "";
    const options = question.options as Array<{ value: string }>;
    if (!value || !options.some((o) => o.value === value)) {
      return NextResponse.json({ error: "incomplete_answers" }, { status: 400 });
    }
    answers.push({ question_id: question.id, value });
  }

  const notesRaw = typeof body?.notes === "string" ? body.notes.trim() : "";
  if (notesRaw.length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: "notes_too_long" }, { status: 400 });
  }

  try {
    const response = await prisma.voteResponse.create({
      data: {
        vote_id: vote.id,
        teacher_id: auth.teacher.id,
        answers,
        notes: vote.allow_notes && notesRaw ? notesRaw : null,
      },
      select: { submitted_at: true },
    });
    return NextResponse.json({ completed: true, submitted_at: response.submitted_at }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ completed: true }, { status: 200 });
    }
    throw error;
  }
}
