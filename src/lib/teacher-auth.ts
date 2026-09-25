// teacher auth helper — mirrors school-admin-auth pattern
import { prisma } from "@/lib/prisma";
import { isSchoolIdAllowedForCurrentRequest } from "@/lib/school-context";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export async function requireTeacher() {
  const user = await getVerifiedUser();
  if (!user) return null;

  const [profile, teacher] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, is_active: true, full_name: true, email: true, avatar_url: true },
    }),
    prisma.teacher.findUnique({
      where: { profile_id: user.id },
      // Keep this shared authentication lookup limited to the long-established
      // columns. Optional application-draft storage must never take down the
      // whole teacher experience while a database migration is rolling out.
      select: { id: true, school_id: true, onboarding_status: true },
    }),
  ]);
  if (!profile) return null;
  if (profile.role !== "TEACHER") return null;
  if (!profile.is_active) return null;
  if (!teacher) return null;
  if (!(await isSchoolIdAllowedForCurrentRequest(teacher.school_id))) return null;

  return { profile, teacher };
}
