// GET /api/teacher/modules/[id] — admin-authored content + questions for the
// concept (read-only), plus this teacher's lessons + quizzes for it.
// Also returns the teacher's classes so the UI can pick one when creating.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const mod = await prisma.roadmapModule.findFirst({
    where: { id, stage: { roadmap: { school_id: auth.teacher.school_id } } },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      stage: {
        select: {
          id: true,
          title: true,
          order: true,
          roadmap: { select: { title: true } },
        },
      },
      main_trait: {
        select: { id: true, name: true, definition: true, maqsad: true },
      },
      contents: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          body: true,
          image_url: true,
          alt_text: true,
          video_url: true,
          video_title: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          text: true,
          order: true,
          options: { orderBy: { order: "asc" }, select: { id: true, text: true } },
          matching_pairs: { orderBy: { order: "asc" }, select: { id: true, left: true, right: true } },
        },
      },
      lessons: {
        where: { teacher_id: auth.teacher.id },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          review_status: true,
          reviewer_notes: true,
          is_legacy: true,
          submitted_at: true,
          reviewed_at: true,
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
          reviewer_notes: true,
          is_legacy: true,
          submitted_at: true,
          reviewed_at: true,
          class: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      },
    },
  });

  if (!mod) return NextResponse.json({ error: "Concept not found" }, { status: 404 });

  const classes = await prisma.class.findMany({
    where: { teacher_id: auth.teacher.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ module: mod, classes });
}
