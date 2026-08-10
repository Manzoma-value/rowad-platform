// GET /api/owner/google-drive/status
// Owner-only. Live health check for the direct-upload OAuth credential —
// actually exchanges the stored refresh token for an access token, the exact
// same call the upload route makes, so this reports the truth rather than
// just "an env var is set".
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { googleDriveOAuthAccessToken, googleDriveUploadFolderId } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    googleDriveUploadFolderId();
  } catch {
    return NextResponse.json({ connected: false, reason: "folder_not_configured" });
  }

  try {
    await googleDriveOAuthAccessToken();
    return NextResponse.json({ connected: true });
  } catch (error) {
    return NextResponse.json({ connected: false, reason: error instanceof Error ? error.message : "unknown" });
  }
}
