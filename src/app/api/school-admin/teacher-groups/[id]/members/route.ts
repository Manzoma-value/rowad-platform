// POST   /api/school-admin/teacher-groups/[id]/members — add teachers to group.
//        Body: { teacher_ids: string[] }
// DELETE /api/school-admin/teacher-groups/[id]/members?teacher_id=... — remove one.
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { teacher_ids?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const teacher_ids = Array.isArray(body.teacher_ids) ? body.teacher_ids.filter((s) => typeof s === "string") : [];
  if (teacher_ids.length === 0) return NextResponse.json({ error: "teacher_ids required" }, { status: 400 });

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true, max_members: true, _count: { select: { members: true } } },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Supervisors can participate in several groups; only duplicate membership
  // in this specific group is excluded.
  const valid = await prisma.teacher.findMany({
    where: {
      id: { in: teacher_ids },
      school_id: auth.school.id,
      onboarding_status: "ACTIVE",
      group_memberships: { none: { group_id: id } },
    },
    select: { id: true },
  });

  if (valid.length === 0) return NextResponse.json({ added: 0 });

  const available = Math.max(0, group.max_members - group._count.members);
  if (valid.length > available) {
    return NextResponse.json(
      { error: "Group capacity reached", capacity: group.max_members, available },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacherGroupMember.createMany({
      data: valid.map((t) => ({ group_id: id, teacher_id: t.id })),
      skipDuplicates: true,
    });
    await tx.teacherGroupJoinRequest.updateMany({
      where: { group_id: id, teacher_id: { in: valid.map((t) => t.id) }, status: "PENDING" },
      data: { status: "APPROVED", reviewed_by: auth.profile.id, reviewed_at: new Date() },
    });
    // bump updated_at on the group so admin list reorders correctly
    await tx.teacherGroup.update({ where: { id }, data: { updated_at: new Date() } });
  });
  return NextResponse.json({ added: valid.length, capacity: group.max_members, remaining: available - valid.length });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const teacher_id = new URL(req.url).searchParams.get("teacher_id");
  if (!teacher_id) return NextResponse.json({ error: "teacher_id required" }, { status: 400 });

  // tenant guard
  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.teacherGroupMember.deleteMany({ where: { group_id: id, teacher_id } }),
    prisma.teacherGroup.update({ where: { id }, data: { updated_at: new Date() } }),
    prisma.teacherGroup.updateMany({
      where: { id, leader_teacher_id: teacher_id },
      data: { leader_teacher_id: null },
    }),
  ]);
  return NextResponse.json({ success: true });
}
