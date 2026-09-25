import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

/** Lightweight role-shell bootstrap; intentionally excludes class rosters. */
export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const school = await prisma.school.findUnique({
    where: { id: auth.teacher.school_id },
    select: {
      id: true,
      name: true,
      name_alt: true,
      language: true,
      slug: true,
      is_active: true,
    },
  });

  if (school && !school.is_active) {
    return NextResponse.json({ error: "school_deactivated", school });
  }

  return NextResponse.json({
    profile: {
      id: auth.profile.id,
      full_name: auth.profile.full_name,
      avatar_url: auth.profile.avatar_url,
    },
    school,
    onboarding_status: auth.teacher.onboarding_status,
  });
}
