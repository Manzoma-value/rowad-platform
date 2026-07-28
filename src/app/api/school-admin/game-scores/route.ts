// GET /api/school-admin/game-scores — unified play analytics for every game
// on the platform: the graded card/model game (RowadGameSubmission), the
// 5 practice mini-games (MiniGameSubmission), and who's mid-attempt right
// now on the card game but hasn't submitted yet (RowadGameDraft).
//
//   - Default: { overview, modelRows, miniRows, inProgressRows }
//     overview       — cross-game ranking (plays + unique players per game),
//                      used to answer "which game is most played".
//     modelRows      — per-user roll-up for the card game (unchanged shape).
//     miniRows       — per-user roll-up for the 5 mini-games.
//     inProgressRows — players with an unsubmitted, autosaved card-game
//                      board: which stage, how many of 25 cards placed, and
//                      when they were last active.
//   - ?detail=<profile_id> — { profile, modelHistory, miniHistory } for one user.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { TOTAL_CELLS } from "@/lib/rowad";
import type { MiniGameKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const MINI_GAMES: MiniGameKind[] = ["MEMORY", "HUNTER", "SPEED", "COLLECTOR", "WORDRAIN"];

export async function GET(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const detailFor = url.searchParams.get("detail");

  if (detailFor) {
    const [modelHistory, miniHistory, profile] = await Promise.all([
      prisma.rowadGameSubmission.findMany({
        where: { school_id: auth.school.id, profile_id: detailFor },
        orderBy: { created_at: "desc" },
        take: 200,
        select: { id: true, stage: true, score: true, total: true, answers: true, created_at: true },
      }),
      prisma.miniGameSubmission.findMany({
        where: { school_id: auth.school.id, profile_id: detailFor },
        orderBy: { created_at: "desc" },
        take: 200,
        select: { id: true, game: true, score: true, won: true, meta: true, created_at: true },
      }),
      prisma.profile.findFirst({
        where: { id: detailFor },
        select: { id: true, full_name: true, email: true, role: true },
      }),
    ]);
    return NextResponse.json({ profile, modelHistory, miniHistory });
  }

  const [modelAll, miniAll, draftsAll] = await Promise.all([
    prisma.rowadGameSubmission.findMany({
      where: { school_id: auth.school.id },
      select: {
        profile_id: true, stage: true, score: true, total: true, created_at: true,
        profile: { select: { full_name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.miniGameSubmission.findMany({
      where: { school_id: auth.school.id },
      select: {
        profile_id: true, game: true, score: true, won: true, created_at: true,
        profile: { select: { full_name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.rowadGameDraft.findMany({
      where: { school_id: auth.school.id },
      select: {
        profile_id: true, stage: true, placements: true, updated_at: true,
        profile: { select: { full_name: true, email: true, role: true } },
      },
      orderBy: { updated_at: "desc" },
    }),
  ]);

  // ── Model roll-up (unchanged from before) ──
  type ModelRow = {
    profile_id: string; full_name: string; email: string | null; role: string;
    plays: number; last_played_at: string | null;
    best_stage1: number | null; best_stage2: number | null; total: number;
  };
  const modelMap = new Map<string, ModelRow>();
  for (const s of modelAll) {
    let r = modelMap.get(s.profile_id);
    if (!r) {
      r = {
        profile_id: s.profile_id, full_name: s.profile.full_name, email: s.profile.email,
        role: s.profile.role, plays: 0, last_played_at: null,
        best_stage1: null, best_stage2: null, total: s.total,
      };
      modelMap.set(s.profile_id, r);
    }
    r.plays++;
    if (!r.last_played_at || new Date(s.created_at) > new Date(r.last_played_at)) {
      r.last_played_at = s.created_at.toISOString();
    }
    if (s.stage === "STAGE1") r.best_stage1 = r.best_stage1 == null ? s.score : Math.max(r.best_stage1, s.score);
    else r.best_stage2 = r.best_stage2 == null ? s.score : Math.max(r.best_stage2, s.score);
  }
  const modelRows = Array.from(modelMap.values()).sort((a, b) =>
    (b.last_played_at ? new Date(b.last_played_at).getTime() : 0) -
    (a.last_played_at ? new Date(a.last_played_at).getTime() : 0));

  // ── Mini-game roll-up ──
  type MiniRow = {
    profile_id: string; full_name: string; email: string | null; role: string;
    plays: number; last_played_at: string | null;
    by_game: Partial<Record<MiniGameKind, { plays: number; best_score: number }>>;
  };
  const miniMap = new Map<string, MiniRow>();
  for (const s of miniAll) {
    let r = miniMap.get(s.profile_id);
    if (!r) {
      r = {
        profile_id: s.profile_id, full_name: s.profile.full_name, email: s.profile.email,
        role: s.profile.role, plays: 0, last_played_at: null, by_game: {},
      };
      miniMap.set(s.profile_id, r);
    }
    r.plays++;
    if (!r.last_played_at || new Date(s.created_at) > new Date(r.last_played_at)) {
      r.last_played_at = s.created_at.toISOString();
    }
    const bucket = r.by_game[s.game] ?? { plays: 0, best_score: 0 };
    bucket.plays++;
    bucket.best_score = Math.max(bucket.best_score, s.score);
    r.by_game[s.game] = bucket;
  }
  const miniRows = Array.from(miniMap.values()).sort((a, b) =>
    (b.last_played_at ? new Date(b.last_played_at).getTime() : 0) -
    (a.last_played_at ? new Date(a.last_played_at).getTime() : 0));

  // ── Cross-game overview: which game is played most, across everyone ──
  type GameStat = { key: string; plays: number; players: Set<string> };
  const gameStats = new Map<string, GameStat>();
  const bump = (key: string, profileId: string) => {
    let g = gameStats.get(key);
    if (!g) { g = { key, plays: 0, players: new Set() }; gameStats.set(key, g); }
    g.plays++;
    g.players.add(profileId);
  };
  for (const s of modelAll) bump(`MODEL_${s.stage}`, s.profile_id);
  for (const s of miniAll) bump(s.game, s.profile_id);
  for (const key of ["MODEL_STAGE1", "MODEL_STAGE2", ...MINI_GAMES]) {
    if (!gameStats.has(key)) gameStats.set(key, { key, plays: 0, players: new Set() });
  }
  const games = Array.from(gameStats.values())
    .map((g) => ({ key: g.key, plays: g.plays, unique_players: g.players.size }))
    .sort((a, b) => b.plays - a.plays);

  const allPlayers = new Set<string>([...modelAll.map((s) => s.profile_id), ...miniAll.map((s) => s.profile_id)]);

  // ── In-progress: card-game boards autosaved but never submitted ──
  const inProgressRows = draftsAll.map((d) => ({
    profile_id: d.profile_id,
    full_name: d.profile.full_name,
    email: d.profile.email,
    role: d.profile.role,
    stage: d.stage,
    placed_count: Array.isArray(d.placements) ? d.placements.length : 0,
    total: TOTAL_CELLS,
    updated_at: d.updated_at.toISOString(),
  }));

  return NextResponse.json({
    overview: {
      total_plays: modelAll.length + miniAll.length,
      unique_players: allPlayers.size,
      games,
    },
    modelRows,
    miniRows,
    inProgressRows,
  });
}
