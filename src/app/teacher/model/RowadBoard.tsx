"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Maqsad } from "@prisma/client";
import { COLUMN_ORDER, COLUMN_LABELS } from "@/lib/rowad";

type Lang = "ar" | "sq" | "en";

export type Card = {
  id: string;
  name_ar: string;
  name_sq: string | null;
  strategic_ar?: string | null;
  strategic_sq?: string | null;
  description_ar?: string | null;
  description_sq?: string | null;
  duty_ar?: string | null;
  duty_sq?: string | null;
  reward_ar?: string | null;
  reward_sq?: string | null;
  fruit_ar?: string | null;
  fruit_sq?: string | null;
  verification_ar?: string | null;
  verification_sq?: string | null;
};

export type Placement = { concept_id: string; maqsad: Maqsad; level: number };
type LevelRow = { order: number; name_ar: string; name_sq: string | null };

const cellKey = (level: number, maqsad: Maqsad) => `${level}:${maqsad}`;
const loc = (lang: Lang, ar?: string | null, sq?: string | null) =>
  (lang === "sq" && sq ? sq : ar) ?? "";

const STR = {
  ar: {
    brand: "بناء الأهلية",
    brandSub: "مقياس التوجه الإيجابي",
    sub: "جيل الرواد",
    instructions:
      "اسحب كل بطاقة إلى مكانها الصحيح في النموذج، أو اضغط البطاقة ثم اضغط الخانة. يجب وضع ٢٥ بطاقة.",
    cards: "البطاقات",
    remaining: "متبقية",
    done: "اكتملت ✓",
    allPlaced: "اكتمل وضع جميع البطاقات ✓",
    level: "المستوى",
    maqsad: "المقصد",
    transform: "التحول الاستراتيجي في المنظومة",
    progress: "التقدم",
    submit: "إرسال النموذج",
    submitting: "جارٍ الإرسال...",
    details: "تفاصيل",
    close: "إغلاق",
    strategic: "المفهوم الاستراتيجي",
    description: "الوصف",
    duty: "الواجب",
    reward: "الأجر",
    fruit: "الثمرة",
    verification: "مؤشر التحقق",
  },
  sq: {
    brand: "Bina Al-Ahlia",
    brandSub: "Matësi i orientimit pozitiv",
    sub: "Brezi i Pionierëve",
    instructions:
      "Tërhiq çdo kartë në vendin e saj, ose kliko kartën pastaj kliko qelizën. Duhen vendosur 25 karta.",
    cards: "Kartat",
    remaining: "të mbetura",
    done: "Plotësuar ✓",
    allPlaced: "Të gjitha kartat u vendosën ✓",
    level: "Niveli",
    maqsad: "Qëllimi",
    transform: "Transformimi strategjik në sistem",
    progress: "Progresi",
    submit: "Dërgo modelin",
    submitting: "Duke dërguar...",
    details: "Detaje",
    close: "Mbyll",
    strategic: "Koncepti strategjik",
    description: "Përshkrimi",
    duty: "Detyra",
    reward: "Shpërblimi",
    fruit: "Fryti",
    verification: "Treguesi i verifikimit",
  },
} as const;

/* Faded corner seal (top, trailing side) — matches the printed template */
function Seal() {
  return (
    <svg className="rbx-seal" width="150" height="150" viewBox="0 0 150 150" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(75,75)" stroke="#9A7B46" fill="none">
        <circle r="70" strokeWidth="1" />
        <circle r="54" strokeWidth="0.7" />
        <circle r="34" strokeWidth="0.7" />
        <circle r="16" strokeWidth="0.6" />
        {[0, 45, 90, 135].map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1={-Math.cos(r) * 70} y1={-Math.sin(r) * 70} x2={Math.cos(r) * 70} y2={Math.sin(r) * 70} strokeWidth="0.5" />;
        })}
      </g>
    </svg>
  );
}

