// teacher auth helper — mirrors school-admin-auth pattern
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, is_active: true, full_name: true, email: true },
  });
  if (!profile) return null;
  if (profile.role !== "TEACHER") return null;
  if (!profile.is_active) return null;

  const teacher = await prisma.teacher.findUnique({
    where: { profile_id: profile.id },
    select: { id: true, school_id: true, onboarding_status: true },
  });
  if (!teacher) return null;

  return { profile, teacher };
}
