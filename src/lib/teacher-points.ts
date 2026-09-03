// ─────────────────────────────────────────────────────────────────────
// Supervisor points — shared scoring engine ("أفضل 10 مشرفين").
//
// This module is imported by BOTH the API (to score) and the admin page
// (to render the distribution editor and re-score live while the admin
// drags numbers around), so it must stay free of any server-only import.
//
// The model mirrors the competition guide: five areas, worth 100 points
// in total, each broken into concrete rules that map onto something the
// platform can actually observe.
//
//   الالتزام والاستعداد          10
//   إدارة المجموعة والمتطلبات    15
//   الأثر التعليمي ونقل المفهوم  35
//   التطبيق والتشغيل             10
//   اللقاء الحضوري والتحقق       15
//   الجودة والتقييم              10
//   المبادرة والتميز              5
//
// Nothing here is hardcoded into the database: the school's admin can
// re-weight every rule, switch rules off, and override any individual
// score. `DEFAULT_RULES` is only the starting point.
// ─────────────────────────────────────────────────────────────────────

export const OVERALL_KEY = "OVERALL";

export type MetricKind =
  /** points = count × points_per_unit, capped at max_points */
  | "UNIT"
  /** points = max_points × (value / total), total comes from the data */
  | "RATIO"
  /** points = max_points when the condition holds, otherwise 0 */
  | "FLAG";

export type CategoryKey =
  | "COMMITMENT"
  | "GROUP"
  | "IMPACT"
  | "OPERATIONS"
  | "PRESENCE"
  | "QUALITY"
  | "INITIATIVE";

export type CategoryDef = {
  key: CategoryKey;
  /** Roman numeral shown on the axis chip. */
  index: string;
  labelAr: string;
  descAr: string;
  color: string;
};

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    key: "COMMITMENT",
    index: "I",
    labelAr: "الالتزام والاستعداد",
    descAr: "ابدأ بنفسك قبل أن تقود الآخرين — تسجيل مكتمل، بيانات صحيحة، والتزام بالموعد.",
    color: "#6B1E2D",
  },
  {
    key: "GROUP",
    index: "II",
    labelAr: "إدارة المجموعة واستكمال المتطلبات",
    descAr: "القيادة لا تعني أن تُنجز وحدك، بل أن تساعد مجموعتك على الإنجاز معك.",
    color: "#8F765B",
  },
  {
    key: "IMPACT",
    index: "III",
    labelAr: "الأثر التعليمي ونقل المفهوم",
    descAr: "تعلّم ← افهم ← اشرح ← طبّق ← تحقّق من الفهم. هنا يبدأ الأثر الحقيقي.",
    color: "#4A0E1C",
  },
  {
    key: "OPERATIONS",
    index: "IV",
    labelAr: "التطبيق والتشغيل",
    descAr: "تحويل التعلّم من فكرة إلى ممارسة موثّقة: قياس السمات وإغلاق المتطلبات.",
    color: "#B8A082",
  },
  {
    key: "PRESENCE",
    index: "V",
    labelAr: "اللقاء الحضوري والتحقق من الأثر",
    descAr: "الحضور مع طلابك، ومشاركتهم، وإثبات أن الأثر وصل إليهم فعلاً.",
    color: "#5B1526",
  },
  {
    key: "QUALITY",
    index: "VI",
    labelAr: "الجودة والتقييم",
    descAr: "تنفيذ المهام بصورة صحيحة، لا مجرد إكمالها — جودة تُقاس بالمراجعة لا بالعدد.",
    color: "#32101A",
  },
  {
    key: "INITIATIVE",
    index: "VII",
    labelAr: "المبادرة والتميز",
    descAr: "المشرف المتميز ليس من أنجز المهمة فقط، بل من جعل الآخرين ينجزون معه.",
    color: "#8C8274",
  },
];

