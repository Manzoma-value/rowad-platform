// Shared helper for owner API routes. Returns the owner profile or null.
// Mirrors the inline copies that already exist in /api/owner/schools etc.
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, is_active: true, full_name: true },
  });
  if (!profile || profile.role !== "OWNER" || !profile.is_active) return null;
  return profile;
}
