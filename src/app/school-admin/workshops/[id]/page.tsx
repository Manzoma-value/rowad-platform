"use client";
/* QR data URIs and user avatars do not have stable dimensions for next/image. */
/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import { ProfileAvatar } from "@/components/hub/ProfileAvatar";
import { CheckCircle2, Download, ExternalLink, FileText, Image as ImageIcon, Link2, MessageSquareText, Pencil, Plus, Radio, Save, Search, Send, ShieldCheck, Trash2, Upload, UserCheck, UserPlus, Video, X } from "lucide-react";
import { makeWorkshopDays, type WorkshopDay, type WorkshopMaterial } from "@/lib/workshops";

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
  is_live: boolean;
  live_started_at: string | null;
  live_ended_at: string | null;
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
    avatar_url: string | null;
    is_active: boolean;
    days_present: boolean[];
    attendance: ({
      id: string;
      checked_in_at: string;
      source: "QR" | "MANUAL";
      recorded_by: string | null;
    } | null)[];
    total_present: number;
  }[];
};

type ActiveTeacher = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  enrolled: boolean;
  enrollment: { id: string; source: "QR" | "MANUAL"; enrolled_at: string } | null;
  attendance_count: number;
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
    attendanceHelp: "يعرض الجدول سجلات الحضور الفعلية فقط، مع وقت وطريقة تسجيل كل حضور.",
    teacher: "المعلم",
    email: "البريد",
    total: "الإجمالي",
    status: "الحالة",
    noTeachers: "لا يوجد معلمون مرتبطون بهذه الورشة بعد. سيظهر هنا كل من سجّل عبر QR التسجيل أو سجّل حضوراً.",
    present: "حاضر",
    registered: "مسجلون",
    days: "أيام",
    refresh: "تحديث",
    error: "تعذر تحميل بيانات الورشة.",
    schedule: "البرنامج الزمني", workDay: "يوم تدريب", restDay: "إجازة / راحة", content: "محتوى الورشة", contentHelp: "الملفات والروابط التي ستتاح للمعلمين بعد تسجيل حضورهم.", notes: "رسالة الإدارة المثبتة", addFile: "رفع ملف", addLink: "إضافة رابط", linkTitle: "عنوان المحتوى", linkUrl: "رابط YouTube أو Drive أو أي رابط آمن", add: "إضافة", noContent: "لم تتم إضافة محتوى بعد.", remove: "حذف", exportExcel: "Excel", exportPdf: "PDF", exporting: "جاري التصدير...", discussion: "ملاحظات الورشة المشتركة", discussionHelp: "اكتب رسالة أو ملاحظة تظهر لجميع المعلمين الحاضرين. رسائل الإدارة تظهر بشكل مميز.", messagePlaceholder: "اكتب رسالة للحاضرين...", publish: "نشر", publishing: "جاري النشر...", noMessages: "لا توجد ملاحظات مشتركة بعد.", adminBadge: "الإدارة", teacherBadge: "معلم", messageError: "تعذر نشر الرسالة.", materialError: "تعذر حفظ المادة. تأكد أن الملف أقل من 40MB ثم حاول مرة أخرى.",
  },
  sq: {
    back: "Kthehu te forumet",
    signupQr: "QR i regjistrimit",
    signupSub: "Ky kod është i përhershëm. Shfaqe në forum që mësuesi të krijojë llogarinë dhe të plotësojë aplikimin.",
    attendanceQr: "QR i përhershëm i pranisë",
    attendanceSub: "Një kod i vetëm për çdo ditë të forumit. Sistemi regjistron automatikisht praninë në datën e skanimit.",
    generate: "Krijo kodin e pranisë",
    generating: "Duke gjeneruar...",
    noCode: "Kodi i përhershëm i pranisë nuk është krijuar ende.",
    open: "E hapur",
    closed: "E mbyllur",
    close: "Mbyll forumin",
    reopen: "Rihap forumin",
    saving: "Duke ruajtur...",
    copy: "Kopjo lidhjen",
    copied: "U kopjua",
    attendance: "Tabela e pranisë",
    attendanceHelp: "Tabela shfaq vetëm regjistrimet reale të pranisë, me kohën dhe mënyrën e regjistrimit.",
    teacher: "Mësuesi",
    email: "Email",
    total: "Totali",
    status: "Statusi",
    noTeachers: "Nuk ka mësues të lidhur me këtë forum ende.",
    present: "Prezent",
    registered: "Të regjistruar",
    days: "ditë",
    refresh: "Rifresko",
    error: "Nuk u ngarkuan të dhënat e forumit.",
    schedule: "Programi", workDay: "Ditë trajnimi", restDay: "Pushim", content: "Materialet", contentHelp: "Skedarët dhe lidhjet u hapen mësuesve pasi regjistrojnë praninë.", notes: "Mesazhi i fiksuar i administratës", addFile: "Ngarko skedar", addLink: "Shto lidhje", linkTitle: "Titulli", linkUrl: "YouTube, Drive ose lidhje tjetër", add: "Shto", noContent: "Nuk ka materiale ende.", remove: "Fshi", exportExcel: "Excel", exportPdf: "PDF", exporting: "Duke eksportuar...", discussion: "Shënimet e përbashkëta", discussionHelp: "Mesazhet e administratës shfaqen qartë për të gjithë pjesëmarrësit.", messagePlaceholder: "Shkruaj një mesazh për pjesëmarrësit...", publish: "Publiko", publishing: "Duke publikuar...", noMessages: "Nuk ka shënime ende.", adminBadge: "Administrata", teacherBadge: "Mësues", messageError: "Mesazhi nuk u publikua.", materialError: "Materiali nuk u ruajt. Skedari duhet të jetë më pak se 40MB.",
  },
} as const;

