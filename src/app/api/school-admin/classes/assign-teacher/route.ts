import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  // ── Auth ── (was completely missing — anyone could call this)
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { classId, teacherId } = body;

    if (!classId || !teacherId) {
      return NextResponse.json(
        { error: "classId and teacherId are required" },
        { status: 400 },
      );
    }

    // ── Tenant guards ──────────────────────────────────────────────────────
    // Both the class AND the teacher must belong to THIS admin's school.
    // Run the two ownership checks in parallel.
    const [ownsClass, ownsTeacher] = await Promise.all([
      prisma.class.findFirst({
        where: { id: classId, school_id: auth.school.id },
        select: { id: true },
      }),
      prisma.teacher.findFirst({
        where: { id: teacherId, school_id: auth.school.id },
        select: { id: true },
      }),
    ]);
    if (!ownsClass)
      return NextResponse.json({ error: "Class not found in your school" }, { status: 404 });
    if (!ownsTeacher)
      return NextResponse.json({ error: "Teacher not found in your school" }, { status: 404 });

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { teacher: { connect: { id: teacherId } } },
      select: { id: true, name: true, teacher_id: true },
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error("[assign-teacher]", error);
    return NextResponse.json({ error: "Failed to assign teacher" }, { status: 500 });
  }
}
