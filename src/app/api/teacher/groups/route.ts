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

  const myMemberships = await prisma.teacherGroupMember.findMany({
    where: { teacher_id: auth.teacher.id },
    orderBy: { joined_at: "desc" },
    select: {
      joined_at: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          max_members: true,
          updated_at: true,
          leader_teacher_id: true,
          leader: { select: { profile: { select: { full_name: true } } } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  // Ungrouped teachers always receive the school's catalogue so they can
  // choose their own cohort, even when cross-group browsing is otherwise off.
  if (myMemberships.length === 0) {
    const availableGroups = await prisma.teacherGroup.findMany({
      where: { school_id: auth.teacher.school_id },
      orderBy: [{ updated_at: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        max_members: true,
        updated_at: true,
        leader_teacher_id: true,
        leader: { select: { profile: { select: { full_name: true } } } },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json({
      openVisibility,
      needs_group_selection: true,
      groups: availableGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        updated_at: group.updated_at,
        joined_at: null,
        member_count: group._count.members,
        max_members: group.max_members,
        available_seats: Math.max(0, group.max_members - group._count.members),
        is_full: group._count.members >= group.max_members,
        is_member: false,
        leader: group.leader ? { id: group.leader_teacher_id, name: group.leader.profile.full_name } : null,
      })),
    });
  }

  if (openVisibility) {
    const groups = await prisma.teacherGroup.findMany({
      where: { school_id: auth.teacher.school_id },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        max_members: true,
        updated_at: true,
        leader_teacher_id: true,
        leader: { select: { profile: { select: { full_name: true } } } },
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
      needs_group_selection: false,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        updated_at: g.updated_at,
        joined_at: g.members[0]?.joined_at ?? null,
        member_count: g._count.members,
        max_members: g.max_members,
        available_seats: Math.max(0, g.max_members - g._count.members),
        is_full: g._count.members >= g.max_members,
        is_member: g.members.length > 0,
        leader: g.leader ? { id: g.leader_teacher_id, name: g.leader.profile.full_name } : null,
      })),
    });
  }
  return NextResponse.json({
    openVisibility,
    needs_group_selection: false,
    groups: myMemberships.map((m) => ({
      ...m.group,
      joined_at: m.joined_at,
      member_count: m.group._count.members,
      available_seats: Math.max(0, m.group.max_members - m.group._count.members),
      is_full: m.group._count.members >= m.group.max_members,
      is_member: true,
      leader: m.group.leader ? { id: m.group.leader_teacher_id, name: m.group.leader.profile.full_name } : null,
    })),
  });
}
