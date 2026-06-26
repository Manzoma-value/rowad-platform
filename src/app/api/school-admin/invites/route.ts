// src/app/api/school-admin/invites/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// ── GET /api/school-admin/invites ──────────────────────────────────────────
// Returns all teacher invites for the school, newest first.

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invites = await prisma.invite.findMany({
    where: {
      school_id: auth.school.id,
      type: "TEACHER",
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      token: true,
      type: true,
      is_active: true,
      use_count: true,
      max_uses: true,
      expires_at: true,
      used_at: true,
      created_at: true,
      creator: {
        select: { full_name: true },
      },
      usedBy: {
        select: { full_name: true },
      },
    },
  });

  return NextResponse.json({ invites });
}

// ── POST /api/school-admin/invites ─────────────────────────────────────────
// Creates a new teacher invite with a 14-day expiry.
// Body: {} (no required fields for teacher invites)

export async function POST() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 14);

  const invite = await prisma.invite.create({
    data: {
      token: nanoid(32),
      type: "TEACHER",
      school_id: auth.school.id,
      created_by: auth.profile.id,
      is_active: true,
      use_count: 0,
      max_uses: 1,       // teacher invites are single-use
      expires_at,
    },
    select: {
      id: true,
      token: true,
      type: true,
      is_active: true,
      use_count: true,
      max_uses: true,
      expires_at: true,
      created_at: true,
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}