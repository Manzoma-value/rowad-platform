"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, BookOpenCheck, CheckCircle2, ChevronDown,
  CircleUserRound, Clock3, GraduationCap, ListFilter, Radar, Search,
  Sparkles, Target, TrendingUp, Users,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { cachedFetch } from "@/lib/api-cache";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";

type Lang = "ar" | "sq";
type Filter = "all" | "pending" | "not_started";
interface StudentSummary {
  id:string; full_name:string; avatar_url:string|null; attempts_count:number; passed_count:number;
  avg_score:number|null; trait_assessments_count:number; pending_trait_assessments:number; latest_activity_at:string|null;
}
interface ClassData {
  id:string; name:string; student_count:number; total_attempts:number; avg_score:number|null;
  score_distribution:number[]; pending_trait_assessments:number; students:StudentSummary[];
}

const COPY = {
  ar: {
    loading:"جارٍ تجهيز لوحة التقارير…", eyebrow:"مركز المتابعة والتقييم", title:"أداء المستفيدين", subtitle:"تابع رحلة كل مستفيد، أنجز قراءات السمات المعلّقة، وافتح ملفه الكامل من مكان واحد.",
    class:"المجموعة التعليمية", beneficiaries:"المستفيدون", attempts:"محاولات التعلم", average:"متوسط الأداء", pending:"قراءات معلّقة", completed:"قراءات موثقة",
    queue:"أولوية التقييم", queueSub:"هؤلاء المستفيدون لديهم مفاهيم مكتملة تنتظر قراءة سماتك.", startRating:"ابدأ التقييم", allCaught:"رائع! لا توجد قراءات معلّقة في هذه المجموعة.",
    directory:"ملفات المستفيدين", directorySub:"ابحث وافتح الملف الكامل أو ابدأ القراءة مباشرة.", search:"ابحث باسم المستفيد…", all:"الكل", needsRating:"بانتظار التقييم", notStarted:"لم يبدأ بعد", showing:(n:number)=>`${n} مستفيد`, noResults:"لا توجد نتائج مطابقة.",
    attempt:"محاولة", passed:"ناجحة", traits:"قراءة", noActivity:"لم يبدأ رحلة التعلم بعد", profile:"عرض الملف", rate:"تقييم الآن", lastActivity:"آخر نشاط", readiness:"اكتمال التوثيق", score:"متوسط النتيجة",
  },
  sq: {
    loading:"Po përgatitet paneli i raporteve…", eyebrow:"Qendra e ndjekjes dhe vlerësimit", title:"Performanca e Pjesëmarrësve", subtitle:"Ndiq rrugën e secilit pjesëmarrës, përfundo leximet në pritje dhe hap profilin e plotë nga një vend.",
    class:"Grupi mësimor", beneficiaries:"Pjesëmarrës", attempts:"Përpjekje mësimore", average:"Mesatarja", pending:"Lexime në pritje", completed:"Lexime të dokumentuara",
    queue:"Prioriteti i vlerësimit", queueSub:"Këta pjesëmarrës kanë koncepte të përfunduara që presin leximin tënd.", startRating:"Fillo vlerësimin", allCaught:"Shkëlqyeshëm! Nuk ka lexime në pritje në këtë grup.",
    directory:"Profilet e pjesëmarrësve", directorySub:"Kërko dhe hap profilin e plotë ose nis menjëherë leximin.", search:"Kërko me emër…", all:"Të gjithë", needsRating:"Pret vlerësim", notStarted:"Nuk ka filluar", showing:(n:number)=>`${n} pjesëmarrës`, noResults:"Nuk ka rezultate që përputhen.",
    attempt:"përpjekje", passed:"të kaluara", traits:"lexime", noActivity:"Nuk e ka filluar ende rrugën", profile:"Shiko profilin", rate:"Vlerëso tani", lastActivity:"Aktiviteti i fundit", readiness:"Dokumentimi", score:"Rezultati mesatar",
  },
} as const;

