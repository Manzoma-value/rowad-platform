"use client";

// Shared fetch/typing for the group-assessment views (member grid + the
// dedicated per-target rating page). Both need the exact same payload, so
// this is the single source of truth for the shape and the load logic.

import { useCallback, useEffect, useState } from "react";
import { canonicalizeDefaultTraits, type ScoresTuple } from "@/lib/rowad-assessment";

export type Trait = {
  position: number; label_ar: string; label_sq: string;
  statement_ar: string; statement_sq: string; color: string;
  kind: "TARGET" | "EARLY_OBSERVATION";
  objective_ar: string | null; objective_sq: string | null;
};
export type Member = { teacher_id: string; profile: { full_name: string }; is_self: boolean };
export type Given = {
  target_teacher_id: string; scores: ScoresTuple; updated_at: string;
  next_allowed_at: string;
};
export type Received = {
  rater_teacher_id: string; rater_name: string; is_self: boolean;
  scores: ScoresTuple; updated_at: string; next_allowed_at: string;
};
export type GroupRating = {
  rater_teacher_id: string; rater_name: string;
  target_teacher_id: string; target_name: string;
  scores: ScoresTuple; updated_at: string; next_allowed_at: string;
};
export type RatingHistory = {
  id: string; rater_teacher_id: string; rater_name: string;
  target_teacher_id: string; target_name: string;
  scores: ScoresTuple; recorded_at: string; archived_at: string;
};
export type SpectrumAggregate = {
  group_id: string | null; group_name: string; member_count: number;
  rating_count: number; expected_count: number; completion_pct: number;
  participating_raters: number; average: ScoresTuple | null;
};
export type AssessmentData = {
  id: string; title: string; status: "OPEN" | "CLOSED";
  group: { id: string; name: string; description: string | null };
  traits: Trait[];
  members: Member[];
  my_ratings_given: Given[];
  my_ratings_received: Received[];
  all_ratings: GroupRating[];
  rating_history: RatingHistory[];
  openVisibility: boolean;
  is_member: boolean;
  group_spectra: SpectrumAggregate[];
  overall_spectrum: SpectrumAggregate;
};

export function traitLabel(t: Trait, lang: "ar" | "sq") { return lang === "ar" ? t.label_ar : t.label_sq; }
export function traitStatement(t: Trait, lang: "ar" | "sq") { return lang === "ar" ? t.statement_ar : t.statement_sq; }

export function evenSplit(n: number): ScoresTuple {
  if (n <= 0) return [];
  const base = Math.floor(100 / n);
  const arr = new Array(n).fill(base);
  arr[0] += 100 - base * n;
  return arr;
}

/** Reorder members so the "self" entry is always first (matches the
 *  methodology: the supervisor rates themselves before their colleagues). */
export function membersSelfFirst<T extends { is_self: boolean }>(list: T[]): T[] {
  const self = list.find((m) => m.is_self);
  const others = list.filter((m) => !m.is_self);
  return self ? [self, ...others] : list;
}

export function useAssessmentData(id: string, aid: string) {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/teacher/groups/${id}/assessments/${aid}`, { cache: "no-store" });
      if (!r.ok) { setData(null); setNotFound(true); return; }
      const d = await r.json();
      const raw = d?.assessment as AssessmentData | undefined;
      if (!raw) { setData(null); setNotFound(true); return; }
      setData({ ...raw, traits: canonicalizeDefaultTraits(raw.traits) });
      setNotFound(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, aid]);

  useEffect(() => { void reload(); }, [reload]);

  return { data, loading, notFound, reload };
}
