// api/school-admin/rowad/route.ts — Rowad review hub for the school admin.
//
// Returns every teacher in the school grouped with all of their Stage 1 +
// Stage 2 attempts (most recent first). The UI groups attempts by stage
// and surfaces the latest status badge per stage so the admin can see at
// a glance who's blocking the queue.
//
// One round-trip — no N+1. We pull the teacher list, then a single bulk
// fetch for all of their submissions, and stitch in-memory.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 1) Teachers in this school (everyone, including ACTIVE — history matters)
  const teachers = await prisma.teacher.findMany({
    where: { school_id: auth.school.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      onboarding_status: true,
      created_at: true,
      profile: {
        select: { full_name: true, email: true, avatar_url: true, is_active: true },
      },
    },
  });

  if (teachers.length === 0) {
    return NextResponse.json({ teachers: [] });
  }

  // 2) Bulk-fetch every submission (drafts excluded — those are private to the
  //    teacher until submitted). One query, sorted oldest → newest so the
  //    server-side reduce groups in order.
  const teacherIds = teachers.map((t) => t.id);
  const submissions = await prisma.rowadSubmission.findMany({
    where: {
      teacher_id: { in: teacherIds },
      status: { not: "IN_PROGRESS" },
    },
    orderBy: [
      { teacher_id: "asc" },
      { stage: "asc" },
      { attempt_number: "asc" },
    ],
    select: {
      id: true,
      teacher_id: true,
      stage: true,
      attempt_number: true,
      status: true,
      score: true,
      total: true,
      submitted_at: true,
      reviewed_at: true,
      reviewer_notes: true,
    },
  });

  // 3) Bucket submissions per teacher per stage.
  type Attempt = (typeof submissions)[number];
  const byTeacher = new Map<string, { STAGE1: Attempt[]; STAGE2: Attempt[] }>();
  for (const t of teachers) {
    byTeacher.set(t.id, { STAGE1: [], STAGE2: [] });
  }
  for (const s of submissions) {
    const bucket = byTeacher.get(s.teacher_id);
    if (bucket) bucket[s.stage].push(s);
  }

  // 4) Compose the response. For each teacher we expose:
  //    - identity + onboarding status
  //    - stage1, stage2 → ordered list of attempts + latest status (if any)
  //    - pending_review boolean for the top-level "needs attention" filter
  const shaped = teachers.map((t) => {
    const bucket = byTeacher.get(t.id)!;
    const stage1 = bucket.STAGE1;
    const stage2 = bucket.STAGE2;
    const stage1Latest = stage1[stage1.length - 1] ?? null;
    const stage2Latest = stage2[stage2.length - 1] ?? null;
    const pending_review =
      stage1Latest?.status === "SUBMITTED" || stage2Latest?.status === "SUBMITTED";

    return {
      id: t.id,
      onboarding_status: t.onboarding_status,
      joined_at: t.created_at,
      profile: t.profile,
      pending_review,
      stage1: {
        attempts: stage1,
        attempt_count: stage1.length,
        latest_status: stage1Latest?.status ?? null,
        latest_score: stage1Latest?.score ?? null,
        latest_total: stage1Latest?.total ?? null,
        latest_submitted_at: stage1Latest?.submitted_at ?? null,
      },
      stage2: {
        attempts: stage2,
        attempt_count: stage2.length,
        latest_status: stage2Latest?.status ?? null,
        latest_score: stage2Latest?.score ?? null,
        latest_total: stage2Latest?.total ?? null,
        latest_submitted_at: stage2Latest?.submitted_at ?? null,
      },
    };
  });

  return NextResponse.json({ teachers: shaped });
}
