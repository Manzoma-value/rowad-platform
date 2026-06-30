"use client";

// 100-point distributor — five sliders for the Rowad traits, with live total,
// status pill (Ok / Over / Under), and a live readout of Core/Collective/
// Supporting derived from the current distribution.
//
// Mirrors the JS simulator in the methodology HTML the team uses in-person.
//
// Props:
//   - value: current scores (5-tuple). If sum != 100, the status pill turns red.
//   - onChange: called on every slider change with the new tuple (NOT debounced).
//   - lang: "ar" | "sq"
//   - disabled: lock all sliders (used when the assessment is CLOSED).
//   - onCommit: called when the user releases a slider. Caller can debounce or
//               throttle persistence here. Only called if the new tuple is valid (sum=100).

import { useMemo } from "react";
import {
  TRAITS, STATEMENTS, ASSESS_UI,
  derive, isValid100, type ScoresTuple, type AssessLang,
} from "@/lib/rowad-assessment";

export default function RowadDistributor({
  value, onChange, lang, disabled, onCommit,
}: {
  value: ScoresTuple;
  onChange: (next: ScoresTuple) => void;
  lang: AssessLang;
  disabled?: boolean;
  onCommit?: (next: ScoresTuple) => void;
}) {
  const T = ASSESS_UI[lang];
  const total = value[0] + value[1] + value[2] + value[3] + value[4];
  const status: "ok" | "over" | "under" =
    total === 100 ? "ok" : total > 100 ? "over" : "under";

  const derivation = useMemo(() => derive(value), [value]);

  function setIdx(i: number, raw: number) {
    if (disabled) return;
    const next = [...value] as ScoresTuple;
    next[i] = Math.max(0, Math.min(100, Math.round(raw)));
    onChange(next);
  }

  function commitIdx(i: number, raw: number) {
    if (disabled || !onCommit) return;
    const next = [...value] as ScoresTuple;
    next[i] = Math.max(0, Math.min(100, Math.round(raw)));
    if (isValid100(next)) onCommit(next);
  }

  const statementBundle = STATEMENTS[lang];

  return (
    <div className={`rwd ${disabled ? "rwd-disabled" : ""}`}>
      <div className="rwd-top">
        <div className="rwd-total">
          <div className={`rwd-total-n rwd-${status}`}>{total}</div>
          <div className="rwd-total-lbl">/ 100</div>
        </div>
        <div className={`rwd-status rwd-status-${status}`}>
          {status === "ok" ? T.statusOk : status === "over" ? T.statusOver : T.statusUnder}
        </div>
      </div>

      <div className="rwd-sliders">
        {TRAITS.map((trait, i) => (
          <div key={trait.key} className="rwd-row">
            <div className="rwd-row-head">
              <span className="rwd-dot" style={{ background: trait.color }} />
              <span className="rwd-tname">{trait[lang]}</span>
              <span className="rwd-tval">{value[i]}</span>
            </div>
            <div className="rwd-stmt">{statementBundle[i]}</div>
            <input
              type="range" min={0} max={100} step={1}
              value={value[i]}
              disabled={disabled}
              onChange={(e) => setIdx(i, Number(e.target.value))}
              onMouseUp={(e) => commitIdx(i, Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => commitIdx(i, Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => commitIdx(i, Number((e.target as HTMLInputElement).value))}
              className="rwd-range"
              style={{ accentColor: trait.color }}
            />
            <input
              type="number" min={0} max={100} step={1}
              value={value[i]}
              disabled={disabled}
              onChange={(e) => setIdx(i, Number(e.target.value))}
              onBlur={(e) => commitIdx(i, Number(e.target.value))}
              className="rwd-num"
            />
          </div>
        ))}
      </div>

      <div className="rwd-readout">
        <div className="rwd-rb rwd-rb-core">
          <div className="rwd-rb-lbl">{T.coreLabel}</div>
          <div className="rwd-rb-val">
            {derivation.hasCore && derivation.coreIdx !== null
              ? <>{TRAITS[derivation.coreIdx][lang]} · <b>{value[derivation.coreIdx]}</b></>
              : T.noCore}
          </div>
        </div>
        <div className="rwd-rb rwd-rb-collective">
          <div className="rwd-rb-lbl">{T.collectiveLabel}</div>
          <div className="rwd-rb-val">
            {TRAITS[derivation.collectiveIdx][lang]} · <b>{value[derivation.collectiveIdx]}</b>
          </div>
        </div>
        <div className="rwd-rb rwd-rb-support">
          <div className="rwd-rb-lbl">{T.supportingLabel}</div>
          <div className="rwd-rb-val">
            {derivation.supportingIdxs.map((i) => TRAITS[i][lang]).join(lang === "ar" ? "، " : ", ")}
          </div>
        </div>
      </div>

      <style>{`
        .rwd { background: linear-gradient(180deg,#FFFDF8,#FBF6E9); border:1.5px solid rgba(194,160,89,0.32); border-radius:14px; padding:18px; font-family:'Cairo',sans-serif; }
        .rwd-disabled { opacity:.85; }
        .rwd-top { display:flex; align-items:center; gap:14px; justify-content:space-between; flex-wrap:wrap; margin-bottom:14px; padding-bottom:12px; border-bottom:1px dashed rgba(194,160,89,0.4); }
        .rwd-total { display:flex; align-items:baseline; gap:6px; }
        .rwd-total-n { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:36px; font-weight:800; line-height:1; }
        .rwd-total-lbl { font-size:13px; color:#8B6915; font-weight:700; }
        .rwd-ok    { color:#4C6B3C; }
        .rwd-over  { color:#A33B2E; }
        .rwd-under { color:#8E6C36; }
        .rwd-status { font-size:12.5px; font-weight:800; padding:6px 14px; border-radius:99px; }
        .rwd-status-ok    { background:rgba(76,107,60,0.12);  color:#4C6B3C; }
        .rwd-status-over  { background:rgba(163,59,46,0.10); color:#A33B2E; }
        .rwd-status-under { background:rgba(199,154,61,0.14);color:#8E6C36; }

        .rwd-sliders { display:flex; flex-direction:column; gap:14px; }
        .rwd-row { background:#FFFDF8; border:1px solid rgba(194,160,89,0.18); border-radius:11px; padding:11px 14px; display:grid; grid-template-columns: 1fr 64px; column-gap:12px; align-items:center; }
        .rwd-row-head { grid-column: 1 / -1; display:flex; align-items:center; gap:8px; }
        .rwd-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .rwd-tname { font-size:13.5px; font-weight:800; color:#1B1810; flex:1; }
        .rwd-tval { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:14.5px; font-weight:800; color:#6B4F1E; }
        .rwd-stmt { grid-column: 1 / -1; font-size:12.5px; color:#5E4A20; line-height:1.85; margin-bottom:4px; }
        .rwd-range { width:100%; cursor: pointer; }
        .rwd-range:disabled { cursor: not-allowed; opacity:.5; }
        .rwd-num { width:100%; padding:6px 8px; border:1.5px solid rgba(194,160,89,0.32); border-radius:8px; font-family:'JetBrains Mono', ui-monospace, monospace; font-weight:800; font-size:13px; text-align:center; background:#FFF; outline:none; }
        .rwd-num:focus { border-color:#B89B5E; }

        .rwd-readout { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-top:14px; }
        @media (max-width: 680px) { .rwd-readout { grid-template-columns: 1fr; } }
        .rwd-rb { border:1px solid rgba(194,160,89,0.28); border-radius:10px; padding:10px 12px; background:#FFF; }
        .rwd-rb-lbl { font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; font-weight:800; margin-bottom:4px; }
        .rwd-rb-val { font-size:13px; font-weight:700; color:#1B1810; }
        .rwd-rb-val b { font-family:'JetBrains Mono', ui-monospace, monospace; font-weight:800; }
        .rwd-rb-core       { background: rgba(122,30,30,0.06);   border-color: rgba(122,30,30,0.32); }
        .rwd-rb-core .rwd-rb-lbl { color:#7A1E1E; }
        .rwd-rb-collective { background: rgba(199,154,61,0.10); border-color: rgba(199,154,61,0.42); }
        .rwd-rb-collective .rwd-rb-lbl { color:#8E6C36; }
        .rwd-rb-support .rwd-rb-lbl { color:#5C4F36; }
      `}</style>
    </div>
  );
}
