import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const quiz = await prisma.workshopQuiz.findFirst({ where: { requirement: { workshop_id: id, workshop: { school_id: auth.school.id }, type: "QUIZ" } }, select: { id: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { action?: "settings" | "question" | "delete"; title?: string; description?: string | null; passing_score?: number; question_id?: string; type?: "MCQ" | "TF" | "TEXT"; text?: string; correct_answer?: string | null; options?: string[] } | null;
  if (body?.action === "settings") {
    const updated = await prisma.workshopQuiz.update({ where: { id: quiz.id }, data: { ...(body.title !== undefined ? { title: body.title.trim().slice(0, 180) } : {}), ...(body.description !== undefined ? { description: body.description?.trim().slice(0, 1000) || null } : {}), ...(body.passing_score !== undefined ? { passing_score: Math.max(0, Math.min(100, Math.round(Number(body.passing_score) || 0))) } : {}) } });
    return NextResponse.json({ quiz: updated });
  }
  if (body?.action === "delete") {
    if (!body.question_id) return NextResponse.json({ error: "question_id required" }, { status: 400 });
    await prisma.workshopQuizQuestion.deleteMany({ where: { id: body.question_id, quiz_id: quiz.id } });
    return NextResponse.json({ success: true });
  }
  if (!body?.type || !body.text?.trim()) return NextResponse.json({ error: "question type and text required" }, { status: 400 });
  const type = body.type;
  const options = type === "MCQ" ? (body.options ?? []).map((value) => value.trim().slice(0, 300)).filter(Boolean).slice(0, 6) : [];
  if (type === "MCQ" && options.length < 2) return NextResponse.json({ error: "MCQ needs at least two options" }, { status: 400 });
  const correct = type === "TEXT" ? null : String(body.correct_answer ?? "").trim();
  if (!correct || (type === "MCQ" && !options.includes(correct)) || (type === "TF" && !["true", "false"].includes(correct.toLowerCase()))) return NextResponse.json({ error: "valid correct answer required" }, { status: 400 });
  const order = await prisma.workshopQuizQuestion.count({ where: { quiz_id: quiz.id } });
  const question = await prisma.workshopQuizQuestion.create({ data: { quiz_id: quiz.id, type, text: body.text.trim().slice(0, 1000), correct_answer: correct.toLowerCase() === "true" || correct.toLowerCase() === "false" ? correct.toLowerCase() : correct, order, options: { create: options.map((text, index) => ({ text, order: index })) } }, include: { options: { orderBy: { order: "asc" } } } });
  return NextResponse.json({ question }, { status: 201 });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const quiz = await prisma.workshopQuiz.findFirst({ where: { requirement: { workshop_id: id, workshop: { school_id: auth.school.id }, type: "QUIZ" } }, include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } } });
  return NextResponse.json({ quiz });
}
