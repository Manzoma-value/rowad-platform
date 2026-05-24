// app/auth/callback/route.ts
//
// Handles two email-based flows from Supabase:
//
//  1. Email confirmation / magic-link (OTP flow):
//     Supabase sends:  /auth/callback?token_hash=xxx&type=signup
//     We call:         supabase.auth.verifyOtp({ token_hash, type })
//
//  2. PKCE code exchange (OAuth / SSO):
//     Provider sends:  /auth/callback?code=xxx
//     We call:         supabase.auth.exchangeCodeForSession(code)
//
// After either succeeds the session cookie is set and we redirect the user
// to their role-specific dashboard.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const ROLE_ROUTES: Record<string, string> = {
  OWNER: "/owner",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  const code       = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  // Valid email OTP types (excludes "sms" which requires a phone number)
  const type = searchParams.get("type") as
    | "signup" | "recovery" | "email" | "email_change" | "invite" | null;

  const supabase = await createClient();

  // ── 1. Verify the token / exchange the code ──────────────────────────────
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      console.error("[auth/callback] verifyOtp error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=link_invalid`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_params`);
  }

  // ── 2. Get the freshly authenticated user ────────────────────────────────
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    console.error("[auth/callback] getUser error:", getUserError?.message);
    return NextResponse.redirect(`${origin}/login?error=session_error`);
  }

  // ── 3. Ensure the email column on the profile is populated ───────────────
  //       (idempotent — only writes when email is still null)
  if (user.email) {
    await prisma.profile
      .updateMany({
        where: { id: user.id, email: null },
        data:  { email: user.email },
      })
      .catch((e) =>
        console.error("[auth/callback] profile email sync error:", e),
      );
  }

  // ── 4. Redirect to role-based dashboard ──────────────────────────────────
  const profile = await prisma.profile
    .findUnique({ where: { id: user.id }, select: { role: true } })
    .catch(() => null);

  const dest = profile?.role ? (ROLE_ROUTES[profile.role] ?? "/student") : "/student";
  return NextResponse.redirect(`${origin}${dest}`);
}
