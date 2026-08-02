import { createHmac, timingSafeEqual } from "node:crypto";

type DriveUploadSession = {
  uploadUrl: string;
  workshopId: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: number;
};

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("upload_session_not_configured");
  return key;
}

function signature(payload: string) {
  return createHmac("sha256", signingKey()).update(`drive-upload:${payload}`).digest("base64url");
}

export function createDriveUploadSession(value: Omit<DriveUploadSession, "expiresAt">) {
  const payload = Buffer.from(JSON.stringify({ ...value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readDriveUploadSession(token: string): DriveUploadSession | null {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DriveUploadSession;
    if (!value.uploadUrl.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) return null;
    if (!value.workshopId || !value.mimeType.startsWith("video/") || !Number.isSafeInteger(value.sizeBytes)) return null;
    if (!Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}
