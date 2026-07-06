// /api/school-admin/workshops/[id]
//   GET    — full workshop with the signup QR embedded (data-URI PNG).
//   PATCH  — rename / dates / status.
//   DELETE — remove the workshop (cascades to attendance + codes).
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { qrDataUri } from "@/lib/qr";

export const dynamic = "force-dynamic";

function absoluteSignupUrl(req: Request, token: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/workshop/${token}`;
  // Fallback — derive from the incoming request. Trust the forwarded host
  // set by our reverse proxy (Vercel does the right thing here).
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/workshop/${token}`;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      end_date: true,
      status: true,
      signup_token: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signupUrl = absoluteSignupUrl(req, workshop.signup_token);
  const signupQrPng = await qrDataUri(signupUrl);

  return NextResponse.json({ workshop, signupUrl, signupQrPng });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { title?: string; description?: string | null; start_date?: string | null; end_date?: string | null; status?: "OPEN" | "CLOSED" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const existing = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "title required" }, { status: 400 });
    data.title = t.slice(0, 200);
  }
  if (body.description !== undefined) {
    data.description = body.description?.toString().trim().slice(0, 1000) || null;
  }
  if (body.start_date !== undefined) data.start_date = body.start_date ? new Date(body.start_date) : null;
  if (body.end_date !== undefined)   data.end_date   = body.end_date   ? new Date(body.end_date)   : null;
  if (body.status === "OPEN" || body.status === "CLOSED") data.status = body.status;

  const workshop = await prisma.workshop.update({
    where: { id }, data,
    select: { id: true, title: true, status: true },
  });
  return NextResponse.json({ workshop });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const existing = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workshop.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
