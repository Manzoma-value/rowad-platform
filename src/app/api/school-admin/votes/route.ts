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

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const votes = await prisma.vote.findMany({
    where: { school_id: auth.school.id },
    orderBy: { created_at: "desc" },
    include: {
      questions: { orderBy: { position: "asc" } },
      _count: { select: { responses: true } },
    },
  });

  const eligibleTeachers = await prisma.teacher.count({
    where: { school_id: auth.school.id, onboarding_status: "ACTIVE", profile: { is: { is_active: true } } },
  });

  return NextResponse.json({ votes, eligible_teachers: eligibleTeachers });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null) as { title?: unknown; description?: unknown; allow_notes?: unknown; questions?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });

  const normalized = normalizeQuestions(body?.questions);
  if ("error" in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });

  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const allowNotes = body?.allow_notes !== false;

  const vote = await prisma.vote.create({
    data: {
      school_id: auth.school.id,
      title,
      description: description || null,
      allow_notes: allowNotes,
      status: "OPEN",
      questions: {
        create: normalized.questions.map((q) => ({ position: q.position, prompt: q.prompt, options: q.options })),
      },
    },
    include: { questions: { orderBy: { position: "asc" } }, _count: { select: { responses: true } } },
  });

  return NextResponse.json({ vote }, { status: 201 });
}
