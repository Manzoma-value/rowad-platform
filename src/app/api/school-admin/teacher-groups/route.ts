// /api/school-admin/teacher-groups — list + create teacher groups.
// Read open to any admin (incl. view-only). Create gated on writer.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groups = await prisma.teacherGroup.findMany({
    where: { school_id: auth.school.id },
    orderBy: [{ updated_at: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      max_members: true,
      leader_teacher_id: true,
      leader: { select: { profile: { select: { full_name: true } } } },
      created_at: true,
      updated_at: true,
      _count: { select: { members: true, join_requests: { where: { status: "PENDING" } } } },
    },
  });
  const features = auth.school.features;
  const openVisibility = !!(
    features &&
    typeof features === "object" &&
    !Array.isArray(features) &&
    (features as Record<string, unknown>).teacher_groups_open_visibility === true
  );
  return NextResponse.json({ groups, openVisibility });
}

export async function PATCH(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { openVisibility?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const current = auth.school.features;
  const features: Record<string, unknown> = current && typeof current === "object" && !Array.isArray(current)
    ? { ...(current as Record<string, unknown>) }
    : {};
  features.teacher_groups_open_visibility = body.openVisibility === true;

  await prisma.school.update({
    where: { id: auth.school.id },
    data: { features: features as Prisma.InputJsonValue },
  });

  return NextResponse.json({ openVisibility: features.teacher_groups_open_visibility });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { name?: string; description?: string; max_members?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const maxMembers = Number(body.max_members ?? 30);
  if (!Number.isInteger(maxMembers) || maxMembers < 1 || maxMembers > 500) {
    return NextResponse.json({ error: "max_members must be between 1 and 500" }, { status: 400 });
  }

  const group = await prisma.teacherGroup.create({
    data: {
      school_id: auth.school.id,
      created_by: auth.profile.id,
      name: name.slice(0, 120),
      description: body.description?.toString().trim().slice(0, 1000) || null,
      max_members: maxMembers,
    },
    select: { id: true, name: true, description: true, max_members: true },
  });
  return NextResponse.json({ group }, { status: 201 });
}
