// GET /api/teacher/groups/[id] — full group payload with member profile cards.
// Hard membership guard: the calling teacher must belong to this group.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  // Membership check
  const membership = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    select: { joined_at: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.teacher.school_id },
    select: {
      id: true,
      name: true,
      description: true,
      updated_at: true,
      members: {
        orderBy: { joined_at: "asc" },
        select: {
          joined_at: true,
          teacher: {
            select: {
              id: true,
              profile: { select: { id: true, full_name: true } },
              application: {
                select: {
                  country: true,
                  city: true,
                  qualification: true,
                  specialization: true,
                  years_of_experience: true,
                  languages: true,
                  experience_areas: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group });
}
