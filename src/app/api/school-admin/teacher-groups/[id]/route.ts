// /api/school-admin/teacher-groups/[id] — GET (with full member roster),
// PATCH (rename/desc), DELETE.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MEMBER_SELECT = {
  joined_at: true,
  teacher: {
    select: {
      id: true,
      profile: { select: { id: true, full_name: true, email: true } },
      application: {
        select: {
          country: true,
          city: true,
          qualification: true,
          specialization: true,
          years_of_experience: true,
          languages: true,
        },
      },
    },
  },
} as const;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id },
    select: {
      id: true,
      name: true,
      description: true,
      max_members: true,
      leader_teacher_id: true,
      leader: { select: { id: true, profile: { select: { full_name: true, avatar_url: true } } } },
      created_at: true,
      updated_at: true,
      members: {
        orderBy: { joined_at: "desc" },
        select: MEMBER_SELECT,
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  let body: { name?: string; description?: string | null; max_members?: number; leader_teacher_id?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const existing = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true, _count: { select: { members: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "name required" }, { status: 400 });
    data.name = n.slice(0, 120);
  }
  if (body.description !== undefined) {
    data.description = body.description?.toString().trim().slice(0, 1000) || null;
  }
  if (body.max_members !== undefined) {
    const maxMembers = Number(body.max_members);
    if (!Number.isInteger(maxMembers) || maxMembers < 1 || maxMembers > 500) {
      return NextResponse.json({ error: "max_members must be between 1 and 500" }, { status: 400 });
    }
    if (maxMembers < existing._count.members) {
      return NextResponse.json({ error: "capacity_below_member_count", member_count: existing._count.members }, { status: 409 });
    }
    data.max_members = maxMembers;
  }
  if (body.leader_teacher_id !== undefined) {
    if (body.leader_teacher_id === null || body.leader_teacher_id === "") {
      data.leader_teacher_id = null;
    } else {
      const leaderMembership = await prisma.teacherGroupMember.findUnique({
        where: { group_id_teacher_id: { group_id: id, teacher_id: body.leader_teacher_id } },
        select: { teacher_id: true },
      });
      if (!leaderMembership) return NextResponse.json({ error: "leader_must_be_group_member" }, { status: 400 });
      data.leader_teacher_id = body.leader_teacher_id;
    }
  }

  const group = await prisma.teacherGroup.update({
    where: { id },
    data,
    select: {
      id: true, name: true, description: true, max_members: true,
      leader_teacher_id: true, updated_at: true,
      leader: { select: { id: true, profile: { select: { full_name: true, avatar_url: true } } } },
    },
  });
  return NextResponse.json({ group });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  // Tenant guard before destructive op
  const existing = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teacherGroup.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
