// GET /api/school-admin/owner-reports — list PUBLISHED reports for THIS school.
// View-only and writer admins both have access (read-only is fine).
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reports = await prisma.ownerReport.findMany({
    where: {
      school_id: auth.school.id,
      status: "PUBLISHED",
    },
    orderBy: [{ published_at: "desc" }, { updated_at: "desc" }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      report_date: true,
      published_at: true,
      author: { select: { full_name: true } },
    },
    take: 100,
  });

  return NextResponse.json({ reports });
}
