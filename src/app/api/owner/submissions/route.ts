import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 15; // submissions change frequently

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

export async function GET(req: Request) {
  const profile = await requireOwner();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const submissions = await prisma.assessmentAttempt.findMany({
    where: {
      assessment: { type: "PLATFORM_INTAKE" },
      ...(statusFilter ? { review_status: statusFilter as never } : {}),
    },
    select: {
      id: true,
      review_status: true,
      score: true,
      total: true,
      submitted_at: true,
      student: {
        select: {
          profile: { select: { full_name: true } },
          school: { select: { name: true } },
        },
      },
      assessment: { select: { title: true } },
      assigned_school: { select: { id: true, name: true } },
      reviewer: { select: { full_name: true } },
    },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json({ submissions });
}