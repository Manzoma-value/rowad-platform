"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, Search } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import type { WorkshopDay } from "@/lib/workshops";

type Row={id:string;title:string;description:string|null;start_date:string|null;end_date:string|null;schedule:WorkshopDay[];attended:boolean;attendance_days:string[];status:string};
const text={ar:{title:"مسار الورش التدريبية",sub:"تابع الورش بالترتيب الزمني وافتح مواد الورش التي حضرتها.",search:"ابحث في الورش",all:"الكل",attended:"حضرتها",upcoming:"القادمة",empty:"لا توجد ورش مطابقة.",day:"يوم",training:"تدريب",rest:"راحة",contentOpen:"المحتوى متاح",contentLocked:"يتاح المحتوى بعد تسجيل الحضور",details:"عرض التفاصيل"},sq:{title:"Rrjedha e punëtorive",sub:"Ndiq punëtoritë sipas radhës dhe hap materialet e atyre ku ke marrë pjesë.",search:"Kërko",all:"Të gjitha",attended:"Pjesëmarrje",upcoming:"Të ardhshme",empty:"Nuk ka rezultate.",day:"ditë",training:"trajnim",rest:"pushim",contentOpen:"Materialet janë të hapura",contentLocked:"Materialet hapen pas regjistrimit të pranisë",details:"Shiko detajet"}} as const;
export default function TeacherWorkshops() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = text[L];
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
  ), [rows, query, mode]);

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
        return <div className="item" key={workshop.id}>
          <div className="marker"><span>{index + 1}</span></div>
          <Link href={`/teacher/workshops/${workshop.id}`}>
            <div className="top">
              <span><CalendarDays size={15}/>{fmt(workshop.start_date)}{workshop.end_date && workshop.end_date !== workshop.start_date ? ` - ${fmt(workshop.end_date)}` : ""}</span>
              {workshop.attended ? <b className="open"><CheckCircle2 size={14}/>{T.contentOpen}</b> : <b><LockKeyhole size={14}/>{T.contentLocked}</b>}
            </div>
            <h2>{workshop.title}</h2>{workshop.description && <p>{workshop.description}</p>}
            <div className="meta"><Clock3 size={14}/>{workDays} {T.day} {T.training}{restDays ? ` · ${restDays} ${T.rest}` : ""}</div>
            <strong className="more">{T.details}</strong>
          </Link>
        </div>;
      })}
    </div>}
    <style>{css}</style>
  </div>;
}
const css=`.tw{font-family:'Cairo',sans-serif;color:#32101A;max-width:1100px;margin:auto}.tw header h1{font-size:27px;margin:0 0 5px}.tw header p{margin:0;color:#655B53}.tools{display:flex;justify-content:space-between;gap:10px;margin:18px 0 22px}.tools label{display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #D9C9B0;padding:0 10px;min-width:280px}.tools input{border:0;outline:0;padding:10px 0;font:inherit;width:100%}.tools>div{display:flex}.tools button{border:1px solid #D9C9B0;background:#fff;padding:8px 13px;font:inherit;font-size:12px;font-weight:800}.tools button.on{background:#32101A;color:#D9C9B0}.item{display:grid;grid-template-columns:50px 1fr;min-height:175px}.marker{display:flex;justify-content:center;position:relative}.marker:after{content:'';position:absolute;top:36px;bottom:0;width:2px;background:#B8A082}.item:last-child .marker:after{display:none}.marker span{z-index:1;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#32101A;color:#D9C9B0;border:4px solid #EFEAE0;font-weight:900}.item>a{color:inherit;text-decoration:none;background:#FFFBF5;border:1px solid #D9C9B0;padding:18px 20px;margin-bottom:14px;border-radius:8px}.item>a:hover{border-color:#6B1E2D;box-shadow:0 8px 24px rgba(107,30,45,.1)}.top{display:flex;justify-content:space-between;gap:10px}.top span,.top b,.meta{display:flex;align-items:center;gap:6px;font-size:11px;color:#6B1E2D}.top b{background:#EFEAE0;padding:5px 8px}.top b.open{background:#EFEAE0;color:#1B5E20}.item h2{font-size:19px;margin:9px 0 4px}.item p{font-size:13px;color:#655B53;margin:0}.meta{margin-top:12px;padding-top:9px;border-top:1px solid #E5E0D5}.more{display:block;margin-top:9px;font-size:12px;color:#6B1E2D}.empty{text-align:center;padding:60px;border:1px dashed #D9C9B0;background:#fff}@media(max-width:650px){.tools{flex-direction:column}.tools label{min-width:0}.tools>div{overflow:auto}.item{grid-template-columns:38px 1fr}.item>a{padding:14px}.top{align-items:flex-start;flex-direction:column}}`;
