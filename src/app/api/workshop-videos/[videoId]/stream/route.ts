import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { googleDriveAccessToken } from "@/lib/google-drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function accessibleDriveVideo(videoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const video = await prisma.workshopVideo.findUnique({
    where: { id: videoId },
    select: {
      drive_file_id: true,
      source_type: true,
      mime_type: true,
      workshop: { select: { id: true, school_id: true } },
    },
  });
  if (!video || video.source_type !== "GOOGLE_DRIVE" || !video.drive_file_id) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, is_active: true },
  });
  if (!profile?.is_active) return null;

  if (profile.role === "SCHOOL_ADMIN") {
    const membership = await prisma.schoolAdminMember.findFirst({
      where: { profile_id: user.id, school_id: video.workshop.school_id },
      select: { id: true },
    });
    return membership ? video : null;
  }

  if (profile.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({
      where: {
        profile_id: user.id,
        school_id: video.workshop.school_id,
        OR: [
          { workshop_enrollments: { some: { workshop_id: video.workshop.id } } },
          { workshop_signup_id: video.workshop.id },
          { workshop_attendance: { some: { workshop_id: video.workshop.id } } },
        ],
      },
      select: { id: true },
    });
    return teacher ? video : null;
  }

  return null;
}

export async function GET(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  const video = await accessibleDriveVideo(videoId);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let token: string;
  try {
    token = await googleDriveAccessToken();
  } catch (error) {
    console.error("[workshop-drive stream auth]", error);
    return NextResponse.json({ error: "Video source unavailable" }, { status: 503 });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(video.drive_file_id!)}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
      signal: request.signal,
    },
  );

  if (!upstream.ok && upstream.status !== 206) {
    console.error("[workshop-drive stream] upstream status", upstream.status);
    return NextResponse.json({ error: "Video source unavailable" }, { status: upstream.status === 404 ? 404 : 502 });
  }

  const headers = new Headers({
    "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": upstream.headers.get("content-type") ?? video.mime_type ?? "video/mp4",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
