import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { googleDriveOAuthAccessToken, googleDriveUploadFolderId } from "@/lib/google-drive";
import {
  attachmentExtension,
  MAX_GROUP_ATTACHMENTS,
  MAX_GROUP_DOCUMENT_SIZE,
  MAX_GROUP_VIDEO_SIZE,
  MAX_GROUP_VIDEO_STORAGE_FALLBACK_SIZE,
  parseStoredTeacherGroupAttachments,
  safeAttachmentName,
  TEACHER_GROUP_ATTACHMENT_BUCKET,
  teacherGroupAttachmentKind,
  type StoredTeacherGroupAttachment,
} from "@/lib/teacher-group-attachments";
import {
  createTeacherGroupAttachmentClaim,
  createTeacherGroupDriveUploadSession,
  readTeacherGroupAttachmentClaim,
  readTeacherGroupDriveUploadSession,
} from "@/lib/teacher-group-attachment-tokens";

export type TeacherGroupAttachmentAuth = {
  groupId: string;
  schoolId: string;
  profileId: string;
};

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function sameContext(
  value: { groupId: string; schoolId: string; profileId: string },
  auth: TeacherGroupAttachmentAuth,
) {
  return value.groupId === auth.groupId && value.schoolId === auth.schoolId && value.profileId === auth.profileId;
}

async function createStorageUpload(
  auth: TeacherGroupAttachmentAuth,
  attachment: {
    id: string;
    kind: "IMAGE" | "VIDEO" | "PDF";
    name: string;
    mime: string;
    size: number;
  },
  fallbackReason?: string,
) {
  const ext = attachmentExtension(attachment.name, attachment.kind);
  const storagePath = `schools/${auth.schoolId}/groups/${auth.groupId}/${attachment.id}.${ext}`;
  const { data, error } = await adminSupabase().storage
    .from(TEACHER_GROUP_ATTACHMENT_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    console.error("[teacher-group attachment upload URL]", error?.message);
    return NextResponse.json({ error: "upload_url_failed" }, { status: 500 });
  }
  const attachmentToken = createTeacherGroupAttachmentClaim({
    ...auth,
    id: attachment.id,
    kind: attachment.kind,
    name: attachment.name,
    mime_type: attachment.mime,
    size_bytes: attachment.size,
    storage: "SUPABASE",
    storage_path: storagePath,
  });
  return NextResponse.json({
    upload_strategy: "SUPABASE",
    signed_url: data.signedUrl,
    attachment_token: attachmentToken,
    ...(fallbackReason ? { fallback_reason: fallbackReason } : {}),
  });
}

export async function createTeacherGroupUpload(request: Request, auth: TeacherGroupAttachmentAuth) {
  const body = await request.json().catch(() => null) as {
    filename?: string;
    mime_type?: string;
    size_bytes?: number;
  } | null;
  const mime = body?.mime_type?.trim().toLowerCase() ?? "";
  const kind = teacherGroupAttachmentKind(mime);
  const name = safeAttachmentName(body?.filename ?? "");
  const size = Number(body?.size_bytes);
  if (!kind || !Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }
  const limit = kind === "VIDEO" ? MAX_GROUP_VIDEO_SIZE : MAX_GROUP_DOCUMENT_SIZE;
  if (size > limit) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  const attachmentId = crypto.randomUUID();
  if (kind !== "VIDEO") {
    return createStorageUpload(auth, { id: attachmentId, kind, name, mime, size });
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
    if (size <= MAX_GROUP_VIDEO_STORAGE_FALLBACK_SIZE) {
      console.warn("[teacher-group Drive upload] using private-storage fallback", code);
      return createStorageUpload(auth, { id: attachmentId, kind, name, mime, size }, code);
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
      body: JSON.stringify({ name, parents: [folderId] }),
      cache: "no-store",
    },
  );
  const uploadUrl = response.headers.get("location");
  if (!response.ok || !uploadUrl) {
    const detail = await response.text().catch(() => "");
    console.error("[teacher-group Drive upload session]", response.status, detail.slice(0, 500));
    const code = response.status === 403 ? "drive_folder_not_writable" : "drive_upload_session_failed";
    if (size <= MAX_GROUP_VIDEO_STORAGE_FALLBACK_SIZE) {
      return createStorageUpload(auth, { id: attachmentId, kind, name, mime, size }, code);
    }
    return NextResponse.json({ error: code }, { status: 502 });
  }

  return NextResponse.json({
    upload_strategy: "GOOGLE_DRIVE",
    upload_token: createTeacherGroupDriveUploadSession({
      ...auth,
      uploadUrl,
      id: attachmentId,
      name,
      mimeType: mime,
      sizeBytes: size,
    }),
  });
}

