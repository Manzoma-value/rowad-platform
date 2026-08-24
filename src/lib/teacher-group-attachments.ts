export const TEACHER_GROUP_ATTACHMENT_BUCKET = "teacher-group-attachments";
export const MAX_GROUP_ATTACHMENTS = 4;
export const MAX_GROUP_DOCUMENT_SIZE = 40 * 1024 * 1024;
export const MAX_GROUP_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;

export type TeacherGroupAttachmentKind = "IMAGE" | "VIDEO" | "PDF";
export type TeacherGroupAttachmentStorage = "SUPABASE" | "GOOGLE_DRIVE";

export type StoredTeacherGroupAttachment = {
  id: string;
  kind: TeacherGroupAttachmentKind;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage: TeacherGroupAttachmentStorage;
  storage_path?: string;
  drive_file_id?: string;
};

export type TeacherGroupAttachment = Omit<StoredTeacherGroupAttachment, "storage_path" | "drive_file_id"> & {
  url: string;
};

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export function teacherGroupAttachmentKind(mime: string): TeacherGroupAttachmentKind | null {
  const normalized = mime.trim().toLowerCase();
  if (IMAGE_MIMES.has(normalized)) return "IMAGE";
  if (normalized === "application/pdf") return "PDF";
  if (normalized.startsWith("video/")) return "VIDEO";
  return null;
}

export function safeAttachmentName(value: string) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f\\/]/g, "").trim();
  return (cleaned || "attachment").slice(0, 180);
}

export function attachmentExtension(filename: string, kind: TeacherGroupAttachmentKind) {
  const candidate = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  const allowed = kind === "IMAGE"
    ? new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"])
    : kind === "VIDEO"
      ? new Set(["mp4", "webm", "ogv", "mov", "m4v", "mkv"])
      : new Set(["pdf"]);
  if (allowed.has(candidate)) return candidate;
  return kind === "PDF" ? "pdf" : kind === "IMAGE" ? "jpg" : "mp4";
}

export function parseStoredTeacherGroupAttachments(value: unknown): StoredTeacherGroupAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Partial<StoredTeacherGroupAttachment>;
    const kind = record.kind;
    const storage = record.storage;
    if (
      typeof record.id !== "string" ||
      !["IMAGE", "VIDEO", "PDF"].includes(kind ?? "") ||
      typeof record.name !== "string" ||
      typeof record.mime_type !== "string" ||
      !Number.isSafeInteger(record.size_bytes) ||
      !["SUPABASE", "GOOGLE_DRIVE"].includes(storage ?? "")
    ) return [];
    if (storage === "SUPABASE" && typeof record.storage_path !== "string") return [];
    if (storage === "GOOGLE_DRIVE" && typeof record.drive_file_id !== "string") return [];
    return [record as StoredTeacherGroupAttachment];
  }).slice(0, MAX_GROUP_ATTACHMENTS);
}

export function publicTeacherGroupAttachments(announcementId: string, value: unknown): TeacherGroupAttachment[] {
  return parseStoredTeacherGroupAttachments(value).map((attachment) => ({
    id: attachment.id,
    kind: attachment.kind,
    name: attachment.name,
    mime_type: attachment.mime_type,
    size_bytes: attachment.size_bytes,
    storage: attachment.storage,
    url: `/api/teacher-group-attachments/${encodeURIComponent(announcementId)}/${encodeURIComponent(attachment.id)}`,
  }));
}

export function formatAttachmentSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
