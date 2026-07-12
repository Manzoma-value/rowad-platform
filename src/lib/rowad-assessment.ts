// Rowad assessment — peer-scoring "distribute 100 points" methodology.
// Traits are now authored per assessment model by the admin (see
// AssessmentTrait in schema.prisma); the five below are only the
// *starting template* offered when creating a new model, preserved
// exactly as the original canonical Rowad First-Stage set so existing
// models keep behaving identically after the migration to custom traits.

export type TraitKey = "lineage" | "atonement" | "awareness" | "zeal" | "distinct";

export const TRAIT_KEYS: readonly TraitKey[] = [
  "lineage", "atonement", "awareness", "zeal", "distinct",
] as const;

// The original fixed five — kept as the default template for new models
// and for any legacy code path that still wants the classic set.
export const DEFAULT_TRAITS: { key: TraitKey; ar: string; sq: string; color: string }[] = [
  { key: "lineage",   ar: "النسل",     sq: "Pasardhësia", color: "#6B1E2D" },
  { key: "atonement", ar: "الكفارات", sq: "Shlyerja",    color: "#B8A082" },
  { key: "awareness", ar: "الدراية",   sq: "Vetëdija",    color: "#8F765B" },
  { key: "zeal",      ar: "الحمية",    sq: "Zelli",       color: "#4A0E1C" },
  { key: "distinct",  ar: "التمييز",  sq: "Dallimi",     color: "#A55A68" },
];

export const DEFAULT_STATEMENTS = {
  ar: [
    "أعتبر نفسي فردًا يحمل واجبًا، يلتزم به بوصفه أمانة الاستخلاف، ويؤديه تجاه النسل والأمة.",
    "أربط التقصير في واجبي بما شرعه الله من تكفير وجبر للتقصير.",
    "لدي عقلية تميز بين الأشياء في ظل تصوري كرائد.",
    "تأبى نفسي الضيم عند الاعتداء على عرضي أو مالي أو نسلي أو سمعتي أو حقوقي.",
    "أستخدم حدسي للوعي بالأشياء، وأراجع قواعد الذكاء بما يوافق الفطرة.",
  ],
  sq: [
    "E konsideroj veten si person që mban një detyrim, i përkushtohet atij si një amanet trashëgimie, dhe e përmbush ndaj pasardhësisë dhe umetit.",
    "E lidh mangësinë në detyrën time me atë që Allahu e ka përcaktuar si shlyerje dhe ndreqje për mangësinë.",
    "Kam një mendje që dallon gjërat nën konceptin tim si pionier (rowad).",
    "Shpirti im refuzon padrejtësinë kur cenohet nderi, pasuria, pasardhësia, reputacioni ose të drejtat e mia.",
    "E përdor intuitën time për vetëdijësim ndaj gjërave, dhe i rishikoj rregullat e intelektit në përputhje me natyrën njerëzore (fitra).",
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
  }));
}

export type TraitDraft = {
  label_ar: string;
  label_sq: string;
  statement_ar: string;
  statement_sq: string;
  color: string;
};

export type AssessLang = "ar" | "sq";
export const pickAssessLang = (l: string): AssessLang => (l === "sq" ? "sq" : "ar");

// A scores array — one entry per trait, in the assessment's trait order.
// Sums to 100 by rule; callers must validate before persisting.
export type ScoresTuple = number[];

// ── The Rowad derivation rule, generalized to N traits:
//    - Core (السمة الجوهرية)  = the index of the top score IF that score >= 50
//    - Collective (الجماعية)  = the index of the next-highest score
//                              (if no Core exists, this is simply the top)
//    - Supporting (المساندة) = everything else, in descending score order
export type Derivation = {
  hasCore: boolean;
  coreIdx: number | null;
  collectiveIdx: number;
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
  const collectiveIdx = hasCore && ranked[1] ? ranked[1].idx : ranked[0]?.idx ?? 0;
  const supportingIdxs = sortedIdxs.filter(
    (i) => i !== coreIdx && i !== collectiveIdx,
  );

  return { hasCore, coreIdx, collectiveIdx, supportingIdxs, sortedIdxs };
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

// UI string bundle — separated from the components so the API can also
// produce labelled report rows when generating a printable matrix.
export const ASSESS_UI = {
  ar: {
    coreLabel:        "السمة الجوهرية",
    collectiveLabel:  "السمة الجماعية",
    supportingLabel:  "السمات المساندة",
    noCore:           "لا توجد سمة جوهرية",
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
    collectiveLabel:  "Tipari Kolektiv",
    supportingLabel:  "Tiparet Mbështetëse",
    noCore:           "Nuk ka tipar thelbësor",
    statementCol:     "Pohimi",
    totalRow:         "Shuma",
    statusOk:         "✓ E plotë (100)",
    statusOver:       "Ke tejkaluar 100 — ul një pikë",
    statusUnder:      "Nuk ka arritur 100 — shto një pikë",
    self:             "Vlerësimi yt për veten",
    selfBy:           (name: string) => `${name} (vetëvlerësim)`,
  },
} as const;
