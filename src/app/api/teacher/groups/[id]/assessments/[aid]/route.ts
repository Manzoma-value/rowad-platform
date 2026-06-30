// GET /api/teacher/groups/[id]/assessments/[aid] — the calling teacher's view:
//   - the list of group members (their rating targets, with my saved scores)
//   - ratings RECEIVED about me (each rater named) for the "My Results" panel
//   - status flag so the UI can lock when CLOSED
//
// The teacher never sees other teachers' results; only the data needed for
// what they have to rate + their own row.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; aid: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, aid } = await context.params;

  const membership = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    select: { joined_at: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessment = await prisma.groupAssessment.findFirst({
    where: { id: aid, group_id: id },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      closed_at: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          members: {
            orderBy: { joined_at: "asc" },
            select: {
              teacher: {
                select: {
                  id: true,
                  profile: { select: { id: true, full_name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // My ratings GIVEN (one per target). Used to pre-fill the distributor sliders.
  const myGiven = await prisma.assessmentRating.findMany({
    where: { assessment_id: aid, rater_teacher_id: auth.teacher.id },
    select: {
      target_teacher_id: true,
      s_lineage: true, s_atonement: true, s_awareness: true, s_zeal: true, s_distinct: true,
      updated_at: true,
    },
  });

  // Ratings RECEIVED about me. Includes self-rating (rater == target == me).
  // Each row carries the rater's name + the 5 scores, no aggregation here.
  const myReceived = await prisma.assessmentRating.findMany({
    where: { assessment_id: aid, target_teacher_id: auth.teacher.id },
    orderBy: { updated_at: "desc" },
    select: {
      rater_teacher_id: true,
      s_lineage: true, s_atonement: true, s_awareness: true, s_zeal: true, s_distinct: true,
      updated_at: true,
      rater: {
        select: { profile: { select: { full_name: true } } },
      },
    },
  });

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      created_at: assessment.created_at,
      closed_at: assessment.closed_at,
      group: {
        id: assessment.group.id,
        name: assessment.group.name,
        description: assessment.group.description,
      },
      members: assessment.group.members.map((m) => ({
        teacher_id: m.teacher.id,
        profile: m.teacher.profile,
        is_self: m.teacher.id === auth.teacher.id,
      })),
      my_ratings_given: myGiven,
      my_ratings_received: myReceived.map((r) => ({
        rater_teacher_id: r.rater_teacher_id,
        rater_name: r.rater.profile.full_name,
        is_self: r.rater_teacher_id === auth.teacher.id,
        s_lineage: r.s_lineage,
        s_atonement: r.s_atonement,
        s_awareness: r.s_awareness,
        s_zeal: r.s_zeal,
        s_distinct: r.s_distinct,
        updated_at: r.updated_at,
      })),
    },
  });
}
