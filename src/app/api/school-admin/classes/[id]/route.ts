// api/school-admin/classes/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const { teacher_id } = body;

  // Verify class belongs to this school
  const existing = await prisma.class.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Tenant guard ── if assigning a teacher, that teacher must also belong
  // to this school (don't trust the body's teacher_id blindly).
  if (teacher_id) {
    const ownsTeacher = await prisma.teacher.findFirst({
      where: { id: teacher_id, school_id: auth.school.id },
      select: { id: true },
    });
    if (!ownsTeacher)
      return NextResponse.json({ error: "Teacher not found in your school" }, { status: 404 });
  }

  const cls = await prisma.class.update({
    where: { id },
    data: {
      teacher_id: teacher_id || null,
    },
    select: {
      id: true, name: true,
      teacher: { select: { id: true, profile: { select: { full_name: true } } } },
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json({ class: cls });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  // Verify class belongs to this school before deleting
  const existing = await prisma.class.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.class.delete({ where: { id } });

  return NextResponse.json({ success: true });
}