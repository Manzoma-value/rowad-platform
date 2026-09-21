// student auth helper
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSchoolIdAllowedForCurrentRequest } from "@/lib/school-context";

export async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, is_active: true, full_name: true, avatar_url: true },
  });
  if (!profile) return null;
  if (profile.role !== "STUDENT") return null;
  if (!profile.is_active) return null;

  const student = await prisma.student.findUnique({
    where: { profile_id: profile.id },
    select: {
      id: true,
      school_id: true,
      class_id: true,
      onboarding_status: true,
    },
  });
  if (!student?.school_id) return null;
  if (!(await isSchoolIdAllowedForCurrentRequest(student.school_id))) return null;

  return { profile, student };
}
