import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: {
      onboarding_status: true,
      profile: { select: { full_name: true } },
      school: { select: { id: true, name: true, name_alt: true, language: true, slug: true } },
      class: {
        select: {
          id: true,
          name: true,
          teacher: {
            select: { profile: { select: { full_name: true } } },
          },
          students: {
            select: { id: true, profile: { select: { full_name: true } } },
          },
        },
      },
    },
  });

  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  return NextResponse.json({
    profile: student.profile,
    school: student.school,
    class: student.class,
    onboarding_status: student.onboarding_status,
  });
}