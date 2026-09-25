// Shared helper for owner API routes. Returns the owner profile or null.
// Mirrors the inline copies that already exist in /api/owner/schools etc.
import { prisma } from "@/lib/prisma";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export async function requireOwner() {
  const user = await getVerifiedUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, is_active: true, full_name: true },
  });
  if (!profile || profile.role !== "OWNER" || !profile.is_active) return null;
  return profile;
}
