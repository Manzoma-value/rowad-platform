/* eslint-disable react-hooks/set-state-in-effect */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import TraitEvalForm from "@/components/TraitEvalForm";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Lang = string;

interface TraitScore { trait_id:string; trait_name:string; maqsad:string; score:number; note:string|null; }
interface TraitAssessment {
  module_id:string; module_title:string; stage_title:string;
  total_score:number; general_note:string|null;
  submitted_at:string; updated_at:string; trait_scores:TraitScore[];
}
interface PendingModule { module_id:string; module_title:string; stage_title:string; stage_order:number; completed_at:string; }
interface TimelineItem {
  date:string; module_id:string; module_title:string; stage_title:string;
  stage_order:number; module_order:number; score_pct:number;
  score:number; total:number; trait_assessed:boolean;
}
interface TypeAccuracy { type:string; correct:number; total:number; pct:number; }
interface StageBreakdown { title:string; avg_score:number|null; modules_done:number; }
interface RadarPoint { trait_id:string; name:string; maqsad:string; average:number; }
interface StudentDetail {
  student: {
    id:string; full_name:string; avatar_url:string|null; class_name:string|null;
    attempts_count:number; avg_score:number|null;
    trait_assessments_count:number; pending_trait_assessments_count:number;
  };
  timeline:TimelineItem[]; type_accuracy:TypeAccuracy[];
  stage_breakdown:StageBreakdown[]; pending_trait_assessments:PendingModule[];
  trait_assessments:TraitAssessment[]; trait_radar:RadarPoint[];
}

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const TR: Record<string, Record<string, string>> = {
  ar: {
    loading: "جارٍ التحميل...",
    backBtn: "العودة للتقارير",
    attemptsStat: "محاولة",
    traitsStat: "تقييم سمات",
    pendingStat: "معلّق",
    tabProgress: "المسار والتقييم",
    tabTraits: "السمات",
    tabStats: "الإحصائيات",
    timelineTitle: "سجل المستويات",
    traitDone: "تم تقييم السمات",
    traitEval: "تقييم السمات",
    pendingTitle: "تقييمات معلّقة",
    radarTitle: "متوسط السمات",
    assessedTitle: "التقييمات المكتملة",
    editBtn: "تعديل",
    emptyTraits: "لم يُكمل الطالب أي مستوى بعد",
    typeAccTitle: "الدقة حسب نوع السؤال",
    stageTitle: "الأداء حسب المرحلة",
    moduleUnit: "وحدة",
    noData: "—",
  },
  sq: {
    loading: "Duke ngarkuar...",
    backBtn: "Kthehu te raportet",
    attemptsStat: "tentativa",
    traitsStat: "vlerësim tipari",
    pendingStat: "në pritje",
    tabProgress: "Rruga dhe Vlerësimi",
    tabTraits: "Tiparet",
    tabStats: "Statistikat",
    timelineTitle: "Regjistri i Niveleve",
    traitDone: "Tiparet u vlerësuan",
    traitEval: "Vlerëso Tiparet",
    pendingTitle: "Vlerësime në pritje",
    radarTitle: "Mesatarja e Tipareve",
    assessedTitle: "Vlerësimet e Plota",
    editBtn: "Modifiko",
    emptyTraits: "Nxënësi nuk ka përfunduar asnjë nivel akoma",
    typeAccTitle: "Saktësia sipas Llojit të Pyetjes",
    stageTitle: "Performanca sipas Fazës",
    moduleUnit: "modul",
    noData: "—",
  },
  en: {
    loading: "Loading...",
    backBtn: "Back to reports",
    attemptsStat: "attempts",
    traitsStat: "trait assessments",
    pendingStat: "pending",
    tabProgress: "Progress & Evaluation",
    tabTraits: "Traits",
    tabStats: "Statistics",
    timelineTitle: "Level History",
    traitDone: "Traits assessed",
    traitEval: "Assess Traits",
    pendingTitle: "Pending evaluations",
    radarTitle: "Trait Averages",
    assessedTitle: "Completed Assessments",
    editBtn: "Edit",
    emptyTraits: "Student has not completed any level yet",
    typeAccTitle: "Accuracy by Question Type",
    stageTitle: "Performance by Stage",
    moduleUnit: "module",
    noData: "—",
  },
};

