import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ANNOUNCEMENT_SELECT = {
  id: true,
  content: true,
  created_at: true,
  author_id: true,
  author: {
    select: {
      id: true,
      full_name: true,
      role: true,
    },
  },
} as const;

async function requireGroupMember(groupId: string) {
  const auth = await requireTeacher();
  if (!auth) return null;

  const membership = await prisma.teacherGroupMember.findUnique({
    where: {
      group_id_teacher_id: {
        group_id: groupId,
        teacher_id: auth.teacher.id,
      },
    },
    select: {
      group: { select: { id: true, school_id: true } },
    },
  });
  if (!membership || membership.group.school_id !== auth.teacher.school_id) return null;
  return { ...auth, group: membership.group };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireGroupMember(id);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const announcements = await prisma.teacherGroupAnnouncement.findMany({
    where: { group_id: id, school_id: auth.teacher.school_id },
    orderBy: { created_at: "desc" },
    select: ANNOUNCEMENT_SELECT,
    take: 100,
  });

  return NextResponse.json({ announcements, current_profile_id: auth.profile.id });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireGroupMember(id);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const announcement = await prisma.teacherGroupAnnouncement.create({
    data: {
      group_id: id,
      school_id: auth.teacher.school_id,
      author_id: auth.profile.id,
      content: content.slice(0, 4000),
    },
    select: ANNOUNCEMENT_SELECT,
  });

  return NextResponse.json({ announcement }, { status: 201 });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireGroupMember(id);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const announcementId = new URL(req.url).searchParams.get("announcement_id");
  if (!announcementId) {
    return NextResponse.json({ error: "announcement_id required" }, { status: 400 });
  }

  const deleted = await prisma.teacherGroupAnnouncement.deleteMany({
    where: {
      id: announcementId,
      group_id: id,
      school_id: auth.teacher.school_id,
      author_id: auth.profile.id,
    },
  });

  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
