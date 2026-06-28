// /api/owner/reports/[id] — GET, PATCH, DELETE
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FULL_SELECT = {
  id: true,
  school_id: true,
  title: true,
  subtitle: true,
  description: true,
  report_date: true,
  introduction: true,
  closing_note: true,
  status: true,
  blocks: true,
  images: true,
  attachments: true,
  links: true,
  created_at: true,
  updated_at: true,
  published_at: true,
  school: { select: { id: true, name: true, name_alt: true } },
  author: { select: { id: true, full_name: true } },
} as const;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const report = await prisma.ownerReport.findUnique({
    where: { id },
    select: FULL_SELECT,
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}

type Patch = Partial<{
  school_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  report_date: string | null;
  introduction: string | null;
  closing_note: string | null;
  blocks: unknown;
  images: unknown;
  attachments: unknown;
  links: unknown;
}>;

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: Patch;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const existing = await prisma.ownerReport.findUnique({
    where: { id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If school is being changed, verify it exists.
  if (body.school_id) {
    const s = await prisma.school.findUnique({ where: { id: body.school_id }, select: { id: true } });
    if (!s) return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.school_id) data.school_id = body.school_id;
  if (body.title !== undefined) data.title = body.title.trim().slice(0, 240);
  if (body.subtitle !== undefined) data.subtitle = body.subtitle?.toString().trim().slice(0, 480) || null;
  if (body.description !== undefined) data.description = body.description?.toString().trim().slice(0, 2000) || null;
  if (body.report_date !== undefined) data.report_date = body.report_date ? new Date(body.report_date) : null;
  if (body.introduction !== undefined) data.introduction = body.introduction?.toString().slice(0, 8000) || null;
  if (body.closing_note !== undefined) data.closing_note = body.closing_note?.toString().slice(0, 4000) || null;
  if (body.blocks !== undefined) data.blocks = body.blocks ?? [];
  if (body.images !== undefined) data.images = body.images ?? [];
  if (body.attachments !== undefined) data.attachments = body.attachments ?? [];
  if (body.links !== undefined) data.links = body.links ?? [];

  const report = await prisma.ownerReport.update({
    where: { id },
    data,
    select: FULL_SELECT,
  });
  return NextResponse.json({ report });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  await prisma.ownerReport.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
