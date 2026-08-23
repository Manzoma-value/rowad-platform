"use client";
/* eslint-disable react-hooks/set-state-in-effect */
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, BarChart3, BookOpenCheck, CalendarDays,
  CheckCircle2, ClipboardCheck, Clock3, GraduationCap, HeartHandshake, Radar,
  Sparkles, Target, TrendingUp,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { cachedFetch } from "@/lib/api-cache";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import StudentSupportCircle from "@/components/StudentSupportCircle";
import { seedFromString } from "@/lib/trait-spectrum";
import type { StudentSupportCircle as StudentSupportCircleValue } from "@/lib/student-support";

type Lang = "ar" | "sq";
type Tab = "support" | "journey" | "traits" | "performance";
interface TraitScore { trait_id:string; trait_name:string; maqsad:string; score:number; note:string|null; }
interface TraitAssessment { id:string; is_mine:boolean; educator_name:string; observed_at:string; module_id:string; module_title:string; stage_title:string; total_score:number; general_note:string|null; submitted_at:string; updated_at:string; trait_scores:TraitScore[]; }
interface PendingModule { module_id:string; module_title:string; stage_title:string; stage_order:number; completed_at:string; }
interface TimelineItem { date:string; module_id:string; module_title:string; stage_title:string; stage_order:number; module_order:number; score_pct:number; score:number; total:number; trait_assessed:boolean; }
interface TypeAccuracy { type:string; correct:number; total:number; pct:number; }
interface StageBreakdown { title:string; avg_score:number|null; modules_done:number; }
interface RadarPoint { trait_id:string; name:string; maqsad:string; average:number; }
interface StudentDetail {
  student: { id:string; full_name:string; avatar_url:string|null; class_name:string|null; attempts_count:number; passed_count:number; avg_score:number|null; trait_assessments_count:number; pending_trait_assessments_count:number; support_circle:StudentSupportCircleValue; };
  timeline:TimelineItem[]; type_accuracy:TypeAccuracy[]; stage_breakdown:StageBreakdown[];
  pending_trait_assessments:PendingModule[]; trait_assessments:TraitAssessment[]; trait_radar:RadarPoint[];
}

