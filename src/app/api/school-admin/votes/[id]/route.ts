import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OptionInput = { value?: unknown; label?: unknown };
type QuestionInput = { prompt?: unknown; options?: unknown };

function slugifyValue(label: string, index: number) {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return base || `option-${index + 1}`;
}

function normalizeQuestions(raw: unknown): { error: string } | { questions: Array<{ position: number; prompt: string; options: Array<{ value: string; label: string }> }> } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "at_least_one_question" };
  const questions: Array<{ position: number; prompt: string; options: Array<{ value: string; label: string }> }> = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i] as QuestionInput;
    const prompt = typeof q?.prompt === "string" ? q.prompt.trim() : "";
    if (!prompt) return { error: "question_prompt_required" };
    const rawOptions = Array.isArray(q?.options) ? q.options : [];
    if (rawOptions.length < 2) return { error: "at_least_two_options" };
    const usedValues = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];
    rawOptions.forEach((option: OptionInput, oi: number) => {
      const label = typeof option?.label === "string" ? option.label.trim() : "";
      if (!label) return;
      let value = typeof option?.value === "string" && option.value.trim() ? option.value.trim() : slugifyValue(label, oi);
      while (usedValues.has(value)) value = `${value}-${oi}`;
      usedValues.add(value);
      options.push({ value, label });
    });
    if (options.length < 2) return { error: "at_least_two_options" };
    questions.push({ position: i, prompt, options });
  }
  return { questions };
}

async function loadVote(schoolId: string, voteId: string) {
  return prisma.vote.findFirst({
    where: { id: voteId, school_id: schoolId },
    include: {
      questions: { orderBy: { position: "asc" } },
      responses: {
        orderBy: { submitted_at: "desc" },
        include: { teacher: { select: { id: true, profile: { select: { full_name: true, email: true } } } } },
      },
      _count: { select: { responses: true } },
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const vote = await loadVote(auth.school.id, id);
  if (!vote) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const eligibleTeachers = await prisma.teacher.count({
    where: { school_id: auth.school.id, onboarding_status: "ACTIVE", profile: { is: { is_active: true } } },
  });

  return NextResponse.json({ vote, eligible_teachers: eligibleTeachers });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.vote.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, _count: { select: { responses: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null) as {
    status?: unknown; title?: unknown; description?: unknown; allow_notes?: unknown; questions?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (body.status !== "OPEN" && body.status !== "CLOSED") {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    data.status = body.status;
    data.closed_at = body.status === "CLOSED" ? new Date() : null;
  }

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
    data.title = title;
  }

  if (body.description !== undefined) {
    data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  }

  const locked = existing._count.responses > 0;

  if (body.allow_notes !== undefined) {
    if (locked) return NextResponse.json({ error: "locked" }, { status: 409 });
    data.allow_notes = body.allow_notes !== false;
  }

  let questionsUpdate: Awaited<ReturnType<typeof normalizeQuestions>> | null = null;
  if (body.questions !== undefined) {
    if (locked) return NextResponse.json({ error: "locked" }, { status: 409 });
    questionsUpdate = normalizeQuestions(body.questions);
    if ("error" in questionsUpdate) return NextResponse.json({ error: questionsUpdate.error }, { status: 400 });
  }

  const vote = await prisma.$transaction(async (tx) => {
    if (questionsUpdate && "questions" in questionsUpdate) {
      await tx.voteQuestion.deleteMany({ where: { vote_id: id } });
      await tx.voteQuestion.createMany({
        data: questionsUpdate.questions.map((q) => ({ vote_id: id, position: q.position, prompt: q.prompt, options: q.options })),
      });
    }
    if (Object.keys(data).length > 0) {
      await tx.vote.update({ where: { id }, data });
    }
    return loadVote(auth.school.id, id);
  });

  return NextResponse.json({ vote });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.vote.findFirst({ where: { id, school_id: auth.school.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.vote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
