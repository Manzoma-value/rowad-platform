// GET /api/school-admin/game-scores — per-user roll-up of card-game results.
// Each row: profile (name + role) → best score per stage + total plays.
// Optional ?detail=<profile_id> returns the full play history for one user.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const detailFor = url.searchParams.get("detail");

  if (detailFor) {
    const history = await prisma.rowadGameSubmission.findMany({
      where: { school_id: auth.school.id, profile_id: detailFor },
      orderBy: { created_at: "desc" },
      take: 200,
      select: {
        id: true,
        stage: true,
        score: true,
        total: true,
        created_at: true,
      },
    });
    const profile = await prisma.profile.findFirst({
      where: { id: detailFor },
      select: { id: true, full_name: true, email: true, role: true },
    });
    return NextResponse.json({ profile, history });
  }

  // Roll-up — group by profile, return best STAGE1/STAGE2 + total plays.
  const all = await prisma.rowadGameSubmission.findMany({
    where: { school_id: auth.school.id },
    select: {
      profile_id: true,
      stage: true,
      score: true,
      total: true,
      created_at: true,
      profile: { select: { full_name: true, email: true, role: true } },
    },
    orderBy: { created_at: "desc" },
  });

  type Row = {
    profile_id: string;
    full_name: string;
    email: string | null;
    role: string;
    plays: number;
    last_played_at: string | null;
    best_stage1: number | null;
    best_stage2: number | null;
    total: number;
  };
  const map = new Map<string, Row>();
  for (const s of all) {
    let r = map.get(s.profile_id);
    if (!r) {
      r = {
        profile_id: s.profile_id,
        full_name: s.profile.full_name,
        email: s.profile.email,
        role: s.profile.role,
        plays: 0,
        last_played_at: null,
        best_stage1: null,
        best_stage2: null,
        total: s.total,
      };
      map.set(s.profile_id, r);
    }
    r.plays++;
    if (!r.last_played_at || new Date(s.created_at) > new Date(r.last_played_at)) {
      r.last_played_at = s.created_at.toISOString();
    }
    if (s.stage === "STAGE1") {
      r.best_stage1 = r.best_stage1 == null ? s.score : Math.max(r.best_stage1, s.score);
    } else {
      r.best_stage2 = r.best_stage2 == null ? s.score : Math.max(r.best_stage2, s.score);
    }
  }
  const rows = Array.from(map.values()).sort((a, b) => {
    const at = a.last_played_at ? new Date(a.last_played_at).getTime() : 0;
    const bt = b.last_played_at ? new Date(b.last_played_at).getTime() : 0;
    return bt - at;
  });

  return NextResponse.json({ rows });
}
