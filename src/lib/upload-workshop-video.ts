import { MAX_VIDEO_FILE } from "@/lib/workshop-videos";

const DRIVE_UNAVAILABLE_ERRORS = new Set([
  "drive_upload_not_configured",
  "drive_upload_auth_failed",
  "drive_upload_folder_not_configured",
  "drive_folder_not_writable",
  "drive_upload_session_failed",
]);

/**
 * Uploads a workshop video from the browser, preferring Google Drive and
 * automatically falling back to Supabase Storage when the shared Drive OAuth
 * connection is unavailable. Video bytes never cross a single large Next.js
 * request, which keeps the flow below Vercel's request-body limit.
 */
export async function uploadWorkshopVideo({
  workshopId,
  file,
  title,
  onProgress,
  signal,
}: {
  workshopId: string;
  file: File;
  title: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}) {
  if (!file.type.startsWith("video/")) throw new Error("not_video");

  // Read the real playback length so question timestamps can be validated.
  const durationSeconds = await readVideoDuration(file).catch(() => null);

  const urlResponse = await fetch(`/api/school-admin/workshops/${workshopId}/videos/drive-upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mime_type: file.type, size_bytes: file.size }),
    signal,
  });
  const urlPayload = await urlResponse.json().catch(() => ({}));
  if (urlResponse.ok && urlPayload.upload_strategy === "SUPABASE") {
    return uploadToSupabase({ workshopId, file, title, durationSeconds, onProgress, signal });
  }
  if (!urlResponse.ok) {
    const code = typeof urlPayload.error === "string" ? urlPayload.error : "upload_url_failed";
    if (file.size <= MAX_VIDEO_FILE && DRIVE_UNAVAILABLE_ERRORS.has(code)) {
      return uploadToSupabase({ workshopId, file, title, durationSeconds, onProgress, signal });
    }
    throw new Error(code);
  }

  const driveFileId = await uploadDriveChunks({
    workshopId,
    uploadToken: urlPayload.upload_token,
    file,
    onProgress,
    signal,
  });

  const saveResponse = await fetch(`/api/school-admin/workshops/${workshopId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_type: "GOOGLE_DRIVE",
      drive_url: driveFileId,
      title,
      mime_type: file.type,
      size_bytes: file.size,
      duration_seconds: durationSeconds,
    }),
    signal,
  });
  const savePayload = await saveResponse.json().catch(() => ({}));
  if (!saveResponse.ok) throw new Error(savePayload.error ?? "save_failed");
  return savePayload.video;
}

/** Direct signed upload used as the resilient fallback for files up to 350 MB. */
async function uploadToSupabase({
  workshopId,
  file,
  title,
  durationSeconds,
  onProgress,
  signal,
}: {
  workshopId: string;
  file: File;
  title: string;
  durationSeconds: number | null;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}) {
  const urlResponse = await fetch(`/api/school-admin/workshops/${workshopId}/videos/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mime_type: file.type, size_bytes: file.size }),
    signal,
  });
  const urlPayload = await urlResponse.json().catch(() => ({}));
  if (!urlResponse.ok) {
    throw new Error(urlResponse.status === 413 ? "too_large" : (urlPayload.error ?? "upload_url_failed"));
  }

  await putToSignedUrl({ signedUrl: urlPayload.signed_url, file, onProgress, signal });

  const saveResponse = await fetch(`/api/school-admin/workshops/${workshopId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_path: urlPayload.path,
      title,
      mime_type: file.type,
      size_bytes: file.size,
      duration_seconds: durationSeconds,
    }),
    signal,
  });
  const savePayload = await saveResponse.json().catch(() => ({}));
  if (!saveResponse.ok) throw new Error(savePayload.error ?? "save_failed");
  return savePayload.video;
}

/** Upload the file to a signed storage URL while reporting browser progress. */
function putToSignedUrl({
  signedUrl,
  file,
  onProgress,
  signal,
}: {
  signedUrl: string;
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`storage_${request.status}`));
    };
    request.onerror = () => reject(new Error("network_error"));
    request.onabort = () => reject(new Error("aborted"));
    signal?.addEventListener("abort", () => request.abort(), { once: true });

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    request.send(body);
  });
}

/**
 * Relay a resumable upload in 4 MB chunks. Four MB is both a Drive-compatible
 * multiple of 256 KB and safely below Vercel's request payload limit.
 */
async function uploadDriveChunks({
  workshopId,
  uploadToken,
  file,
  onProgress,
  signal,
}: {
  workshopId: string;
  uploadToken: string;
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}) {
  const chunkSize = 4 * 1024 * 1024;
  let offset = 0;
  while (offset < file.size) {
    if (signal?.aborted) throw new Error("aborted");
    const endExclusive = Math.min(offset + chunkSize, file.size);
    const result = await putDriveChunk({
      url: `/api/school-admin/workshops/${workshopId}/videos/drive-upload-url`,
      uploadToken,
      chunk: file.slice(offset, endExclusive),
      start: offset,
      end: endExclusive - 1,
      total: file.size,
      mimeType: file.type,
      onProgress: (loaded) => onProgress?.(Math.min(100, Math.round(((offset + loaded) / file.size) * 100))),
      signal,
    });
    if (result.complete && result.file_id) return result.file_id;
    const nextOffset = Number(result.next_offset);
    if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset > file.size) {
      throw new Error("invalid_drive_upload_progress");
    }
    offset = nextOffset;
  }
  throw new Error("missing_drive_file_id");
}

function putDriveChunk({
  url,
  uploadToken,
  chunk,
  start,
  end,
  total,
  mimeType,
  onProgress,
  signal,
}: {
  url: string;
  uploadToken: string;
  chunk: Blob;
  start: number;
  end: number;
  total: number;
  mimeType: string;
  onProgress: (loaded: number) => void;
  signal?: AbortSignal;
}) {
  return new Promise<{ complete: boolean; next_offset?: number; file_id?: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", mimeType || "application/octet-stream");
    request.setRequestHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    request.setRequestHeader("X-Drive-Upload-Token", uploadToken);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText || "{}"));
        } catch {
          reject(new Error("invalid_drive_chunk_response"));
        }
      } else reject(new Error(`drive_chunk_${request.status}`));
    };
    request.onerror = () => reject(new Error("network_error"));
    request.onabort = () => reject(new Error("aborted"));

    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(chunk);
  });
}

/** Measure a local video file's duration via an off-screen media element. */
function readVideoDuration(file: File) {
  return new Promise<number | null>((resolve, reject) => {
    const element = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const duration = element.duration;
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null);
    };
    element.onerror = () => { cleanup(); reject(new Error("metadata_failed")); };
    element.src = objectUrl;
  });
}
