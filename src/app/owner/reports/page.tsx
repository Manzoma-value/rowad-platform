"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

type Row = {
  id: string;
  title: string;
  subtitle: string | null;
  status: "DRAFT" | "PUBLISHED";
  report_date: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  school: { id: string; name: string; name_alt: string | null };
};
type School = { id: string; name: string; name_alt?: string | null };

const UI = {
  ar: {
    title: "تقارير المالك",
    sub: "أنشئ تقارير رسمية للمدارس عن ورش العمل، الزيارات، البرامج، والاجتماعات. كل تقرير يُرسل إلى مدرسة محددة وتراه إدارتها فقط.",
    create: "+ تقرير جديد",
    tabAll: "الكل",
    tabDraft: "مسودات",
    tabPublished: "منشورة",
    empty: "لا توجد تقارير بعد.",
    school: "المدرسة",
    updated: "آخر تعديل",
    published: "تاريخ النشر",
    statusDRAFT: "مسودة",
    statusPUBLISHED: "منشور",
    open: "فتح",
    newReportTitle: "تقرير جديد",
    fieldSchool: "اختر المدرسة",
    fieldTitle: "عنوان التقرير",
    cancel: "إلغاء",
    creating: "جارٍ الإنشاء…",
    submit: "إنشاء",
    error: "تعذر إنشاء التقرير",
  },
  sq: {
    title: "Raportet e pronarit",
    sub: "Krijo raporte zyrtare për shkollat mbi punëtoritë, vizitat, programet dhe takimet. Çdo raport i dërgohet një shkolle dhe e shohin vetëm administratorët e saj.",
    create: "+ Raport i ri",
    tabAll: "Të gjitha",
    tabDraft: "Draft",
    tabPublished: "Publikuara",
    empty: "Asnjë raport ende.",
    school: "Shkolla",
    updated: "Përditësuar",
    published: "Publikuar",
    statusDRAFT: "Draft",
    statusPUBLISHED: "I publikuar",
    open: "Hap",
    newReportTitle: "Raport i ri",
    fieldSchool: "Zgjidh shkollën",
    fieldTitle: "Titulli i raportit",
    cancel: "Anulo",
    creating: "Po krijohet…",
    submit: "Krijo",
    error: "Krijimi dështoi",
  },
} as const;

