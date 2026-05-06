// api/owner/intake-assessment/[id]/questions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true }, // ← only fetch what's needed
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const profile = await requireOwner();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id: assessmentId }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const { type, text, correct_answer, options } = body;

  if (!type || !text)
    return NextResponse.json({ error: "type and text are required" }, { status: 400 });

  const maxOrderQuestion = await prisma.assessmentQuestion.findFirst({
    where: { assessment_id: assessmentId },
    orderBy: { order: "desc" },
    select: { order: true }, // ← only fetch order, not full row
  });
  const nextOrder = (maxOrderQuestion?.order ?? 0) + 1;
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