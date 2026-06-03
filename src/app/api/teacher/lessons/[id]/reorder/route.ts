// api/teacher/lessons/[id]/reorder/route.ts
//
// PATCH — reorder the questions OR the content blocks of a lesson.
//
// Body shape:
//   { kind: "questions" | "contents", ids: string[] }
//
// Writes the new order in a single transaction. We assign 1, 2, 3, ...
// (1-indexed) so the existing `orderBy: { order: "asc" }` in read paths
// keeps working.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: lessonId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as "questions" | "contents" | undefined;
  const ids  = body.ids  as string[] | undefined;

  if (kind !== "questions" && kind !== "contents") {
    return NextResponse.json({ error: "kind must be 'questions' or 'contents'" }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  // Verify the lesson belongs to this teacher.
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  // Verify every id in `ids` actually belongs to this lesson — prevents
  // someone slipping in a question/content from another lesson and getting
  // it renumbered.
  if (kind === "questions") {
    const owned = await prisma.lessonQuestion.findMany({
      where: { lesson_id: lessonId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json({ error: "Some ids do not belong to this lesson" }, { status: 400 });
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.lessonQuestion.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  } else {
    const owned = await prisma.lessonContent.findMany({
      where: { lesson_id: lessonId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json({ error: "Some ids do not belong to this lesson" }, { status: 400 });
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.lessonContent.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  }

  return NextResponse.json({ success: true });
}
