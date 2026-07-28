import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { isViewOnlyAccessExpired } from "@/lib/view-only-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberships = await prisma.schoolAdminMember.findMany({
    where: {
      school_id: auth.school.id,
      profile: { role: "SCHOOL_ADMIN", is_view_only: true },
    },
    select: {
      profile: {
        select: {
          id: true,
          full_name: true,
          email: true,
          is_active: true,
          is_view_only: true,
          view_only_expires_at: true,
          created_at: true,
        },
      },
    },
    orderBy: { profile: { full_name: "asc" } },
  });

  return NextResponse.json({
    admins: memberships.map(({ profile }) => ({
      ...profile,
      access_expired: isViewOnlyAccessExpired(profile),
    })),
  });
}
