import { NextResponse } from "next/server";
import { getSchoolAdminStatus, requireSchoolAdmin } from "@/lib/school-admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) {
    const status = await getSchoolAdminStatus();
    return NextResponse.json(
      { status, is_view_only: status === "expired", view_only_expires_at: null },
      { status: status === "unauthorized" ? 401 : 403 },
    );
  }

  const school = {
    name: auth.school.name,
    name_alt: auth.school.name_alt,
    language: auth.school.language,
    slug: auth.school.slug,
    is_active: auth.school.is_active,
  };
  if (!school.is_active) {
    return NextResponse.json({ error: "school_deactivated", school });
  }

  return NextResponse.json({
    status: "ok",
    school,
    adminName: auth.profile.full_name,
    avatar_url: auth.profile.avatar_url,
    is_view_only: auth.profile.is_view_only,
    view_only_expires_at: auth.profile.view_only_expires_at?.toISOString() ?? null,
  });
}
