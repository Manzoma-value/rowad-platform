import {
  MAX_GROUP_ATTACHMENTS,
  MAX_GROUP_DOCUMENT_SIZE,
  MAX_GROUP_VIDEO_SIZE,
  teacherGroupAttachmentKind,
} from "@/lib/teacher-group-attachments";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mkv: "video/x-matroska",
};

export function groupAttachmentMime(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  return MIME_BY_EXTENSION[extension] ?? "";
}

export function validateGroupAttachmentFiles(files: File[]) {
  if (files.length > MAX_GROUP_ATTACHMENTS) return "too_many_attachments";
  for (const file of files) {
    const kind = teacherGroupAttachmentKind(groupAttachmentMime(file));
    if (!kind) return "unsupported_file";
    if (file.size <= 0) return "empty_file";
    if (file.size > (kind === "VIDEO" ? MAX_GROUP_VIDEO_SIZE : MAX_GROUP_DOCUMENT_SIZE)) return "file_too_large";
  }
  return null;
}

export async function uploadTeacherGroupAttachments({
  endpoint,
  files,
  onProgress,
}: {
  endpoint: string;
  files: File[];
  onProgress?: (percent: number) => void;
}) {
  const validationError = validateGroupAttachmentFiles(files);
  if (validationError) throw new Error(validationError);
  const tokens: string[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const mime = groupAttachmentMime(file);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, mime_type: mime, size_bytes: file.size }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error ?? "upload_url_failed"), { uploadedTokens: tokens });

    const reportFileProgress = (percent: number) => {
      onProgress?.(Math.round(((index + Math.max(0, Math.min(100, percent)) / 100) / files.length) * 100));
    };
    if (payload.upload_strategy === "SUPABASE") {
      if (typeof payload.attachment_token !== "string") throw Object.assign(new Error("invalid_upload_response"), { uploadedTokens: [...tokens] });
      try {
        await putSignedUpload(payload.signed_url, file, reportFileProgress);
      } catch (error) {
        throw Object.assign(error instanceof Error ? error : new Error("upload_failed"), {
          uploadedTokens: [...tokens, payload.attachment_token],
        });
      }
      tokens.push(payload.attachment_token);
    } else if (payload.upload_strategy === "GOOGLE_DRIVE") {
      try {
        const token = await uploadDriveChunks(endpoint, payload.upload_token, file, mime, reportFileProgress);
        tokens.push(token);
      } catch (error) {
        throw Object.assign(error instanceof Error ? error : new Error("upload_failed"), { uploadedTokens: [...tokens] });
      }
    } else {
      throw Object.assign(new Error("invalid_upload_strategy"), { uploadedTokens: tokens });
    }
    onProgress?.(Math.round(((index + 1) / files.length) * 100));
  }
  return tokens;
}

export async function discardTeacherGroupAttachments(endpoint: string, tokens: string[]) {
  if (!tokens.length) return;
  await fetch(endpoint, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attachment_tokens: tokens }),
  }).catch(() => undefined);
}

function putSignedUpload(signedUrl: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error(`storage_${request.status}`));
    request.onerror = () => reject(new Error("network_error"));
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    request.send(body);
  });
}

async function uploadDriveChunks(
  endpoint: string,
  uploadToken: string,
  file: File,
  mime: string,
  onProgress: (percent: number) => void,
) {
  const chunkSize = 4 * 1024 * 1024;
  let offset = 0;
  while (offset < file.size) {
    const endExclusive = Math.min(offset + chunkSize, file.size);
    const result = await putDriveChunk({
      endpoint,
      uploadToken,
      chunk: file.slice(offset, endExclusive),
      start: offset,
      end: endExclusive - 1,
      total: file.size,
      mime,
      onProgress: (loaded) => onProgress(Math.round(((offset + loaded) / file.size) * 100)),
    });
    if (result.complete && typeof result.attachment_token === "string") return result.attachment_token;
    const nextOffset = Number(result.next_offset);
    if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset > file.size) {
      throw new Error("invalid_drive_upload_progress");
    }
    offset = nextOffset;
  }
  throw new Error("missing_attachment_token");
}

function putDriveChunk({
  endpoint,
  uploadToken,
  chunk,
  start,
  end,
  total,
  mime,
  onProgress,
}: {
  endpoint: string;
  uploadToken: string;
  chunk: Blob;
  start: number;
  end: number;
  total: number;
  mime: string;
  onProgress: (loaded: number) => void;
}) {
  return new Promise<{ complete: boolean; next_offset?: number; attachment_token?: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", endpoint);
    request.setRequestHeader("Content-Type", mime);
    request.setRequestHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    request.setRequestHeader("X-Drive-Upload-Token", uploadToken);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try { resolve(JSON.parse(request.responseText || "{}")); }
        catch { reject(new Error("invalid_drive_chunk_response")); }
      } else reject(new Error(`drive_chunk_${request.status}`));
    };
    request.onerror = () => reject(new Error("network_error"));
    request.send(chunk);
  });
}