export const CATEGORY_BY_KEY: Record<CategoryKey, CategoryDef> = Object.fromEntries(
  CATEGORY_DEFS.map((category) => [category.key, category]),
) as Record<CategoryKey, CategoryDef>;

export type MetricKey =
  | "REGISTRATION_COMPLETE"
  | "GROUP_MEMBERSHIP"
  | "WORKSHOP_ENROLLMENT"
  | "STUDENTS_REGISTERED"
  | "STUDENT_RECORDS_COMPLETE"
  | "WORKSHOP_REQUIREMENTS"
  | "MATERIAL_ENGAGEMENT"
  | "VIDEO_ANSWERS"
  | "WORKSHOP_QUIZZES"
  | "LESSONS_CREATED"
  | "QUIZZES_CREATED"
  | "STUDENT_ENGAGEMENT"
  | "TRAIT_EVALUATIONS"
  | "PEER_RATINGS_GIVEN"
  | "WORKSHOP_ATTENDANCE"
  | "WORKSHOP_COMPLETION"
  | "CONTENT_APPROVAL"
  | "VOTES_PARTICIPATION"
  | "COMMUNITY_POSTS"
  | "GROUP_COMMUNITY"
  | "LEARNING_GAMES";

export type MetricDef = {
  key: MetricKey;
  category: CategoryKey;
  kind: MetricKind;
  labelAr: string;
  /** What the supervisor actually has to do to earn it. */
  descAr: string;
  /** Where the number comes from — shown in the "كيف تُحتسب" column. */
  sourceAr: string;
  /** Singular noun for the raw count, e.g. "مستفيد". */
  unitAr: string;
  max_points: number;
  /** UNIT only — points earned per counted item. */
  points_per_unit: number;
  /** RATIO only — fixed denominator; 0 means "derive it from the data". */
  target: number;
};

