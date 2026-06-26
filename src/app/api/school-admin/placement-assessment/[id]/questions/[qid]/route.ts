// api/school-admin/placement-assessment/[id]/questions/[qid]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ qid }, { text, correct_answer, options }] = await Promise.all([
    context.params,
    req.json(),
  ]);

  // ── Tenant guard ──────────────────────────────────────────────────────────
  // Confirm this question belongs to an assessment owned by THIS admin's
  // school before editing. Stops cross-school question tampering.
  const ownsQuestion = await prisma.assessmentQuestion.findFirst({
    where: { id: qid, assessment: { school_id: auth.school.id } },
    select: { id: true },
  });
  if (!ownsQuestion)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update question + delete old options in parallel
  await Promise.all([
    prisma.assessmentQuestion.update({
      where: { id: qid },
      data: {
        ...(text !== undefined && { text }),
        ...(correct_answer !== undefined && { correct_answer }),
      },
    }),
    ...(Array.isArray(options)
      ? [prisma.assessmentOption.deleteMany({ where: { question_id: qid } })]
      : []),
  ]);

  // Create new options after delete completes
  if (Array.isArray(options) && options.length > 0) {
    await prisma.assessmentOption.createMany({
      data: options.map((opt: { text: string }, i: number) => ({
        question_id: qid, text: opt.text, order: i + 1,
      })),
    });
  }

  const updated = await prisma.assessmentQuestion.findUnique({
    where: { id: qid },
    select: {
      id: true, type: true, text: true, correct_answer: true, order: true,
      options: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, order: true },
      },
    },
  });

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { qid } = await context.params;

  // ── Tenant guard ── confirm ownership before deleting.
  const ownsQuestion = await prisma.assessmentQuestion.findFirst({
    where: { id: qid, assessment: { school_id: auth.school.id } },
    select: { id: true },
  });
  if (!ownsQuestion)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.assessmentQuestion.delete({ where: { id: qid } });
  return NextResponse.json({ success: true });
}