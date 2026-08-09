// Rowad first-stage assessment — peer scoring through a 100-point relative
// distribution. The canonical source defines five formation targets and
// three additional early-observation traits. Admins may still author custom
// models, but every new first-stage model starts from this exact eight-trait
// bilingual reference set.

export type TraitKey =
  | "awareness"
  | "zeal"
  | "distinct"
  | "lineage"
  | "atonement"
  | "resilience"
  | "faith_brotherhood"
  | "maturity";

export type TraitKind = "TARGET" | "EARLY_OBSERVATION";

export const TRAIT_KEYS: readonly TraitKey[] = [
  "awareness", "zeal", "distinct", "lineage", "atonement",
  "resilience", "faith_brotherhood", "maturity",
] as const;

export const DEFAULT_TRAITS: {
  key: TraitKey;
  ar: string;
  sq: string;
  color: string;
  kind: TraitKind;
  objective_ar: string;
  objective_sq: string;
}[] = [
  { key: "awareness", ar: "الدراية", sq: "Dituria", color: "#1A1A1A", kind: "TARGET", objective_ar: "حفظ الدين", objective_sq: "Ruajtja e fesë" },
  { key: "zeal", ar: "الحمية", sq: "Vendosmëria", color: "#B33A3A", kind: "TARGET", objective_ar: "حفظ النفس", objective_sq: "Ruajtja e jetës" },
  { key: "distinct", ar: "المميز", sq: "Dallueshmëria", color: "#9AA3AC", kind: "TARGET", objective_ar: "حفظ العقل", objective_sq: "Ruajtja e mendjes" },
  { key: "lineage", ar: "الفرد", sq: "Individi", color: "#F2EFE6", kind: "TARGET", objective_ar: "حفظ النسل", objective_sq: "Ruajtja e pasardhësve" },
  { key: "atonement", ar: "الكفارات", sq: "Shlyerjet", color: "#F2B705", kind: "TARGET", objective_ar: "حفظ المال", objective_sq: "Ruajtja e pasurisë" },
  { key: "resilience", ar: "الصمود", sq: "Qëndresa", color: "#2F6B5F", kind: "EARLY_OBSERVATION", objective_ar: "حفظ النفس", objective_sq: "Ruajtja e jetës" },
  { key: "faith_brotherhood", ar: "الأخوة الإيمانية", sq: "Vëllazëria e besimit", color: "#315C9B", kind: "EARLY_OBSERVATION", objective_ar: "حفظ النسل", objective_sq: "Ruajtja e pasardhësve" },
  { key: "maturity", ar: "الرشيد", sq: "Pjekuria e gjykimit", color: "#70528F", kind: "EARLY_OBSERVATION", objective_ar: "حفظ العقل", objective_sq: "Ruajtja e mendjes" },
];

