// /api/school-admin/workshops/[id]/attendance-code
//
//   GET  — returns today's attendance code + QR data-URI, IF the admin has
//          already generated one today. Otherwise returns `{ code: null }`.
//   POST — generate a NEW attendance code for today. If one already exists
//          for today it is REPLACED (previous stops working).
//
// This is what powers the "show today's attendance QR" button on the admin
// workshop detail page.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { qrDataUri } from "@/lib/qr";
import { newAttendanceCode } from "@/lib/workshop-tokens";

export const dynamic = "force-dynamic";

function todayDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function absoluteAttendUrl(req: Request, code: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/workshop/attend/${code}`;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/workshop/attend/${code}`;
}

async function requireWorkshop(id: string, school_id: string) {
  return prisma.workshop.findFirst({
    where: { id, school_id }, select: { id: true, status: true },
  });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const w = await requireWorkshop(id, auth.school.id);
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (w.status === "CLOSED") return NextResponse.json({ error: "workshop_closed" }, { status: 410 });

  const today = todayDate();
  const existing = await prisma.workshopAttendanceCode.findFirst({
    where: { workshop_id: id, day_date: today },
    orderBy: { created_at: "desc" },
    select: { code: true, created_at: true },
  });
  if (!existing) return NextResponse.json({ code: null });

  const url = absoluteAttendUrl(req, existing.code);
  const qrPng = await qrDataUri(url);
  return NextResponse.json({ code: existing.code, url, qrPng, created_at: existing.created_at });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const w = await requireWorkshop(id, auth.school.id);
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = todayDate();
  // Wipe any prior codes for today so only the newest one works. Prevents
  // accidental double-QR-in-flight and matches the "regenerate" intent.
  await prisma.workshopAttendanceCode.deleteMany({
    where: { workshop_id: id, day_date: today },
  });

  const code = newAttendanceCode();
  const row = await prisma.workshopAttendanceCode.create({
    data: {
      workshop_id: id, code, day_date: today, created_by: auth.profile.id,
    },
    select: { code: true, day_date: true, created_at: true },
  });

  const url = absoluteAttendUrl(req, row.code);
  const qrPng = await qrDataUri(url);
  return NextResponse.json({ code: row.code, url, qrPng, created_at: row.created_at });
}