export default function OwnerReportsPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "DRAFT" | "PUBLISHED">("all");
  const [schools, setSchools] = useState<School[]>([]);
  const [dlg, setDlg] = useState(false);
  const [form, setForm] = useState({ school_id: "", title: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/owner/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d?.reports ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);
  useEffect(() => {
    fetch("/api/owner/schools", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSchools(d?.schools ?? []))
      .catch(() => setSchools([]));
  }, []);

  const visible = useMemo(
    () => tab === "all" ? rows : rows.filter((r) => r.status === tab),
    [rows, tab],
  );

  function fmtDate(s: string | null) {
    if (!s) return "—";
    try { return new Date(s).toLocaleDateString(L === "ar" ? "ar-SA" : "sq-AL"); } catch { return s; }
  }

  async function create() {
    if (!form.school_id || !form.title.trim()) {
      setError(T.error);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const r = await fetch("/api/owner/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error();
      const { report } = await r.json();
      router.push(`/owner/reports/${report.id}/edit`);
    } catch {
      setError(T.error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="or-page" dir={dir}>
      <header className="or-hero">
        <div>
          <h1 className="or-title">{T.title}</h1>
          <p className="or-sub">{T.sub}</p>
        </div>
        <button className="or-new" onClick={() => { setForm({ school_id: schools[0]?.id ?? "", title: "" }); setError(""); setDlg(true); }}>
          {T.create}
        </button>
      </header>

      <div className="or-tabs">
        {(["all", "DRAFT", "PUBLISHED"] as const).map((t) => (
          <button
            key={t}
            className={`or-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "all" ? T.tabAll : t === "DRAFT" ? T.tabDraft : T.tabPublished}
          </button>
        ))}
      </div>

      {loading ? (
        <MandalaLoader />
      ) : visible.length === 0 ? (
        <div className="or-empty">{T.empty}</div>
      ) : (
        <div className="or-grid">
          {visible.map((r) => (
            <Link key={r.id} href={`/owner/reports/${r.id}/edit`} className="or-card">
              <div className="or-card-top">
                <span className={`or-tag or-st-${r.status}`}>
                  {r.status === "DRAFT" ? T.statusDRAFT : T.statusPUBLISHED}
                </span>
                <span className="or-card-school">
                  {L !== "ar" && r.school.name_alt?.trim() ? r.school.name_alt : r.school.name}
                </span>
              </div>
              <h2 className="or-card-title">{r.title}</h2>
              {r.subtitle && <p className="or-card-sub">{r.subtitle}</p>}
              <div className="or-card-meta">
                <span><strong>{T.updated}:</strong> {fmtDate(r.updated_at)}</span>
                {r.status === "PUBLISHED" && (
                  <span><strong>{T.published}:</strong> {fmtDate(r.published_at)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {dlg && (
        <div className="or-dlg-overlay" onClick={() => !creating && setDlg(false)}>
          <div className="or-dlg" onClick={(e) => e.stopPropagation()} dir={dir}>
            <h3 className="or-dlg-title">{T.newReportTitle}</h3>
            <label className="or-dlg-lbl">{T.fieldSchool}</label>
            <select className="or-dlg-input" value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
              <option value="">—</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{L !== "ar" && s.name_alt?.trim() ? s.name_alt : s.name}</option>
              ))}
            </select>
            <label className="or-dlg-lbl">{T.fieldTitle}</label>
            <input
              className="or-dlg-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            {error && <div className="or-dlg-err">{error}</div>}
            <div className="or-dlg-actions">
              <button className="or-dlg-cancel" onClick={() => setDlg(false)} disabled={creating}>{T.cancel}</button>
              <button className="or-dlg-submit" onClick={create} disabled={creating || !form.school_id || !form.title.trim()}>
                {creating ? T.creating : T.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .or-page { font-family: 'Cairo', sans-serif; }
        .or-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        .or-title { font-size:24px; font-weight:900; color:#1B1810; margin:0 0 6px; }
        .or-sub { font-size:13.5px; color:#5E5A52; max-width:680px; line-height:1.85; margin:0; }
        .or-new { background:linear-gradient(180deg,#1E2329,#11151A); color:#E5B93C; border:none; padding:10px 18px; border-radius:11px; font-family:inherit; font-size:13.5px; font-weight:800; cursor:pointer; }
        .or-tabs { display:flex; gap:8px; margin-bottom:16px; }
        .or-tab { background:#FFFDF8; border:1.5px solid rgba(194,160,89,0.32); color:#5E4A20; padding:8px 16px; border-radius:99px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; }
        .or-tab.active { background:linear-gradient(180deg,#1E2329,#11151A); color:#E5B93C; border-color:transparent; }
        .or-empty { padding:60px 20px; text-align:center; background:#FFFDF8; border:1px solid rgba(8,11,12,0.07); border-radius:14px; color:#8A8478; font-weight:700; }
        .or-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:14px; }
        .or-card { display:flex; flex-direction:column; gap:8px; padding:18px 20px; background:linear-gradient(165deg,#FCF6E6,#F4EBD3); border:1.5px solid rgba(194,160,89,0.32); border-radius:14px; text-decoration:none; color:inherit; transition:all .18s; box-shadow:0 4px 14px rgba(150,115,50,0.06); }
        .or-card:hover { transform:translateY(-2px); border-color:#B89B5E; box-shadow:0 10px 26px rgba(150,115,50,0.16); }
        .or-card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .or-tag { font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:99px; letter-spacing:0.04em; }
        .or-st-DRAFT { background:rgba(8,11,12,0.08); color:#5E5A52; }
        .or-st-PUBLISHED { background:rgba(45,138,74,0.16); color:#1E5C2E; }
        .or-card-school { font-size:11.5px; color:#8B6915; font-weight:700; }
        .or-card-title { font-size:17px; font-weight:900; color:#1B1810; margin:0; line-height:1.4; }
        .or-card-sub { font-size:13px; color:#5E4A20; margin:0; line-height:1.7; }
        .or-card-meta { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:#7A6440; margin-top:auto; padding-top:6px; }
        .or-card-meta strong { font-weight:800; color:#6B4F1E; }
        .or-dlg-overlay { position:fixed; inset:0; background:rgba(8,11,12,0.55); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; backdrop-filter:blur(4px); }
        .or-dlg { background:#FFFDF8; border-radius:16px; padding:24px; max-width:460px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.3); }
        .or-dlg-title { font-size:17px; font-weight:900; color:#1B1810; margin:0 0 14px; }
        .or-dlg-lbl { display:block; font-size:12px; font-weight:800; color:#6B4F1E; margin:10px 0 4px; }
        .or-dlg-input { width:100%; padding:10px 13px; border:1.5px solid rgba(194,160,89,0.32); border-radius:9px; font-family:inherit; font-size:13.5px; background:#FFF; outline:none; }
        .or-dlg-input:focus { border-color:#B89B5E; }
        .or-dlg-err { color:#7A1E1E; font-size:12.5px; font-weight:700; margin-top:10px; }
        .or-dlg-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:16px; }
        .or-dlg-cancel { background:none; border:1px solid rgba(8,11,12,0.18); color:#5E5A52; padding:9px 16px; border-radius:9px; font-family:inherit; font-weight:700; cursor:pointer; font-size:13px; }
        .or-dlg-submit { background:linear-gradient(180deg,#1E2329,#11151A); color:#E5B93C; border:none; padding:9px 18px; border-radius:9px; font-family:inherit; font-weight:800; cursor:pointer; font-size:13px; }
        .or-dlg-submit:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
