// POST /api/teacher/lessons/[id]/submit — flip a DRAFT (or REJECTED) lesson
// to PENDING_REVIEW so the school admin can review it. Clears any prior
// reviewer fields so resubmissions surface as fresh.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const lesson = await prisma.lesson.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true, review_status: true, is_legacy: true, module_id: true },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lesson.is_legacy) {
    return NextResponse.json({ error: "Legacy lessons cannot be submitted" }, { status: 409 });
  }
  if (!lesson.module_id) {
    return NextResponse.json({ error: "Lesson is not tied to a concept" }, { status: 409 });
  }
  if (lesson.review_status === "PENDING_REVIEW") {
    return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
  }
  if (lesson.review_status === "APPROVED") {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  await prisma.lesson.update({
    where: { id },
    data: {
      review_status: "PENDING_REVIEW",
      submitted_at: new Date(),
      // Wipe prior decision so admins see this as a fresh submission
      reviewer_id: null,
      reviewed_at: null,
      // Keep reviewer_notes — teacher just acted on them
    },
  });

  return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
}
