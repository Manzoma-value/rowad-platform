"use client";

import { useMemo } from "react";
import TraitRadarChart from "@/components/TraitRadarChart";
import TraitSpectrumBlob from "@/components/TraitSpectrumBlob";
import { ASSESS_UI, derive, type AssessLang } from "@/lib/rowad-assessment";
import type { SpectrumTrait } from "@/lib/trait-spectrum";

type Props = {
  traits: SpectrumTrait[];
  seed: number;
  lang: AssessLang;
  compact?: boolean;
  summary?: boolean;
  live?: boolean;
};

const COPY = {
  ar: {
    eyebrow: "قراءة الطيف",
    title: "خريطة السمات البصرية",
    subtitle: "كل لون يمثل سمة، والنسبة توضّح وزنها من إجمالي 100 نقطة.",
    live: "تتحدث مباشرة",
    total: "المجموع",
    remaining: (n: number) => `متبقٍ ${n} نقطة`,
    over: (n: number) => `تجاوزت المجموع بـ ${n}`,
    complete: "التوزيع مكتمل",
    strongest: "القراءة الأبرز",
    core: "جوهرية",
    connecting: "رابطة",
    supporting: "مساندة",
    coreHelp: "أعلى سمة في التوزيع",
    connectingHelp: "كيف تتحول القوة إلى أثر داخل المجموعة",
    supportingHelp: "تكمل الصورة",
    points: "نقطة",
  },
  sq: {
    eyebrow: "Leximi i spektrit",
    title: "Harta vizuale e tipareve",
    subtitle: "Çdo ngjyrë përfaqëson një tipar; përqindja tregon peshën nga 100 pikë.",
    live: "Përditësohet drejtpërdrejt",
    total: "Totali",
    remaining: (n: number) => `Mbeten ${n} pikë`,
    over: (n: number) => `Tejkalim me ${n}`,
    complete: "Shpërndarja u plotësua",
    strongest: "Leximi kryesor",
    core: "Thelbësor",
    connecting: "Ndërlidhës",
    supporting: "Mbështetës",
    coreHelp: "Tipari më i lartë në shpërndarje",
    connectingHelp: "Si shndërrohet forca në ndikim brenda grupit",
    supportingHelp: "Plotësojnë tablonë",
    points: "pikë",
  },
} as const;

