// student auth helper
import { prisma } from "@/lib/prisma";
import { isSchoolIdAllowedForCurrentRequest } from "@/lib/school-context";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export async function requireStudent() {
  const user = await getVerifiedUser();
  if (!user) return null;

  const [profile, student] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, is_active: true, full_name: true, avatar_url: true },
    }),
    prisma.student.findUnique({
      where: { profile_id: user.id },
      select: {
        id: true,
        school_id: true,
        class_id: true,
        onboarding_status: true,
      },
    }),
  ]);
  if (!profile) return null;
  if (profile.role !== "STUDENT") return null;
  if (!profile.is_active) return null;
  if (!student?.school_id) return null;
  if (!(await isSchoolIdAllowedForCurrentRequest(student.school_id))) return null;

  return { profile, student };
}
