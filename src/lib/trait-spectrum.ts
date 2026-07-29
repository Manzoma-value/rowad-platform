// Trait Spectrum — color science + blob geometry for the نماذج القياس
// visualization. Pure math, no React/DOM — kept separate from
// rowad-assessment.ts (which owns the peer-scoring methodology, not
// visualization) so this can be reused by both the teacher rating screen
// and the admin results view, and unit-sanity-checked independently.
//
// Colors always flow in as data (never literal string constants here),
// so this file has no interaction with scripts/check-theme-colors.mjs.

export type SpectrumTrait = { label: string; color: string; pct: number };

export type BlobCircle = { cx: number; cy: number; r: number; opacity: number };
export type BlobLayerSpec = { traitIndex: number; color: string; circles: BlobCircle[] };

// ── Color conversion ──────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

export function hexToCmyk(hex: string): { c: number; m: number; y: number; k: number } {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 1 };
  return {
    c: (1 - rr - k) / (1 - k),
    m: (1 - gg - k) / (1 - k),
    y: (1 - bb - k) / (1 - k),
    k,
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  return {
    r: 255 * (1 - c) * (1 - k),
    g: 255 * (1 - m) * (1 - k),
    b: 255 * (1 - y) * (1 - k),
  };
}

/** Per-channel CMYK-weighted blend of N trait colors, per the official
 *  Albania brand-identity formula: channel = Σ(pct_i/100 × channel_i).
 *  Generalizes to any number of traits/colors, not just the canonical 5. */
export function blendCmykWeighted(entries: { color: string; pct: number }[]): string {
  const total = entries.reduce((sum, e) => sum + e.pct, 0) || 1;
  const acc = { c: 0, m: 0, y: 0, k: 0 };
  for (const e of entries) {
    const w = e.pct / total;
    const cmyk = hexToCmyk(e.color);
    acc.c += cmyk.c * w;
    acc.m += cmyk.m * w;
    acc.y += cmyk.y * w;
    acc.k += cmyk.k * w;
  }
  const rgb = cmykToRgb(acc.c, acc.m, acc.y, acc.k);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ── Deterministic seeding ─────────────────────────────────────────────

/** Small hash → stable numeric seed from any string (teacher id, assessment
 *  id, etc.) so the same entity always renders the same organic jitter. */
export function seedFromString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Blob geometry ─────────────────────────────────────────────────────
// Generalized port of the trait-spectrum-site demo's buildBlobSVG math:
// each trait gets a fixed anchor point (evenly distributed around a
// circle instead of the demo's 5 hardcoded angles), a radius/opacity/
// layer-count driven by its percentage, and a handful of seeded jittered
// circles layered with an (SVG) watercolor filter by the caller.

const MIN_RADIUS = 34, MAX_RADIUS = 190;
const MIN_OPACITY = 0.22, MAX_OPACITY = 0.85;

export function computeBlobLayers(
  traits: SpectrumTrait[],
  seed = 1,
  opts?: { cx?: number; cy?: number; anchorR?: number },
): BlobLayerSpec[] {
  const cx = opts?.cx ?? 300;
  const cy = opts?.cy ?? 300;
  const anchorR = opts?.anchorR ?? 118;
  const rng = mulberry32(seed);
  const n = traits.length || 1;

  return traits.map((t, i) => {
    const angle = ((-90 + (360 / n) * i) * Math.PI) / 180;
    const ax = cx + anchorR * Math.cos(angle);
    const ay = cy + anchorR * Math.sin(angle);
    const pct = Math.max(0, Math.min(100, t.pct));
    const radius = MIN_RADIUS + (pct / 100) * (MAX_RADIUS - MIN_RADIUS);
    const opacity = MIN_OPACITY + (pct / 100) * (MAX_OPACITY - MIN_OPACITY);
    const layers = 3 + Math.round(pct / 10);

    const circles: BlobCircle[] = [];
    for (let L = 0; L < layers; L++) {
      const jitterX = (rng() - 0.5) * 90;
      const jitterY = (rng() - 0.5) * 90;
      const rJitter = radius * (0.55 + rng() * 0.65);
      const perLayerOpacity = Math.max(0.05, Math.min(0.85, opacity / (layers * 0.42)));
      circles.push({ cx: ax + jitterX, cy: ay + jitterY, r: rJitter, opacity: perLayerOpacity });
    }
    return { traitIndex: i, color: t.color, circles };
  });
}

// ── Radar (pentagon) chart geometry ───────────────────────────────────
// Pure vector math, no filters — cheap enough for any grid size. Uses the
// same even angle distribution as computeBlobLayers so a trait's radar
// axis always points the same direction as its blob anchor.

export type RadarGeometry = {
  gridRings: string[]; // SVG polygon `points` strings, outer→inner
  axisLines: { x1: number; y1: number; x2: number; y2: number }[];
  dataPoints: { x: number; y: number; color: string }[];
  dataPolygonPoints: string;
};

export function computeRadarGeometry(
  traits: SpectrumTrait[],
  opts?: { cx?: number; cy?: number; maxR?: number },
): RadarGeometry {
  const cx = opts?.cx ?? 110;
  const cy = opts?.cy ?? 112;
  const maxR = opts?.maxR ?? 82;
  const n = traits.length || 1;
  const angleOf = (i: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;

  const gridRings = [0.25, 0.5, 0.75, 1].map((f) =>
    traits
      .map((_, i) => {
        const a = angleOf(i);
        return `${(cx + maxR * f * Math.cos(a)).toFixed(1)},${(cy + maxR * f * Math.sin(a)).toFixed(1)}`;
      })
      .join(" "),
  );

  const axisLines = traits.map((_, i) => {
    const a = angleOf(i);
    return { x1: cx, y1: cy, x2: cx + maxR * Math.cos(a), y2: cy + maxR * Math.sin(a) };
  });

  const dataPoints = traits.map((t, i) => {
    const a = angleOf(i);
    const r = maxR * (Math.max(0, Math.min(100, t.pct)) / 100);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), color: t.color };
  });

  return {
    gridRings,
    axisLines,
    dataPoints,
    dataPolygonPoints: dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
  };
}

