import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const group = await prisma.class.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, teacher_id: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (!group.teacher_id) return NextResponse.json({ error: "Assign a supervisor first" }, { status: 409 });

  const invite = await prisma.classInvite.upsert({
    where: { class_id: id },
    update: {
      token: randomBytes(24).toString("base64url"),
      teacher_id: group.teacher_id,
      created_by: auth.profile.id,
      is_active: true,
      expires_at: null,
    },
    create: {
      token: randomBytes(24).toString("base64url"),
      class_id: id,
      school_id: auth.school.id,
      teacher_id: group.teacher_id,
      created_by: auth.profile.id,
    },
    select: { token: true, is_active: true, use_count: true, updated_at: true },
  });
  return NextResponse.json({ invite });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const result = await prisma.classInvite.updateMany({
    where: { class_id: id, school_id: auth.school.id },
    data: { is_active: false },
  });
  if (!result.count) return NextResponse.json({ error: "Group link not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
