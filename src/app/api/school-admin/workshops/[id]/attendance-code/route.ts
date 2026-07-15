// A workshop has one permanent attendance QR. The scan endpoint resolves the
// attendance day at check-in time and records one row per teacher per day.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { qrDataUri } from "@/lib/qr";
import { newAttendanceCode } from "@/lib/workshop-tokens";

export const dynamic = "force-dynamic";

function absoluteAttendUrl(req: Request, code: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/workshop/attend/${code}`;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/workshop/attend/${code}`;
}

async function attendancePayload(req: Request, code: string, createdAt: Date) {
  const url = absoluteAttendUrl(req, code);
  return { code, url, qrPng: await qrDataUri(url), created_at: createdAt };
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { attendance_token: true, created_at: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!workshop.attendance_token) return NextResponse.json({ code: null });
  return NextResponse.json(await attendancePayload(req, workshop.attendance_token, workshop.created_at));
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { attendance_token: true, created_at: true, status: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workshop.status === "CLOSED") return NextResponse.json({ error: "workshop_closed" }, { status: 410 });

  if (workshop.attendance_token) {
    return NextResponse.json(await attendancePayload(req, workshop.attendance_token, workshop.created_at));
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newAttendanceCode();
    try {
      const updated = await prisma.workshop.update({
        where: { id },
        data: { attendance_token: code },
        select: { attendance_token: true, updated_at: true },
      });
      return NextResponse.json(await attendancePayload(req, updated.attendance_token!, updated.updated_at));
    } catch {
      // Retry the extremely unlikely global token collision.
    }
  }
  return NextResponse.json({ error: "Failed to create attendance QR" }, { status: 500 });
}
