// Owner invite management — ADMIN type invites
// POST: owner creates an invite link for a school admin
// GET:  owner lists all admin invites across all schools
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { z } from "zod";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

// ── GET /api/owner/invites ─────────────────────────────────────────────────────
export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invites = await prisma.invite.findMany({
    where: { type: "ADMIN" },
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
      school: { select: { id: true, name: true } },
      creator: { select: { full_name: true } },
      usedBy: { select: { full_name: true } },
    },
  });

  return NextResponse.json({ invites });
}

// ── POST /api/owner/invites ────────────────────────────────────────────────────
const CreateSchema = z.object({
  school_id: z.string().uuid("معرّف المنصة غير صالح"),
});

export async function POST(req: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const result = CreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { school_id } = result.data;

  // Verify school exists
  const school = await prisma.school.findUnique({
    where: { id: school_id },
    select: { id: true },
  });
  if (!school) {
    return NextResponse.json({ error: "المنصة غير موجودة" }, { status: 404 });
  }

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 30); // 30-day expiry for admin invites

  const invite = await prisma.invite.create({
    data: {
      token: nanoid(32),
      type: "ADMIN",
      school_id,
      created_by: owner.id,
      is_active: true,
      use_count: 0,
      max_uses: 1,
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
      school: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
