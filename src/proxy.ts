import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isWhiteLabelAccountAllowed,
  isWhiteLabelAccountRoleAllowed,
  isWhiteLabelHost,
  parseHost,
} from "@/lib/tenant-host";
import {
  isViewOnlyAccessExpired,
  isViewOnlySchoolAdminWrite,
} from "@/lib/view-only-access";

// ─────────────────────────────────────────────────────────────────────
// Proxy (Next.js middleware) — runs on EVERY request.
//
// Multi-tenant addressing (Phase B):
//   Each school lives on its own subdomain (<slug>.manzoma.sa). On a tenant
//   subdomain we REWRITE the public pages to the school-scoped versions:
//      /         → /schools/<slug>            (school landing)
//      /login    → /schools/<slug>/login
//      /signup   → /schools/<slug>/signup
//   The role apps (/student, /teacher, /school-admin) keep their paths and
//   read the tenant from the logged-in user's session, so they need no
//   rewrites.
//
//   The owner / main host (rowad.manzoma.sa, the apex, localhost, and Vercel
//   preview domains) is NOT a tenant — it behaves exactly as before. This
//   makes the change fully backward-compatible: deploying it changes nothing
//   until real subdomains are pointed at the app.
//
// Latency: getUser() + the profile lookup run in parallel; one profile SELECT
// per request.
// ─────────────────────────────────────────────────────────────────────

// Paths that never need an auth check — skip the cookie/network work.
function isCheapPublicPath(pathname: string): boolean {
  // Static-ish, no-user-state endpoints.
  if (pathname === "/") return true;
  if (pathname === "/forgot-password") return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/schools/")) return true;
  if (pathname.startsWith("/invite/")) return true;
  // Public assessment / share routes that don't touch user state.
  return false;
}