export const DEFAULT_STATEMENTS = {
  ar: [
    "أستخدم حدسي للوعي بالأشياء، وأراجع قواعد الذكاء بما يوافق الفطرة.",
    "تأبى نفسي الضيم عند الاعتداء على عرضي أو مالي أو وطني أو سمعتي أو حقوقي.",
    "لدي عقلية تميز بين الأشياء في ظل تصوري كرائد.",
    "أعتبر نفسي فردًا يحمل واجبًا، يلتزم به بوصفه أمانة الاستخلاف، ويؤديه بولاء لوطني وأمتي.",
    "أربط التقصير في واجبي بما شرعه الله من تكفيرٍ وجبرٍ للتقصير.",
    "قد تهزّني الحوادث ولكن لا تمحوني؛ بل أنهض وأواصل طريقي.",
    "أبادر إلى مؤازرة إخوتي في الإيمان والتعاون معهم بما أستطيع، ولا أترك المحتاج منهم للعزلة.",
    "أُصيب في دورتي الريادية الصوابَ الكامل اليقيني الذي لا شك فيه.",
  ],
  sq: [
    "Përdor intuitën time për të kuptuar gjërat dhe i rishikoj rregullat e mendjes në përputhje me natyrshmërinë e krijimit (fitren).",
    "Vetja ime nuk e pranon padrejtësinë kur cenohet nderi im, pasuria ime, atdheu im, reputacioni im ose të drejtat e mia.",
    "Kam një mendësi që dallon mes gjërave, në dritën e konceptimit tim si pionier (raid).",
    "E konsideroj veten një individ që mbart një detyrë, e cila i përmbahet asaj si amanet i mëkëmbësisë (istihlaf) dhe e kryen me besnikëri ndaj atdheut dhe ummetit tim.",
    "Mangësinë në detyrën time e lidh me atë që Allahu ka caktuar si shlyerje dhe si kompensim për mangësinë.",
    "Ngjarjet mund të më tronditin, por nuk më shuajnë; përkundrazi, ngrihem dhe vazhdoj rrugën time.",
    "Marr nismën për t’i përkrahur vëllezërit e mi në besim dhe për të bashkëpunuar me ta sipas mundësive të mia, dhe nuk e lë në izolim atë prej tyre që ka nevojë.",
    "Në ciklin tim udhëheqës e godas të drejtën e plotë dhe të sigurt, në të cilën nuk ka dyshim.",
  ],
} as const;

/** Ready-to-submit shape for a brand-new model's trait editor, pairing each
 *  default trait with its statement. */
export function defaultTraitDrafts(): TraitDraft[] {
  return DEFAULT_TRAITS.map((t, i) => ({
    label_ar: t.ar,
    label_sq: t.sq,
    statement_ar: DEFAULT_STATEMENTS.ar[i],
    statement_sq: DEFAULT_STATEMENTS.sq[i],
    color: t.color,
    kind: t.kind,
    objective_ar: t.objective_ar,
    objective_sq: t.objective_sq,
  }));
}

export type TraitDraft = {
  label_ar: string;
  label_sq: string;
  statement_ar: string;
  statement_sq: string;
  color: string;
  kind?: TraitKind;
  objective_ar?: string;
  objective_sq?: string;
};

type CanonicalizableTrait = {
  position: number;
  label_ar: string;
  label_sq: string;
  statement_ar: string;
  statement_sq: string;
  color: string;
  kind?: TraitKind;
  objective_ar?: string | null;
  objective_sq?: string | null;
};

const CANONICAL_AR_LABELS = new Set([
  "الفرد", "النسل", "الكفارات", "المميز", "التمييز", "الحمية", "الدراية",
  "الصمود", "الأخوة الإيمانية", "الاخوة الإيمانية", "الرشيد",
]);

/**
 * Presents legacy five-trait models using the corrected canonical names,
 * statements, order and accessible colors. Rows are never reordered: saved
 * score arrays are positional, and the historical statements already use
 * this exact conceptual sequence.
 */
export function canonicalizeDefaultTraits<T extends CanonicalizableTrait>(traits: T[]): T[] {
  if (traits.length !== DEFAULT_TRAITS.length) return traits;

  const ordered = [...traits].sort((a, b) => a.position - b.position);
  const looksCanonical = ordered.every((trait) => CANONICAL_AR_LABELS.has(trait.label_ar.trim()));
  if (!looksCanonical) return traits;

  return ordered.map((trait, index) => ({
    ...trait,
    position: index,
    label_ar: DEFAULT_TRAITS[index].ar,
    label_sq: DEFAULT_TRAITS[index].sq,
    statement_ar: DEFAULT_STATEMENTS.ar[index],
    statement_sq: DEFAULT_STATEMENTS.sq[index],
    color: DEFAULT_TRAITS[index].color,
    kind: DEFAULT_TRAITS[index].kind,
    objective_ar: DEFAULT_TRAITS[index].objective_ar,
    objective_sq: DEFAULT_TRAITS[index].objective_sq,
  }));
}

export type AssessLang = "ar" | "sq";
export const pickAssessLang = (l: string): AssessLang => (l === "sq" ? "sq" : "ar");