const OPS = {
  ar: {
    liveNow: "الورشة مباشرة الآن",
    startLive: "بدء الورشة الآن",
    endLive: "إنهاء البث المباشر",
    liveSince: "بدأت الساعة",
    participants: "إدارة المشاركين",
    participantsSub: "أضف أي معلم نشط إلى الورشة دون الحاجة لمسح رمز QR.",
    searchTeachers: "ابحث بالاسم أو البريد الإلكتروني",
    activeTeachers: "المعلمون النشطون",
    enrolled: "مضاف للورشة",
    addTeacher: "إضافة للورشة",
    adding: "جارٍ الإضافة...",
    noActiveTeachers: "لا يوجد معلمون نشطون مطابقون.",
    manualAttendance: "تسجيل حضور يدوي",
    checkIn: "تسجيل الآن",
    checkedAt: "وقت الدخول",
    qrSource: "عبر QR",
    manualSource: "يدوي",
    late: "متأخر",
    removeAttendance: "حذف سجل الحضور",
    removeConfirm: "هل تريد حذف سجل الحضور هذا؟",
    operationError: "تعذر تنفيذ العملية. حاول مرة أخرى.",
    closePanel: "إغلاق",
  },
  sq: {
    liveNow: "Forumi është drejtpërdrejt",
    startLive: "Fillo forumin tani",
    endLive: "Përfundo sesionin live",
    liveSince: "Filloi në",
    participants: "Menaxho pjesëmarrësit",
    participantsSub: "Shto çdo mësues aktiv pa skanuar kodin QR.",
    searchTeachers: "Kërko me emër ose email",
    activeTeachers: "Mësuesit aktivë",
    enrolled: "I shtuar",
    addTeacher: "Shto në forum",
    adding: "Duke shtuar...",
    noActiveTeachers: "Nuk ka mësues aktivë që përputhen.",
    manualAttendance: "Regjistro praninë manualisht",
    checkIn: "Regjistro tani",
    checkedAt: "Ora e hyrjes",
    qrSource: "Me QR",
    manualSource: "Manuale",
    late: "Me vonesë",
    removeAttendance: "Fshi praninë",
    removeConfirm: "Ta fshijmë këtë regjistrim të pranisë?",
    operationError: "Veprimi nuk u krye. Provo përsëri.",
    closePanel: "Mbyll",
  },
} as const;

