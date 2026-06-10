// api/student/announcements/route.ts
//
// Read announcements for the requesting student's class only. The student
// must be authenticated AND the classId must equal their assigned class.
// Without this guard, anyone could enumerate announcements across schools.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId)
    return NextResponse.json({ error: "classId is required" }, { status: 400 });

  // Tenant guard: the requesting student must actually be in that class.
  const student = await prisma.student.findFirst({
    where: { profile_id: user.id, class_id: classId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const announcements = await prisma.announcement.findMany({
    where: { class_id: classId },
    select: {
      id: true,
      content: true,
      created_at: true,
      teacher: {
        select: { profile: { select: { full_name: true } } },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(announcements);
}