// ── Compound reading ──────────────────────────────────────────────────
// From the official brand doc: when the top-2 traits are within 15 points
// of each other, a pairwise combined meaning applies; otherwise just the
// dominant trait is named. Matched by label text against the canonical 5
// (not by array position), so a custom/edited trait set simply falls
// back to "dominant" instead of erroring.

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

const COMPOUND_READINGS: Record<string, { ar: string; sq: string }> = {
  [pairKey("الفرد", "الكفارات")]: { ar: "الفرد المُستدرِك", sq: "Individi Ndreqës" },
  [pairKey("الفرد", "المميز")]: { ar: "الهوية الواعية بالاختيار", sq: "Identiteti i Zgjedhjes së Vetëdijshme" },
  [pairKey("الفرد", "الحمية")]: { ar: "هوية الكرامة", sq: "Identiteti i Dinjitetit" },
  [pairKey("الفرد", "الدراية")]: { ar: "الوعي الذاتي العميق", sq: "Vetëdija e Thellë" },
  [pairKey("الكفارات", "المميز")]: { ar: "الاستدراك الحكيم", sq: "Ndreqja e Mençur" },
  [pairKey("الكفارات", "الحمية")]: { ar: "جبر الكرامة", sq: "Rikthimi i Dinjitetit" },
  [pairKey("الكفارات", "الدراية")]: { ar: "الاستدراك الواعي", sq: "Ndreqja e Vetëdijshme" },
  [pairKey("المميز", "الحمية")]: { ar: "القرار الشجاع", sq: "Vendimi i Guximshëm" },
  [pairKey("المميز", "الدراية")]: { ar: "الحكمة التحليلية", sq: "Urtësia Analitike" },
  [pairKey("الحمية", "الدراية")]: { ar: "الدفاع المتبصر", sq: "Mbrojtja e Mençur" },
};

export type CompoundResult =
  | { kind: "compound"; ar: string; sq: string }
  | { kind: "dominant"; index: number }
  | { kind: "none" };

export function matchCompoundReading(traits: { label: string; pct: number }[]): CompoundResult {
  if (traits.length === 0) return { kind: "none" };
  const ranked = traits.map((t, index) => ({ ...t, index })).sort((a, b) => b.pct - a.pct);
  const top = ranked[0];
  if (!top || top.pct <= 0) return { kind: "none" };
  const second = ranked[1];
  if (second && second.pct > 0 && Math.abs(top.pct - second.pct) <= 15) {
    const reading = COMPOUND_READINGS[pairKey(top.label, second.label)];
    if (reading) return { kind: "compound", ar: reading.ar, sq: reading.sq };
  }
  return { kind: "dominant", index: top.index };
}
