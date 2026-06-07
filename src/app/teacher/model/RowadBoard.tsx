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

// Pick localized text, falling back to Arabic when a translation is missing
function loc(lang: Lang, ar?: string | null, sq?: string | null) {
  if (lang === "sq" && sq) return sq;
  return ar ?? "";
}

const STR = {
  ar: {
    instructions:
      "اسحب كل بطاقة إلى مكانها الصحيح في النموذج، أو اضغط البطاقة ثم اضغط الخانة. يجب وضع 25 بطاقة.",
    cardsTray: "البطاقات",
    placed: "تم وضع",
    of: "من",
    submit: "إرسال النموذج",
    submitting: "جارٍ الإرسال...",
    transform: "التحول الاستراتيجي في المنظومة",
    maqsadHdr: "المقصد",
    levelHdr: "المستوى",
    details: "تفاصيل",
    close: "إغلاق",
    strategic: "المفهوم الاستراتيجي",
    description: "الوصف",
    duty: "الواجب",
    reward: "الأجر",
    fruit: "الثمرة",
    verification: "مؤشر التحقق",
    allPlaced: "اكتمل وضع جميع البطاقات ✓",
    remaining: "بطاقة متبقية",
  },
  sq: {
    instructions:
      "Tërhiq çdo kartë në vendin e saj të saktë, ose kliko kartën pastaj kliko qelizën. Duhen vendosur 25 karta.",
    cardsTray: "Kartat",
    placed: "Vendosur",
    of: "nga",
    submit: "Dërgo modelin",
    submitting: "Duke dërguar...",
    transform: "Transformimi strategjik në sistem",
    maqsadHdr: "Qëllimi",
    levelHdr: "Niveli",
    details: "Detaje",
    close: "Mbyll",
    strategic: "Koncepti strategjik",
    description: "Përshkrimi",
    duty: "Detyra",
    reward: "Shpërblimi",
    fruit: "Fryti",
    verification: "Treguesi i verifikimit",
    allPlaced: "Të gjitha kartat u vendosën ✓",
    remaining: "karta të mbetura",
  },
} as const;

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

  // placement map: conceptId -> { level, maqsad }
  const [placed, setPlaced] = useState<Record<string, { level: number; maqsad: Maqsad }>>(
    () => {
      const m: Record<string, { level: number; maqsad: Maqsad }> = {};
      for (const p of initial) m[p.concept_id] = { level: p.level, maqsad: p.maqsad };
      return m;
    },
  );
  const [selected, setSelected] = useState<string | null>(null);
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

  // Debounced autosave
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const cb = onChangeRef.current;
    if (!cb) return;
    const id = setTimeout(() => {
      cb(
        Object.entries(placed).map(([concept_id, pos]) => ({
          concept_id,
          level: pos.level,
          maqsad: pos.maqsad,
        })),
      );
    }, 800);
    return () => clearTimeout(id);
  }, [placed]);

  function placeCard(conceptId: string, level: number, maqsad: Maqsad) {
    setPlaced((prev) => {
      const next = { ...prev };
      const from = next[conceptId]; // previous position (if any)
      const occupant = Object.entries(next).find(
        ([cid, pos]) => pos.level === level && pos.maqsad === maqsad && cid !== conceptId,
      );
      if (occupant) {
        const [occId] = occupant;
        if (from) {
          next[occId] = { level: from.level, maqsad: from.maqsad }; // swap
        } else {
          delete next[occId]; // bump occupant back to tray
        }
      }
      next[conceptId] = { level, maqsad };
      return next;
    });
    setSelected(null);
  }

  function returnToTray(conceptId: string) {
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[conceptId];
      return next;
    });
    setSelected(null);
  }

  // ── Drag & drop ──
  function onDragStart(e: React.DragEvent, conceptId: string) {
    e.dataTransfer.setData("text/plain", conceptId);
    e.dataTransfer.effectAllowed = "move";
  }
  function onCellDrop(e: React.DragEvent, level: number, maqsad: Maqsad) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) placeCard(id, level, maqsad);
  }
  function onTrayDrop(e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && placed[id]) returnToTray(id);
  }

  // ── Click-to-place fallback ──
  function onCardClick(conceptId: string) {
    setSelected((s) => (s === conceptId ? null : conceptId));
  }
  function onCellClick(level: number, maqsad: Maqsad) {
    const occupant = conceptInCell[cellKey(level, maqsad)];
    if (selected) {
      placeCard(selected, level, maqsad);
    } else if (occupant) {
      setSelected(occupant);
    }
  }

  const sortedLevels = [...levels].sort((a, b) => a.order - b.order);

  function renderRow(lvl: LevelRow) {
    const label = loc(lang, lvl.name_ar, lvl.name_sq);
    return (
      <div className="rb-row" key={lvl.order}>
        <div className="rb-rowlabel">
          <span className="rb-rowlabel-num">{lvl.order}</span>
          <span className="rb-rowlabel-text">{label}</span>
        </div>
        {COLUMN_ORDER.map((mq) => {
          const occ = conceptInCell[cellKey(lvl.order, mq)];
          const card = occ ? cardById[occ] : null;
          return (
            <div
              key={mq}
              className={`rb-cell ${card ? "filled" : ""} ${selected && !card ? "target" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onCellDrop(e, lvl.order, mq)}
              onClick={() => onCellClick(lvl.order, mq)}
            >
              {card ? (
                <div
                  className={`rb-chip ${selected === card.id ? "sel" : ""}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, card.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCardClick(card.id);
                  }}
                >
                  <span className="rb-chip-text">{loc(lang, card.name_ar, card.name_sq)}</span>
                  {detailed && (
                    <button
                      type="button"
                      className="rb-chip-i"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailCard(card);
                      }}
                      aria-label={tr.details}
                    >
                      i
                    </button>
                  )}
                </div>
              ) : (
                <span className="rb-cell-empty" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rb-wrap" dir={dir}>
      {/* Title bar */}
      <div className="rb-titlebar">
        <div className="rb-brand">بناء الأهلية</div>
        <div className="rb-title">{title}</div>
        <div className="rb-sub">جيل الرواد</div>
      </div>

      <p className="rb-instructions">{tr.instructions}</p>

      {/* Cards tray */}
      <div
        className="rb-tray"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onTrayDrop}
      >
        <div className="rb-tray-head">
          <span className="rb-tray-title">{tr.cardsTray}</span>
          <span className="rb-tray-count">
            {tray.length} {tr.remaining}
          </span>
        </div>
        <div className="rb-tray-cards">
          {tray.length === 0 ? (
            <span className="rb-tray-empty">{tr.allPlaced}</span>
          ) : (
            tray.map((c) => (
              <div
                key={c.id}
                className={`rb-card ${selected === c.id ? "sel" : ""} ${detailed ? "detailed" : ""}`}
                draggable
                onDragStart={(e) => onDragStart(e, c.id)}
                onClick={() => onCardClick(c.id)}
              >
                <span className="rb-card-text">{loc(lang, c.name_ar, c.name_sq)}</span>
                {detailed && (
                  <button
                    type="button"
                    className="rb-card-i"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard(c);
                    }}
                  >
                    {tr.details}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Column headers + grid */}
      <div className="rb-grid">
        <div className="rb-colhead-row">
          <div className="rb-corner">
            <span>{tr.levelHdr}</span>
            <span className="rb-corner-slash">/</span>
            <span>{tr.maqsadHdr}</span>
          </div>
          {COLUMN_ORDER.map((mq) => (
            <div key={mq} className="rb-colhead">
              {COLUMN_LABELS[mq][lang === "sq" ? "sq" : "ar"]}
            </div>
          ))}
        </div>

        {/* Rows — split into the two template sections */}
        <div className="rb-section">
          {sortedLevels.filter((l) => l.order <= 2).map(renderRow)}
        </div>
        <div className="rb-band">{tr.transform}</div>
        <div className="rb-section">
          {sortedLevels.filter((l) => l.order >= 3).map(renderRow)}
        </div>
      </div>

      {/* Submit */}
      <div className="rb-footer">
        <div className="rb-progress">
          <div className="rb-progress-bar">
            <div
              className="rb-progress-fill"
              style={{ width: `${(placedCount / Math.max(cards.length, 1)) * 100}%` }}
            />
          </div>
          <span className="rb-progress-text">
            {tr.placed} {placedCount} {tr.of} {cards.length}
          </span>
        </div>
        <button
          className="rb-submit"
          disabled={!allPlaced || submitting}
          onClick={() =>
            onSubmit(
              Object.entries(placed).map(([concept_id, pos]) => ({
                concept_id,
                level: pos.level,
                maqsad: pos.maqsad,
              })),
            )
          }
        >
          {submitting ? tr.submitting : tr.submit}
        </button>
      </div>

      {/* Detail modal (Stage 2) */}
      {detailCard && (
        <div className="rb-modal-overlay" onClick={() => setDetailCard(null)}>
          <div className="rb-modal" dir={dir} onClick={(e) => e.stopPropagation()}>
            <div className="rb-modal-head">
              <h3>{loc(lang, detailCard.name_ar, detailCard.name_sq)}</h3>
              <button className="rb-modal-close" onClick={() => setDetailCard(null)}>
                {tr.close}
              </button>
            </div>
            <div className="rb-modal-body">
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
    <div className="rb-detail-row">
      <span className="rb-detail-label">{label}</span>
      <p className="rb-detail-value">{value}</p>
    </div>
  );
}

const styles = `
  .rb-wrap{--gold:#C8A96A;--gold2:#E5B93C;--ink:#2b2417;--cream:#FBF8F1;--cream2:#F3ECDD;--line:#E2D7BF;--line2:#D8C9A6;
    font-family:'Cairo','Tajawal',sans-serif;max-width:1100px;margin:0 auto;padding:8px;}
  .rb-titlebar{text-align:center;padding:16px;border:1.5px solid var(--line2);border-radius:14px;
    background:linear-gradient(180deg,#FFFDF8,var(--cream2));position:relative;margin-bottom:14px;}
  .rb-brand{position:absolute;top:10px;inset-inline-start:16px;font-size:11px;font-weight:800;color:var(--gold);opacity:.8}
  .rb-title{font-size:24px;font-weight:900;color:var(--ink);letter-spacing:-.3px}
  .rb-sub{font-size:12px;color:#9a875e;margin-top:2px;font-weight:600}
  .rb-instructions{font-size:13px;color:#7a6c4d;text-align:center;margin:0 0 14px;line-height:1.6}

  .rb-tray{background:#fff;border:1.5px dashed var(--line2);border-radius:14px;padding:12px 14px;margin-bottom:16px}
  .rb-tray-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .rb-tray-title{font-size:13px;font-weight:800;color:var(--ink)}
  .rb-tray-count{font-size:11.5px;font-weight:700;color:var(--gold);background:rgba(200,169,106,.12);padding:3px 10px;border-radius:99px}
  .rb-tray-cards{display:flex;flex-wrap:wrap;gap:8px;min-height:44px}
  .rb-tray-empty{font-size:13px;color:#3f8a4f;font-weight:700;padding:8px}

  .rb-card{display:flex;align-items:center;gap:6px;background:linear-gradient(180deg,#FFFDF8,#F7F0E0);
    border:1.5px solid var(--line2);border-radius:10px;padding:9px 13px;cursor:grab;font-size:13px;font-weight:700;
    color:var(--ink);transition:all .15s;user-select:none;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .rb-card:hover{border-color:var(--gold);box-shadow:0 3px 10px rgba(200,169,106,.2);transform:translateY(-1px)}
  .rb-card.sel{border-color:var(--gold2);background:#FFF7E0;box-shadow:0 0 0 3px rgba(229,185,60,.25)}
  .rb-card.detailed{max-width:240px}
  .rb-card-text{flex:1}
  .rb-card-i{flex-shrink:0;font-size:10px;font-weight:800;color:var(--gold);background:rgba(200,169,106,.14);
    border:none;border-radius:6px;padding:2px 7px;cursor:pointer}
  .rb-card-i:hover{background:rgba(200,169,106,.28)}

  .rb-grid{border:1.5px solid var(--line2);border-radius:14px;overflow:hidden;background:var(--cream)}
  .rb-colhead-row,.rb-row{display:grid;grid-template-columns:150px repeat(5,1fr)}
  .rb-colhead-row{background:linear-gradient(180deg,#2b2417,#1c1810)}
  .rb-corner{display:flex;align-items:center;justify-content:center;gap:3px;padding:10px;font-size:10px;font-weight:700;
    color:rgba(200,169,106,.7);border-inline-end:1px solid rgba(200,169,106,.2)}
  .rb-corner-slash{opacity:.4}
  .rb-colhead{padding:12px 8px;text-align:center;font-size:14px;font-weight:800;color:var(--gold2);
    border-inline-end:1px solid rgba(200,169,106,.15)}
  .rb-colhead:last-child{border-inline-end:none}

  .rb-row{border-top:1px solid var(--line)}
  .rb-rowlabel{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--cream2);
    border-inline-end:1px solid var(--line2);min-height:74px}
  .rb-rowlabel-num{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--gold);
    display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
  .rb-rowlabel-text{font-size:12.5px;font-weight:800;color:var(--ink);line-height:1.3}

  .rb-cell{padding:7px;border-inline-end:1px solid var(--line);display:flex;align-items:stretch;
    min-height:74px;transition:background .12s}
  .rb-cell:last-child{border-inline-end:none}
  .rb-cell:hover{background:rgba(200,169,106,.06)}
  .rb-cell.target{background:rgba(229,185,60,.12);box-shadow:inset 0 0 0 2px rgba(229,185,60,.35)}
  .rb-cell-empty{flex:1;border:1.5px dashed var(--line2);border-radius:8px;opacity:.55}

  .rb-chip{flex:1;display:flex;align-items:center;gap:5px;background:linear-gradient(180deg,#fff,#FBF4E4);
    border:1.5px solid var(--gold);border-radius:8px;padding:7px 9px;cursor:grab;font-size:12px;font-weight:700;
    color:var(--ink);box-shadow:0 2px 6px rgba(200,169,106,.18);user-select:none}
  .rb-chip.sel{box-shadow:0 0 0 3px rgba(229,185,60,.3)}
  .rb-chip-text{flex:1;line-height:1.3}
  .rb-chip-i{flex-shrink:0;width:18px;height:18px;font-size:10px;font-weight:800;color:var(--gold);
    background:rgba(200,169,106,.16);border:none;border-radius:5px;cursor:pointer}

  .rb-band{background:linear-gradient(90deg,transparent,rgba(200,169,106,.18),transparent);
    text-align:center;padding:8px;font-size:12.5px;font-weight:800;color:#8a6d2e;border-top:1px solid var(--line2);
    border-bottom:1px solid var(--line2);letter-spacing:.3px}

  .rb-footer{display:flex;align-items:center;gap:16px;margin-top:18px;flex-wrap:wrap}
  .rb-progress{flex:1;min-width:200px}
  .rb-progress-bar{height:8px;background:var(--cream2);border-radius:99px;overflow:hidden;border:1px solid var(--line)}
  .rb-progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width .3s}
  .rb-progress-text{font-size:12px;font-weight:700;color:#7a6c4d;margin-top:6px;display:block}
  .rb-submit{background:var(--ink);color:var(--gold);border:1px solid rgba(200,169,106,.4);border-radius:11px;
    padding:13px 32px;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer;transition:all .18s}
  .rb-submit:hover:not(:disabled){background:#3a3018;color:var(--gold2);box-shadow:0 6px 20px rgba(0,0,0,.2)}
  .rb-submit:disabled{opacity:.4;cursor:not-allowed}

  .rb-modal-overlay{position:fixed;inset:0;background:rgba(20,16,8,.6);backdrop-filter:blur(3px);z-index:100;
    display:flex;align-items:center;justify-content:center;padding:20px;animation:rbfade .2s ease}
  @keyframes rbfade{from{opacity:0}to{opacity:1}}
  .rb-modal{background:var(--cream);border:1.5px solid var(--line2);border-radius:16px;max-width:560px;width:100%;
    max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)}
  .rb-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;
    background:linear-gradient(180deg,#2b2417,#1c1810)}
  .rb-modal-head h3{font-size:18px;font-weight:900;color:var(--gold2);margin:0}
  .rb-modal-close{background:rgba(200,169,106,.15);color:var(--gold);border:none;border-radius:8px;padding:6px 14px;
    font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer}
  .rb-modal-body{padding:18px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
  .rb-detail-label{display:inline-block;font-size:11px;font-weight:800;color:var(--gold);background:rgba(200,169,106,.12);
    padding:3px 10px;border-radius:6px;margin-bottom:5px}
  .rb-detail-value{font-size:13.5px;color:var(--ink);line-height:1.7;margin:0}

  @media(max-width:760px){
    .rb-colhead-row,.rb-row{grid-template-columns:84px repeat(5,1fr)}
    .rb-rowlabel-text{font-size:10px}.rb-rowlabel{padding:6px 5px}
    .rb-colhead{font-size:11px;padding:8px 3px}.rb-corner{font-size:8px}
    .rb-chip{font-size:10px;padding:5px}.rb-cell{min-height:60px;padding:4px}
  }
`;
