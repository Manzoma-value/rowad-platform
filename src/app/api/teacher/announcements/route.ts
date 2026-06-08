// api/teacher/announcements/route.ts
//
// All three handlers enforce that the authenticated teacher actually owns
// the class. Previously:
//   - GET   leaked announcements across schools (any classId worked)
//   - POST  let a teacher attach to another teacher's class
//   - DELETE had ZERO auth — any user could nuke any announcement
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId)
    return NextResponse.json({ error: "classId is required" }, { status: 400 });

  // Tenant guard: the class must belong to this teacher.
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!cls)
    return NextResponse.json({ error: "Class not found" }, { status: 404 });

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
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { classId, content } = body as { classId?: string; content?: string };

  if (!classId || !content?.trim())
    return NextResponse.json(
      { error: "classId and content are required" },
      { status: 400 },
    );

  // Tenant guard — teacher must own the class
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!cls)
    return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const announcement = await prisma.announcement.create({
    data: {
      content: content.trim(),
      class_id: classId,
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
    },
    select: {
      id: true,
      content: true,
      created_at: true,
      teacher: { select: { profile: { select: { full_name: true } } } },
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Tenant guard — the announcement must belong to this teacher.
  const existing = await prisma.announcement.findFirst({
    where: { id, teacher_id: auth.teacher.id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
