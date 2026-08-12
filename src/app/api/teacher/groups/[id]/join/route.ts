import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.teacherGroupMember.findFirst({
        where: { teacher_id: auth.teacher.id },
        select: { group_id: true },
      });
      if (membership) return { error: "already_in_group" as const, group_id: membership.group_id };

      const group = await tx.teacherGroup.findFirst({
        where: { id, school_id: auth.teacher.school_id },
        select: { id: true, max_members: true, _count: { select: { members: true } } },
      });
      if (!group) return { error: "not_found" as const };
      if (group._count.members >= group.max_members) {
        return { error: "group_full" as const, capacity: group.max_members };
      }

      const current = await tx.teacherGroupJoinRequest.findUnique({
        where: { teacher_id: auth.teacher.id },
        select: { id: true, group_id: true, status: true },
      });
      if (current?.status === "PENDING") {
        if (current.group_id === id) return { request_id: current.id, status: "PENDING" as const };
        return { error: "pending_other_group" as const, group_id: current.group_id };
      }

      const request = await tx.teacherGroupJoinRequest.upsert({
        where: { teacher_id: auth.teacher.id },
        update: {
          group_id: id,
          school_id: auth.teacher.school_id,
          status: "PENDING",
          requested_at: new Date(),
          reviewed_at: null,
          reviewed_by: null,
        },
        create: {
          group_id: id,
          teacher_id: auth.teacher.id,
          school_id: auth.teacher.school_id,
        },
        select: { id: true },
      });
      await tx.teacherGroup.update({ where: { id }, data: { updated_at: new Date() } });
      return { request_id: request.id, status: "PENDING" as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ("error" in result) {
      return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "request_changed_retry" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const removed = await prisma.teacherGroupJoinRequest.deleteMany({
    where: {
      group_id: id,
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
      status: "PENDING",
    },
  });
  if (!removed.count) return NextResponse.json({ error: "pending_request_not_found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
