// api/school-admin/roadmap/questions/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id }, body] = await Promise.all([context.params, req.json().catch(() => ({}))]);

  const question = await prisma.roadmapQuestion.findFirst({
    where: { id, module: { stage: { roadmap: { school_id: auth.school.id } } } },
    select: { id: true, type: true },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { text, correct_answer, options, pairs } = body;

  // Replace options atomically for MCQ
  if (question.type === "MCQ" && Array.isArray(options) && options.length >= 2) {
    await prisma.$transaction([
      prisma.roadmapQuestionOption.deleteMany({ where: { question_id: id } }),
      prisma.roadmapQuestionOption.createMany({
        data: (options as string[]).map((opt: string, i: number) => ({
          question_id: id,
          text: opt.trim(),
          order: i + 1,
        })),
      }),
    ]);
  }

  // Replace matching pairs atomically for MATCHING
  if (question.type === "MATCHING" && Array.isArray(pairs) && pairs.length >= 2) {
    await prisma.$transaction([
      prisma.matchingPair.deleteMany({ where: { question_id: id } }),
      prisma.matchingPair.createMany({
        data: (pairs as { left: string; right: string }[]).map((p, i) => ({
          question_id: id,
          left: p.left.trim(),
          right: p.right.trim(),
          order: i + 1,
        })),
      }),
    ]);
  }

  const updated = await prisma.roadmapQuestion.update({
    where: { id },
    data: {
      ...(text?.trim() && { text: text.trim() }),
      ...(question.type !== "MATCHING" && correct_answer?.trim() && {
        correct_answer: correct_answer.trim(),
      }),
    },
    select: {
      id: true, type: true, text: true, correct_answer: true, order: true,
      options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
      matching_pairs: { orderBy: { order: "asc" }, select: { id: true, left: true, right: true, order: true } },
    },
  });

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const question = await prisma.roadmapQuestion.findFirst({
    where: { id, module: { stage: { roadmap: { school_id: auth.school.id } } } },
    select: { id: true },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.roadmapQuestion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}