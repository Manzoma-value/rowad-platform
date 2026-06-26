// school admin auth
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireSchoolAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    console.error("[requireSchoolAdmin] FAIL step 1 — no user session. Supabase error:", userError?.message ?? "none");
    return null;
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) {
    console.error("[requireSchoolAdmin] FAIL step 2 — no profile found for user id:", user.id);
    return null;
  }
  if (profile.role !== "SCHOOL_ADMIN") {
    console.error("[requireSchoolAdmin] FAIL step 2 — wrong role:", profile.role, "for user id:", user.id);
    return null;
  }

  // Deactivated admins are blocked from all school-admin API routes
  if (!profile.is_active) {
    console.error("[requireSchoolAdmin] FAIL step 3 — profile is_active=false for user id:", user.id);
    return null;
  }

  let school;
  try {
    const membership = await prisma.schoolAdminMember.findFirst({
      where: { profile_id: profile.id },
      include: { school: true },
    });
    if (!membership) {
      console.error("[requireSchoolAdmin] FAIL step 4 — no school_admins membership for profile:", profile.id, "(user:", user.id, ")");
      return null;
    }
    school = membership.school;
  } catch (err) {
    console.error("[requireSchoolAdmin] FAIL step 4 — DB error querying school_admins:", err);
    return null;
  }

  return { profile, school };
}

/**
 * Like requireSchoolAdmin() but ALSO refuses if the admin is view-only
 * (e.g. an investor demo account). Use on every write endpoint
 * (POST/PATCH/PUT/DELETE) under /api/school-admin.
 *
 * Returns null on any failure — the route should respond 403.
 */
export async function requireSchoolAdminWriter() {
  const auth = await requireSchoolAdmin();
  if (!auth) return null;
  if (auth.profile.is_view_only) {
    console.error("[requireSchoolAdminWriter] BLOCKED — view-only profile attempted write:", auth.profile.id);
    return null;
  }
  return auth;
}

/**
 * Returns the raw activation status so the layout can distinguish
 * "deactivated" (show deactivated page) from "unauthorized" (redirect).
 */
export async function getSchoolAdminStatus(): Promise<"ok" | "deactivated" | "unauthorized"> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "unauthorized";

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, is_active: true },
  });
  if (!profile || profile.role !== "SCHOOL_ADMIN") return "unauthorized";
  if (!profile.is_active) return "deactivated";
  return "ok";
}