const TYPE_LABELS: Record<string, Record<string, string>> = {
  ar: { MCQ:"اختيار متعدد", TF:"صح/خطأ", WRITTEN:"مقالي", MATCHING:"توصيل" },
  sq: { MCQ:"Zgjedhje e shumëfishtë", TF:"E vërtetë/E gabuar", WRITTEN:"Ese", MATCHING:"Lidhje" },
  en: { MCQ:"Multiple choice", TF:"True/False", WRITTEN:"Essay", MATCHING:"Matching" },
};

const MAQSAD_LABELS: Record<string, Record<string, string>> = {
  ar: { DEEN:"الدين", AQL:"العقل", NAFS:"النفس", NASL:"النسل", MAL:"المال" },
  sq: { DEEN:"Feja", AQL:"Mendja", NAFS:"Shpirti", NASL:"Pasardhësit", MAL:"Pasuria" },
  en: { DEEN:"Religion", AQL:"Intellect", NAFS:"Soul", NASL:"Progeny", MAL:"Wealth" },
};

const MAQSAD_COLORS: Record<string,{color:string;bg:string}> = {
  DEEN:{color:"#7A6020",bg:"rgba(229,185,60,0.10)"},
  AQL:{color:"#4A2080",bg:"rgba(74,32,128,0.08)"},
  NAFS:{color:"#1A5C3A",bg:"rgba(26,92,58,0.09)"},
  NASL:{color:"#7A4040",bg:"rgba(122,64,64,0.08)"},
  MAL:{color:"#5A4A10",bg:"rgba(154,98,0,0.09)"},
};

// ─── SCORE RING ───────────────────────────────────────────────────────────────

function ScoreRing({pct,size=52}:{pct:number|null;size?:number}){
  if(pct===null) return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"rgba(200,169,106,0.08)",border:"2px solid rgba(200,169,106,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:11,color:"#9A8A70",fontWeight:700}}>—</span>
    </div>
  );
  const r=(size-8)/2,circ=2*Math.PI*r,offset=circ-(pct/100)*circ;
  const color=pct>=75?"#2D8A4A":pct>=50?"#C8A96A":"#64748B";
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(200,169,106,0.12)" strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{transition:"stroke-dashoffset 0.9s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:size<48?10:13,fontWeight:800,color}}>{pct}%</span>
      </div>
    </div>
  );
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────