// A scores array — one entry per trait, in the assessment's trait order.
// Sums to 100 by rule; callers must validate before persisting.
export type ScoresTuple = number[];

// ── The Rowad derivation rule, generalized to N traits:
//    - Core (السمة الجوهرية)  = the index of the top score IF that score >= 50
//    - Connecting (الرابطة)   = the index of the next-highest score
//                              (if no Core exists, this is simply the top)
//    - Supporting (المساندة) = everything else, in descending score order
export type Derivation = {
  hasCore: boolean;
  coreIdx: number | null;
  connectingIdx: number;
  supportingIdxs: number[];
  sortedIdxs: number[];
};

const CORE_THRESHOLD = 50;

export function derive(scores: ScoresTuple): Derivation {
  const ranked = scores
    .map((s, idx) => ({ idx, s }))
    .sort((a, b) => b.s - a.s);
  const sortedIdxs = ranked.map((r) => r.idx);

  const top = ranked[0];
  const hasCore = !!top && top.s >= CORE_THRESHOLD;
  const coreIdx = hasCore ? top.idx : null;
  const connectingIdx = hasCore && ranked[1] ? ranked[1].idx : ranked[0]?.idx ?? 0;
  const supportingIdxs = sortedIdxs.filter(
    (i) => i !== coreIdx && i !== connectingIdx,
  );

  return { hasCore, coreIdx, connectingIdx, supportingIdxs, sortedIdxs };
}

// Average a list of scores arrays element-wise. Returns null when the list
// is empty. All rows must be the same length (guaranteed within one
// assessment, since every rating is validated against that model's trait
// count at write time).
export function averageTuples(rows: ScoresTuple[]): ScoresTuple | null {
  if (rows.length === 0) return null;
  const len = rows[0].length;
  const sums = new Array(len).fill(0);
  for (const r of rows) for (let i = 0; i < len; i++) sums[i] += r[i] ?? 0;
  return sums.map((s) => s / rows.length);
}

export function isValid100(scores: ScoresTuple, expectedLength?: number): boolean {
  if (expectedLength !== undefined && scores.length !== expectedLength) return false;
  if (scores.length === 0) return false;
  if (scores.some((s) => !Number.isInteger(s) || s < 0 || s > 100)) return false;
  return scores.reduce((a, b) => a + b, 0) === 100;
}

export const RATING_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function shouldArchiveRating(previousUpdatedAt: Date, now = new Date()): boolean {
  return now.getTime() - previousUpdatedAt.getTime() >= RATING_HISTORY_WINDOW_MS;
}

// UI string bundle — separated from the components so the API can also
// produce labelled report rows when generating a printable matrix.
export const ASSESS_UI = {
  ar: {
    coreLabel:        "السمة الجوهرية",
    connectingLabel:  "السمة الرابطة",
    supportingLabel:  "السمات المساندة",
    noCore:           "تحت العتبة — لا توجد سمة جوهرية بعد",
    statementCol:     "العبارة",
    totalRow:         "المجموع",
    statusOk:         "✓ مكتمل (100)",
    statusOver:       "تجاوزت 100 — خفّض درجة",
    statusUnder:      "لم تكتمل 100 — أضف درجة",
    self:             "تقييمك لنفسك",
    selfBy:           (name: string) => `${name} (لنفسه)`,
  },
  sq: {
    coreLabel:        "Tipari Thelbësor",
    connectingLabel:  "Tipari ndërlidhës",
    supportingLabel:  "Tiparet Mbështetëse",
    noCore:           "Nën prag — ende pa tipar thelbësor",
    statementCol:     "Pohimi",
    totalRow:         "Shuma",
    statusOk:         "✓ E plotë (100)",
    statusOver:       "Ke tejkaluar 100 — ul një pikë",
    statusUnder:      "Nuk ka arritur 100 — shto një pikë",
    self:             "Vlerësimi yt për veten",
    selfBy:           (name: string) => `${name} (vetëvlerësim)`,
  },
} as const;