const EDIT = {
  ar: {
    action: "تعديل التفاصيل",
    title: "عنوان الورشة",
    description: "وصف الورشة",
    start: "تاريخ البداية (ميلادي)",
    end: "تاريخ النهاية (ميلادي)",
    program: "أيام البرنامج",
    work: "يوم تدريب",
    rest: "إجازة / راحة",
    helper: "اكتب عنواناً واضحاً ووصفاً مختصراً يوضح هدف الورشة للحاضرين.",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ...",
    cancel: "إلغاء",
    required: "عنوان الورشة مطلوب.",
  },
  sq: {
    action: "Ndrysho detajet",
    title: "Titulli i forumit",
    description: "Përshkrimi i forumit",
    start: "Data e fillimit",
    end: "Data e mbarimit",
    program: "Ditët e programit",
    work: "Ditë trajnimi",
    rest: "Pushim",
    helper: "Përdor një titull të qartë dhe një përshkrim të shkurtër për pjesëmarrësit.",
    save: "Ruaj ndryshimet",
    saving: "Duke ruajtur...",
    cancel: "Anulo",
    required: "Titulli i forumit kërkohet.",
  },
} as const;

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const O = OPS[L];
  const E = EDIT[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const viewOnly = useViewOnly();
  const confirm = useConfirm();

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
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [roster, setRoster] = useState<ActiveTeacher[]>([]);
  const [rosterQuery, setRosterQuery] = useState("");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [mutatingTeacher, setMutatingTeacher] = useState<string | null>(null);
  const [attendanceBusy, setAttendanceBusy] = useState<string | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [editingBasics, setEditingBasics] = useState(false);
  const [savingBasics, setSavingBasics] = useState(false);
  const [basicsForm, setBasicsForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    schedule: [] as WorkshopDay[],
  });

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
    const presentCells = teachers.reduce((sum, t) => sum + t.total_present, 0);
    return { teachers: teachers.length, days: days.length, presentCells };
  }, [attendance]);

  const visibleRoster = useMemo(() => {
    const query = rosterQuery.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter((teacher) => `${teacher.full_name} ${teacher.email ?? ""}`.toLowerCase().includes(query));
  }, [roster, rosterQuery]);

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

  function openBasicsEditor() {
    if (!detail) return;
    setOperationError("");
    setBasicsForm({
      title: detail.workshop.title,
      description: detail.workshop.description ?? "",
      start_date: detail.workshop.start_date?.slice(0, 10) ?? "",
      end_date: detail.workshop.end_date?.slice(0, 10) ?? "",
      schedule: detail.workshop.schedule,
    });
    setEditingBasics(true);
  }

  async function saveBasics() {
    if (!detail || viewOnly || savingBasics) return;
    const title = basicsForm.title.trim();
    if (!title) {
      setOperationError(E.required);
      return;
    }
    setSavingBasics(true);
    setOperationError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: basicsForm.description,
          start_date: basicsForm.start_date,
          end_date: basicsForm.end_date,
          schedule: basicsForm.schedule,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.workshop) throw new Error("workshop_basics");
      setDetail((current) => current ? {
        ...current,
        workshop: { ...current.workshop, ...payload.workshop },
      } : current);
      setEditingBasics(false);
    } catch {
      setOperationError(O.operationError);
    } finally {
      setSavingBasics(false);
    }
  }

  async function toggleLive() {
    if (!detail || viewOnly || liveBusy) return;
    setLiveBusy(true);
    setOperationError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_live: !detail.workshop.is_live }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.workshop) throw new Error("live");
      setDetail((current) => current ? {
        ...current,
        workshop: { ...current.workshop, ...payload.workshop },
      } : current);
    } catch {
      setOperationError(O.operationError);
    } finally {
      setLiveBusy(false);
    }
  }

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    setOperationError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${id}/teachers`, { cache: "no-store" });
      if (!response.ok) throw new Error("teachers");
      const payload = await response.json();
      setRoster(payload.teachers ?? []);
    } catch {
      setOperationError(OPS[L].operationError);
    } finally {
      setRosterLoading(false);
    }
  }, [L, id]);

  async function openParticipants() {
    setParticipantsOpen(true);
    await loadRoster();
  }

  async function addTeacher(teacherId: string) {
    if (viewOnly || mutatingTeacher) return;
    setMutatingTeacher(teacherId);
    setOperationError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${id}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId }),
      });
      if (!response.ok) throw new Error("enroll");
      setRoster((current) => current.map((teacher) => teacher.teacher_id === teacherId
        ? { ...teacher, enrolled: true }
        : teacher));
      await loadAll();
    } catch {
      setOperationError(O.operationError);
    } finally {
      setMutatingTeacher(null);
    }
  }

  async function markAttendance(teacherId: string, dayDate: string) {
    if (viewOnly || attendanceBusy) return;
    const key = `${teacherId}:${dayDate}`;
    setAttendanceBusy(key);
    setOperationError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId, day_date: dayDate }),
      });
      if (!response.ok) throw new Error("attendance");
      await loadAll();
    } catch {
      setOperationError(O.operationError);
    } finally {
      setAttendanceBusy(null);
    }
  }

  async function removeAttendance(attendanceId: string) {
    if (viewOnly || attendanceBusy) return;
    const approved = await confirm({ message: O.removeConfirm });
    if (!approved) return;
    setAttendanceBusy(attendanceId);
    setOperationError("");
    try {
      const response = await fetch(`/api/school-admin/workshops/${id}/attendance?attendance_id=${encodeURIComponent(attendanceId)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("attendance");
      await loadAll();
    } catch {
      setOperationError(O.operationError);
    } finally {
      setAttendanceBusy(null);
    }
  }

  function fmtDate(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(L === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL", { timeZone: "UTC" });
  }

  function fmtTime(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function isLate(checkIn: string, day: string) {
    const start = detail?.workshop.schedule.find((item) => item.date === day)?.start_time;
    if (!start) return false;
    return new Date(checkIn).getTime() > new Date(`${day}T${start}:00`).getTime();
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
    const rows = attendance.teachers.map(t => [
      t.full_name,
      t.email ?? "",
      t.status,
      ...t.attendance.map(entry => entry ? `${T.present} - ${fmtTime(entry.checked_in_at)} (${entry.source === "MANUAL" ? O.manualSource : O.qrSource})` : ""),
      `${t.total_present}/${attendance.days.length}`,
    ]);
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

      <header className={`wd-hero${detail.workshop.is_live ? " is-live" : ""}`}>
        <div>
          <div className="wd-hero-badges">
            <span className={`wd-status wd-status-${detail.workshop.status}`}>
              {detail.workshop.status === "OPEN" ? T.open : T.closed}
            </span>
            {detail.workshop.is_live && <span className="wd-live-badge"><Radio size={14}/>{O.liveNow}</span>}
          </div>
          <h1>{detail.workshop.title}</h1>
          {detail.workshop.description && <p>{detail.workshop.description}</p>}
          <div className="wd-dates">
            <span>{fmtDate(detail.workshop.start_date)}</span>
            <span>{fmtDate(detail.workshop.end_date)}</span>
          </div>
        </div>
        {!viewOnly && <div className="wd-hero-actions" data-write="true">
          <button className="wd-edit-btn" onClick={openBasicsEditor}><Pencil size={16}/>{E.action}</button>
          <button className={`wd-live-toggle${detail.workshop.is_live ? " active" : ""}`} onClick={toggleLive} disabled={liveBusy}>
            <Radio size={16}/>{liveBusy ? T.saving : detail.workshop.is_live ? O.endLive : O.startLive}
          </button>
          <button className="wd-hero-btn" onClick={toggleStatus} disabled={busyStatus}>
            {busyStatus ? T.saving : detail.workshop.status === "OPEN" ? T.close : T.reopen}
          </button>
        </div>}
      </header>

      {detail.workshop.is_live && detail.workshop.live_started_at && (
        <div className="wd-live-strip"><span/><strong>{O.liveNow}</strong><small>{O.liveSince} {fmtTime(detail.workshop.live_started_at)}</small></div>
      )}
      {operationError && <p className="wd-operation-error" role="alert">{operationError}</p>}

      <section className="wd-stats">
        <div><span>{T.registered}</span><strong>{summary.teachers}</strong></div>
        <div><span>{T.days}</span><strong>{summary.days}</strong></div>
        <div><span>{T.present}</span><strong>{summary.presentCells}</strong></div>
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
            return <article className={`wd-message${isAdmin ? " admin" : ""}`} key={message.id}><ProfileAvatar author={message.author} lang={L} size={34} /><div><div className="wd-message-meta"><strong>{message.author.full_name}</strong><b className={isAdmin ? "admin" : ""}>{isAdmin&&<ShieldCheck size={12}/>} {isAdmin?T.adminBadge:T.teacherBadge}</b><time>{new Date(message.created_at).toLocaleTimeString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { hour: "2-digit", minute: "2-digit" })}</time></div><p>{message.body}</p></div></article>;
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

      <section className="wd-card wd-attendance-card">
        <div className="wd-table-head">
          <div>
            <h2>{T.attendance}</h2>
            <p>{T.attendanceHelp}</p>
          </div>
          <div className="wd-export">
            {!viewOnly && <button className="wd-small-btn wd-participants-btn" onClick={() => void openParticipants()} data-write="true"><UserPlus size={14}/>{O.participants}</button>}
            <button className="wd-small-btn ghost" onClick={() => void exportAttendance("xlsx")}><Download size={14}/>{T.exportExcel}</button>
            <button className="wd-small-btn ghost" onClick={() => void exportAttendance("pdf")}><Download size={14}/>{T.exportPdf}</button>
            <button className="wd-small-btn ghost" onClick={() => void loadAll()}>{T.refresh}</button>
          </div>
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
                  {attendance.days.map((day) => <th key={day}><span>{fmtDate(day)}</span><small>{detail.workshop.schedule.find(item => item.date === day)?.start_time ?? ""}</small></th>)}
                  <th>{T.total}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.teachers.map((teacher) => (
                  <tr key={teacher.teacher_id}>
                    <td className="wd-teacher">{teacher.full_name}</td>
                    <td dir="ltr">{teacher.email ?? "-"}</td>
                    <td>{teacher.status}</td>
                    {teacher.attendance.map((entry, index) => {
                      const day = attendance.days[index];
                      const busyKey = `${teacher.teacher_id}:${day}`;
                      return <td key={day} className={entry ? "present" : "unrecorded"}>
                        {entry ? <div className="wd-checkin">
                          <CheckCircle2 size={16}/>
                          <time title={O.checkedAt}>{fmtTime(entry.checked_in_at)}</time>
                          <small>{entry.source === "MANUAL" ? O.manualSource : O.qrSource}</small>
                          {isLate(entry.checked_in_at, day) && <small className="wd-late">{O.late}</small>}
                          {!viewOnly && <button onClick={() => void removeAttendance(entry.id)} disabled={attendanceBusy === entry.id} aria-label={O.removeAttendance} title={O.removeAttendance}><Trash2 size={13}/></button>}
                        </div> : <button className="wd-mark-present" onClick={() => void markAttendance(teacher.teacher_id, day)} disabled={viewOnly || attendanceBusy === busyKey} title={O.manualAttendance}>
                          <UserCheck size={15}/><span>{attendanceBusy === busyKey ? T.saving : O.checkIn}</span>
                        </button>}
                      </td>;
                    })}
                    <td className="wd-total">{teacher.total_present} / {attendance.days.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {participantsOpen && <div className="wd-people-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setParticipantsOpen(false); }}>
        <section className="wd-people-panel" role="dialog" aria-modal="true" aria-label={O.participants}>
          <header>
            <div><span><UserPlus size={16}/>{O.activeTeachers}</span><h2>{O.participants}</h2><p>{O.participantsSub}</p></div>
            <button onClick={() => setParticipantsOpen(false)} aria-label={O.closePanel}><X size={20}/></button>
          </header>
          <label className="wd-people-search"><Search size={17}/><input autoFocus value={rosterQuery} onChange={(event) => setRosterQuery(event.target.value)} placeholder={O.searchTeachers}/></label>
          {operationError && <p className="wd-operation-error" role="alert">{operationError}</p>}
          <div className="wd-people-list">
            {rosterLoading ? <MandalaLoader/> : visibleRoster.length === 0 ? <div className="wd-empty">{O.noActiveTeachers}</div> : visibleRoster.map((teacher) => <article key={teacher.teacher_id} className={teacher.enrolled ? "enrolled" : ""}>
              <span className="wd-person-avatar">{teacher.avatar_url ? <img src={teacher.avatar_url} alt=""/> : teacher.full_name.trim().charAt(0).toUpperCase()}</span>
              <div><strong>{teacher.full_name}</strong><small dir="ltr">{teacher.email ?? "-"}</small></div>
              {teacher.enrolled ? <span className="wd-enrolled"><CheckCircle2 size={14}/>{O.enrolled}</span> : <button onClick={() => void addTeacher(teacher.teacher_id)} disabled={mutatingTeacher === teacher.teacher_id}><UserPlus size={14}/>{mutatingTeacher === teacher.teacher_id ? O.adding : O.addTeacher}</button>}
            </article>)}
          </div>
        </section>
      </div>}

      {editingBasics && <div className="wd-edit-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingBasics) setEditingBasics(false); }}>
        <section className="wd-edit-dialog" role="dialog" aria-modal="true" aria-label={E.action}>
          <header><div><span><Pencil size={16}/>{E.action}</span><h2>{E.title}</h2><p>{E.helper}</p></div><button onClick={() => setEditingBasics(false)} disabled={savingBasics} aria-label={E.cancel}><X size={20}/></button></header>
          <label>{E.title}<input autoFocus maxLength={200} value={basicsForm.title} onChange={(event) => setBasicsForm((current) => ({ ...current, title: event.target.value }))}/></label>
          <label>{E.description}<textarea rows={5} maxLength={1000} value={basicsForm.description} onChange={(event) => setBasicsForm((current) => ({ ...current, description: event.target.value }))}/></label>
          <div className="wd-edit-date-row">
            <label>{E.start}<input type="date" value={basicsForm.start_date} onChange={(event) => { const start = event.target.value; setBasicsForm((current) => ({ ...current, start_date: start, schedule: makeWorkshopDays(start, current.end_date, current.schedule) })); }}/></label>
            <label>{E.end}<input type="date" min={basicsForm.start_date} value={basicsForm.end_date} onChange={(event) => { const end = event.target.value; setBasicsForm((current) => ({ ...current, end_date: end, schedule: makeWorkshopDays(current.start_date, end, current.schedule) })); }}/></label>
          </div>
          {basicsForm.schedule.length > 0 && <fieldset className="wd-edit-program"><legend>{E.program}</legend><div className="wd-edit-days">{basicsForm.schedule.map((day, index) => <div className={`wd-edit-day ${day.type.toLowerCase()}`} key={day.date}><span>{fmtDate(day.date)}</span><button type="button" onClick={() => setBasicsForm((current) => ({ ...current, schedule: current.schedule.map((entry, entryIndex) => entryIndex === index ? { ...entry, type: entry.type === "WORK" ? "REST" : "WORK" } : entry) }))}>{day.type === "WORK" ? E.work : E.rest}</button>{day.type === "WORK" && <><input type="time" value={day.start_time ?? ""} onChange={(event) => setBasicsForm((current) => ({ ...current, schedule: current.schedule.map((entry, entryIndex) => entryIndex === index ? { ...entry, start_time: event.target.value } : entry) }))}/><input type="time" value={day.end_time ?? ""} onChange={(event) => setBasicsForm((current) => ({ ...current, schedule: current.schedule.map((entry, entryIndex) => entryIndex === index ? { ...entry, end_time: event.target.value } : entry) }))}/></>}</div>)}</div></fieldset>}
          <div className="wd-edit-actions"><button className="ghost" onClick={() => setEditingBasics(false)} disabled={savingBasics}>{E.cancel}</button><button onClick={() => void saveBasics()} disabled={savingBasics || !basicsForm.title.trim() || !basicsForm.schedule.length}><Save size={16}/>{savingBasics ? E.saving : E.save}</button></div>
        </section>
      </div>}

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
.wd-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.wd-stats div{background:#FFFBF5;border:1px solid rgba(184,155,94,.18);border-radius:14px;padding:14px;box-shadow:0 10px 24px rgba(42,26,10,.06)}.wd-stats span{display:block;color:#8E7243;font-size:12px;font-weight:900}.wd-stats strong{display:block;margin-top:7px;font-size:30px;line-height:1;color:#32101A}
.wd-qr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}.wd-card{background:#FFFBF5;border:1px solid rgba(184,155,94,.20);border-radius:16px;padding:16px;box-shadow:0 12px 28px rgba(42,26,10,.07)}.wd-card-head,.wd-table-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(184,155,94,.14)}.wd-card h2,.wd-table-head h2{margin:0 0 4px;font-size:18px;font-weight:900}.wd-card p,.wd-table-head p{margin:0;color:#655B53;font-size:13px;line-height:1.75}
.wd-qr-body{display:grid;gap:10px;justify-items:center}.wd-qr-body img{width:min(320px,100%);height:auto;border:1px solid rgba(184,155,94,.22);border-radius:14px;background:#fff;padding:8px}.wd-url-box{width:100%;background:#F6F0E6;border:1px solid rgba(184,155,94,.18);border-radius:10px;padding:9px 11px;font-family:ui-monospace,Consolas,monospace;font-size:11px;overflow:auto;text-align:left;color:#4A0E1C}.wd-copy{width:100%;background:linear-gradient(180deg,#5B1526,#32101A)}
.wd-no-code{min-height:260px;display:flex;align-items:center;justify-content:center;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8C8274;font-weight:800;background:rgba(194,160,89,.04);padding:24px}
.wd-material-error{margin:0 0 10px!important;padding:9px 11px;background:#F7F3EB;border-inline-start:3px solid #6B1E2D;color:#6B1E2D!important;font-size:11px!important;font-weight:700}
.wd-discussion{margin-bottom:14px}.wd-messages{display:flex;flex-direction:column;gap:8px;max-height:520px;overflow:auto}.wd-message{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:11px;border:1px solid #E5E0D5;background:#fff}.wd-message.admin{background:#F7F3EB;border-color:#D9C9B0;border-inline-start:3px solid #6B1E2D}.wd-message-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.wd-message-meta strong{font-size:11px}.wd-message-meta b{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;background:#EFEAE0;color:#655B53;font-size:8px}.wd-message-meta b.admin{background:#6B1E2D;color:#F7F3EB}.wd-message-meta time{margin-inline-start:auto;font-size:9px;color:#8C8274}.wd-message p{margin:5px 0 0!important;white-space:pre-wrap;font-size:12px!important;color:#32101A!important}.wd-composer{margin-top:10px;padding:10px;border:1px solid #D9C9B0;background:#FFFBF5}.wd-composer textarea{width:100%;min-height:80px;resize:vertical;border:0;outline:0;background:transparent;color:#32101A;font:inherit;font-size:12px}.wd-composer>div{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #E5E0D5;padding-top:8px}.wd-composer span{font-size:9px;color:#8C8274}.wd-message-error{color:#6B1E2D!important;font-size:10px!important;margin-top:6px!important}
.wd-program,.wd-materials{margin-bottom:14px}.wd-days{display:flex;gap:0;overflow:auto;padding:12px 0}.wd-day{position:relative;min-width:155px;border-top:3px solid #4C6B3C;background:#F3F0E8;padding:13px}.wd-day:not(:last-child):after{content:'';position:absolute;top:20px;inset-inline-end:-10px;width:20px;height:2px;background:#B8A082}.wd-day.rest{border-color:#8B8178;background:#ECE9E5}.wd-day b{display:grid;place-items:center;width:24px;height:24px;background:#32101A;color:#E8DCBC;border-radius:50%;font-size:11px}.wd-day span,.wd-day strong,.wd-day small{display:block;margin-top:5px;font-size:11px}.wd-day strong{font-size:12px}.wd-day small{color:#6C625A}.wd-content-actions,.wd-export{display:flex;gap:7px;flex-wrap:wrap}.wd-content-actions label,.wd-export button{display:inline-flex;align-items:center;gap:5px}.wd-link-form{display:grid;grid-template-columns:1fr 1.5fr auto;gap:8px;margin-bottom:12px}.wd-link-form input{border:1px solid #D7CBB9;background:#fff;padding:9px 11px;font:inherit;font-size:12px}.wd-material-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}.wd-material{display:grid;grid-template-columns:28px 1fr 30px 30px;align-items:center;gap:8px;border:1px solid #E0D7C9;background:#fff;padding:11px}.wd-material>svg{color:#7A5C32}.wd-material strong,.wd-material small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-material strong{font-size:12px}.wd-material small{font-size:10px;color:#796F66}.wd-material a,.wd-material button{display:grid;place-items:center;border:0;background:none;color:#6B1E2D;cursor:pointer}.wd-notes{margin-top:12px;border-inline-start:3px solid #B8A082;background:#F5F0E7;padding:12px}.wd-notes b{font-size:12px}.wd-notes p{white-space:pre-wrap;margin-top:4px!important}
.wd-empty{padding:40px 20px;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;color:#8C8274;font-weight:800;background:#FFFBF5}.wd-table-wrap{overflow:auto;border:1px solid rgba(26,26,26,.08);border-radius:13px}.wd-table{width:100%;border-collapse:collapse;min-width:860px;background:#fff}.wd-table th{background:#F6F0E6;color:#6B1E2D;font-size:11px;font-weight:900;padding:10px;border-bottom:1px solid rgba(184,155,94,.22);white-space:nowrap}.wd-table td{padding:10px;border-bottom:1px solid rgba(26,26,26,.06);text-align:center;font-size:12.5px;color:#4A0E1C}.wd-table tr:last-child td{border-bottom:0}.wd-teacher{text-align:start!important;font-weight:900;color:#32101A!important}.wd-total{font-weight:900;color:#32101A!important}.wd-table td.present{background:rgba(76,107,60,.14);color:#3E642E;font-weight:900}.wd-table td.unrecorded{background:#FFFBF5;color:#8C8274}
@media(max-width:980px){.wd-qr-grid,.wd-stats{grid-template-columns:1fr}.wd-hero{padding:20px}.wd-link-form{grid-template-columns:1fr}}

/* Workshop operations refresh */
.wd{max-width:1280px;margin:0 auto}.wd-card{border-radius:22px;padding:clamp(15px,2.3vw,24px);border-color:rgba(107,30,45,.12);box-shadow:0 16px 42px rgba(50,16,26,.075)}
.wd-hero{position:relative;overflow:hidden;border-radius:26px;padding:clamp(22px,4vw,38px);background:linear-gradient(125deg,#250B12,#4A0E1C 62%,#6B1E2D);border-color:rgba(217,201,176,.3)}
.wd-hero:after{content:'';position:absolute;width:320px;height:320px;border-radius:50%;inset-inline-end:-110px;top:-170px;background:radial-gradient(circle,rgba(217,201,176,.22),transparent 68%);pointer-events:none}.wd-hero.is-live{box-shadow:0 22px 60px rgba(107,30,45,.25),0 0 0 2px rgba(184,160,130,.2)}
.wd-hero-badges,.wd-hero-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:relative;z-index:1}.wd-hero-actions{flex-direction:column;align-items:stretch;min-width:min(100%,220px)}
.wd-edit-btn{display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(217,201,176,.34);border-radius:12px;padding:11px 15px;background:#F7F3EB;color:#6B1E2D;font:800 12px 'Cairo',sans-serif;cursor:pointer}
.wd-live-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;background:#F7F3EB;color:#6B1E2D;font-size:11px;font-weight:900;box-shadow:0 0 0 5px rgba(247,243,235,.08)}.wd-live-badge svg{animation:wd-pulse 1.4s ease-in-out infinite}
.wd-live-toggle{display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(217,201,176,.34);border-radius:12px;padding:11px 15px;background:rgba(255,255,255,.08);color:#F7F3EB;font:800 12px 'Cairo',sans-serif;cursor:pointer}.wd-live-toggle.active{background:#F7F3EB;color:#6B1E2D}.wd-live-toggle:disabled{opacity:.55;cursor:progress}
.wd-live-strip{display:flex;align-items:center;justify-content:center;gap:8px;margin:-2px 0 14px;padding:10px 14px;border:1px solid rgba(107,30,45,.14);border-radius:14px;background:linear-gradient(90deg,rgba(107,30,45,.07),rgba(255,255,255,.84),rgba(107,30,45,.07));color:#6B1E2D}.wd-live-strip>span{width:9px;height:9px;border-radius:50%;background:#6B1E2D;box-shadow:0 0 0 5px rgba(107,30,45,.1);animation:wd-pulse 1.4s infinite}.wd-live-strip strong{font-size:12px}.wd-live-strip small{font-size:10px;color:#796A62}
@keyframes wd-pulse{50%{opacity:.35;transform:scale(.82)}}
.wd-operation-error{margin:0 0 13px;padding:10px 12px;border-radius:11px;background:rgba(107,30,45,.08);border:1px solid rgba(107,30,45,.15);color:#6B1E2D;font-size:11px;font-weight:800}
.wd-participants-btn{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#32101A,#6B1E2D);color:#F7F3EB}.wd-attendance-card{margin-top:14px}.wd-attendance-card .wd-table-head{align-items:center}.wd-table th span,.wd-table th small{display:block}.wd-table th small{margin-top:3px;color:#8C8274;font-weight:700}.wd-table td.present,.wd-table td.unrecorded{min-width:116px;padding:7px}
.wd-checkin{position:relative;display:grid;justify-items:center;gap:2px;min-height:62px;padding:5px 26px 5px 5px;color:#315724}.wd-checkin time{font:900 12px ui-monospace,Consolas,monospace;direction:ltr}.wd-checkin small{font-size:8px;font-weight:900;color:#5D7355}.wd-checkin button{position:absolute;inset-inline-end:3px;top:3px;width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:8px;background:rgba(107,30,45,.08);color:#6B1E2D;cursor:pointer}.wd-checkin button:hover{background:#6B1E2D;color:#fff}
.wd-checkin .wd-late{padding:2px 6px;border-radius:999px;background:#F6D9D6;color:#8B2332}
.wd-mark-present{width:100%;min-height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px dashed rgba(107,30,45,.22);border-radius:10px;background:rgba(255,255,255,.7);color:#6B1E2D;font:800 9px 'Cairo',sans-serif;cursor:pointer}.wd-mark-present:hover{background:#F7F3EB;border-style:solid}.wd-mark-present:disabled{opacity:.5;cursor:progress}
.wd-people-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:stretch;justify-content:flex-end;background:rgba(26,26,26,.56);backdrop-filter:blur(7px)}[dir='rtl'] .wd-people-overlay{justify-content:flex-start}.wd-people-panel{width:min(520px,100%);height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#FFFBF5,#EFEAE0);box-shadow:0 0 70px rgba(26,26,26,.28);animation:wd-panel-in .22s ease-out}.wd-people-panel>header{display:flex;justify-content:space-between;gap:14px;padding:24px;background:linear-gradient(135deg,#250B12,#6B1E2D);color:#F7F3EB}.wd-people-panel>header span{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:10px;font-weight:900}.wd-people-panel>header h2{margin:4px 0;font-size:23px}.wd-people-panel>header p{margin:0;color:rgba(247,243,235,.7);font-size:12px;line-height:1.7}.wd-people-panel>header button{width:38px;height:38px;display:grid;place-items:center;flex:none;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.wd-people-search{display:flex;align-items:center;gap:9px;margin:16px 16px 8px;padding:0 12px;border:1px solid #D9C9B0;border-radius:13px;background:#fff}.wd-people-search input{width:100%;border:0;outline:0;padding:11px 0;background:transparent;font:inherit;font-size:13px}.wd-people-list{flex:1;overflow:auto;padding:8px 16px 22px}.wd-people-list article{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:10px;margin-bottom:8px;padding:11px;border:1px solid rgba(107,30,45,.1);border-radius:15px;background:#fff}.wd-people-list article.enrolled{background:rgba(217,201,176,.24)}.wd-person-avatar{width:44px;height:44px;display:grid;place-items:center;overflow:hidden;border-radius:14px;background:#32101A;color:#D9C9B0;font-weight:900}.wd-person-avatar img{width:100%;height:100%;object-fit:cover}.wd-people-list strong,.wd-people-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-people-list strong{font-size:12px}.wd-people-list small{font-size:10px;color:#796A62}.wd-people-list article>button,.wd-enrolled{display:flex;align-items:center;gap:5px;border:0;border-radius:10px;padding:8px 10px;background:#6B1E2D;color:#fff;font:800 10px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}.wd-enrolled{background:rgba(49,87,36,.1);color:#315724}.wd-people-list article>button:disabled{opacity:.55;cursor:progress}
.wd-edit-overlay{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;padding:18px;background:rgba(26,26,26,.58);backdrop-filter:blur(7px)}.wd-edit-dialog{width:min(650px,100%);border:1px solid rgba(217,201,176,.45);border-radius:22px;overflow:hidden;background:#FFFBF5;box-shadow:0 28px 90px rgba(26,26,26,.32)}.wd-edit-dialog>header{display:flex;justify-content:space-between;gap:16px;padding:22px 24px;background:linear-gradient(135deg,#250B12,#6B1E2D);color:#F7F3EB}.wd-edit-dialog>header span{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:10px;font-weight:900}.wd-edit-dialog>header h2{margin:5px 0;font-size:23px}.wd-edit-dialog>header p{margin:0;color:rgba(247,243,235,.74);font-size:12px;line-height:1.7}.wd-edit-dialog>header button{width:38px;height:38px;display:grid;place-items:center;flex:none;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.wd-edit-dialog>label{display:block;margin:18px 24px 0;color:#4A0E1C;font-size:12px;font-weight:900}.wd-edit-dialog input,.wd-edit-dialog textarea{box-sizing:border-box;width:100%;margin-top:7px;border:1px solid #D9C9B0;border-radius:12px;background:#fff;padding:11px 12px;color:#32101A;font:inherit;font-size:13px;outline:none}.wd-edit-dialog textarea{resize:vertical;min-height:120px;line-height:1.75}.wd-edit-dialog input:focus,.wd-edit-dialog textarea:focus{border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}.wd-edit-actions{display:flex;justify-content:flex-end;gap:8px;padding:20px 24px}.wd-edit-actions button{display:flex;align-items:center;gap:6px;border:0;border-radius:11px;padding:10px 14px;background:#6B1E2D;color:#F7F3EB;font:800 12px 'Cairo',sans-serif;cursor:pointer}.wd-edit-actions button.ghost{border:1px solid #D9C9B0;background:#fff;color:#6B1E2D}.wd-edit-actions button:disabled{opacity:.55;cursor:progress}
.wd-edit-dialog{width:min(760px,100%);max-height:92vh;overflow:auto}.wd-edit-date-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 24px 0}.wd-edit-date-row label{color:#4A0E1C;font-size:12px;font-weight:900}.wd-edit-program{margin:18px 24px 0;padding:12px;border:1px solid #D9C9B0;border-radius:12px}.wd-edit-program legend{padding:0 6px;color:#4A0E1C;font-size:12px;font-weight:900}.wd-edit-days{display:grid;gap:7px}.wd-edit-day{display:grid;grid-template-columns:minmax(150px,1fr) 110px 105px 105px;align-items:center;gap:7px;padding:8px;background:#F7F3EB;border-inline-start:3px solid #4C6B3C}.wd-edit-day.rest{grid-template-columns:minmax(150px,1fr) 110px;border-inline-start-color:#8C8274;background:#EFEAE0}.wd-edit-day>span{font-size:11px;font-weight:900}.wd-edit-day>button{min-height:38px;border:1px solid #D9C9B0;border-radius:8px;background:#fff;color:#6B1E2D;font:800 11px 'Cairo',sans-serif;cursor:pointer}.wd-edit-day input{margin:0;padding:8px;font-size:11px}
@keyframes wd-panel-in{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}[dir='rtl'] .wd-people-panel{animation-name:wd-panel-in-rtl}@keyframes wd-panel-in-rtl{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
@media(max-width:720px){.wd{padding-bottom:12px}.wd-hero{border-radius:20px}.wd-hero-actions{width:100%;flex-direction:row}.wd-hero-actions>*{flex:1}.wd-stats{grid-template-columns:repeat(2,1fr)}.wd-card-head,.wd-table-head{flex-direction:column}.wd-export{width:100%}.wd-export button{flex:1;justify-content:center}.wd-live-strip{flex-wrap:wrap}.wd-people-panel{width:100%}.wd-people-panel>header{padding:20px 16px}.wd-people-list article{grid-template-columns:40px minmax(0,1fr)}.wd-people-list article>button,.wd-enrolled{grid-column:1/-1;justify-content:center}.wd-person-avatar{width:40px;height:40px}.wd-edit-dialog>header{padding:20px 16px}.wd-edit-dialog>label{margin-inline:16px}.wd-edit-date-row{grid-template-columns:1fr;margin-inline:16px}.wd-edit-program{margin-inline:16px}.wd-edit-day,.wd-edit-day.rest{grid-template-columns:1fr 105px}.wd-edit-day input{grid-row:2}.wd-edit-actions{padding:18px 16px}.wd-edit-actions button{flex:1;justify-content:center}}
`;
