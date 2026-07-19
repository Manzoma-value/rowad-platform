import { NextResponse } from "next/server";
import type { Prisma, VoteFrequency } from "@prisma/client";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const frequencyValues = new Set<VoteFrequency>(["WEEKLY", "BIWEEKLY", "MONTHLY"]);

export async function GET(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const leader = searchParams.get("leader") ?? "all";
  const dateScope = searchParams.get("date_scope") ?? "all";
  const requestedOffset = Number(searchParams.get("tz_offset") ?? "0");
  const timezoneOffset = Number.isFinite(requestedOffset) && Math.abs(requestedOffset) <= 840 ? requestedOffset : 0;

  const frequencyFilter = (key: string) => {
    const value = searchParams.get(key) as VoteFrequency | null;
    return value && frequencyValues.has(value) ? value : null;
  };

  const where: Prisma.FutureQualificationVoteWhereInput = { school_id: auth.school.id };
  const coaching = frequencyFilter("coaching");
  const consultation = frequencyFilter("consultation");
  const evaluation = frequencyFilter("evaluation");
  const support = frequencyFilter("support");
  if (coaching) where.coaching_frequency = coaching;
  if (consultation) where.consultation_frequency = consultation;
  if (evaluation) where.evaluation_frequency = evaluation;
  if (support) where.field_support_frequency = support;
  if (leader === "yes") where.needs_group_leader = true;
  if (leader === "no") where.needs_group_leader = false;
  if (q) {
    where.teacher = {
      is: {
        profile: {
          is: {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    };
  }

  if (dateScope === "today" || dateScope === "week") {
    const now = new Date();
    const localNow = new Date(now.getTime() - timezoneOffset * 60_000);
    const start = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) + timezoneOffset * 60_000);
    if (dateScope === "week") start.setUTCDate(start.getUTCDate() - 6);
    const end = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + 1) + timezoneOffset * 60_000);
    where.submitted_at = { gte: start, lt: end };
  }

  const [votes, totalResponses, eligibleTeachers] = await Promise.all([
    prisma.futureQualificationVote.findMany({
      where,
      orderBy: { submitted_at: sort },
      take: 500,
      select: {
        id: true,
        coaching_frequency: true,
        consultation_frequency: true,
        evaluation_frequency: true,
        field_support_frequency: true,
        needs_group_leader: true,
        submitted_at: true,
        teacher: { select: { id: true, profile: { select: { full_name: true, email: true } } } },
      },
    }),
    prisma.futureQualificationVote.count({ where: { school_id: auth.school.id } }),
    prisma.teacher.count({ where: { school_id: auth.school.id, onboarding_status: "ACTIVE", profile: { is: { is_active: true } } } }),
  ]);

  const emptyFrequency = () => ({ WEEKLY: 0, BIWEEKLY: 0, MONTHLY: 0 });
  const summary = {
    coaching: emptyFrequency(),
    consultation: emptyFrequency(),
    evaluation: emptyFrequency(),
    support: emptyFrequency(),
    leader: { yes: 0, no: 0 },
  };
  for (const vote of votes) {
    summary.coaching[vote.coaching_frequency] += 1;
    summary.consultation[vote.consultation_frequency] += 1;
    summary.evaluation[vote.evaluation_frequency] += 1;
    summary.support[vote.field_support_frequency] += 1;
    summary.leader[vote.needs_group_leader ? "yes" : "no"] += 1;
  }

  return NextResponse.json({
    votes,
    summary,
    meta: {
      filtered: votes.length,
      total_responses: totalResponses,
      eligible_teachers: eligibleTeachers,
      response_rate: eligibleTeachers ? Math.round((totalResponses / eligibleTeachers) * 100) : 0,
      capped: votes.length === 500,
    },
  });
}
