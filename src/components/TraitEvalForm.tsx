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
  attempt: { score: number; total: number };
  assessment: {
    id: string;
    general_note: string | null;
    trait_scores: { trait_id: string; score: number; note: string | null }[];
  } | null;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const TR: Record<string, Record<string, string>> = {
  ar: {
    loading: "جارٍ تحميل بيانات التقييم...",
    traitsCount: "سمات",
    editing: "تعديل",
    totalScore: "النتيجة الإجمالية",
    totalSub: "مجموع تقييم السمات",
    perfExcellent: "أداء ممتاز ✦",
    perfGood: "أداء جيد",
    perfNeedsWork: "يحتاج تحسين",
    perfNotStarted: "لم يبدأ التقييم",
    mainTrait: "السمة المشغّلة",
    weightLabel: "وزن",
    elementsBtn: "عناصر التقييم",
    notePlaceholder: "ملاحظة...",
    generalNoteLabel: "ملاحظة عامة على المستوى (اختياري)",
    generalNotePlaceholder: "اكتب ملاحظاتك العامة على أداء الطالب في هذا المستوى...",
    saveBtn: "حفظ التقييم",
    updateBtn: "تحديث التقييم",
    saving: "جارٍ الحفظ...",
    cancelBtn: "إلغاء",
    errorSave: "فشل الحفظ",
    errorGeneric: "حدث خطأ غير متوقع",
  },
  sq: {
    loading: "Duke ngarkuar të dhënat e vlerësimit...",
    traitsCount: "tipare",
    editing: "Modifikim",
    totalScore: "Rezultati Total",
    totalSub: "Shuma e vlerësimit të tipareve",
    perfExcellent: "Performancë e shkëlqyer ✦",
    perfGood: "Performancë e mirë",
    perfNeedsWork: "Kërkon përmirësim",
    perfNotStarted: "Vlerësimi nuk ka filluar",
    mainTrait: "Tipari kryesor",
    weightLabel: "Peshë",
    elementsBtn: "Elementet e vlerësimit",
    notePlaceholder: "Shënim...",
    generalNoteLabel: "Shënim i përgjithshëm për nivelin (opsional)",
    generalNotePlaceholder: "Shkruani shënimet tuaja të përgjithshme për performancën e nxënësit në këtë nivel...",
    saveBtn: "Ruaj Vlerësimin",
    updateBtn: "Përditëso Vlerësimin",
    saving: "Duke ruajtur...",
    cancelBtn: "Anulo",
    errorSave: "Ruajtja dështoi",
    errorGeneric: "Ndodhi një gabim i papritur",
  },
  en: {
    loading: "Loading assessment data...",
    traitsCount: "traits",
    editing: "Editing",
    totalScore: "Total Score",
    totalSub: "Sum of trait evaluations",
    perfExcellent: "Excellent performance ✦",
    perfGood: "Good performance",
    perfNeedsWork: "Needs improvement",
    perfNotStarted: "Assessment not started",
    mainTrait: "Main trait",
    weightLabel: "Weight",
    elementsBtn: "Assessment elements",
    notePlaceholder: "Note...",
    generalNoteLabel: "General note on this level (optional)",
    generalNotePlaceholder: "Write your general notes on the student's performance at this level...",
    saveBtn: "Save Assessment",
    updateBtn: "Update Assessment",
    saving: "Saving...",
    cancelBtn: "Cancel",
    errorSave: "Save failed",
    errorGeneric: "An unexpected error occurred",
  },
};

const getTR = (lang: string) => TR[lang] ?? TR["sq"];

// ─── Maqsad config ────────────────────────────────────────────────────────────

const MAQSAD_LABELS: Record<string, Record<string, string>> = {
  ar:  { DEEN:"الدين",   AQL:"العقل",   NAFS:"النفس",  NASL:"النسل",       MAL:"المال"  },
  sq:  { DEEN:"Feja",    AQL:"Mendja",   NAFS:"Shpirti",NASL:"Pasardhësit", MAL:"Pasuria"},
  en:  { DEEN:"Religion",AQL:"Intellect",NAFS:"Soul",   NASL:"Progeny",     MAL:"Wealth" },
};

