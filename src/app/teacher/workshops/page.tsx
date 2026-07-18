"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, Radio, Search } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import type { WorkshopDay } from "@/lib/workshops";

type Row={id:string;title:string;description:string|null;start_date:string|null;end_date:string|null;schedule:WorkshopDay[];attended:boolean;has_access:boolean;attendance_days:string[];status:string;is_live:boolean};
const liveCopy={ar:{live:"مباشرة الآن",liveHint:"الورشة منعقدة الآن — ادخل لمتابعة التفاصيل"},sq:{live:"Drejtpërdrejt",liveHint:"Forumi po zhvillohet tani — hap detajet"}} as const;
const text={ar:{title:"مسار الورش التدريبية",sub:"تابع الورش بالترتيب الزمني وافتح مواد الورش المرتبطة بحسابك.",search:"ابحث في الورش",all:"الكل",attended:"حضرتها",upcoming:"القادمة",empty:"لا توجد ورش مطابقة.",day:"يوم",training:"تدريب",rest:"راحة",contentOpen:"المحتوى متاح",contentLocked:"يتاح المحتوى بعد مسح QR الورشة",details:"عرض التفاصيل"},sq:{title:"Forumet",sub:"Ndiq forumet sipas radhës dhe hap materialet e lidhura me llogarinë tënde.",search:"Kërko",all:"Të gjitha",attended:"Pjesëmarrje",upcoming:"Të ardhshme",empty:"Nuk ka rezultate.",day:"ditë",training:"trajnim",rest:"pushim",contentOpen:"Materialet janë të hapura",contentLocked:"Materialet hapen pas skanimit të QR-së",details:"Shiko detajet"}} as const;
export default function TeacherWorkshops() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = text[L];
  const O = liveCopy[L];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("ALL");

  const loadWorkshops = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/teacher/workshops", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setRows(data.workshops ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(loadWorkshops);
    return () => cancelAnimationFrame(frame);
  }, [loadWorkshops]);

  const visible = useMemo(() => rows.filter((workshop) =>
    (!query || `${workshop.title} ${workshop.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) &&
    (mode === "ALL" || (mode === "ATTENDED" ? workshop.attended : new Date(workshop.end_date || workshop.start_date || 0) >= new Date())),
  ).sort((a,b)=>Number(b.is_live)-Number(a.is_live)), [rows, query, mode]);

  const fmt = (date: string | null) => date
    ? new Date(date).toLocaleDateString(L === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : "-";

  if (loadError) return <TeacherLoadError onRetry={loadWorkshops} />;

  return <div className="tw" dir={L === "ar" ? "rtl" : "ltr"}>
    <header><h1>{T.title}</h1><p>{T.sub}</p></header>
    <div className="tools">
      <label><Search size={17}/><input placeholder={T.search} value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <div>{[["ALL", T.all], ["ATTENDED", T.attended], ["UPCOMING", T.upcoming]].map((filter) =>
        <button className={mode === filter[0] ? "on" : ""} key={filter[0]} onClick={() => setMode(filter[0])}>{filter[1]}</button>)}</div>
    </div>
    {loading ? <MandalaLoader /> : visible.length === 0 ? <div className="empty">{T.empty}</div> : <div className="line">
      {visible.map((workshop, index) => {
        const workDays = workshop.schedule.filter((day) => day.type === "WORK").length;
        const restDays = workshop.schedule.length - workDays;
        return <div className={`item${workshop.is_live?" live":""}`} key={workshop.id}>
          <div className="marker"><span>{index + 1}</span></div>
          <Link href={`/teacher/workshops/${workshop.id}`}>
            <div className="top">
              <span><CalendarDays size={15}/>{fmt(workshop.start_date)}{workshop.end_date && workshop.end_date !== workshop.start_date ? ` - ${fmt(workshop.end_date)}` : ""}</span>
              <div className="top-badges">{workshop.is_live&&<b className="live-badge"><Radio size={14}/>{O.live}</b>}{workshop.has_access ? <b className="open"><CheckCircle2 size={14}/>{T.contentOpen}</b> : <b><LockKeyhole size={14}/>{T.contentLocked}</b>}</div>
            </div>
            <h2>{workshop.title}</h2>{workshop.description && <p>{workshop.description}</p>}
            {workshop.is_live&&<div className="live-hint">{O.liveHint}</div>}
            <div className="meta"><Clock3 size={14}/>{workDays} {T.day} {T.training}{restDays ? ` · ${restDays} ${T.rest}` : ""}</div>
            <strong className="more">{T.details}</strong>
          </Link>
        </div>;
      })}
    </div>}
    <style>{css}</style>
  </div>;
}
const css=`.tw{font-family:'Cairo',sans-serif;color:#32101A;max-width:1100px;margin:auto}.tw header h1{font-size:27px;margin:0 0 5px}.tw header p{margin:0;color:#655B53}.tools{display:flex;justify-content:space-between;gap:10px;margin:18px 0 22px;padding:12px;border:1px solid #E5E0D5;border-radius:14px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB)}.tools label{display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #D9C9B0;padding:0 10px;min-width:280px;border-radius:9px}.tools input{border:0;outline:0;padding:10px 0;font:inherit;width:100%}.tools>div{display:flex}.tools button{border:1px solid #D9C9B0;background:#fff;padding:8px 13px;font:inherit;font-size:12px;font-weight:800}.tools button:first-child{border-radius:0 9px 9px 0}.tools button:last-child{border-radius:9px 0 0 9px}.tools button.on{background:#32101A;color:#D9C9B0}.item{display:grid;grid-template-columns:50px 1fr;min-height:175px}.marker{display:flex;justify-content:center;position:relative}.marker:after{content:'';position:absolute;top:36px;bottom:0;width:2px;background:#B8A082}.item:last-child .marker:after{display:none}.marker span{z-index:1;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#32101A;color:#D9C9B0;border:4px solid #EFEAE0;font-weight:900}.item.live .marker span{background:#6B1E2D;box-shadow:0 0 0 5px rgba(107,30,45,.12)}.item>a{color:inherit;text-decoration:none;background:linear-gradient(145deg,#FFFBF5,#F7F3EB);border:1px solid #D9C9B0;padding:19px 21px;margin-bottom:14px;border-radius:16px;box-shadow:0 8px 24px rgba(107,30,45,.04);transition:.2s}.item.live>a{border-color:#6B1E2D;box-shadow:0 14px 34px rgba(107,30,45,.11)}.item>a:hover{transform:translateY(-2px);border-color:#6B1E2D;box-shadow:0 14px 34px rgba(107,30,45,.12)}.top{display:flex;justify-content:space-between;gap:10px}.top>span,.top b,.meta{display:flex;align-items:center;gap:6px;font-size:11px;color:#6B1E2D}.top-badges{display:flex;gap:6px;flex-wrap:wrap}.top b{background:#EFEAE0;padding:5px 8px;border-radius:999px}.top b.open{background:#EFEAE0;color:#1B5E20}.top b.live-badge{background:#6B1E2D;color:#fff}.top b.live-badge svg{animation:livePulse 1.4s infinite}.item h2{font-size:19px;margin:9px 0 4px}.item p{font-size:13px;color:#655B53;margin:0}.live-hint{margin-top:10px;padding:8px 10px;background:rgba(107,30,45,.07);border-inline-start:3px solid #6B1E2D;color:#6B1E2D;font-size:11px;font-weight:800}.meta{margin-top:12px;padding-top:9px;border-top:1px solid #E5E0D5}.more{display:block;margin-top:9px;font-size:12px;color:#6B1E2D}.empty{text-align:center;padding:60px;border:1px dashed #D9C9B0;background:#fff;border-radius:16px}@keyframes livePulse{50%{opacity:.35;transform:scale(.88)}}@media(max-width:650px){.tools{flex-direction:column}.tools label{min-width:0}.tools>div{overflow:auto}.item{grid-template-columns:38px 1fr}.item>a{padding:15px}.top{align-items:flex-start;flex-direction:column}.top-badges{width:100%}.top b{font-size:10px}}`;
