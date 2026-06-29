import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
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

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const announcements = await prisma.teacherGroupAnnouncement.findMany({
    where: { group_id: id, school_id: auth.school.id },
    orderBy: { created_at: "desc" },
    select: ANNOUNCEMENT_SELECT,
    take: 100,
  });

  return NextResponse.json({ announcements });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const announcement = await prisma.teacherGroupAnnouncement.create({
    data: {
      group_id: id,
      school_id: auth.school.id,
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
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const announcementId = new URL(req.url).searchParams.get("announcement_id");
  if (!announcementId) {
    return NextResponse.json({ error: "announcement_id required" }, { status: 400 });
  }

  const deleted = await prisma.teacherGroupAnnouncement.deleteMany({
    where: {
      id: announcementId,
      group_id: id,
      school_id: auth.school.id,
    },
  });

  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
