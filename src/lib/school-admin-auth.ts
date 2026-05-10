
// school admin auth 
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireSchoolAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "SCHOOL_ADMIN") return null;

  const school = await prisma.school.findFirst({ where: { admin_id: profile.id } });
  if (!school) return null;

  return { profile, school };
}
