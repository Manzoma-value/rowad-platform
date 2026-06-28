// GET /api/school-admin/owner-reports/[id] — full report payload for the
// premium viewer. Hard tenant guard: must be PUBLISHED + belong to this school.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const report = await prisma.ownerReport.findFirst({
    where: { id, status: "PUBLISHED", school_id: auth.school.id },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      report_date: true,
      introduction: true,
      closing_note: true,
      blocks: true,
      images: true,
      attachments: true,
      links: true,
      published_at: true,
      school: { select: { id: true, name: true, name_alt: true } },
      author: { select: { full_name: true } },
    },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}
