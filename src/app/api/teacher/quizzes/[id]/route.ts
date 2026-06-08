// api/teacher/quizzes/[id]/route.ts
//
// GET — full quiz detail with questions, options, and per-student attempts.
//       Tenant-guarded: only the owning teacher can read.
// DELETE — only the owning teacher can delete.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, teacher_id: auth.teacher.id }, // tenant guard
    select: {
      id: true,
      name: true,
      created_at: true,
      class: { select: { id: true, name: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          text: true,
          correct_answer: true,
          order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
        },
      },
      attempts: {
        orderBy: { submitted_at: "desc" },
        select: {
          id: true,
          score: true,
          total: true,
          submitted_at: true,
          student: { select: { profile: { select: { full_name: true } } } },
        },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quiz);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.quiz.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
