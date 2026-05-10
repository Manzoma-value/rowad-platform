// api/school-admin/roadmap/modules/[id]/questions/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
const VALID_TYPES: QuestionType[] = ["MCQ", "TF", "WRITTEN", "MATCHING"];

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id: moduleId }, body] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
  ]);

  const { type, text, correct_answer, options, pairs } = body;

  // Validate
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  if (!text?.trim())
    return NextResponse.json({ error: "text required" }, { status: 400 });
  if (type === "MCQ" && (!Array.isArray(options) || options.filter((o: string) => o?.trim()).length < 2))
    return NextResponse.json({ error: "MCQ needs at least 2 options" }, { status: 400 });
  if (type === "TF" && !["true", "false"].includes(correct_answer))
    return NextResponse.json({ error: "TF correct_answer must be true or false" }, { status: 400 });
  if (type === "MATCHING" && (!Array.isArray(pairs) || pairs.length < 2))
    return NextResponse.json({ error: "MATCHING needs at least 2 pairs" }, { status: 400 });

  // Verify module belongs to this school
  const mod = await prisma.roadmapModule.findFirst({
    where: { id: moduleId, stage: { roadmap: { school_id: auth.school.id } } },
    select: { id: true },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const last = await prisma.roadmapQuestion.findFirst({
    where: { module_id: moduleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const question = await prisma.roadmapQuestion.create({
    data: {
      module_id: moduleId,
      type,
      text: text.trim(),
      correct_answer: type === "MATCHING" ? null : (correct_answer?.trim() || null),
      order: (last?.order ?? 0) + 1,
      ...(type === "MCQ" && {
        options: {
          create: (options as string[])
            .filter((o: string) => o?.trim())
            .map((opt: string, i: number) => ({ text: opt.trim(), order: i + 1 })),
        },
      }),
      ...(type === "MATCHING" && {
        matching_pairs: {
          create: (pairs as { left: string; right: string }[]).map((p, i) => ({
            left: p.left.trim(),
            right: p.right.trim(),
            order: i + 1,
          })),
        },
      }),
    },
    select: {
      id: true, type: true, text: true, correct_answer: true, order: true,
      options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
      matching_pairs: { orderBy: { order: "asc" }, select: { id: true, left: true, right: true, order: true } },
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}