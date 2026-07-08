"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import MandalaLoader from "@/components/MandalaLoader";

type Workshop = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "OPEN" | "CLOSED";
  signup_token: string;
  created_at: string;
  updated_at: string;
};

type DetailPayload = {
  workshop: Workshop;
  signupUrl: string;
  signupQrPng: string;
};

type AttendancePayload = {
  workshop: { id: string; title: string };
  days: string[];
  teachers: {
    teacher_id: string;
    full_name: string;
    email: string | null;
    status: string;
    days_present: boolean[];
    total_present: number;
  }[];
};

type AttendanceCode = {
  code: string | null;
  url?: string;
  qrPng?: string;
  created_at?: string;
};

const UI = {
  ar: {
    back: "Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„ÙˆØ±Ø´",
    signupQr: "QR Ø§Ù„ØªØ³Ø¬ÙŠÙ„ ÙÙŠ Ø§Ù„ÙˆØ±Ø´Ø©",
    signupSub: "Ù‡Ø°Ø§ Ø§Ù„Ø±Ù…Ø² Ø«Ø§Ø¨Øª. Ø§Ø¹Ø±Ø¶Ù‡ ÙÙŠ Ø§Ù„ÙˆØ±Ø´Ø© Ù„ÙŠÙÙ†Ø´Ø¦ Ø§Ù„Ù…Ø¹Ù„Ù… Ø­Ø³Ø§Ø¨Ù‡ Ø«Ù… ÙŠÙƒÙ…Ù„ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„ØªÙ‚Ø¯ÙŠÙ….",
    attendanceQr: "QR Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„ÙŠÙˆÙ…ÙŠ",
    attendanceSub: "Ø£Ù†Ø´Ø¦ Ø±Ù…Ø² Ø­Ø¶ÙˆØ± Ø¬Ø¯ÙŠØ¯ Ù„ÙƒÙ„ ÙŠÙˆÙ… ØªØ¯Ø±ÙŠØ¨. Ø¹Ù†Ø¯ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªÙˆÙ„ÙŠØ¯ØŒ ÙŠØªÙˆÙ‚Ù Ø§Ù„Ø±Ù…Ø² Ø§Ù„Ø³Ø§Ø¨Ù‚ Ù„Ù‡Ø°Ø§ Ø§Ù„ÙŠÙˆÙ….",
    generate: "ØªÙˆÙ„ÙŠØ¯ Ø±Ù…Ø² Ø§Ù„ÙŠÙˆÙ…",
    regenerate: "Ø¥Ø¹Ø§Ø¯Ø© ØªÙˆÙ„ÙŠØ¯ Ø±Ù…Ø² Ø§Ù„ÙŠÙˆÙ…",
    generating: "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙˆÙ„ÙŠØ¯...",
    noCode: "Ù„Ù… ÙŠØªÙ… ØªÙˆÙ„ÙŠØ¯ Ø±Ù…Ø² Ø­Ø¶ÙˆØ± Ù„Ù‡Ø°Ø§ Ø§Ù„ÙŠÙˆÙ… Ø¨Ø¹Ø¯.",
    open: "Ù…ÙØªÙˆØ­Ø©",
    closed: "Ù…ØºÙ„Ù‚Ø©",
    close: "Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ÙˆØ±Ø´Ø©",
    reopen: "Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„ÙˆØ±Ø´Ø©",
    saving: "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...",
    copy: "Ù†Ø³Ø® Ø§Ù„Ø±Ø§Ø¨Ø·",
    copied: "ØªÙ… Ø§Ù„Ù†Ø³Ø®",
    attendance: "Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±",
    attendanceHelp: "Ø§Ù„Ø£Ø®Ø¶Ø± = Ø­Ø¶Ø± ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙŠÙˆÙ…ØŒ Ø§Ù„Ø£Ø­Ù…Ø± = Ù„Ù… ÙŠØ­Ø¶Ø±. Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ ÙŠÙˆØ¶Ø­ Ø¹Ø¯Ø¯ Ø£ÙŠØ§Ù… Ø§Ù„Ø­Ø¶ÙˆØ± Ù„ÙƒÙ„ Ù…Ø¹Ù„Ù….",
    teacher: "Ø§Ù„Ù…Ø¹Ù„Ù…",
    email: "Ø§Ù„Ø¨Ø±ÙŠØ¯",
    total: "Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ",
    status: "Ø§Ù„Ø­Ø§Ù„Ø©",
    noTeachers: "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø¹Ù„Ù…ÙˆÙ† Ù…Ø±ØªØ¨Ø·ÙˆÙ† Ø¨Ù‡Ø°Ù‡ Ø§Ù„ÙˆØ±Ø´Ø© Ø¨Ø¹Ø¯. Ø³ÙŠØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙƒÙ„ Ù…Ù† Ø³Ø¬Ù‘Ù„ Ø¹Ø¨Ø± QR Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø£Ùˆ Ø³Ø¬Ù‘Ù„ Ø­Ø¶ÙˆØ±Ø§Ù‹.",
    present: "Ø­Ø§Ø¶Ø±",
    absent: "ØºØ§Ø¦Ø¨",
    registered: "Ù…Ø³Ø¬Ù„ÙˆÙ†",
    days: "Ø£ÙŠØ§Ù…",
    refresh: "ØªØ­Ø¯ÙŠØ«",
    error: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØ±Ø´Ø©.",
  },
  sq: {
    back: "Kthehu te punÃ«toritÃ«",
    signupQr: "QR i regjistrimit",
    signupSub: "Ky kod Ã«shtÃ« i pÃ«rhershÃ«m. Shfaqe nÃ« punÃ«tori qÃ« mÃ«suesi tÃ« krijojÃ« llogarinÃ« dhe tÃ« plotÃ«sojÃ« aplikimin.",
    attendanceQr: "QR i pranisÃ« ditore",
    attendanceSub: "Gjenero njÃ« kod tÃ« ri pÃ«r Ã§do ditÃ« trajnimi. Kur rigjenerohet, kodi i mÃ«parshÃ«m i ditÃ«s ndalon.",
    generate: "Gjenero kodin e sotÃ«m",
    regenerate: "Rigjenero kodin e sotÃ«m",
    generating: "Duke gjeneruar...",
    noCode: "Nuk ka kod pranie pÃ«r sot ende.",
    open: "E hapur",
    closed: "E mbyllur",
    close: "Mbyll punÃ«torinÃ«",
    reopen: "Rihap punÃ«torinÃ«",
    saving: "Duke ruajtur...",
    copy: "Kopjo lidhjen",
    copied: "U kopjua",
    attendance: "Tabela e pranisÃ«",
    attendanceHelp: "Jeshile = prezent atÃ« ditÃ«, e kuqe = mungesÃ«. Totali tregon sa ditÃ« ka marrÃ« pjesÃ« Ã§do mÃ«sues.",
    teacher: "MÃ«suesi",
    email: "Email",
    total: "Totali",
    status: "Statusi",
    noTeachers: "Nuk ka mÃ«sues tÃ« lidhur me kÃ«tÃ« punÃ«tori ende.",
    present: "Prezent",
    absent: "MungesÃ«",
    registered: "TÃ« regjistruar",
    days: "ditÃ«",
    refresh: "Rifresko",
    error: "Nuk u ngarkuan tÃ« dhÃ«nat e punÃ«torisÃ«.",
  },
} as const;

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const viewOnly = useViewOnly();

  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [attendance, setAttendance] = useState<AttendancePayload | null>(null);
  const [code, setCode] = useState<AttendanceCode>({ code: null });
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const loadAll = useCallback(async () => {
    setError(false);
    try {
      const [detailRes, attendanceRes, codeRes] = await Promise.all([
        fetch(`/api/school-admin/workshops/${id}`, { cache: "no-store" }),
        fetch(`/api/school-admin/workshops/${id}/attendance`, { cache: "no-store" }),
        fetch(`/api/school-admin/workshops/${id}/attendance-code`, { cache: "no-store" }),
      ]);
      if (!detailRes.ok) throw new Error("detail");
      setDetail(await detailRes.json());
      setAttendance(attendanceRes.ok ? await attendanceRes.json() : null);
      setCode(codeRes.ok ? await codeRes.json() : { code: null });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const summary = useMemo(() => {
    const teachers = attendance?.teachers ?? [];
    const days = attendance?.days ?? [];
    const expectedCells = teachers.length * days.length;
    const presentCells = teachers.reduce((sum, t) => sum + t.total_present, 0);
    return { teachers: teachers.length, days: days.length, presentCells, expectedCells };
  }, [attendance]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1300);
  }

  async function generateCode() {
    if (viewOnly) return;
    setBusyCode(true);
    try {
      const r = await fetch(`/api/school-admin/workshops/${id}/attendance-code`, { method: "POST" });
      if (r.ok) setCode(await r.json());
    } finally {
      setBusyCode(false);
    }
  }

  async function toggleStatus() {
    if (!detail || viewOnly) return;
    setBusyStatus(true);
    const next = detail.workshop.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const r = await fetch(`/api/school-admin/workshops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (r.ok) setDetail({ ...detail, workshop: { ...detail.workshop, status: next } });
    } finally {
      setBusyStatus(false);
    }
  }

  function fmtDate(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(L === "ar" ? "ar-SA" : "sq-AL");
  }

  if (loading) {
    return (
      <div className="wd" dir={dir}>
        <MandalaLoader />
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="wd" dir={dir}>
        <Link href="/school-admin/workshops" className="wd-back">{T.back}</Link>
        <div className="wd-empty">{T.error}</div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wd" dir={dir}>
      <Link href="/school-admin/workshops" className="wd-back">{T.back}</Link>

      <header className="wd-hero">
        <div>
          <span className={`wd-status wd-status-${detail.workshop.status}`}>
            {detail.workshop.status === "OPEN" ? T.open : T.closed}
          </span>
          <h1>{detail.workshop.title}</h1>
          {detail.workshop.description && <p>{detail.workshop.description}</p>}
          <div className="wd-dates">
            <span>{fmtDate(detail.workshop.start_date)}</span>
            <span>{fmtDate(detail.workshop.end_date)}</span>
          </div>
        </div>
        {!viewOnly && (
          <button className="wd-hero-btn" onClick={toggleStatus} disabled={busyStatus} data-write="true">
            {busyStatus ? T.saving : detail.workshop.status === "OPEN" ? T.close : T.reopen}
          </button>
        )}
      </header>

      <section className="wd-stats">
        <div><span>{T.registered}</span><strong>{summary.teachers}</strong></div>
        <div><span>{T.days}</span><strong>{summary.days}</strong></div>
        <div><span>{T.present}</span><strong>{summary.presentCells}</strong></div>
        <div><span>{T.absent}</span><strong>{Math.max(0, summary.expectedCells - summary.presentCells)}</strong></div>
      </section>

      <section className="wd-qr-grid">
        <QrPanel
          title={T.signupQr}
          sub={T.signupSub}
          qr={detail.signupQrPng}
          url={detail.signupUrl}
          copyLabel={copied === "signup" ? T.copied : T.copy}
          onCopy={() => copy(detail.signupUrl, "signup")}
        />

        <div className="wd-card wd-qr-card">
          <div className="wd-card-head">
            <div>
              <h2>{T.attendanceQr}</h2>
              <p>{T.attendanceSub}</p>
            </div>
            {!viewOnly && (
              <button className="wd-small-btn" onClick={generateCode} disabled={busyCode || detail.workshop.status === "CLOSED"} data-write="true">
                {busyCode ? T.generating : code.code ? T.regenerate : T.generate}
              </button>
            )}
          </div>
          {code.code && code.qrPng && code.url ? (
            <div className="wd-qr-body">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={code.qrPng} alt="" />
              <div className="wd-url-box" dir="ltr">{code.url}</div>
              <button className="wd-copy" onClick={() => copy(code.url!, "attendance")}>
                {copied === "attendance" ? T.copied : T.copy}
              </button>
            </div>
          ) : (
            <div className="wd-no-code">{T.noCode}</div>
          )}
        </div>
      </section>

      <section className="wd-card">
        <div className="wd-table-head">
          <div>
            <h2>{T.attendance}</h2>
            <p>{T.attendanceHelp}</p>
          </div>
          <button className="wd-small-btn ghost" onClick={() => void loadAll()}>{T.refresh}</button>
        </div>

        {!attendance || attendance.teachers.length === 0 ? (
          <div className="wd-empty">{T.noTeachers}</div>
        ) : (
          <div className="wd-table-wrap">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>{T.teacher}</th>
                  <th>{T.email}</th>
                  <th>{T.status}</th>
                  {attendance.days.map((day) => <th key={day}>{fmtDate(day)}</th>)}
                  <th>{T.total}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.teachers.map((teacher) => (
                  <tr key={teacher.teacher_id}>
                    <td className="wd-teacher">{teacher.full_name}</td>
                    <td dir="ltr">{teacher.email ?? "-"}</td>
                    <td>{teacher.status}</td>
                    {teacher.days_present.map((present, index) => (
                      <td key={attendance.days[index]} className={present ? "present" : "absent"} title={present ? T.present : T.absent}>
                        {present ? "âœ“" : "Ã—"}
                      </td>
                    ))}
                    <td className="wd-total">{teacher.total_present} / {attendance.days.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{styles}</style>
    </div>
  );
}

function QrPanel({
  title, sub, qr, url, copyLabel, onCopy,
}: {
  title: string;
  sub: string;
  qr: string;
  url: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="wd-card wd-qr-card">
      <div className="wd-card-head">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>
      <div className="wd-qr-body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="" />
        <div className="wd-url-box" dir="ltr">{url}</div>
        <button className="wd-copy" onClick={onCopy}>{copyLabel}</button>
      </div>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
.wd{font-family:'Cairo',sans-serif;color:#1B1810}
.wd-back{display:inline-flex;margin-bottom:14px;color:#6B4F1E;font-weight:900;text-decoration:none;font-size:13px}
.wd-back:hover{text-decoration:underline}
.wd-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;background:linear-gradient(135deg,#10151B,#2E2414);border:1px solid rgba(184,160,130,.26);border-radius:18px;padding:24px;margin-bottom:14px;box-shadow:0 18px 44px rgba(30,20,8,.16)}
.wd-hero h1{margin:8px 0 8px;color:#F7EDD8;font-size:clamp(24px,4vw,38px);line-height:1.2;font-weight:900}
.wd-hero p{margin:0;max-width:760px;color:rgba(247,237,216,.74);line-height:1.8}
.wd-status{display:inline-flex;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:900}
.wd-status-OPEN{background:rgba(76,107,60,.18);color:#D9F0C9;border:1px solid rgba(142,183,104,.28)}
.wd-status-CLOSED{background:rgba(255,255,255,.08);color:#E8DCBC;border:1px solid rgba(255,255,255,.14)}
.wd-dates{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.wd-dates span{border:1px solid rgba(184,160,130,.18);background:rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;color:#E8DCBC;font-size:12px;font-weight:800}
.wd-hero-btn,.wd-small-btn,.wd-copy{border:0;border-radius:11px;background:#1A1A1A;color:#D9C9B0;padding:10px 15px;font:inherit;font-weight:900;cursor:pointer}
.wd-hero-btn:disabled,.wd-small-btn:disabled{opacity:.55;cursor:progress}.wd-small-btn{font-size:12px;padding:8px 12px}.wd-small-btn.ghost{background:#FFF;border:1.5px solid rgba(184,155,94,.28);color:#6B4F1E}
.wd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.wd-stats div{background:#FBF8F1;border:1px solid rgba(184,155,94,.18);border-radius:14px;padding:14px;box-shadow:0 10px 24px rgba(42,26,10,.06)}.wd-stats span{display:block;color:#8E7243;font-size:12px;font-weight:900}.wd-stats strong{display:block;margin-top:7px;font-size:30px;line-height:1;color:#1B1810}
.wd-qr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}.wd-card{background:#FBF8F1;border:1px solid rgba(184,155,94,.20);border-radius:16px;padding:16px;box-shadow:0 12px 28px rgba(42,26,10,.07)}.wd-card-head,.wd-table-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(184,155,94,.14)}.wd-card h2,.wd-table-head h2{margin:0 0 4px;font-size:18px;font-weight:900}.wd-card p,.wd-table-head p{margin:0;color:#5E5A52;font-size:13px;line-height:1.75}
.wd-qr-body{display:grid;gap:10px;justify-items:center}.wd-qr-body img{width:min(320px,100%);height:auto;border:1px solid rgba(184,155,94,.22);border-radius:14px;background:#fff;padding:8px}.wd-url-box{width:100%;background:#F6F0E6;border:1px solid rgba(184,155,94,.18);border-radius:10px;padding:9px 11px;font-family:ui-monospace,Consolas,monospace;font-size:11px;overflow:auto;text-align:left;color:#2E2210}.wd-copy{width:100%;background:linear-gradient(180deg,#4A0E1C,#12070B)}
.wd-no-code{min-height:260px;display:flex;align-items:center;justify-content:center;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8A8478;font-weight:800;background:rgba(194,160,89,.04);padding:24px}
.wd-empty{padding:40px 20px;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8A8478;font-weight:800;background:#FBF8F1}.wd-table-wrap{overflow:auto;border:1px solid rgba(74,14,28,.08);border-radius:13px}.wd-table{width:100%;border-collapse:collapse;min-width:860px;background:#fff}.wd-table th{background:#F6F0E6;color:#6B4F1E;font-size:11px;font-weight:900;padding:10px;border-bottom:1px solid rgba(184,155,94,.22);white-space:nowrap}.wd-table td{padding:10px;border-bottom:1px solid rgba(74,14,28,.06);text-align:center;font-size:12.5px;color:#2E2210}.wd-table tr:last-child td{border-bottom:0}.wd-teacher{text-align:start!important;font-weight:900;color:#1B1810!important}.wd-total{font-weight:900;color:#1B1810!important}.wd-table td.present{background:rgba(76,107,60,.14);color:#3E642E;font-weight:900}.wd-table td.absent{background:rgba(163,59,46,.10);color:#9A3025;font-weight:900}
@media(max-width:980px){.wd-qr-grid,.wd-stats{grid-template-columns:1fr}.wd-hero{padding:20px}}
`;

