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
type PlacedMap = Record<string, { level: number; maqsad: Maqsad }>;

const cellKey = (level: number, maqsad: Maqsad) => `${level}:${maqsad}`;
const loc = (lang: Lang, ar?: string | null, sq?: string | null) =>
  (lang === "sq" && sq ? sq : ar) ?? "";

const STR = {
  ar: {
    brand: "بناء الأهلية",
    sub: "جيل الرواد",
    instructions:
      "اسحب كل بطاقة إلى مكانها الصحيح في النموذج، أو اضغط البطاقة ثم اضغط الخانة. يجب وضع 25 بطاقة.",
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
    levelFallback: (n: number) => `المستوى ${n}`,
    stepOne: "1. اختر بطاقة",
    stepTwo: "2. اختر المقصد والمستوى",
    stepThree: "3. راجع ثم أرسل",
    selectedLabel: "البطاقة المختارة",
    chooseCell: "اختر الآن خانة فارغة في النموذج لوضع البطاقة.",
    cancelSelection: "إلغاء الاختيار",
    searchPlaceholder: "ابحث في البطاقات...",
    undo: "تراجع",
    clear: "تفريغ اللوحة",
    noCards: "لا توجد بطاقات مطابقة للبحث.",
    horizontalHint: "حرّك الجدول أفقيًا لرؤية جميع المقاصد",
  },
  sq: {
    brand: "Bina Al-Ahlia",
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
    levelFallback: (n: number) => `Niveli ${n}`,
    stepOne: "1. Zgjidh një kartë",
    stepTwo: "2. Zgjidh qëllimin dhe nivelin",
    stepThree: "3. Kontrollo dhe dërgo",
    selectedLabel: "Karta e zgjedhur",
    chooseCell: "Tani zgjidh një qelizë të lirë në model.",
    cancelSelection: "Anulo zgjedhjen",
    searchPlaceholder: "Kërko kartat...",
    undo: "Zhbëj",
    clear: "Pastro tabelën",
    noCards: "Nuk ka karta që përputhen me kërkimin.",
    horizontalHint: "Lëviz tabelën horizontalisht për të parë të gjitha qëllimet",
  },
} as const;

