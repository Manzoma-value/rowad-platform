// POST /api/owner/reports/[id]/unpublish — flip PUBLISHED → DRAFT.
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

  const updated = await prisma.ownerReport.update({
    where: { id },
    data: { status: "DRAFT" },
    select: { id: true, status: true },
  }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report: updated });
}
