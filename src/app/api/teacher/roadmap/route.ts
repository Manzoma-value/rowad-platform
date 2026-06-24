// GET /api/teacher/roadmap — full read-only roadmap tree for this school
// (stages → modules), with each module enriched with this teacher's own
// lessons + quizzes for that concept. Modules also expose counts of admin
// content + admin questions so the teacher sees how much is in there.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roadmap = await prisma.roadmap.findUnique({
    where: { school_id: auth.teacher.school_id },
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
              _count: { select: { contents: true, questions: true } },
              // This teacher's lessons + quizzes for this concept (any status)
              lessons: {
                where: { teacher_id: auth.teacher.id },
                orderBy: { created_at: "desc" },
                select: {
                  id: true,
                  title: true,
                  review_status: true,
                  is_legacy: true,
                  class: { select: { id: true, name: true } },
                  _count: { select: { contents: true, questions: true, attempts: true } },
                },
              },
              quizzes: {
                where: { teacher_id: auth.teacher.id },
                orderBy: { created_at: "desc" },
                select: {
                  id: true,
                  name: true,
                  review_status: true,
                  is_legacy: true,
                  class: { select: { id: true, name: true } },
                  _count: { select: { questions: true, attempts: true } },
                },
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

  return NextResponse.json({ roadmap });
}
