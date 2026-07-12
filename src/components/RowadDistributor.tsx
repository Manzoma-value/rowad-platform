"use client";

// 100-point distributor — one slider per trait defined on the assessment,
// with live total, status pill (Ok / Over / Under), and a live readout of
// Core/Collective/Supporting derived from the current distribution.
//
// Mirrors the JS simulator in the methodology HTML the team uses in-person.
// Traits are supplied by the caller (each assessment model owns its own
// ordered set) rather than imported from a fixed global list.
//
// Props:
//   - traits: this assessment's ordered traits (label + statement + color).
//   - value: current scores, one entry per trait. If sum != 100, the status
//            pill turns red.
//   - onChange: called on every slider change with the new array (NOT debounced).
//   - lang: "ar" | "sq"
//   - disabled: lock all sliders (used when the assessment is CLOSED).
//   - onCommit: called when the user releases a slider. Caller can debounce or
//               throttle persistence here. Only called if the new array is valid (sum=100).

import { useMemo } from "react";
import {
  ASSESS_UI,
  derive, isValid100, type ScoresTuple, type AssessLang,
} from "@/lib/rowad-assessment";

export type DistributorTrait = { label: string; statement: string; color: string };

export default function RowadDistributor({
  traits, value, onChange, lang, disabled, onCommit, hideReadout, compact,
}: {
  traits: DistributorTrait[];
  value: ScoresTuple;
  onChange: (next: ScoresTuple) => void;
  lang: AssessLang;
  disabled?: boolean;
  onCommit?: (next: ScoresTuple) => void;
  /** Hide the Core/Collective/Supporting readout block at the bottom
   *  (the rating page renders that on the sidebar instead so the form
   *  fits on one screen). */
  hideReadout?: boolean;
  /** Tighten row spacing/font so all sliders + status fit above the fold. */
  compact?: boolean;
}) {
  const T = ASSESS_UI[lang];
  const total = value.reduce((a, b) => a + b, 0);
  const status: "ok" | "over" | "under" =
    total === 100 ? "ok" : total > 100 ? "over" : "under";

  const derivation = useMemo(() => derive(value), [value]);

  function setIdx(i: number, raw: number) {
    if (disabled) return;
    const next = [...value];
    next[i] = Math.max(0, Math.min(100, Math.round(raw)));
    onChange(next);
  }

  function commitIdx(i: number, raw: number) {
    if (disabled || !onCommit) return;
    const next = [...value];
    next[i] = Math.max(0, Math.min(100, Math.round(raw)));
    if (isValid100(next, traits.length)) onCommit(next);
  }

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
        {traits.map((trait, i) => (
          <div key={i} className="rwd-row">
            <div className="rwd-row-head">
              <span className="rwd-dot" style={{ background: trait.color }} />
              <span className="rwd-tname">{trait.label}</span>
              <span className="rwd-tval">{value[i] ?? 0}</span>
            </div>
            <div className="rwd-stmt">{trait.statement}</div>
            <input
              type="range" min={0} max={100} step={1}
              value={value[i] ?? 0}
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
              value={value[i] ?? 0}
              disabled={disabled}
              onChange={(e) => setIdx(i, Number(e.target.value))}
              onBlur={(e) => commitIdx(i, Number(e.target.value))}
              className="rwd-num"
            />
          </div>
        ))}
      </div>

      {!hideReadout && (
        <div className="rwd-readout">
          <div className="rwd-rb rwd-rb-core">
            <div className="rwd-rb-lbl">{T.coreLabel}</div>
            <div className="rwd-rb-val">
              {derivation.hasCore && derivation.coreIdx !== null
                ? <>{traits[derivation.coreIdx]?.label} · <b>{value[derivation.coreIdx]}</b></>
                : T.noCore}
            </div>
          </div>
          <div className="rwd-rb rwd-rb-collective">
            <div className="rwd-rb-lbl">{T.collectiveLabel}</div>
            <div className="rwd-rb-val">
              {traits[derivation.collectiveIdx]?.label} · <b>{value[derivation.collectiveIdx]}</b>
            </div>
          </div>
          <div className="rwd-rb rwd-rb-support">
            <div className="rwd-rb-lbl">{T.supportingLabel}</div>
            <div className="rwd-rb-val">
              {derivation.supportingIdxs.map((i) => traits[i]?.label).join(lang === "ar" ? "، " : ", ")}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rwd { background: linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1.5px solid rgba(107,30,45,0.32); border-radius:14px; padding:14px; font-family:'Cairo',sans-serif; }
        .rwd-disabled { opacity:.85; }
        .rwd-top { display:flex; align-items:center; gap:12px; justify-content:space-between; flex-wrap:wrap; margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed rgba(107,30,45,0.4); }
        .rwd-total { display:flex; align-items:baseline; gap:6px; }
        .rwd-total-n { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:32px; font-weight:800; line-height:1; }
        .rwd-total-lbl { font-size:13px; color:#8F765B; font-weight:700; }
        .rwd-ok    { color:#1B5E20; }
        .rwd-over  { color:#6B1E2D; }
        .rwd-under { color:#8F765B; }
        .rwd-status { font-size:12.5px; font-weight:800; padding:6px 14px; border-radius:99px; }
        .rwd-status-ok    { background:rgba(27,94,32,0.12);  color:#1B5E20; }
        .rwd-status-over  { background:rgba(107,30,45,0.10); color:#6B1E2D; }
        .rwd-status-under { background:rgba(107,30,45,0.14);color:#8F765B; }

        .rwd-sliders { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
        .rwd-row { background:#FFFBF5; border:1px solid rgba(107,30,45,0.18); border-radius:12px; padding:10px 12px; display:grid; grid-template-columns: 1fr 58px; column-gap:10px; align-items:center; }
        .rwd-row-head { grid-column: 1 / -1; display:flex; align-items:center; gap:8px; }
        .rwd-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .rwd-tname { font-size:13.5px; font-weight:800; color:#32101A; flex:1; }
        .rwd-tval { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:14.5px; font-weight:800; color:#6B1E2D; }
        .rwd-stmt { grid-column: 1 / -1; font-size:12px; color:#6B1E2D; line-height:1.55; margin-bottom:3px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .rwd-range { width:100%; cursor: pointer; }
        .rwd-range:disabled { cursor: not-allowed; opacity:.5; }
        .rwd-num { width:100%; padding:6px 8px; border:1.5px solid rgba(107,30,45,0.32); border-radius:8px; font-family:'JetBrains Mono', ui-monospace, monospace; font-weight:800; font-size:13px; text-align:center; background:#FFF; outline:none; }
        .rwd-num:focus { border-color:#B8A082; }

        .rwd-readout { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-top:10px; }
        ${compact ? ".rwd-readout { margin-top:6px; }" : ""}
        @media (max-width: 900px) { .rwd-sliders { grid-template-columns: 1fr; } }
        @media (max-width: 680px) { .rwd-readout { grid-template-columns: 1fr; } }
        .rwd-rb { border:1px solid rgba(107,30,45,0.28); border-radius:10px; padding:10px 12px; background:#FFF; }
        .rwd-rb-lbl { font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; font-weight:800; margin-bottom:4px; }
        .rwd-rb-val { font-size:13px; font-weight:700; color:#32101A; }
        .rwd-rb-val b { font-family:'JetBrains Mono', ui-monospace, monospace; font-weight:800; }
        .rwd-rb-core       { background: rgba(107,30,45,0.06);   border-color: rgba(107,30,45,0.32); }
        .rwd-rb-core .rwd-rb-lbl { color:#6B1E2D; }
        .rwd-rb-collective { background: rgba(107,30,45,0.10); border-color: rgba(107,30,45,0.42); }
        .rwd-rb-collective .rwd-rb-lbl { color:#8F765B; }
        .rwd-rb-support .rwd-rb-lbl { color:#655B53; }
      `}</style>
    </div>
  );
}
