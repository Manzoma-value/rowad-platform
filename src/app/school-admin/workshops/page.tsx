"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import MandalaLoader from "@/components/MandalaLoader";

type Row = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "OPEN" | "CLOSED";
  signup_token: string;
  created_at: string;
  _count: { signed_up_teachers: number; attendance: number };
};

const UI = {
  ar: {
    title: "الورش التدريبية",
    sub: "أنشئ ورشة، شارك رمز QR للتسجيل، ثم اعرض رمز الحضور اليومي. جميع بيانات المشاركة والغياب تظهر لك مباشرة.",
    create: "+ ورشة جديدة",
    empty: "لا توجد ورش بعد. ابدأ بإنشاء واحدة!",
    statusOPEN: "مفتوحة",
    statusCLOSED: "مغلقة",
    signed: "مسجّلون",
    attend: "حضور",
    open: "تفاصيل الورشة",
    newTitle: "أنشئ ورشة جديدة",
    lblName: "اسم الورشة",
    lblDesc: "الوصف",
    lblStart: "تاريخ البداية",
    lblEnd: "تاريخ النهاية",
    cancel: "إلغاء",
    submit: "إنشاء",
    creating: "جارٍ الإنشاء…",
  },
  sq: {
    title: "Punëtoritë",
    sub: "Krijo një punëtori, ndaj kodin QR të regjistrimit, pastaj shfaq kodin ditor të pranisë. Të gjitha të dhënat shfaqen këtu.",
    create: "+ Punëtori e re",
    empty: "Nuk ka punëtori ende.",
    statusOPEN: "E hapur",
    statusCLOSED: "E mbyllur",
    signed: "Të regjistruar",
    attend: "Prania",
    open: "Detajet",
    newTitle: "Krijo një punëtori",
    lblName: "Titulli",
    lblDesc: "Përshkrimi",
    lblStart: "Data e fillimit",
    lblEnd: "Data e mbarimit",
    cancel: "Anulo",
    submit: "Krijo",
    creating: "Po krijohet…",
  },
} as const;

export default function WorkshopsPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const viewOnly = useViewOnly();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", start_date: "", end_date: "" });
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/school-admin/workshops", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d?.workshops ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create() {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const r = await fetch("/api/school-admin/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setDlg(false);
        setForm({ title: "", description: "", start_date: "", end_date: "" });
        load();
      }
    } finally { setCreating(false); }
  }

  function fmt(s: string | null) {
    if (!s) return "—";
    try { return new Date(s).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL"); } catch { return s; }
  }

  const visible = useMemo(() => rows, [rows]);

  return (
    <div className="ws" dir={dir}>
      <header className="ws-hero">
        <div>
          <h1 className="ws-title">{T.title}</h1>
          <p className="ws-sub">{T.sub}</p>
        </div>
        {!viewOnly && (
          <button className="ws-new" onClick={() => setDlg(true)} data-write="true">{T.create}</button>
        )}
      </header>

      {loading ? <MandalaLoader />
       : visible.length === 0 ? <div className="ws-empty">{T.empty}</div>
       : (
        <div className="ws-grid">
          {visible.map((w) => (
            <Link key={w.id} href={`/school-admin/workshops/${w.id}`} className="ws-card">
              <div className="ws-card-top">
                <span className={`ws-tag ws-tag-${w.status}`}>
                  {w.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
                </span>
                <span className="ws-card-date">{fmt(w.created_at)}</span>
              </div>
              <h2 className="ws-card-title">{w.title}</h2>
              {w.description && <p className="ws-card-desc">{w.description}</p>}
              <div className="ws-card-stats">
                <span><strong>{w._count.signed_up_teachers}</strong> {T.signed}</span>
                <span><strong>{w._count.attendance}</strong> {T.attend}</span>
              </div>
              <span className="ws-card-open">{T.open} →</span>
            </Link>
          ))}
        </div>
      )}

      {dlg && !viewOnly && (
        <div className="ws-overlay" onClick={() => !creating && setDlg(false)}>
          <div className="ws-dlg" onClick={(e) => e.stopPropagation()}>
            <h3 className="ws-dlg-title">{T.newTitle}</h3>
            <label className="ws-lbl">{T.lblName}</label>
            <input className="ws-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            <label className="ws-lbl">{T.lblDesc}</label>
            <textarea className="ws-input ws-ta" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="ws-dlg-row">
              <div style={{ flex: 1 }}>
                <label className="ws-lbl">{T.lblStart}</label>
                <input className="ws-input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="ws-lbl">{T.lblEnd}</label>
                <input className="ws-input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="ws-dlg-actions">
              <button className="ws-btn" onClick={() => setDlg(false)} disabled={creating}>{T.cancel}</button>
              <button className="ws-btn ws-btn-primary" onClick={create} disabled={creating || !form.title.trim()}>
                {creating ? T.creating : T.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .ws { font-family: 'Cairo', sans-serif; }
        .ws-hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .ws-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .ws-sub { font-size: 13.5px; color: #655B53; max-width: 680px; line-height: 1.85; margin: 0; }
        .ws-new { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 10px 18px; border-radius: 11px; font-family: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; }
        .ws-empty { padding: 60px 20px; text-align: center; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; color: #8C8274; font-weight: 700; }
        .ws-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px,1fr)); gap: 14px; }
        .ws-card { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1.5px solid rgba(194,160,89,0.32); border-radius: 14px; text-decoration: none; color: inherit; transition: all .18s; box-shadow: 0 4px 14px rgba(150,115,50,0.06); }
        .ws-card:hover { transform: translateY(-2px); border-color: #B8A082; box-shadow: 0 10px 26px rgba(150,115,50,0.16); }
        .ws-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .ws-tag { font-size: 10.5px; font-weight: 800; padding: 3px 10px; border-radius: 99px; letter-spacing: 0.04em; }
        .ws-tag-OPEN   { background: rgba(76,107,60,0.16); color: #1B5E20; }
        .ws-tag-CLOSED { background: rgba(26,26,26,0.08); color: #655B53; }
        .ws-card-date { font-size: 11.5px; color: #8F765B; font-weight: 700; }
        .ws-card-title { font-size: 17px; font-weight: 900; color: #32101A; margin: 0; line-height: 1.4; }
        .ws-card-desc { font-size: 13px; color: #6B1E2D; margin: 0; line-height: 1.75; }
        .ws-card-stats { display: flex; gap: 14px; font-size: 12.5px; color: #796A62; padding-top: 6px; }
        .ws-card-stats strong { color: #32101A; font-weight: 900; font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .ws-card-open { font-size: 12px; font-weight: 800; color: #6B1E2D; margin-top: auto; }

        .ws-overlay { position: fixed; inset: 0; background: rgba(26,26,26,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(4px); }
        .ws-dlg { background: #FFFBF5; border-radius: 16px; padding: 24px; max-width: 480px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .ws-dlg-title { font-size: 17px; font-weight: 900; color: #32101A; margin: 0 0 14px; }
        .ws-lbl { display: block; font-size: 12px; font-weight: 800; color: #6B1E2D; margin: 10px 0 4px; }
        .ws-input { width: 100%; padding: 10px 13px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px; font-family: inherit; font-size: 13.5px; background: #FFF; outline: none; }
        .ws-input:focus { border-color: #B8A082; }
        .ws-ta { resize: vertical; min-height: 50px; line-height: 1.7; }
        .ws-dlg-row { display: flex; gap: 10px; }
        .ws-dlg-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        .ws-btn { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #6B1E2D; padding: 9px 16px; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
        .ws-btn-primary { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border-color: transparent; }
      `}</style>
    </div>
  );
}
