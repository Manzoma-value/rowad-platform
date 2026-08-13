// GET /api/teacher/groups — the full platform group catalogue with the
// calling supervisor's membership and request state on every card.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [school, groups, pendingRequest] = await Promise.all([
    prisma.school.findUnique({
      where: { id: auth.teacher.school_id },
      select: { features: true },
    }),
    prisma.teacherGroup.findMany({
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
        members: {
          where: { teacher_id: auth.teacher.id },
          select: { joined_at: true },
          take: 1,
        },
        _count: { select: { members: true } },
      },
    }),
    prisma.teacherGroupJoinRequest.findFirst({
      where: { teacher_id: auth.teacher.id, school_id: auth.teacher.school_id, status: "PENDING" },
      select: {
        id: true,
        group_id: true,
        requested_at: true,
        group: { select: { name: true } },
      },
    }),
  ]);

  const openVisibility = !!(
    school?.features &&
    typeof school.features === "object" &&
    !Array.isArray(school.features) &&
    (school.features as Record<string, unknown>).teacher_groups_open_visibility === true
  );
  const membershipCount = groups.filter((group) => group.members.length > 0).length;

  return NextResponse.json({
    openVisibility,
    viewer_teacher_id: auth.teacher.id,
    needs_group_selection: membershipCount === 0,
    membership_count: membershipCount,
    pending_request: pendingRequest ? {
      id: pendingRequest.id,
      group_id: pendingRequest.group_id,
      group_name: pendingRequest.group.name,
      requested_at: pendingRequest.requested_at,
    } : null,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      updated_at: group.updated_at,
      joined_at: group.members[0]?.joined_at ?? null,
      member_count: group._count.members,
      max_members: group.max_members,
      available_seats: Math.max(0, group.max_members - group._count.members),
      is_full: group._count.members >= group.max_members,
      is_member: group.members.length > 0,
      request_status: pendingRequest?.group_id === group.id ? "PENDING" : null,
      leader: group.leader ? { id: group.leader_teacher_id, name: group.leader.profile.full_name } : null,
    })),
  });
}
