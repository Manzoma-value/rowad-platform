import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: { id: true, school_id: true },
  });
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
  if (!student.school_id) {
    return NextResponse.json({ roadmap: null });
  }

  const roadmap = await prisma.roadmap.findUnique({
    where: { school_id: student.school_id },
    select: {
      id: true,
      title: true,
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              // The map only needs content kinds/counts. Full lesson and
              // question data is loaded for one module when it is opened.
              contents: { select: { type: true } },
              _count: { select: { contents: true, questions: true } },
              attempts: {
                where: { student_id: student.id },
                select: { score: true, total: true, passed: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!roadmap) {
    return NextResponse.json({ roadmap: null });
  }

  return NextResponse.json({
    roadmap: {
      ...roadmap,
      stages: roadmap.stages.map((stage) => ({
        ...stage,
        modules: stage.modules.map(({ attempts, _count, contents, ...module }) => ({
          ...module,
          content_count: _count.contents,
          question_count: _count.questions,
          content_types: [...new Set(contents.map((content) => content.type))],
          attempt: attempts[0] ?? null,
        })),
      })),
    },
  });
}
