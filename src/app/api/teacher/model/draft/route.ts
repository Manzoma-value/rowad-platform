// api/teacher/model/draft — save / restore / clear a player's in-progress
// card-game board so navigating away mid-game (accidental back button,
// connectivity blip, phone lock) never means starting over from zero.
//
//   GET    ?stage=STAGE1|STAGE2 — the saved placements for that stage, if any.
//   POST   { stage, placements } — upsert (empty placements deletes it).
//   DELETE ?stage=STAGE1|STAGE2 — explicit clear, called after a real submit.
import { NextResponse } from "next/server";
import { requireActivePlayer } from "@/lib/player-auth";
import { prisma } from "@/lib/prisma";
import { TOTAL_CELLS, COLUMN_ORDER, parseStage } from "@/lib/rowad";
import type { Maqsad } from "@prisma/client";

export const dynamic = "force-dynamic";

type InPlacement = { concept_id: string; maqsad: Maqsad; level: number };

/** Same shape validation as the real submit route — a corrupt or hostile
 *  draft body must never crash the restore path or silently store garbage. */
function sanitizePlacements(raw: unknown): InPlacement[] {
  if (!Array.isArray(raw)) return [];
  const seenConcepts = new Set<string>();
  const seenCells = new Set<string>();
  const out: InPlacement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const conceptId = typeof p.concept_id === "string" ? p.concept_id : null;
    const maqsad = typeof p.maqsad === "string" ? (p.maqsad as Maqsad) : null;
    const level = typeof p.level === "number" ? p.level : Number(p.level);
    if (!conceptId || !maqsad || !COLUMN_ORDER.includes(maqsad)) continue;
    if (!Number.isInteger(level) || level < 1 || level > 5) continue;
    if (seenConcepts.has(conceptId)) continue;
    const cell = `${level}:${maqsad}`;
    if (seenCells.has(cell)) continue;
    seenConcepts.add(conceptId);
    seenCells.add(cell);
    out.push({ concept_id: conceptId, maqsad, level });
    if (out.length >= TOTAL_CELLS) break; // a board can never hold more than 25
  }
  return out;
}

export async function GET(req: Request) {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stage = parseStage(new URL(req.url).searchParams.get("stage"));
  if (!stage) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const draft = await prisma.rowadGameDraft.findUnique({
    where: { profile_id_stage: { profile_id: player.profile_id, stage } },
    select: { placements: true, updated_at: true },
  });
  return NextResponse.json({ placements: draft?.placements ?? [], updated_at: draft?.updated_at ?? null });
}

export async function POST(req: Request) {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // sendBeacon (used to flush on tab-hide/close) posts a Blob with no
  // guaranteed Content-Type parsing on every browser, so fall back to text.
  let body: { stage?: string; placements?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const stage = parseStage(body.stage);
  if (!stage) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  const placements = sanitizePlacements(body.placements);

  try {
    if (placements.length === 0) {
      // An empty draft is the same as "no draft" — delete rather than store noise.
      await prisma.rowadGameDraft.deleteMany({ where: { profile_id: player.profile_id, stage } });
    } else {
      await prisma.rowadGameDraft.upsert({
        where: { profile_id_stage: { profile_id: player.profile_id, stage } },
        create: { school_id: player.school_id, profile_id: player.profile_id, stage, placements },
        update: { placements },
      });
    }
  } catch (err) {
    // Autosave is best-effort — never surface this to the player.
    console.error("[model draft save] failed", err);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stage = parseStage(new URL(req.url).searchParams.get("stage"));
  if (!stage) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  await prisma.rowadGameDraft.deleteMany({ where: { profile_id: player.profile_id, stage } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
