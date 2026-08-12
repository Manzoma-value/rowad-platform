// api/school-admin/classes/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";
import { ensureTeacherPersonalClass } from "@/lib/personal-class";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const hasTeacherUpdate = Object.prototype.hasOwnProperty.call(body, "teacher_id");
  const teacher_id = typeof body.teacher_id === "string" && body.teacher_id ? body.teacher_id : null;
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  if (body.name !== undefined && !name) {
    return NextResponse.json({ error: "Group name required" }, { status: 400 });
  }

  // Verify class belongs to this school
  const existing = await prisma.class.findFirst({
    where: { id, school_id: auth.school.id },
    select: {
      id: true,
      teacher_id: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
    },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Tenant guard ── if assigning a teacher, that teacher must also belong
  // to this school (don't trust the body's teacher_id blindly).
  if (hasTeacherUpdate && teacher_id) {
    const ownsTeacher = await prisma.teacher.findFirst({
      where: { id: teacher_id, school_id: auth.school.id },
      select: { id: true },
    });
    if (!ownsTeacher)
      return NextResponse.json({ error: "Supervisor not found in your platform" }, { status: 404 });
  }

  const cls = await prisma.$transaction(async (tx) => {
    const updated = await tx.class.update({
      where: { id },
      data: {
        ...(hasTeacherUpdate ? { teacher_id } : {}),
        ...(name !== undefined ? { name } : {}),
      },
      select: {
        id: true, name: true,
        teacher: { select: { id: true, profile: { select: { full_name: true } } } },
        _count: { select: { students: true } },
        invite: { select: { token: true, is_active: true, use_count: true, updated_at: true } },
      },
    });

    if (hasTeacherUpdate && existing.teacher_id !== teacher_id) {
      await tx.classInvite.updateMany({ where: { class_id: id }, data: { is_active: false } });
      if (existing.teacher_id && existing.teacher) {
        await ensureTeacherPersonalClass(tx, {
          teacherId: existing.teacher_id,
          schoolId: auth.school.id,
          fullName: existing.teacher.profile.full_name,
        });
      }
    }
    return updated;
  });

  return NextResponse.json({ class: cls });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  // Verify class belongs to this school before deleting
  const existing = await prisma.class.findFirst({
    where: { id, school_id: auth.school.id },
    select: {
      id: true,
      teacher_id: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
    },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.class.delete({ where: { id } });
    if (existing.teacher_id && existing.teacher) {
      await ensureTeacherPersonalClass(tx, {
        teacherId: existing.teacher_id,
        schoolId: auth.school.id,
        fullName: existing.teacher.profile.full_name,
      });
    }
  });

  return NextResponse.json({ success: true });
}