const MAQSAD: Record<string,{color:string;bg:string;track:string;fill:string}> = {
  DEEN: { color:"#6B1E2D", bg:"#F7F3EB", track:"#E5E0D5", fill:"#B8A082"  },
  AQL:  { color:"#655B53", bg:"#F7F3EB", track:"#E5E0D5", fill:"#8C8274"  },
  NAFS: { color:"#1B5E20", bg:"#F7F3EB", track:"#E5E0D5", fill:"#1B5E20"  },
  NASL: { color:"#6B1E2D", bg:"#F7F3EB", track:"#E5E0D5", fill:"#6B1E2D"  },
  MAL:  { color:"#6B1E2D", bg:"#F7F3EB", track:"#D9C9B0", fill:"#6B1E2D"  },
};

function mq(maqsad: string) { return MAQSAD[maqsad] ?? MAQSAD.DEEN; }

function mqLabel(maqsad: string, lang: string) {
  return (MAQSAD_LABELS[lang] ?? MAQSAD_LABELS["sq"])[maqsad] ?? maqsad;
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function TraitSlider({
  value, max, maqsad, isMain, isRtl, onChange,
}: {
  value: number; max: number; maqsad: string; isMain: boolean;
  isRtl: boolean; onChange: (v: number) => void;
}) {
  const cfg = mq(maqsad);
  const pct = max > 0 ? (value / max) * 100 : 0;
  const fillColor = isMain ? "#B8A082" : cfg.fill;
  const fillGrad  = isMain
    ? "linear-gradient(90deg,#B8A082,#B8A082)"
    : `linear-gradient(90deg,${cfg.fill}88,${cfg.fill})`;

  return (
    <div className="sl-root">
      {/* When RTL, flip wrapper so right=max visually */}
      <div className="sl-track-wrap" style={isRtl ? { transform:"scaleX(-1)" } : {}}>
        <div className="sl-track">
          <div className="sl-fill" style={{ width:`${pct}%`, background:fillGrad }}/>
          <div className="sl-thumb" style={{
            left:`${pct}%`, borderColor:fillColor,
            boxShadow:`0 0 0 5px ${fillColor}22,0 2px 8px rgba(26,26,26,0.15)`,
          }}/>
        </div>
        <input type="range" className="sl-input" min={0} max={max} step={0.5}
          value={value} onChange={e=>onChange(parseFloat(e.target.value))}/>
      </div>
      {/* Labels — always LTR order; flip container when RTL so they appear reversed */}
      <div className="sl-labels" style={isRtl ? { transform:"scaleX(-1)" } : {}}>
        <span className="sl-lbl" style={isRtl ? { display:"inline-block",transform:"scaleX(-1)" } : {}}>0</span>
        <span className="sl-lbl" style={isRtl ? { display:"inline-block",transform:"scaleX(-1)" } : {}}>{Math.round((max/2)*10)/10}</span>
        <span className="sl-lbl" style={isRtl ? { display:"inline-block",transform:"scaleX(-1)" } : {}}>{Math.round(max*10)/10}</span>
      </div>
    </div>
  );
}

// ─── Score Arc ────────────────────────────────────────────────────────────────

function Arc({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 75 ? "#1B5E20" : pct >= 40 ? "#B8A082" : pct > 0 ? "#796A62" : "#D9C9B0";
  const r = 30, circ = 2 * Math.PI * r;
  return (
    <div className="arc-wrap">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(184,160,130,0.12)" strokeWidth="6"/>
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ*(1-pct/100)} transform="rotate(-90 38 38)"
          style={{transition:"stroke-dashoffset 0.4s ease,stroke 0.3s"}}/>
      </svg>
      <div className="arc-inner">
        <span className="arc-score" style={{color}}>{Math.round(score*10)/10}</span>
        <span className="arc-max">/{Math.round(max*10)/10}</span>
      </div>
    </div>
  );
}

// ─── Trait Card ───────────────────────────────────────────────────────────────

function TraitCard({
  trait, weight, score, note, lang, isRtl, onScore, onNote,
}: {
  trait: EvalTrait; weight: Weight; score: number; note: string;
  lang: string; isRtl: boolean;
  onScore: (v: number) => void; onNote: (v: string) => void;
}) {
  const [elemOpen, setElemOpen] = useState(false);
  const tr = getTR(lang);
  const { isMain, maxScore } = weight;
  const cfg = mq(trait.maqsad);
  const label = mqLabel(trait.maqsad, lang);

  return (
    <div className={`tcard${isMain ? " tcard-main" : ""}`}>
      {/* Colored left-side accent border */}
      <div className="tcard-accent" style={{background:isMain
        ? "linear-gradient(180deg,#B8A082,#B8A082)"
        : `linear-gradient(180deg,${cfg.fill}88,${cfg.fill})`
      }}/>

      <div className="tcard-body">
        {/* Left col */}
        <div className="tcard-left">
          {/* Badges row */}
          <div className="tcard-top">
            <span className="tcard-mq" style={{background:cfg.bg,color:cfg.color,borderColor:cfg.track}}>
              {label}
            </span>
            {isMain ? (
              <span className="tcard-main-tag">
                ★ {tr.mainTrait} · <b>50%</b>
              </span>
            ) : (
              <span className="tcard-wt" style={{background:cfg.bg,color:cfg.color}}>
                {tr.weightLabel} {Math.round(maxScore*10)/10}
              </span>
            )}
          </div>

          <h3 className="tcard-name" dir="auto">{trait.name}</h3>
          {trait.definition && <p className="tcard-def" dir="auto">{trait.definition}</p>}

          <TraitSlider value={score} max={maxScore} maqsad={trait.maqsad}
            isMain={isMain} isRtl={isRtl} onChange={onScore}/>

          {/* Elements toggle */}
          {trait.elements.length > 0 && (
            <div>
              <button className="tcard-elem-btn" onClick={()=>setElemOpen(v=>!v)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/>
                </svg>
                {tr.elementsBtn} ({trait.elements.length})
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{transform:elemOpen?"rotate(180deg)":"none",transition:"transform 0.2s"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {elemOpen && (
                <div className="tcard-elems">
                  {trait.elements.map((el,i)=>(
                    <div key={el.id} className="tcard-el">
                      <span className="tcard-el-n" style={{background:cfg.bg,color:cfg.color}}>{i+1}</span>
                      <span className="tcard-el-txt" dir="auto">{el.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <input className="tcard-note" dir="auto"
            placeholder={`${tr.notePlaceholder}`}
            value={note} onChange={e=>onNote(e.target.value)}/>
        </div>

        {/* Right col — arc */}
        <div className="tcard-right">
          <Arc score={score} max={maxScore}/>
        </div>
      </div>
    </div>
  );
}

// ─── Total Banner ─────────────────────────────────────────────────────────────

function TotalBanner({
  total, traits, weights, scores, lang,
}: {
  total: number; traits: EvalTrait[]; weights: Weight[];
  scores: Record<string,number>; lang: string;
}) {
  const tr = getTR(lang);
  const pct = Math.min(total, 100);
  const color = total >= 75 ? "#1B5E20" : total >= 50 ? "#B8A082" : total > 0 ? "#796A62" : "#B8A082";
  const r = 38, circ = 2 * Math.PI * r;

  const label = total === 0
    ? tr.perfNotStarted
    : total >= 75
      ? tr.perfExcellent
      : total >= 50
        ? tr.perfGood
        : tr.perfNeedsWork;

  return (
    <div className="tb-wrap">
      {/* Big animated ring */}
      <div className="tb-ring-wrap">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(184,160,130,0.12)" strokeWidth="7"/>
          <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={circ}
            strokeDashoffset={circ*(1-pct/100)} transform="rotate(-90 48 48)"
            style={{transition:"stroke-dashoffset 0.6s ease,stroke 0.3s"}}/>
        </svg>
        <div className="tb-ring-inner">
          <span className="tb-ring-n" style={{color}}>{Math.round(total*10)/10}</span>
          <span className="tb-ring-d">/100</span>
        </div>
      </div>

      {/* Text + bar */}
      <div className="tb-text">
        <div className="tb-label" style={{color}}>{label}</div>
        <div className="tb-sub">{tr.totalSub}</div>
        <div className="tb-bar">
          <div className="tb-bar-fill" style={{width:`${pct}%`,background:color}}/>
        </div>
        <div className="tb-bar-pct" style={{color}}>{Math.round(total*10)/10} / 100</div>
      </div>

      {/* Trait dots */}
      <div className="tb-dots">
        {traits.map(t=>{
          const w = weights.find(w=>w.traitId===t.id);
          const s = scores[t.id] ?? 0;
          const p = w && w.maxScore > 0 ? s / w.maxScore : 0;
          const cfg = mq(t.maqsad);
          const lbl = mqLabel(t.maqsad, lang);
          return (
            <div key={t.id} className="tb-dot-col" title={t.name}>
              <div className="tb-dot-ring" style={{borderColor: p>0 ? cfg.fill : "rgba(184,160,130,0.2)"}}>
                <div className="tb-dot-fill" style={{
                  background:cfg.fill, opacity:p>0?p:0.1, transform:`scaleY(${p})`,
                }}/>
              </div>
              <span className="tb-dot-label">{lbl}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TraitEvalForm({
  studentId, moduleId, lang = "sq", onClose, onSaved,
}: {
  studentId: string; moduleId: string; lang?: string;
  onClose: () => void; onSaved: () => void;
}) {
  const tr = getTR(lang);
  const isRtl = lang === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const [data, setData]             = useState<EvalData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [scores, setScores]         = useState<Record<string,number>>({});
  const [notes, setNotes]           = useState<Record<string,string>>({});
  const [generalNote, setGN]        = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  useEffect(()=>{
    fetch(`/api/teacher/trait-assessments/${studentId}/${moduleId}`)
      .then(r=>r.json())
      .then((d:EvalData)=>{
        setData(d);
        if(d.assessment){
          const s:Record<string,number>={}, n:Record<string,string>={};
          d.assessment.trait_scores.forEach(ts=>{ s[ts.trait_id]=ts.score; n[ts.trait_id]=ts.note??""; });
          setScores(s); setNotes(n); setGN(d.assessment.general_note??"");
        } else {
          const s:Record<string,number>={};
          d.traits.forEach(t=>{ s[t.id]=0; });
          setScores(s);
        }
      })
      .finally(()=>setLoading(false));
  },[studentId,moduleId]);

  const total = data
    ? data.traits.reduce((sum,t)=>sum+(scores[t.id]??0),0)
    : 0;

  async function handleSave() {
    if(!data) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/teacher/trait-assessments/${studentId}/${moduleId}`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          scores:data.traits.map(t=>({
            trait_id:t.id, score:scores[t.id]??0, note:notes[t.id]?.trim()||undefined,
          })),
          general_note:generalNote.trim()||undefined,
        }),
      });
      const resp = await res.json();
      if(!res.ok){ setError(resp.error ?? tr.errorSave); return; }
      onSaved(); onClose();
    } catch {
      setError(tr.errorGeneric);
    } finally { setSaving(false); }
  }

  if(loading) return (
    <div className="tef-loading" dir={dir}>
      <style>{css}</style>
      <div className="tef-spinner"/>
      <span>{tr.loading}</span>
    </div>
  );

  if(!data) return null;
  const isEditing = !!data.assessment;

  return (
    <div className="tef-root" dir={dir}>
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="tef-hdr">
        <div className="tef-hdr-left">
          <div className="tef-hdr-path">
            <span className="tef-hdr-stage" dir="auto">{data.stage.title}</span>
            <span className="tef-hdr-sep">›</span>
            <span className="tef-hdr-mod" dir="auto">{data.module.title}</span>
          </div>
          <div className="tef-hdr-sub">
            {data.traits.length} {tr.traitsCount}
            {isEditing && <span className="tef-edit-chip">{tr.editing}</span>}
          </div>
        </div>
        <button className="tef-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Total banner ── */}
      <TotalBanner total={total} traits={data.traits} weights={data.weights} scores={scores} lang={lang}/>

      {/* ── Trait cards ── */}
      <div className="tef-cards">
        {data.traits.map(trait=>{
          const w = data.weights.find(w=>w.traitId===trait.id) ?? {traitId:trait.id,maxScore:0,isMain:false};
          return (
            <TraitCard key={trait.id} trait={trait} weight={w}
              score={scores[trait.id]??0} note={notes[trait.id]??""}
              lang={lang} isRtl={isRtl}
              onScore={v=>setScores(s=>({...s,[trait.id]:v}))}
              onNote={v=>setNotes(n=>({...n,[trait.id]:v}))}/>
          );
        })}
      </div>

      {/* ── General note ── */}
      <div className="tef-gnote">
        <label className="tef-gnote-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          {tr.generalNoteLabel}
        </label>
        <textarea className="tef-gnote-ta" rows={3} dir="auto"
          placeholder={tr.generalNotePlaceholder}
          value={generalNote} onChange={e=>setGN(e.target.value)}/>
      </div>

      {error && (
        <div className="tef-err">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="tef-foot">
        <button className="tef-save" onClick={handleSave} disabled={saving}>
          {saving ? <div className="tef-spin"/> : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          {saving ? tr.saving : isEditing ? tr.updateBtn : tr.saveBtn}
        </button>
        <button className="tef-cancel" onClick={onClose}>{tr.cancelBtn}</button>
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
  --tef-gold:#B8A082;--tef-gold2:#B8A082;
  --tef-black:#1A1A1A;
  --tef-bg:#FFFBF5;--tef-bg2:#EFEAE0;--tef-bg3:#EFEAE0;
  --tef-border:rgba(184,160,130,0.15);
  --tef-text:#6B1E2D;--tef-text2:#5B1526;--tef-text3:#796A62;
  --tef-font:'Cairo',sans-serif;
}

/* Root */
.tef-root{display:flex;flex-direction:column;font-family:var(--tef-font);color:var(--tef-text);background:var(--tef-bg);animation:tef-in 0.28s cubic-bezier(0.22,1,0.36,1)}

/* Loading */
.tef-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:260px;font-family:var(--tef-font);font-size:13px;color:var(--tef-text3)}
.tef-spinner{width:30px;height:30px;border:3px solid rgba(184,160,130,0.15);border-top-color:var(--tef-gold);border-radius:50%;animation:tef-spin 0.7s linear infinite}

/* Header */
.tef-hdr{
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  padding:18px 22px 14px;
  border-bottom:1px solid var(--tef-border);
  position:sticky;top:0;background:var(--tef-bg);z-index:20;
}
.tef-hdr-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.tef-hdr-path{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tef-hdr-stage{font-size:11px;font-weight:700;color:var(--tef-text3)}
.tef-hdr-sep{color:var(--tef-text3);opacity:0.4;font-size:13px}
.tef-hdr-mod{font-size:18px;font-weight:900;color:var(--tef-black);letter-spacing:-0.3px}
.tef-hdr-sub{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--tef-text3);font-weight:600}
.tef-edit-chip{font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;background:rgba(184,160,130,0.12);color:#6B1E2D;border:1px solid rgba(184,160,130,0.28)}
.tef-close{width:32px;height:32px;border-radius:50%;background:var(--tef-bg2);border:1px solid var(--tef-border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--tef-text3);transition:all 0.15s;flex-shrink:0}
.tef-close:hover{background:var(--tef-bg3);color:var(--tef-text)}

/* ── Total Banner ── */
.tb-wrap{
  display:flex;align-items:center;gap:18px;
  padding:20px 24px;
  background:var(--tef-bg);
  border-bottom:1px solid var(--tef-border);
}
.tb-ring-wrap{position:relative;width:96px;height:96px;flex-shrink:0}
.tb-ring-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.tb-ring-n{font-size:20px;font-weight:900;line-height:1}
.tb-ring-d{font-size:9.5px;font-weight:700;color:var(--tef-text3)}
.tb-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.tb-label{font-size:15px;font-weight:900;line-height:1.2}
.tb-sub{font-size:10.5px;color:var(--tef-text3);font-weight:600;margin-bottom:3px}
.tb-bar{height:5px;background:rgba(184,160,130,0.12);border-radius:99px;overflow:hidden}
.tb-bar-fill{height:100%;border-radius:99px;transition:width 0.6s cubic-bezier(0.22,1,0.36,1),background 0.3s}
.tb-bar-pct{font-size:10.5px;font-weight:700;margin-top:3px}
.tb-dots{display:flex;gap:10px;flex-shrink:0;align-items:center}
.tb-dot-col{display:flex;flex-direction:column;align-items:center;gap:4px}
.tb-dot-ring{width:14px;height:28px;border-radius:7px;border:1.5px solid;overflow:hidden;position:relative}
.tb-dot-fill{position:absolute;inset:0;transform-origin:bottom;transition:transform 0.4s ease,opacity 0.3s}
.tb-dot-label{font-size:8px;font-weight:800;color:var(--tef-text3)}

/* ── Trait Cards ── */
.tef-cards{display:flex;flex-direction:column;gap:0}

.tcard{
  position:relative;
  background:var(--tef-bg);
  border-bottom:1px solid var(--tef-border);
  display:flex;
  transition:background 0.15s;
}
.tcard-main{background:linear-gradient(180deg,rgba(247,243,235,0.55),var(--tef-bg))}

/* Colored left accent stripe */
.tcard-accent{
  width:4px;flex-shrink:0;
  border-radius:0;
}
.tcard-body{display:flex;align-items:flex-start;gap:14px;padding:20px 22px;flex:1;min-width:0}
.tcard-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.tcard-right{flex-shrink:0;padding-top:4px}

.tcard-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tcard-mq{font-size:10.5px;font-weight:800;padding:4px 10px;border-radius:7px;border:1px solid;flex-shrink:0}
.tcard-main-tag{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10.5px;font-weight:700;color:#6B1E2D;
  background:rgba(184,160,130,0.14);border:1px solid rgba(184,160,130,0.3);
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

/* ── Slider ── */
.sl-root{display:flex;flex-direction:column;gap:5px}
.sl-track-wrap{position:relative;height:18px}
.sl-track{
  position:absolute;top:50%;transform:translateY(-50%);
  left:0;right:0;height:10px;
  background:rgba(184,160,130,0.1);border-radius:99px;
}
.sl-fill{
  position:absolute;left:0;top:0;bottom:0;
  border-radius:99px;transition:width 0.08s linear;pointer-events:none;
}
.sl-thumb{
  position:absolute;top:50%;
  width:20px;height:20px;border-radius:50%;
  background:#fff;border:3px solid;
  transform:translate(-50%,-50%);pointer-events:none;
  transition:left 0.08s linear,border-color 0.2s,box-shadow 0.2s;z-index:1;
}
.sl-input{
  position:absolute;inset:-4px 0;width:100%;height:calc(100% + 8px);
  opacity:0;cursor:pointer;-webkit-appearance:none;appearance:none;margin:0;padding:0;
}
.sl-labels{display:flex;justify-content:space-between;padding:0 2px}
.sl-lbl{font-size:10.5px;color:var(--tef-text3);font-weight:600}

/* Elements */
.tcard-elem-btn{
  display:inline-flex;align-items:center;gap:7px;
  background:none;border:1px solid var(--tef-border);
  border-radius:9px;padding:7px 13px;
  font-family:var(--tef-font);font-size:12px;font-weight:700;
  color:var(--tef-text3);cursor:pointer;transition:all 0.15s;width:fit-content;
}
.tcard-elem-btn:hover{border-color:rgba(184,160,130,0.4);color:var(--tef-text);background:rgba(184,160,130,0.04)}
.tcard-elems{
  background:rgba(184,160,130,0.04);border:1px solid rgba(184,160,130,0.15);
  border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:9px;
  margin-top:8px;animation:tef-in 0.2s ease;
}
.tcard-el{display:flex;align-items:flex-start;gap:10px}
.tcard-el-n{width:22px;height:22px;border-radius:6px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.tcard-el-txt{font-size:13px;color:var(--tef-text2);line-height:1.65}

/* Note input */
.tcard-note{
  width:100%;padding:10px 14px;
  background:var(--tef-bg2);border:1px solid var(--tef-border);
  border-radius:10px;font-family:var(--tef-font);font-size:13px;color:var(--tef-text);
  outline:none;transition:border-color 0.15s,box-shadow 0.15s;
}
.tcard-note:focus{border-color:rgba(184,160,130,0.45);box-shadow:0 0 0 3px rgba(184,160,130,0.1)}
.tcard-note::placeholder{color:rgba(26,26,26,0.2)}

/* General note */
.tef-gnote{padding:18px 22px;border-top:1px solid var(--tef-border);display:flex;flex-direction:column;gap:8px;background:var(--tef-bg)}
.tef-gnote-label{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--tef-text3)}
.tef-gnote-ta{
  width:100%;padding:12px 14px;
  background:var(--tef-bg2);border:1px solid var(--tef-border);
  border-radius:12px;font-family:var(--tef-font);font-size:13.5px;color:var(--tef-text);
  outline:none;resize:vertical;min-height:80px;line-height:1.7;
  transition:border-color 0.15s,box-shadow 0.15s;
}
.tef-gnote-ta:focus{border-color:rgba(184,160,130,0.45);box-shadow:0 0 0 3px rgba(184,160,130,0.1)}
.tef-gnote-ta::placeholder{color:rgba(26,26,26,0.2)}

/* Error */
.tef-err{
  margin:0 22px;padding:12px 16px;
  background:rgba(184,160,130,0.06);border:1px solid rgba(184,160,130,0.22);
  border-radius:10px;display:flex;align-items:center;gap:9px;
  font-size:13px;color:var(--tef-text2);font-weight:600;
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
  box-shadow:0 4px 18px rgba(26,26,26,0.18);
}
.tef-save:hover:not(:disabled){background:#1A1A1A;box-shadow:0 6px 24px rgba(26,26,26,0.25);transform:translateY(-1px)}
.tef-save:disabled{opacity:0.45;cursor:not-allowed;transform:none}
.tef-spin{width:15px;height:15px;border:2.5px solid rgba(184,160,130,0.2);border-top-color:var(--tef-gold);border-radius:50%;animation:tef-spin 0.7s linear infinite}
.tef-cancel{padding:14px 24px;border-radius:14px;border:1.5px solid var(--tef-border);background:none;font-family:var(--tef-font);font-size:14px;font-weight:700;color:var(--tef-text3);cursor:pointer;transition:all 0.15s}
.tef-cancel:hover{border-color:rgba(184,160,130,0.35);color:var(--tef-text)}
`;
