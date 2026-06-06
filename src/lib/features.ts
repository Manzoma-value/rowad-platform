// ─────────────────────────────────────────────────────────────────────
// Per-school feature flags — single source of truth.
//
// Stored on School.features as a partial JSON map, e.g. { "hub": false }.
// A missing key means "use the default" (which is ON for every feature).
//
// This file is imported by BOTH server (API) and client (context) so the
// resolution logic is identical everywhere. Adding a new feature = add one
// line to FEATURE_DEFS — no DB migration required.
// ─────────────────────────────────────────────────────────────────────

export const FEATURE_DEFS = {
  hub:      { default: true, labelAr: "المجتمع",     labelEn: "Community Hub" },
  lessons:  { default: true, labelAr: "الدروس",       labelEn: "Lessons" },
  roadmap:  { default: true, labelAr: "بنك الأسئلة",   labelEn: "Question Bank / Roadmap" },
  quizzes:  { default: true, labelAr: "الاختبارات",    labelEn: "Quizzes" },
  reports:  { default: true, labelAr: "التقارير",      labelEn: "Reports & Analytics" },
} as const;

export type FeatureKey = keyof typeof FEATURE_DEFS;

export type Features = Record<FeatureKey, boolean>;

/** Ordered list of feature keys (stable order for UIs). */
export const FEATURE_KEYS = Object.keys(FEATURE_DEFS) as FeatureKey[];

/** The all-defaults map (everything its default value — currently all true). */
export function defaultFeatures(): Features {
  const out = {} as Features;
  for (const key of FEATURE_KEYS) out[key] = FEATURE_DEFS[key].default;
  return out;
}

/**
 * Merge a stored (possibly partial / possibly garbage) JSON value over the
 * defaults, returning a fully-populated, type-safe Features object.
 *
 * - Unknown keys in the stored value are ignored.
 * - Non-boolean values are ignored (fall back to default).
 * - null / undefined / wrong-type input → all defaults.
 */
export function resolveFeatures(stored: unknown): Features {
  const result = defaultFeatures();
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const obj = stored as Record<string, unknown>;
    for (const key of FEATURE_KEYS) {
      if (typeof obj[key] === "boolean") result[key] = obj[key] as boolean;
    }
  }
  return result;
}

/**
 * Which feature (if any) does a given pathname belong to? Used by the layout
 * route-guard to redirect users away from a module their school disabled.
 * Returns null for core routes that can never be disabled.
 */
export function featureForPath(pathname: string): FeatureKey | null {
  // Order matters: check the most specific segment.
  if (pathname.includes("/lessons")) return "lessons";
  if (pathname.includes("/quizzes")) return "quizzes";
  if (pathname.includes("/roadmap")) return "roadmap";
  if (pathname.includes("/reports")) return "reports";
  if (pathname.includes("/hub"))     return "hub";
  return null;
}
