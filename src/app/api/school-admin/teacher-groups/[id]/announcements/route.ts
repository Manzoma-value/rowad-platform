import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyProfiles, teacherGroupProfileIds } from "@/lib/notifications";
import { publicTeacherGroupAttachments } from "@/lib/teacher-group-attachments";
import {
  cleanupTeacherGroupAttachments,
  validateTeacherGroupAttachmentClaims,
} from "@/lib/teacher-group-attachment-server";

export const dynamic = "force-dynamic";

const ANNOUNCEMENT_SELECT = {
  id: true,
  content: true,
  created_at: true,
  author_id: true,
  attachments: true,
  author: {
    select: {
      id: true,
      full_name: true,
      role: true,
    },
  },
} as const;

function publicAnnouncement<T extends { id: string; attachments: unknown }>(announcement: T) {
  return { ...announcement, attachments: publicTeacherGroupAttachments(announcement.id, announcement.attachments) };
}

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

  return NextResponse.json({ announcements: announcements.map(publicAnnouncement) });
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
  let attachments;
  try {
    attachments = await validateTeacherGroupAttachmentClaims(body.attachment_tokens, {
      groupId: id,
      schoolId: auth.school.id,
      profileId: auth.profile.id,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_attachment" }, { status: 400 });
  }
  if (!content && attachments.length === 0) {
    return NextResponse.json({ error: "content_or_attachment_required" }, { status: 400 });
  }

  const announcement = await prisma.teacherGroupAnnouncement.create({
    data: {
      group_id: id,
      school_id: auth.school.id,
      author_id: auth.profile.id,
      content: content.slice(0, 4000),
      attachments: attachments as unknown as Prisma.InputJsonValue,
    },
    select: ANNOUNCEMENT_SELECT,
  });
  const memberIds = await teacherGroupProfileIds(id);
  await notifyProfiles(memberIds, {
    type: "SYSTEM",
    title_ar: "إعلان جديد في المجموعة",
    title_sq: "Njoftim i ri në grup",
    title_en: "New group announcement",
    body_ar: content.slice(0, 180) || `مرفق جديد: ${attachments[0]?.name ?? "ملف"}`,
    body_sq: content.slice(0, 180) || `Bashkëngjitje e re: ${attachments[0]?.name ?? "skedar"}`,
    body_en: content.slice(0, 180) || `New attachment: ${attachments[0]?.name ?? "file"}`,
    href: `/teacher/groups/${id}`,
    actor_id: auth.profile.id,
    event_key: `teacher-group-announcement:${announcement.id}`,
  }).catch(() => undefined);

  return NextResponse.json({ announcement: publicAnnouncement(announcement) }, { status: 201 });
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

  const announcement = await prisma.teacherGroupAnnouncement.findFirst({
    where: {
      id: announcementId,
      group_id: id,
      school_id: auth.school.id,
    },
    select: { id: true, attachments: true },
  });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const deleted = await prisma.teacherGroupAnnouncement.deleteMany({ where: { id: announcement.id } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await cleanupTeacherGroupAttachments(announcement.attachments);
  return NextResponse.json({ success: true });
}
