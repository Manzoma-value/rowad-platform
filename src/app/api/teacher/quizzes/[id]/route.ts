// api/teacher/quizzes/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  // Verify quiz belongs to this teacher before deleting
  const teacher = await prisma.teacher.findUnique({
    where: { profile_id: user.id },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const quiz = await prisma.quiz.findFirst({
    where: { id, teacher_id: teacher.id },
    select: { id: true },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.quiz.delete({ where: { id } });
  return NextResponse.json({ success: true });
}