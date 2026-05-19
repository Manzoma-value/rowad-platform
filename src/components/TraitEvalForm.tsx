"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvalTrait {
  id: string;
  maqsad: string;
  name: string;
  definition: string | null;
  elements: { id: string; text: string; order: number }[];
}

interface Weight {
  traitId: string;
  maxScore: number;
  isMain: boolean;
}

interface EvalData {
  module: { id: string; title: string; main_trait_id: string | null };
  stage: { id: string; title: string };
  traits: EvalTrait[];
  weights: Weight[];
  attempt: { score: number; total: number; passed: boolean };
  assessment: {
    id: string;
    general_note: string | null;
    trait_scores: { trait_id: string; score: number; note: string | null }[];
  } | null;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const MAQSAD: Record<
  string,
  { label: string; color: string; bg: string; track: string; fill: string }
> = {
  DEEN: {
    label: "الدين",
    color: "#78590A",
    bg: "#FDF6E3",
    track: "#F5E7B2",
    fill: "#E5B93C",
  },
  AQL: {
    label: "العقل",
    color: "#4A2595",
    bg: "#F2EDFD",
    track: "#D8C8F8",
    fill: "#7C4DFF",
  },
  NAFS: {
    label: "النفس",
    color: "#115C35",
    bg: "#E8F7EF",
    track: "#B4E6CC",
    fill: "#1DB85A",
  },
  NASL: {
    label: "النسل",
    color: "#7A1818",
    bg: "#FDEAEA",
    track: "#F5BBBB",
    fill: "#E03535",
  },
  MAL: {
    label: "المال",
    color: "#5C3D08",
    bg: "#FBF2E3",
    track: "#EDD89A",
    fill: "#C47F0A",
  },
};

function mq(maqsad: string) {
  return MAQSAD[maqsad] ?? MAQSAD.DEEN;
}

// ─── RTL Slider ───────────────────────────────────────────────────────────────
// Strategy: wrap in scaleX(-1) so the fill direction is visually flipped.
// This makes right=max and left=0, which is correct for Arabic RTL.
// Labels are placed in reverse JSX order (0, mid, max) so after flip they read (max, mid, 0).

function TraitSlider({
  value,
  max,
  maqsad,
  isMain,
  onChange,
}: {
  value: number;
  max: number;
  maqsad: string;
  isMain: boolean;
  onChange: (v: number) => void;
}) {
  const cfg = mq(maqsad);
  const pct = max > 0 ? (value / max) * 100 : 0;
  const fillColor = isMain ? "#E5B93C" : cfg.fill;
  const fillGrad = isMain
    ? "linear-gradient(90deg,#C8A96A,#E5B93C)"
    : `linear-gradient(90deg,${cfg.fill}88,${cfg.fill})`;

  return (
    <div className="sl-root">
      {/* Flipped wrapper — makes right=max visually */}
      <div className="sl-flip">
        <div className="sl-track">
          <div
            className="sl-fill"
            style={{ width: `${pct}%`, background: fillGrad }}
          />
          <div
            className="sl-thumb"
            style={{
              left: `${pct}%`,
              borderColor: fillColor,
              boxShadow: `0 0 0 5px ${fillColor}22, 0 2px 8px rgba(0,0,0,0.15)`,
            }}
          />
        </div>
        <input
          type="range"
          className="sl-input"
          min={0}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      {/* Labels: in JSX order [0, mid, max]. After scaleX(-1) flip: visually [max, mid, 0]. */}
      <div className="sl-labels">
        <span className="sl-lbl-flip">0</span>
        <span className="sl-lbl-flip">{Math.round((max / 2) * 10) / 10}</span>
        <span className="sl-lbl-flip">{Math.round(max * 10) / 10}</span>
      </div>
    </div>
  );
}

// ─── Arc ──────────────────────────────────────────────────────────────────────

function Arc({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color =
    pct >= 75
      ? "#1A8C52"
      : pct >= 40
        ? "#C8A96A"
        : pct > 0
          ? "#C04040"
          : "#D0C8BE";
  const r = 30,
    circ = 2 * Math.PI * r;
  return (
    <div className="arc-wrap">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="6"
        />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s" }}
        />
      </svg>
      <div className="arc-inner">
        <span className="arc-score" style={{ color }}>
          {Math.round(score * 10) / 10}
        </span>
        <span className="arc-max">/{Math.round(max * 10) / 10}</span>
      </div>
    </div>
  );
}

// ─── Trait Card ───────────────────────────────────────────────────────────────

function TraitCard({
  trait,
  weight,
  score,
  note,
  onScore,
  onNote,
}: {
  trait: EvalTrait;
  weight: Weight;
  score: number;
  note: string;
  onScore: (v: number) => void;
  onNote: (v: string) => void;
}) {
  const [elemOpen, setElemOpen] = useState(false);
  const { isMain, maxScore } = weight;
  const cfg = mq(trait.maqsad);

  return (
    <div className={`tcard${isMain ? " tcard-main" : ""}`}>
      {isMain && <div className="tcard-topbar" />}
      <div className="tcard-body">
        {/* Left col */}
        <div className="tcard-left">
          {/* Badges */}
          <div className="tcard-top">
            <span
              className="tcard-mq"
              style={{
                background: cfg.bg,
                color: cfg.color,
                borderColor: cfg.track,
              }}
            >
              {cfg.label}
            </span>
            {isMain ? (
              <span className="tcard-main-tag">
                ★ السمة المشغّلة · <b>50%</b>
              </span>
            ) : (
              <span
                className="tcard-wt"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                وزن {Math.round(maxScore * 10) / 10}
              </span>
            )}
          </div>

          <h3 className="tcard-name">{trait.name}</h3>
          {trait.definition && <p className="tcard-def">{trait.definition}</p>}

          <TraitSlider
            value={score}
            max={maxScore}
            maqsad={trait.maqsad}
            isMain={isMain}
            onChange={onScore}
          />

          {/* Elements */}
          {trait.elements.length > 0 && (
            <div>
              <button
                className="tcard-elem-btn"
                onClick={() => setElemOpen((v) => !v)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                </svg>
                عناصر التقييم ({trait.elements.length})
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{
                    transform: elemOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {elemOpen && (
                <div className="tcard-elems">
                  {trait.elements.map((el, i) => (
                    <div key={el.id} className="tcard-el">
                      <span
                        className="tcard-el-n"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="tcard-el-txt">{el.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <input
            className="tcard-note"
            placeholder={`ملاحظة على ${trait.name}...`}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            dir="rtl"
          />
        </div>

        {/* Right col — arc */}
        <div className="tcard-right">
          <Arc score={score} max={maxScore} />
        </div>
      </div>
    </div>
  );
}

// ─── Total Banner ─────────────────────────────────────────────────────────────

function TotalBanner({
  total,
  traits,
  weights,
  scores,
}: {
  total: number;
  traits: EvalTrait[];
  weights: Weight[];
  scores: Record<string, number>;
}) {
  const pct = Math.min(total, 100);
  const color =
    total >= 75
      ? "#1A8C52"
      : total >= 50
        ? "#C8A96A"
        : total > 0
          ? "#C04040"
          : "#B0A898";
  const r = 34,
    circ = 2 * Math.PI * r;

  const label =
    total === 0
      ? "لم يبدأ التقييم"
      : total >= 75
        ? "أداء ممتاز ✦"
        : total >= 50
          ? "أداء مقبول"
          : "يحتاج تحسين";

  return (
    <div className="tb-wrap" style={{ "--tc": color } as React.CSSProperties}>
      {/* Big ring */}
      <div className="tb-ring-wrap">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.07)"
            strokeWidth="6"
          />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            transform="rotate(-90 42 42)"
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }}
          />
        </svg>
        <div className="tb-ring-inner">
          <span className="tb-ring-n" style={{ color }}>
            {Math.round(total * 10) / 10}
          </span>
          <span className="tb-ring-d">/100</span>
        </div>
      </div>

      {/* Text + bar */}
      <div className="tb-text">
        <div className="tb-label" style={{ color }}>
          {label}
        </div>
        <div className="tb-sub">إجمالي تقييم السمات الخمس</div>
        <div className="tb-bar">
          <div
            className="tb-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="tb-bar-pct" style={{ color }}>
          {Math.round(total * 10) / 10} من 100
        </div>
      </div>

      {/* Trait dots */}
      <div className="tb-dots">
        {traits.map((t) => {
          const w = weights.find((w) => w.traitId === t.id);
          const s = scores[t.id] ?? 0;
          const p = w && w.maxScore > 0 ? s / w.maxScore : 0;
          const cfg = mq(t.maqsad);
          return (
            <div key={t.id} className="tb-dot-col" title={t.name}>
              <div
                className="tb-dot-ring"
                style={{ borderColor: p > 0 ? cfg.fill : "rgba(0,0,0,0.1)" }}
              >
                <div
                  className="tb-dot-fill"
                  style={{
                    background: cfg.fill,
                    opacity: p > 0 ? p : 0.12,
                    transform: `scaleY(${p})`,
                  }}
                />
              </div>
              <span className="tb-dot-label">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TraitEvalForm({
  studentId,
  moduleId,
  onClose,
  onSaved,
}: {
  studentId: string;
  moduleId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/teacher/trait-assessments/${studentId}/${moduleId}`)
      .then((r) => r.json())
      .then((d: EvalData) => {
        setData(d);
        if (d.assessment) {
          const s: Record<string, number> = {};
          const n: Record<string, string> = {};
          d.assessment.trait_scores.forEach((ts) => {
            s[ts.trait_id] = ts.score;
            n[ts.trait_id] = ts.note ?? "";
          });
          setScores(s);
          setNotes(n);
          setGeneralNote(d.assessment.general_note ?? "");
        } else {
          const s: Record<string, number> = {};
          d.traits.forEach((t) => {
            s[t.id] = 0;
          });
          setScores(s);
        }
      })
      .finally(() => setLoading(false));
  }, [studentId, moduleId]);

  const total = data
    ? data.traits.reduce((sum, t) => sum + (scores[t.id] ?? 0), 0)
    : 0;

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/teacher/trait-assessments/${studentId}/${moduleId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: data.traits.map((t) => ({
              trait_id: t.id,
              score: scores[t.id] ?? 0,
              note: notes[t.id]?.trim() || undefined,
            })),
            general_note: generalNote.trim() || undefined,
          }),
        },
      );
      const resp = await res.json();
      if (!res.ok) {
        setError(resp.error ?? "فشل الحفظ");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="tef-loading" dir="rtl">
        <style>{css}</style>
        <div className="tef-spinner" />
        <span>جارٍ تحميل بيانات التقييم...</span>
      </div>
    );

  if (!data) return null;
  const isEditing = !!data.assessment;

  return (
    <div className="tef-root" dir="rtl">
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="tef-hdr">
        <div className="tef-hdr-left">
          <div className="tef-hdr-path">
            <span className="tef-hdr-stage">{data.stage.title}</span>
            <span className="tef-hdr-sep">›</span>
            <span className="tef-hdr-mod">{data.module.title}</span>
          </div>
          <div className="tef-hdr-sub">
            {data.traits.length} سمات
            {isEditing && <span className="tef-edit-chip">تعديل</span>}
          </div>
        </div>
        <button className="tef-close" onClick={onClose}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Total banner ── */}
      <TotalBanner
        total={total}
        traits={data.traits}
        weights={data.weights}
        scores={scores}
      />

      {/* ── Trait cards ── */}
      <div className="tef-cards">
        {data.traits.map((trait) => {
          const w = data.weights.find((w) => w.traitId === trait.id) ?? {
            traitId: trait.id,
            maxScore: 0,
            isMain: false,
          };
          return (
            <TraitCard
              key={trait.id}
              trait={trait}
              weight={w}
              score={scores[trait.id] ?? 0}
              note={notes[trait.id] ?? ""}
              onScore={(v) => setScores((s) => ({ ...s, [trait.id]: v }))}
              onNote={(v) => setNotes((n) => ({ ...n, [trait.id]: v }))}
            />
          );
        })}
      </div>

      {/* ── General note ── */}
      <div className="tef-gnote">
        <label className="tef-gnote-label">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          ملاحظة عامة على المستوى (اختياري)
        </label>
        <textarea
          className="tef-gnote-ta"
          rows={3}
          placeholder="اكتب ملاحظاتك العامة على أداء الطالب في هذا المستوى..."
          value={generalNote}
          onChange={(e) => setGeneralNote(e.target.value)}
          dir="rtl"
        />
      </div>

      {error && (
        <div className="tef-err">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="tef-foot">
        <button className="tef-save" onClick={handleSave} disabled={saving}>
          {saving ? (
            <div className="tef-spin" />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {saving
            ? "جارٍ الحفظ..."
            : isEditing
              ? "تحديث التقييم"
              : "حفظ التقييم"}
        </button>
        <button className="tef-cancel" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes tef-spin{to{transform:rotate(360deg)}}
@keyframes tef-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

:root{
  --tef-gold:#C8A96A;--tef-gold2:#E5B93C;
  --tef-black:#0B0B0C;
  --tef-bg:#FFFFFF;--tef-bg2:#F7F5F1;--tef-bg3:#F0EDE6;
  --tef-border:rgba(8,11,12,0.08);
  --tef-text:#16120C;--tef-text2:#42392A;--tef-text3:#8A7A5A;
  --tef-font:'Cairo',sans-serif;
}

/* Root */
.tef-root{display:flex;flex-direction:column;font-family:var(--tef-font);color:var(--tef-text);background:var(--tef-bg);animation:tef-in 0.28s cubic-bezier(0.22,1,0.36,1)}

/* Loading */
.tef-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:260px;font-family:var(--tef-font);font-size:13px;color:var(--tef-text3)}
.tef-spinner{width:30px;height:30px;border:3px solid rgba(200,169,106,0.15);border-top-color:var(--tef-gold);border-radius:50%;animation:tef-spin 0.7s linear infinite}

/* Header */
.tef-hdr{
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  padding:18px 22px 14px;border-bottom:1px solid var(--tef-border);
  position:sticky;top:0;background:var(--tef-bg);z-index:20;
}
.tef-hdr-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.tef-hdr-path{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tef-hdr-stage{font-size:11px;font-weight:700;color:var(--tef-text3)}
.tef-hdr-sep{color:var(--tef-text3);opacity:0.4;font-size:13px}
.tef-hdr-mod{font-size:18px;font-weight:900;color:var(--tef-black);letter-spacing:-0.3px}
.tef-hdr-sub{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--tef-text3);font-weight:600}
.tef-edit-chip{font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;background:rgba(229,185,60,0.15);color:#78590A;border:1px solid rgba(229,185,60,0.3)}
.tef-close{width:32px;height:32px;border-radius:50%;background:var(--tef-bg2);border:1px solid var(--tef-border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--tef-text3);transition:all 0.15s;flex-shrink:0}
.tef-close:hover{background:var(--tef-bg3);color:var(--tef-text)}

/* ── Total banner ── */
.tb-wrap{
  display:flex;align-items:center;gap:18px;
  padding:18px 22px;
  background:var(--tef-bg2);
  border-bottom:2px solid rgba(0,0,0,0.06);
}
.tb-ring-wrap{position:relative;width:84px;height:84px;flex-shrink:0}
.tb-ring-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
.tb-ring-n{font-size:19px;font-weight:900;line-height:1}
.tb-ring-d{font-size:9.5px;font-weight:700;color:var(--tef-text3)}
.tb-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.tb-label{font-size:15px;font-weight:900;line-height:1.2}
.tb-sub{font-size:10.5px;color:var(--tef-text3);font-weight:600;margin-bottom:2px}
.tb-bar{height:5px;background:rgba(0,0,0,0.07);border-radius:99px;overflow:hidden}
.tb-bar-fill{height:100%;border-radius:99px;transition:width 0.5s cubic-bezier(0.22,1,0.36,1),background 0.3s}
.tb-bar-pct{font-size:10.5px;font-weight:700;margin-top:2px}
.tb-dots{display:flex;gap:10px;flex-shrink:0;align-items:center}
.tb-dot-col{display:flex;flex-direction:column;align-items:center;gap:4px}
.tb-dot-ring{width:14px;height:26px;border-radius:7px;border:1.5px solid;overflow:hidden;position:relative}
.tb-dot-fill{position:absolute;inset:0;transform-origin:bottom;transition:transform 0.4s ease,opacity 0.3s}
.tb-dot-label{font-size:8px;font-weight:800;color:var(--tef-text3)}

/* ── Trait cards ── */
.tef-cards{display:flex;flex-direction:column}

.tcard{
  position:relative;
  border-bottom:1px solid var(--tef-border);
  transition:background 0.15s;
}
.tcard-main{background:linear-gradient(180deg,rgba(253,246,227,0.7),transparent)}
.tcard-topbar{
  position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,#E5B93C 40%,#C8A96A 60%,transparent);
}
.tcard-body{display:flex;align-items:flex-start;gap:14px;padding:20px 22px}
.tcard-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.tcard-right{flex-shrink:0;padding-top:4px}

.tcard-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tcard-mq{font-size:10.5px;font-weight:800;padding:4px 10px;border-radius:7px;border:1px solid;flex-shrink:0}
.tcard-main-tag{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10.5px;font-weight:700;color:#78590A;
  background:rgba(229,185,60,0.18);border:1px solid rgba(229,185,60,0.35);
  border-radius:7px;padding:4px 10px;
}
.tcard-main-tag b{font-weight:900}
.tcard-wt{font-size:10px;font-weight:700;padding:3px 9px;border-radius:6px}

.tcard-name{font-size:17px;font-weight:900;color:var(--tef-black);letter-spacing:-0.3px;line-height:1.3}
.tcard-def{font-size:12.5px;color:var(--tef-text3);line-height:1.65}

/* Arc */
.arc-wrap{position:relative;width:76px;height:76px}
.arc-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.arc-score{font-size:16px;font-weight:900;line-height:1}
.arc-max{font-size:9px;font-weight:700;color:var(--tef-text3)}

/* ══════════════════════════════════════
   RTL SLIDER
   The outer .sl-flip wrapper is scaled X by -1.
   This flips the fill direction: left-to-right fill becomes right-to-left visually.
   RTL result: right side = max value, left side = 0.
   Native input stays LTR under the hood — dragging left increases value,
   which after the visual flip appears as dragging left toward 0 (correct RTL behavior).
   Labels in JSX are [0, mid, max] left-to-right;
   after flip they render as [max, mid, 0] — correct Arabic order.
   Each label itself is counter-flipped with scaleX(-1) so text isn't mirrored.
══════════════════════════════════════ */
.sl-root{display:flex;flex-direction:column;gap:5px}

.sl-flip{
  position:relative;
  height:18px;
  transform:scaleX(-1);  /* ← flips fill direction for RTL */
}

.sl-track{
  position:absolute;
  top:50%;transform:translateY(-50%);
  left:0;right:0;height:10px;
  background:rgba(8,11,12,0.07);
  border-radius:99px;
}

.sl-fill{
  position:absolute;
  left:0;top:0;bottom:0;
  border-radius:99px;
  transition:width 0.08s linear;
  pointer-events:none;
}

.sl-thumb{
  position:absolute;
  top:50%;
  width:20px;height:20px;border-radius:50%;
  background:#fff;
  border:3px solid;
  transform:translate(-50%,-50%);
  pointer-events:none;
  transition:left 0.08s linear,border-color 0.2s,box-shadow 0.2s;
  z-index:1;
}

.sl-input{
  position:absolute;inset:-4px 0;width:100%;height:calc(100% + 8px);
  opacity:0;cursor:pointer;
  -webkit-appearance:none;appearance:none;
  margin:0;padding:0;
}

.sl-labels{
  display:flex;justify-content:space-between;
  padding:0 2px;
  transform:scaleX(-1);  /* ← counter-flip labels container */
}
.sl-lbl-flip{
  font-size:10.5px;color:var(--tef-text3);font-weight:600;
  display:inline-block;
  transform:scaleX(-1);  /* ← counter-flip each label so text reads normally */
}

/* Elements */
.tcard-elem-btn{
  display:inline-flex;align-items:center;gap:7px;
  background:none;border:1px solid var(--tef-border);
  border-radius:9px;padding:7px 13px;
  font-family:var(--tef-font);font-size:12px;font-weight:700;
  color:var(--tef-text3);cursor:pointer;transition:all 0.15s;width:fit-content;
}
.tcard-elem-btn:hover{border-color:rgba(200,169,106,0.4);color:var(--tef-text);background:rgba(200,169,106,0.04)}
.tcard-elems{
  background:rgba(200,169,106,0.04);border:1px solid rgba(200,169,106,0.18);
  border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:9px;
  margin-top:8px;animation:tef-in 0.2s ease;
}
.tcard-el{display:flex;align-items:flex-start;gap:10px}
.tcard-el-n{width:22px;height:22px;border-radius:6px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.tcard-el-txt{font-size:13px;color:var(--tef-text2);line-height:1.65}

/* Note */
.tcard-note{
  width:100%;padding:10px 14px;
  background:var(--tef-bg2);border:1px solid var(--tef-border);
  border-radius:10px;font-family:var(--tef-font);font-size:13px;color:var(--tef-text);
  outline:none;transition:border-color 0.15s,box-shadow 0.15s;
}
.tcard-note:focus{border-color:rgba(200,169,106,0.45);box-shadow:0 0 0 3px rgba(200,169,106,0.1)}
.tcard-note::placeholder{color:rgba(8,11,12,0.22)}

/* General note */
.tef-gnote{padding:18px 22px;border-top:1px solid var(--tef-border);display:flex;flex-direction:column;gap:8px}
.tef-gnote-label{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--tef-text3)}
.tef-gnote-ta{
  width:100%;padding:12px 14px;
  background:var(--tef-bg2);border:1px solid var(--tef-border);
  border-radius:12px;font-family:var(--tef-font);font-size:13.5px;color:var(--tef-text);
  outline:none;resize:vertical;min-height:80px;line-height:1.7;
  transition:border-color 0.15s,box-shadow 0.15s;
}
.tef-gnote-ta:focus{border-color:rgba(200,169,106,0.45);box-shadow:0 0 0 3px rgba(200,169,106,0.1)}
.tef-gnote-ta::placeholder{color:rgba(8,11,12,0.22)}

/* Error */
.tef-err{
  margin:0 22px;padding:12px 16px;
  background:rgba(139,30,30,0.07);border:1px solid rgba(139,30,30,0.2);
  border-radius:10px;display:flex;align-items:center;gap:9px;
  font-size:13px;color:#8B1E1E;font-weight:600;
}

/* Footer */
.tef-foot{
  display:flex;gap:10px;padding:16px 22px 22px;
  border-top:1px solid var(--tef-border);
  position:sticky;bottom:0;background:var(--tef-bg);
}
.tef-save{
  flex:1;display:flex;align-items:center;justify-content:center;gap:9px;
  padding:14px;border-radius:14px;
  background:var(--tef-black);border:none;color:var(--tef-gold);
  font-family:var(--tef-font);font-size:15px;font-weight:800;
  cursor:pointer;transition:all 0.2s;
  box-shadow:0 4px 18px rgba(8,11,12,0.18);
}
.tef-save:hover:not(:disabled){background:#1c1c1e;box-shadow:0 6px 24px rgba(8,11,12,0.25);transform:translateY(-1px)}
.tef-save:disabled{opacity:0.45;cursor:not-allowed;transform:none}
.tef-spin{width:15px;height:15px;border:2.5px solid rgba(200,169,106,0.2);border-top-color:var(--tef-gold);border-radius:50%;animation:tef-spin 0.7s linear infinite}
.tef-cancel{padding:14px 24px;border-radius:14px;border:1.5px solid var(--tef-border);background:none;font-family:var(--tef-font);font-size:14px;font-weight:700;color:var(--tef-text3);cursor:pointer;transition:all 0.15s}
.tef-cancel:hover{border-color:rgba(8,11,12,0.2);color:var(--tef-text)}
`;
