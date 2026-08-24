import { createHmac, timingSafeEqual } from "node:crypto";
import type { StoredTeacherGroupAttachment } from "@/lib/teacher-group-attachments";

type AttachmentContext = {
  groupId: string;
  schoolId: string;
  profileId: string;
};

export type TeacherGroupAttachmentClaim = AttachmentContext & StoredTeacherGroupAttachment & {
  expiresAt: number;
};

type TeacherGroupDriveUploadSession = AttachmentContext & {
  uploadUrl: string;
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: number;
};

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("attachment_upload_not_configured");
  return key;
}

function sign(namespace: string, payload: string) {
  return createHmac("sha256", signingKey()).update(`${namespace}:${payload}`).digest("base64url");
}

function encode<T extends object>(namespace: string, value: T) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(namespace, payload)}`;
}

function decode<T>(namespace: string, token: string): T | null {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expected = sign(namespace, payload);
  const supplied = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createTeacherGroupAttachmentClaim(
  value: Omit<TeacherGroupAttachmentClaim, "expiresAt">,
) {
  return encode("teacher-group-attachment", { ...value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
}

export function readTeacherGroupAttachmentClaim(token: string): TeacherGroupAttachmentClaim | null {
  const value = decode<TeacherGroupAttachmentClaim>("teacher-group-attachment", token);
  if (!value || !Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) return null;
  if (!value.groupId || !value.schoolId || !value.profileId || !value.id || !value.name || !value.mime_type) return null;
  if (!Number.isSafeInteger(value.size_bytes) || value.size_bytes <= 0) return null;
  if (value.storage === "SUPABASE" && (!value.storage_path || value.storage_path.includes(".."))) return null;
  if (value.storage === "GOOGLE_DRIVE" && !value.drive_file_id) return null;
  return value;
}

export function createTeacherGroupDriveUploadSession(
  value: Omit<TeacherGroupDriveUploadSession, "expiresAt">,
) {
  return encode("teacher-group-drive-upload", { ...value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
}

export function readTeacherGroupDriveUploadSession(token: string): TeacherGroupDriveUploadSession | null {
  const value = decode<TeacherGroupDriveUploadSession>("teacher-group-drive-upload", token);
  if (!value || !Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) return null;
  if (!value.uploadUrl?.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) return null;
  if (!value.groupId || !value.schoolId || !value.profileId || !value.id || !value.name) return null;
  if (!value.mimeType?.startsWith("video/") || !Number.isSafeInteger(value.sizeBytes) || value.sizeBytes <= 0) return null;
  return value;
}
