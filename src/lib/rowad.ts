// Shared constants + helpers for النموذج التعليمي للرواد.
// Now used purely for the card-game (no onboarding gating).
import type { Maqsad, RowadStage } from "@prisma/client";

// Column order matches the printed template (RTL: الدين first → المال last)
export const COLUMN_ORDER: Maqsad[] = ["DEEN", "NAFS", "AQL", "NASL", "MAL"];

export const COLUMN_LABELS: Record<Maqsad, { ar: string; sq: string }> = {
  DEEN: { ar: "الدين", sq: "Feja" },
  NAFS: { ar: "النفس", sq: "Vetja" },
  AQL: { ar: "العقل", sq: "Mendja" },
  NASL: { ar: "النسل", sq: "Pasardhësit" },
  MAL: { ar: "المال", sq: "Pasuria" },
};

export const LEVEL_COUNT = 5;
export const TOTAL_CELLS = 25;

export function parseStage(raw: string | null | undefined): RowadStage | null {
  if (raw === "STAGE1" || raw === "STAGE2") return raw;
  return null;
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
