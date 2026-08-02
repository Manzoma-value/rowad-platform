/**
 * Uploads a workshop video from the browser straight into Google Drive,
 * then registers it with our API.
 *
 * The bytes deliberately never pass through a Next.js route handler: on Vercel
 * a serverless request body is capped at 4.5MB, so posting a video to our own
 * API always came back 413. We only exchange small JSON with the server (to
 * create a resumable Drive session and to save the metadata afterwards).
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
  if (!urlResponse.ok) throw new Error(urlPayload.error ?? "upload_url_failed");

  const driveFileId = await putToDriveUploadUrl({ uploadUrl: urlPayload.upload_url, file, onProgress, signal });

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

/**
 * PUT the file to the resumable Drive URL. Uses XHR rather than fetch purely
 * because it is the only way to get upload progress events.
 */
function putToDriveUploadUrl({
  uploadUrl,
  file,
  onProgress,
  signal,
}: {
  uploadUrl: string;
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          const payload = JSON.parse(request.responseText || "{}") as { id?: string };
          if (!payload.id) throw new Error("missing_drive_file_id");
          resolve(payload.id);
        } catch {
          reject(new Error("invalid_drive_upload_response"));
        }
      } else reject(new Error(`drive_upload_${request.status}`));
    };
    request.onerror = () => reject(new Error("network_error"));
    request.onabort = () => reject(new Error("aborted"));

    signal?.addEventListener("abort", () => request.abort(), { once: true });

    request.send(file);
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
