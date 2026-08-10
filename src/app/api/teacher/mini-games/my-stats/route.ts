// api/teacher/mini-games/my-stats — the current player's own best score,
// play count and last-played time for each practice game. Powers the
// per-tile progress badges on the Games hub.
import { NextResponse } from "next/server";
import { requireActivePlayer } from "@/lib/player-auth";
import { prisma } from "@/lib/prisma";
import type { MiniGameKind } from "@prisma/client";

export const dynamic = "force-dynamic";

type GameStats = { plays: number; best_score: number; wins: number; last_played_at: string | null };

export async function GET() {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.miniGameSubmission.findMany({
    where: { profile_id: player.profile_id },
    select: { game: true, score: true, won: true, created_at: true },
    orderBy: { created_at: "desc" },
  });

  const stats: Record<MiniGameKind, GameStats> = {
    MEMORY: { plays: 0, best_score: 0, wins: 0, last_played_at: null },
    HUNTER: { plays: 0, best_score: 0, wins: 0, last_played_at: null },
    SPEED: { plays: 0, best_score: 0, wins: 0, last_played_at: null },
    COLLECTOR: { plays: 0, best_score: 0, wins: 0, last_played_at: null },
    WORDRAIN: { plays: 0, best_score: 0, wins: 0, last_played_at: null },
    IMPACT_PATH: { plays: 0, best_score: 0, wins: 0, last_played_at: null },
  };

  for (const row of rows) {
    const bucket = stats[row.game];
    bucket.plays += 1;
    bucket.best_score = Math.max(bucket.best_score, row.score);
    if (row.won) bucket.wins += 1;
    if (!bucket.last_played_at) bucket.last_played_at = row.created_at.toISOString();
  }

  const totalPlays = rows.length;
  const gamesTried = Object.values(stats).filter((s) => s.plays > 0).length;

  return NextResponse.json({ stats, total_plays: totalPlays, games_tried: gamesTried });
}
