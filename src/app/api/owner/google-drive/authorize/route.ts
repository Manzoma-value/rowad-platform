// GET /api/owner/google-drive/authorize
// Owner-only. Redirects to Google's OAuth consent screen to (re)issue the
// refresh token used by the workshop-video direct-upload flow. Always sends
// prompt=consent so Google reliably reissues a fresh refresh_token even if
// this Google account has authorized the app before (Google otherwise only
// returns a refresh_token on the very first consent).
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { requestOrigin } from "@/lib/request-origin";
import { signGoogleDriveOAuthState } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "google_drive_oauth_client_id_missing" }, { status: 503 });
  }

  let state: string;
  try {
    state = signGoogleDriveOAuthState(owner.id);
  } catch {
    return NextResponse.json({ error: "oauth_state_not_configured" }, { status: 503 });
  }

  const redirectUri = `${requestOrigin(req)}/api/owner/google-drive/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
