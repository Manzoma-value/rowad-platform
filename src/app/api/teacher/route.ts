// api/teacher/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findUnique({
    where: { profile_id: user.id },
    select: {
      id: true,
      school_id: true,
      onboarding_status: true,
      profile: { select: { full_name: true } },
      school: { select: { id: true, name: true, name_alt: true, language: true, slug: true } },
      classes: {
        select: {
          id: true,
          name: true,
          students: {
            select: {
              id: true,
              profile: { select: { full_name: true } },
            },
          },
        },
      },
    },
  });

  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  return NextResponse.json({
    profile: teacher.profile,
    school: teacher.school,
    classes: teacher.classes,
    onboarding_status: teacher.onboarding_status,
  });
}