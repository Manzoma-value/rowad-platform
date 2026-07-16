"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import MandalaLoader from "@/components/MandalaLoader";
import { Download, ExternalLink, FileText, Image as ImageIcon, Link2, MessageSquareText, Plus, Send, ShieldCheck, Trash2, Upload, Video } from "lucide-react";
import type { WorkshopDay, WorkshopMaterial } from "@/lib/workshops";

type Workshop = {
  id: string;
  title: string;
  description: string | null;
  audience: string[];
  audience_other: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule: WorkshopDay[];
  notes: string | null;
  materials: WorkshopMaterial[];
  status: "OPEN" | "CLOSED";
  signup_token: string;
  created_at: string;
  updated_at: string;
  messages: WorkshopMessage[];
};

type WorkshopMessage = {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; full_name: string; role: string; avatar_url: string | null };
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
    back: "العودة للورش",
    signupQr: "QR التسجيل في الورشة",
    signupSub: "هذا الرمز ثابت. اعرضه في الورشة ليُنشئ المعلم حسابه ثم يكمل نموذج التقديم.",
    attendanceQr: "QR الحضور الدائم",
    attendanceSub: "رمز واحد ثابت لكل أيام الورشة. عند المسح، يسجل النظام حضور المعلم تلقائياً في تاريخ اليوم.",
    generate: "إنشاء رمز الحضور",
    generating: "جاري التوليد...",
    noCode: "لم يتم إنشاء رمز الحضور الدائم بعد.",
    open: "مفتوحة",
    closed: "مغلقة",
    close: "إغلاق الورشة",
    reopen: "إعادة فتح الورشة",
    saving: "جاري الحفظ...",
    copy: "نسخ الرابط",
    copied: "تم النسخ",
    attendance: "جدول الحضور",
    attendanceHelp: "الأخضر = حضر في هذا اليوم، الأحمر = لم يحضر. الإجمالي يوضح عدد أيام الحضور لكل معلم.",
    teacher: "المعلم",
    email: "البريد",
    total: "الإجمالي",
    status: "الحالة",
    noTeachers: "لا يوجد معلمون مرتبطون بهذه الورشة بعد. سيظهر هنا كل من سجّل عبر QR التسجيل أو سجّل حضوراً.",
    present: "حاضر",
    absent: "غائب",
    registered: "مسجلون",
    days: "أيام",
    refresh: "تحديث",
    error: "تعذر تحميل بيانات الورشة.",
    schedule: "البرنامج الزمني", workDay: "يوم تدريب", restDay: "إجازة / راحة", content: "محتوى الورشة", contentHelp: "الملفات والروابط التي ستتاح للمعلمين بعد تسجيل حضورهم.", notes: "رسالة الإدارة المثبتة", addFile: "رفع ملف", addLink: "إضافة رابط", linkTitle: "عنوان المحتوى", linkUrl: "رابط YouTube أو Drive أو أي رابط آمن", add: "إضافة", noContent: "لم تتم إضافة محتوى بعد.", remove: "حذف", exportExcel: "Excel", exportPdf: "PDF", exporting: "جاري التصدير...", discussion: "ملاحظات الورشة المشتركة", discussionHelp: "اكتب رسالة أو ملاحظة تظهر لجميع المعلمين الحاضرين. رسائل الإدارة تظهر بشكل مميز.", messagePlaceholder: "اكتب رسالة للحاضرين...", publish: "نشر", publishing: "جاري النشر...", noMessages: "لا توجد ملاحظات مشتركة بعد.", adminBadge: "الإدارة", teacherBadge: "معلم", messageError: "تعذر نشر الرسالة.", materialError: "تعذر حفظ المادة. تأكد أن الملف أقل من 40MB ثم حاول مرة أخرى.",
  },
  sq: {
    back: "Kthehu te punëtoritë",
    signupQr: "QR i regjistrimit",
    signupSub: "Ky kod është i përhershëm. Shfaqe në punëtori që mësuesi të krijojë llogarinë dhe të plotësojë aplikimin.",
    attendanceQr: "QR i përhershëm i pranisë",
    attendanceSub: "Një kod i vetëm për çdo ditë të punëtorisë. Sistemi regjistron automatikisht praninë në datën e skanimit.",
    generate: "Krijo kodin e pranisë",
    generating: "Duke gjeneruar...",
    noCode: "Kodi i përhershëm i pranisë nuk është krijuar ende.",
    open: "E hapur",
    closed: "E mbyllur",
    close: "Mbyll punëtorinë",
    reopen: "Rihap punëtorinë",
    saving: "Duke ruajtur...",
    copy: "Kopjo lidhjen",
    copied: "U kopjua",
    attendance: "Tabela e pranisë",
    attendanceHelp: "Jeshile = prezent atë ditë, e kuqe = mungesë. Totali tregon sa ditë ka marrë pjesë çdo mësues.",
    teacher: "Mësuesi",
    email: "Email",
    total: "Totali",
    status: "Statusi",
    noTeachers: "Nuk ka mësues të lidhur me këtë punëtori ende.",
    present: "Prezent",
    absent: "Mungesë",
    registered: "Të regjistruar",
    days: "ditë",
    refresh: "Rifresko",
    error: "Nuk u ngarkuan të dhënat e punëtorisë.",
    schedule: "Programi", workDay: "Ditë trajnimi", restDay: "Pushim", content: "Materialet", contentHelp: "Skedarët dhe lidhjet u hapen mësuesve pasi regjistrojnë praninë.", notes: "Mesazhi i fiksuar i administratës", addFile: "Ngarko skedar", addLink: "Shto lidhje", linkTitle: "Titulli", linkUrl: "YouTube, Drive ose lidhje tjetër", add: "Shto", noContent: "Nuk ka materiale ende.", remove: "Fshi", exportExcel: "Excel", exportPdf: "PDF", exporting: "Duke eksportuar...", discussion: "Shënimet e përbashkëta", discussionHelp: "Mesazhet e administratës shfaqen qartë për të gjithë pjesëmarrësit.", messagePlaceholder: "Shkruaj një mesazh për pjesëmarrësit...", publish: "Publiko", publishing: "Duke publikuar...", noMessages: "Nuk ka shënime ende.", adminBadge: "Administrata", teacherBadge: "Mësues", messageError: "Mesazhi nuk u publikua.", materialError: "Materiali nuk u ruajt. Skedari duhet të jetë më pak se 40MB.",
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
  const [uploading, setUploading] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", url: "" });
  const [showLink, setShowLink] = useState(false);
  const [materialError, setMaterialError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");

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
    return new Date(value).toLocaleDateString(L === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL", { timeZone: "UTC" });
  }

  async function uploadMaterial(file: File) {
    if (viewOnly) return; setUploading(true); setMaterialError("");
    try {
      const form = new FormData(); form.append("file", file); form.append("title", file.name);
      const r = await fetch(`/api/school-admin/workshops/${id}/materials`, { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "upload_failed");
      setDetail((v) => v ? { ...v, workshop: { ...v.workshop, materials: d.materials } } : v);
    } catch { setMaterialError(T.materialError); }
    finally { setUploading(false); }
  }
  async function addLink() {
    if (!linkForm.title.trim() || !linkForm.url.trim()) return; setUploading(true); setMaterialError("");
    try {
      const isVideo = /youtube|youtu\.be|vimeo/i.test(linkForm.url);
      const r = await fetch(`/api/school-admin/workshops/${id}/materials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...linkForm, type: isVideo ? "VIDEO" : "LINK" }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "link_failed");
      setDetail((v) => v ? { ...v, workshop: { ...v.workshop, materials: d.materials } } : v); setLinkForm({ title: "", url: "" }); setShowLink(false);
    } catch { setMaterialError(T.materialError); }
    finally { setUploading(false); }
  }
  async function removeMaterial(materialId: string) {
    setMaterialError("");
    try {
      const r = await fetch(`/api/school-admin/workshops/${id}/materials?materialId=${encodeURIComponent(materialId)}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "delete_failed");
      setDetail((v) => v ? { ...v, workshop: { ...v.workshop, materials: d.materials } } : v);
    } catch { setMaterialError(T.materialError); }
  }
  async function publishMessage() {
    const body = messageDraft.trim();
    if (!body || sendingMessage || viewOnly) return;
    setSendingMessage(true); setMessageError("");
    try {
      const r = await fetch(`/api/school-admin/workshops/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "message_failed");
      setDetail((current) => current ? { ...current, workshop: { ...current.workshop, messages: [...current.workshop.messages, d.message] } } : current);
      setMessageDraft("");
    } catch { setMessageError(T.messageError); }
    finally { setSendingMessage(false); }
  }
  async function exportAttendance(format: "xlsx" | "pdf") {
    if (!attendance || !detail) return;
    const headers = [T.teacher, T.email, T.status, ...attendance.days.map(fmtDate), T.total];
    const rows = attendance.teachers.map(t => [t.full_name, t.email ?? "", t.status, ...t.days_present.map(v => v ? T.present : T.absent), `${t.total_present}/${attendance.days.length}`]);
    if (format === "xlsx") {
      const XLSX = await import("xlsx"); const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); ws["!cols"] = headers.map((_,i)=>({wch:i<2?24:15})); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Attendance"); XLSX.writeFile(wb,`${detail.workshop.title}-attendance.xlsx`);
    } else {
      const table = document.querySelector<HTMLElement>(".wd-table-wrap"); if (!table) return;
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
      const canvas = await html2canvas(table, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = 277, pageHeight = 190, imageHeight = canvas.height * pageWidth / canvas.width;
      const image = canvas.toDataURL("image/png"); let position = 0;
      doc.addImage(image, "PNG", 10, 10, pageWidth, imageHeight);
      while (position + pageHeight < imageHeight) { position += pageHeight; doc.addPage(); doc.addImage(image, "PNG", 10, 10 - position, pageWidth, imageHeight); }
      doc.save(`${detail.workshop.title}-attendance.pdf`);
    }
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

      <section className="wd-card wd-program">
        <h2>{T.schedule}</h2>
        <div className="wd-days">{detail.workshop.schedule.map((day, index) => <div key={day.date} className={`wd-day ${day.type.toLowerCase()}`}><b>{index + 1}</b><span>{fmtDate(day.date)}</span><strong>{day.type === "WORK" ? T.workDay : T.restDay}</strong>{day.type === "WORK" && <small>{day.start_time || "-"} - {day.end_time || "-"}</small>}{day.label && <small>{day.label}</small>}</div>)}</div>
      </section>

      <section className="wd-card wd-materials">
        <div className="wd-table-head"><div><h2>{T.content}</h2><p>{T.contentHelp}</p></div>{!viewOnly&&<div className="wd-content-actions"><label className="wd-small-btn"><Upload size={14}/>{uploading?T.saving:T.addFile}<input hidden type="file" accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx" onChange={e=>e.target.files?.[0]&&void uploadMaterial(e.target.files[0])}/></label><button className="wd-small-btn ghost" onClick={()=>setShowLink(v=>!v)}><Plus size={14}/>{T.addLink}</button></div>}</div>
        {showLink&&<div className="wd-link-form"><input placeholder={T.linkTitle} value={linkForm.title} onChange={e=>setLinkForm({...linkForm,title:e.target.value})}/><input dir="ltr" placeholder={T.linkUrl} value={linkForm.url} onChange={e=>setLinkForm({...linkForm,url:e.target.value})}/><button className="wd-small-btn" onClick={addLink} disabled={uploading}>{T.add}</button></div>}
        {materialError&&<p className="wd-material-error" role="alert">{materialError}</p>}
        {detail.workshop.materials.length===0?<div className="wd-empty">{T.noContent}</div>:<div className="wd-material-grid">{detail.workshop.materials.map(m=><div className="wd-material" key={m.id}>{m.type==="IMAGE"?<ImageIcon/>:m.type==="VIDEO"?<Video/>:m.type==="LINK"?<Link2/>:<FileText/>}<div><strong>{m.title}</strong><small>{m.mime || m.type}</small></div><a href={m.url} target="_blank" rel="noreferrer" aria-label={m.title}><ExternalLink size={17}/></a>{!viewOnly&&<button onClick={()=>void removeMaterial(m.id)} aria-label={T.remove}><Trash2 size={16}/></button>}</div>)}</div>}
        {detail.workshop.notes&&<div className="wd-notes"><b>{T.notes}</b><p>{detail.workshop.notes}</p></div>}
      </section>

      <section className="wd-card wd-discussion">
        <div className="wd-table-head"><div><h2>{T.discussion}</h2><p>{T.discussionHelp}</p></div><MessageSquareText size={20}/></div>
        <div className="wd-messages">
          {detail.workshop.messages.length === 0 ? <div className="wd-empty">{T.noMessages}</div> : detail.workshop.messages.map(message => {
            const isAdmin = message.author.role === "SCHOOL_ADMIN" || message.author.role === "OWNER";
            return <article className={`wd-message${isAdmin ? " admin" : ""}`} key={message.id}><span className="wd-message-avatar">{message.author.full_name.trim().charAt(0).toUpperCase()}</span><div><div className="wd-message-meta"><strong>{message.author.full_name}</strong><b className={isAdmin ? "admin" : ""}>{isAdmin&&<ShieldCheck size={12}/>} {isAdmin?T.adminBadge:T.teacherBadge}</b><time>{new Date(message.created_at).toLocaleTimeString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { hour: "2-digit", minute: "2-digit" })}</time></div><p>{message.body}</p></div></article>;
          })}
        </div>
        {!viewOnly&&<div className="wd-composer"><textarea rows={3} maxLength={1500} placeholder={T.messagePlaceholder} value={messageDraft} onChange={e=>setMessageDraft(e.target.value)}/><div><span>{messageDraft.length}/1500</span><button className="wd-small-btn" onClick={()=>void publishMessage()} disabled={!messageDraft.trim()||sendingMessage}><Send size={14}/>{sendingMessage?T.publishing:T.publish}</button></div>{messageError&&<p className="wd-message-error">{messageError}</p>}</div>}
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
            {!viewOnly && !code.code && (
              <button className="wd-small-btn" onClick={generateCode} disabled={busyCode || detail.workshop.status === "CLOSED"} data-write="true">
                {busyCode ? T.generating : T.generate}
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
          <div className="wd-export"><button className="wd-small-btn ghost" onClick={() => void exportAttendance("xlsx")}><Download size={14}/>{T.exportExcel}</button><button className="wd-small-btn ghost" onClick={() => void exportAttendance("pdf")}><Download size={14}/>{T.exportPdf}</button><button className="wd-small-btn ghost" onClick={() => void loadAll()}>{T.refresh}</button></div>
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
                        {present ? "✓" : "×"}
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
.wd{font-family:'Cairo',sans-serif;color:#32101A}
.wd-back{display:inline-flex;margin-bottom:14px;color:#6B1E2D;font-weight:900;text-decoration:none;font-size:13px}
.wd-back:hover{text-decoration:underline}
.wd-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;background:linear-gradient(135deg,#10151B,#2E2414);border:1px solid rgba(184,160,130,.26);border-radius:18px;padding:24px;margin-bottom:14px;box-shadow:0 18px 44px rgba(30,20,8,.16)}
.wd-hero h1{margin:8px 0 8px;color:#F7F3EB;font-size:clamp(24px,4vw,38px);line-height:1.2;font-weight:900}
.wd-hero p{margin:0;max-width:760px;color:rgba(247,237,216,.74);line-height:1.8}
.wd-status{display:inline-flex;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:900}
.wd-status-OPEN{background:rgba(76,107,60,.18);color:#D9F0C9;border:1px solid rgba(142,183,104,.28)}
.wd-status-CLOSED{background:rgba(255,255,255,.08);color:#E8DCBC;border:1px solid rgba(255,255,255,.14)}
.wd-dates{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.wd-dates span{border:1px solid rgba(184,160,130,.18);background:rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;color:#E8DCBC;font-size:12px;font-weight:800}
.wd-hero-btn,.wd-small-btn,.wd-copy{border:0;border-radius:11px;background:#1A1A1A;color:#B8A082;padding:10px 15px;font:inherit;font-weight:900;cursor:pointer}
.wd-hero-btn:disabled,.wd-small-btn:disabled{opacity:.55;cursor:progress}.wd-small-btn{font-size:12px;padding:8px 12px}.wd-small-btn.ghost{background:#FFF;border:1.5px solid rgba(184,155,94,.28);color:#6B1E2D}
.wd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.wd-stats div{background:#FFFBF5;border:1px solid rgba(184,155,94,.18);border-radius:14px;padding:14px;box-shadow:0 10px 24px rgba(42,26,10,.06)}.wd-stats span{display:block;color:#8E7243;font-size:12px;font-weight:900}.wd-stats strong{display:block;margin-top:7px;font-size:30px;line-height:1;color:#32101A}
.wd-qr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}.wd-card{background:#FFFBF5;border:1px solid rgba(184,155,94,.20);border-radius:16px;padding:16px;box-shadow:0 12px 28px rgba(42,26,10,.07)}.wd-card-head,.wd-table-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(184,155,94,.14)}.wd-card h2,.wd-table-head h2{margin:0 0 4px;font-size:18px;font-weight:900}.wd-card p,.wd-table-head p{margin:0;color:#655B53;font-size:13px;line-height:1.75}
.wd-qr-body{display:grid;gap:10px;justify-items:center}.wd-qr-body img{width:min(320px,100%);height:auto;border:1px solid rgba(184,155,94,.22);border-radius:14px;background:#fff;padding:8px}.wd-url-box{width:100%;background:#F6F0E6;border:1px solid rgba(184,155,94,.18);border-radius:10px;padding:9px 11px;font-family:ui-monospace,Consolas,monospace;font-size:11px;overflow:auto;text-align:left;color:#4A0E1C}.wd-copy{width:100%;background:linear-gradient(180deg,#5B1526,#32101A)}
.wd-no-code{min-height:260px;display:flex;align-items:center;justify-content:center;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8C8274;font-weight:800;background:rgba(194,160,89,.04);padding:24px}
.wd-material-error{margin:0 0 10px!important;padding:9px 11px;background:#F7F3EB;border-inline-start:3px solid #6B1E2D;color:#6B1E2D!important;font-size:11px!important;font-weight:700}
.wd-discussion{margin-bottom:14px}.wd-messages{display:flex;flex-direction:column;gap:8px;max-height:520px;overflow:auto}.wd-message{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:11px;border:1px solid #E5E0D5;background:#fff}.wd-message.admin{background:#F7F3EB;border-color:#D9C9B0;border-inline-start:3px solid #6B1E2D}.wd-message-avatar{width:34px;height:34px;display:grid;place-items:center;background:#32101A;color:#D9C9B0;font-size:12px;font-weight:900}.wd-message.admin .wd-message-avatar{background:#6B1E2D;color:#F7F3EB}.wd-message-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.wd-message-meta strong{font-size:11px}.wd-message-meta b{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;background:#EFEAE0;color:#655B53;font-size:8px}.wd-message-meta b.admin{background:#6B1E2D;color:#F7F3EB}.wd-message-meta time{margin-inline-start:auto;font-size:9px;color:#8C8274}.wd-message p{margin:5px 0 0!important;white-space:pre-wrap;font-size:12px!important;color:#32101A!important}.wd-composer{margin-top:10px;padding:10px;border:1px solid #D9C9B0;background:#FFFBF5}.wd-composer textarea{width:100%;min-height:80px;resize:vertical;border:0;outline:0;background:transparent;color:#32101A;font:inherit;font-size:12px}.wd-composer>div{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #E5E0D5;padding-top:8px}.wd-composer span{font-size:9px;color:#8C8274}.wd-message-error{color:#6B1E2D!important;font-size:10px!important;margin-top:6px!important}
.wd-program,.wd-materials{margin-bottom:14px}.wd-days{display:flex;gap:0;overflow:auto;padding:12px 0}.wd-day{position:relative;min-width:155px;border-top:3px solid #4C6B3C;background:#F3F0E8;padding:13px}.wd-day:not(:last-child):after{content:'';position:absolute;top:20px;inset-inline-end:-10px;width:20px;height:2px;background:#B8A082}.wd-day.rest{border-color:#8B8178;background:#ECE9E5}.wd-day b{display:grid;place-items:center;width:24px;height:24px;background:#32101A;color:#E8DCBC;border-radius:50%;font-size:11px}.wd-day span,.wd-day strong,.wd-day small{display:block;margin-top:5px;font-size:11px}.wd-day strong{font-size:12px}.wd-day small{color:#6C625A}.wd-content-actions,.wd-export{display:flex;gap:7px;flex-wrap:wrap}.wd-content-actions label,.wd-export button{display:inline-flex;align-items:center;gap:5px}.wd-link-form{display:grid;grid-template-columns:1fr 1.5fr auto;gap:8px;margin-bottom:12px}.wd-link-form input{border:1px solid #D7CBB9;background:#fff;padding:9px 11px;font:inherit;font-size:12px}.wd-material-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}.wd-material{display:grid;grid-template-columns:28px 1fr 30px 30px;align-items:center;gap:8px;border:1px solid #E0D7C9;background:#fff;padding:11px}.wd-material>svg{color:#7A5C32}.wd-material strong,.wd-material small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-material strong{font-size:12px}.wd-material small{font-size:10px;color:#796F66}.wd-material a,.wd-material button{display:grid;place-items:center;border:0;background:none;color:#6B1E2D;cursor:pointer}.wd-notes{margin-top:12px;border-inline-start:3px solid #B8A082;background:#F5F0E7;padding:12px}.wd-notes b{font-size:12px}.wd-notes p{white-space:pre-wrap;margin-top:4px!important}
.wd-empty{padding:40px 20px;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8C8274;font-weight:800;background:#FFFBF5}.wd-table-wrap{overflow:auto;border:1px solid rgba(26,26,26,.08);border-radius:13px}.wd-table{width:100%;border-collapse:collapse;min-width:860px;background:#fff}.wd-table th{background:#F6F0E6;color:#6B1E2D;font-size:11px;font-weight:900;padding:10px;border-bottom:1px solid rgba(184,155,94,.22);white-space:nowrap}.wd-table td{padding:10px;border-bottom:1px solid rgba(26,26,26,.06);text-align:center;font-size:12.5px;color:#4A0E1C}.wd-table tr:last-child td{border-bottom:0}.wd-teacher{text-align:start!important;font-weight:900;color:#32101A!important}.wd-total{font-weight:900;color:#32101A!important}.wd-table td.present{background:rgba(76,107,60,.14);color:#3E642E;font-weight:900}.wd-table td.absent{background:rgba(163,59,46,.10);color:#9A3025;font-weight:900}
@media(max-width:980px){.wd-qr-grid,.wd-stats{grid-template-columns:1fr}.wd-hero{padding:20px}.wd-link-form{grid-template-columns:1fr}}
`;
