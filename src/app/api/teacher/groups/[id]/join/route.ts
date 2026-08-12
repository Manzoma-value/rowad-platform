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
    const membership = await prisma.$transaction(async (tx) => {
      const existing = await tx.teacherGroupMember.findFirst({
        where: { teacher_id: auth.teacher.id },
        select: { group_id: true },
      });
      if (existing) return { error: "already_in_group" as const, group_id: existing.group_id };

      const group = await tx.teacherGroup.findFirst({
        where: { id, school_id: auth.teacher.school_id },
        select: { id: true, max_members: true, _count: { select: { members: true } } },
      });
      if (!group) return { error: "not_found" as const };
      if (group._count.members >= group.max_members) {
        return { error: "group_full" as const, capacity: group.max_members };
      }

      await tx.teacherGroupMember.create({
        data: { group_id: group.id, teacher_id: auth.teacher.id },
      });
      await tx.teacherGroup.update({ where: { id: group.id }, data: { updated_at: new Date() } });
      return { group_id: group.id, joined: true as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ("error" in membership) {
      const status = membership.error === "not_found" ? 404 : 409;
      return NextResponse.json(membership, { status });
    }
    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "seat_changed_retry" }, { status: 409 });
    }
    throw error;
  }
}
