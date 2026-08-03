"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, BarChart3, BookOpen, Building2, Download, GraduationCap, RefreshCw, ShieldCheck } from "lucide-react";

type Tab = "schools" | "teachers" | "classes" | "admins" | "performance";
type Row = Record<string, unknown>;
type DataRoom = { generatedAt: string; schools: Row[]; teachers: Row[]; classes: Row[]; admins: Row[]; performance: Row[] };

const tabs: Array<{ id: Tab; label: string; sub: string; icon: typeof Building2 }> = [
  { id: "schools", label: "الجهات", sub: "Schools", icon: Building2 },
  { id: "teachers", label: "المعلمون", sub: "Teachers", icon: GraduationCap },
  { id: "classes", label: "الفصول", sub: "Classes", icon: BookOpen },
  { id: "admins", label: "المدراء", sub: "Admins", icon: ShieldCheck },
  { id: "performance", label: "الأداء", sub: "Performance", icon: BarChart3 },
];

const get = (row: Row, path: string) => path.split(".").reduce<unknown>((value, key) => (value as Row | undefined)?.[key], row);
const text = (value: unknown) => String(value ?? "");
const csvCell = (value: unknown) => `"${text(value).replaceAll('"', '""')}"`;

export default function OwnerDataRoomPage() {
  const [data, setData] = useState<DataRoom | null>(null);
  const [tab, setTab] = useState<Tab>("schools");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setData(await fetch("/api/owner/data", { cache: "no-store" }).then((r) => r.json())); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const source = data?.[tab] ?? [];
    if (!query.trim()) return source;
    const q = query.trim().toLowerCase();
    return source.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [data, tab, query]);

  function exportCurrent() {
    if (!rows.length) return;
    const headers: Record<Tab, string[]> = {
      schools: ["ID", "Name", "Slug", "Language", "Active", "Teachers", "Students", "Classes", "Admins"],
      teachers: ["ID", "Name", "Email", "School", "Status", "Active", "Classes", "Ratings received", "Qualification vote"],
      classes: ["ID", "Class", "School", "Teacher", "Students", "Assessments", "Quizzes", "Lessons"],
      admins: ["ID", "Name", "Email", "School", "Active", "Joined"],
      performance: ["ID", "School", "Teacher groups", "Group assessments", "Assessment attempts", "Qualification votes", "Average score"],
    };
    const values: Record<Tab, (row: Row) => unknown[]> = {
      schools: (x) => [x.id, x.name, x.slug, x.language, x.is_active, get(x, "_count.teachers"), get(x, "_count.students"), get(x, "_count.classes"), get(x, "_count.admins")],
      teachers: (x) => [x.id, get(x, "profile.full_name"), get(x, "profile.email"), get(x, "school.name"), x.onboarding_status, get(x, "profile.is_active"), get(x, "_count.classes"), get(x, "_count.ratings_received"), get(x, "_count.future_qualification_vote")],
      classes: (x) => [x.id, x.name, get(x, "school.name"), get(x, "teacher.profile.full_name"), get(x, "_count.students"), get(x, "_count.assessmentAttempts"), get(x, "_count.quizzes"), get(x, "_count.lessons")],
      admins: (x) => [get(x, "profile.id"), get(x, "profile.full_name"), get(x, "profile.email"), get(x, "school.name"), get(x, "profile.is_active"), x.created_at],
      performance: (x) => [x.id, x.name, x.teacher_groups, x.group_assessments, x.assessmentAttempts, x.future_qualification_votes, x.averageScore === null ? "" : `${x.averageScore}%`],
    };
    const body = [headers[tab], ...rows.map(values[tab])].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `owner-${tab}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  const count = (key: Tab) => data?.[key]?.length ?? 0;
  const activeLabel = tabs.find((x) => x.id === tab)?.label;
  return <div className="dr" dir="rtl">
    <div className="dr-hero"><div><div className="dr-kicker">OWNER CONTROL · DATA ROOM</div><h1>مركز البيانات والسيطرة</h1><p>كل الجهات، المستخدمين، الفصول، والإشارات التشغيلية في مساحة واحدة قابلة للتصدير.</p></div><div className="dr-actions"><button className="dr-ghost" onClick={load}><RefreshCw size={15} /> تحديث</button><button className="dr-export" onClick={exportCurrent} disabled={!data}><Download size={15} /> تصدير {activeLabel}</button></div></div>
    <div className="dr-trust"><ShieldCheck size={17} /><b>وصول المالك الكامل</b><small>قراءة شاملة · إدارة عبر الأقسام الأصلية · تصدير فوري</small><span className="dr-live"><i /> LIVE</span></div>
    <div className="dr-kpis">{[[Building2, "الجهات", count("schools")], [GraduationCap, "المعلمون", count("teachers")], [BookOpen, "الفصول", count("classes")], [ShieldCheck, "المدراء", count("admins")]].map(([Icon, label, value]) => <div className="dr-kpi" key={text(label)}><span className="dr-kpi-icon"><Icon size={18} /></span><span><b>{loading ? "—" : Number(value).toLocaleString("en")}</b><small>{text(label)}</small></span></div>)}</div>
    <div className="dr-toolbar"><div className="dr-tabs">{tabs.map(({ id, label, sub, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} /><span>{label}<small>{sub}</small></span></button>)}</div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في بيانات المالك..." /></div>
    <div className="dr-panel"><div className="dr-panel-head"><div><h2>{activeLabel}</h2><span>{rows.length.toLocaleString("en")} سجل · آخر تحديث {data ? new Date(data.generatedAt).toLocaleTimeString("ar") : "—"}</span></div><button className="dr-icon-btn" onClick={exportCurrent} title="تصدير"><ArrowDownToLine size={17} /></button></div>{loading ? <div className="dr-empty">جارٍ تجهيز غرفة البيانات...</div> : <div className="dr-table-wrap"><table><thead><tr>{tab === "schools" && <><th>الجهة</th><th>الحالة</th><th>المستخدمون</th><th>الفصول</th><th /></>}{tab === "teachers" && <><th>المعلم</th><th>الجهة</th><th>الحالة</th><th>الإشارات</th></>}{tab === "classes" && <><th>الفصل</th><th>الجهة</th><th>المعلم</th><th>التفاعل</th></>}{tab === "admins" && <><th>المدير</th><th>الجهة</th><th>البريد</th><th>الحالة</th></>}{tab === "performance" && <><th>الجهة</th><th>مجموعات</th><th>نماذج قياس</th><th>محاولات</th><th>متوسط الأداء</th></>}</tr></thead><tbody>
      {tab === "schools" && rows.map((x) => <tr key={text(x.id)}><td><strong>{text(x.name)}</strong><small>{text(x.slug)}</small></td><td><em className={x.is_active ? "ok" : "off"}>{x.is_active ? "نشطة" : "متوقفة"}</em></td><td>{text(get(x, "_count.teachers"))} معلم · {text(get(x, "_count.students"))} طالب</td><td>{text(get(x, "_count.classes"))}</td><td><Link href={`/owner/schools/${text(x.id)}`}><ArrowUpRight size={16} /></Link></td></tr>)}
      {tab === "teachers" && rows.map((x) => <tr key={text(x.id)}><td><strong>{text(get(x, "profile.full_name"))}</strong><small>{text(get(x, "profile.email")) || "بدون بريد"}</small></td><td>{text(get(x, "school.name"))}</td><td><em className={get(x, "profile.is_active") ? "ok" : "off"}>{text(x.onboarding_status)}</em></td><td>{text(get(x, "_count.classes"))} فصول · {text(get(x, "_count.ratings_received"))} تقييمات</td></tr>)}
      {tab === "classes" && rows.map((x) => <tr key={text(x.id)}><td><strong>{text(x.name)}</strong><small>{text(get(x, "_count.students"))} طالب</small></td><td>{text(get(x, "school.name"))}</td><td>{text(get(x, "teacher.profile.full_name")) || "غير مسند"}</td><td>{text(get(x, "_count.assessmentAttempts"))} محاولات · {text(get(x, "_count.quizzes"))} اختبارات</td></tr>)}
      {tab === "admins" && rows.map((x) => <tr key={text(x.id)}><td><strong>{text(get(x, "profile.full_name"))}</strong><small>{new Date(text(x.created_at)).toLocaleDateString("ar")}</small></td><td>{text(get(x, "school.name"))}</td><td>{text(get(x, "profile.email")) || "—"}</td><td><em className={get(x, "profile.is_active") ? "ok" : "off"}>{get(x, "profile.is_active") ? "نشط" : "موقوف"}</em></td></tr>)}
      {tab === "performance" && rows.map((x) => <tr key={text(x.id)}><td><strong>{text(x.name)}</strong></td><td>{text(x.teacher_groups)}</td><td>{text(x.group_assessments)}</td><td>{text(x.assessmentAttempts)}</td><td><b className="score">{x.averageScore === null ? "—" : `${text(x.averageScore)}%`}</b></td></tr>)}
      {!rows.length && <tr><td colSpan={6}><div className="dr-empty">لا توجد سجلات مطابقة.</div></td></tr>}
    </tbody></table></div>}</div><style>{styles}</style></div>;
}

const styles = `
.dr{--ink:#1a1a1a;--muted:#776c60;--gold:#b8a082;--burgundy:#6b1e2d;--paper:#fffbf5;--line:rgba(26,26,26,.1);font-family:'Cairo',sans-serif;color:var(--ink);padding-bottom:40px}.dr-hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;padding:10px 0 26px;border-bottom:1px solid var(--line)}.dr-kicker{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.19em;color:var(--gold);margin-bottom:9px}.dr h1{font:800 30px 'El Messiri','Cairo',sans-serif;margin:0}.dr-hero p{font-size:13px;color:var(--muted);margin:7px 0 0}.dr-actions{display:flex;gap:9px;flex-wrap:wrap}.dr-ghost,.dr-export,.dr-icon-btn{border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:11px;padding:10px 14px;display:flex;align-items:center;gap:7px;font:700 12px 'Cairo';cursor:pointer}.dr-export{background:var(--ink);color:var(--gold);border-color:var(--ink)}button:disabled{opacity:.5;cursor:not-allowed}.dr-trust{margin:18px 0;display:flex;align-items:center;gap:10px;background:linear-gradient(100deg,rgba(107,30,45,.95),#3b1720);color:#fff7ed;border:1px solid rgba(184,160,130,.28);border-radius:14px;padding:14px 16px;font-size:13px}.dr-trust small{color:rgba(255,247,237,.65);font-size:11px}.dr-live{margin-right:auto;font:600 10px 'IBM Plex Mono';color:var(--gold)}.dr-live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#79d69b;margin-left:5px}.dr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.dr-kpi{background:var(--paper);border:1px solid var(--line);border-radius:13px;padding:15px;display:flex;align-items:center;gap:12px;box-shadow:0 5px 18px rgba(26,26,26,.04)}.dr-kpi-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;color:var(--burgundy);background:rgba(184,160,130,.13);border:1px solid rgba(184,160,130,.25)}.dr-kpi span:last-child{display:flex;flex-direction:column}.dr-kpi b{font:800 22px 'IBM Plex Mono'}.dr-kpi small,.dr-panel-head span{font-size:11px;color:var(--muted)}.dr-toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}.dr-tabs{display:flex;gap:6px;flex-wrap:wrap}.dr-tabs button{display:flex;align-items:center;gap:8px;border:1px solid transparent;background:transparent;border-radius:10px;padding:8px 10px;color:var(--muted);cursor:pointer}.dr-tabs button.active{background:var(--paper);border-color:var(--line);color:var(--burgundy);box-shadow:0 3px 12px rgba(26,26,26,.05)}.dr-tabs span{display:flex;flex-direction:column;align-items:flex-start;font:700 12px 'Cairo'}.dr-tabs small{font:9px 'IBM Plex Mono';opacity:.65}.dr-toolbar input{width:220px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:rgba(255,251,245,.65);font:500 12px 'Cairo';outline:none}.dr-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 8px 26px rgba(26,26,26,.05)}.dr-panel-head{padding:18px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line)}.dr-panel-head h2{font:800 17px 'El Messiri','Cairo';margin:0 0 2px}.dr-panel-head span{display:block}.dr-icon-btn{padding:8px}.dr-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:right;background:rgba(239,234,224,.45);color:var(--muted);font-size:10px;font-weight:700;padding:12px 18px;white-space:nowrap}td{padding:14px 18px;border-top:1px solid rgba(26,26,26,.065);white-space:nowrap}td strong,td small{display:block}td small{font-size:10px;color:var(--muted);margin-top:2px}td a{color:var(--burgundy);display:grid;place-items:center}em{font-style:normal;font-size:10px;border-radius:99px;padding:4px 9px}.ok{background:rgba(28,110,64,.09);color:#1c6e40}.off{background:rgba(107,30,45,.09);color:var(--burgundy)}.score{font:700 13px 'IBM Plex Mono';color:var(--burgundy)}.dr-empty{text-align:center;color:var(--muted);padding:48px 20px;font-size:13px}@media(max-width:800px){.dr-hero{display:block}.dr-actions{margin-top:18px}.dr-kpis{grid-template-columns:repeat(2,1fr)}.dr-toolbar{display:block}.dr-toolbar input{width:100%;margin-top:10px}.dr-trust{align-items:flex-start;flex-wrap:wrap}.dr-trust small{width:100%}}@media(max-width:480px){.dr h1{font-size:24px}.dr-kpis{gap:8px}.dr-kpi{padding:11px}.dr-kpi b{font-size:18px}}
`;
