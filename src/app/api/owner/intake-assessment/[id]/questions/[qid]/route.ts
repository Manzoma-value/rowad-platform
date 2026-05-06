import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string; qid: string }> }
) {
  const profile = await requireOwner();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { qid } = await context.params;
  const { text, correct_answer, options } = await req.json();

  // Run question update + options delete in parallel
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
        question_id: qid,
        text: opt.text,
        order: i + 1,
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
  const profile = await requireOwner();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { qid } = await context.params;
  await prisma.assessmentQuestion.delete({ where: { id: qid } });
  return NextResponse.json({ success: true });
}