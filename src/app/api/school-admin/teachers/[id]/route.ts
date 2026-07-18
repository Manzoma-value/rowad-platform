import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { z } from "zod";

// ── PATCH /api/school-admin/teachers/[id] — activate or deactivate a teacher ──
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = z.object({ is_active: z.boolean() }).safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  // Verify teacher belongs to this school
  const teacher = await prisma.teacher.findFirst({
    where: { id, school_id: auth.school.id },
    select: { profile_id: true },
  });
  if (!teacher) return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 });

  const updated = await prisma.profile.update({
    where: { id: teacher.profile_id },
    data: { is_active: result.data.is_active },
    select: { id: true, full_name: true, is_active: true },
  });
  return NextResponse.json({ profile: updated });
}

// ── DELETE /api/school-admin/teachers/[id] — permanently remove a teacher ─────
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ── (was MISSING — this is a destructive admin action that deletes
  // the underlying auth user, so it MUST require a school admin and verify the
  // teacher belongs to that admin's school.)
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;

    // Tenant guard: teacher must belong to THIS admin's school.
    const teacher = await prisma.teacher.findFirst({
      where: { id, school_id: auth.school.id },
      select: { profile_id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(teacher.profile_id);
    if (authDeleteError && !/not found|does not exist/i.test(authDeleteError.message)) {
      console.error("[delete-teacher] auth deletion failed:", authDeleteError.message);
      return NextResponse.json({ error: "Could not remove the login account" }, { status: 502 });
    }

    // Auth deletion does not reliably cascade into public application tables.
    // Remove the school record explicitly and anonymize the retained profile
    // so the teacher cannot reappear or block a future registration.
    await prisma.$transaction(async (tx) => {
      await tx.teacher.deleteMany({ where: { id, school_id: auth.school.id } });
      await tx.profile.updateMany({
        where: { id: teacher.profile_id },
        data: {
          full_name: "Deleted teacher",
          email: null,
          is_active: false,
          avatar_url: null,
          avatar_path: null,
        },
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete-teacher]", error);
    return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
  }
}
