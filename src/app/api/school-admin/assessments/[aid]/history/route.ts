import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  const assessment = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id },
    select: { id: true },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const params = new URL(req.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(10, Number.parseInt(params.get("limit") ?? "40", 10) || 40));

  const [total, revisions] = await prisma.$transaction([
    prisma.assessmentRatingRevision.count({ where: { assessment_id: aid } }),
    prisma.assessmentRatingRevision.findMany({
      where: { assessment_id: aid },
      orderBy: { archived_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        scores: true,
        replacement_scores: true,
        original_updated_at: true,
        archived_at: true,
        rating: {
          select: {
            rater_teacher_id: true,
            target_teacher_id: true,
            rater: { select: { profile: { select: { full_name: true } } } },
            target: { select: { profile: { select: { full_name: true } } } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    revisions: revisions.map((revision) => ({
      id: revision.id,
      rater_teacher_id: revision.rating.rater_teacher_id,
      rater_name: revision.rating.rater.profile.full_name,
      target_teacher_id: revision.rating.target_teacher_id,
      target_name: revision.rating.target.profile.full_name,
      scores: revision.scores,
      replacement_scores: revision.replacement_scores,
      original_updated_at: revision.original_updated_at,
      archived_at: revision.archived_at,
    })),
  });
}
