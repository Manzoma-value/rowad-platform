// api/owner/intake-assessment/[id]/questions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireOwner } from "@/lib/owner-auth";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const profile = await requireOwner();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: assessmentId } = await context.params;
  const body = await req.json();
  const { type, text, correct_answer, options } = body;

  if (!type || !text) {
    return NextResponse.json({ error: "type and text are required" }, { status: 400 });
  }

  const maxOrderQuestion = await prisma.assessmentQuestion.findFirst({
    where: { assessment_id: assessmentId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (maxOrderQuestion?.order ?? 0) + 1;

  const hasOptions = Array.isArray(options) && options.length > 0;

  const question = await prisma.assessmentQuestion.create({
    data: {
      assessment_id: assessmentId,
      type,
      text,
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
    include: {
      options: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
