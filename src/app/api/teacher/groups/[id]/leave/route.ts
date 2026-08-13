import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  let body: { reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 10) {
    return NextResponse.json({ error: "reason_too_short" }, { status: 400 });
  }
  if (reason.length > 1000) {
    return NextResponse.json({ error: "reason_too_long" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.teacherGroup.findFirst({
      where: { id, school_id: auth.teacher.school_id },
      select: {
        id: true,
        name: true,
        leader_teacher_id: true,
        members: {
          where: { teacher_id: auth.teacher.id },
          select: { teacher_id: true },
          take: 1,
        },
      },
    });

    if (!group) return { error: "not_found" as const };
    if (group.members.length === 0) return { error: "not_member" as const };

    await tx.teacherGroupMember.delete({
      where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    });
    await tx.teacherGroupLeaveEvent.create({
      data: {
        group_id: id,
        teacher_id: auth.teacher.id,
        school_id: auth.teacher.school_id,
        reason,
      },
    });
    if (group.leader_teacher_id === auth.teacher.id) {
      await tx.teacherGroup.update({
        where: { id },
        data: { leader_teacher_id: null, updated_at: new Date() },
      });
    } else {
      await tx.teacherGroup.update({ where: { id }, data: { updated_at: new Date() } });
    }

    return { success: true as const, group: { id: group.id, name: group.name } };
  });

  if ("error" in result) {
    return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  }
  return NextResponse.json(result);
}
