// app/auth/callback/route.ts
//
// Handles two email-based flows from Supabase:
//
//  1. Email confirmation / magic-link (OTP flow):
//     Supabase sends:  /auth/callback?token_hash=xxx&type=signup
//     We call:         supabase.auth.verifyOtp({ token_hash, type })
//
//  2. PKCE code exchange (OAuth / SSO / password recovery):
//     Provider sends:  /auth/callback?code=xxx
//     We call:         supabase.auth.exchangeCodeForSession(code)
//
// After either succeeds the session cookie is set and we redirect the user
// to their role-specific dashboard — UNLESS this is a password-recovery
// link, in which case we must send them to /reset-password instead and
// never let them into a dashboard with the old password still active.
//
// Recovery detection: for the OTP path, Supabase gives us `type=recovery`
// directly. For the PKCE `code=` path it does NOT — Supabase's redirect
// only appends `code`, with no flow-type marker of its own. This used to
// be inferred from the user's `recovery_sent_at` timestamp being "recent"
// (within an arbitrary 1-hour window), which is unreliable: that field is
// set on the user record itself (not per-session), so it can be stale,
// missing, or — worse — still "recent" for an unrelated login shortly
// after a reset was requested. When the heuristic guessed wrong, a
// recovery link would exchange straight into a normal authenticated
// session and redirect to the role dashboard, skipping the password
// change entirely.
//
// Fixed by having /forgot-password append `?flow=recovery` to its own
// `redirectTo` — Supabase preserves that query param and just adds `code`
// alongside it, so we get a deterministic, first-party signal instead of
// guessing.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requestOrigin } from "@/lib/request-origin";

const ROLE_ROUTES: Record<string, string> = {
  OWNER: "/owner",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Redirect back onto the SAME subdomain the email link came from, so the
  // freshly-set session cookie stays on the right tenant host.
  const origin = requestOrigin(request);

  const code       = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const flow       = searchParams.get("flow");
  // Valid email OTP types (excludes "sms" which requires a phone number)
  const type = searchParams.get("type") as
    | "signup" | "recovery" | "email" | "email_change" | "invite" | null;

  const supabase = await createClient();

  // ── 1. Verify the token / exchange the code ──────────────────────────────
  const isRecovery = type === "recovery" || flow === "recovery";

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

  // ── 3. Password-recovery flow — send to reset page, skip role lookup ────
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // ── 4. Ensure the email column on the profile is populated ───────────────
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

  // ── 5. Redirect to role-based dashboard ──────────────────────────────────
  const profile = await prisma.profile
    .findUnique({ where: { id: user.id }, select: { role: true } })
    .catch(() => null);

  const dest = profile?.role ? (ROLE_ROUTES[profile.role] ?? "/student") : "/student";
  return NextResponse.redirect(`${origin}${dest}`);
}