/** Rewrite the current request to a different internal path, keeping the URL. */
function rewriteTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const whiteLabelHost = isWhiteLabelHost(request.headers.get("host"));

  // ── Resolve the tenant from the subdomain (cheap, no DB) ──
  const { slug, isTenant } = parseHost(request.headers.get("host"));

  // Never expose another tenant's public/login surface through the reserved
  // white-label hostname. Tenant pages remain available only on their own
  // subdomain.
  if (whiteLabelHost && pathname.startsWith("/schools/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_authorized");
    return NextResponse.redirect(url);
  }

  // Public invite/workshop flows belong to tenant environments. The closed
  // white-label host presents its own access page instead of rendering or
  // redeeming another tenant's onboarding UI.
  if (
    whiteLabelHost &&
    (pathname.startsWith("/invite/") || pathname.startsWith("/workshop/"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/signup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // On a tenant subdomain, the ROOT is the school's public landing page.
  // Rewrite before any auth work — the landing is fully public.
  if (isTenant && slug && pathname === "/") {
    return rewriteTo(request, `/schools/${slug}`);
  }

  // Cheap public path — bail before any Supabase work.
  // (login/signup are NOT cheap-public, so tenant rewrites for them happen in
  //  the logged-out branch below, after we know the auth state.)
  if (isCheapPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  // Teacher APIs enforce role and activation in their route handlers. Avoid
  // repeating auth and profile network calls for every teacher-page request.
  if (
    !whiteLabelHost &&
    (pathname === "/api/teacher" || pathname.startsWith("/api/teacher/"))
  ) {
    const apiResponse = NextResponse.next({ request });
    apiResponse.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    apiResponse.headers.set("Vary", "Cookie");
    return apiResponse;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Verified claims avoid a remote Auth request on every page and API call.
  // Supabase still refreshes expiring tokens and safely falls back to the
  // Auth server for projects using legacy symmetric signing keys.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const user = typeof claims?.sub === "string"
    ? {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : undefined,
      }
    : null;

  // The investor/demo host is a closed environment. Authentication on any
  // other Rowad tenant does not grant access here, even when the browser has
  // a valid Supabase session cookie.
  if (whiteLabelHost && user && !isWhiteLabelAccountAllowed(user.email)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account is not authorized for this platform" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/white-label-signout";
    url.searchParams.set("error", "not_authorized");
    return NextResponse.redirect(url);
  }

  // No self-registration is exposed on the white-label host. Its single
  // administrator is provisioned server-side.
  const isInviteRedemption =
    pathname.startsWith("/api/invite/") && request.method === "POST";
  if (
    whiteLabelHost &&
    (pathname === "/api/auth/signup" ||
      pathname === "/api/auth/school-signup" ||
      pathname === "/api/workshop-signup" ||
      isInviteRedemption)
  ) {
    return NextResponse.json({ error: "Registration is invitation-only" }, { status: 403 });
  }

  // ════ API routes ════
  if (pathname.startsWith("/api/")) {
    if (user) {
      const { data: apiProfile } = await supabase
        .from("profiles")
        .select("role, is_active, is_view_only, view_only_expires_at")
        .eq("id", user.id)
        .single();

      if (apiProfile?.is_active === false) {
        return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
      }

      if (
        whiteLabelHost &&
        !isWhiteLabelAccountRoleAllowed(user.email, apiProfile?.role)
      ) {
        return NextResponse.json({ error: "Account is not authorized for this platform" }, { status: 403 });
      }

      if (
        apiProfile &&
        isViewOnlyAccessExpired({
          is_view_only: apiProfile.is_view_only,
          view_only_expires_at: apiProfile.view_only_expires_at,
        })
      ) {
        return NextResponse.json({ error: "View-only access expired" }, { status: 403 });
      }

      // Notification read/delete state belongs to the signed-in profile and
      // does not mutate school/platform content, so view-only admins may
      // manage their own inbox just like every other role.
      const isPersonalNotificationMutation = pathname === "/api/notifications";
      if (
        apiProfile &&
        !isPersonalNotificationMutation &&
        isViewOnlySchoolAdminWrite(apiProfile, request.method)
      ) {
        return NextResponse.json(
          { error: "View-only accounts cannot change platform data" },
          { status: 403 },
        );
      }
    }
    if (user) {
      response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
      response.headers.set("Vary", "Cookie");
    }
    return response;
  }

  // ════ Pages ════
  const isProtectedDashboard =
    pathname.startsWith("/student") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/school-admin") ||
    pathname.startsWith("/owner") ||
    pathname === "/deactivated";

  // Logged-out + protected → bounce to /login.
  if (!user && isProtectedDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged-out + non-dashboard (e.g. /login, /signup, /reset-password, /iceCream).
  if (!user) {
    if (whiteLabelHost && pathname === "/signup") {
      return rewriteTo(request, "/white-label-signup");
    }
    // On a tenant subdomain, route the bare /login and /signup to the
    // school-branded pages so the URL stays clean (rowad-albania.manzoma.sa/login).
    if (isTenant && slug) {
      if (pathname === "/login")  return rewriteTo(request, `/schools/${slug}/login`);
      if (pathname === "/signup") return rewriteTo(request, `/schools/${slug}/signup`);
    }
    return response;
  }

  // ── Logged-in: one profile SELECT, one optional student SELECT, run in
  //    parallel with the student onboarding lookup when applicable. ──
  const isStudentPath = pathname.startsWith("/student");

  const [profileRes, studentRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, is_active, is_view_only, view_only_expires_at")
      .eq("id", user.id)
      .single(),
    isStudentPath
      ? supabase
          .from("students")
          .select("onboarding_status")
          .eq("profile_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const profile = profileRes.data;
  const role = profile?.role as string | undefined;
  const isActive = profile?.is_active as boolean | undefined;
  const viewOnlyExpired = profile
    ? isViewOnlyAccessExpired({
        is_view_only: Boolean(profile.is_view_only),
        view_only_expires_at: profile.view_only_expires_at as string | null,
      })
    : false;

  if (whiteLabelHost && !isWhiteLabelAccountRoleAllowed(user.email, role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/white-label-signout";
    url.searchParams.set("error", "not_authorized");
    return NextResponse.redirect(url);
  }

  // ── Deactivation gate ──
  // Only act on explicit false — null/undefined means "unknown, let through".
  if ((isActive === false || viewOnlyExpired) && pathname !== "/deactivated") {
    const url = request.nextUrl.clone();
    url.pathname = "/deactivated";
    if (viewOnlyExpired) url.searchParams.set("reason", "expired");
    return NextResponse.redirect(url);
  }
  // Active user on /deactivated → bounce to their dashboard.
  if (isActive === true && !viewOnlyExpired && pathname === "/deactivated") {
    const url = request.nextUrl.clone();
    if (role === "OWNER")             { url.pathname = "/owner"; }
    else if (role === "SCHOOL_ADMIN") { url.pathname = "/school-admin"; }
    else if (role === "TEACHER")      { url.pathname = "/teacher"; }
    else                              { url.pathname = "/student"; }
    return NextResponse.redirect(url);
  }
  // Pages that anyone authenticated can see without role-guard.
  if (pathname === "/deactivated" || pathname === "/reset-password") {
    return response;
  }

  // Logged-in → away from /login or /signup.
  if (pathname === "/login" || pathname === "/signup") {
    const url = request.nextUrl.clone();
    if (role === "OWNER")        { url.pathname = "/owner";        return NextResponse.redirect(url); }
    if (role === "SCHOOL_ADMIN") { url.pathname = "/school-admin"; return NextResponse.redirect(url); }
    if (role === "TEACHER")      { url.pathname = "/teacher";      return NextResponse.redirect(url); }
    if (role === "STUDENT")      { url.pathname = "/student";      return NextResponse.redirect(url); }
  }

  // ── Role-guards ──
  if (pathname.startsWith("/owner")        && role !== "OWNER")        return redirectLogin(request);
  if (pathname.startsWith("/school-admin") && role !== "SCHOOL_ADMIN") return redirectLogin(request);
  if (pathname.startsWith("/teacher")      && role !== "TEACHER")      return redirectLogin(request);
  if (pathname.startsWith("/student")      && role !== "STUDENT")      return redirectLogin(request);

  // ── Student onboarding routing (only when on a /student/* page) ──
  if (isStudentPath && role === "STUDENT") {
    const status = studentRes.data?.onboarding_status as string | undefined;

    if (status) {
      const allowedPaths: Record<string, string[]> = {
        PENDING_INTAKE:             ["/student/intake"],
        INTAKE_SUBMITTED:           ["/student/waiting"],
        SCHOOL_ASSIGNED:            ["/student/school-assigned", "/student/placement"],
        SCHOOL_PLACEMENT_SUBMITTED: ["/student/waiting-class"],
        CLASS_ASSIGNED:             ["/student/welcome"],
      };
      const defaultRoute: Record<string, string> = {
        PENDING_INTAKE:             "/student/intake",
        INTAKE_SUBMITTED:           "/student/waiting",
        SCHOOL_ASSIGNED:            "/student/school-assigned",
        SCHOOL_PLACEMENT_SUBMITTED: "/student/waiting-class",
        CLASS_ASSIGNED:             "/student/welcome",
      };

      const allowed = allowedPaths[status] ?? [];
      const isAllowed =
        allowed.includes(pathname) ||
        (status === "CLASS_ASSIGNED" &&
          (pathname === "/student" || pathname.startsWith("/student/")));

      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = defaultRoute[status] ?? "/student";
        return NextResponse.redirect(url);
      }
    }
  }

  if (isProtectedDashboard) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("Vary", "Cookie");
  }
  return response;
}

function redirectLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?!tsx?$).+).*)"],
};
