// GET /api/teacher/groups — list groups the calling teacher belongs to.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const school = await prisma.school.findUnique({
    where: { id: auth.teacher.school_id },
    select: { features: true },
  });
  const openVisibility = !!(
    school?.features &&
    typeof school.features === "object" &&
    !Array.isArray(school.features) &&
    (school.features as Record<string, unknown>).teacher_groups_open_visibility === true
  );

  if (openVisibility) {
    const groups = await prisma.teacherGroup.findMany({
      where: { school_id: auth.teacher.school_id },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        updated_at: true,
        members: {
          where: { teacher_id: auth.teacher.id },
          select: { joined_at: true },
          take: 1,
        },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json({
      openVisibility,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        updated_at: g.updated_at,
        joined_at: g.members[0]?.joined_at ?? null,
        member_count: g._count.members,
        is_member: g.members.length > 0,
      })),
    });
  }

  const memberships = await prisma.teacherGroupMember.findMany({
    where: { teacher_id: auth.teacher.id },
    orderBy: { joined_at: "desc" },
    select: {
      joined_at: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          updated_at: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
  return NextResponse.json({
    openVisibility,
    groups: memberships.map((m) => ({
      ...m.group,
      joined_at: m.joined_at,
      member_count: m.group._count.members,
    })),
  });
}