export const METRIC_DEFS: MetricDef[] = [
  // ── I · الالتزام والاستعداد — 10 ──
  {
    key: "REGISTRATION_COMPLETE",
    category: "COMMITMENT",
    kind: "FLAG",
    labelAr: "التسجيل واكتمال البيانات",
    descAr: "التسجيل في المنصة ضمن الفترة المحددة واعتماد ملف المشرف كاملاً.",
    sourceAr: "حالة المشرف = مُعتمد، مع طلب انضمام مكتمل.",
    unitAr: "",
    max_points: 4,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "GROUP_MEMBERSHIP",
    category: "COMMITMENT",
    kind: "FLAG",
    labelAr: "الدخول إلى المجموعة الصحيحة",
    descAr: "الانضمام إلى مجموعة المشرفين ومتابعة الإعلانات والتعليمات فيها.",
    sourceAr: "عضوية واحدة على الأقل في مجموعة مشرفين.",
    unitAr: "",
    max_points: 3,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "WORKSHOP_ENROLLMENT",
    category: "COMMITMENT",
    kind: "FLAG",
    labelAr: "التسجيل في الورشة التدريبية",
    descAr: "حجز مقعده في الورشة التدريبية واعتماد التسجيل.",
    sourceAr: "تسجيل مُعتمد في ورشة واحدة على الأقل.",
    unitAr: "",
    max_points: 3,
    points_per_unit: 0,
    target: 0,
  },

  // ── II · إدارة المجموعة واستكمال المتطلبات — 15 ──
  {
    key: "STUDENTS_REGISTERED",
    category: "GROUP",
    kind: "UNIT",
    labelAr: "المستفيدون المسجّلون معه",
    descAr: "إضافة الطلاب المستهدفين إلى مجموعته ببيانات صحيحة وكاملة.",
    sourceAr: "عدد المستفيدين في مجموعات المشرف.",
    unitAr: "مستفيد",
    max_points: 8,
    points_per_unit: 1,
    target: 0,
  },
  {
    key: "STUDENT_RECORDS_COMPLETE",
    category: "GROUP",
    kind: "RATIO",
    labelAr: "اكتمال ملفات المستفيدين",
    descAr: "تسكين المستفيد في مجموعته واستكمال دائرة الدعم الخاصة به.",
    sourceAr: "نسبة المستفيدين المُسكّنين ولديهم جهة دعم واحدة على الأقل.",
    unitAr: "مستفيد",
    max_points: 4,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "WORKSHOP_REQUIREMENTS",
    category: "GROUP",
    kind: "RATIO",
    labelAr: "إغلاق متطلبات الورشة",
    descAr: "إنهاء متطلبات رحلة الورشة كاملة في مواعيدها.",
    sourceAr: "نسبة المتطلبات المُنجزة من متطلبات ورشه.",
    unitAr: "متطلب",
    max_points: 3,
    points_per_unit: 0,
    target: 0,
  },

  // ── III · الأثر التعليمي ونقل المفهوم — 35 ──
  {
    key: "MATERIAL_ENGAGEMENT",
    category: "IMPACT",
    kind: "RATIO",
    labelAr: "تعلّم المفهوم — مشاهدة المادة",
    descAr: "مشاهدة مواد التدريب والتعرّف على أساسيات المفهوم قبل نقله.",
    sourceAr: "نسبة فيديوهات الورشة التي شاهدها من الفيديوهات المتاحة له.",
    unitAr: "فيديو",
    max_points: 5,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "VIDEO_ANSWERS",
    category: "IMPACT",
    kind: "RATIO",
    labelAr: "افهم المفهوم بنفسك — إجابات الفيديو",
    descAr: "الإجابة على أسئلة الفيديو بكلماته وربط الفكرة بمثال.",
    sourceAr: "الإجابات الصحيحة داخل الفيديو من مجموع الأسئلة المتاحة.",
    unitAr: "إجابة",
    max_points: 5,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "WORKSHOP_QUIZZES",
    category: "IMPACT",
    kind: "RATIO",
    labelAr: "اختبارات الورشة",
    descAr: "اجتياز اختبارات الورشة التي تتحقق من فهمه للمفاهيم.",
    sourceAr: "مجموع درجاته في اختبارات الورشة من مجموع الأسئلة المتاحة.",
    unitAr: "سؤال",
    max_points: 5,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "LESSONS_CREATED",
    category: "IMPACT",
    kind: "UNIT",
    labelAr: "اشرح المفهوم لطلابك — الدروس",
    descAr: "بناء دروس تبسّط المفهوم بأمثلة مناسبة لمستوى المستفيدين.",
    sourceAr: "عدد الدروس المعتمدة بعد المراجعة.",
    unitAr: "درس",
    max_points: 5,
    points_per_unit: 1,
    target: 0,
  },
  {
    key: "QUIZZES_CREATED",
    category: "IMPACT",
    kind: "UNIT",
    labelAr: "طبّق المفهوم — الاختبارات",
    descAr: "بناء اختبارات وأنشطة ترتبط بمواقف واقعية يمارس فيها الطالب المفهوم.",
    sourceAr: "عدد الاختبارات المعتمدة بعد المراجعة.",
    unitAr: "اختبار",
    max_points: 5,
    points_per_unit: 1,
    target: 0,
  },
  {
    key: "STUDENT_ENGAGEMENT",
    category: "IMPACT",
    kind: "RATIO",
    labelAr: "اجعل طلابك يعبّرون عمّا فهموه",
    descAr: "أعلى بند في المسابقة: أن يشرح الطالب نفسه ويعطي مثالاً ويطبّق.",
    sourceAr: "نسبة مستفيديه الذين أنجزوا محاولة على درس أو اختبار.",
    unitAr: "مستفيد",
    max_points: 10,
    points_per_unit: 0,
    target: 0,
  },

  // ── IV · التطبيق والتشغيل — 10 ──
  {
    key: "TRAIT_EVALUATIONS",
    category: "OPERATIONS",
    kind: "RATIO",
    labelAr: "تعبئة نموذج قياس السمات",
    descAr: "قياس سمات المستفيدين بعد كل مفهوم، وتوثيق ما لاحظه فعلاً.",
    sourceAr: "نسبة مستفيديه الذين عبّأ لهم نموذج السمات.",
    unitAr: "مستفيد",
    max_points: 6,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "PEER_RATINGS_GIVEN",
    category: "OPERATIONS",
    kind: "RATIO",
    labelAr: "تقييم أعضاء مجموعته",
    descAr: "استكمال تقييم زملائه في نماذج القياس المفتوحة لمجموعته.",
    sourceAr: "عدد الزملاء الذين قيّمهم من إجمالي المطلوب منه.",
    unitAr: "عضو",
    max_points: 4,
    points_per_unit: 0,
    target: 0,
  },

  // ── V · اللقاء الحضوري والتحقق من الأثر — 15 ──
  {
    key: "WORKSHOP_ATTENDANCE",
    category: "PRESENCE",
    kind: "RATIO",
    labelAr: "حضور أيام الورش",
    descAr: "التزام المشرف وحضوره الفعلي في أيام العمل المجدولة.",
    sourceAr: "أيام الحضور المسجّلة من أيام العمل المنقضية في ورشه.",
    unitAr: "يوم",
    max_points: 10,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "WORKSHOP_COMPLETION",
    category: "PRESENCE",
    kind: "RATIO",
    labelAr: "إتمام رحلة الورشة",
    descAr: "إغلاق رحلة الورشة كاملة، لا مجرد الحضور فيها.",
    sourceAr: "الورش التي أتمّها من الورش المسجّل فيها.",
    unitAr: "ورشة",
    max_points: 5,
    points_per_unit: 0,
    target: 0,
  },

  // ── VI · الجودة والتقييم — 10 ──
  {
    key: "CONTENT_APPROVAL",
    category: "QUALITY",
    kind: "RATIO",
    labelAr: "جودة ما يُنتجه — نسبة الاعتماد",
    descAr: "تنفيذ المهام بصورة صحيحة من أول مرة، وتقليل الأخطاء وإعادة العمل.",
    sourceAr: "الدروس والاختبارات المعتمدة من إجمالي ما أرسله للمراجعة.",
    unitAr: "عمل",
    max_points: 6,
    points_per_unit: 0,
    target: 0,
  },
  {
    key: "VOTES_PARTICIPATION",
    category: "QUALITY",
    kind: "RATIO",
    labelAr: "الاستجابة للمتطلبات الإدارية",
    descAr: "الاستجابة للتصويتات والاستبيانات التي ترسلها الإدارة في وقتها.",
    sourceAr: "التصويتات التي شارك فيها من التصويتات المتاحة له.",
    unitAr: "تصويت",
    max_points: 4,
    points_per_unit: 0,
    target: 0,
  },

  // ── VII · المبادرة والتميز — 5 ──
  {
    key: "COMMUNITY_POSTS",
    category: "INITIATIVE",
    kind: "UNIT",
    labelAr: "المشاركة في مجتمع المنصة",
    descAr: "اقتراح تحسين مفيد، أو مساعدة مشرف أو طالب على تجاوز تعثّر مؤثر.",
    sourceAr: "عدد مشاركاته ومداخلاته في مجتمع المنصة.",
    unitAr: "مشاركة",
    max_points: 2,
    points_per_unit: 0.5,
    target: 0,
  },
  {
    key: "GROUP_COMMUNITY",
    category: "INITIATIVE",
    kind: "UNIT",
    labelAr: "المشاركة في مجتمع مجموعته",
    descAr: "تفعيل النقاش داخل مجموعته ومساندة زملائه فيها.",
    sourceAr: "عدد رسائله في مجتمع مجموعة المشرفين.",
    unitAr: "رسالة",
    max_points: 2,
    points_per_unit: 0.5,
    target: 0,
  },
  {
    key: "LEARNING_GAMES",
    category: "INITIATIVE",
    kind: "UNIT",
    labelAr: "التفاعل مع أدوات التعلم",
    descAr: "استخدام بطاقات النموذج والأنشطة التدريبية لترسيخ المفاهيم.",
    sourceAr: "عدد الجولات التي لعبها في أدوات التعلم.",
    unitAr: "جولة",
    max_points: 1,
    points_per_unit: 0.25,
    target: 0,
  },
];

