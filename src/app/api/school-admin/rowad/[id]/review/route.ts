// api/school-admin/rowad/[id]/review/route.ts — approve / reject a submission.
//
// Stage 1 review:
//   approve → teacher → STAGE2_PENDING (unlocks Stage 2)
//   reject  → teacher → STAGE1_PENDING (retry; previous attempt kept as history)
//
// Stage 2 review:
//   approve → teacher → AWAITING_CLASS (admin can now assign a class)
//   reject  → teacher → STAGE2_PENDING (retry)
//
// Rejection notes are surfaced back to the teacher on their next attempt.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, body] = await Promise.all([context.params, req.json().catch(() => ({}))]);
  const action = body?.action as "approve" | "reject" | undefined;
  const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const submission = await prisma.rowadSubmission.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, stage: true, status: true, teacher_id: true },
  });
  if (!submission)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (submission.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "هذه المحاولة ليست بانتظار المراجعة." },
      { status: 409 },
    );
  }

  const approve = action === "approve";

  // What state does the teacher land in after this decision?
  let nextTeacherStatus: "STAGE1_PENDING" | "STAGE2_PENDING" | "AWAITING_CLASS";
  if (submission.stage === "STAGE1") {
    nextTeacherStatus = approve ? "STAGE2_PENDING" : "STAGE1_PENDING";
  } else {
    // STAGE2
    nextTeacherStatus = approve ? "AWAITING_CLASS" : "STAGE2_PENDING";
  }

  await prisma.$transaction(async (tx) => {
    await tx.rowadSubmission.update({
      where: { id: submission.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        reviewer_id: auth.profile.id,
        reviewer_notes: notes,
        reviewed_at: new Date(),
      },
    });
    await tx.teacher.update({
      where: { id: submission.teacher_id },
      data: { onboarding_status: nextTeacherStatus },
    });
  });

  return NextResponse.json({ success: true });
}