export default function RowadBoard({
  lang,
  title,
  levels,
  cards,
  detailed,
  initial,
  onChange,
  onSubmit,
  submitting,
}: {
  lang: Lang;
  title: string;
  levels: LevelRow[];
  cards: Card[];
  detailed: boolean;
  initial: Placement[];
  onChange?: (p: Placement[]) => void;
  onSubmit: (p: Placement[]) => void;
  submitting: boolean;
}) {
  const tr = STR[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [placed, setPlaced] = useState<Record<string, { level: number; maqsad: Maqsad }>>(() => {
    const m: Record<string, { level: number; maqsad: Maqsad }> = {};
    for (const p of initial) m[p.concept_id] = { level: p.level, maqsad: p.maqsad };
    return m;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<Card | null>(null);

  const cardById = useMemo(() => {
    const m: Record<string, Card> = {};
    for (const c of cards) m[c.id] = c;
    return m;
  }, [cards]);

  const conceptInCell = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [cid, pos] of Object.entries(placed)) m[cellKey(pos.level, pos.maqsad)] = cid;
    return m;
  }, [placed]);

  const tray = useMemo(() => cards.filter((c) => !placed[c.id]), [cards, placed]);
  const placedCount = Object.keys(placed).length;
  const allPlaced = placedCount === cards.length && cards.length > 0;
  const progress = (placedCount / Math.max(cards.length, 1)) * 100;

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const cb = onChangeRef.current;
    if (!cb) return;
    const id = setTimeout(() => {
      cb(Object.entries(placed).map(([concept_id, pos]) => ({ concept_id, level: pos.level, maqsad: pos.maqsad })));
    }, 800);
    return () => clearTimeout(id);
  }, [placed]);

  function placeCard(cid: string, level: number, maqsad: Maqsad) {
    setPlaced((prev) => {
      const next = { ...prev };
      const from = next[cid];
      const occupant = Object.entries(next).find(([id, pos]) => pos.level === level && pos.maqsad === maqsad && id !== cid);
      if (occupant) {
        const [occId] = occupant;
        if (from) next[occId] = { level: from.level, maqsad: from.maqsad };
        else delete next[occId];
      }
      next[cid] = { level, maqsad };
      return next;
    });
    setSelected(null);
  }
  function returnToTray(cid: string) {
    setPlaced((prev) => { const n = { ...prev }; delete n[cid]; return n; });
    setSelected(null);
  }
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onCellDrop(e: React.DragEvent, level: number, maqsad: Maqsad) {
    e.preventDefault(); setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) placeCard(id, level, maqsad);
  }
  function onTrayDrop(e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && placed[id]) returnToTray(id);
  }
  function onCardClick(id: string) { setSelected((s) => (s === id ? null : id)); }
  function onCellClick(level: number, maqsad: Maqsad) {
    const occ = conceptInCell[cellKey(level, maqsad)];
    if (selected) placeCard(selected, level, maqsad);
    else if (occ) setSelected(occ);
  }

  const sortedLevels = [...levels].sort((a, b) => a.order - b.order);

  function renderRow(lvl: LevelRow) {
    return (
      <div className="rbx-row" key={lvl.order}>
        {COLUMN_ORDER.map((mq) => {
          const occ = conceptInCell[cellKey(lvl.order, mq)];
          const card = occ ? cardById[occ] : null;
          const key = cellKey(lvl.order, mq);
          const isOver = dragOver === key;
          return (
            <div
              key={mq}
              className="rbx-cellwrap"
              onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
              onDragLeave={() => setDragOver((d) => (d === key ? null : d))}
              onDrop={(e) => onCellDrop(e, lvl.order, mq)}
              onClick={() => onCellClick(lvl.order, mq)}
            >
              <div className={`rbx-cell${card ? " filled" : ""}${isOver ? " over" : ""}${selected && !card ? " target" : ""}`}>
                <span className="rbx-cell-dot" />
                {card ? (
                  <div
                    className={`rbx-chip${selected === card.id ? " sel" : ""}`}
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragStart(e, card.id); }}
                    onClick={(e) => { e.stopPropagation(); onCardClick(card.id); }}
                  >
                    <span className="rbx-chip-text">{loc(lang, card.name_ar, card.name_sq)}</span>
                    {detailed && (
                      <button type="button" className="rbx-chip-i" title={tr.details}
                        onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}>i</button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div className="rbx-rowlabel">{loc(lang, lvl.name_ar, lvl.name_sq)}</div>
      </div>
    );
  }

  return (
    <div className="rbx-wrap" dir={dir}>
      <div className="rbx-inner">
        {/* Cards tray */}
        <div className="rbx-tray" onDragOver={(e) => e.preventDefault()} onDrop={onTrayDrop}>
          <div className="rbx-tray-head">
            <span className="rbx-tray-title">{tr.cards}</span>
            <span className="rbx-tray-count">{tray.length === 0 ? tr.done : `${tray.length} ${tr.remaining}`}</span>
          </div>
          <div className="rbx-tray-cards">
            {tray.length === 0 ? (
              <span className="rbx-tray-empty">{tr.allPlaced}</span>
            ) : (
              tray.map((c) => (
                <div key={c.id} className={`rbx-card${selected === c.id ? " sel" : ""}`}
                  draggable onDragStart={(e) => onDragStart(e, c.id)} onClick={() => onCardClick(c.id)}>
                  <span className="rbx-card-text">{loc(lang, c.name_ar, c.name_sq)}</span>
                  {detailed && (
                    <button type="button" className="rbx-card-i"
                      onClick={(e) => { e.stopPropagation(); setDetailCard(c); }}>{tr.details}</button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Framed model document ── */}
        <div className="rbx-frame">
          <Seal />

          {/* Header */}
          <div className="rbx-header">
            <div className="rbx-brand">
              <div className="rbx-brand-emblem" aria-hidden>
                <svg width="34" height="34" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="#2b2417" />
                  <circle cx="20" cy="20" r="18" fill="url(#rbxg)" />
                  <defs>
                    <radialGradient id="rbxg" cx="0.4" cy="0.35" r="0.7">
                      <stop offset="0" stopColor="#5a4a30" />
                      <stop offset="1" stopColor="#1c1610" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <div className="rbx-brand-text">
                <span className="rbx-brand-name">{tr.brand}</span>
                <span className="rbx-brand-sub">{tr.brandSub}</span>
              </div>
            </div>
            <div className="rbx-titleblock">
              <h1 className="rbx-title">{title}</h1>
              <div className="rbx-subrow">
                <span className="rbx-subline" />
                <span className="rbx-subtext">{tr.sub}</span>
                <span className="rbx-subline" />
              </div>
            </div>
            <div className="rbx-header-spacer" />
          </div>

          {/* Axis labels */}
          <div className="rbx-axis">
            <div className="rbx-axis-maqsad">
              <span className="rbx-axis-dash" /><span className="rbx-axis-maqsad-text">{tr.maqsad}</span><span className="rbx-axis-dash" />
            </div>
            <div className="rbx-axis-level">{tr.level}</div>
          </div>

          {/* Column names */}
          <div className="rbx-colnames">
            {COLUMN_ORDER.map((mq) => (
              <div key={mq} className="rbx-colname">
                {COLUMN_LABELS[mq][lang === "sq" ? "sq" : "ar"]}
                <span className="rbx-colname-dot" />
              </div>
            ))}
            <div className="rbx-colname-pad" />
          </div>

          {/* Rows 1–2 */}
          <div className="rbx-section">{sortedLevels.filter((l) => l.order <= 2).map(renderRow)}</div>

          {/* Transform band */}
          <div className="rbx-band">
            <span className="rbx-band-line s" />
            <span className="rbx-band-text">{tr.transform}</span>
            <span className="rbx-band-line e" />
          </div>

          {/* Rows 3–5 */}
          <div className="rbx-section">{sortedLevels.filter((l) => l.order >= 3).map(renderRow)}</div>
        </div>

        {/* Instructions */}
        <p className="rbx-instructions">{tr.instructions}</p>

        {/* Footer */}
        <div className="rbx-footer">
          <div className="rbx-progress">
            <div className="rbx-progress-head">
              <span className="rbx-progress-label">{tr.progress}</span>
              <span className="rbx-progress-num">{placedCount} / {cards.length}</span>
            </div>
            <div className="rbx-progress-bar"><div className="rbx-progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <button className="rbx-submit" disabled={!allPlaced || submitting}
            onClick={() => onSubmit(Object.entries(placed).map(([concept_id, pos]) => ({ concept_id, level: pos.level, maqsad: pos.maqsad })))}>
            {submitting ? (<><span className="rbx-spin" />{tr.submitting}</>) : tr.submit}
          </button>
        </div>
      </div>

      {/* Stage 2 detail modal */}
      {detailCard && (
        <div className="rbx-modal-overlay" onClick={() => setDetailCard(null)}>
          <div className="rbx-modal" dir={dir} onClick={(e) => e.stopPropagation()}>
            <div className="rbx-modal-head">
              <h3>{loc(lang, detailCard.name_ar, detailCard.name_sq)}</h3>
              <button className="rbx-modal-close" onClick={() => setDetailCard(null)}>{tr.close}</button>
            </div>
            <div className="rbx-modal-body">
              <DetailRow label={tr.strategic} value={loc(lang, detailCard.strategic_ar, detailCard.strategic_sq)} />
              <DetailRow label={tr.description} value={loc(lang, detailCard.description_ar, detailCard.description_sq)} />
              <DetailRow label={tr.duty} value={loc(lang, detailCard.duty_ar, detailCard.duty_sq)} />
              <DetailRow label={tr.reward} value={loc(lang, detailCard.reward_ar, detailCard.reward_sq)} />
              <DetailRow label={tr.fruit} value={loc(lang, detailCard.fruit_ar, detailCard.fruit_sq)} />
              <DetailRow label={tr.verification} value={loc(lang, detailCard.verification_ar, detailCard.verification_sq)} />
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rbx-detail-row">
      <span className="rbx-detail-label">{label}</span>
      <p className="rbx-detail-value">{value}</p>
    </div>
  );
}

const COLS_TEMPLATE = "repeat(5,1fr) 104px";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  @keyframes rbx-spin{to{transform:rotate(360deg)}}
  @keyframes rbx-chipin{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}

  .rbx-wrap{
    --cream-0:#F6EEDC;--cream-1:#EFE6D1;--cream-2:#E7DDC4;
    --gold:#C2A059;--gold-soft:#D8C49A;--gold-line:#C0A063;
    --ink:#3B2F1C;--brown:#5A4A30;--brown-soft:#7A6440;--label:#A9863F;--level:#7C5A38;
    position:relative;min-height:100%;font-family:'Cairo','Tajawal',sans-serif;color:var(--ink);
    background:
      radial-gradient(ellipse at 50% 12%, #F8F1E0 0%, transparent 55%),
      linear-gradient(160deg,#EFE6D2 0%,#E9DFC7 100%);
  }
  .rbx-inner{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:26px 16px 50px}

  /* ── Tray ── */
  .rbx-tray{background:rgba(255,253,247,0.7);border:1.5px dashed var(--gold-soft);border-radius:14px;
    padding:14px 16px;margin-bottom:20px;box-shadow:0 2px 12px rgba(150,115,50,0.05)}
  .rbx-tray-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .rbx-tray-title{font-size:12px;font-weight:800;color:var(--brown);letter-spacing:1px}
  .rbx-tray-count{font-size:11px;font-weight:700;color:var(--label);background:rgba(194,160,89,0.12);
    padding:3px 12px;border-radius:99px;border:1px solid rgba(194,160,89,0.25)}
  .rbx-tray-cards{display:flex;flex-wrap:wrap;gap:8px;min-height:46px}
  .rbx-tray-empty{font-size:13px;color:#3f8a4f;font-weight:700;padding:8px 0}
  .rbx-card{display:inline-flex;align-items:center;gap:7px;cursor:grab;user-select:none;
    background:linear-gradient(180deg,#FFFDF8,#F4ECD9);border:1.5px solid var(--gold-soft);border-radius:10px;
    padding:8px 14px;font-size:12.5px;font-weight:700;color:var(--brown);transition:all .15s;
    box-shadow:0 1px 3px rgba(150,115,50,0.08)}
  .rbx-card:hover{border-color:var(--gold);transform:translateY(-1px);box-shadow:0 4px 12px rgba(194,160,89,0.2)}
  .rbx-card.sel{border-color:#B8963A;background:#FFF6DF;box-shadow:0 0 0 3px rgba(194,160,89,0.22)}
  .rbx-card-i{flex-shrink:0;font-size:9.5px;font-weight:800;color:var(--label);cursor:pointer;
    background:rgba(194,160,89,0.14);border:1px solid rgba(194,160,89,0.25);border-radius:6px;padding:2px 8px}
  .rbx-card-i:hover{background:rgba(194,160,89,0.3)}

  /* ── Framed document ── */
  .rbx-frame{position:relative;border-radius:14px;padding:22px 26px 26px;overflow:hidden;
    background:
      radial-gradient(ellipse at 50% 0%, #F8F1E1 0%, transparent 60%),
      linear-gradient(160deg,#F4ECD9 0%,#EDE3CC 100%);
    border:1.5px solid var(--gold-line);
    box-shadow:
      0 10px 40px rgba(150,115,50,0.12),
      inset 0 0 0 5px var(--cream-1),
      inset 0 0 0 6.5px rgba(194,160,89,0.45);}
  .rbx-seal{position:absolute;top:14px;inset-inline-start:18px;opacity:0.10;pointer-events:none}

  /* Header */
  .rbx-header{display:flex;align-items:flex-start;gap:14px;margin-bottom:6px}
  .rbx-brand{display:flex;align-items:center;gap:10px;min-width:150px}
  .rbx-brand-emblem{width:34px;height:34px;flex-shrink:0;border-radius:50%;overflow:hidden;
    box-shadow:0 2px 6px rgba(0,0,0,0.18)}
  .rbx-brand-text{display:flex;flex-direction:column;line-height:1.25}
  .rbx-brand-name{font-size:12.5px;font-weight:900;color:var(--ink)}
  .rbx-brand-sub{font-size:8.5px;font-weight:700;color:var(--brown-soft)}
  .rbx-titleblock{flex:1;text-align:center}
  .rbx-title{font-size:30px;font-weight:900;color:var(--ink);margin:0;letter-spacing:-0.3px;line-height:1.2}
  .rbx-subrow{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px}
  .rbx-subline{height:1px;width:42px;background:linear-gradient(90deg,transparent,var(--gold))}
  .rbx-subrow .rbx-subline:last-child{background:linear-gradient(90deg,var(--gold),transparent)}
  .rbx-subtext{font-size:12px;font-weight:700;color:var(--brown-soft);letter-spacing:1px}
  .rbx-header-spacer{min-width:150px}
  @media(max-width:700px){.rbx-brand,.rbx-header-spacer{min-width:0}.rbx-brand-text{display:none}}

  /* Axis labels */
  .rbx-axis{display:grid;grid-template-columns:${COLS_TEMPLATE};align-items:center;margin-top:14px}
  .rbx-axis-maqsad{grid-column:1 / span 5;display:flex;align-items:center;justify-content:center;gap:10px}
  .rbx-axis-dash{height:1px;width:70px;background:repeating-linear-gradient(90deg,rgba(169,134,63,0.5) 0 5px,transparent 5px 10px)}
  .rbx-axis-maqsad-text{font-size:12.5px;font-weight:800;color:var(--label);letter-spacing:2px}
  .rbx-axis-level{grid-column:6;text-align:center;font-size:12.5px;font-weight:800;color:var(--label);letter-spacing:1px}

  /* Column names */
  .rbx-colnames{display:grid;grid-template-columns:${COLS_TEMPLATE};margin-top:10px;margin-bottom:6px}
  .rbx-colname{text-align:center;font-size:14.5px;font-weight:800;color:var(--brown);position:relative;padding-bottom:10px}
  .rbx-colname-dot{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;
    background:var(--gold);opacity:0.7}
  .rbx-colname-pad{}

  /* Rows */
  .rbx-section{}
  .rbx-row{display:grid;grid-template-columns:${COLS_TEMPLATE};align-items:stretch;gap:0}
  .rbx-cellwrap{padding:7px;cursor:pointer}
  .rbx-rowlabel{display:flex;align-items:center;justify-content:flex-start;padding:7px 12px 7px 4px;
    font-size:12.5px;font-weight:800;color:var(--level)}
  .rbx-cell{position:relative;min-height:62px;display:flex;align-items:center;justify-content:center;padding:8px 10px;
    border:1.5px solid var(--gold-soft);border-radius:12px;
    background:linear-gradient(180deg,#FCF8EE,#F3EAD6);
    box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 1px 2px rgba(150,115,50,0.06);transition:all .14s}
  .rbx-cell-dot{position:absolute;top:8px;inset-inline-end:10px;width:5px;height:5px;border-radius:50%;
    background:var(--gold);opacity:0.45}
  .rbx-cell.target{border-color:var(--gold);background:#FBF3DF}
  .rbx-cell.over{border-color:#B8963A;background:#FBF1D6;box-shadow:0 0 0 3px rgba(194,160,89,0.25)}
  .rbx-cell.filled{border-color:var(--gold);background:linear-gradient(180deg,#FFFBF0,#F7EFDB)}

  .rbx-chip{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;cursor:grab;user-select:none;
    font-size:12px;font-weight:800;color:var(--ink);line-height:1.35;text-align:center;animation:rbx-chipin .18s ease}
  .rbx-chip.sel{color:#7a5a14}
  .rbx-chip-text{flex:1}
  .rbx-chip-i{flex-shrink:0;width:17px;height:17px;font-size:10px;font-weight:800;color:var(--label);cursor:pointer;
    background:rgba(194,160,89,0.16);border:1px solid rgba(194,160,89,0.3);border-radius:5px;line-height:1}
  .rbx-chip-i:hover{background:rgba(194,160,89,0.32)}

  /* Transform band */
  .rbx-band{display:flex;align-items:center;justify-content:center;gap:14px;padding:6px 0 8px;margin:6px 0 2px}
  .rbx-band-line{height:1px;flex:1;max-width:230px}
  .rbx-band-line.s{background:repeating-linear-gradient(90deg,rgba(169,134,63,0.5) 0 4px,transparent 4px 9px)}
  .rbx-band-line.e{background:repeating-linear-gradient(90deg,rgba(169,134,63,0.5) 0 4px,transparent 4px 9px)}
  .rbx-band-text{font-size:12.5px;font-weight:800;color:var(--brown-soft);letter-spacing:1.5px;white-space:nowrap}

  /* Instructions */
  .rbx-instructions{font-size:12.5px;color:var(--brown-soft);text-align:center;padding:16px 0 0;margin:0;line-height:1.7}

  /* Footer */
  .rbx-footer{display:flex;align-items:center;gap:20px;margin-top:18px;flex-wrap:wrap;justify-content:space-between}
  .rbx-progress{flex:1;min-width:220px}
  .rbx-progress-head{display:flex;justify-content:space-between;margin-bottom:7px}
  .rbx-progress-label{font-size:11px;font-weight:700;color:var(--brown-soft);letter-spacing:1px}
  .rbx-progress-num{font-size:11px;font-weight:800;color:var(--label)}
  .rbx-progress-bar{height:7px;background:rgba(194,160,89,0.14);border:1px solid rgba(194,160,89,0.25);
    border-radius:99px;overflow:hidden}
  .rbx-progress-fill{height:100%;border-radius:99px;transition:width .35s ease;
    background:linear-gradient(90deg,#B8963A,#C2A059,#E0C277)}
  .rbx-submit{display:flex;align-items:center;gap:10px;padding:13px 34px;border-radius:11px;
    font-size:14.5px;font-weight:900;font-family:inherit;letter-spacing:0.4px;cursor:pointer;transition:all .18s;
    background:linear-gradient(135deg,#2b2417,#3a2e1a);color:#E0C277;
    border:1px solid rgba(194,160,89,0.5);box-shadow:0 6px 20px rgba(120,90,40,0.22)}
  .rbx-submit:hover:not(:disabled){color:#F0D690;transform:translateY(-1px);box-shadow:0 10px 28px rgba(120,90,40,0.3)}
  .rbx-submit:disabled{background:rgba(194,160,89,0.12);color:rgba(124,90,56,0.45);
    border-color:rgba(194,160,89,0.2);box-shadow:none;cursor:not-allowed}
  .rbx-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(224,194,119,0.3);
    border-top-color:#E0C277;animation:rbx-spin .8s linear infinite}

  /* Modal (light) */
  .rbx-modal-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;
    background:rgba(40,30,12,0.45);backdrop-filter:blur(4px)}
  .rbx-modal{width:100%;max-width:560px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;
    background:linear-gradient(160deg,#F6EEDC,#EFE5CE);border:1.5px solid var(--gold-line);border-radius:18px;
    box-shadow:0 30px 80px rgba(80,60,20,0.3)}
  .rbx-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
    background:linear-gradient(135deg,#2b2417,#3a2e1a)}
  .rbx-modal-head h3{font-size:19px;font-weight:900;color:#E0C277;margin:0}
  .rbx-modal-close{background:rgba(224,194,119,0.16);color:#E0C277;border:1px solid rgba(224,194,119,0.3);
    border-radius:9px;padding:6px 16px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer}
  .rbx-modal-body{padding:20px 22px;overflow-y:auto;display:flex;flex-direction:column;gap:15px}
  .rbx-detail-label{display:inline-block;font-size:11px;font-weight:800;color:var(--label);
    background:rgba(194,160,89,0.12);border:1px solid rgba(194,160,89,0.25);padding:3px 11px;border-radius:7px;margin-bottom:6px}
  .rbx-detail-value{font-size:13.5px;color:var(--brown);line-height:1.75;margin:0}

  @media(max-width:700px){
    .rbx-axis,.rbx-colnames,.rbx-row{grid-template-columns:repeat(5,1fr) 64px}
    .rbx-title{font-size:21px}.rbx-colname{font-size:11px}.rbx-rowlabel{font-size:9.5px;padding:6px 4px}
    .rbx-cell{min-height:52px;padding:5px}.rbx-chip{font-size:10px}.rbx-cellwrap{padding:4px}
    .rbx-band-text{font-size:10px;letter-spacing:.5px}.rbx-frame{padding:16px 12px 18px}
  }
`;
