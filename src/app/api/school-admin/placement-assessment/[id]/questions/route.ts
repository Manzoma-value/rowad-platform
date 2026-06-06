// api/school-admin/placement-assessment/[id]/questions/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id: assessmentId }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const { type, text, correct_answer, options } = body;
  if (!type || !text)
    return NextResponse.json({ error: "type and text required" }, { status: 400 });

  // ── Tenant guard ──────────────────────────────────────────────────────────
  // Confirm the target assessment belongs to THIS admin's school before we
  // attach a question to it. Without this, an admin could inject questions
  // into another school's assessment by guessing the assessment id.
  const ownsAssessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, school_id: auth.school.id },
    select: { id: true },
  });
  if (!ownsAssessment)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxQ = await prisma.assessmentQuestion.findFirst({
    where: { assessment_id: assessmentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (maxQ?.order ?? 0) + 1;
  const hasOptions = Array.isArray(options) && options.length > 0;

  const question = await prisma.assessmentQuestion.create({
    data: {
      assessment_id: assessmentId,
      type, text,
      correct_answer: correct_answer || null,
      order: nextOrder,
      ...(hasOptions ? {
        options: {
          create: options.map((opt: { text: string } | string, i: number) => ({
            text: typeof opt === "string" ? opt : opt.text,
            order: i + 1,
          })),
        },
      } : {}),
    },
    select: {
      id: true, type: true, text: true, correct_answer: true, order: true,
      options: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, order: true },
      },
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}