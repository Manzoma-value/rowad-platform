// api/school-admin/rowad/[id]/review/route.ts — approve/reject a Stage 1 submission.
// Approve → unlocks Stage 2. Reject → teacher resubmits Stage 1.
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

  // Only Stage 1 has an explicit approve/reject gate.
  if (submission.stage !== "STAGE1") {
    return NextResponse.json(
      { error: "تتم مراجعة المرحلة الأولى فقط هنا. المرحلة الثانية تُفتح بتعيين المعلّم إلى فصل." },
      { status: 409 },
    );
  }
  if (submission.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "هذه المرحلة ليست بانتظار المراجعة." },
      { status: 409 },
    );
  }

  const approve = action === "approve";

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
      data: { onboarding_status: approve ? "STAGE2_PENDING" : "STAGE1_PENDING" },
    });
  });

  return NextResponse.json({ success: true });
}
