// api/teacher/model/route.ts — card game data for teacher/student.
// Game mode: NEVER leaks the answer key. Cards come back shuffled.
// `?stage=STAGE1|STAGE2` picks the level of detail.
import { NextResponse } from "next/server";
import { requireActivePlayer } from "@/lib/player-auth";
import { prisma } from "@/lib/prisma";
import { shuffle, parseStage } from "@/lib/rowad";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const player = await requireActivePlayer();
  if (!player) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const stage = parseStage(url.searchParams.get("stage")) ?? "STAGE1";

  const model = await prisma.rowadModel.findUnique({
    where: { school_id: player.school_id },
    select: {
      id: true, title_ar: true, title_sq: true,
      levels: {
        orderBy: { order: "asc" },
        select: { order: true, name_ar: true, name_sq: true },
      },
    },
  });

  if (!model) {
    return NextResponse.json({
      stage,
      title_ar: "النموذج التعليمي للرواد",
      title_sq: null,
      levels: [],
      cards: [],
    });
  }

  const detailed = stage === "STAGE2";

  const concepts = await prisma.rowadConcept.findMany({
    where: { model_id: model.id },
    select: {
      id: true,
      name_ar: true,
      name_sq: true,
      ...(detailed
        ? {
            strategic_ar: true, strategic_sq: true,
            description_ar: true, description_sq: true,
            duty_ar: true, duty_sq: true,
            reward_ar: true, reward_sq: true,
            fruit_ar: true, fruit_sq: true,
            verification_ar: true, verification_sq: true,
          }
        : {}),
    },
  });

  return NextResponse.json({
    stage,
    title_ar: model.title_ar,
    title_sq: model.title_sq,
    levels: model.levels,
    cards: shuffle(concepts),
  });
}
