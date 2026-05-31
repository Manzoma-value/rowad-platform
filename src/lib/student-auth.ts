// student auth helper
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, is_active: true },
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
  if (!student) return null;

  return { profile, student };
}
