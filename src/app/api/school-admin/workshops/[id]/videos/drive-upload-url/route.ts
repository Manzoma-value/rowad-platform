import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { googleDriveOAuthAccessToken, googleDriveUploadFolderId } from "@/lib/google-drive";
import { createDriveUploadSession, readDriveUploadSession } from "@/lib/drive-upload-session";
import { MAX_VIDEO_FILE } from "@/lib/workshop-videos";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as {
    filename?: string;
    mime_type?: string;
    size_bytes?: number;
  } | null;
  const mime = body?.mime_type?.trim() ?? "";
  const size = Number(body?.size_bytes);
  const filename = body?.filename?.trim().slice(0, 240) ?? "";
  if (!mime.startsWith("video/") || !filename || !Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: "A valid video file is required" }, { status: 400 });
  }

  let accessToken: string;
  let folderId: string;
  try {
    [accessToken, folderId] = await Promise.all([
      googleDriveOAuthAccessToken(),
      Promise.resolve(googleDriveUploadFolderId()),
    ]);
  } catch (error) {
    const code = error instanceof Error ? error.message : "drive_upload_not_configured";
    if (size <= MAX_VIDEO_FILE) {
      console.warn("[workshop-drive upload] using storage fallback", code);
      return NextResponse.json({ upload_strategy: "SUPABASE" });
    }
    return NextResponse.json({ error: code }, { status: 503 });
  }

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mime,
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify({ name: filename, parents: [folderId] }),
      cache: "no-store",
    },
  );
  const uploadUrl = response.headers.get("location");
  if (!response.ok || !uploadUrl) {
    const detail = await response.text().catch(() => "");
    console.error("[workshop-drive upload session]", response.status, detail.slice(0, 500));
    if (size <= MAX_VIDEO_FILE) {
      return NextResponse.json({ upload_strategy: "SUPABASE" });
    }
    return NextResponse.json({ error: response.status === 403 ? "drive_folder_not_writable" : "drive_upload_session_failed" }, { status: 502 });
  }

  return NextResponse.json({
    upload_token: createDriveUploadSession({ uploadUrl, workshopId: id, mimeType: mime, sizeBytes: size }),
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = readDriveUploadSession(request.headers.get("x-drive-upload-token") ?? "");
  const contentRange = request.headers.get("content-range") ?? "";
  const rangeMatch = contentRange.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!session || session.workshopId !== id || !rangeMatch || Number(rangeMatch[3]) !== session.sizeBytes) {
    return NextResponse.json({ error: "Invalid upload session" }, { status: 400 });
  }

  const start = Number(rangeMatch[1]);
  const end = Number(rangeMatch[2]);
  const expectedLength = end - start + 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || expectedLength > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Invalid upload chunk" }, { status: 400 });
  }
  const chunk = await request.arrayBuffer();
  if (chunk.byteLength !== expectedLength) {
    return NextResponse.json({ error: "Upload chunk length mismatch" }, { status: 400 });
  }

  const upstream = await fetch(session.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": session.mimeType,
      "Content-Length": String(chunk.byteLength),
      "Content-Range": contentRange,
    },
    body: chunk,
    cache: "no-store",
  });

  if (upstream.status === 308) {
    const received = upstream.headers.get("range")?.match(/bytes=0-(\d+)/)?.[1];
    return NextResponse.json({ complete: false, next_offset: received ? Number(received) + 1 : start });
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("[workshop-drive upload chunk]", upstream.status, detail.slice(0, 500));
    return NextResponse.json({ error: "drive_upload_chunk_failed" }, { status: 502 });
  }
  const file = await upstream.json().catch(() => null) as { id?: string } | null;
  if (!file?.id) return NextResponse.json({ error: "drive_upload_response_invalid" }, { status: 502 });
  return NextResponse.json({ complete: true, file_id: file.id });
}
