// GET /api/teacher/model/leaderboard
// Top 3 players in the calling user's school by best combined score
// (best STAGE1 + best STAGE2). Only names — no scores — so the leaderboard
// encourages participation without publishing raw numbers.
//
// Both teachers and students count. Ties broken by earliest first-submission.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function callerSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      is_active: true,
      role: true,
      teacher: { select: { school_id: true } },
      student: { select: { school_id: true } },
    },
  });
  if (!profile?.is_active) return null;
  if (profile.role === "TEACHER") return profile.teacher?.school_id ?? null;
  if (profile.role === "STUDENT") return profile.student?.school_id ?? null;
  return null;
}

export async function GET() {
  const school_id = await callerSchoolId();
  if (!school_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.rowadGameSubmission.findMany({
    where: { school_id },
    orderBy: { created_at: "asc" },
    select: {
      profile_id: true,
      stage: true,
      score: true,
      created_at: true,
      profile: { select: { full_name: true } },
    },
  });

  type Agg = {
    profile_id: string;
    name: string;
    best_stage1: number;
    best_stage2: number;
    first_seen: Date;
  };
  const by = new Map<string, Agg>();
  for (const r of rows) {
    let a = by.get(r.profile_id);
    if (!a) {
      a = {
        profile_id: r.profile_id,
        name: r.profile.full_name,
        best_stage1: 0,
        best_stage2: 0,
        first_seen: r.created_at,
      };
      by.set(r.profile_id, a);
    }
    if (r.stage === "STAGE1" && r.score > a.best_stage1) a.best_stage1 = r.score;
    if (r.stage === "STAGE2" && r.score > a.best_stage2) a.best_stage2 = r.score;
    if (r.created_at < a.first_seen) a.first_seen = r.created_at;
  }

  const ranked = Array.from(by.values())
    .map((a) => ({ ...a, combined: a.best_stage1 + a.best_stage2 }))
    .sort((a, b) => {
      if (b.combined !== a.combined) return b.combined - a.combined;
      return a.first_seen.getTime() - b.first_seen.getTime();
    })
    .slice(0, 3)
    .map((a, i) => ({ rank: i + 1, name: a.name })); // names only — no scores

  return NextResponse.json({ top: ranked });
}
