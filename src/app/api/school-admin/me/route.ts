// GET /api/school-admin/me
// Returns activation + view-only status so the layout can show a deactivated
// page, render a read-only banner, and hide mutating UI controls.
import { NextResponse } from "next/server";
import { getSchoolAdminStatus, requireSchoolAdmin } from "@/lib/school-admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getSchoolAdminStatus();
  if (status !== "ok") {
    return NextResponse.json(
      { status, is_view_only: status === "expired", view_only_expires_at: null },
      { status: status === "unauthorized" ? 401 : 403 },
    );
  }

  const auth = await requireSchoolAdmin();
  const is_view_only = auth?.profile.is_view_only ?? false;
  return NextResponse.json({
    status,
    is_view_only,
    view_only_expires_at: auth?.profile.view_only_expires_at?.toISOString() ?? null,
  });
}
