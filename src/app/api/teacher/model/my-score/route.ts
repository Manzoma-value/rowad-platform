// GET /api/teacher/model/my-score
// Caller's best score for each stage + combined + total plays. Powers the
// featured "نموذج التعلم" card + the completion badge on the learning-tools
// list page.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TOTAL_CELLS } from "@/lib/rowad";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.rowadGameSubmission.findMany({
    where: { profile_id: user.id },
    select: { stage: true, score: true, created_at: true },
  });

  let bestS1 = 0, bestS2 = 0, playsS1 = 0, playsS2 = 0;
  let lastPlayed: Date | null = null;
  for (const r of rows) {
    if (r.stage === "STAGE1") { playsS1++; if (r.score > bestS1) bestS1 = r.score; }
    if (r.stage === "STAGE2") { playsS2++; if (r.score > bestS2) bestS2 = r.score; }
    if (!lastPlayed || r.created_at > lastPlayed) lastPlayed = r.created_at;
  }

  return NextResponse.json({
    best_stage1: bestS1,
    best_stage2: bestS2,
    best_combined: bestS1 + bestS2,
    plays_stage1: playsS1,
    plays_stage2: playsS2,
    total: TOTAL_CELLS,
    max_combined: TOTAL_CELLS * 2,
    last_played_at: lastPlayed?.toISOString() ?? null,
  });
}
