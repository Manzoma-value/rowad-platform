// POST /api/school-admin/quizzes/[id]/review — same pipeline as lessons.
// Body: { action: "approve" | "reject", notes?: string }
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

  const quiz = await prisma.quiz.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, review_status: true, is_legacy: true },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quiz.is_legacy) {
    return NextResponse.json({ error: "Legacy quiz cannot be reviewed" }, { status: 409 });
  }
  if (quiz.review_status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Quiz is not awaiting review", status: quiz.review_status },
      { status: 409 },
    );
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : null;
  const nextStatus = approve ? "APPROVED" : "REJECTED";

  await prisma.quiz.update({
    where: { id },
    data: {
      review_status: nextStatus,
      reviewer_id: auth.profile.id,
      reviewer_notes: notes,
      reviewed_at: new Date(),
    },
  });

  return NextResponse.json({ success: true, status: nextStatus });
}
