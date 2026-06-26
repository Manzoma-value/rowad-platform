// api/school-admin/students/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// ── PATCH /api/school-admin/students/[id] — activate or deactivate a student ──
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const result = z.object({ is_active: z.boolean() }).safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const student = await prisma.student.findFirst({
    where: { id, school_id: auth.school.id },
    select: { profile_id: true },
  });
  if (!student) return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });

  const updated = await prisma.profile.update({
    where: { id: student.profile_id },
    data: { is_active: result.data.is_active },
    select: { id: true, full_name: true, is_active: true },
  });
  return NextResponse.json({ profile: updated });
}

// ── DELETE /api/school-admin/students/[id] — permanently remove a student ─────
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  // Verify student belongs to this school
  const student = await prisma.student.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, profile_id: true },
  });
  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const supabase = createAdminClient();
  await supabase.auth.admin.deleteUser(student.profile_id);

  return NextResponse.json({ success: true });
}