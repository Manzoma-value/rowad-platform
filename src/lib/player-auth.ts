import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/** Active teacher/student identity used by the shared Rowad games. */
export async function requireActivePlayer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      is_active: true,
      teacher: { select: { school_id: true } },
      student: { select: { school_id: true } },
    },
  });
  if (!profile?.is_active) return null;

  const schoolId = profile.role === "TEACHER"
    ? profile.teacher?.school_id
    : profile.role === "STUDENT"
      ? profile.student?.school_id
      : null;
  if (!schoolId) return null;

  return { profile_id: profile.id, school_id: schoolId, role: profile.role };
}