export const METRIC_KEYS = METRIC_DEFS.map((metric) => metric.key);

export const METRIC_BY_KEY: Record<MetricKey, MetricDef> = Object.fromEntries(
  METRIC_DEFS.map((metric) => [metric.key, metric]),
) as Record<MetricKey, MetricDef>;

/** The editable half of a metric — what a school admin can change. */
export type PointsRule = {
  key: MetricKey;
  enabled: boolean;
  max_points: number;
  points_per_unit: number;
  /** RATIO only — 0 keeps the data-derived denominator. */
  target: number;
};

export const DEFAULT_RULES: PointsRule[] = METRIC_DEFS.map((metric) => ({
  key: metric.key,
  enabled: true,
  max_points: metric.max_points,
  points_per_unit: metric.points_per_unit,
  target: metric.target,
}));

export const DEFAULT_TOTAL = DEFAULT_RULES.reduce((sum, rule) => sum + rule.max_points, 0);

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed * 100) / 100));
}

/**
 * Merge a stored (possibly partial, possibly garbage) rules array over the
 * shipped defaults. Always returns one rule per metric, in metric order, so
 * a newly added metric appears with its default weight and no migration.
 */
export function resolvePointsRules(stored: unknown): PointsRule[] {
  const overrides = new Map<string, Record<string, unknown>>();
  if (Array.isArray(stored)) {
    for (const raw of stored) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      const key = String(entry.key ?? "");
      if (key) overrides.set(key, entry);
    }
  }
  return DEFAULT_RULES.map((fallback) => {
    const entry = overrides.get(fallback.key);
    if (!entry) return { ...fallback };
    return {
      key: fallback.key,
      enabled: typeof entry.enabled === "boolean" ? entry.enabled : fallback.enabled,
      max_points: clampNumber(entry.max_points, 0, 100, fallback.max_points),
      points_per_unit: clampNumber(entry.points_per_unit, 0, 100, fallback.points_per_unit),
      target: clampNumber(entry.target, 0, 100000, fallback.target),
    };
  });
}