export default function TraitSpectrumPanel({
  traits,
  seed,
  lang,
  compact = false,
  summary = false,
  live = false,
}: Props) {
  const C = COPY[lang];
  const A = ASSESS_UI[lang];
  const values = traits.map((trait) => trait.pct);
  const total = Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10;
  const result = useMemo(() => derive(values), [values]);
  const ordered = traits.map((trait, index) => ({ ...trait, index }));
  const readingText = result.hasCore && result.coreIdx !== null
    ? traits[result.coreIdx]?.label
    : A.noCore;

  function roleFor(index: number) {
    if (result.hasCore && result.coreIdx === index) return { label: C.core, className: "core" };
    if (result.connectingIdx === index) return { label: C.connecting, className: "collective" };
    return { label: C.supporting, className: "supporting" };
  }

  const progressText = total === 100
    ? C.complete
    : total < 100
      ? C.remaining(Math.round((100 - total) * 10) / 10)
      : C.over(Math.round((total - 100) * 10) / 10);

  return (
    <section
      className={`tsp ${compact ? "tsp-compact" : ""} ${summary ? "tsp-summary" : ""}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
      title={C.subtitle}
    >
      <header className="tsp-head">
        <div>
          <span className="tsp-eyebrow">{C.eyebrow}</span>
          <h3>{C.title}</h3>
          <p>{C.subtitle}</p>
        </div>
        {live && <span className="tsp-live"><i />{C.live}</span>}
      </header>

      <div className="tsp-main">
        <div className="tsp-visual">
          <div className="tsp-blob">
            <div className="tsp-chart-frame">
              <TraitSpectrumBlob
                traits={traits}
                seed={seed}
                size={summary ? 236 : compact ? 188 : 260}
                mode={summary ? "full" : compact ? "compact" : "full"}
                showFrame
              />
            </div>
            <div className={`tsp-total ${total === 100 ? "done" : total > 100 ? "over" : ""}`}>
              <strong>{total}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <div className="tsp-radar">
            <div className="tsp-chart-frame">
              <TraitRadarChart traits={traits} size={summary ? 210 : compact ? 150 : 188} />
            </div>
            <span>{C.strongest}</span>
            <strong>{readingText}</strong>
          </div>
        </div>

        <div className="tsp-legend">
          <div className={`tsp-progress ${total === 100 ? "done" : total > 100 ? "over" : ""}`}>
            <span>{C.total}</span>
            <strong>{progressText}</strong>
          </div>
          <div className="tsp-ranked">
            {ordered.map((trait) => {
              const role = roleFor(trait.index);
              return (
                <div className="tsp-trait" key={`${trait.label}-${trait.index}`}>
                  <div className="tsp-trait-line">
                    <span className="tsp-order">{trait.index + 1}</span>
                    <span className="tsp-dot" style={{ background: trait.color }} />
                    <strong>{trait.label}</strong>
                    <span className={`tsp-role ${role.className}`}>{role.label}</span>
                    <b>{Number(trait.pct.toFixed(1))}%</b>
                  </div>
                  <div className="tsp-track">
                    <span style={{ width: `${Math.max(0, Math.min(100, trait.pct))}%`, background: trait.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="tsp-explain">
        <div><span className="core">{C.core}</span><small>{C.coreHelp}</small></div>
        <div><span className="collective">{C.connecting}</span><small>{C.connectingHelp}</small></div>
        <div><span className="supporting">{C.supporting}</span><small>{C.supportingHelp}</small></div>
      </footer>

      <style>{`
        .tsp{width:100%;overflow:hidden;border:1px solid rgba(107,30,45,.15);border-radius:24px;background:#FFFBF5;box-shadow:0 18px 42px rgba(107,30,45,.09);font-family:'Cairo',sans-serif;color:#32101A}
        .tsp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:19px 21px 15px;border-bottom:1px solid rgba(107,30,45,.10);background:linear-gradient(180deg,#FFFBF5,#F7F3EB)}
        .tsp-eyebrow{display:block;margin-bottom:3px;color:#8F765B;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
        .tsp-head h3{margin:0;color:#32101A;font-size:17px;font-weight:900}.tsp-head p{margin:4px 0 0;max-width:600px;color:#655B53;font-size:11.5px;line-height:1.7;font-weight:700}
        .tsp-live{display:inline-flex;align-items:center;gap:7px;flex:none;border:1px solid rgba(27,94,32,.18);border-radius:999px;background:rgba(27,94,32,.08);padding:6px 10px;color:#1B5E20;font-size:10px;font-weight:900}.tsp-live i{width:7px;height:7px;border-radius:50%;background:#1B5E20;box-shadow:0 0 0 4px rgba(27,94,32,.1)}
        .tsp-main{display:grid;grid-template-columns:minmax(350px,.92fr) minmax(290px,1.08fr);gap:20px;align-items:center;padding:20px 21px;background:#FFFBF5}
        .tsp-visual{--tsp-chart-slot:260px;position:relative;display:flex;align-items:flex-start;justify-content:center;gap:22px;min-width:0;overflow:hidden;border:1px solid rgba(107,30,45,.12);border-radius:22px;background:radial-gradient(circle at 18% 18%,rgba(184,160,130,.16),transparent 30%),radial-gradient(circle at 82% 80%,rgba(107,30,45,.08),transparent 34%),linear-gradient(145deg,#F7F3EB,#EFEAE0);padding:16px}.tsp-visual:after{content:"";position:absolute;inset:10px;pointer-events:none;border:1px solid rgba(255,255,255,.78);border-radius:16px}.tsp-chart-frame{height:var(--tsp-chart-slot);display:grid;place-items:center}.tsp-blob{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;flex:none}.tsp-total{position:absolute;inset-inline-end:5px;inset-block-end:8px;display:flex;align-items:baseline;gap:2px;border:1px solid rgba(107,30,45,.16);border-radius:10px;background:#FFFBF5;padding:6px 8px;box-shadow:0 6px 16px rgba(107,30,45,.09)}.tsp-total strong{font-size:16px;line-height:1;color:#8F765B}.tsp-total span{font-size:8px;color:#796A62;font-weight:900}.tsp-total.done strong{color:#1B5E20}.tsp-total.over strong{color:#6B1E2D}
        .tsp-radar{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;min-width:0}.tsp-radar>span{margin-top:2px;color:#8F765B;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.tsp-radar>strong{max-width:190px;margin-top:4px;text-align:center;color:#6B1E2D;font-size:12px;line-height:1.5}
        .tsp-legend{min-width:0}.tsp-progress{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;border:1px solid rgba(184,160,130,.20);border-radius:14px;background:#F7F3EB;padding:10px 12px;color:#8F765B;font-size:10px;font-weight:900}.tsp-progress strong{color:#655B53}.tsp-progress.done{border-color:rgba(27,94,32,.18);background:rgba(27,94,32,.05);color:#1B5E20}.tsp-progress.done strong{color:#1B5E20}.tsp-progress.over,.tsp-progress.over strong{color:#6B1E2D}
        .tsp-ranked{display:flex;flex-direction:column;gap:8px}.tsp-trait{border:1px solid rgba(107,30,45,.12);border-radius:14px;background:#FFFBF5;padding:9px 10px;box-shadow:0 4px 12px rgba(107,30,45,.035)}.tsp-trait-line{display:flex;align-items:center;gap:7px;min-width:0}.tsp-order{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:7px;background:#EFEAE0;color:#655B53;font:900 10px ui-monospace,Consolas,monospace}.tsp-dot{width:14px;height:14px;flex:none;border:2px solid #FFFBF5;border-radius:5px;box-shadow:0 0 0 1px rgba(26,26,26,.24)}.tsp-trait-line>strong{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#32101A;font-size:12.5px}.tsp-trait-line>b{min-width:42px;text-align:end;color:#32101A;font:900 12px ui-monospace,Consolas,monospace}
        .tsp-role{flex:none;border-radius:999px;padding:3px 7px;font-size:8.5px;font-weight:900}.tsp-role.core,.tsp-explain .core{background:#6B1E2D;color:#fff}.tsp-role.collective,.tsp-explain .collective{background:#D9C9B0;color:#4A0E1C}.tsp-role.supporting,.tsp-explain .supporting{background:#EFEAE0;color:#655B53}
        .tsp-track{height:8px;margin-top:7px;margin-inline-start:58px;overflow:hidden;border-radius:999px;background:#D9C9B0}.tsp-track span{display:block;height:100%;min-width:2px;border-radius:inherit}
        .tsp-explain{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;border-top:1px solid rgba(107,30,45,.09);background:rgba(107,30,45,.06)}.tsp-explain>div{display:flex;align-items:center;gap:8px;background:#F7F3EB;padding:10px 12px}.tsp-explain span{border-radius:999px;padding:3px 8px;font-size:8.5px;font-weight:900}.tsp-explain small{color:#796A62;font-size:9px;font-weight:800}
        .tsp-compact{border-radius:18px;box-shadow:none}.tsp-compact .tsp-head{padding:14px 16px 11px}.tsp-compact .tsp-head h3{font-size:15px}.tsp-compact .tsp-head p{font-size:10.5px}.tsp-compact .tsp-main{grid-template-columns:1fr;gap:14px;padding:14px 16px}.tsp-compact .tsp-visual{--tsp-chart-slot:190px;width:100%;min-height:244px;padding:12px 14px}.tsp-compact .tsp-radar>span{margin-top:0;font-size:10.5px}.tsp-compact .tsp-radar>strong{font-size:12px;max-width:150px}.tsp-compact .tsp-progress{margin-bottom:10px}.tsp-compact .tsp-explain>div{padding:8px}.tsp-compact .tsp-explain small{display:none}
        .tsp-summary{border:0;border-radius:18px;background:transparent;box-shadow:none}.tsp-summary .tsp-head,.tsp-summary .tsp-legend,.tsp-summary .tsp-explain{display:none}.tsp-summary .tsp-main{display:block;padding:0;background:transparent}.tsp-summary .tsp-visual{--tsp-chart-slot:250px;width:100%;min-height:326px;gap:34px;border-color:rgba(107,30,45,.12);background:radial-gradient(circle at 20% 24%,rgba(184,160,130,.17),transparent 26%),radial-gradient(circle at 84% 76%,rgba(107,30,45,.09),transparent 28%),linear-gradient(145deg,#F7F3EB,#EFEAE0);padding:16px 22px;box-shadow:inset 0 1px rgba(255,255,255,.9),0 14px 32px rgba(107,30,45,.07)}.tsp-summary .tsp-total{display:none}.tsp-summary .tsp-radar>span{margin-top:2px;color:#6B1E2D;font-size:10.5px}.tsp-summary .tsp-radar>strong{max-width:190px;margin-top:4px;font-size:13px;line-height:1.6}
        @media(max-width:760px){.tsp-head{padding:15px}.tsp-live{display:none}.tsp-main,.tsp-compact .tsp-main{grid-template-columns:1fr;padding:14px}.tsp-visual{flex-wrap:wrap}.tsp-explain{grid-template-columns:1fr}.tsp-explain small{display:block!important}.tsp-compact .tsp-head p{display:block}}
        @media(max-width:520px){.tsp-summary .tsp-visual{--tsp-chart-slot:242px;gap:8px;padding:14px 8px;min-height:548px}.tsp-summary .tsp-radar{margin-top:0}}
      `}</style>
    </section>
  );
}
