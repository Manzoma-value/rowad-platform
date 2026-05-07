// api/student/quizzes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get student + class_id in one minimal query
  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: { id: true, class_id: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!student.class_id) return NextResponse.json({ quizzes: [], studentId: student.id });

  const quizzes = await prisma.quiz.findMany({
    where: { class_id: student.class_id },
    select: {
      id: true,
      name: true,
      created_at: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true, order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
        },
      },
      attempts: {
        where: { student_id: student.id },
        select: { id: true, score: true, total: true, submitted_at: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ quizzes, studentId: student.id });
}