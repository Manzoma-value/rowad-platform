// GET /api/teacher/groups/[id]/assessments/[aid] — the calling teacher's view:
//   - this model's ordered traits (label + statement + color per trait)
//   - the list of rating targets — the UNION of every group this model
//     targets (a model can span several groups), not just the URL's group
//   - ratings RECEIVED about me (each rater named) for the "My Results" panel
//   - status flag so the UI can lock when CLOSED
//
// The teacher never sees other teachers' results; only the data needed for
// what they have to rate + their own row.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { buildAssessmentSpectra } from "@/lib/assessment-aggregates";

export const dynamic = "force-dynamic";

type ScoresArray = number[];

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; aid: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, aid } = await context.params;

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

  const membership = await prisma.teacherGroupMember.findUnique({
    where: { group_id_teacher_id: { group_id: id, teacher_id: auth.teacher.id } },
    select: { joined_at: true },
  });
  if (!membership && !openVisibility) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessment = await prisma.groupAssessment.findFirst({
    where: {
      id: aid,
      school_id: auth.teacher.school_id,
      target_groups: { some: { group_id: id } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      closed_at: true,
      traits: {
        orderBy: { position: "asc" },
        select: {
          position: true, label_ar: true, label_sq: true,
          statement_ar: true, statement_sq: true, color: true,
          kind: true, objective_ar: true, objective_sq: true,
        },
      },
      target_groups: {
        select: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              members: {
                orderBy: { joined_at: "asc" },
                select: {
                  teacher: {
                    select: { id: true, profile: { select: { id: true, full_name: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Rating is deliberately bounded to the group in the URL. A model can
  // span both 30-person cohorts for shared reporting, but teachers never
  // score people outside their own cohort.
  const entryGroup = assessment.target_groups.find((link) => link.group.id === id)?.group;
  if (!entryGroup) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const members = entryGroup.members.map((member) => ({
    teacher_id: member.teacher.id,
    profile: member.teacher.profile,
  }));

  const scoresSelect = { target_teacher_id: true, scores: true, updated_at: true } as const;

  const myGiven = await prisma.assessmentRating.findMany({
    where: { assessment_id: aid, rater_teacher_id: auth.teacher.id },
    select: scoresSelect,
  });

  const myReceived = await prisma.assessmentRating.findMany({
    where: { assessment_id: aid, target_teacher_id: auth.teacher.id },
    orderBy: { updated_at: "desc" },
    select: {
      rater_teacher_id: true, scores: true, updated_at: true,
      rater: { select: { profile: { select: { full_name: true } } } },
    },
  });

  const aggregateRatings = await prisma.assessmentRating.findMany({
    where: { assessment_id: aid },
    select: { rater_teacher_id: true, target_teacher_id: true, scores: true },
  });

  const spectra = buildAssessmentSpectra(
    assessment.target_groups.map((link) => ({
      id: link.group.id,
      name: link.group.name,
      member_ids: link.group.members.map((member) => member.teacher.id),
    })),
    aggregateRatings.map((rating) => ({
      ...rating,
      scores: rating.scores as ScoresArray,
    })),
    assessment.traits.length,
  );

  const allRatings = openVisibility
    ? await prisma.assessmentRating.findMany({
        where: { assessment_id: aid },
        orderBy: { updated_at: "desc" },
        select: {
          rater_teacher_id: true, target_teacher_id: true, scores: true, updated_at: true,
          rater: { select: { profile: { select: { full_name: true } } } },
          target: { select: { profile: { select: { full_name: true } } } },
        },
      })
    : [];

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      created_at: assessment.created_at,
      closed_at: assessment.closed_at,
      group: { id: entryGroup.id, name: entryGroup.name, description: entryGroup.description },
      traits: assessment.traits,
      members: members.map((m) => ({ ...m, is_self: m.teacher_id === auth.teacher.id })),
      my_ratings_given: myGiven.map((r) => ({
        target_teacher_id: r.target_teacher_id,
        scores: r.scores as ScoresArray,
        updated_at: r.updated_at,
      })),
      my_ratings_received: myReceived.map((r) => ({
        rater_teacher_id: r.rater_teacher_id,
        rater_name: r.rater.profile.full_name,
        is_self: r.rater_teacher_id === auth.teacher.id,
        scores: r.scores as ScoresArray,
        updated_at: r.updated_at,
      })),
      all_ratings: allRatings.map((r) => ({
        rater_teacher_id: r.rater_teacher_id,
        rater_name: r.rater.profile.full_name,
        target_teacher_id: r.target_teacher_id,
        target_name: r.target.profile.full_name,
        scores: r.scores as ScoresArray,
        updated_at: r.updated_at,
      })),
      openVisibility,
      is_member: !!membership,
      ...spectra,
    },
  });
}
