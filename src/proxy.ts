import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // API routes — check deactivation for student/teacher/hub APIs
  if (pathname.startsWith("/api/")) {
    if (
      pathname.startsWith("/api/student") ||
      pathname.startsWith("/api/teacher") ||
      pathname.startsWith("/api/hub")
    ) {
      if (user) {
        const { data: apiProfile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", user.id)
          .single();
        // Only block when explicitly deactivated. Never block on null/undefined.
        if (apiProfile?.is_active === false) {
          return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
        }
      }
    }
    return response;
  }

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||   // ← password reset request page
    pathname === "/reset-password" ||    // ← password reset form (after email link)
    pathname.startsWith("/auth/") ||     // ← email-link / OAuth callback handler (MUST be reachable logged-out)
    pathname.startsWith("/schools/") ||
    pathname.startsWith("/invite/");     // ← invite pages are public

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const role = profile?.role as string | undefined;
    const isActive = profile?.is_active as boolean | undefined;

    // ── Deactivated account gate ──────────────────────────────────────────
    // ONLY redirect when we EXPLICITLY see is_active === false.
    // Never act on null/undefined — that would bounce valid users.
    if (isActive === false && pathname !== "/deactivated") {
      const url = request.nextUrl.clone();
      url.pathname = "/deactivated";
      return NextResponse.redirect(url);
    }
    // If a known-active user lands on /deactivated, send them to their dashboard.
    if (isActive === true && pathname === "/deactivated") {
      const url = request.nextUrl.clone();
      if (role === "OWNER")             { url.pathname = "/owner"; }
      else if (role === "SCHOOL_ADMIN") { url.pathname = "/school-admin"; }
      else if (role === "TEACHER")      { url.pathname = "/teacher"; }
      else                              { url.pathname = "/student"; }
      return NextResponse.redirect(url);
    }
    // /deactivated has no role-guard below; let it render for anyone authenticated.
    if (pathname === "/deactivated") {
      return response;
    }

    // Redirect logged-in users away from login/signup
    if (pathname === "/login" || pathname === "/signup") {
      const url = request.nextUrl.clone();
      if (role === "OWNER")        { url.pathname = "/owner";        return NextResponse.redirect(url); }
      if (role === "SCHOOL_ADMIN") { url.pathname = "/school-admin"; return NextResponse.redirect(url); }
      if (role === "TEACHER")      { url.pathname = "/teacher";      return NextResponse.redirect(url); }
      if (role === "STUDENT")      { url.pathname = "/student";      return NextResponse.redirect(url); }
    }

    // If a logged-in user hits an invite page, let them through
    // (the page itself handles the "already logged in" case gracefully)

    if (pathname.startsWith("/owner") && role !== "OWNER") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/school-admin") && role !== "SCHOOL_ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/teacher") && role !== "TEACHER") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/student") && role !== "STUDENT") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/student") && role === "STUDENT") {
      const { data: student } = await supabase
        .from("students")
        .select("onboarding_status")
        .eq("profile_id", user.id)
        .single();

      const status = student?.onboarding_status as string | undefined;

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
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?!tsx?$).+).*)"],
};