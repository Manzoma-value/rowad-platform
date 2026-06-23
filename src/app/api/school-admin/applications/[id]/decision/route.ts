// api/school-admin/applications/[id]/decision — approve or reject.
// Body: { action: "approve" | "reject", notes?: string }
// Stamps reviewer/notes on the application and flips the teacher's
// onboarding_status to ACTIVE or REJECTED.
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
  const { id } = await context.params;

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const approve = body.action === "approve";
  const reject = body.action === "reject";
  if (!approve && !reject) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, onboarding_status: true, application: { select: { id: true } } },
  });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!teacher.application) {
    return NextResponse.json({ error: "No application to review" }, { status: 409 });
  }
  if (teacher.onboarding_status === "ACTIVE" && approve) {
    return NextResponse.json({ success: true, status: "ACTIVE" });
  }

  const nextStatus = approve ? "ACTIVE" : "REJECTED";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : null;

  await prisma.$transaction(async (tx) => {
    await tx.teacherApplication.update({
      where: { id: teacher.application!.id },
      data: {
        reviewer_id: auth.profile.id,
        reviewer_notes: notes,
        reviewed_at: new Date(),
      },
    });
    await tx.teacher.update({
      where: { id: teacher.id },
      data: { onboarding_status: nextStatus },
    });
  }, { timeout: 30000, maxWait: 10000 });

  return NextResponse.json({ success: true, status: nextStatus });
}
