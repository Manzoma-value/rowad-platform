import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ownedClass(id: string, teacherId: string, schoolId: string) {
  return prisma.class.findFirst({
    where: { id, teacher_id: teacherId, school_id: schoolId },
    select: {
      id: true,
      name: true,
      invite: { select: { token: true, is_active: true, use_count: true, updated_at: true } },
    },
  });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const group = await ownedClass(id, auth.teacher.id, auth.teacher.school_id);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  return NextResponse.json({ group: { id: group.id, name: group.name }, invite: group.invite });
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const group = await ownedClass(id, auth.teacher.id, auth.teacher.school_id);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const invite = await prisma.classInvite.upsert({
    where: { class_id: id },
    update: {
      token: randomBytes(24).toString("base64url"),
      teacher_id: auth.teacher.id,
      created_by: auth.profile.id,
      is_active: true,
      expires_at: null,
    },
    create: {
      token: randomBytes(24).toString("base64url"),
      class_id: id,
      school_id: auth.teacher.school_id,
      teacher_id: auth.teacher.id,
      created_by: auth.profile.id,
    },
    select: { token: true, is_active: true, use_count: true, updated_at: true },
  });

  return NextResponse.json({ invite });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const group = await ownedClass(id, auth.teacher.id, auth.teacher.school_id);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  await prisma.classInvite.updateMany({
    where: { class_id: id, teacher_id: auth.teacher.id },
    data: { is_active: false },
  });
  return NextResponse.json({ success: true });
}
