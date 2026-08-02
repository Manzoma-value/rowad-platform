import { GoogleAuth, OAuth2Client } from "google-auth-library";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
let cachedAuth: GoogleAuth | null = null;
let cachedOAuthClient: OAuth2Client | null = null;

type DriveVideoMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  trashed?: boolean;
  capabilities?: { canDownload?: boolean };
  videoMediaMetadata?: { durationMillis?: string };
};

function credentials() {
  const client_email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const private_key = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!client_email || !private_key) throw new Error("drive_not_configured");
  return { client_email, private_key };
}

export function googleDriveServiceAccountEmail() {
  return process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim() ?? "";
}

export function extractGoogleDriveFileId(value: string): string | null {
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{20,}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!/(^|\.)drive\.google\.com$/i.test(url.hostname)) return null;
    const pathMatch = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    const id = pathMatch?.[1] ?? url.searchParams.get("id");
    return id && /^[A-Za-z0-9_-]{20,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function googleDriveAccessToken() {
  cachedAuth ??= new GoogleAuth({ credentials: credentials(), scopes: [DRIVE_SCOPE] });
  const client = await cachedAuth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("drive_auth_failed");
  return token.token;
}

function googleDriveOAuthClient() {
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) throw new Error("drive_upload_not_configured");
  if (!cachedOAuthClient) {
    cachedOAuthClient = new OAuth2Client(clientId, clientSecret);
    cachedOAuthClient.setCredentials({ refresh_token: refreshToken });
  }
  return cachedOAuthClient;
}

export function googleDriveUploadFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_UPLOAD_FOLDER_ID?.trim();
  if (!folderId) throw new Error("drive_upload_folder_not_configured");
  return folderId;
}

export async function googleDriveOAuthAccessToken() {
  try {
    const token = await googleDriveOAuthClient().getAccessToken();
    if (!token.token) throw new Error("drive_upload_auth_failed");
    return token.token;
  } catch (error) {
    console.error("[google-drive OAuth]", error instanceof Error ? error.message : error);
    throw new Error("drive_upload_auth_failed");
  }
}

export async function getGoogleDriveVideo(fileId: string) {
  const token = await googleDriveAccessToken();
  const fields = "id,name,mimeType,size,trashed,capabilities(canDownload),videoMediaMetadata(durationMillis)";
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 404) throw new Error("drive_file_not_found");
  if (response.status === 403) throw new Error("drive_file_not_shared");
  if (!response.ok) throw new Error("drive_lookup_failed");
  const file = await response.json() as DriveVideoMetadata;
  if (file.trashed) throw new Error("drive_file_not_found");
  if (!file.mimeType?.startsWith("video/")) throw new Error("drive_not_video");
  if (file.capabilities?.canDownload === false) throw new Error("drive_download_disabled");
  const rawSize = Number(file.size);
  const rawDuration = Number(file.videoMediaMetadata?.durationMillis);
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: Number.isSafeInteger(rawSize) && rawSize > 0 && rawSize <= 2_147_483_647 ? rawSize : null,
    durationSeconds: Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration / 1000) : null,
  };
}
