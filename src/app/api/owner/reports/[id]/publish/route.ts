// POST /api/owner/reports/[id]/publish — flip DRAFT → PUBLISHED (idempotent)
// POST /api/owner/reports/[id]/unpublish — flip back (separate route below)
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const report = await prisma.ownerReport.findUnique({
    where: { id },
    select: { id: true, status: true, title: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!report.title?.trim()) {
    return NextResponse.json({ error: "Report needs a title before publishing" }, { status: 409 });
  }

  const updated = await prisma.ownerReport.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      published_at: report.status === "PUBLISHED" ? undefined : new Date(),
    },
    select: { id: true, status: true, published_at: true },
  });
  return NextResponse.json({ report: updated });
}