const COPY = {
  ar: {
    back:"العودة إلى تقارير المستفيدين", eyebrow:"ملف التطور التربوي", support:"دائرة الرعاية", journey:"رحلة التعلم", traits:"قراءات السمات", performance:"الأداء",
    attempts:"محاولات التعلم", completed:"وحدات مكتملة", readings:"قراءات موثقة", average:"متوسط الأداء", pending:"قراءات جاهزة للتوثيق",
    pendingTitle:"جاهز لقراءة السمات", pendingSub:"أكمل المستفيد هذه المفاهيم. وثّق ملاحظتك التربوية الآن بخطوات واضحة وحفظ يدوي.", rateNow:"ابدأ التقييم", review:"مراجعة القراءة",
    timeline:"الخط الزمني للتعلم", timelineSub:"المفاهيم التي أكملها المستفيد ونتيجة كل محاولة وحالة قراءة السمات.", documented:"تم توثيق السمات", needsReading:"بانتظار قراءتك", noJourney:"لم يبدأ المستفيد أي وحدة بعد.",
    spectrum:"الصورة التراكمية", spectrumSub:"متوسط القراءات التربوية الموثقة لهذا المستفيد عبر المفاهيم.", history:"سجل القراءات", historySub:"كل قراءة موثقة، ومن سجّلها ومتى.", by:"وثّقها", noReadings:"لا توجد قراءات سمات موثقة بعد.",
    questionAccuracy:"الدقة حسب نوع السؤال", stages:"الأداء حسب المرحلة", modules:"وحدات", noPerformance:"لا توجد بيانات أداء كافية بعد.",
    score:"نتيجة المحاولة", date:"التاريخ", note:"الخلاصة", evidence:"ملاحظات السمات", addMine:"أضف قراءتي", passRate:"نسبة الاجتياز", allCaughtUp:"لا توجد قراءات معلّقة — كل شيء موثّق", actionHint:"نفس تجربة تقييم أعضاء المجموعة: وزّع 100 نقطة ثم اضغط حفظ.",
  },
  sq: {
    back:"Kthehu te raportet e pjesëmarrësve", eyebrow:"Profili i zhvillimit edukativ", support:"Rrethi i kujdesit", journey:"Rruga e të nxënit", traits:"Leximet e tipareve", performance:"Performanca",
    attempts:"Përpjekje mësimore", completed:"Module të përfunduara", readings:"Lexime të dokumentuara", average:"Mesatarja", pending:"Lexime gati për dokumentim",
    pendingTitle:"Gati për leximin e tipareve", pendingSub:"Pjesëmarrësi i ka përfunduar këto koncepte. Dokumento tani vëzhgimin me hapa të qartë dhe ruajtje manuale.", rateNow:"Fillo vlerësimin", review:"Rishiko leximin",
    timeline:"Kronologjia e të nxënit", timelineSub:"Konceptet e përfunduara, rezultati i çdo përpjekjeje dhe statusi i leximit të tipareve.", documented:"Tiparet u dokumentuan", needsReading:"Pret leximin tënd", noJourney:"Pjesëmarrësi nuk ka filluar ende një modul.",
    spectrum:"Pamja e përmbledhur", spectrumSub:"Mesatarja e leximeve edukative të dokumentuara për këtë pjesëmarrës.", history:"Historia e leximeve", historySub:"Çdo lexim i dokumentuar, nga kush dhe kur.", by:"Dokumentuar nga", noReadings:"Nuk ka ende lexime tiparesh të dokumentuara.",
    questionAccuracy:"Saktësia sipas llojit të pyetjes", stages:"Performanca sipas fazës", modules:"module", noPerformance:"Nuk ka ende të dhëna të mjaftueshme.",
    score:"Rezultati", date:"Data", note:"Përmbledhja", evidence:"Shënimet e tipareve", addMine:"Shto leximin tim", passRate:"Shkalla e kalimit", allCaughtUp:"Nuk ka lexime në pritje — gjithçka është dokumentuar", actionHint:"E njëjta përvojë si vlerësimi i grupit: shpërndaj 100 pikë dhe shtyp Ruaj.",
  },
} as const;

const TYPE_LABELS: Record<string, Record<Lang, string>> = {
  MCQ:{ar:"اختيار متعدد",sq:"Zgjedhje e shumëfishtë"}, TF:{ar:"صح أو خطأ",sq:"E vërtetë / e gabuar"},
  WRITTEN:{ar:"إجابة كتابية",sq:"Përgjigje me shkrim"}, MATCHING:{ar:"توصيل",sq:"Përputhje"},
};
const MAQSAD_COLORS: Record<string,string> = { DEEN:"#8F765B", AQL:"#655B53", NAFS:"#1B5E20", NASL:"#6B1E2D", MAL:"#4A0E1C" };

function dateLabel(value:string, lang:Lang) {
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { day:"numeric", month:"short", year:"numeric" });
}

