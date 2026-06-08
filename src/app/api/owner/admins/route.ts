// GET /api/owner/admins — list all school admins with their school and activation status
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all schools with their admins (including schools with no admin yet)
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      language: true,
      admins: {
        select: {
          profile: {
            select: {
              id: true,
              full_name: true,
              email: true,
              is_active: true,
              created_at: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ schools });
}
