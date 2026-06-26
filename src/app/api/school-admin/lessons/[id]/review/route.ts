// POST /api/school-admin/lessons/[id]/review — approve or reject a teacher's
// pending lesson. Body: { action: "approve" | "reject", notes?: string }
//
// APPROVED  → review_status=APPROVED, lesson visible to students.
// REJECTED  → review_status=REJECTED, reviewer_notes set; teacher edits and
//             re-submits via /api/teacher/lessons/[id]/submit (back to
//             PENDING_REVIEW). Notes stay visible until resubmit clears them.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { action?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const approve = body.action === "approve";
  const reject = body.action === "reject";
  if (!approve && !reject) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, review_status: true, is_legacy: true },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lesson.is_legacy) {
    return NextResponse.json({ error: "Legacy lesson cannot be reviewed" }, { status: 409 });
  }
  if (lesson.review_status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Lesson is not awaiting review", status: lesson.review_status },
      { status: 409 },
    );
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : null;
  const nextStatus = approve ? "APPROVED" : "REJECTED";

  await prisma.lesson.update({
    where: { id },
    data: {
      review_status: nextStatus,
      reviewer_id: auth.profile.id,
      reviewer_notes: notes,
      reviewed_at: new Date(),
      // Auto-publish on approve so students see it immediately.
      is_published: approve ? true : false,
    },
  });

  return NextResponse.json({ success: true, status: nextStatus });
}
