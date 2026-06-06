import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/lib/tenant-host";

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

  // ── Resolve the tenant from the subdomain (cheap, no DB) ──
  const { slug, isTenant } = parseHost(request.headers.get("host"));

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

  const { data: { user } } = await supabase.auth.getUser();

  // ════ API routes ════
  if (pathname.startsWith("/api/")) {
    // Only the user-scoped APIs need a deactivation gate.
    const needsActivationCheck =
      pathname.startsWith("/api/student") ||
      pathname.startsWith("/api/teacher") ||
      pathname.startsWith("/api/hub");

    if (needsActivationCheck && user) {
      const { data: apiProfile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .single();
      if (apiProfile?.is_active === false) {
        return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
      }
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
      .select("role, is_active")
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

  // ── Deactivation gate ──
  // Only act on explicit false — null/undefined means "unknown, let through".
  if (isActive === false && pathname !== "/deactivated") {
    const url = request.nextUrl.clone();
    url.pathname = "/deactivated";
    return NextResponse.redirect(url);
  }
  // Active user on /deactivated → bounce to their dashboard.
  if (isActive === true && pathname === "/deactivated") {
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
