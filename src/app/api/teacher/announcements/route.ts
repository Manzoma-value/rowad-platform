// api/teacher/announcements/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId)
    return NextResponse.json({ error: "classId is required" }, { status: 400 });

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [teacher, { classId, content }] = await Promise.all([
    prisma.teacher.findUnique({
      where: { profile_id: user.id },
      select: { id: true, school_id: true },
    }),
    req.json(),
  ]);

  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  if (!classId || !content)
    return NextResponse.json({ error: "classId and content are required" }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: {
      content,
      class_id: classId,
      teacher_id: teacher.id,
      school_id: teacher.school_id,
    },
    select: {
      id: true, content: true, created_at: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}