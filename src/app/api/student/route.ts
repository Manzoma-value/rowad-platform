import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: {
      id: true,
      onboarding_status: true,
      profile: { select: { full_name: true } },
      school: { select: { id: true, name: true, name_alt: true, language: true, slug: true, is_active: true } },
      class: {
        select: {
          id: true,
          name: true,
          teacher: {
            select: { profile: { select: { full_name: true } } },
          },
          students: {
            select: { id: true, profile: { select: { full_name: true } } },
          },
        },
      },
    },
  });

  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  if (!student.school?.is_active)
    return NextResponse.json({ error: "school_deactivated", school: student.school });

  let status = student.onboarding_status;

  // ── Auto-skip the platform intake step when the owner has deactivated
  // (or never created) the platform intake assessment. Without this, the
  // student would be stuck on a "loading..." screen forever.
  if (status === "PENDING_INTAKE") {
    const hasActiveIntake = await prisma.assessment.findFirst({
      where: { type: "PLATFORM_INTAKE", is_active: true },
      select: { id: true },
    });
    if (!hasActiveIntake) {
      await prisma.student.update({
        where: { id: student.id },
        data: { onboarding_status: "INTAKE_SUBMITTED" },
      });
      status = "INTAKE_SUBMITTED";
    }
  }

  return NextResponse.json({
    profile: student.profile,
    school: student.school,
    class: student.class,
    onboarding_status: status,
  });
}