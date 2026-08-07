import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const answers = await prisma.workshopQuizAnswer.findMany({ where: { grading_status: "PENDING_REVIEW", attempt: { quiz: { requirement: { workshop_id: id, workshop: { school_id: auth.school.id } } } } }, orderBy: { created_at: "asc" }, take: 200, select: { id: true, answer: true, question: { select: { text: true } }, attempt: { select: { teacher: { select: { profile: { select: { full_name: true } } } } } } } });
  return NextResponse.json({ answers: answers.map((answer) => ({ id: answer.id, answer: answer.answer, question: answer.question.text, teacher: answer.attempt.teacher.profile.full_name })) });
}