export async function uploadTeacherGroupDriveChunk(request: Request, auth: TeacherGroupAttachmentAuth) {
  const session = readTeacherGroupDriveUploadSession(request.headers.get("x-drive-upload-token") ?? "");
  const contentRange = request.headers.get("content-range") ?? "";
  const rangeMatch = contentRange.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!session || !sameContext(session, auth) || !rangeMatch || Number(rangeMatch[3]) !== session.sizeBytes) {
    return NextResponse.json({ error: "invalid_upload_session" }, { status: 400 });
  }
  const start = Number(rangeMatch[1]);
  const end = Number(rangeMatch[2]);
  const expectedLength = end - start + 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || expectedLength > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "invalid_upload_chunk" }, { status: 400 });
  }
  const chunk = await request.arrayBuffer();
  if (chunk.byteLength !== expectedLength) {
    return NextResponse.json({ error: "upload_chunk_length_mismatch" }, { status: 400 });
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
    console.error("[teacher-group Drive upload chunk]", upstream.status, detail.slice(0, 500));
    return NextResponse.json({ error: "drive_upload_chunk_failed" }, { status: 502 });
  }
  const file = await upstream.json().catch(() => null) as { id?: string } | null;
  if (!file?.id) return NextResponse.json({ error: "drive_upload_response_invalid" }, { status: 502 });
  return NextResponse.json({
    complete: true,
    attachment_token: createTeacherGroupAttachmentClaim({
      groupId: session.groupId,
      schoolId: session.schoolId,
      profileId: session.profileId,
      id: session.id,
      kind: "VIDEO",
      name: session.name,
      mime_type: session.mimeType,
      size_bytes: session.sizeBytes,
      storage: "GOOGLE_DRIVE",
      drive_file_id: file.id,
    }),
  });
}

export async function discardTeacherGroupUploads(request: Request, auth: TeacherGroupAttachmentAuth) {
  const body = await request.json().catch(() => null) as { attachment_tokens?: unknown } | null;
  const tokens = Array.isArray(body?.attachment_tokens) ? body.attachment_tokens.slice(0, MAX_GROUP_ATTACHMENTS) : [];
  const attachments = tokens.flatMap((token) => {
    const claim = typeof token === "string" ? readTeacherGroupAttachmentClaim(token) : null;
    return claim && sameContext(claim, auth) ? [claim] : [];
  });
  await cleanupTeacherGroupAttachments(attachments);
  return NextResponse.json({ success: true });
}

export async function validateTeacherGroupAttachmentClaims(value: unknown, auth: TeacherGroupAttachmentAuth) {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_GROUP_ATTACHMENTS) throw new Error("too_many_attachments");
  const claims = value.map((token) => typeof token === "string" ? readTeacherGroupAttachmentClaim(token) : null);
  if (claims.some((claim) => !claim || !sameContext(claim, auth))) throw new Error("invalid_attachment_token");
  const attachments = claims as NonNullable<(typeof claims)[number]>[];
  if (new Set(attachments.map((attachment) => attachment.id)).size !== attachments.length) {
    throw new Error("duplicate_attachment");
  }
  for (const attachment of attachments) {
    if (attachment.storage !== "SUPABASE") continue;
    const path = attachment.storage_path!;
    const folder = path.slice(0, path.lastIndexOf("/"));
    const filename = path.slice(path.lastIndexOf("/") + 1);
    const { data, error } = await adminSupabase().storage
      .from(TEACHER_GROUP_ATTACHMENT_BUCKET)
      .list(folder, { search: filename });
    if (error || !data?.some((entry) => entry.name === filename)) throw new Error("attachment_upload_not_found");
  }
  return attachments.map((attachment): StoredTeacherGroupAttachment => ({
    id: attachment.id,
    kind: attachment.kind,
    name: attachment.name,
    mime_type: attachment.mime_type,
    size_bytes: attachment.size_bytes,
    storage: attachment.storage,
    ...(attachment.storage_path ? { storage_path: attachment.storage_path } : {}),
    ...(attachment.drive_file_id ? { drive_file_id: attachment.drive_file_id } : {}),
  }));
}

export async function cleanupTeacherGroupAttachments(value: unknown) {
  const attachments = parseStoredTeacherGroupAttachments(value);
  const storagePaths = attachments.flatMap((attachment) => attachment.storage_path ? [attachment.storage_path] : []);
  if (storagePaths.length) {
    const { error } = await adminSupabase().storage.from(TEACHER_GROUP_ATTACHMENT_BUCKET).remove(storagePaths);
    if (error) console.error("[teacher-group attachment cleanup]", error.message);
  }
  const driveIds = attachments.flatMap((attachment) => attachment.drive_file_id ? [attachment.drive_file_id] : []);
  if (!driveIds.length) return;
  try {
    const token = await googleDriveOAuthAccessToken();
    await Promise.all(driveIds.map(async (id) => {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok && response.status !== 404) console.error("[teacher-group Drive cleanup]", response.status);
    }));
  } catch (error) {
    console.error("[teacher-group Drive cleanup auth]", error);
  }
}

export function storedAttachmentsAsJson(value: StoredTeacherGroupAttachment[]) {
  return value;
}