function dateLabel(value:string|null,lang:Lang) {
  if(!value) return "—";
  return new Date(value).toLocaleDateString(lang==="ar"?"ar-SA-u-nu-latn":"sq-AL",{day:"numeric",month:"short"});
}

function ScoreRing({value,size=56}:{value:number|null;size?:number}) {
  const pct = value ?? 0; const radius=(size-8)/2; const circumference=2*Math.PI*radius;
  return <div className={`rr-ring ${value===null?"empty":""}`} style={{width:size,height:size}}><svg width={size} height={size}><circle cx={size/2} cy={size/2} r={radius}/><circle className="value" cx={size/2} cy={size/2} r={radius} strokeDasharray={circumference} strokeDashoffset={circumference-(pct/100)*circumference}/></svg><strong>{value===null?"—":`${value}%`}</strong></div>;
}

function Metric({icon,value,label,accent=false}:{icon:React.ReactNode;value:string|number;label:string;accent?:boolean}) {
  return <article className={`rr-metric ${accent?"accent":""}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

export default function TeacherReportsPage() {
  const router=useRouter(); const {lang}=useLang(); const L:Lang=lang==="ar"?"ar":"sq"; const T=COPY[L];
  const [classes,setClasses]=useState<ClassData[]>([]); const [selectedId,setSelectedId]=useState("");
  const [loading,setLoading]=useState(true); const [failed,setFailed]=useState(false); const [query,setQuery]=useState(""); const [filter,setFilter]=useState<Filter>("all");

  useEffect(()=>{cachedFetch<{classes:ClassData[]}>("/api/teacher/reports",60_000).then(payload=>{const rows=payload.classes??[];setClasses(rows);setSelectedId(rows[0]?.id??"");}).catch(()=>setFailed(true)).finally(()=>setLoading(false));},[]);
  const selected=classes.find(item=>item.id===selectedId)??classes[0]??null;
  const pendingStudents=useMemo(()=>selected?.students.filter(student=>student.pending_trait_assessments>0).sort((a,b)=>b.pending_trait_assessments-a.pending_trait_assessments)??[],[selected]);
  const documented=selected?.students.reduce((sum,student)=>sum+student.trait_assessments_count,0)??0;
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase();
    return (selected?.students??[]).filter(student=>(!needle||student.full_name.toLocaleLowerCase().includes(needle))&&(filter==="all"||filter==="pending"&&student.pending_trait_assessments>0||filter==="not_started"&&student.attempts_count===0)).sort((a,b)=>b.pending_trait_assessments-a.pending_trait_assessments||b.attempts_count-a.attempts_count||a.full_name.localeCompare(b.full_name));
  },[selected,query,filter]);

  if(loading) return <MandalaLoader/>;
  if(failed) return <TeacherLoadError onRetry={()=>window.location.reload()}/>;
  return <main className="rr" dir={L==="ar"?"rtl":"ltr"}>
    <header className="rr-hero"><div className="rr-orbit a"/><div className="rr-orbit b"/><div className="rr-hero-copy"><span><Sparkles size={13}/>{T.eyebrow}</span><h1>{T.title}</h1><p>{T.subtitle}</p></div>{selected&&<div className="rr-hero-focus"><small>{T.class}</small><strong>{selected.name}</strong><span><Users size={13}/>{selected.student_count} {T.beneficiaries}</span></div>}</header>

    {classes.length===0 ? <section className="rr-empty"><CircleUserRound size={34}/><p>{L==="ar"?"لا توجد مجموعات تعليمية مسندة لك بعد.":"Nuk ke ende grupe mësimore të caktuara."}</p></section> : <>
      <section className="rr-classbar"><div><GraduationCap size={16}/><span>{T.class}</span></div><label><select value={selected?.id??""} onChange={event=>{setSelectedId(event.target.value);setQuery("");setFilter("all");}}>{classes.map(item=><option key={item.id} value={item.id}>{item.name} · {item.student_count}</option>)}</select><ChevronDown size={15}/></label>{classes.map(item=><button key={item.id} className={item.id===selected?.id?"active":""} onClick={()=>{setSelectedId(item.id);setQuery("");setFilter("all");}}><span>{item.name}</span><b>{item.student_count}</b>{item.pending_trait_assessments>0&&<i>{item.pending_trait_assessments}</i>}</button>)}</section>

      {selected&&<>
        <section className="rr-metrics"><Metric icon={<Users/>} value={selected.student_count} label={T.beneficiaries}/><Metric icon={<BookOpenCheck/>} value={selected.total_attempts} label={T.attempts}/><Metric icon={<TrendingUp/>} value={selected.avg_score===null?"—":`${selected.avg_score}%`} label={T.average}/><Metric icon={<Clock3/>} value={selected.pending_trait_assessments} label={T.pending} accent={selected.pending_trait_assessments>0}/><Metric icon={<CheckCircle2/>} value={documented} label={T.completed}/></section>

        <section className={`rr-queue ${pendingStudents.length?"":"clear"}`}><header><span><Target/></span><div><h2>{pendingStudents.length?T.queue:T.allCaught}</h2><p>{pendingStudents.length?T.queueSub:T.directorySub}</p></div>{pendingStudents.length>0&&<b>{pendingStudents.length}</b>}</header>{pendingStudents.length>0&&<div className="rr-queue-list">{pendingStudents.slice(0,6).map(student=><button key={student.id} onClick={()=>router.push(`/teacher/reports/students/${student.id}`)}><Avatar student={student}/><div><strong>{student.full_name}</strong><span>{student.pending_trait_assessments} {T.pending}</span></div><em>{T.startRating}<ArrowUpRight size={14}/></em></button>)}</div>}</section>

        <section className="rr-directory"><header className="rr-section-head"><div><span><Radar/></span><div><h2>{T.directory}</h2><p>{T.directorySub}</p></div></div><b>{T.showing(visible.length)}</b></header>
          <div className="rr-tools"><label><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={T.search}/></label><div><ListFilter size={15}/>{(["all","pending","not_started"] as Filter[]).map(key=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{key==="all"?T.all:key==="pending"?T.needsRating:T.notStarted}</button>)}</div></div>
          {visible.length?<div className="rr-grid">{visible.map((student,index)=><article className="rr-card" key={student.id} style={{animationDelay:`${index*28}ms`}}>
            <div className="rr-card-top"><Avatar student={student}/><div><h3>{student.full_name}</h3><span>{student.attempts_count?`${dateLabel(student.latest_activity_at,L)} · ${T.lastActivity}`:T.noActivity}</span></div>{student.pending_trait_assessments>0&&<b><Clock3 size={11}/>{student.pending_trait_assessments}</b>}</div>
            <div className="rr-card-main"><ScoreRing value={student.avg_score}/><div className="rr-mini"><span><BookOpenCheck size={13}/><b>{student.attempts_count}</b>{T.attempt}</span><span><CheckCircle2 size={13}/><b>{student.passed_count}</b>{T.passed}</span><span><Radar size={13}/><b>{student.trait_assessments_count}</b>{T.traits}</span></div></div>
            <div className="rr-coverage"><div><span>{T.readiness}</span><b>{student.attempts_count?Math.min(100,Math.round(student.trait_assessments_count/student.attempts_count*100)):0}%</b></div><i><span style={{width:`${student.attempts_count?Math.min(100,student.trait_assessments_count/student.attempts_count*100):0}%`}}/></i></div>
            <footer><button onClick={()=>router.push(`/teacher/reports/students/${student.id}`)} className={student.pending_trait_assessments>0?"primary":""}>{student.pending_trait_assessments>0?<><Target size={14}/>{T.rate}</>:<><CircleUserRound size={14}/>{T.profile}</>}<ArrowUpRight size={14}/></button></footer>
          </article>)}</div>:<div className="rr-no-results"><Search size={20}/>{T.noResults}</div>}
        </section>
      </>}
    </>}
    <style>{styles}</style>
  </main>;
}

function Avatar({student}:{student:StudentSummary}) { return <span className="rr-avatar">{student.avatar_url?<Image src={student.avatar_url} alt={student.full_name} width={48} height={48}/>:student.full_name.trim().charAt(0).toUpperCase()}</span>; }

const styles=`
.rr,.rr *{box-sizing:border-box}.rr{max-width:1280px;margin:0 auto;padding:20px 28px 75px;color:#32101A;font-family:'Cairo',sans-serif}.rr-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:22px;overflow:hidden;border-radius:27px;background:radial-gradient(circle at 8% 0,rgba(217,201,176,.19),transparent 30%),linear-gradient(135deg,#32101A,#6B1E2D 70%,#4A0E1C);padding:27px 30px;color:#FFFBF5;box-shadow:0 22px 50px rgba(107,30,45,.18)}.rr-orbit{position:absolute;border:1px solid rgba(217,201,176,.12);border-radius:50%}.rr-orbit.a{width:240px;height:240px;inset-inline-end:-70px;top:-130px}.rr-orbit.b{width:130px;height:130px;inset-inline-end:70px;bottom:-95px}.rr-hero-copy{position:relative;z-index:1}.rr-hero-copy>span{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:9.5px;font-weight:900;letter-spacing:.1em}.rr-hero h1{margin:4px 0 5px;font-size:28px;font-weight:900}.rr-hero p{max-width:680px;margin:0;color:rgba(255,251,245,.68);font-size:11.5px;font-weight:700;line-height:1.75}.rr-hero-focus{position:relative;z-index:1;display:flex;min-width:190px;flex-direction:column;border:1px solid rgba(217,201,176,.2);border-radius:18px;background:rgba(107,30,45,.28);padding:12px 15px}.rr-hero-focus small{color:#D9C9B0;font-size:9px;font-weight:900}.rr-hero-focus strong{font-size:15px}.rr-hero-focus span{display:flex;align-items:center;gap:5px;margin-top:3px;color:rgba(255,251,245,.65);font-size:9.5px}
.rr-classbar{display:flex;align-items:center;gap:7px;margin:14px 0;overflow-x:auto;border:1px solid rgba(107,30,45,.1);border-radius:16px;background:#F7F3EB;padding:6px}.rr-classbar>div{display:flex;align-items:center;gap:6px;padding:0 8px;color:#8F765B;font-size:9px;font-weight:900;white-space:nowrap}.rr-classbar label{position:relative;display:none}.rr-classbar select{width:100%;appearance:none;border:0;border-radius:10px;background:#FFFBF5;padding:10px 34px 10px 12px;color:#32101A;font:800 11px 'Cairo',sans-serif}.rr-classbar label svg{position:absolute;inset-inline-end:10px;top:12px;pointer-events:none}.rr-classbar button{position:relative;display:flex;align-items:center;gap:7px;flex:none;border:0;border-radius:10px;background:transparent;padding:9px 11px;color:#796A62;font:800 10.5px 'Cairo',sans-serif;cursor:pointer}.rr-classbar button.active{background:#FFFBF5;color:#6B1E2D;box-shadow:0 5px 14px rgba(107,30,45,.08)}.rr-classbar button b{display:grid;min-width:20px;height:20px;place-items:center;border-radius:7px;background:#EFEAE0;font-size:9px}.rr-classbar button i{display:grid;min-width:18px;height:18px;place-items:center;border-radius:7px;background:#6B1E2D;color:#fff;font-size:8px;font-style:normal}
.rr-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-bottom:14px}.rr-metric{display:flex;align-items:center;gap:10px;border:1px solid rgba(107,30,45,.11);border-radius:16px;background:#FFFBF5;padding:11px 12px;box-shadow:0 7px 22px rgba(107,30,45,.04)}.rr-metric>span{display:grid;width:36px;height:36px;flex:none;place-items:center;border-radius:11px;background:#F7F3EB;color:#6B1E2D}.rr-metric svg{width:16px}.rr-metric div{display:flex;min-width:0;flex-direction:column}.rr-metric strong{font-size:18px;line-height:1.1}.rr-metric small{overflow:hidden;color:#796A62;font-size:8.5px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.rr-metric.accent{border-color:rgba(107,30,45,.3);background:linear-gradient(145deg,#FFFBF5,#F7F3EB)}.rr-metric.accent>span{background:#6B1E2D;color:#fff}
.rr-queue{overflow:hidden;margin-bottom:14px;border:1px solid rgba(107,30,45,.17);border-radius:21px;background:linear-gradient(135deg,#6B1E2D,#4A0E1C);color:#fff}.rr-queue.clear{background:linear-gradient(135deg,#1B5E20,#32101A)}.rr-queue>header{display:flex;align-items:center;gap:11px;padding:15px 17px}.rr-queue>header>span{display:grid;width:39px;height:39px;flex:none;place-items:center;border-radius:12px;background:rgba(255,255,255,.11)}.rr-queue>header svg{width:18px}.rr-queue>header>div{flex:1}.rr-queue h2{margin:0;font-size:14px}.rr-queue p{margin:2px 0 0;color:rgba(255,255,255,.65);font-size:9.5px}.rr-queue>header>b{display:grid;width:32px;height:32px;place-items:center;border-radius:10px;background:#D9C9B0;color:#4A0E1C;font-size:14px}.rr-queue-list{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.1)}.rr-queue-list button{display:flex;align-items:center;gap:9px;border:0;background:#FFFBF5;padding:10px 12px;color:#32101A;font-family:'Cairo',sans-serif;text-align:start;cursor:pointer}.rr-queue-list button:hover{background:#F7F3EB}.rr-queue-list .rr-avatar{width:36px;height:36px;border-radius:10px;font-size:13px}.rr-queue-list button>div{display:flex;min-width:0;flex:1;flex-direction:column}.rr-queue-list strong{overflow:hidden;font-size:10.5px;text-overflow:ellipsis;white-space:nowrap}.rr-queue-list span:not(.rr-avatar){color:#8F765B;font-size:8.5px;font-weight:800}.rr-queue-list em{display:flex;align-items:center;gap:4px;color:#6B1E2D;font-size:8.5px;font-style:normal;font-weight:900;white-space:nowrap}
.rr-directory{border:1px solid rgba(107,30,45,.11);border-radius:22px;background:#FFFBF5;padding:17px;box-shadow:0 12px 34px rgba(107,30,45,.05)}.rr-section-head,.rr-section-head>div{display:flex;align-items:center;gap:10px}.rr-section-head{justify-content:space-between}.rr-section-head>div>span{display:grid;width:36px;height:36px;place-items:center;border-radius:11px;background:#F7F3EB;color:#6B1E2D}.rr-section-head svg{width:17px}.rr-section-head h2{margin:0;font-size:15px}.rr-section-head p{margin:1px 0 0;color:#796A62;font-size:9.5px}.rr-section-head>b{border-radius:9px;background:#F7F3EB;padding:5px 8px;color:#8F765B;font-size:9px}.rr-tools{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0}.rr-tools>label{display:flex;min-width:230px;flex:1;align-items:center;gap:7px;border:1px solid rgba(107,30,45,.14);border-radius:12px;background:#F7F3EB;padding:0 11px;color:#8F765B}.rr-tools input{width:100%;height:40px;border:0;background:transparent;color:#32101A;font:800 10.5px 'Cairo',sans-serif;outline:none}.rr-tools>div{display:flex;align-items:center;gap:4px;color:#8F765B}.rr-tools button{border:0;border-radius:9px;background:#F7F3EB;padding:8px 10px;color:#796A62;font:800 9px 'Cairo',sans-serif;cursor:pointer}.rr-tools button.active{background:#6B1E2D;color:#fff}
.rr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}@keyframes rr-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.rr-card{overflow:hidden;border:1px solid rgba(107,30,45,.11);border-radius:17px;background:linear-gradient(160deg,#FFFBF5,#F7F3EB);padding:13px;animation:rr-in .28s ease both;transition:.18s}.rr-card:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.28);box-shadow:0 12px 28px rgba(107,30,45,.09)}.rr-card-top{display:flex;align-items:center;gap:9px}.rr-avatar{display:grid;width:46px;height:46px;flex:none;place-items:center;overflow:hidden;border:1px solid rgba(217,201,176,.25);border-radius:13px;background:#32101A;color:#D9C9B0;font-size:17px;font-weight:900}.rr-avatar img{width:100%;height:100%;object-fit:cover}.rr-card-top>div{display:flex;min-width:0;flex:1;flex-direction:column}.rr-card h3{overflow:hidden;margin:0;font-size:12.5px;text-overflow:ellipsis;white-space:nowrap}.rr-card-top div>span{margin-top:1px;color:#796A62;font-size:8.5px}.rr-card-top>b{display:flex;align-items:center;gap:3px;border-radius:8px;background:#6B1E2D;padding:4px 6px;color:#fff;font-size:8.5px}.rr-card-main{display:flex;align-items:center;gap:12px;margin:12px 0}.rr-ring{position:relative;display:grid;flex:none;place-items:center}.rr-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}.rr-ring circle{fill:none;stroke:#D9C9B0;stroke-width:5}.rr-ring circle.value{stroke:#6B1E2D;stroke-linecap:round}.rr-ring strong{font-size:10px}.rr-ring.empty strong{color:#8F765B}.rr-mini{display:grid;grid-template-columns:repeat(3,1fr);flex:1;gap:5px}.rr-mini span{display:flex;min-width:0;flex-direction:column;align-items:center;gap:1px;border-radius:9px;background:#FFFBF5;padding:6px 3px;color:#796A62;font-size:7.5px}.rr-mini svg{width:12px;color:#8F765B}.rr-mini b{color:#32101A;font-size:11px}.rr-coverage>div{display:flex;align-items:center;justify-content:space-between;color:#796A62;font-size:8.5px;font-weight:800}.rr-coverage>div b{color:#6B1E2D}.rr-coverage>i{display:block;height:6px;margin-top:5px;overflow:hidden;border-radius:99px;background:#D9C9B0}.rr-coverage>i span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8F765B,#6B1E2D)}.rr-card footer{margin-top:11px;border-top:1px dashed rgba(107,30,45,.13);padding-top:9px}.rr-card footer button{display:flex;width:100%;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(107,30,45,.15);border-radius:10px;background:#FFFBF5;padding:8px;color:#6B1E2D;font:900 9.5px 'Cairo',sans-serif;cursor:pointer}.rr-card footer button svg:last-child{margin-inline-start:auto}.rr-card footer button.primary{border-color:#6B1E2D;background:#6B1E2D;color:#fff}.rr-no-results{display:flex;min-height:130px;align-items:center;justify-content:center;gap:8px;border:1px dashed rgba(107,30,45,.18);border-radius:14px;background:#F7F3EB;color:#796A62;font-size:10px;font-weight:800}.rr-empty{display:flex;min-height:260px;flex-direction:column;align-items:center;justify-content:center;gap:10px;margin-top:14px;border:1px dashed rgba(107,30,45,.2);border-radius:20px;background:#FFFBF5;color:#796A62}.rr-empty p{font-size:11px;font-weight:800}
@media(max-width:980px){.rr-metrics{grid-template-columns:repeat(3,1fr)}.rr-queue-list{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.rr{padding:14px 13px 60px}.rr-hero{align-items:flex-start;flex-direction:column;padding:23px 20px}.rr-hero h1{font-size:23px}.rr-hero-focus{width:100%}.rr-classbar>div,.rr-classbar>button{display:none}.rr-classbar label{display:block;flex:1}.rr-metrics{grid-template-columns:1fr 1fr}.rr-queue-list{grid-template-columns:1fr}.rr-tools{align-items:stretch;flex-direction:column}.rr-tools>label{min-width:0}.rr-tools>div{overflow-x:auto}.rr-section-head{align-items:flex-start}.rr-section-head>b{display:none}}@media(max-width:460px){.rr-metrics{grid-template-columns:1fr 1fr}.rr-metric{padding:9px}.rr-metric>span{width:32px;height:32px}.rr-grid{grid-template-columns:1fr}.rr-directory{padding:12px}.rr-queue-list em{display:none}}
`;
