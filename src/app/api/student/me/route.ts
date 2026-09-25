import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { isSchoolIdAllowedForCurrentRequest } from "@/lib/school-context";

export const dynamic = "force-dynamic";

/** Lightweight role-shell bootstrap; intentionally excludes rosters/content. */
export async function GET() {
  const user = await getVerifiedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, student] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, is_active: true, full_name: true, avatar_url: true },
    }),
    prisma.student.findUnique({
      where: { profile_id: user.id },
      select: { school_id: true, onboarding_status: true },
    }),
  ]);
  if (!profile?.is_active || profile.role !== "STUDENT" || !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (student.school_id && !(await isSchoolIdAllowedForCurrentRequest(student.school_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const school = student.school_id
    ? await prisma.school.findUnique({
        where: { id: student.school_id },
        select: {
          id: true,
          name: true,
          name_alt: true,
          language: true,
          slug: true,
          is_active: true,
        },
      })
    : null;

  if (school && !school.is_active) {
    return NextResponse.json({ error: "school_deactivated", school });
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
    school,
    onboarding_status: student.onboarding_status,
  });
}