function RadarChart({data}:{data:RadarPoint[]}){
  if(!data.length) return null;
  const n=data.length,cx=120,cy=120,r=86;
  const angles=data.map((_,i)=>(i*2*Math.PI)/n-Math.PI/2);
  const gridPts=(s:number)=>angles.map(a=>`${cx+r*s*Math.cos(a)},${cy+r*s*Math.sin(a)}`).join(" ");
  const dataPts=angles.map((a,i)=>`${cx+r*(data[i].average/100)*Math.cos(a)},${cy+r*(data[i].average/100)*Math.sin(a)}`).join(" ");
  return (
    <svg viewBox="0 0 240 240" width="100%" style={{maxWidth:220}}>
      {[0.25,0.5,0.75,1].map(s=>(
        <polygon key={s} points={gridPts(s)} fill="none" stroke="rgba(200,169,106,0.12)" strokeWidth="1"/>
      ))}
      {angles.map((a,i)=>(
        <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)}
          stroke="rgba(200,169,106,0.1)" strokeWidth="1"/>
      ))}
      <polygon points={dataPts} fill="rgba(200,169,106,0.12)" stroke="#C8A96A" strokeWidth="2"/>
      {data.map((d,i)=>{
        const x=cx+r*(d.average/100)*Math.cos(angles[i]);
        const y=cy+r*(d.average/100)*Math.sin(angles[i]);
        const lx=cx+(r+20)*Math.cos(angles[i]);
        const ly=cy+(r+20)*Math.sin(angles[i]);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#C8A96A"/>
            <text x={lx} y={ly} fontSize="9" fill="#9A8A70" textAnchor="middle" dominantBaseline="middle">{d.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StudentReportPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLang();
  const tr = TR[lang] ?? TR["sq"];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const studentId = params.id as string;

  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [evalModuleId, setEvalModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"progress"|"traits"|"stats">("progress");

  const load = useCallback(() => {
    setLoading(true);
    cachedFetch<StudentDetail>(`/api/teacher/reports/students/${studentId}`, 30_000)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(()=>{ load(); },[load]);

  if(loading) return (
    <div className="sp-shell" dir={dir}>
      <div className="sp-loading"><div className="sp-spinner"/><span>{tr.loading}</span></div>
      <style>{css}</style>
    </div>
  );
  if(!data) return null;

  const {student}=data;

  const scoreColor=(pct:number)=>pct>=75?"#2D8A4A":pct>=50?"#C8A96A":"#64748B";

  return (
    <div className="sp-shell" dir={dir}>

      {/* ── Dark Hero Header ── */}
      <div className="sp-hero">
        <div className="sp-hero-stripe"/>
        <div className="sp-hero-inner">
          <button className="sp-back" onClick={()=>router.back()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points={dir==="rtl"?"15 18 9 12 15 6":"9 18 15 12 9 6"}/>
            </svg>
            {tr.backBtn}
          </button>

          <div className="sp-hero-profile">
            <div className="sp-hero-av">{student.full_name.charAt(0)}</div>
            <div className="sp-hero-info">
              <h1 className="sp-hero-name">{student.full_name}</h1>
              {student.class_name && <span className="sp-hero-class">{student.class_name}</span>}
            </div>
          </div>

          <div className="sp-hero-stats">
            <div className="sp-hstat">
              <span className="sp-hstat-n">{student.attempts_count}</span>
              <span className="sp-hstat-l">{tr.attemptsStat}</span>
            </div>
            <div className="sp-hstat-sep"/>
            <div className="sp-hstat">
              <span className="sp-hstat-n">{student.trait_assessments_count}</span>
              <span className="sp-hstat-l">{tr.traitsStat}</span>
            </div>
            {student.pending_trait_assessments_count > 0 && (
              <>
                <div className="sp-hstat-sep"/>
                <div className="sp-hstat pending">
                  <span className="sp-hstat-n">{student.pending_trait_assessments_count}</span>
                  <span className="sp-hstat-l">{tr.pendingStat}</span>
                </div>
              </>
            )}
            <div className="sp-hstat-sep"/>
            <ScoreRing pct={student.avg_score} size={60}/>
          </div>
        </div>
      </div>

      <div className="sp-body">

        {/* ── Tabs ── */}
        <div className="sp-tabs">
          {([
            ["progress", tr.tabProgress, null],
            ["traits",   tr.tabTraits,   student.pending_trait_assessments_count > 0 ? student.pending_trait_assessments_count : null],
            ["stats",    tr.tabStats,    null],
          ] as [string, string, number|null][]).map(([key,label,badge])=>(
            <button key={key}
              className={`sp-tab ${activeTab===key?"active":""}`}
              onClick={()=>setActiveTab(key as "progress"|"traits"|"stats")}>
              {label}
              {badge !== null && <span className="sp-tab-badge">{badge}</span>}
            </button>
          ))}
        </div>

        {/* ── TAB: PROGRESS ── */}
        {activeTab==="progress" && (
          <div className="sp-section">
            <div className="sp-section-hd">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              {tr.timelineTitle}
            </div>

            {data.timeline.length === 0 ? (
              <div className="sp-empty-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                <p>{tr.emptyTraits}</p>
              </div>
            ) : (
              <div className="sp-timeline">
                {data.timeline.map((item,idx)=>(
                  <div key={idx} className="sp-tl-row">
                    <div className="sp-tl-aside">
                      <div className="sp-tl-dot"/>
                      {idx < data.timeline.length-1 && <div className="sp-tl-line"/>}
                    </div>
                    <div className="sp-tl-card">
                      <div className="sp-tl-top">
                        <div className="sp-tl-info">
                          <span className="sp-tl-stage">{item.stage_title}</span>
                          <span className="sp-tl-mod">{item.module_title}</span>
                        </div>
                        <div className="sp-tl-right">
                          <span className="sp-tl-score" style={{color:scoreColor(item.score_pct)}}>
                            {item.score}/{item.total} · {item.score_pct}%
                          </span>
                          <span className="sp-tl-date">
                            {new Date(item.date).toLocaleDateString(lang==="ar"?"ar-SA":"sq-AL",{month:"short",day:"numeric"})}
                          </span>
                        </div>
                      </div>
                      <div className="sp-tl-trait-row">
                        {item.trait_assessed ? (
                          <div className="sp-tl-done">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            {tr.traitDone}
                          </div>
                        ):(
                          <button className="sp-tl-eval-btn" onClick={()=>setEvalModuleId(item.module_id)}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            {tr.traitEval}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: TRAITS ── */}
        {activeTab==="traits" && (
          <div className="sp-section">

            {/* Pending */}
            {data.pending_trait_assessments.length > 0 && (
              <div className="sp-pending-box">
                <div className="sp-pending-hd">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {tr.pendingTitle}
                  <span className="sp-pending-count">{data.pending_trait_assessments.length}</span>
                </div>
                <div className="sp-pending-list">
                  {data.pending_trait_assessments.map(p=>(
                    <div key={p.module_id} className="sp-pending-row">
                      <div className="sp-pending-info">
                        <span className="sp-pending-stage">{p.stage_title}</span>
                        <span className="sp-pending-mod">{p.module_title}</span>
                      </div>
                      <button className="sp-eval-btn" onClick={()=>setEvalModuleId(p.module_id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        {tr.traitEval}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Radar */}
            {data.trait_radar.length > 0 && (
              <div className="sp-radar-card">
                <div className="sp-section-hd">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2"/>
                  </svg>
                  {tr.radarTitle}
                </div>
                <div className="sp-radar-body">
                  <RadarChart data={data.trait_radar}/>
                  <div className="sp-radar-legend">
                    {data.trait_radar.map(r=>{
                      const m=MAQSAD_COLORS[r.maqsad]??MAQSAD_COLORS.DEEN;
                      const mLabel=(MAQSAD_LABELS[lang]??MAQSAD_LABELS["sq"])[r.maqsad]??r.maqsad;
                      return (
                        <div key={r.trait_id} className="sp-legend-row">
                          <span className="sp-legend-tag" style={{background:m.bg,color:m.color}}>{mLabel}</span>
                          <span className="sp-legend-name">{r.name}</span>
                          <span className="sp-legend-avg" style={{color:scoreColor(r.average)}}>{r.average}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Completed assessments */}
            {data.trait_assessments.length > 0 && (
              <div className="sp-assessed-section">
                <div className="sp-section-hd">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  {tr.assessedTitle}
                </div>
                <div className="sp-assessed-list">
                  {data.trait_assessments.map(a=>(
                    <div key={a.module_id} className="sp-assessed-card">
                      {/* Card header */}
                      <div className="sp-assessed-hd">
                        <div className="sp-assessed-info">
                          <span className="sp-assessed-stage">{a.stage_title}</span>
                          <span className="sp-assessed-mod">{a.module_title}</span>
                        </div>
                        <div className="sp-assessed-right">
                          <div className="sp-assessed-ring">
                            <svg width="54" height="54" style={{transform:"rotate(-90deg)"}}>
                              <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(200,169,106,0.12)" strokeWidth="5"/>
                              <circle cx="27" cy="27" r="22" fill="none"
                                stroke={scoreColor(a.total_score)} strokeWidth="5" strokeLinecap="round"
                                strokeDasharray={2*Math.PI*22}
                                strokeDashoffset={2*Math.PI*22*(1-Math.min(a.total_score,100)/100)}
                                style={{transition:"stroke-dashoffset 0.8s ease"}}/>
                            </svg>
                            <div className="sp-assessed-ring-inner">
                              <span style={{fontSize:13,fontWeight:900,color:scoreColor(a.total_score)}}>
                                {Math.round(a.total_score)}
                              </span>
                            </div>
                          </div>
                          <button className="sp-reassess-btn" onClick={()=>setEvalModuleId(a.module_id)}>
                            {tr.editBtn}
                          </button>
                        </div>
                      </div>

                      {/* Trait score bars */}
                      <div className="sp-trait-bars">
                        {a.trait_scores.map(ts=>{
                          const m=MAQSAD_COLORS[ts.maqsad]??MAQSAD_COLORS.DEEN;
                          const mLabel=(MAQSAD_LABELS[lang]??MAQSAD_LABELS["sq"])[ts.maqsad]??ts.maqsad;
                          return (
                            <div key={ts.trait_id} className="sp-trait-bar-row">
                              <span className="sp-trait-mq" style={{background:m.bg,color:m.color}}>{mLabel}</span>
                              <span className="sp-trait-name">{ts.trait_name}</span>
                              <div className="sp-trait-track">
                                <div className="sp-trait-fill"
                                  style={{width:`${Math.min(ts.score*2,100)}%`,
                                    background:`linear-gradient(90deg,${m.color}88,${m.color})`}}/>
                              </div>
                              <span className="sp-trait-score">{ts.score}</span>
                            </div>
                          );
                        })}
                      </div>

                      {a.general_note && (
                        <div className="sp-note">&ldquo;{a.general_note}&rdquo;</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.trait_assessments.length===0 && data.pending_trait_assessments.length===0 && (
              <div className="sp-empty-box">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <p>{tr.emptyTraits}</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: STATS ── */}
        {activeTab==="stats" && (
          <div className="sp-section">
            {data.type_accuracy.length > 0 && (
              <div className="sp-stat-panel">
                <div className="sp-section-hd">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  {tr.typeAccTitle}
                </div>
                <div className="sp-bar-list">
                  {data.type_accuracy.map(item=>{
                    const typeLabel=(TYPE_LABELS[lang]??TYPE_LABELS["sq"])[item.type]??item.type;
                    return (
                      <div key={item.type} className="sp-bar-row">
                        <span className="sp-bar-label">{typeLabel}</span>
                        <div className="sp-bar-track">
                          <div className="sp-bar-fill" style={{
                            width:`${item.pct}%`,
                            background:item.pct>=75?"linear-gradient(90deg,#2D8A4A,#4AAD6A)":
                              item.pct>=50?"linear-gradient(90deg,#C8A96A,#E5B93C)":
                              "linear-gradient(90deg,#94A3B8,#64748B)",
                          }}/>
                        </div>
                        <span className="sp-bar-pct" style={{color:scoreColor(item.pct)}}>{item.pct}%</span>
                        <span className="sp-bar-frac">{item.correct}/{item.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.stage_breakdown.length > 0 && (
              <div className="sp-stat-panel">
                <div className="sp-section-hd">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18"/>
                  </svg>
                  {tr.stageTitle}
                </div>
                <div className="sp-bar-list">
                  {data.stage_breakdown.map((s,i)=>(
                    <div key={i} className="sp-bar-row">
                      <span className="sp-bar-label">{s.title}</span>
                      <div className="sp-bar-track">
                        <div className="sp-bar-fill" style={{
                          width:`${s.avg_score??0}%`,
                          background:(s.avg_score??0)>=75?"linear-gradient(90deg,#2D8A4A,#4AAD6A)":
                            (s.avg_score??0)>=50?"linear-gradient(90deg,#C8A96A,#E5B93C)":
                            "linear-gradient(90deg,#94A3B8,#64748B)",
                        }}/>
                      </div>
                      <span className="sp-bar-pct" style={{color:scoreColor(s.avg_score??0)}}>
                        {s.avg_score!==null?`${s.avg_score}%`:tr.noData}
                      </span>
                      <span className="sp-bar-frac">{s.modules_done} {tr.moduleUnit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>{/* /sp-body */}

      {/* ── Eval overlay ── */}
      {evalModuleId && (
        <div className="sp-overlay">
          <div className="sp-overlay-panel">
            <TraitEvalForm
              studentId={studentId}
              moduleId={evalModuleId}
              lang={lang as Lang}
              onClose={()=>setEvalModuleId(null)}
              onSaved={()=>{
                // The teacher just saved/updated an evaluation — the cached
                // student detail + class-wide reports list is now stale.
                invalidateCache(`/api/teacher/reports/students/${studentId}`);
                invalidateCache("/api/teacher/reports");
                setEvalModuleId(null);
                load();
              }}
            />
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@keyframes sp-fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes sp-spin{to{transform:rotate(360deg)}}
@keyframes sp-overlayIn{from{opacity:0}to{opacity:1}}
@keyframes sp-panelIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes sp-fillIn{from{width:0}}

:root{
  --sp-gold:#C8A96A; --sp-gold2:#E5B93C;
  --sp-black:#0B0B0C; --sp-bg:#F6F4EE;
  --sp-card:#FFFDF8; --sp-border:rgba(200,169,106,0.14);
  --sp-text:#0B0B0C; --sp-text2:#3D3526; --sp-text3:#9A8A70;
  --sp-font:'Cairo',sans-serif;
}

/* Shell */
.sp-shell{min-height:100vh;background:var(--sp-bg);font-family:var(--sp-font);color:var(--sp-text);animation:sp-fadeUp 0.32s ease;position:relative}

/* Loading */
.sp-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:60vh;color:var(--sp-text3);font-size:14px;font-weight:600}
.sp-spinner{width:26px;height:26px;border-radius:50%;border:3px solid rgba(200,169,106,0.15);border-top-color:var(--sp-gold);animation:sp-spin 0.7s linear infinite}

/* Hero */
.sp-hero{background:var(--sp-black);position:relative;overflow:hidden;padding:22px 40px 28px;border-bottom:1px solid rgba(200,169,106,0.08)}
.sp-hero-stripe{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent)}
.sp-hero::after{content:'';position:absolute;bottom:-50px;right:-50px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,106,0.07),transparent 70%);pointer-events:none}
.sp-hero-inner{position:relative;z-index:1;display:flex;flex-direction:column;gap:20px}

/* Back button */
.sp-back{
  display:inline-flex;align-items:center;gap:7px;background:rgba(200,169,106,0.08);
  border:1px solid rgba(200,169,106,0.2);border-radius:8px;
  padding:7px 14px;font-family:var(--sp-font);font-size:12px;font-weight:700;
  color:rgba(200,169,106,0.7);cursor:pointer;transition:all 0.15s;width:fit-content;
}
.sp-back:hover{background:rgba(200,169,106,0.14);color:var(--sp-gold)}

/* Profile */
.sp-hero-profile{display:flex;align-items:center;gap:18px}
.sp-hero-av{
  width:70px;height:70px;border-radius:22px;
  background:linear-gradient(135deg,rgba(200,169,106,0.15),rgba(229,185,60,0.12));
  border:2px solid rgba(200,169,106,0.25);
  color:var(--sp-gold);display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:900;flex-shrink:0;
}
.sp-hero-info{flex:1;min-width:0}
.sp-hero-name{font-size:24px;font-weight:900;color:#FFFFFF;letter-spacing:-0.3px}
.sp-hero-class{font-size:12px;color:rgba(200,169,106,0.55);font-weight:600;margin-top:3px;display:block}

/* Hero stats */
.sp-hero-stats{display:flex;align-items:center;gap:0;background:rgba(255,255,255,0.04);border:1px solid rgba(200,169,106,0.12);border-radius:16px;padding:14px 20px;flex-wrap:wrap;gap:16px}
.sp-hstat{display:flex;flex-direction:column;align-items:center;gap:2px}
.sp-hstat-n{font-size:22px;font-weight:900;color:#FFFFFF;line-height:1}
.sp-hstat-l{font-size:10px;color:rgba(200,169,106,0.55);font-weight:600;white-space:nowrap}
.sp-hstat.pending .sp-hstat-n{color:var(--sp-gold)}
.sp-hstat-sep{width:1px;height:32px;background:rgba(200,169,106,0.15)}

/* Body */
.sp-body{display:flex;flex-direction:column;gap:22px;padding:24px 40px 80px}

/* Tabs */
.sp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--sp-border);padding-bottom:0}
.sp-tab{
  padding:10px 22px;border:none;border-bottom:2.5px solid transparent;
  background:none;cursor:pointer;font-family:var(--sp-font);font-size:13.5px;
  font-weight:600;color:var(--sp-text3);transition:all 0.18s;
  display:flex;align-items:center;gap:7px;margin-bottom:-1px;
}
.sp-tab:hover{color:var(--sp-text2)}
.sp-tab.active{color:var(--sp-black);border-bottom-color:var(--sp-gold);font-weight:800}
.sp-tab-badge{font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(229,185,60,0.12);color:#A8863E;border:1px solid rgba(229,185,60,0.25)}

/* Section */
.sp-section{display:flex;flex-direction:column;gap:20px;animation:sp-fadeUp 0.25s ease}
.sp-section-hd{
  display:flex;align-items:center;gap:8px;
  font-size:10px;font-weight:800;letter-spacing:2px;
  text-transform:uppercase;color:var(--sp-text3);
}
.sp-section-hd svg{color:rgba(200,169,106,0.5);flex-shrink:0}

/* Empty */
.sp-empty-box{
  display:flex;flex-direction:column;align-items:center;gap:14px;
  padding:56px 32px;background:var(--sp-card);
  border:1.5px solid var(--sp-border);border-radius:20px;text-align:center;
}
.sp-empty-box svg{color:rgba(200,169,106,0.25)}
.sp-empty-box p{font-size:14px;font-weight:600;color:var(--sp-text3)}

/* ── TIMELINE ── */
.sp-timeline{display:flex;flex-direction:column;gap:0}
.sp-tl-row{display:flex;gap:14px}
.sp-tl-aside{display:flex;flex-direction:column;align-items:center;padding-top:18px;flex-shrink:0}
.sp-tl-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;background:#C8A96A;box-shadow:0 0 0 3px rgba(200,169,106,0.18)}
.sp-tl-line{width:1.5px;flex:1;background:var(--sp-border);margin-top:5px;min-height:18px}
.sp-tl-card{
  flex:1;margin-bottom:14px;
  background:var(--sp-card);border:1.5px solid var(--sp-border);
  border-radius:16px;overflow:hidden;
  box-shadow:0 2px 8px rgba(0,0,0,0.04);
  transition:border-color 0.18s;
}
.sp-tl-card:hover{border-color:rgba(200,169,106,0.3)}
.sp-tl-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px 10px}
.sp-tl-info{display:flex;flex-direction:column;gap:3px}
.sp-tl-stage{font-size:10px;font-weight:700;color:var(--sp-text3);text-transform:uppercase;letter-spacing:0.8px}
.sp-tl-mod{font-size:14.5px;font-weight:800;color:var(--sp-black)}
.sp-tl-right{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
.sp-tl-score{font-size:13px;font-weight:800}
.sp-tl-date{font-size:11px;color:var(--sp-text3);font-weight:500}
.sp-tl-trait-row{padding:0 16px 12px}
.sp-tl-done{
  display:inline-flex;align-items:center;gap:6px;
  font-size:11.5px;font-weight:700;color:#2D8A4A;
  background:rgba(45,138,74,0.08);border-radius:7px;padding:4px 11px;
}
.sp-tl-eval-btn{
  display:inline-flex;align-items:center;gap:6px;
  font-size:11.5px;font-weight:700;color:#A8863E;
  background:rgba(229,185,60,0.1);border:1px solid rgba(229,185,60,0.25);
  border-radius:7px;padding:5px 13px;cursor:pointer;font-family:var(--sp-font);
  transition:all 0.15s;
}
.sp-tl-eval-btn:hover{background:rgba(229,185,60,0.18);border-color:rgba(229,185,60,0.4)}

/* ── PENDING BOX ── */
.sp-pending-box{
  background:rgba(229,185,60,0.04);border:1.5px solid rgba(229,185,60,0.18);
  border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:14px;
}
.sp-pending-hd{
  display:flex;align-items:center;gap:8px;
  font-size:10px;font-weight:800;letter-spacing:2px;
  text-transform:uppercase;color:#A8863E;
}
.sp-pending-count{
  font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;
  background:rgba(229,185,60,0.15);color:#A8863E;border:1px solid rgba(229,185,60,0.25);
}
.sp-pending-list{display:flex;flex-direction:column;gap:8px}
.sp-pending-row{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  background:var(--sp-card);border:1.5px solid var(--sp-border);
  border-radius:12px;padding:12px 16px;
}
.sp-pending-info{display:flex;flex-direction:column;gap:3px}
.sp-pending-stage{font-size:10px;font-weight:700;color:var(--sp-text3);text-transform:uppercase;letter-spacing:0.8px}
.sp-pending-mod{font-size:14px;font-weight:800;color:var(--sp-black)}
.sp-eval-btn{
  display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:11px;
  background:var(--sp-black);border:none;color:var(--sp-gold);
  font-family:var(--sp-font);font-size:13px;font-weight:700;cursor:pointer;
  transition:all 0.18s;flex-shrink:0;
  box-shadow:0 3px 12px rgba(0,0,0,0.15);
}
.sp-eval-btn:hover{background:#1A1208;box-shadow:0 5px 18px rgba(0,0,0,0.22)}

/* ── RADAR ── */
.sp-radar-card{
  background:var(--sp-card);border:1.5px solid var(--sp-border);
  border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:16px;
  box-shadow:0 2px 10px rgba(0,0,0,0.04);
}
.sp-radar-body{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
.sp-radar-legend{display:flex;flex-direction:column;gap:9px;flex:1;min-width:160px}
.sp-legend-row{display:flex;align-items:center;gap:8px}
.sp-legend-tag{font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px;flex-shrink:0;white-space:nowrap}
.sp-legend-name{flex:1;font-size:12.5px;font-weight:600;color:var(--sp-text)}
.sp-legend-avg{font-size:13px;font-weight:800;flex-shrink:0}

/* ── ASSESSED CARDS ── */
.sp-assessed-section{display:flex;flex-direction:column;gap:12px}
.sp-assessed-list{display:flex;flex-direction:column;gap:12px}
.sp-assessed-card{
  background:var(--sp-card);border:1.5px solid var(--sp-border);
  border-radius:18px;overflow:hidden;
  box-shadow:0 2px 10px rgba(0,0,0,0.04);
}
.sp-assessed-hd{
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  padding:16px 18px;border-bottom:1px solid rgba(200,169,106,0.08);
}
.sp-assessed-info{display:flex;flex-direction:column;gap:3px}
.sp-assessed-stage{font-size:10px;font-weight:700;color:var(--sp-text3);text-transform:uppercase;letter-spacing:0.8px}
.sp-assessed-mod{font-size:16px;font-weight:900;color:var(--sp-black)}
.sp-assessed-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.sp-assessed-ring{position:relative;width:54px;height:54px;flex-shrink:0}
.sp-assessed-ring-inner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.sp-reassess-btn{
  padding:7px 16px;border-radius:10px;border:1.5px solid var(--sp-border);
  background:none;font-family:var(--sp-font);font-size:12px;font-weight:700;
  color:var(--sp-text3);cursor:pointer;transition:all 0.15s;
}
.sp-reassess-btn:hover{border-color:rgba(200,169,106,0.35);color:var(--sp-black)}

/* Trait bars */
.sp-trait-bars{display:flex;flex-direction:column;gap:8px;padding:14px 18px}
.sp-trait-bar-row{display:flex;align-items:center;gap:8px}
.sp-trait-mq{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:5px;flex-shrink:0;white-space:nowrap}
.sp-trait-name{font-size:12px;font-weight:600;color:var(--sp-text);width:110px;flex-shrink:0}
.sp-trait-track{flex:1;height:6px;background:rgba(200,169,106,0.1);border-radius:99px;overflow:hidden}
.sp-trait-fill{height:100%;border-radius:99px;animation:sp-fillIn 0.8s ease both;transition:width 0.6s ease}
.sp-trait-score{font-size:11.5px;font-weight:800;color:var(--sp-text2);width:26px;text-align:end;flex-shrink:0}
.sp-note{
  margin:0 18px 14px;padding:10px 14px;
  font-size:12.5px;color:var(--sp-text3);font-style:italic;line-height:1.6;
  background:#FAFAF8;border-radius:10px;border-left:2.5px solid rgba(200,169,106,0.3);
}

/* ── STATS ── */
.sp-stat-panel{
  background:var(--sp-card);border:1.5px solid var(--sp-border);
  border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:16px;
  box-shadow:0 2px 10px rgba(0,0,0,0.04);
}
.sp-bar-list{display:flex;flex-direction:column;gap:12px}
.sp-bar-row{display:flex;align-items:center;gap:10px}
.sp-bar-label{font-size:12px;color:var(--sp-text2);font-weight:600;width:120px;flex-shrink:0}
.sp-bar-track{flex:1;height:8px;background:rgba(200,169,106,0.1);border-radius:99px;overflow:hidden}
.sp-bar-fill{height:100%;border-radius:99px;animation:sp-fillIn 0.85s ease both;transition:width 0.6s ease}
.sp-bar-pct{font-size:12px;font-weight:800;width:38px;text-align:end;flex-shrink:0}
.sp-bar-frac{font-size:11px;color:var(--sp-text3);width:42px;flex-shrink:0}

/* ── OVERLAY ── */
.sp-overlay{
  position:fixed;inset:0;z-index:200;
  background:rgba(8,11,12,0.65);backdrop-filter:blur(8px);
  display:flex;align-items:flex-end;justify-content:center;
  padding:20px;animation:sp-overlayIn 0.22s ease;
}
@media(min-width:768px){.sp-overlay{align-items:center}}
.sp-overlay-panel{
  background:var(--sp-bg);border-radius:24px 24px 0 0;
  width:100%;max-width:700px;max-height:92vh;overflow-y:auto;
  animation:sp-panelIn 0.28s cubic-bezier(0.22,1,0.36,1);
  box-shadow:0 -4px 40px rgba(0,0,0,0.25);
}
@media(min-width:768px){.sp-overlay-panel{border-radius:24px;max-height:88vh}}

@media(max-width:900px){
  .sp-hero,.sp-body{padding-inline:20px}
}
@media(max-width:600px){
  .sp-hero,.sp-body{padding-inline:16px}
  .sp-hero-stats{gap:10px; flex-wrap:wrap}
  .sp-bar-label{width:72px;font-size:10.5px}
  .sp-trait-name{width:64px;font-size:11.5px}
  .sp-overlay{padding:0}
  .sp-overlay-panel{border-radius:18px 18px 0 0;max-height:94vh}
}
@media(max-width:400px){
  .sp-hero,.sp-body{padding-inline:12px}
  .sp-bar-label{width:60px;font-size:10px}
  .sp-trait-name{width:54px;font-size:11px}
}
`;
