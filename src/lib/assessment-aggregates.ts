import { averageTuples, type ScoresTuple } from "@/lib/rowad-assessment";

export type AssessmentGroupScope = {
  id: string;
  name: string;
  member_ids: string[];
};

export type AssessmentRatingLike = {
  rater_teacher_id: string;
  target_teacher_id: string;
  scores: ScoresTuple;
};

export type AssessmentSpectrumAggregate = {
  group_id: string | null;
  group_name: string;
  member_count: number;
  rating_count: number;
  expected_count: number;
  completion_pct: number;
  participating_raters: number;
  average: ScoresTuple | null;
};

/**
 * Builds one spectrum per linked group and one weighted platform spectrum.
 * A rating only contributes to a group when both people belong to that same
 * group. The overall spectrum is weighted by actual current rating rows and
 * deduplicates rows if legacy membership places a teacher in multiple groups.
 */
export function buildAssessmentSpectra(
  groups: AssessmentGroupScope[],
  ratings: AssessmentRatingLike[],
  traitCount: number,
): { group_spectra: AssessmentSpectrumAggregate[]; overall_spectrum: AssessmentSpectrumAggregate } {
  const overallRows = new Map<string, AssessmentRatingLike>();

  const group_spectra = groups.map((group) => {
    const members = new Set(group.member_ids);
    const valid = ratings.filter(
      (rating) =>
        rating.scores.length === traitCount &&
        members.has(rating.rater_teacher_id) &&
        members.has(rating.target_teacher_id),
    );
    for (const rating of valid) {
      overallRows.set(`${rating.rater_teacher_id}:${rating.target_teacher_id}`, rating);
    }
    const expected_count = members.size * members.size;
    return {
      group_id: group.id,
      group_name: group.name,
      member_count: members.size,
      rating_count: valid.length,
      expected_count,
      completion_pct: expected_count > 0 ? Math.round((valid.length / expected_count) * 100) : 0,
      participating_raters: new Set(valid.map((rating) => rating.rater_teacher_id)).size,
      average: averageTuples(valid.map((rating) => rating.scores)),
    };
  });

  const combined = Array.from(overallRows.values());
  const allMembers = new Set(groups.flatMap((group) => group.member_ids));
  const expected_count = group_spectra.reduce((sum, group) => sum + group.expected_count, 0);

  return {
    group_spectra,
    overall_spectrum: {
      group_id: null,
      group_name: "ALL",
      member_count: allMembers.size,
      rating_count: combined.length,
      expected_count,
      completion_pct: expected_count > 0 ? Math.round((combined.length / expected_count) * 100) : 0,
      participating_raters: new Set(combined.map((rating) => rating.rater_teacher_id)).size,
      average: averageTuples(combined.map((rating) => rating.scores)),
    },
  };
}
