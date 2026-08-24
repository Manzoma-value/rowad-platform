import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { googleDriveAccessToken } from "@/lib/google-drive";
import {
  parseStoredTeacherGroupAttachments,
  TEACHER_GROUP_ATTACHMENT_BUCKET,
} from "@/lib/teacher-group-attachments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function accessibleAnnouncement(announcementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile, announcement] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { role: true, is_active: true } }),
    prisma.teacherGroupAnnouncement.findUnique({
      where: { id: announcementId },
      select: { group_id: true, school_id: true, attachments: true },
    }),
  ]);
  if (!profile?.is_active || !announcement) return null;
  if (profile.role === "SCHOOL_ADMIN") {
    const admin = await prisma.schoolAdminMember.findFirst({
      where: { profile_id: user.id, school_id: announcement.school_id },
      select: { id: true },
    });
    return admin ? announcement : null;
  }
  if (profile.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({
      where: {
        profile_id: user.id,
        school_id: announcement.school_id,
        group_memberships: { some: { group_id: announcement.group_id } },
      },
      select: { id: true },
    });
    return teacher ? announcement : null;
  }
  return null;
}

export async function GET(request: Request, context: { params: Promise<{ announcementId: string; attachmentId: string }> }) {
  const { announcementId, attachmentId } = await context.params;
  const announcement = await accessibleAnnouncement(announcementId);
  const attachment = announcement
    ? parseStoredTeacherGroupAttachments(announcement.attachments).find((item) => item.id === attachmentId)
    : null;
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (attachment.storage === "SUPABASE") {
    const { data, error } = await adminSupabase().storage
      .from(TEACHER_GROUP_ATTACHMENT_BUCKET)
      .createSignedUrl(attachment.storage_path!, 60);
    if (error || !data?.signedUrl) {
      console.error("[teacher-group attachment signed URL]", error?.message);
      return NextResponse.json({ error: "Attachment unavailable" }, { status: 503 });
    }
    return NextResponse.redirect(data.signedUrl, 307);
  }

  let token: string;
  try {
    token = await googleDriveAccessToken();
  } catch (error) {
    console.error("[teacher-group Drive stream auth]", error);
    return NextResponse.json({ error: "Video unavailable" }, { status: 503 });
  }
  const range = request.headers.get("range");
  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(attachment.drive_file_id!)}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
      cache: "no-store",
      signal: request.signal,
    },
  );
  if (!upstream.ok && upstream.status !== 206) {
    console.error("[teacher-group Drive stream] upstream status", upstream.status);
    return NextResponse.json({ error: "Video unavailable" }, { status: upstream.status === 404 ? 404 : 502 });
  }
  const headers = new Headers({
    "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": upstream.headers.get("content-type") ?? attachment.mime_type,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
