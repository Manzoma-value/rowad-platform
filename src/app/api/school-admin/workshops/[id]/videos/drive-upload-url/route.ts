import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { googleDriveOAuthAccessToken, googleDriveUploadFolderId } from "@/lib/google-drive";

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
    return NextResponse.json({ error: response.status === 403 ? "drive_folder_not_writable" : "drive_upload_session_failed" }, { status: 502 });
  }

  return NextResponse.json({ upload_url: uploadUrl });
}
