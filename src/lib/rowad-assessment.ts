// Rowad First-Stage assessment — fixed trait + statement set + derivation logic.
// The 5 traits are canonical and ordered; their indices are stable across the
// codebase (DB columns, JSON arrays, UI components all rely on this order).
//
// Source: the in-person methodology HTML used by the team. Bilingual AR/SQ.

export type TraitKey = "lineage" | "atonement" | "awareness" | "zeal" | "distinct";

export const TRAIT_KEYS: readonly TraitKey[] = [
  "lineage", "atonement", "awareness", "zeal", "distinct",
] as const;

export const TRAITS: { key: TraitKey; ar: string; sq: string; color: string }[] = [
  { key: "lineage",   ar: "النسل",     sq: "Pasardhësia", color: "#6B1E2D" },
  { key: "atonement", ar: "الكفارات", sq: "Shlyerja",    color: "#B8A082" },
  { key: "awareness", ar: "الدراية",   sq: "Vetëdija",    color: "#8F765B" },
  { key: "zeal",      ar: "الحمية",    sq: "Zelli",       color: "#4A0E1C" },
  { key: "distinct",  ar: "التمييز",  sq: "Dallimi",     color: "#A55A68" },
];

export const STATEMENTS = {
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

export type AssessLang = "ar" | "sq";
export const pickAssessLang = (l: string): AssessLang => (l === "sq" ? "sq" : "ar");

// A scores tuple is always five non-negative numbers. Sums to 100 by rule —
// callers must validate before persisting. We don't enforce the sum here
// because we also call derivePresentation() on AVERAGES which can be any
// non-negative reals.
export type ScoresTuple = [number, number, number, number, number];

export type RawScores = {
  s_lineage:   number;
  s_atonement: number;
  s_awareness: number;
  s_zeal:      number;
  s_distinct:  number;
};

export function rawToTuple(r: RawScores): ScoresTuple {
  return [r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct];
}

export function tupleToRaw(t: ScoresTuple): RawScores {
  return {
    s_lineage:   t[0],
    s_atonement: t[1],
    s_awareness: t[2],
    s_zeal:      t[3],
    s_distinct:  t[4],
  };
}

// ── The Rowad derivation rule, applied identically to a single rating or to
//    an averaged one:
//    - Core (السمة الجوهرية)  = the index of the top score IF that score >= 50
//    - Collective (الجماعية)  = the index of the next-highest score
//                              (if no Core exists, this is simply the top)
//    - Supporting (المساندة) = everything else, in descending score order
export type Derivation = {
  hasCore: boolean;
  coreIdx: number | null;
  collectiveIdx: number;
  supportingIdxs: number[];
  sortedIdxs: number[];     // all five indices ranked by score desc
};

const CORE_THRESHOLD = 50;

export function derive(scores: ScoresTuple): Derivation {
  const ranked = scores
    .map((s, idx) => ({ idx, s }))
    .sort((a, b) => b.s - a.s);
  const sortedIdxs = ranked.map((r) => r.idx);

  const top = ranked[0];
  const hasCore = top.s >= CORE_THRESHOLD;
  const coreIdx = hasCore ? top.idx : null;
  // Collective is the next ranked entry; if there's no Core, the top is the
  // Collective per the methodology.
  const collectiveIdx = hasCore ? ranked[1].idx : ranked[0].idx;
  const supportingIdxs = sortedIdxs.filter(
    (i) => i !== coreIdx && i !== collectiveIdx,
  );

  return { hasCore, coreIdx, collectiveIdx, supportingIdxs, sortedIdxs };
}

// Average a list of scores tuples element-wise. Returns null when the list
// is empty (so callers can render "no ratings yet" cleanly).
export function averageTuples(rows: ScoresTuple[]): ScoresTuple | null {
  if (rows.length === 0) return null;
  const sums: ScoresTuple = [0, 0, 0, 0, 0];
  for (const r of rows) for (let i = 0; i < 5; i++) sums[i] += r[i];
  return [
    sums[0] / rows.length,
    sums[1] / rows.length,
    sums[2] / rows.length,
    sums[3] / rows.length,
    sums[4] / rows.length,
  ];
}

export function isValid100(scores: ScoresTuple): boolean {
  if (scores.some((s) => !Number.isInteger(s) || s < 0 || s > 100)) return false;
  return scores[0] + scores[1] + scores[2] + scores[3] + scores[4] === 100;
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

export function traitLabel(idx: number, lang: AssessLang): string {
  const t = TRAITS[idx];
  return t ? t[lang] : "—";
}