/** One measured signal for one supervisor. `total` is only used by RATIO. */
export type MetricRaw = { value: number; total: number };

export type MetricAdjustment = {
  override_points: number | null;
  bonus_points: number;
  note: string | null;
};

export type MetricResult = {
  key: MetricKey;
  category: CategoryKey;
  kind: MetricKind;
  enabled: boolean;
  /** The raw observation, before any weighting. */
  value: number;
  total: number;
  max_points: number;
  /** What the rules alone produce. */
  computed_points: number;
  /** What actually counts, after the admin's override/bonus. */
  points: number;
  adjusted: boolean;
  adjustment: MetricAdjustment | null;
  /** RATIO/UNIT progress as 0–1, for the bars. */
  progress: number;
};

export type CategoryResult = {
  key: CategoryKey;
  points: number;
  max_points: number;
  percent: number;
};

export type ScoredTeacher = {
  metrics: MetricResult[];
  categories: CategoryResult[];
  /** Sum of every enabled metric, after per-metric adjustments. */
  subtotal: number;
  /** Final score after the OVERALL override/bonus. */
  total: number;
  max_total: number;
  percent: number;
  overall_adjustment: MetricAdjustment | null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Raw rule application, before any manual correction. */
export function computeMetricPoints(
  rule: PointsRule,
  metric: MetricDef,
  raw: MetricRaw,
): { points: number; progress: number } {
  if (!rule.enabled || rule.max_points <= 0) return { points: 0, progress: 0 };

  if (metric.kind === "FLAG") {
    const hit = raw.value > 0;
    return { points: hit ? rule.max_points : 0, progress: hit ? 1 : 0 };
  }

  if (metric.kind === "UNIT") {
    const earned = Math.min(rule.max_points, raw.value * rule.points_per_unit);
    const progress = rule.max_points > 0 ? earned / rule.max_points : 0;
    return { points: round2(Math.max(0, earned)), progress };
  }

  // RATIO — the admin can pin a denominator; otherwise the data provides it.
  const denominator = rule.target > 0 ? rule.target : raw.total;
  if (denominator <= 0) return { points: 0, progress: 0 };
  const ratio = Math.min(1, Math.max(0, raw.value / denominator));
  return { points: round2(rule.max_points * ratio), progress: ratio };
}

/**
 * Score one supervisor. Pure — the same call on the server and in the
 * distribution editor produces the same number, so the admin sees the
 * effect of a weight change before saving it.
 */
export function scoreTeacher(
  rules: PointsRule[],
  raws: Partial<Record<MetricKey, MetricRaw>>,
  adjustments: Record<string, MetricAdjustment> = {},
): ScoredTeacher {
  const ruleByKey = new Map(rules.map((rule) => [rule.key, rule]));

  const metrics: MetricResult[] = METRIC_DEFS.map((metric) => {
    const rule = ruleByKey.get(metric.key) ?? DEFAULT_RULES.find((r) => r.key === metric.key)!;
    const raw = raws[metric.key] ?? { value: 0, total: 0 };
    const { points: computed, progress } = computeMetricPoints(rule, metric, raw);
    const adjustment = adjustments[metric.key] ?? null;

    let points = computed;
    if (adjustment) {
      const base = adjustment.override_points ?? computed;
      points = round2(base + adjustment.bonus_points);
    }
    if (rule.enabled) {
      points = Math.min(rule.max_points, Math.max(0, points));
    } else {
      points = 0;
    }

    return {
      key: metric.key,
      category: metric.category,
      kind: metric.kind,
      enabled: rule.enabled,
      value: raw.value,
      total: raw.total,
      max_points: rule.enabled ? rule.max_points : 0,
      computed_points: computed,
      points: round2(points),
      adjusted: Boolean(adjustment && (adjustment.override_points !== null || adjustment.bonus_points !== 0)),
      adjustment,
      progress: Math.min(1, Math.max(0, progress)),
    };
  });

  const categories: CategoryResult[] = CATEGORY_DEFS.map((category) => {
    const own = metrics.filter((metric) => metric.category === category.key);
    const points = round2(own.reduce((sum, metric) => sum + metric.points, 0));
    const max_points = round2(own.reduce((sum, metric) => sum + metric.max_points, 0));
    return {
      key: category.key,
      points,
      max_points,
      percent: max_points > 0 ? Math.round((points / max_points) * 100) : 0,
    };
  });

  const subtotal = round2(metrics.reduce((sum, metric) => sum + metric.points, 0));
  const max_total = round2(metrics.reduce((sum, metric) => sum + metric.max_points, 0));

  const overall = adjustments[OVERALL_KEY] ?? null;
  let total = subtotal;
  if (overall) {
    total = round2((overall.override_points ?? subtotal) + overall.bonus_points);
  }
  total = Math.max(0, total);

  return {
    metrics,
    categories,
    subtotal,
    total: round2(total),
    max_total,
    percent: max_total > 0 ? Math.round((total / max_total) * 100) : 0,
    overall_adjustment: overall,
  };
}

/** Total attainable points under the current distribution. */
export function rulesTotal(rules: PointsRule[]): number {
  return round2(rules.reduce((sum, rule) => sum + (rule.enabled ? rule.max_points : 0), 0));
}

/** Rank badge tiers used across the leaderboard. */
export function rankTier(rank: number): "gold" | "silver" | "bronze" | "top10" | "plain" {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  if (rank <= 10) return "top10";
  return "plain";
}
