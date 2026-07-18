"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import type { WorkshopDay, WorkshopMaterial } from "@/lib/workshops";

type WorkshopMessage = {
  id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    full_name: string;
    role: "OWNER" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";
    avatar_url: string | null;
  };
};

type Workshop = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule: WorkshopDay[];
  notes: string | null;
  materials: WorkshopMaterial[];
  messages: WorkshopMessage[];
  status: "OPEN" | "CLOSED";
  is_live: boolean;
  live_started_at: string | null;
};

type DetailPayload = {
  workshop: Workshop;
  attended: boolean;
  attendance_days: string[];
};

const text = {
  ar: {
    back: "العودة لمسار الورش",
    attended: "تم تسجيل حضورك",
    waitingAttendance: "بانتظار تسجيل الحضور",
    open: "ورشة مفتوحة",
    closed: "ورشة مغلقة",
    day: "يوم",
    trainingDays: "أيام تدريب",
    attendanceDays: "أيام حضورك",
    program: "البرنامج الزمني",
    programSub: "خطة الورشة من أول يوم حتى آخر يوم",
    training: "يوم تدريب",
    rest: "إجازة / راحة",
    materials: "محتوى الورشة",
    materialsSub: "الشرائح والملفات والصور والروابط المضافة من الإدارة",
    adminMessage: "رسالة من الإدارة",
    adminBadge: "الإدارة",
    locked: "المحتوى متاح بعد تسجيل الحضور",
    lockedSub: "امسح QR الحضور في يوم التدريب، وبعد نجاح التسجيل ستظهر لك كل مواد الورشة وملاحظاتها هنا.",
    noMaterials: "لم تتم إضافة مواد للورشة بعد.",
    openMaterial: "فتح",
    download: "تنزيل",
    sharedNotes: "ملاحظات الورشة",
    sharedNotesSub: "مساحة مشتركة للحاضرين والإدارة. كل ملاحظة ظاهرة لجميع المشاركين.",
    noMessages: "لا توجد ملاحظات مشتركة بعد. يمكنك كتابة أول ملاحظة.",
    placeholder: "اكتب ملاحظة مفيدة للحاضرين...",
    publish: "نشر الملاحظة",
    publishing: "جارٍ النشر...",
    refresh: "تحديث",
    teacher: "معلم",
    messageError: "تعذر نشر الملاحظة. حاول مرة أخرى.",
    loadError: "تعذر تحميل تفاصيل الورشة.",
    retry: "إعادة المحاولة",
  },
  sq: {
    back: "Kthehu te forumet",
    attended: "Prania u regjistrua",
    waitingAttendance: "Në pritje të pranisë",
    open: "Forumi i hapur",
    closed: "Forumi i mbyllur",
    day: "ditë",
    trainingDays: "Ditë trajnimi",
    attendanceDays: "Ditët e pranisë",
    program: "Programi",
    programSub: "Plani i plotë nga dita e parë deri te dita e fundit",
    training: "Ditë trajnimi",
    rest: "Pushim",
    materials: "Materialet e forumit",
    materialsSub: "Prezantime, dokumente, foto dhe lidhje nga administrata",
    adminMessage: "Mesazh nga administrata",
    adminBadge: "Administrata",
    locked: "Materialet hapen pas regjistrimit të pranisë",
    lockedSub: "Skano QR-në e pranisë në ditën e trajnimit. Pas regjistrimit do të shfaqen të gjitha materialet dhe shënimet.",
    noMaterials: "Nuk ka materiale ende.",
    openMaterial: "Hap",
    download: "Shkarko",
    sharedNotes: "Shënimet e forumit",
    sharedNotesSub: "Hapësirë e përbashkët për pjesëmarrësit dhe administratën.",
    noMessages: "Nuk ka shënime ende. Shkruaj shënimin e parë.",
    placeholder: "Shkruaj një shënim të dobishëm...",
    publish: "Publiko",
    publishing: "Duke publikuar...",
    refresh: "Rifresko",
    teacher: "Mësues",
    messageError: "Shënimi nuk u publikua. Provo përsëri.",
    loadError: "Detajet e forumit nuk u ngarkuan.",
    retry: "Provo përsëri",
  },
} as const;

