// api/teacher/lessons/route.ts
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

// GET /api/teacher/lessons — list this teacher's lessons (draft + published)
export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lessons = await prisma.lesson.findMany({
    where: { teacher_id: auth.teacher.id },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      is_published: true,
      is_graded: true,
      is_legacy: true,
      review_status: true,
      reviewer_notes: true,
      submitted_at: true,
      reviewed_at: true,
      module_id: true,
      module: {
        select: {
          id: true,
          title: true,
          stage: { select: { id: true, title: true, order: true } },
          order: true,
        },
      },
      order: true,
      created_at: true,
      updated_at: true,
      class: { select: { id: true, name: true } },
      linked_quiz: { select: { id: true, name: true } },
      _count: { select: { contents: true, questions: true, attempts: true } },
    },
  });

  // teacher's classes for the create dropdown
  const classes = await prisma.class.findMany({
    where: { teacher_id: auth.teacher.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ lessons, classes });
}

// POST /api/teacher/lessons — create lesson (title + classId required)
export async function POST(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, classId, description, moduleId } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!classId) {
    return NextResponse.json({ error: "classId required" }, { status: 400 });
  }
  if (!moduleId) {
    return NextResponse.json(
      { error: "moduleId required — lessons must be tied to a concept" },
      { status: 400 },
    );
  }

  // Verify the class belongs to this teacher
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Class not found or not yours" }, { status: 404 });
  }

  // Verify the module belongs to this school's roadmap
  const mod = await prisma.roadmapModule.findFirst({
    where: { id: moduleId, stage: { roadmap: { school_id: auth.teacher.school_id } } },
    select: { id: true },
  });
  if (!mod) {
    return NextResponse.json({ error: "Concept not found in this school's roadmap" }, { status: 404 });
  }

  const last = await prisma.lesson.findFirst({
    where: { teacher_id: auth.teacher.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const lesson = await prisma.lesson.create({
    data: {
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
      class_id: classId,
      module_id: moduleId,
      title: title.trim(),
      description: description?.trim() || null,
      is_published: false,
      is_graded: true,
      review_status: "DRAFT",
      order: (last?.order ?? 0) + 1,
    },
    select: {
      id: true, title: true, is_published: true, is_graded: true,
      review_status: true, module_id: true,
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
