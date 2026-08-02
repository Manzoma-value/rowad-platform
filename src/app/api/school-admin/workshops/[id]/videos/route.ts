// /api/school-admin/workshops/[id]/videos
//   GET  — list this workshop's videos with full question authoring detail.
//   POST — record a video the browser already uploaded straight to Supabase
//          Storage (see ./upload-url). Only small JSON metadata crosses this
//          route, so the 4.5MB Vercel body cap is never in play.
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { VIDEO_BUCKET } from "@/lib/workshop-videos";
import { notifyProfiles, workshopTeacherProfileIds } from "@/lib/notifications";
import { extractGoogleDriveFileId, getGoogleDriveVideo, googleDriveServiceAccountEmail } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function workshopForAdmin(id: string, schoolId: string) {
  return prisma.workshop.findFirst({ where: { id, school_id: schoolId }, select: { id: true, title: true } });
}

const questionSelect = {
  id: true,
  type: true,
  text: true,
  correct_answer: true,
  timestamp_seconds: true,
  order: true,
  options: { orderBy: { order: "asc" as const }, select: { id: true, text: true, order: true } },
};

const videoSelect = {
  id: true,
  title: true,
  url: true,
  source_type: true,
  mime_type: true,
  size_bytes: true,
  duration_seconds: true,
  order: true,
  created_at: true,
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const videos = await prisma.workshopVideo.findMany({
    where: { workshop_id: id },
    orderBy: { order: "asc" },
    select: {
      ...videoSelect,
      questions: { orderBy: { timestamp_seconds: "asc" }, select: questionSelect },
    },
  });
  return NextResponse.json({ videos, drive_service_account_email: googleDriveServiceAccountEmail() });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null) as {
    storage_path?: string;
    source_type?: "SUPABASE" | "GOOGLE_DRIVE";
    drive_url?: string;
    title?: string;
    mime_type?: string;
    size_bytes?: number;
    duration_seconds?: number;
  } | null;

  if (body?.source_type === "GOOGLE_DRIVE") {
    const driveFileId = extractGoogleDriveFileId(body.drive_url ?? "");
    if (!driveFileId) return NextResponse.json({ error: "invalid_drive_url" }, { status: 400 });

    let driveFile: Awaited<ReturnType<typeof getGoogleDriveVideo>>;
    try {
      driveFile = await getGoogleDriveVideo(driveFileId);
    } catch (error) {
      const code = error instanceof Error ? error.message : "drive_lookup_failed";
      return NextResponse.json(
        { error: code, service_account_email: googleDriveServiceAccountEmail() },
        { status: code === "drive_not_configured" ? 503 : 400 },
      );
    }

    const videoId = crypto.randomUUID();
    const order = await prisma.workshopVideo.count({ where: { workshop_id: id } });
    try {
      const video = await prisma.workshopVideo.create({
        data: {
          id: videoId,
          workshop_id: id,
          title: (body.title ?? "").trim().slice(0, 160) || driveFile.name,
          storage_path: null,
          source_type: "GOOGLE_DRIVE",
          drive_file_id: driveFile.id,
          url: `/api/workshop-videos/${videoId}/stream`,
          mime_type: driveFile.mimeType,
          size_bytes: driveFile.sizeBytes,
          duration_seconds: driveFile.durationSeconds,
          order,
          created_by: auth.profile.id,
        },
        select: videoSelect,
      });
      const teacherIds = await workshopTeacherProfileIds(id);
      await notifyProfiles(teacherIds, {
        type: "WORKSHOP_VIDEO",
        title_ar: "فيديو جديد في الورشة",
        title_sq: "Video e re në trajnim",
        title_en: "New workshop video",
        body_ar: `تمت إضافة «${video.title}» إلى ورشة «${workshop.title}»`,
        body_sq: `“${video.title}” u shtua në trajnimin “${workshop.title}”`,
        body_en: `“${video.title}” was added to “${workshop.title}”`,
        href: `/workshops/${id}`,
        actor_id: auth.profile.id,
        event_key: `workshop-video:${video.id}`,
      }).catch(() => undefined);
      return NextResponse.json({ video: { ...video, questions: [] } }, { status: 201 });
    } catch (dbError) {
      console.error("[workshop-drive-video create]", dbError);
      return NextResponse.json({ error: "Could not save video" }, { status: 500 });
    }
  }

  const storagePath = body?.storage_path?.trim();
  // Only ever accept a path inside this workshop's own folder — the client
  // supplies it, so it must not be able to point at someone else's object.
  if (!storagePath || !storagePath.startsWith(`workshops/${id}/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "invalid storage_path" }, { status: 400 });
  }

  const admin = adminSupabase();
  // Confirm the object really landed before creating a row that points at it.
  const folder = storagePath.slice(0, storagePath.lastIndexOf("/"));
  const filename = storagePath.slice(storagePath.lastIndexOf("/") + 1);
  const { data: listed, error: listError } = await admin.storage.from(VIDEO_BUCKET).list(folder, { search: filename });
  if (listError) {
    console.error("[workshop-videos verify]", listError.message);
    return NextResponse.json({ error: "could not verify upload" }, { status: 500 });
  }
  if (!listed?.some((entry) => entry.name === filename)) {
    return NextResponse.json({ error: "upload not found in storage" }, { status: 400 });
  }

  const { data: { publicUrl } } = admin.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);

  const duration = Number(body?.duration_seconds);
  const size = Number(body?.size_bytes);
  const order = await prisma.workshopVideo.count({ where: { workshop_id: id } });

  try {
    const video = await prisma.workshopVideo.create({
      data: {
        workshop_id: id,
        title: (body?.title ?? "").trim().slice(0, 160) || filename,
        storage_path: storagePath,
        url: publicUrl,
        mime_type: body?.mime_type?.slice(0, 120) ?? null,
        size_bytes: Number.isFinite(size) && size > 0 ? Math.round(size) : null,
        duration_seconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
        order,
        created_by: auth.profile.id,
      },
      select: videoSelect,
    });
    const teacherIds = await workshopTeacherProfileIds(id);
    await notifyProfiles(teacherIds, {
      type: "WORKSHOP_VIDEO",
      title_ar: "فيديو جديد في الورشة",
      title_sq: "Video e re në trajnim",
      title_en: "New workshop video",
      body_ar: `تمت إضافة «${video.title}» إلى ورشة «${workshop.title}»`,
      body_sq: `“${video.title}” u shtua në trajnimin “${workshop.title}”`,
      body_en: `“${video.title}” was added to “${workshop.title}”`,
      href: `/workshops/${id}`,
      actor_id: auth.profile.id,
      event_key: `workshop-video:${video.id}`,
    }).catch(() => undefined);
    return NextResponse.json({ video: { ...video, questions: [] } }, { status: 201 });
  } catch (dbError) {
    await admin.storage.from(VIDEO_BUCKET).remove([storagePath]).catch(() => null);
    console.error("[workshop-videos create]", dbError);
    return NextResponse.json({ error: "Could not save video" }, { status: 500 });
  }
}