const liveCopy = {
  ar: { live: "الورشة مباشرة الآن", liveSince: "بدأت الورشة المباشرة" },
  sq: { live: "Forumi është drejtpërdrejt", liveSince: "Forumi drejtpërdrejt filloi" },
} as const;

export default function TeacherWorkshopDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const locale = lang === "sq" ? "sq" : "ar";
  const T = text[locale];
  const O = liveCopy[locale];
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/teacher/workshops/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      setData(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.attended && !data?.workshop.is_live) return;
    const timer = window.setInterval(() => void load(true), 45_000);
    return () => window.clearInterval(timer);
  }, [data?.attended, data?.workshop.is_live, load]);

  const formatDate = (value: string) => new Date(value).toLocaleDateString(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL",
    { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );
  const formatTime = (value: string) => new Date(value).toLocaleTimeString(
    locale === "ar" ? "ar-SA-u-nu-latn" : "sq-AL",
    { hour: "2-digit", minute: "2-digit" },
  );

  const summary = useMemo(() => {
    const schedule = data?.workshop.schedule ?? [];
    return {
      total: schedule.length,
      work: schedule.filter((day) => day.type === "WORK").length,
      attendance: data?.attendance_days.length ?? 0,
    };
  }, [data]);

  async function publishMessage() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setMessageError("");
    try {
      const response = await fetch(`/api/teacher/workshops/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "message_failed");
      setData((current) => current ? {
        ...current,
        workshop: {
          ...current.workshop,
          messages: [...current.workshop.messages, payload.message],
        },
      } : current);
      setDraft("");
    } catch {
      setMessageError(T.messageError);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <MandalaLoader />;

  if (loadError || !data?.workshop) {
    return (
      <div className="tw-detail tw-state" dir={locale === "ar" ? "rtl" : "ltr"}>
        <p>{T.loadError}</p>
        <button onClick={() => void load()}>{T.retry}</button>
        <style>{styles}</style>
      </div>
    );
  }

  const workshop = data.workshop;

  return (
    <div className="tw-detail" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Link className="tw-back" href="/teacher/workshops">{T.back}</Link>

      <header className="tw-hero">
        <div className="tw-hero-main">
          <div className="tw-badges">
            {workshop.is_live && <span className="tw-badge live"><Radio size={15} />{O.live}</span>}
            <span className={data.attended ? "tw-badge attended" : "tw-badge pending"}>
              {data.attended ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
              {data.attended ? T.attended : T.waitingAttendance}
            </span>
            <span className={`tw-badge ${workshop.status.toLowerCase()}`}>
              {workshop.status === "OPEN" ? T.open : T.closed}
            </span>
          </div>
          <h1>{workshop.title}</h1>
          {workshop.description && <p>{workshop.description}</p>}
          <div className="tw-date-line">
            <CalendarDays size={17} />
            <span>{workshop.start_date ? formatDate(workshop.start_date) : "-"}</span>
            {workshop.end_date && workshop.end_date !== workshop.start_date && <span>— {formatDate(workshop.end_date)}</span>}
          </div>
          {workshop.is_live && workshop.live_started_at && (
            <div className="tw-live-strip"><Radio size={15}/><span>{O.liveSince}: {formatTime(workshop.live_started_at)}</span></div>
          )}
        </div>
        <div className="tw-summary" aria-label="Workshop summary">
          <div><strong>{summary.total}</strong><span>{T.day}</span></div>
          <div><strong>{summary.work}</strong><span>{T.trainingDays}</span></div>
          <div><strong>{summary.attendance}</strong><span>{T.attendanceDays}</span></div>
        </div>
      </header>

      {data.attended && workshop.notes && (
        <section className="tw-admin-note">
          <div className="tw-admin-icon"><ShieldCheck size={22} /></div>
          <div>
            <span className="tw-admin-label">{T.adminMessage}</span>
            <p>{workshop.notes}</p>
          </div>
        </section>
      )}

      <section className="tw-section">
        <div className="tw-section-head">
          <div><h2>{T.materials}</h2><p>{T.materialsSub}</p></div>
          {data.attended && <span className="tw-count">{workshop.materials.length}</span>}
        </div>
        {!data.attended ? (
          <div className="tw-locked">
            <LockKeyhole size={28} />
            <strong>{T.locked}</strong>
            <p>{T.lockedSub}</p>
          </div>
        ) : workshop.materials.length === 0 ? (
          <div className="tw-empty">{T.noMaterials}</div>
        ) : (
          <div className="tw-materials">
            {workshop.materials.map((material) => (
              <MaterialCard key={material.id} material={material} openLabel={T.openMaterial} downloadLabel={T.download} />
            ))}
          </div>
        )}
      </section>

      {data.attended && (
        <section className="tw-section tw-discussion">
          <div className="tw-section-head">
            <div><h2>{T.sharedNotes}</h2><p>{T.sharedNotesSub}</p></div>
            <button className="tw-icon-button" onClick={() => void load(true)} title={T.refresh} aria-label={T.refresh}>
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="tw-messages">
            {workshop.messages.length === 0 ? (
              <div className="tw-empty"><MessageSquareText size={24} />{T.noMessages}</div>
            ) : workshop.messages.map((message) => {
              const isAdmin = message.author.role === "SCHOOL_ADMIN" || message.author.role === "OWNER";
              return (
                <article className={`tw-message${isAdmin ? " admin" : ""}`} key={message.id}>
                  <div className="tw-avatar">{message.author.full_name.trim().charAt(0).toUpperCase()}</div>
                  <div className="tw-message-body">
                    <div className="tw-message-meta">
                      <strong>{message.author.full_name}</strong>
                      <span className={isAdmin ? "admin-role" : "teacher-role"}>
                        {isAdmin && <ShieldCheck size={13} />}{isAdmin ? T.adminBadge : T.teacher}
                      </span>
                      <time>{formatTime(message.created_at)}</time>
                    </div>
                    <p>{message.body}</p>
                  </div>
                </article>
              );
            })}
          </div>

          {workshop.status === "OPEN" && (
            <div className="tw-composer">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 1500))}
                placeholder={T.placeholder}
                rows={3}
              />
              <div>
                <span>{draft.length}/1500</span>
                <button onClick={() => void publishMessage()} disabled={!draft.trim() || sending}>
                  <Send size={16} />{sending ? T.publishing : T.publish}
                </button>
              </div>
              {messageError && <p className="tw-error" role="alert">{messageError}</p>}
            </div>
          )}
        </section>
      )}

      <style>{styles}</style>
    </div>
  );
}

function MaterialCard({ material, openLabel, downloadLabel }: { material: WorkshopMaterial; openLabel: string; downloadLabel: string }) {
  const isDownload = material.type === "FILE";
  const icon = material.type === "IMAGE" ? <ImageIcon size={21} /> : material.type === "VIDEO" ? <Video size={21} /> : material.type === "LINK" ? <Link2 size={21} /> : <FileText size={21} />;
  const size = material.size ? `${(material.size / 1024 / 1024).toFixed(material.size > 1024 * 1024 ? 1 : 2)} MB` : material.mime || material.type;
  return (
    <article className="tw-material">
      <div className={`tw-material-preview ${material.type.toLowerCase()}`}>
        {material.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={material.url} alt={material.title} loading="lazy" />
        ) : icon}
      </div>
      <div className="tw-material-info"><strong>{material.title}</strong><small>{size}</small></div>
      <a href={material.url} target="_blank" rel="noreferrer" className="tw-material-action">
        {isDownload ? <Download size={16} /> : <ExternalLink size={16} />}
        <span>{isDownload ? downloadLabel : openLabel}</span>
      </a>
    </article>
  );
}

const styles = `
.tw-detail .tw-hero{position:relative;overflow:hidden;border-radius:20px;padding:30px;background:radial-gradient(circle at 85% 0,rgba(217,201,176,.13),transparent 35%),linear-gradient(145deg,#32101A,#6B1E2D)}.tw-detail .tw-badge{border-radius:999px}.tw-detail .tw-badge.live{background:#F7F3EB;color:#6B1E2D;border-color:#F7F3EB}.tw-badge.live svg,.tw-live-strip svg{animation:twLivePulse 1.4s infinite}.tw-live-strip{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:7px 10px;border-radius:999px;background:rgba(247,243,235,.12);color:#F7F3EB;font-size:10px;font-weight:800}.tw-detail .tw-summary{border-radius:14px;overflow:hidden;background:rgba(255,255,255,.035)}.tw-detail .tw-section{padding:20px;border:1px solid #E5E0D5;border-radius:16px;background:rgba(255,251,245,.78);box-shadow:0 9px 28px rgba(107,30,45,.045)}@keyframes twLivePulse{50%{opacity:.4;transform:scale(.86)}}
.tw-detail{max-width:1180px;margin:0 auto;padding:4px 0 40px;font-family:'Cairo','Tajawal',sans-serif;color:#32101A}.tw-back{display:inline-flex;color:#6B1E2D;font-size:12px;font-weight:800;text-decoration:none;margin-bottom:14px}.tw-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;padding:28px;border-radius:8px;background:#32101A;color:#F7F3EB;border:1px solid rgba(217,201,176,.26);box-shadow:0 18px 44px rgba(107,30,45,.16)}.tw-badges{display:flex;gap:8px;flex-wrap:wrap}.tw-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border:1px solid rgba(217,201,176,.26);font-size:10px;font-weight:800;color:#D9C9B0;background:rgba(255,255,255,.05)}.tw-badge.attended{color:#F7F3EB;border-color:rgba(27,94,32,.62);background:rgba(27,94,32,.34)}.tw-badge.pending{color:#D9C9B0}.tw-badge.closed{color:#D9C9B0}.tw-hero h1{margin:13px 0 5px;font-size:32px;line-height:1.25;letter-spacing:0}.tw-hero-main>p{margin:0;max-width:760px;color:#D9C9B0;font-size:14px;line-height:1.8}.tw-date-line{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:15px;color:#D9C9B0;font-size:11px}.tw-summary{display:grid;grid-template-columns:repeat(3,88px);border:1px solid rgba(217,201,176,.18)}.tw-summary div{display:flex;min-height:84px;flex-direction:column;align-items:center;justify-content:center;padding:10px;border-inline-start:1px solid rgba(217,201,176,.18)}.tw-summary div:first-child{border-inline-start:0}.tw-summary strong{font-size:22px;color:#F7F3EB}.tw-summary span{font-size:9px;color:#D9C9B0;text-align:center}.tw-admin-note{display:grid;grid-template-columns:42px 1fr;gap:13px;padding:18px 20px;margin-top:14px;background:#F7F3EB;border:1px solid #D9C9B0;border-inline-start:4px solid #6B1E2D}.tw-admin-icon{width:38px;height:38px;display:grid;place-items:center;background:#6B1E2D;color:#F7F3EB}.tw-admin-label{font-size:11px;font-weight:900;color:#6B1E2D}.tw-admin-note p{margin:4px 0 0;white-space:pre-wrap;font-size:13px;line-height:1.8}.tw-section{margin-top:18px;padding-top:18px;border-top:1px solid #D9C9B0}.tw-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.tw-section h2{font-size:19px;margin:0}.tw-section-head p{font-size:11px;color:#796A62;margin:3px 0 0}.tw-count{display:grid;place-items:center;min-width:30px;height:30px;background:#32101A;color:#D9C9B0;font-size:11px;font-weight:900}.tw-timeline{display:flex;overflow-x:auto;padding:4px 0 12px}.tw-day{position:relative;display:grid;grid-template-columns:30px 1fr;gap:9px;min-width:215px;padding:14px;background:#FFFBF5;border-top:3px solid #1B5E20;border-inline-end:1px solid #E5E0D5}.tw-day.rest{border-top-color:#8C8274;background:#EFEAE0}.tw-day-number{width:26px;height:26px;display:grid;place-items:center;background:#32101A;color:#D9C9B0;font-size:10px;font-weight:900}.tw-day time,.tw-day strong,.tw-day small{display:block}.tw-day time{font-size:10px;color:#796A62}.tw-day strong{margin-top:4px;font-size:12px}.tw-day small{margin-top:4px;font-size:10px;color:#655B53}.tw-day p{margin:5px 0 0;font-size:10px}.tw-locked,.tw-empty{min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;padding:24px;background:#F7F3EB;color:#796A62;border:1px dashed #D9C9B0}.tw-locked svg{color:#6B1E2D}.tw-locked strong{font-size:13px;color:#32101A}.tw-locked p{max-width:600px;margin:0;font-size:11px;line-height:1.8}.tw-materials{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}.tw-material{display:grid;grid-template-columns:64px minmax(0,1fr);grid-template-rows:auto auto;gap:0 12px;align-items:center;background:#FFFBF5;border:1px solid #E5E0D5;padding:10px;min-height:92px}.tw-material-preview{grid-row:1/3;width:64px;height:64px;display:grid;place-items:center;background:#EFEAE0;color:#6B1E2D;overflow:hidden}.tw-material-preview img{width:100%;height:100%;object-fit:cover}.tw-material-info{min-width:0}.tw-material-info strong,.tw-material-info small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tw-material-info strong{font-size:12px}.tw-material-info small{font-size:9px;color:#796A62;margin-top:2px}.tw-material-action{display:inline-flex;align-items:center;gap:5px;align-self:end;width:max-content;color:#6B1E2D;text-decoration:none;font-size:10px;font-weight:900}.tw-discussion{padding-bottom:10px}.tw-icon-button{width:32px;height:32px;display:grid;place-items:center;border:1px solid #D9C9B0;background:#FFFBF5;color:#6B1E2D;cursor:pointer}.tw-messages{display:flex;flex-direction:column;gap:8px;max-height:560px;overflow:auto;padding:1px}.tw-message{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:12px;background:#FFFBF5;border:1px solid #E5E0D5}.tw-message.admin{background:#F7F3EB;border-color:#D9C9B0;border-inline-start:3px solid #6B1E2D}.tw-avatar{width:34px;height:34px;display:grid;place-items:center;background:#32101A;color:#D9C9B0;font-size:12px;font-weight:900}.tw-message.admin .tw-avatar{background:#6B1E2D;color:#F7F3EB}.tw-message-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.tw-message-meta strong{font-size:11px}.tw-message-meta span{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;font-size:8px;font-weight:900;background:#EFEAE0;color:#655B53}.tw-message-meta .admin-role{background:#6B1E2D;color:#F7F3EB}.tw-message-meta time{margin-inline-start:auto;font-size:9px;color:#8C8274}.tw-message-body p{margin:5px 0 0;white-space:pre-wrap;font-size:12px;line-height:1.75;color:#32101A}.tw-composer{margin-top:12px;border:1px solid #D9C9B0;background:#FFFBF5;padding:10px}.tw-composer textarea{display:block;width:100%;resize:vertical;min-height:86px;border:0;outline:0;background:transparent;color:#32101A;font:inherit;font-size:12px;line-height:1.7}.tw-composer>div{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #E5E0D5;padding-top:9px}.tw-composer span{font-size:9px;color:#8C8274}.tw-composer button,.tw-state button{display:inline-flex;align-items:center;gap:6px;border:0;background:#6B1E2D;color:#F7F3EB;padding:9px 13px;font:inherit;font-size:10px;font-weight:900;cursor:pointer}.tw-composer button:disabled{opacity:.45;cursor:not-allowed}.tw-error{margin:8px 0 0!important;color:#6B1E2D;font-size:10px!important}.tw-state{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.tw-state p{color:#6B1E2D}.tw-state button{font-size:12px}@media(max-width:800px){.tw-detail{padding-inline:2px}.tw-hero{grid-template-columns:1fr;padding:22px;gap:20px}.tw-hero h1{font-size:25px}.tw-summary{grid-template-columns:repeat(3,1fr);width:100%}.tw-summary div{min-height:68px}.tw-admin-note{padding:15px}.tw-materials{grid-template-columns:1fr}}@media(max-width:440px){.tw-hero{padding:18px}.tw-summary span{font-size:8px}.tw-section h2{font-size:17px}.tw-message{grid-template-columns:30px 1fr;padding:10px}.tw-avatar{width:30px;height:30px}.tw-message-meta time{width:100%;margin-inline-start:0}.tw-material{grid-template-columns:54px minmax(0,1fr)}.tw-material-preview{width:54px;height:54px}}
`;