function Metric({ icon, value, label, accent=false }:{ icon:React.ReactNode; value:string|number; label:string; accent?:boolean }) {
  return <article className={`sr-metric ${accent ? "accent" : ""}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

export default function StudentReportPage() {
  const { id } = useParams<{id:string}>();
  const { lang } = useLang();
  const L:Lang = lang === "ar" ? "ar" : "sq";
  const T = COPY[L];
  const [data,setData] = useState<StudentDetail|null>(null);
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);
  const [tab,setTab] = useState<Tab>("support");

  const load = useCallback(() => {
    setLoading(true); setFailed(false);
    cachedFetch<StudentDetail>(`/api/teacher/reports/students/${id}`,30_000)
      .then(setData).catch(()=>setFailed(true)).finally(()=>setLoading(false));
  },[id]);
  useEffect(()=>{ load(); },[load]);

  const myAssessmentByModule = useMemo(()=>new Map(data?.trait_assessments.filter(item=>item.is_mine).map(item=>[item.module_id,item]) ?? []),[data]);
  if(loading) return <MandalaLoader/>;
  if(failed || !data) return <TeacherLoadError onRetry={load}/>;
  const { student } = data;
  const passRate = student.attempts_count ? Math.round((student.passed_count/student.attempts_count)*100) : 0;

  return <main className="sr" dir={L === "ar" ? "rtl" : "ltr"}>
    <Link className="sr-back" href="/teacher/reports"><ArrowLeft size={15}/>{T.back}</Link>

    <header className="sr-hero">
      <div className="sr-orbit one"/><div className="sr-orbit two"/>
      <div className="sr-person">
        <div className="sr-avatar">{student.avatar_url ? <Image src={student.avatar_url} alt={student.full_name} width={74} height={74}/> : student.full_name.trim().charAt(0).toUpperCase()}</div>
        <div><span className="sr-eyebrow"><Sparkles size={13}/>{T.eyebrow}</span><h1>{student.full_name}</h1>{student.class_name && <p><GraduationCap size={14}/>{student.class_name}</p>}</div>
      </div>
      <div className="sr-score"><small>{T.average}</small><strong>{student.avg_score ?? "—"}{student.avg_score !== null && <i>%</i>}</strong><span>{T.passRate}: {passRate}%</span></div>
    </header>

    <section className="sr-metrics">
      <Metric icon={<BookOpenCheck/>} value={student.attempts_count} label={T.attempts}/>
      <Metric icon={<CheckCircle2/>} value={student.passed_count} label={T.completed}/>
      <Metric icon={<Radar/>} value={student.trait_assessments_count} label={T.readings}/>
      <Metric icon={<Clock3/>} value={student.pending_trait_assessments_count} label={T.pending} accent={student.pending_trait_assessments_count>0}/>
    </section>

    <nav className="sr-tabs" aria-label={T.eyebrow}>
      <button className={tab==="support"?"active":""} onClick={()=>setTab("support")}><HeartHandshake size={16}/>{T.support}</button>
      <button className={tab==="journey"?"active":""} onClick={()=>setTab("journey")}><TrendingUp size={16}/>{T.journey}</button>
      <button className={tab==="traits"?"active":""} onClick={()=>setTab("traits")}><Radar size={16}/>{T.traits}<b>{data.trait_assessments.length}</b></button>
      <button className={tab==="performance"?"active":""} onClick={()=>setTab("performance")}><BarChart3 size={16}/>{T.performance}</button>
    </nav>

    {tab === "support" && <div className="sr-view"><StudentSupportCircle value={student.support_circle} lang={L} editable endpoint={`/api/teacher/reports/students/${id}/support-circle`} invalidateUrl={`/api/teacher/reports/students/${id}`} onChange={(supportCircle) => setData((current) => current ? { ...current, student: { ...current.student, support_circle: supportCircle } } : current)} /></div>}

    {tab === "journey" && <div className="sr-view">
      <section className={`sr-action ${data.pending_trait_assessments.length ? "has-items" : "done"}`}>
        <div className="sr-action-head"><span><ClipboardCheck/></span><div><h2>{data.pending_trait_assessments.length ? T.pendingTitle : T.allCaughtUp}</h2><p>{data.pending_trait_assessments.length ? T.pendingSub : T.actionHint}</p></div>{data.pending_trait_assessments.length>0 && <b>{data.pending_trait_assessments.length}</b>}</div>
        {data.pending_trait_assessments.length>0 && <div className="sr-action-grid">{data.pending_trait_assessments.map(item=><article key={item.module_id}><div><small>{item.stage_title}</small><strong>{item.module_title}</strong><time><CalendarDays size={12}/>{dateLabel(item.completed_at,L)}</time></div><Link href={`/teacher/reports/students/${id}/rate/${item.module_id}`}>{T.rateNow}<ArrowUpRight size={15}/></Link></article>)}</div>}
      </section>

      <section className="sr-card"><Header icon={<TrendingUp/>} title={T.timeline} sub={T.timelineSub}/>
        {data.timeline.length===0 ? <Empty text={T.noJourney}/> : <div className="sr-timeline">{[...data.timeline].reverse().map((item,index)=>{
          const assessment=myAssessmentByModule.get(item.module_id);
          return <article key={`${item.module_id}-${item.date}`}><div className="sr-line"><i/>{index<data.timeline.length-1&&<span/>}</div><div className="sr-event"><div className="sr-event-top"><div><small>{item.stage_title}</small><h3>{item.module_title}</h3></div><div className="sr-attempt"><b>{item.score_pct}%</b><span>{item.score}/{item.total}</span></div></div><div className="sr-event-foot"><time>{dateLabel(item.date,L)}</time>{assessment ? <Link className="documented" href={`/teacher/reports/students/${id}/rate/${item.module_id}`}><CheckCircle2 size={13}/>{T.documented}</Link> : <Link className="pending" href={`/teacher/reports/students/${id}/rate/${item.module_id}`}><Clock3 size={13}/>{T.needsReading}</Link>}</div></div></article>;
        })}</div>}
      </section>
    </div>}

    {tab === "traits" && <div className="sr-view">
      <section className="sr-card"><Header icon={<Radar/>} title={T.spectrum} sub={T.spectrumSub}/>{data.trait_radar.length ? <TraitSpectrumPanel traits={data.trait_radar.map(item=>({label:item.name,color:MAQSAD_COLORS[item.maqsad]??"#6B1E2D",pct:item.average}))} seed={seedFromString(student.id)} lang={L} compact/> : <Empty text={T.noReadings}/>}</section>
      <section className="sr-card"><Header icon={<ClipboardCheck/>} title={T.history} sub={T.historySub}/>{data.trait_assessments.length ? <div className="sr-readings">{[...data.trait_assessments].reverse().map(item=><article key={item.id}><div className="sr-reading-head"><div><small>{item.stage_title}</small><h3>{item.module_title}</h3></div><Link href={`/teacher/reports/students/${id}/rate/${item.module_id}`}>{item.is_mine ? T.review : T.addMine}<ArrowUpRight size={14}/></Link></div><div className="sr-reading-meta"><span><CalendarDays size={12}/>{dateLabel(item.observed_at,L)}</span><span><GraduationCap size={12}/>{T.by}: {item.educator_name}</span></div>{item.general_note&&<p><b>{T.note}</b>{item.general_note}</p>}<div className="sr-traits">{item.trait_scores.map(score=><span key={score.trait_id}><i style={{background:MAQSAD_COLORS[score.maqsad]??"#6B1E2D"}}/>{score.trait_name}<b>{score.score}%</b></span>)}</div></article>)}</div> : <Empty text={T.noReadings}/>}</section>
    </div>}

    {tab === "performance" && <div className="sr-view sr-performance">
      <section className="sr-card"><Header icon={<Target/>} title={T.questionAccuracy}/>{data.type_accuracy.length ? <div className="sr-bars">{data.type_accuracy.map(item=><div key={item.type}><span>{TYPE_LABELS[item.type]?.[L]??item.type}</span><div><i style={{width:`${item.pct}%`}}/></div><b>{item.pct}%</b><small>{item.correct}/{item.total}</small></div>)}</div> : <Empty text={T.noPerformance}/>}</section>
      <section className="sr-card"><Header icon={<BarChart3/>} title={T.stages}/>{data.stage_breakdown.length ? <div className="sr-stages">{data.stage_breakdown.map((item,index)=><article key={`${item.title}-${index}`}><span>{index+1}</span><div><h3>{item.title}</h3><small>{item.modules_done} {T.modules}</small></div><strong>{item.avg_score??"—"}{item.avg_score!==null&&"%"}</strong></article>)}</div> : <Empty text={T.noPerformance}/>}</section>
    </div>}
    <style>{styles}</style>
  </main>;
}

function Header({icon,title,sub}:{icon:React.ReactNode;title:string;sub?:string}) { return <header className="sr-card-head"><span>{icon}</span><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div></header>; }
function Empty({text}:{text:string}) { return <div className="sr-empty"><Sparkles size={18}/><span>{text}</span></div>; }

const styles = `
.sr,.sr *{box-sizing:border-box}.sr{max-width:1240px;margin:0 auto;padding:18px 26px 70px;color:#32101A;font-family:'Cairo',sans-serif}.sr-back{display:inline-flex;align-items:center;gap:7px;margin-bottom:15px;color:#6B1E2D;font-size:12px;font-weight:900;text-decoration:none}.sr[dir=rtl] .sr-back svg{transform:scaleX(-1)}
.sr-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:24px;overflow:hidden;border-radius:26px;background:radial-gradient(circle at 10% 10%,rgba(217,201,176,.18),transparent 28%),linear-gradient(135deg,#32101A,#6B1E2D 72%,#4A0E1C);padding:25px 28px;color:#FFFBF5;box-shadow:0 20px 48px rgba(107,30,45,.18)}.sr-orbit{position:absolute;border:1px solid rgba(217,201,176,.12);border-radius:50%}.sr-orbit.one{width:220px;height:220px;inset-inline-end:-60px;top:-120px}.sr-orbit.two{width:130px;height:130px;inset-inline-end:40px;bottom:-90px}.sr-person{position:relative;z-index:1;display:flex;align-items:center;gap:17px;min-width:0}.sr-avatar{display:grid;width:74px;height:74px;flex:none;place-items:center;overflow:hidden;border:1px solid rgba(217,201,176,.32);border-radius:22px;background:rgba(217,201,176,.15);color:#F7F3EB;font-size:28px;font-weight:900}.sr-avatar img{width:100%;height:100%;object-fit:cover}.sr-eyebrow{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:10px;font-weight:900;letter-spacing:.08em}.sr-person h1{margin:4px 0 3px;font-size:27px;font-weight:900}.sr-person p{display:flex;align-items:center;gap:6px;margin:0;color:rgba(255,251,245,.7);font-size:11.5px;font-weight:700}.sr-score{position:relative;z-index:1;display:flex;min-width:150px;flex-direction:column;align-items:center;border:1px solid rgba(217,201,176,.2);border-radius:20px;background:rgba(107,30,45,.3);padding:12px 18px}.sr-score small,.sr-score span{color:#D9C9B0;font-size:9.5px;font-weight:800}.sr-score strong{font-size:30px;line-height:1.2}.sr-score i{font-size:13px;font-style:normal}
.sr-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.sr-metric{display:flex;align-items:center;gap:11px;border:1px solid rgba(107,30,45,.12);border-radius:17px;background:#FFFBF5;padding:12px 14px;box-shadow:0 8px 24px rgba(107,30,45,.045)}.sr-metric>span{display:grid;width:38px;height:38px;flex:none;place-items:center;border-radius:12px;background:#F7F3EB;color:#6B1E2D}.sr-metric svg{width:17px}.sr-metric div{display:flex;min-width:0;flex-direction:column}.sr-metric strong{font-size:20px}.sr-metric small{overflow:hidden;color:#796A62;font-size:9.5px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.sr-metric.accent{border-color:rgba(107,30,45,.3);background:linear-gradient(145deg,#FFFBF5,#F7F3EB)}.sr-metric.accent>span{background:#6B1E2D;color:#fff}
.sr-tabs{display:flex;gap:6px;margin:0 0 14px;border:1px solid rgba(107,30,45,.11);border-radius:16px;background:#F7F3EB;padding:5px}.sr-tabs button{display:flex;min-height:42px;flex:1;align-items:center;justify-content:center;gap:7px;border:0;border-radius:11px;background:transparent;color:#796A62;font:800 11.5px 'Cairo',sans-serif;cursor:pointer}.sr-tabs button.active{background:#FFFBF5;color:#6B1E2D;box-shadow:0 5px 15px rgba(107,30,45,.09)}.sr-tabs b{display:grid;min-width:20px;height:20px;place-items:center;border-radius:7px;background:#EFEAE0;font-size:9px}
.sr-view{display:flex;flex-direction:column;gap:14px}.sr-action{overflow:hidden;border:1px solid rgba(107,30,45,.18);border-radius:22px;background:linear-gradient(135deg,#6B1E2D,#4A0E1C);color:#fff}.sr-action.done{background:linear-gradient(135deg,#1B5E20,#32101A)}.sr-action-head{display:flex;align-items:center;gap:12px;padding:17px 19px}.sr-action-head>span{display:grid;width:43px;height:43px;flex:none;place-items:center;border-radius:13px;background:rgba(255,255,255,.12)}.sr-action-head>span svg{width:20px}.sr-action-head>div{flex:1}.sr-action h2{margin:0;font-size:16px}.sr-action p{margin:3px 0 0;color:rgba(255,255,255,.68);font-size:10.5px;line-height:1.65}.sr-action-head>b{display:grid;width:36px;height:36px;place-items:center;border-radius:12px;background:#D9C9B0;color:#4A0E1C;font-size:16px}.sr-action-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:rgba(255,255,255,.1)}.sr-action-grid article{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#FFFBF5;padding:13px 15px;color:#32101A}.sr-action-grid article>div{display:flex;min-width:0;flex-direction:column}.sr-action-grid small{color:#8F765B;font-size:9px;font-weight:900}.sr-action-grid strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.sr-action-grid time{display:flex;align-items:center;gap:4px;margin-top:3px;color:#796A62;font-size:9px}.sr-action-grid a,.sr-reading-head a{display:inline-flex;flex:none;align-items:center;gap:6px;border-radius:10px;background:#6B1E2D;padding:8px 11px;color:#fff;font-size:10px;font-weight:900;text-decoration:none}
.sr-card{border:1px solid rgba(107,30,45,.12);border-radius:22px;background:#FFFBF5;padding:18px;box-shadow:0 12px 32px rgba(107,30,45,.05)}.sr-card-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:15px}.sr-card-head>span{display:grid;width:35px;height:35px;flex:none;place-items:center;border-radius:11px;background:#F7F3EB;color:#6B1E2D}.sr-card-head svg{width:17px}.sr-card-head h2{margin:0;font-size:15px}.sr-card-head p{margin:2px 0 0;color:#796A62;font-size:10px;line-height:1.6}.sr-empty{display:flex;min-height:110px;align-items:center;justify-content:center;gap:8px;border:1px dashed rgba(107,30,45,.2);border-radius:15px;background:#F7F3EB;color:#796A62;font-size:11px;font-weight:800}
.sr-timeline>article{display:grid;grid-template-columns:24px 1fr}.sr-line{position:relative;display:flex;justify-content:center}.sr-line i{position:relative;z-index:1;width:12px;height:12px;margin-top:19px;border:3px solid #FFFBF5;border-radius:50%;background:#6B1E2D;box-shadow:0 0 0 1px #6B1E2D}.sr-line span{position:absolute;top:30px;bottom:-18px;width:1px;background:rgba(107,30,45,.18)}.sr-event{margin-bottom:10px;border:1px solid rgba(107,30,45,.11);border-radius:15px;background:#F7F3EB;padding:12px}.sr-event-top,.sr-event-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}.sr-event small{color:#8F765B;font-size:9px;font-weight:900}.sr-event h3{margin:1px 0 0;font-size:12.5px}.sr-attempt{display:flex;align-items:baseline;gap:4px}.sr-attempt b{font-size:17px}.sr-attempt span{color:#796A62;font-size:9px}.sr-event-foot{margin-top:9px;border-top:1px dashed rgba(107,30,45,.13);padding-top:8px}.sr-event time{color:#796A62;font-size:9px}.sr-event-foot a{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:900;text-decoration:none}.sr-event-foot .documented{color:#1B5E20}.sr-event-foot .pending{color:#6B1E2D}
.sr-readings{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.sr-readings>article{border:1px solid rgba(107,30,45,.12);border-radius:16px;background:#F7F3EB;padding:13px}.sr-reading-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.sr-reading-head small{color:#8F765B;font-size:9px;font-weight:900}.sr-reading-head h3{margin:1px 0;font-size:13px}.sr-reading-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;color:#796A62;font-size:9px}.sr-reading-meta span{display:flex;align-items:center;gap:4px}.sr-readings p{display:flex;flex-direction:column;gap:2px;margin:8px 0;border-radius:10px;background:#FFFBF5;padding:9px;color:#655B53;font-size:9.5px;line-height:1.6}.sr-readings p b{color:#32101A}.sr-traits{display:flex;flex-wrap:wrap;gap:5px}.sr-traits span{display:flex;align-items:center;gap:5px;border:1px solid rgba(107,30,45,.1);border-radius:8px;background:#FFFBF5;padding:5px 7px;font-size:9px;font-weight:800}.sr-traits i{width:7px;height:7px;border-radius:50%}.sr-traits b{color:#6B1E2D}
.sr-performance{display:grid;grid-template-columns:1fr 1fr}.sr-bars{display:flex;flex-direction:column;gap:12px}.sr-bars>div{display:grid;grid-template-columns:130px 1fr 42px 36px;align-items:center;gap:8px;font-size:10px}.sr-bars>div>span{font-weight:800}.sr-bars>div>div{height:8px;overflow:hidden;border-radius:99px;background:#D9C9B0}.sr-bars i{display:block;height:100%;border-radius:inherit;background:#6B1E2D}.sr-bars b{font-size:11px;text-align:end}.sr-bars small{color:#796A62}.sr-stages{display:flex;flex-direction:column;gap:8px}.sr-stages article{display:flex;align-items:center;gap:10px;border:1px solid rgba(107,30,45,.1);border-radius:13px;background:#F7F3EB;padding:10px}.sr-stages article>span{display:grid;width:30px;height:30px;place-items:center;border-radius:9px;background:#6B1E2D;color:#fff;font-size:10px;font-weight:900}.sr-stages article>div{flex:1}.sr-stages h3{margin:0;font-size:11px}.sr-stages small{color:#796A62;font-size:9px}.sr-stages strong{font-size:16px}
@media(max-width:780px){.sr{padding:14px 14px 55px}.sr-hero{align-items:flex-start;flex-direction:column}.sr-score{width:100%;align-items:flex-start}.sr-metrics{grid-template-columns:1fr 1fr}.sr-action-grid,.sr-readings,.sr-performance{grid-template-columns:1fr}.sr-bars>div{grid-template-columns:100px 1fr 38px}.sr-bars small{display:none}}
@media(max-width:520px){.sr-person h1{font-size:21px}.sr-avatar{width:58px;height:58px;border-radius:17px}.sr-metrics{grid-template-columns:1fr 1fr}.sr-metric{padding:10px}.sr-metric>span{width:33px;height:33px}.sr-tabs button{font-size:10px}.sr-tabs button svg{display:none}.sr-card{padding:13px}.sr-action-head{align-items:flex-start}.sr-action-grid article{align-items:flex-start;flex-direction:column}.sr-action-grid a{width:100%;justify-content:center}}
`;
