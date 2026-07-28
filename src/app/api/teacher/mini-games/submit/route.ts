// api/teacher/mini-games/submit — log one completed round of a practice
// mini-game (Memory Match, Maqsad Hunter, Speed Drill, Maqsad Collector,
// Word Rain). These games have no server-side answer key, so unlike the
// card-game submit route this never grades anything — it exists purely so
// admins can see usage: who played, how often, which game is most popular.
import { NextResponse } from "next/server";
import { requireActivePlayer } from "@/lib/player-auth";
import { prisma } from "@/lib/prisma";
import type { MiniGameKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_GAMES: MiniGameKind[] = ["MEMORY", "HUNTER", "SPEED", "COLLECTOR", "WORDRAIN"];
const MAX_SCORE = 100_000;
const MAX_META_ENTRIES = 8;

export async function POST(req: Request) {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { game?: string; score?: number; won?: boolean; meta?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const game = body.game as MiniGameKind;
  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  }
  const rawScore = Number(body.score);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(MAX_SCORE, Math.round(rawScore))) : 0;
  const won = body.won === true;

  // Analytics-only free-form extras (moves, time, combo, stars...) — cap the
  // key count and coerce to primitives so a bad client can't inflate the row.
  let meta: Record<string, number | string | boolean> | undefined;
  if (body.meta && typeof body.meta === "object") {
    meta = {};
    for (const [key, value] of Object.entries(body.meta).slice(0, MAX_META_ENTRIES)) {
      if (typeof value === "number" && Number.isFinite(value)) meta[key] = value;
      else if (typeof value === "string") meta[key] = value.slice(0, 120);
      else if (typeof value === "boolean") meta[key] = value;
    }
  }

  try {
    await prisma.miniGameSubmission.create({
      data: {
        school_id: player.school_id,
        profile_id: player.profile_id,
        game,
        score,
        won,
        meta,
      },
    });
  } catch (err) {
    console.error("[mini-game submit] persist failed", err);
    // Don't block the player's result screen over a logging failure.
  }

  return NextResponse.json({ ok: true });
}
