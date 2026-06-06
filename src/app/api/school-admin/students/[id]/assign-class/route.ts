// api/school-admin/students/[id]/assign-class/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id: studentId }, { class_id }] = await Promise.all([
    context.params,
    req.json(),
  ]);

  // Verify student belongs to this school
  const existing = await prisma.student.findFirst({
    where: { id: studentId, school_id: auth.school.id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // ── Tenant guard ── the target class (when assigning, not clearing) must
  // also belong to this school — otherwise an admin could move their student
  // into another school's class.
  if (class_id) {
    const ownsClass = await prisma.class.findFirst({
      where: { id: class_id, school_id: auth.school.id },
      select: { id: true },
    });
    if (!ownsClass)
      return NextResponse.json({ error: "Class not found in your school" }, { status: 404 });
  }

  const student = await prisma.student.update({
    where: { id: studentId },
    data: {
      class_id: class_id || null,
      ...(class_id ? { onboarding_status: "CLASS_ASSIGNED" } : {}),
    },
    select: {
      id: true, onboarding_status: true,
      class: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ student });
}