// /api/owner/reports — list every owner report (DRAFT + PUBLISHED) for the
// owner's dashboard; create a new one.
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const statusQ = url.searchParams.get("status"); // "DRAFT" | "PUBLISHED" | null (all)
  const schoolQ = url.searchParams.get("school_id");

  const where: Record<string, unknown> = {};
  if (statusQ === "DRAFT" || statusQ === "PUBLISHED") where.status = statusQ;
  if (schoolQ) where.school_id = schoolQ;

  const reports = await prisma.ownerReport.findMany({
    where,
    orderBy: [{ updated_at: "desc" }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      status: true,
      report_date: true,
      created_at: true,
      updated_at: true,
      published_at: true,
      school: { select: { id: true, name: true, name_alt: true } },
    },
    take: 200,
  });

  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { school_id?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const school_id = body.school_id?.trim();
  const title = body.title?.trim();
  if (!school_id) return NextResponse.json({ error: "school_id required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const school = await prisma.school.findUnique({ where: { id: school_id }, select: { id: true } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const report = await prisma.ownerReport.create({
    data: {
      school_id,
      created_by: auth.id,
      title,
      status: "DRAFT",
    },
    select: { id: true },
  });
  return NextResponse.json({ report }, { status: 201 });
}