/* Faded corner seal (top, trailing side) — matches the printed template */
function Seal() {
  return (
    <svg className="rbx-seal" width="150" height="150" viewBox="0 0 150 150" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(75,75)" stroke="#6B1E2D" fill="none">
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

  const [placed, setPlaced] = useState<PlacedMap>(() => {
    const m: PlacedMap = {};
    for (const p of initial) m[p.concept_id] = { level: p.level, maqsad: p.maqsad };
    return m;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [history, setHistory] = useState<PlacedMap[]>([]);
  const [query, setQuery] = useState("");

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
  const visibleTray = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return tray;
    return tray.filter((c) => `${c.name_ar} ${c.name_sq ?? ""}`.toLocaleLowerCase().includes(q));
  }, [query, tray]);
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
      setHistory((h) => [...h.slice(-19), prev]);
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
    setPlaced((prev) => { setHistory((h) => [...h.slice(-19), prev]); const n = { ...prev }; delete n[cid]; return n; });
    setSelected(null);
  }
  function undoLast() {
    const previous = history.at(-1);
    if (!previous) return;
    setPlaced(previous);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  }
  function clearBoard() {
    if (placedCount === 0) return;
    setHistory((h) => [...h.slice(-19), placed]);
    setPlaced({});
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

  // Resolve a level's label in the active language. Falls back to "Niveli N"
  // / "المستوى N" when the alt-language name hasn't been filled in the DB.
  function levelLabel(lvl: LevelRow): string {
    if (lang === "sq" && lvl.name_sq?.trim()) return lvl.name_sq;
    if (lvl.name_ar?.trim()) return lang === "sq" ? (lvl.name_sq?.trim() || lvl.name_ar) : lvl.name_ar;
    return tr.levelFallback(lvl.order);
  }

  function renderRow(lvl: LevelRow) {
    return (
      <div className="rbx-row" key={lvl.order}>
        {/* Level label FIRST — sits at the row-start side in both LTR & RTL. */}
        <div className="rbx-rowlabel">
          <span className="rbx-rowlabel-num">{lvl.order}</span>
          <span className="rbx-rowlabel-text">{levelLabel(lvl)}</span>
        </div>
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
                <span className="rbx-cell-corner rbx-cell-corner--tr" aria-hidden />
                <span className="rbx-cell-corner rbx-cell-corner--bl" aria-hidden />
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
      </div>
    );
  }

  return (
    <div className="rbx-wrap" dir={dir}>
      <div className="rbx-inner">
        <div className="rbx-guide" aria-label={tr.instructions}>
          <div className={`rbx-guide-step${placedCount === 0 ? " active" : " done"}`}><b>1</b><span>{tr.stepOne}</span></div>
          <i />
          <div className={`rbx-guide-step${placedCount > 0 && !allPlaced ? " active" : allPlaced ? " done" : ""}`}><b>2</b><span>{tr.stepTwo}</span></div>
          <i />
          <div className={`rbx-guide-step${allPlaced ? " active" : ""}`}><b>3</b><span>{tr.stepThree}</span></div>
        </div>

        {/* Cards tray */}
        <div className="rbx-tray" onDragOver={(e) => e.preventDefault()} onDrop={onTrayDrop}>
          <div className="rbx-tray-top">
            <div className="rbx-tray-head">
              <span className="rbx-tray-title">{tr.cards}</span>
              <span className="rbx-tray-count">{tray.length === 0 ? tr.done : `${tray.length} ${tr.remaining}`}</span>
            </div>
            <div className="rbx-tools">
              <label className="rbx-search">
                <span aria-hidden>⌕</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr.searchPlaceholder} />
              </label>
              <button type="button" className="rbx-tool-btn" onClick={undoLast} disabled={history.length === 0}>↶ {tr.undo}</button>
              <button type="button" className="rbx-tool-btn danger" onClick={clearBoard} disabled={placedCount === 0}>{tr.clear}</button>
            </div>
          </div>
          {selected && cardById[selected] && (
            <div className="rbx-selected-banner">
              <div><small>{tr.selectedLabel}</small><strong>{loc(lang, cardById[selected].name_ar, cardById[selected].name_sq)}</strong></div>
              <p>{tr.chooseCell}</p>
              <button type="button" onClick={() => setSelected(null)}>{tr.cancelSelection}</button>
            </div>
          )}
          <div className="rbx-tray-cards">
            {tray.length === 0 ? (
              <span className="rbx-tray-empty">{tr.allPlaced}</span>
            ) : visibleTray.length === 0 ? (
              <span className="rbx-tray-empty muted">{tr.noCards}</span>
            ) : (
              visibleTray.map((c) => (
                <div
                  key={c.id}
                  className={`rbx-card${selected === c.id ? " sel" : ""}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, c.id)}
                  onClick={() => onCardClick(c.id)}
                >
                  <span className="rbx-card-emblem" aria-hidden />
                  <span className="rbx-card-text">{loc(lang, c.name_ar, c.name_sq)}</span>
                  {detailed && (
                    <button
                      type="button"
                      className="rbx-card-i"
                      onClick={(e) => { e.stopPropagation(); setDetailCard(c); }}
                    >
                      {tr.details}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Framed model document ── */}
        <p className="rbx-scroll-hint">↔ {tr.horizontalHint}</p>
        <div className="rbx-board-scroll">
        <div className="rbx-frame">
          <Seal />

          {/* Header */}
          <div className="rbx-header">
            <div className="rbx-brand">
              <div className="rbx-brand-emblem" aria-hidden>
                <svg width="36" height="36" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="#4A0E1C" />
                  <circle cx="20" cy="20" r="18" fill="url(#rbxg)" />
                  <defs>
                    <radialGradient id="rbxg" cx="0.4" cy="0.35" r="0.7">
                      <stop offset="0" stopColor="#6B1E2D" />
                      <stop offset="1" stopColor="#6B1E2D" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <div className="rbx-brand-text">
                <span className="rbx-brand-name">{tr.brand}</span>
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

          {/* Axis labels — level column sits first */}
          <div className="rbx-axis">
            <div className="rbx-axis-level">{tr.level}</div>
            <div className="rbx-axis-maqsad">
              <span className="rbx-axis-dash" /><span className="rbx-axis-maqsad-text">{tr.maqsad}</span><span className="rbx-axis-dash" />
            </div>
          </div>

          {/* Column names — leading slot is the level header pad */}
          <div className="rbx-colnames">
            <div className="rbx-colname-pad" />
            {COLUMN_ORDER.map((mq) => (
              <div key={mq} className="rbx-colname">
                {COLUMN_LABELS[mq][lang === "sq" ? "sq" : "ar"]}
                <span className="rbx-colname-dot" />
              </div>
            ))}
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

/* Grid layout: level column FIRST, then five maqsad columns. In RTL the
   visual start side (right) is naturally the level column; in LTR it's
   the left — exactly what the user asked for. */
const COLS_TEMPLATE = "128px repeat(5, minmax(0, 1fr))";
const COLS_TEMPLATE_SM = "78px repeat(5, minmax(0, 1fr))";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=El+Messiri:wght@500;600;700;800&display=swap');
  @keyframes rbx-spin{to{transform:rotate(360deg)}}
  @keyframes rbx-chipin{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
  @keyframes rbx-pulse{0%,100%{box-shadow:0 0 0 0 rgba(107,30,45,0.0)}50%{box-shadow:0 0 0 6px rgba(107,30,45,0.18)}}

  .rbx-wrap{
    --cream-0:#EFEAE0;--cream-1:#E5E0D5;--cream-2:#E5E0D5;
    --gold:#B8A082;--gold-soft:#D9C9B0;--gold-line:#B8A082;--gold-deep:#6B1E2D;
    --ink:#6B1E2D;--brown:#6B1E2D;--brown-soft:#796A62;--label:#6B1E2D;--level:#6B1E2D;
    position:relative;min-height:100%;font-family:'Cairo','Tajawal',sans-serif;color:var(--ink);
    background:
      radial-gradient(ellipse at 50% 12%, #F7F3EB 0%, transparent 55%),
      linear-gradient(160deg,#E5E0D5 0%,#E5E0D5 100%);
  }
  .rbx-inner{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:26px 16px 50px}

  /* ── Tray ── */
  .rbx-tray{background:rgba(255,251,245,0.7);border:1.5px dashed var(--gold-soft);border-radius:14px;
    padding:14px 16px;margin-bottom:20px;box-shadow:0 2px 12px rgba(107,30,45,0.05)}
  .rbx-tray-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .rbx-tray-title{font-size:12px;font-weight:800;color:var(--brown);letter-spacing:1px}
  .rbx-tray-count{font-size:11px;font-weight:700;color:var(--label);background:rgba(107,30,45,0.12);
    padding:3px 12px;border-radius:99px;border:1px solid rgba(107,30,45,0.25)}
  .rbx-tray-cards{display:flex;flex-wrap:wrap;gap:10px;min-height:46px}
  .rbx-tray-empty{font-size:13px;color:#1B5E20;font-weight:700;padding:8px 0}

  /* ── Tray cards — modern, refined ── */
  .rbx-card{
    position:relative;display:inline-flex;align-items:center;gap:9px;
    cursor:grab;user-select:none;
    background:linear-gradient(160deg,#FFFBF5 0%,#EFEAE0 100%);
    border:1.5px solid var(--gold-soft);
    border-radius:14px;
    padding:10px 16px 10px 14px;
    font-size:13px;font-weight:700;color:var(--brown);
    transition:transform .18s var(--rbx-ease,cubic-bezier(.22,1,.36,1)), box-shadow .18s, border-color .18s;
    box-shadow:
      0 1px 3px rgba(107,30,45,0.10),
      inset 0 1px 0 rgba(255,255,255,0.55);
    overflow:hidden;
  }
  .rbx-card::before{
    content:''; position:absolute; inset-inline-start:0; top:8px; bottom:8px; width:3px; border-radius:0 2px 2px 0;
    background:linear-gradient(180deg,var(--gold),var(--gold-deep));
    opacity:.9;
  }
  [dir="rtl"] .rbx-card::before{border-radius:2px 0 0 2px}
  .rbx-card-emblem{
    width:8px;height:8px;border-radius:50%;flex-shrink:0;
    background:radial-gradient(circle at 35% 30%, #D9C9B0 0%, var(--gold) 55%, var(--gold-deep) 100%);
    box-shadow:0 0 0 2px rgba(255,251,245,0.95), 0 0 0 3px rgba(107,30,45,0.45);
  }
  .rbx-card-text{flex:1;line-height:1.35}
  .rbx-card:hover{border-color:var(--gold);transform:translateY(-1px);
    box-shadow:0 6px 18px rgba(107,30,45,0.24), inset 0 1px 0 rgba(255,255,255,0.6)}
  .rbx-card.sel{
    border-color:var(--gold-deep);
    background:linear-gradient(160deg,#F7F3EB 0%,#E5E0D5 100%);
    box-shadow:0 0 0 3px rgba(107,30,45,0.28), 0 6px 18px rgba(107,30,45,0.22);
    animation:rbx-pulse 1.6s ease-in-out infinite;
  }
  .rbx-card-i{flex-shrink:0;font-size:10px;font-weight:800;color:var(--label);cursor:pointer;
    background:rgba(107,30,45,0.16);border:1px solid rgba(107,30,45,0.3);border-radius:7px;padding:3px 9px;
    transition:background .14s}
  .rbx-card-i:hover{background:rgba(107,30,45,0.32)}

  /* ── Framed document ── */
  .rbx-frame{position:relative;border-radius:16px;padding:24px 28px 28px;overflow:hidden;
    background:
      radial-gradient(ellipse at 50% 0%, #F7F3EB 0%, transparent 60%),
      linear-gradient(160deg,#F7F3EB 0%,#E5E0D5 100%);
    border:1.5px solid var(--gold-line);
    box-shadow:
      0 10px 40px rgba(107,30,45,0.12),
      inset 0 0 0 5px var(--cream-1),
      inset 0 0 0 6.5px rgba(107,30,45,0.45);}
  .rbx-seal{position:absolute;top:14px;inset-inline-start:18px;opacity:0.10;pointer-events:none}

  /* Header */
  .rbx-header{display:flex;align-items:flex-start;gap:14px;margin-bottom:6px}
  .rbx-brand{display:flex;align-items:center;gap:10px;min-width:150px}
  .rbx-brand-emblem{width:36px;height:36px;flex-shrink:0;border-radius:50%;overflow:hidden;
    box-shadow:0 2px 6px rgba(26,26,26,0.18)}
  .rbx-brand-text{display:flex;flex-direction:column;line-height:1.25}
  .rbx-brand-name{font-size:13px;font-weight:900;color:var(--ink)}
  .rbx-titleblock{flex:1;text-align:center}
  .rbx-title{font-family:'El Messiri','Cairo',sans-serif;font-size:32px;font-weight:800;color:var(--ink);margin:0;letter-spacing:-0.3px;line-height:1.2}
  .rbx-subrow{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px}
  .rbx-subline{height:1px;width:54px;background:linear-gradient(90deg,transparent,var(--gold))}
  .rbx-subrow .rbx-subline:last-child{background:linear-gradient(90deg,var(--gold),transparent)}
  .rbx-subtext{font-size:12.5px;font-weight:700;color:var(--brown-soft);letter-spacing:1.2px}
  .rbx-header-spacer{min-width:150px}
  @media(max-width:700px){.rbx-brand,.rbx-header-spacer{min-width:0}.rbx-brand-text{display:none}}

  /* Axis labels — leading column = level */
  .rbx-axis{display:grid;grid-template-columns:${COLS_TEMPLATE};align-items:center;margin-top:18px}
  .rbx-axis-level{grid-column:1;text-align:center;font-size:13px;font-weight:800;color:var(--label);letter-spacing:1.5px}
  .rbx-axis-maqsad{grid-column:2 / span 5;display:flex;align-items:center;justify-content:center;gap:10px}
  .rbx-axis-dash{height:1px;width:80px;background:repeating-linear-gradient(90deg,rgba(107,30,45,0.5) 0 5px,transparent 5px 10px)}
  .rbx-axis-maqsad-text{font-size:13px;font-weight:800;color:var(--label);letter-spacing:2px}

  /* Column names — leading slot is empty (above the level labels) */
  .rbx-colnames{display:grid;grid-template-columns:${COLS_TEMPLATE};margin-top:10px;margin-bottom:8px}
  .rbx-colname-pad{}
  .rbx-colname{text-align:center;font-size:15px;font-weight:800;color:var(--brown);position:relative;padding-bottom:11px}
  .rbx-colname-dot{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;
    background:var(--gold);opacity:0.75;box-shadow:0 0 0 3px rgba(107,30,45,0.12)}

  /* Rows */
  .rbx-section{}
  .rbx-row{display:grid;grid-template-columns:${COLS_TEMPLATE};align-items:stretch;gap:0}

  /* Row label sits BEFORE the cells → start-side in both RTL and LTR */
  .rbx-rowlabel{
    display:flex;align-items:center;gap:9px;
    padding:8px 14px;
    font-size:13px;font-weight:800;color:var(--level);line-height:1.3;
    text-align:start;
  }
  .rbx-rowlabel-num{
    flex-shrink:0;width:26px;height:26px;border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    font-family:'El Messiri','Cairo',sans-serif;font-weight:800;font-size:13px;
    color:var(--gold-deep);
    background:linear-gradient(160deg,#EFEAE0,#E5E0D5);
    border:1px solid rgba(107,30,45,0.45);
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 2px rgba(107,30,45,0.10);
  }
  .rbx-rowlabel-text{flex:1;min-width:0;overflow-wrap:break-word}

  .rbx-cellwrap{padding:8px;cursor:pointer}
  .rbx-cell{position:relative;min-height:88px;display:flex;align-items:center;justify-content:center;
    padding:10px 12px;
    border:1.5px solid var(--gold-soft);border-radius:14px;
    background:linear-gradient(180deg,#F7F3EB,#EFEAE0);
    box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 1px 2px rgba(107,30,45,0.06);
    transition:all .14s var(--rbx-ease,cubic-bezier(.22,1,.36,1))}
  .rbx-cell-corner{position:absolute;width:10px;height:10px;border:1px solid rgba(107,30,45,0.45);opacity:.7}
  .rbx-cell-corner--tr{top:6px;inset-inline-end:6px;border-inline-start:none;border-bottom:none;border-radius:0 4px 0 0}
  .rbx-cell-corner--bl{bottom:6px;inset-inline-start:6px;border-inline-end:none;border-top:none;border-radius:0 0 0 4px}
  .rbx-cell.target{border-color:var(--gold);background:#F7F3EB}
  .rbx-cell.over{border-color:#6B1E2D;background:#EFEAE0;box-shadow:0 0 0 3px rgba(107,30,45,0.25)}
  .rbx-cell.filled{
    border-color:var(--gold);
    background:linear-gradient(180deg,#FFFBF5,#EFEAE0);
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 14px rgba(107,30,45,0.14);
  }

  .rbx-chip{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    cursor:grab;user-select:none;
    font-size:13px;font-weight:800;color:var(--ink);line-height:1.4;text-align:center;
    padding:6px 8px;
    animation:rbx-chipin .18s ease;
  }
  .rbx-chip.sel{color:#6B1E2D}
  .rbx-chip-text{flex:1}
  .rbx-chip-i{flex-shrink:0;width:19px;height:19px;font-size:10.5px;font-weight:800;color:var(--label);cursor:pointer;
    background:rgba(107,30,45,0.16);border:1px solid rgba(107,30,45,0.3);border-radius:6px;line-height:1}
  .rbx-chip-i:hover{background:rgba(107,30,45,0.32)}

  /* Transform band */
  .rbx-band{display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 0 10px;margin:8px 0 4px}
  .rbx-band-line{height:1px;flex:1;max-width:260px}
  .rbx-band-line.s{background:repeating-linear-gradient(90deg,rgba(107,30,45,0.5) 0 4px,transparent 4px 9px)}
  .rbx-band-line.e{background:repeating-linear-gradient(90deg,rgba(107,30,45,0.5) 0 4px,transparent 4px 9px)}
  .rbx-band-text{font-size:13px;font-weight:800;color:var(--brown-soft);letter-spacing:1.5px;white-space:nowrap;text-align:center}

  /* Instructions */
  .rbx-instructions{font-size:13px;color:var(--brown-soft);text-align:center;padding:18px 0 0;margin:0;line-height:1.7}

  /* Footer */
  .rbx-footer{display:flex;align-items:center;gap:20px;margin-top:18px;flex-wrap:wrap;justify-content:space-between}
  .rbx-progress{flex:1;min-width:220px}
  .rbx-progress-head{display:flex;justify-content:space-between;margin-bottom:7px}
  .rbx-progress-label{font-size:11px;font-weight:700;color:var(--brown-soft);letter-spacing:1px}
  .rbx-progress-num{font-size:11px;font-weight:800;color:var(--label)}
  .rbx-progress-bar{height:7px;background:rgba(107,30,45,0.14);border:1px solid rgba(107,30,45,0.25);
    border-radius:99px;overflow:hidden}
  .rbx-progress-fill{height:100%;border-radius:99px;transition:width .35s ease;
    background:linear-gradient(90deg,#6B1E2D,#B8A082,#D9C9B0)}
  .rbx-submit{display:flex;align-items:center;gap:10px;padding:13px 34px;border-radius:11px;
    font-size:14.5px;font-weight:900;font-family:inherit;letter-spacing:0.4px;cursor:pointer;transition:all .18s;
    background:linear-gradient(135deg,#4A0E1C,#6B1E2D);color:#D9C9B0;
    border:1px solid rgba(107,30,45,0.5);box-shadow:0 6px 20px rgba(107,30,45,0.22)}
  .rbx-submit:hover:not(:disabled){color:#D9C9B0;transform:translateY(-1px);box-shadow:0 10px 28px rgba(107,30,45,0.3)}
  .rbx-submit:disabled{background:rgba(107,30,45,0.12);color:rgba(107,30,45,0.45);
    border-color:rgba(107,30,45,0.2);box-shadow:none;cursor:not-allowed}
  .rbx-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(184,160,130,0.3);
    border-top-color:#D9C9B0;animation:rbx-spin .8s linear infinite}

  /* Modal (light) */
  .rbx-modal-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;
    background:rgba(107,30,45,0.45);backdrop-filter:blur(4px)}
  .rbx-modal{width:100%;max-width:560px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;
    background:linear-gradient(160deg,#EFEAE0,#E5E0D5);border:1.5px solid var(--gold-line);border-radius:18px;
    box-shadow:0 30px 80px rgba(107,30,45,0.3)}
  .rbx-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
    background:linear-gradient(135deg,#4A0E1C,#6B1E2D)}
  .rbx-modal-head h3{font-size:19px;font-weight:900;color:#D9C9B0;margin:0}
  .rbx-modal-close{background:rgba(184,160,130,0.16);color:#D9C9B0;border:1px solid rgba(184,160,130,0.3);
    border-radius:9px;padding:6px 16px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer}
  .rbx-modal-body{padding:20px 22px;overflow-y:auto;display:flex;flex-direction:column;gap:15px}
  .rbx-detail-label{display:inline-block;font-size:11px;font-weight:800;color:var(--label);
    background:rgba(107,30,45,0.12);border:1px solid rgba(107,30,45,0.25);padding:3px 11px;border-radius:7px;margin-bottom:6px}
  .rbx-detail-value{font-size:13.5px;color:var(--brown);line-height:1.75;margin:0}

  /* ── Responsive ── */
  @media(max-width:900px){
    .rbx-axis,.rbx-colnames,.rbx-row{grid-template-columns:${COLS_TEMPLATE_SM}}
    .rbx-title{font-size:24px}
    .rbx-colname{font-size:12px;padding-bottom:9px}
    .rbx-rowlabel{font-size:11.5px;padding:6px 8px;gap:7px}
    .rbx-rowlabel-num{width:22px;height:22px;font-size:11.5px;border-radius:7px}
    .rbx-cell{min-height:72px;padding:8px}
    .rbx-chip{font-size:11.5px}
    .rbx-cellwrap{padding:5px}
    .rbx-band-text{font-size:11px;letter-spacing:.8px}
    .rbx-frame{padding:18px 14px 20px}
    .rbx-axis-dash{width:40px}
  }
  @media(max-width:560px){
    .rbx-inner{padding:18px 10px 36px}
    .rbx-axis,.rbx-colnames,.rbx-row{grid-template-columns:62px repeat(5,minmax(0,1fr))}
    .rbx-title{font-size:20px}
    .rbx-colname{font-size:10.5px}
    .rbx-rowlabel{flex-direction:column;gap:4px;padding:4px;text-align:center;font-size:10px}
    .rbx-rowlabel-num{width:20px;height:20px;font-size:10.5px}
    .rbx-rowlabel-text{font-size:10px;line-height:1.2}
    .rbx-cell{min-height:62px;padding:5px 4px;border-radius:11px}
    .rbx-chip{font-size:10.5px;gap:5px}
    .rbx-cellwrap{padding:3px}
    .rbx-card{padding:9px 13px;font-size:12px}
    .rbx-card::before{top:6px;bottom:6px}
  }

  /* Guided, reversible interaction layer */
  .rbx-inner{max-width:1360px;padding-top:20px}
  .rbx-guide{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 auto 16px;padding:12px 18px;max-width:760px;border-radius:17px;background:rgba(255,251,245,.78);border:1px solid rgba(184,160,130,.30);box-shadow:0 8px 22px rgba(74,14,28,.055);backdrop-filter:blur(12px)}
  .rbx-guide>i{width:clamp(22px,5vw,72px);height:2px;background:rgba(184,160,130,.28)}
  .rbx-guide-step{display:flex;align-items:center;gap:7px;color:#9a8a7c;font-size:11px;font-weight:800;white-space:nowrap}.rbx-guide-step b{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:#eee7dc;border:1px solid rgba(184,160,130,.32);font-size:10px}.rbx-guide-step.active{color:#4a0e1c}.rbx-guide-step.active b{color:#d9c9b0;background:linear-gradient(145deg,#6b1e2d,#32101a);border-color:#6b1e2d;box-shadow:0 5px 13px rgba(74,14,28,.20)}.rbx-guide-step.done b{font-size:0;color:white;background:#1b5e20;border-color:#1b5e20}.rbx-guide-step.done b::after{content:'✓';font-size:11px}

  .rbx-tray{position:relative;padding:16px 18px 18px;margin-bottom:14px;border:1px solid rgba(184,160,130,.36);border-radius:20px;background:linear-gradient(145deg,rgba(255,253,248,.90),rgba(238,231,220,.82));box-shadow:0 14px 36px rgba(74,14,28,.075),inset 0 1px 0 #fff}
  .rbx-tray-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:13px}.rbx-tray-head{margin:0;gap:9px}.rbx-tray-title{font-size:13px}.rbx-tools{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}
  .rbx-search{display:flex;align-items:center;gap:7px;min-width:220px;height:36px;padding:0 11px;border-radius:11px;background:rgba(255,255,255,.72);border:1px solid rgba(184,160,130,.32);color:#8a796c}.rbx-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#4a0e1c;font:600 12px 'Cairo',sans-serif}.rbx-search input::placeholder{color:#a5978a}
  .rbx-tool-btn{height:36px;padding:0 12px;border-radius:11px;border:1px solid rgba(107,30,45,.18);background:rgba(255,255,255,.68);color:#6b1e2d;font:800 11px 'Cairo',sans-serif;cursor:pointer;transition:.16s}.rbx-tool-btn:hover:not(:disabled){transform:translateY(-1px);background:#fff;border-color:rgba(107,30,45,.34)}.rbx-tool-btn.danger{color:#7b3040;background:rgba(107,30,45,.045)}.rbx-tool-btn:disabled{opacity:.38;cursor:not-allowed}
  .rbx-selected-banner{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;margin:0 0 13px;padding:12px 14px;border-radius:14px;color:#f8efe2;background:linear-gradient(115deg,#4a0e1c,#762438);border:1px solid rgba(217,201,176,.38);box-shadow:0 9px 20px rgba(74,14,28,.18);animation:rbx-chipin .2s ease}.rbx-selected-banner div{display:flex;flex-direction:column}.rbx-selected-banner small{color:#cdb898;font-size:9px;font-weight:800;letter-spacing:.06em}.rbx-selected-banner strong{font-size:13px}.rbx-selected-banner p{margin:0;color:rgba(255,247,237,.76);font-size:11.5px;text-align:center}.rbx-selected-banner button{border:1px solid rgba(217,201,176,.32);border-radius:9px;background:rgba(255,255,255,.08);color:#efe2cf;padding:7px 10px;font:700 10px 'Cairo',sans-serif;cursor:pointer}
  .rbx-tray-cards{max-height:210px;overflow-y:auto;align-content:flex-start;padding:2px 3px 5px;scrollbar-width:thin;scrollbar-color:#b8a082 transparent}.rbx-card{border-radius:13px;padding-block:9px}.rbx-card.sel{color:#f8efe2!important;background:linear-gradient(135deg,#6b1e2d,#32101a)!important;border-color:#b8a082!important;box-shadow:0 10px 22px rgba(74,14,28,.28)!important}.rbx-tray-empty.muted{color:#8f7f73}
  .rbx-scroll-hint{display:none;margin:4px 0 9px;color:#75655e;font-size:10.5px;font-weight:700;text-align:center}
  .rbx-board-scroll{width:100%;overflow-x:auto;padding-bottom:7px;scrollbar-width:thin;scrollbar-color:#b8a082 rgba(184,160,130,.12)}
  .rbx-frame{box-shadow:0 20px 55px rgba(74,14,28,.11),inset 0 1px 0 #fff}
  .rbx-instructions{max-width:760px;margin:14px auto;color:#6f5f57;background:rgba(255,251,245,.62);border:1px solid rgba(184,160,130,.23);border-radius:12px;padding:10px 14px}
  .rbx-footer{position:sticky;bottom:10px;z-index:25;margin:14px auto 0;max-width:980px;padding:13px 15px;border-radius:18px;background:rgba(255,251,245,.90);border:1px solid rgba(184,160,130,.38);box-shadow:0 16px 38px rgba(74,14,28,.17);backdrop-filter:blur(16px)}
  .rbx-submit{min-width:190px;border-radius:13px;padding:13px 20px}

  @media(max-width:760px){
    .rbx-guide{gap:5px;padding:10px}.rbx-guide>i{width:18px}.rbx-guide-step span{display:none}.rbx-tray{padding:13px;border-radius:17px}.rbx-tray-top{align-items:stretch;flex-direction:column}.rbx-tools{justify-content:stretch}.rbx-search{min-width:0;flex:1}.rbx-tool-btn{padding-inline:10px}.rbx-selected-banner{grid-template-columns:1fr auto}.rbx-selected-banner p{grid-column:1/-1;grid-row:2;text-align:start}.rbx-tray-cards{max-height:178px}.rbx-scroll-hint{display:block}.rbx-frame{min-width:850px}.rbx-footer{bottom:6px;flex-direction:column;gap:10px}.rbx-progress,.rbx-submit{width:100%;min-width:0}.rbx-instructions{font-size:11px}
  }
`;
