// GET /api/teacher/groups — list groups the calling teacher belongs to.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    groups: memberships.map((m) => ({
      ...m.group,
      joined_at: m.joined_at,
      member_count: m.group._count.members,
    })),
  });
}
