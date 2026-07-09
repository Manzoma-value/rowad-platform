// Body: { action: "approve" | "reject" | "waitlist", notes?: string }
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { action?: string; notes?: string; group_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const approve = body.action === "approve";
  const reject = body.action === "reject";
  const waitlist = body.action === "waitlist";
  if (!approve && !reject && !waitlist) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Optional group assignment alongside approval. Group IDs are validated
  // against this school + dedup'd; unknown IDs are silently dropped.
  const requestedGroupIds = approve && Array.isArray(body.group_ids)
    ? Array.from(new Set(body.group_ids.filter((s): s is string => typeof s === "string")))
    : [];

  const teacher = await prisma.teacher.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, onboarding_status: true, application: { select: { id: true } } },
  });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!teacher.application) {
    return NextResponse.json({ error: "No application to review" }, { status: 409 });
  }
  const nextStatus = approve ? "ACTIVE" : reject ? "REJECTED" : "WAITING_LIST";
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

    // On approve: attach the teacher to any pre-selected groups. We re-check
    // the IDs are real groups in THIS school to enforce tenant isolation.
    if (approve && requestedGroupIds.length > 0) {
      const groups = await tx.teacherGroup.findMany({
        where: { id: { in: requestedGroupIds }, school_id: auth.school.id },
        select: { id: true },
      });
      if (groups.length > 0) {
        await tx.teacherGroupMember.createMany({
          data: groups.map((g) => ({ group_id: g.id, teacher_id: teacher.id })),
          skipDuplicates: true,
        });
      }
    }
  }, { timeout: 30000, maxWait: 10000 });

  return NextResponse.json({ success: true, status: nextStatus });
}
