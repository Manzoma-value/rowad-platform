// Shared constants + helpers for النموذج التعليمي للرواد.
import type { Maqsad, RowadStage, TeacherOnboardingStatus } from "@prisma/client";

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

/** Which stage (if any) the teacher is currently allowed to fill. */
export function stageForStatus(
  status: TeacherOnboardingStatus,
): RowadStage | null {
  if (status === "STAGE1_PENDING") return "STAGE1";
  if (status === "STAGE2_PENDING") return "STAGE2";
  return null;
}

/** Which stage the teacher last submitted (for surfacing rejection notes). */
export function reviewStageForStatus(
  status: TeacherOnboardingStatus,
): RowadStage | null {
  if (status === "STAGE1_REVIEW") return "STAGE1";
  if (status === "STAGE2_REVIEW") return "STAGE2";
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
