// /api/school-admin/workshops
//   GET  — list all workshops for this school (most recent first).
//   POST — create a new workshop with a fresh signup_token.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { newSignupToken } from "@/lib/workshop-tokens";
import { AUDIENCES, cleanSchedule, workshopDates } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workshops = await prisma.workshop.findMany({
    where: { school_id: auth.school.id },
    orderBy: [{ start_date: "asc" }, { created_at: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      audience: true,
      audience_other: true,
      start_date: true,
      end_date: true,
      schedule: true,
      materials: true,
      status: true,
      signup_token: true,
      created_at: true,
      _count: {
        select: {
          signed_up_teachers: true,
          attendance: true,
        },
      },
    },
  });
  return NextResponse.json({ workshops });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; description?: string; audience?: string[]; audience_other?: string; start_date?: string; end_date?: string; schedule?: unknown; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const schedule = cleanSchedule(body.schedule);
  const dates = workshopDates(schedule, body.start_date, body.end_date);
  const audience = Array.from(new Set((body.audience ?? []).filter((item) => AUDIENCES.includes(item as typeof AUDIENCES[number]))));
  if (!audience.length) return NextResponse.json({ error: "audience required" }, { status: 400 });

  // Retry on the (extremely rare) signup_token collision.
  let workshop = null;
  for (let attempt = 0; attempt < 3 && !workshop; attempt++) {
    try {
      workshop = await prisma.workshop.create({
        data: {
          school_id: auth.school.id,
          created_by: auth.profile.id,
          title: title.slice(0, 200),
          description: body.description?.toString().trim().slice(0, 1000) || null,
          audience,
          audience_other: audience.includes("OTHER") ? body.audience_other?.trim().slice(0, 120) || null : null,
          start_date: dates.start ? new Date(`${dates.start}T00:00:00Z`) : null,
          end_date: dates.end ? new Date(`${dates.end}T00:00:00Z`) : null,
          schedule,
          notes: body.notes?.trim().slice(0, 5000) || null,
          signup_token: newSignupToken(),
        },
        select: { id: true, signup_token: true },
      });
    } catch { /* collision or transient error — retry with a new token */ }
  }
  if (!workshop) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  return NextResponse.json({ workshop }, { status: 201 });
}
