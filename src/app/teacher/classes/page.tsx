"use client";
export const dynamic = "force-dynamic";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";
import TeacherLoadError from "@/components/TeacherLoadError";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Download,
  LayoutDashboard,
  Link2,
  Megaphone,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";

const S = {
  ar: {
    loading: "جارٍ التحميل...",
    eyebrow: "مجموعاتي الدراسية",
    pageTitle: "إدارة المجموعات",
    pageSub: "مساحة واحدة لإدارة المستفيدين والتواصل والدعوات بأقل عدد من الخطوات.",
    classCount: "مجموعة",
    totalStudents: "إجمالي المستفيدين",
    totalPending: "طلبات بانتظارك",
    selectedGroup: "المجموعة الحالية",
    groupWorkspace: "مساحة عمل المجموعة",
    groupWorkspaceSub: "تابع الأعضاء، تواصل معهم، وأدر الانضمام من مكان واحد.",
    noClassTitle: "لم يتم تعيينك في أي مجموعة بعد",
    noClassSub: "تواصل مع مدير المنصة",
    students: "المستفيدون",
    noStudents: "لا يوجد مستفيدون في هذا المجموعة",
    searchStudents: "ابحث عن مستفيد...",
    noSearchResults: "لا توجد نتائج مطابقة للبحث.",
    exportRoster: "تصدير القائمة",
    openProfile: "عرض الملف",
    refreshData: "تحديث البيانات",
    announcements: "الإعلانات",
    announcementPH: "اكتب إعلاناً للمجموعة...",
    posting: "جارٍ النشر...",
    postBtn: "نشر الإعلان",
    noAnnouncements: "لا توجد إعلانات بعد",
    composerHint: "Ctrl + Enter للنشر السريع",
    announcementError: "تعذر نشر الإعلان. حاول مرة أخرى.",
    delete: "حذف",
    dateLocale: "ar-SA-u-nu-latn",
    inviteEyebrow: "دعوات المستفيدين",
    inviteTitle: "رابط طلب الانضمام",
    inviteSub: "شارك الرابط بأمان. يُنشئ المستفيد حسابه مباشرة، ثم يبقى طلبه معلّقاً حتى توافق عليه.",
    inviteStep1: "أنشئ الرابط",
    inviteStep2: "شاركه مع المستفيدين",
    inviteStep3: "راجع الطلب ووافق عليه",
    createInvite: "إنشاء رابط الانضمام",
    copyInvite: "نسخ الرابط",
    copied: "تم النسخ",
    whatsapp: "مشاركة عبر واتساب",
    rotateInvite: "إنشاء رابط جديد",
    revokeInvite: "إيقاف الرابط",
    inviteUses: "استخدام للرابط",
    inviteSafe: "الرابط خاص بهذه المجموعة ويمكن استخدامه أكثر من مرة.",
    inviteError: "تعذر تحديث الرابط الآن. حاول مرة أخرى.",
    rotateConfirm: "سيتم إيقاف الرابط السابق فورًا وإنشاء رابط جديد. هل تريد المتابعة؟",
    revokeConfirm: "سيتم إيقاف الرابط ولن يستطيع أي مستفيد جديد استخدامه. هل تريد المتابعة؟",
    settings: "إعدادات المجموعة",
    settingsSub: "الاسم، رابط الدعوة، وطلبات الانضمام",
    overviewTab: "نظرة عامة",
    inviteTab: "رابط الانضمام",
    requestsTab: "الطلبات والسجل",
    groupOverview: "ملخص المجموعة",
    groupOverviewSub: "لقطة سريعة عن حالة المجموعة الحالية.",
    activeInvite: "الرابط يعمل",
    inactiveInvite: "الرابط متوقف",
    quickCopy: "نسخ رابط الانضمام",
    manageRequests: "مراجعة الطلبات",
    linkStatus: "حالة الرابط",
    lastUpdated: "آخر تحديث",
    invitationGuide: "كيف يعمل الانضمام؟",
    invitationGuideSub: "ثلاث خطوات واضحة وآمنة دون إضافة مباشرة للمجموعة.",
    pendingEmptyTitle: "لا توجد طلبات تحتاج قراراً",
    pendingEmptySub: "ستظهر الطلبات الجديدة هنا فور استخدام رابط الانضمام.",
    historyEmptyTitle: "لا يوجد سجل استخدام بعد",
    historyEmptySub: "سيظهر هنا كل من استخدم رابط المجموعة وحالة طلبه.",
    groupName: "اسم المجموعة",
    saveName: "حفظ الاسم",
    nameSaved: "تم تحديث اسم المجموعة",
    nameError: "تعذر تحديث الاسم. تأكد أنه غير مستخدم في مجموعة أخرى.",
    pending: "طلبات معلّقة",
    inviteHistory: "من استخدم الرابط",
    noRequests: "لم يستخدم أحد هذا الرابط بعد.",
    approve: "قبول وإضافة",
    reject: "رفض",
    approved: "مقبول",
    rejected: "مرفوض",
    waiting: "بانتظار القرار",
    requestError: "تعذر تحديث الطلب. حدّث الصفحة وحاول مجدداً.",
    close: "إغلاق",
    shareText: (name: string, url: string) => `مرحبًا، هذا رابط الانضمام إلى مجموعة «${name}» في منصة الرواد:\n${url}`,
  },
  sq: {
    loading: "Duke ngarkuar...",
    eyebrow: "Grupet e mia",
    pageTitle: "Menaxhimi i grupeve",
    pageSub: "Një hapësirë e vetme për pjesëmarrësit, komunikimin dhe ftesat.",
    classCount: "grup",
    totalStudents: "Gjithsej pjesëmarrës",
    totalPending: "Kërkesa për shqyrtim",
    selectedGroup: "Grupi aktual",
    groupWorkspace: "Hapësira e grupit",
    groupWorkspaceSub: "Menaxho anëtarët, komunikimin dhe anëtarësimet në një vend.",
    noClassTitle: "Nuk jeni caktuar në asnjë grup ende",
    noClassSub: "Kontaktoni drejtuesin e platformës",
    students: "Pjesëmarrësit",
    noStudents: "Nuk ka pjesëmarrës në këtë grup",
    searchStudents: "Kërko pjesëmarrës...",
    noSearchResults: "Nuk u gjet asnjë rezultat.",
    exportRoster: "Eksporto listën",
    openProfile: "Hap profilin",
    refreshData: "Përditëso të dhënat",
    announcements: "Njoftime",
    announcementPH: "Shkruaj një njoftim për grupin...",
    posting: "Duke postuar...",
    postBtn: "Posto njoftimin",
    noAnnouncements: "Nuk ka njoftime ende",
    composerHint: "Ctrl + Enter për postim të shpejtë",
    announcementError: "Njoftimi nuk u publikua. Provo përsëri.",
    delete: "Fshij",
    dateLocale: "sq-AL",
    inviteEyebrow: "Ftesat e pjesëmarrësve",
    inviteTitle: "Lidhja e kërkesës për anëtarësim",
    inviteSub: "Ndaje lidhjen në mënyrë të sigurt. Pjesëmarrësi krijon llogarinë menjëherë dhe pret miratimin tënd.",
    inviteStep1: "Krijo lidhjen",
    inviteStep2: "Ndaje me pjesëmarrësit",
    inviteStep3: "Shqyrto dhe mirato kërkesën",
    createInvite: "Krijo lidhjen e anëtarësimit",
    copyInvite: "Kopjo lidhjen",
    copied: "U kopjua",
    whatsapp: "Ndaje në WhatsApp",
    rotateInvite: "Krijo lidhje të re",
    revokeInvite: "Çaktivizo lidhjen",
    inviteUses: "përdorime të lidhjes",
    inviteSafe: "Lidhja vlen vetëm për këtë grup dhe mund të përdoret disa herë.",
    inviteError: "Lidhja nuk u përditësua. Provo përsëri.",
    rotateConfirm: "Lidhja e mëparshme do të çaktivizohet menjëherë. Të krijojmë një të re?",
    revokeConfirm: "Pjesëmarrës të rinj nuk do të mund ta përdorin këtë lidhje. Të vazhdojmë?",
    settings: "Cilësimet e grupit",
    settingsSub: "Emri, lidhja e ftesës dhe kërkesat",
    overviewTab: "Përmbledhje",
    inviteTab: "Lidhja e anëtarësimit",
    requestsTab: "Kërkesat dhe historia",
    groupOverview: "Përmbledhja e grupit",
    groupOverviewSub: "Pamje e shpejtë e gjendjes së grupit aktual.",
    activeInvite: "Lidhja është aktive",
    inactiveInvite: "Lidhja është joaktive",
    quickCopy: "Kopjo lidhjen",
    manageRequests: "Shqyrto kërkesat",
    linkStatus: "Gjendja e lidhjes",
    lastUpdated: "Përditësimi i fundit",
    invitationGuide: "Si funksionon anëtarësimi?",
    invitationGuideSub: "Tre hapa të qartë dhe të sigurt, pa shtim automatik.",
    pendingEmptyTitle: "Nuk ka kërkesa për vendim",
    pendingEmptySub: "Kërkesat e reja do të shfaqen këtu sapo të përdoret lidhja.",
    historyEmptyTitle: "Ende nuk ka histori përdorimi",
    historyEmptySub: "Këtu do të shfaqen përdoruesit e lidhjes dhe statusi i kërkesës.",
    groupName: "Emri i grupit",
    saveName: "Ruaj emrin",
    nameSaved: "Emri i grupit u përditësua",
    nameError: "Emri nuk u përditësua. Kontrollo nëse përdoret nga një grup tjetër.",
    pending: "Kërkesa në pritje",
    inviteHistory: "Kush e përdori lidhjen",
    noRequests: "Askush nuk e ka përdorur ende këtë lidhje.",
    approve: "Mirato dhe shto",
    reject: "Refuzo",
    approved: "Miratuar",
    rejected: "Refuzuar",
    waiting: "Në pritje",
    requestError: "Kërkesa nuk u përditësua. Rifresko faqen dhe provo përsëri.",
    close: "Mbyll",
    shareText: (name: string, url: string) => `Përshëndetje, kjo është lidhja për t'u bashkuar me grupin “${name}” në Platformën Rowad:\n${url}`,
  },
} as const;

type Student = { id: string; city: string | null; age: number | null; profile: { full_name: string; avatar_url: string | null } };
type GroupInvite = { token: string; is_active: boolean; use_count: number; updated_at: string };
type JoinRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  decided_at: string | null;
  student: { id: string; city: string | null; age: number | null; profile: { full_name: string; avatar_url: string | null } };
};
type ClassItem = { id: string; name: string; students: Student[]; invite: GroupInvite | null; join_requests: JoinRequest[] };
type TeacherData = { classes: ClassItem[]; school: { slug: string } };
type Announcement = {
  id: string;
  content: string;
  created_at: string;
  teacher: { profile: { full_name: string } };
};

type SettingsTab = "overview" | "invite" | "requests";

export default function TeacherClassesPage() {
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const confirm = useConfirm();

  const [data, setData] = useState<TeacherData | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [annLoading, setAnnLoading] = useState(false);
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [classBusy, setClassBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [requestBusy, setRequestBusy] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("overview");
  const [studentQuery, setStudentQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = useCallback(async (classId: string) => {
    setAnnLoading(true);
    const data = await cachedFetch<Announcement[]>(`/api/teacher/announcements?classId=${classId}`, 30_000);
    setAnnouncements(data);
    setAnnLoading(false);
  }, []);

  const selectClass = useCallback(async (cls: ClassItem) => {
    setSelectedClass(cls);
    setInvite(cls.invite);
    setClassName(cls.name);
    setInviteError("");
    setCopied(false);
    setStudentQuery("");
    setActionError("");
    await loadAnnouncements(cls.id);
  }, [loadAnnouncements]);

  const inviteUrl = invite?.token && data
    ? `${typeof window === "undefined" ? "" : window.location.origin}/schools/${encodeURIComponent(data.school.slug)}/signup?groupInvite=${encodeURIComponent(invite.token)}`
    : "";

  async function createInvite() {
    if (!selectedClass || inviteBusy) return;
    if (invite?.is_active) {
      const ok = await confirm({ message: T.rotateConfirm });
      if (!ok) return;
    }
    setInviteBusy(true);
    setInviteError("");
    try {
      const response = await fetch(`/api/teacher/classes/${selectedClass.id}/invite`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error();
      setInvite(payload.invite);
      replaceClass({ ...selectedClass, invite: payload.invite });
      setCopied(false);
    } catch {
      setInviteError(T.inviteError);
    } finally {
      setInviteBusy(false);
    }
  }

  async function revokeInvite() {
    if (!selectedClass || !invite?.is_active || inviteBusy) return;
    const ok = await confirm({ message: T.revokeConfirm });
    if (!ok) return;
    setInviteBusy(true);
    setInviteError("");
    try {
      const response = await fetch(`/api/teacher/classes/${selectedClass.id}/invite`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setInvite((current) => current ? { ...current, is_active: false } : current);
      replaceClass({ ...selectedClass, invite: selectedClass.invite ? { ...selectedClass.invite, is_active: false } : null });
    } catch {
      setInviteError(T.inviteError);
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setInviteError(T.inviteError);
    }
  }

  function replaceClass(next: ClassItem) {
    setSelectedClass(next);
    setData((current) => current ? { ...current, classes: current.classes.map((item) => item.id === next.id ? next : item) } : current);
  }

  function openSettings(tab: SettingsTab = "overview") {
    if (!selectedClass) return;
    setClassName(selectedClass.name);
    setSettingsMessage("");
    setInviteError("");
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  function exportRoster() {
    if (!selectedClass?.students.length) return;
    const headings = lang === "ar"
      ? ["الاسم", "المدينة", "العمر"]
      : ["Emri", "Qyteti", "Mosha"];
    const rows = selectedClass.students.map((student) => [
      student.profile.full_name,
      student.city ?? "",
      student.age?.toString() ?? "",
    ]);
    const csv = [headings, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedClass.name.replace(/[\\/:*?"<>|]/g, "-")}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function refreshData() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      invalidateCache("/api/teacher");
      const fresh = await cachedFetch<TeacherData>("/api/teacher", 0);
      const next = fresh.classes.find((item) => item.id === selectedClass?.id) ?? fresh.classes[0] ?? null;
      setData(fresh);
      setSelectedClass(next);
      setInvite(next?.invite ?? null);
      if (next) {
        setClassName(next.name);
        await loadAnnouncements(next.id);
      }
    } catch {
      // Keep the current data visible when a manual refresh encounters a brief network issue.
    } finally {
      setRefreshing(false);
    }
  }

  async function renameClass() {
    if (!selectedClass || !className.trim() || classBusy) return;
    setClassBusy(true);
    setSettingsMessage("");
    try {
      const response = await fetch(`/api/teacher/classes/${selectedClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: className.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      replaceClass({ ...selectedClass, name: payload.group.name });
      setClassName(payload.group.name);
      setSettingsMessage(T.nameSaved);
    } catch {
      setSettingsMessage(T.nameError);
    } finally {
      setClassBusy(false);
    }
  }

  async function decideRequest(requestId: string, decision: "APPROVED" | "REJECTED") {
    if (!selectedClass || requestBusy) return;
    setRequestBusy(requestId);
    setSettingsMessage("");
    try {
      const response = await fetch(`/api/teacher/classes/${selectedClass.id}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error();
      invalidateCache("/api/teacher");
      const fresh = await cachedFetch<TeacherData>("/api/teacher", 0);
      setData(fresh);
      const next = fresh.classes.find((item) => item.id === selectedClass.id) ?? null;
      if (next) {
        setSelectedClass(next);
        setInvite(next.invite);
      }
    } catch {
      setSettingsMessage(T.requestError);
    } finally {
      setRequestBusy(null);
    }
  }

  useEffect(() => {
    cachedFetch<TeacherData>("/api/teacher", 0).then((d) => {
      setData(d);
      if (d.classes?.length > 0) selectClass(d.classes[0]);
      setLoading(false);
    }).catch(() => { setLoadError(true); setLoading(false); });
  }, [selectClass]);

  useEffect(() => {
    if (!settingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  async function handlePost() {
    if (!newAnnouncement.trim() || !selectedClass) return;
    setPosting(true);
    setActionError("");
    try {
      const response = await fetch("/api/teacher/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClass.id, content: newAnnouncement.trim() }),
      });
      if (!response.ok) throw new Error();
      setNewAnnouncement("");
      invalidateCache(`/api/teacher/announcements?classId=${selectedClass.id}`);
      await loadAnnouncements(selectedClass.id);
    } catch {
      setActionError(T.announcementError);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      message: lang === "ar" ? "حذف هذا الإعلان؟" : "Fshi këtë njoftim?",
    });
    if (!ok) return;
    setDeletingId(id);
    await fetch(`/api/teacher/announcements?id=${id}`, { method: "DELETE" });
    invalidateCache(`/api/teacher/announcements?classId=${selectedClass?.id}`);
    if (selectedClass) await loadAnnouncements(selectedClass.id);
    setDeletingId(null);
  }

  const pendingRequests = useMemo(
    () => selectedClass?.join_requests.filter((request) => request.status === "PENDING") ?? [],
    [selectedClass],
  );
  const visibleStudents = useMemo(() => {
    const query = studentQuery.trim().toLocaleLowerCase();
    if (!query) return selectedClass?.students ?? [];
    return (selectedClass?.students ?? []).filter((student) =>
      `${student.profile.full_name} ${student.city ?? ""} ${student.age ?? ""}`.toLocaleLowerCase().includes(query),
    );
  }, [selectedClass, studentQuery]);
  const totalStudents = data?.classes.reduce((sum, group) => sum + group.students.length, 0) ?? 0;
  const totalPending = data?.classes.reduce(
    (sum, group) => sum + group.join_requests.filter((request) => request.status === "PENDING").length,
    0,
  ) ?? 0;

  if (loading) {
    return (
      <div className="tc-shell" dir={dir}>
        <div className="tc-loading">
          <div className="tc-spin" />
          <span>{T.loading}</span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }
  if (loadError) return <TeacherLoadError onRetry={() => window.location.reload()} />;

  return (
    <div className="tc-shell" dir={dir}>

      <header className="tc-page-header">
        <div className="tc-hero-copy">
          <span className="tc-eyebrow"><Sparkles size={13} />{T.eyebrow}</span>
          <h1 className="tc-page-title">{T.pageTitle}</h1>
          <p>{T.pageSub}</p>
        </div>
        <div className="tc-header-stats">
          <article><span><LayoutDashboard size={17} /></span><div><strong>{data?.classes.length ?? 0}</strong><small>{T.classCount}</small></div></article>
          <article><span><Users size={17} /></span><div><strong>{totalStudents}</strong><small>{T.totalStudents}</small></div></article>
          <article className={totalPending ? "attention" : ""}><span><Clock3 size={17} /></span><div><strong>{totalPending}</strong><small>{T.totalPending}</small></div></article>
        </div>
      </header>

      {!data?.classes.length ? (
        <div className="tc-empty">
          <div className="tc-empty-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
            </svg>
          </div>
          <h3>{T.noClassTitle}</h3>
          <p>{T.noClassSub}</p>
        </div>
      ) : (
        <>
          <section className="tc-classbar">
            <div className="tc-classbar-head">
              <div><span>{T.selectedGroup}</span><strong>{data.classes.length} {T.classCount}</strong></div>
              <small>{T.groupWorkspaceSub}</small>
            </div>
            <div className="tc-tabs" role="tablist" aria-label={T.eyebrow}>
              {data.classes.map((cls) => (
                <button key={cls.id} role="tab" aria-selected={selectedClass?.id === cls.id} className={`tc-tab ${selectedClass?.id === cls.id ? "active" : ""}`} onClick={() => selectClass(cls)}>
                  <span className="tc-tab-mark">{cls.name.charAt(0)}</span>
                  <span className="tc-tab-copy"><strong>{cls.name}</strong><small>{cls.students.length} {T.students}</small></span>
                  {cls.join_requests.some((request) => request.status === "PENDING") && <b>{cls.join_requests.filter((request) => request.status === "PENDING").length}</b>}
                </button>
              ))}
            </div>
          </section>

          {selectedClass && (
            <>
            <section className="tc-workspace-head">
              <div className="tc-workspace-title">
                <span className="tc-workspace-mark">{selectedClass.name.charAt(0)}</span>
                <div><small>{T.groupWorkspace}</small><h2>{selectedClass.name}</h2><p>{T.groupWorkspaceSub}</p></div>
              </div>
              <div className="tc-workspace-actions">
                <button type="button" className="secondary icon-only" onClick={() => void refreshData()} disabled={refreshing} aria-label={T.refreshData} title={T.refreshData}><RefreshCw className={refreshing ? "spin" : ""} size={15} /></button>
                {invite?.is_active && <button type="button" className="secondary" onClick={() => void copyInvite()}><Copy size={15} />{copied ? T.copied : T.quickCopy}</button>}
                {pendingRequests.length > 0 && <button type="button" className="attention" onClick={() => openSettings("requests")}><Clock3 size={15} />{T.manageRequests}<b>{pendingRequests.length}</b></button>}
                <button type="button" className="primary" onClick={() => openSettings("overview")}><Settings size={15} />{T.settings}</button>
              </div>
            </section>

            <section className="tc-overview-strip">
              <article><span><Users size={18} /></span><div><small>{T.students}</small><strong>{selectedClass.students.length}</strong></div></article>
              <article><span><Megaphone size={18} /></span><div><small>{T.announcements}</small><strong>{announcements.length}</strong></div></article>
              <button type="button" onClick={() => openSettings("invite")}><span><Link2 size={18} /></span><div><small>{T.linkStatus}</small><strong>{invite?.is_active ? T.activeInvite : T.inactiveInvite}</strong></div><ArrowUpRight size={16} /></button>
              <button type="button" className={pendingRequests.length ? "has-pending" : ""} onClick={() => openSettings("requests")}><span><UserCheck size={18} /></span><div><small>{T.pending}</small><strong>{pendingRequests.length}</strong></div><ArrowUpRight size={16} /></button>
            </section>

            <div className="tc-grid">

              {/* ── Students card ── */}
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-icon"><Users size={16} /></div>
                  <div className="tc-card-heading"><h2>{T.students}</h2><p>{selectedClass.name}</p></div>
                  <span className="tc-badge">{selectedClass.students.length}</span>
                </div>
                <div className="tc-roster-tools">
                  <label><Search size={15} /><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder={T.searchStudents} /></label>
                  <button type="button" onClick={exportRoster} disabled={!selectedClass.students.length}><Download size={15} />{T.exportRoster}</button>
                </div>
                <div className="tc-students">
                  {selectedClass.students.length === 0 ? (
                    <div className="tc-inner-empty">{T.noStudents}</div>
                  ) : visibleStudents.length === 0 ? (
                    <div className="tc-inner-empty">{T.noSearchResults}</div>
                  ) : (
                    visibleStudents.map((s, i) => (
                      <Link
                        key={s.id}
                        href={`/teacher/reports/students/${s.id}`}
                        className="tc-student-row"
                        style={{ animationDelay: `${i * 33}ms` }}
                      >
                        <span className={`tc-student-av${s.profile.avatar_url ? " has-image" : ""}`} style={s.profile.avatar_url ? { backgroundImage: `url(${JSON.stringify(s.profile.avatar_url)})` } : undefined}>{s.profile.avatar_url ? "" : s.profile.full_name.charAt(0)}</span>
                        <span className="tc-student-copy"><strong>{s.profile.full_name}</strong><small>{[s.city, s.age ? `${s.age}` : null].filter(Boolean).join(" · ") || selectedClass.name}</small></span>
                        <span className="tc-profile-link">{T.openProfile}<ArrowUpRight size={14} /></span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* ── Announcements card ── */}
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-icon"><Megaphone size={16} /></div>
                  <div className="tc-card-heading"><h2>{T.announcements}</h2><p>{selectedClass.name}</p></div>
                  <span className="tc-badge">{announcements.length}</span>
                </div>

                <div className="tc-composer">
                  <textarea
                    className="tc-textarea"
                    placeholder={T.announcementPH}
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        handlePost();
                      }
                    }}
                    rows={3}
                    maxLength={600}
                    dir={dir}
                  />
                  <div className="tc-composer-meta"><span>{T.composerHint}</span><b>{newAnnouncement.length}/600</b></div>
                  <button className="tc-post-btn" onClick={handlePost} disabled={posting || !newAnnouncement.trim()}>
                    {posting ? (
                      <><div className="tc-btn-spin" />{T.posting}</>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        {T.postBtn}
                      </>
                    )}
                  </button>
                  {actionError && <p className="tc-action-error" role="alert">{actionError}</p>}
                </div>

                <div className="tc-ann-list">
                  {annLoading ? (
                    <div className="tc-loading sm"><div className="tc-spin" /></div>
                  ) : announcements.length === 0 ? (
                    <div className="tc-inner-empty">{T.noAnnouncements}</div>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className={`tc-ann-item ${deletingId === a.id ? "deleting" : ""}`}>
                        <div className="tc-ann-bar" />
                        <div className="tc-ann-body">
                          <p className="tc-ann-text">{a.content}</p>
                          <div className="tc-ann-foot">
                            <div className="tc-ann-meta">
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                              {a.teacher.profile.full_name}
                              <span className="tc-ann-dot" />
                              {new Date(a.created_at).toLocaleDateString(T.dateLocale, { month: "short", day: "numeric" })}
                            </div>
                            <button className="tc-del-ann" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}>
                              {deletingId === a.id ? <div className="tc-spin sm" /> : T.delete}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </>
          )}
        </>
      )}

      {settingsOpen && selectedClass && typeof document !== "undefined" && createPortal(
        <div className="tc-settings-overlay" role="presentation" onMouseDown={() => setSettingsOpen(false)} dir={dir}>
          <section className="tc-settings-panel" role="dialog" aria-modal="true" aria-label={T.settings} onMouseDown={(event) => event.stopPropagation()}>
            <header className="tc-settings-head">
              <div className="tc-settings-identity">
                <span>{selectedClass.name.charAt(0)}</span>
                <div><small>{T.settings}</small><h2>{selectedClass.name}</h2><p>{T.settingsSub}</p></div>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label={T.close}><X size={19} /></button>
            </header>

            <div className="tc-settings-layout">
              <nav className="tc-settings-nav" aria-label={T.settings}>
                <button type="button" className={settingsTab === "overview" ? "active" : ""} onClick={() => setSettingsTab("overview")}><LayoutDashboard size={17} /><span>{T.overviewTab}</span></button>
                <button type="button" className={settingsTab === "invite" ? "active" : ""} onClick={() => setSettingsTab("invite")}><Link2 size={17} /><span>{T.inviteTab}</span><b className={invite?.is_active ? "live" : ""}>{invite?.is_active ? "✓" : "—"}</b></button>
                <button type="button" className={settingsTab === "requests" ? "active" : ""} onClick={() => setSettingsTab("requests")}><UserCheck size={17} /><span>{T.requestsTab}</span><b className={pendingRequests.length ? "alert" : ""}>{pendingRequests.length}</b></button>
              </nav>

              <main className="tc-settings-body">
                {settingsTab === "overview" && (
                  <div className="tc-tab-panel">
                    <div className="tc-panel-intro"><span><LayoutDashboard size={19} /></span><div><h3>{T.groupOverview}</h3><p>{T.groupOverviewSub}</p></div></div>
                    <section className="tc-modal-metrics">
                      <article><Users size={18} /><div><strong>{selectedClass.students.length}</strong><small>{T.students}</small></div></article>
                      <article><Clock3 size={18} /><div><strong>{pendingRequests.length}</strong><small>{T.pending}</small></div></article>
                      <article><Link2 size={18} /><div><strong>{invite?.use_count ?? 0}</strong><small>{T.inviteUses}</small></div></article>
                    </section>
                    <section className="tc-setting-section tc-name-setting">
                      <div className="tc-setting-title"><div><strong>{T.groupName}</strong><p>{T.groupWorkspaceSub}</p></div><small>{selectedClass.name}</small></div>
                      <div className="tc-name-row">
                        <input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={100} />
                        <button type="button" onClick={() => void renameClass()} disabled={classBusy || className.trim() === selectedClass.name || className.trim().length < 2}><Save size={15} />{T.saveName}</button>
                      </div>
                    </section>
                    <section className="tc-modal-shortcuts">
                      <button type="button" onClick={() => setSettingsTab("invite")}><span><Link2 size={17} /></span><div><strong>{T.inviteTab}</strong><small>{invite?.is_active ? T.activeInvite : T.inactiveInvite}</small></div><ArrowUpRight size={15} /></button>
                      <button type="button" onClick={() => setSettingsTab("requests")}><span><UserCheck size={17} /></span><div><strong>{T.requestsTab}</strong><small>{pendingRequests.length} {T.pending}</small></div><ArrowUpRight size={15} /></button>
                    </section>
                  </div>
                )}

                {settingsTab === "invite" && (
                  <div className="tc-tab-panel">
                    <div className="tc-panel-intro"><span><UserPlus size={19} /></span><div><h3>{T.inviteTitle}</h3><p>{T.inviteSub}</p></div><b className={invite?.is_active ? "active" : "inactive"}>{invite?.is_active ? T.activeInvite : T.inactiveInvite}</b></div>
                    <section className="tc-invite-workspace">
                      {invite?.is_active ? (
                        <>
                          <div className="tc-link-box" dir="ltr"><Link2 size={16} /><span>{inviteUrl}</span><button type="button" onClick={() => void copyInvite()}><Copy size={15} />{copied ? T.copied : T.copyInvite}</button></div>
                          <div className="tc-invite-buttons">
                            <a href={`https://wa.me/?text=${encodeURIComponent(T.shareText(selectedClass.name, inviteUrl))}`} target="_blank" rel="noreferrer"><Send size={15} />{T.whatsapp}</a>
                            <button type="button" onClick={() => void createInvite()} disabled={inviteBusy}><RefreshCw size={14} />{T.rotateInvite}</button>
                            <button type="button" className="danger" onClick={() => void revokeInvite()} disabled={inviteBusy}><UserX size={14} />{T.revokeInvite}</button>
                          </div>
                          <div className="tc-invite-meta">
                            <span><Check size={14} /><strong>{invite.use_count}</strong>{T.inviteUses}</span>
                            <span><Clock3 size={14} />{T.lastUpdated}: {new Date(invite.updated_at).toLocaleDateString(T.dateLocale)}</span>
                            <span><ShieldCheck size={14} />{T.inviteSafe}</span>
                          </div>
                        </>
                      ) : (
                        <div className="tc-invite-empty"><span><Link2 size={24} /></span><h4>{T.inactiveInvite}</h4><p>{T.inviteSub}</p><button type="button" onClick={() => void createInvite()} disabled={inviteBusy}><UserPlus size={16} />{T.createInvite}</button></div>
                      )}
                      {inviteError && <p className="tc-invite-error" role="alert">{inviteError}</p>}
                    </section>
                    <section className="tc-join-guide">
                      <header><div><strong>{T.invitationGuide}</strong><p>{T.invitationGuideSub}</p></div></header>
                      <div>{[T.inviteStep1, T.inviteStep2, T.inviteStep3].map((label, index) => <article key={label}><b>{index + 1}</b><span>{label}</span></article>)}</div>
                    </section>
                  </div>
                )}

                {settingsTab === "requests" && (
                  <div className="tc-tab-panel">
                    <div className="tc-panel-intro"><span><UserCheck size={19} /></span><div><h3>{T.requestsTab}</h3><p>{T.settingsSub}</p></div><b className={pendingRequests.length ? "pending" : "clear"}>{pendingRequests.length} {T.pending}</b></div>
                    <section className="tc-setting-section">
                      <div className="tc-setting-title"><div><strong>{T.pending}</strong><p>{T.inviteStep3}</p></div><small>{pendingRequests.length}</small></div>
                      <div className="tc-request-list">
                        {pendingRequests.map((request) => (
                          <article className="tc-request pending" key={request.id}>
                            <span className={`tc-request-avatar${request.student.profile.avatar_url ? " has-image" : ""}`} style={request.student.profile.avatar_url ? { backgroundImage: `url(${JSON.stringify(request.student.profile.avatar_url)})` } : undefined}>{request.student.profile.avatar_url ? "" : request.student.profile.full_name.charAt(0)}</span>
                            <div><strong>{request.student.profile.full_name}</strong><small>{[request.student.city, request.student.age ? `${request.student.age}` : null].filter(Boolean).join(" · ") || "—"}</small><time>{new Date(request.created_at).toLocaleDateString(T.dateLocale)}</time></div>
                            <div className="tc-request-actions">
                              <button className="approve" type="button" disabled={requestBusy === request.id} onClick={() => void decideRequest(request.id, "APPROVED")}><UserCheck size={14} />{T.approve}</button>
                              <button className="reject" type="button" disabled={requestBusy === request.id} onClick={() => void decideRequest(request.id, "REJECTED")}><UserX size={14} />{T.reject}</button>
                            </div>
                          </article>
                        ))}
                        {pendingRequests.length === 0 && <div className="tc-requests-empty"><span><Check size={20} /></span><strong>{T.pendingEmptyTitle}</strong><p>{T.pendingEmptySub}</p></div>}
                      </div>
                    </section>
                    <section className="tc-setting-section tc-history-section">
                      <div className="tc-setting-title"><div><strong>{T.inviteHistory}</strong><p>{T.linkStatus}</p></div><small>{selectedClass.join_requests.length}</small></div>
                      <div className="tc-request-list history">
                        {selectedClass.join_requests.map((request) => (
                          <article className="tc-request" key={request.id}>
                            <span className="tc-request-avatar">{request.student.profile.full_name.charAt(0)}</span>
                            <div><strong>{request.student.profile.full_name}</strong><small>{request.student.city ?? "—"}</small><time>{new Date(request.created_at).toLocaleDateString(T.dateLocale)}</time></div>
                            <span className={`tc-request-status ${request.status.toLowerCase()}`}>{request.status === "APPROVED" ? <UserCheck size={13} /> : request.status === "REJECTED" ? <UserX size={13} /> : <Clock3 size={13} />}{request.status === "APPROVED" ? T.approved : request.status === "REJECTED" ? T.rejected : T.waiting}</span>
                          </article>
                        ))}
                        {selectedClass.join_requests.length === 0 && <div className="tc-requests-empty"><span><Clock3 size={20} /></span><strong>{T.historyEmptyTitle}</strong><p>{T.historyEmptySub}</p></div>}
                      </div>
                    </section>
                  </div>
                )}

                {settingsMessage && <p className="tc-settings-message" role="status">{settingsMessage}</p>}
              </main>
            </div>
          </section>
        </div>,
        document.body,
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeOut{to{opacity:0;transform:scale(0.97)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}

  .tc-shell{display:flex;flex-direction:column;gap:20px;font-family:'Cairo',Tajawal,sans-serif;min-height:100%;background:#EFEAE0;padding:28px 24px}

  /* Loading */
  .tc-loading{display:flex;align-items:center;gap:10px;height:160px;justify-content:center;color:#796A62;font-size:14px}
  .tc-loading.sm{height:60px;justify-content:center}
  .tc-spin{width:18px;height:18px;border:2px solid rgba(184,160,130,0.2);border-top-color:#B8A082;border-radius:50%;animation:sp 0.7s linear infinite;flex-shrink:0}
  .tc-spin.sm{width:13px;height:13px}

  /* Page header */
  .tc-page-header{
    background:#1A1A1A;border-radius:20px;padding:22px 28px;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    position:relative;overflow:hidden;border:1px solid rgba(184,160,130,0.1);
    animation:fadeUp 0.42s ease both;
  }
  .tc-page-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#B8A082 30%,#B8A082 60%,transparent)}
  .tc-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(184,160,130,0.5);margin-bottom:5px}
  .tc-page-title{font-size:22px;font-weight:900;color:#B8A082;letter-spacing:-0.3px}
  .tc-header-stat{display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(184,160,130,0.08);border:1px solid rgba(184,160,130,0.14);border-radius:12px;padding:12px 18px}
  .tc-header-stat-num{font-size:26px;font-weight:900;color:#B8A082;line-height:1}
  .tc-header-stat-lbl{font-size:11px;color:rgba(184,160,130,0.45);font-weight:600}

  /* Tabs */
  .tc-classbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .tc-tabs{display:flex;gap:6px;flex-wrap:wrap}
  .tc-tab{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:11px;border:1.5px solid rgba(184,160,130,0.16);background:#FFFBF5;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;font-size:13.5px;font-weight:700;color:#4A0E1C}
  .tc-tab:hover{border-color:rgba(184,160,130,0.35);background:rgba(184,160,130,0.05)}
  .tc-tab.active{background:#1A1A1A;border-color:#1A1A1A;color:#B8A082;box-shadow:0 4px 14px rgba(26,26,26,0.18)}
  .tc-tab-count{font-size:11px;font-weight:800;padding:1px 7px;border-radius:99px;background:rgba(184,160,130,0.12);color:#8F765B}
  .tc-tab.active .tc-tab-count{background:rgba(184,160,130,0.14);color:#B8A082}
  .tc-settings-btn{display:flex;align-items:center;gap:7px;border:1px solid #D9C9B0;border-radius:11px;background:#FFFBF5;padding:9px 13px;color:#4A0E1C;font:800 12px 'Cairo',sans-serif;cursor:pointer;box-shadow:0 6px 16px rgba(107,30,45,.06)}
  .tc-settings-btn:hover{border-color:#B8A082;background:#F7F3EB}.tc-settings-btn b{display:grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#6B1E2D;padding:0 6px;color:#fff;font-size:9px}

  /* Beneficiary invitation */
  .tc-invite-card{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);gap:20px;padding:22px;border-radius:20px;background:linear-gradient(135deg,#4A0E1C 0%,#32101A 68%,#1A1A1A 100%);color:#fff;box-shadow:0 16px 36px rgba(107,30,45,.15);overflow:hidden;position:relative}
  .tc-invite-card:after{content:'';position:absolute;width:210px;height:210px;border:1px solid rgba(184,160,130,.15);border-radius:50%;inset-inline-start:-95px;bottom:-145px;box-shadow:0 0 0 26px rgba(184,160,130,.04),0 0 0 54px rgba(184,160,130,.025);pointer-events:none}
  .tc-invite-main,.tc-invite-action{position:relative;z-index:1}
  .tc-invite-heading{display:flex;align-items:flex-start;gap:12px}
  .tc-invite-symbol{width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex:none;border-radius:13px;background:rgba(184,160,130,.14);border:1px solid rgba(184,160,130,.22);color:#D9C9B0}
  .tc-invite-heading p{margin:0 0 3px;color:#B8A082;font-size:9px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase}
  .tc-invite-heading h2{margin:0;color:#fff;font-size:18px;font-weight:900}
  .tc-invite-heading span{display:block;margin-top:5px;color:rgba(255,255,255,.63);font-size:11.5px;line-height:1.75;max-width:570px}
  .tc-invite-steps{display:flex;align-items:flex-start;margin-top:22px;gap:0}
  .tc-invite-steps>div{display:flex;align-items:center;gap:7px;flex:1;min-width:0;color:rgba(255,255,255,.75);font-size:9.5px;font-weight:800}
  .tc-invite-steps b{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;background:#B8A082;color:#32101A;font-size:10px}
  .tc-invite-steps span{line-height:1.45}
  .tc-invite-steps i{height:1px;flex:1;min-width:8px;margin:0 7px;background:rgba(184,160,130,.28)}
  .tc-invite-action{display:flex;flex-direction:column;justify-content:center;gap:9px;padding:15px;border-radius:15px;background:rgba(255,255,255,.07);border:1px solid rgba(184,160,130,.16);backdrop-filter:blur(8px)}
  .tc-link-box{display:flex;align-items:center;gap:8px;padding:10px;border-radius:9px;background:rgba(26,26,26,.28);color:#D9C9B0;font-size:10px;overflow:hidden}
  .tc-link-box span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tc-invite-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .tc-invite-buttons button,.tc-invite-buttons a,.tc-create-invite{display:flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;padding:10px;border:1px solid rgba(184,160,130,.25);font:800 10.5px 'Cairo',sans-serif;cursor:pointer;text-decoration:none}
  .tc-invite-buttons .primary,.tc-create-invite{background:#B8A082;color:#32101A}
  .tc-invite-buttons a{background:rgba(255,255,255,.07);color:#fff}
  .tc-invite-meta{display:flex;flex-wrap:wrap;gap:7px 14px;color:rgba(255,255,255,.58);font-size:9px;font-weight:700}
  .tc-invite-meta span{display:flex;align-items:center;gap:4px}
  .tc-invite-quiet-actions{display:flex;gap:12px;border-top:1px solid rgba(184,160,130,.12);padding-top:8px}
  .tc-invite-quiet-actions button{display:flex;align-items:center;gap:4px;background:none;border:0;color:rgba(255,255,255,.55);font:700 9px 'Cairo',sans-serif;cursor:pointer}
  .tc-invite-quiet-actions button:hover{color:#D9C9B0}
  .tc-create-invite{width:100%;min-height:46px}
  .tc-invite-error{color:#D9C9B0;font-size:10px;font-weight:800}

  /* Class settings */
  .tc-settings-overlay{position:fixed;z-index:5000;inset:0;display:grid;place-items:center;background:rgba(26,26,26,.62);padding:18px;backdrop-filter:blur(9px)}
  .tc-settings-panel{width:min(940px,100%);max-height:92dvh;overflow:hidden;border:1px solid rgba(217,201,176,.34);border-radius:24px;background:#F7F3EB;box-shadow:0 28px 80px rgba(26,26,26,.35)}
  .tc-settings-head{display:flex;align-items:center;justify-content:space-between;gap:14px;background:linear-gradient(130deg,#32101A,#6B1E2D);padding:17px 20px;color:#fff}.tc-settings-head>div{display:flex;align-items:center;gap:11px}.tc-settings-head>div>span{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(217,201,176,.25);border-radius:12px;background:rgba(217,201,176,.1);color:#D9C9B0}.tc-settings-head h2{font-size:17px;font-weight:900}.tc-settings-head p{margin-top:2px;color:#D9C9B0;font-size:10px}.tc-settings-head>button{display:grid;width:36px;height:36px;place-items:center;border:1px solid rgba(217,201,176,.22);border-radius:10px;background:rgba(217,201,176,.08);color:#fff;cursor:pointer}
  .tc-settings-body{display:flex;max-height:calc(92dvh - 75px);flex-direction:column;gap:14px;overflow-y:auto;padding:17px}
  .tc-setting-section{border:1px solid #E5E0D5;border-radius:17px;background:#FFFBF5;padding:15px}.tc-setting-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.tc-setting-title strong{color:#32101A;font-size:13px}.tc-setting-title small{border-radius:999px;background:#EFEAE0;padding:3px 9px;color:#8F765B;font-size:9px;font-weight:900}
  .tc-name-row{display:flex;gap:8px}.tc-name-row input{min-width:0;flex:1;border:1px solid #D9C9B0;border-radius:11px;background:#fff;padding:11px 13px;color:#32101A;font:700 13px 'Cairo',sans-serif;outline:none}.tc-name-row input:focus{border-color:#B8A082;box-shadow:0 0 0 3px rgba(184,160,130,.13)}.tc-name-row button{display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:11px;background:#6B1E2D;padding:10px 15px;color:#fff;font:800 11px 'Cairo',sans-serif;cursor:pointer}.tc-name-row button:disabled{opacity:.4;cursor:not-allowed}
  .tc-request-list{display:flex;flex-direction:column;gap:7px}.tc-request-list.history{max-height:260px;overflow-y:auto}.tc-request{display:flex;align-items:center;gap:10px;border:1px solid #E5E0D5;border-radius:13px;background:#F7F3EB;padding:10px}.tc-request.pending{border-color:#D9C9B0;background:#FFFBF5}.tc-request-avatar{display:grid;width:38px;height:38px;flex:none;place-items:center;border-radius:11px;background:#32101A;color:#D9C9B0;font-size:13px;font-weight:900}.tc-request>div:not(.tc-request-actions){display:flex;min-width:0;flex:1;flex-direction:column}.tc-request>div>strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#32101A;font-size:12px}.tc-request>div>small,.tc-request time{color:#796A62;font-size:9px}.tc-request-actions{display:flex;gap:6px}.tc-request-actions button{display:flex;align-items:center;gap:5px;border-radius:9px;padding:7px 9px;font:800 9px 'Cairo',sans-serif;cursor:pointer}.tc-request-actions .approve{border:1px solid rgba(27,94,32,.24);background:rgba(27,94,32,.08);color:#1B5E20}.tc-request-actions .reject{border:1px solid rgba(107,30,45,.2);background:rgba(107,30,45,.06);color:#6B1E2D}.tc-request-actions button:disabled{opacity:.45}
  .tc-request-status{display:flex;align-items:center;gap:5px;flex:none;border-radius:999px;padding:5px 8px;font-size:8.5px;font-weight:900}.tc-request-status.approved{background:rgba(27,94,32,.09);color:#1B5E20}.tc-request-status.rejected{background:rgba(107,30,45,.08);color:#6B1E2D}.tc-request-status.pending{background:#EFEAE0;color:#8F765B}.tc-requests-empty{display:flex;align-items:center;justify-content:center;gap:7px;border:1px dashed #D9C9B0;border-radius:12px;padding:18px;color:#796A62;font-size:10.5px;font-weight:700}.tc-settings-message{position:sticky;bottom:0;border:1px solid #D9C9B0;border-radius:11px;background:#FFFBF5;padding:10px 12px;color:#6B1E2D;font-size:10.5px;font-weight:800;box-shadow:0 8px 22px rgba(107,30,45,.08)}

  /* Grid */
  .tc-grid{display:grid;grid-template-columns:290px 1fr;gap:16px;align-items:start}
  @media(max-width:768px){.tc-grid{grid-template-columns:1fr}}
  @media(max-width:900px){.tc-invite-card{grid-template-columns:1fr}.tc-invite-steps{margin-top:16px}}

  /* Card */
  .tc-card{background:#FFFBF5;border:1px solid rgba(184,160,130,0.14);border-radius:18px;overflow:hidden;animation:fadeUp 0.35s ease both}
  .tc-card-head{display:flex;align-items:center;gap:9px;padding:13px 17px;border-bottom:1px solid rgba(184,160,130,0.09);background:rgba(184,160,130,0.03)}
  .tc-card-icon{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:#1A1A1A;border:1px solid rgba(184,160,130,0.18);display:flex;align-items:center;justify-content:center;color:#B8A082}
  .tc-card-title{font-size:13.5px;font-weight:800;color:#1A1A1A;flex:1}
  .tc-badge{font-size:11px;font-weight:800;color:#8F765B;background:rgba(184,160,130,0.12);border:1px solid rgba(184,160,130,0.2);padding:2px 8px;border-radius:99px}

  /* Students list */
  .tc-students{padding:10px 12px;display:flex;flex-direction:column;gap:3px;max-height:400px;overflow-y:auto}
  .tc-student-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;transition:background 0.14s,transform 0.14s;animation:fadeUp 0.25s ease both;text-decoration:none;cursor:pointer}
  .tc-student-row:hover{background:rgba(184,160,130,0.09);transform:translateX(-2px)}
  [dir="rtl"] .tc-student-row:hover{transform:translateX(2px)}
  .tc-student-av{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:rgba(184,160,130,0.1);border:1.5px solid rgba(184,160,130,0.18);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#8F765B}
  .tc-student-name{flex:1;font-size:13px;font-weight:600;color:#4A0E1C}
  .tc-student-chev{flex-shrink:0;color:#B8A082;opacity:0.55;transition:opacity 0.14s}
  [dir="rtl"] .tc-student-chev{transform:scaleX(-1)}
  .tc-student-row:hover .tc-student-chev{opacity:1}
  .tc-inner-empty{text-align:center;color:#796A62;font-size:13px;padding:22px 0}

  /* Composer */
  .tc-composer{padding:14px 16px;border-bottom:1px solid rgba(184,160,130,0.09);display:flex;flex-direction:column;gap:10px}
  .tc-textarea{width:100%;padding:11px 13px;background:#EFEAE0;border:1.5px solid rgba(184,160,130,0.15);border-radius:10px;font-size:13px;font-family:'Cairo',Tajawal,sans-serif;color:#1A1A1A;outline:none;resize:none;line-height:1.65;transition:border-color 0.15s,box-shadow 0.15s}
  .tc-textarea:focus{border-color:rgba(184,160,130,0.35);background:#FFFBF5;box-shadow:0 0 0 3px rgba(184,160,130,0.07)}
  .tc-textarea::placeholder{color:#B8A082}
  .tc-post-btn{display:flex;align-items:center;justify-content:center;gap:7px;background:#1A1A1A;color:#B8A082;padding:10px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .tc-post-btn:hover:not(:disabled){background:#B8A082;color:#1A1A1A}
  .tc-post-btn:disabled{opacity:0.4;cursor:not-allowed}
  .tc-btn-spin{width:13px;height:13px;border:2px solid rgba(184,160,130,0.3);border-top-color:#B8A082;border-radius:50%;animation:sp 0.7s linear infinite}

  /* Ann list */
  .tc-ann-list{padding:8px 14px;display:flex;flex-direction:column;gap:0;max-height:420px;overflow-y:auto}
  .tc-ann-item{display:flex;gap:11px;padding:13px 0;border-bottom:1px solid rgba(184,160,130,0.07);animation:fadeUp 0.25s ease both;transition:opacity 0.3s}
  .tc-ann-item:last-child{border-bottom:none}
  .tc-ann-item.deleting{animation:fadeOut 0.3s ease forwards}
  .tc-ann-bar{width:3px;min-height:36px;background:linear-gradient(180deg,#B8A082,#B8A082);border-radius:99px;flex-shrink:0;margin:2px 0}
  .tc-ann-body{flex:1}
  .tc-ann-text{font-size:13.5px;color:#4A0E1C;line-height:1.65;margin-bottom:9px}
  .tc-ann-foot{display:flex;align-items:center;justify-content:space-between}
  .tc-ann-meta{display:flex;align-items:center;gap:5px;font-size:11px;color:#8F765B;font-weight:600}
  .tc-ann-dot{width:3px;height:3px;border-radius:50%;background:rgba(184,160,130,0.4)}
  .tc-del-ann{background:none;border:1px solid rgba(184,160,130,0.2);color:#796A62;font-size:12px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:7px;transition:all 0.14s;font-family:'Cairo',Tajawal,sans-serif;display:flex;align-items:center}
  .tc-del-ann:hover:not(:disabled){border-color:rgba(184,160,130,0.35);color:#8F765B;background:rgba(184,160,130,0.06)}
  .tc-del-ann:disabled{opacity:0.4;cursor:not-allowed}

  /* Empty */
  .tc-empty{background:#FFFBF5;border:1px solid rgba(184,160,130,0.14);border-radius:18px;padding:56px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;animation:fadeUp 0.4s ease both}
  .tc-empty-icon{color:rgba(184,160,130,0.35)}
  .tc-empty h3{font-size:16px;font-weight:800;color:#1A1A1A}
  .tc-empty p{font-size:13px;color:#796A62}

  @media(max-width:600px){
    .tc-shell{padding:16px 14px;gap:16px}
    .tc-page-header{padding:18px 18px}
    .tc-page-title{font-size:19px}
    .tc-header-stat{padding:10px 14px}
    .tc-header-stat-num{font-size:22px}
    .tc-textarea{font-size:16px}
    .tc-empty{padding:36px 20px}
    .tc-tab{padding:7px 13px;font-size:13px}
    .tc-invite-card{padding:16px;gap:15px;border-radius:17px}
    .tc-invite-heading h2{font-size:16px}
    .tc-invite-steps{flex-direction:column;gap:7px}
    .tc-invite-steps i{display:none}
    .tc-invite-buttons{grid-template-columns:1fr}
    .tc-invite-action{padding:12px}
    .tc-settings-overlay{padding:0}.tc-settings-panel{max-height:100dvh;border-radius:0}.tc-settings-body{max-height:calc(100dvh - 75px);padding:12px}.tc-name-row,.tc-request{align-items:stretch;flex-direction:column}.tc-request-avatar{display:none}.tc-request-actions{display:grid;grid-template-columns:1fr 1fr}.tc-request-actions button{justify-content:center}.tc-request-status{align-self:flex-start}
  }
  @media(max-width:400px){
    .tc-shell{padding:14px 11px}
    .tc-page-header{padding:14px 15px}
    .tc-page-title{font-size:17px}
    .tc-header-stat{padding:8px 12px}
    .tc-header-stat-num{font-size:19px}
    .tc-empty{padding:28px 16px}
    .tc-empty h3{font-size:15px}
  }

  /* 2026 class workspace — visual hierarchy and top-layer settings */
  .tc-shell{gap:16px;min-height:100vh;background:radial-gradient(circle at 12% 4%,rgba(184,160,130,.15),transparent 25%),linear-gradient(180deg,#F7F3EB,#EFEAE0);padding:24px;color:#32101A}
  .tc-page-header{min-height:190px;align-items:stretch;border:1px solid rgba(217,201,176,.22);border-radius:26px;background:radial-gradient(circle at 85% 12%,rgba(217,201,176,.16),transparent 27%),linear-gradient(135deg,#32101A,#6B1E2D 72%,#4A0E1C);padding:27px 29px;box-shadow:0 22px 50px rgba(107,30,45,.16)}
  .tc-page-header:before{inset-inline:0 auto;width:42%;height:3px;background:linear-gradient(90deg,#B8A082,transparent)}
  .tc-hero-copy{position:relative;z-index:1;display:flex;max-width:620px;flex-direction:column;justify-content:center}.tc-eyebrow{display:flex;align-items:center;gap:7px;margin:0 0 7px;color:#D9C9B0;font-size:10px;letter-spacing:.08em}.tc-page-title{color:#FFFBF5;font-size:clamp(25px,3vw,36px);letter-spacing:-.04em}.tc-hero-copy>p{max-width:560px;margin-top:7px;color:#D9C9B0;font-size:12px;line-height:1.8;font-weight:700}
  .tc-header-stats{position:relative;z-index:1;display:grid;width:min(480px,48%);grid-template-columns:repeat(3,1fr);gap:8px;align-self:center}.tc-header-stats article{display:flex;min-width:0;align-items:center;gap:9px;border:1px solid rgba(217,201,176,.18);border-radius:15px;background:rgba(107,30,45,.28);padding:12px;backdrop-filter:blur(10px)}.tc-header-stats article>span{display:grid;width:37px;height:37px;flex:none;place-items:center;border-radius:11px;background:rgba(217,201,176,.12);color:#D9C9B0}.tc-header-stats article>div{display:flex;min-width:0;flex-direction:column}.tc-header-stats strong{color:#FFFBF5;font-size:20px;line-height:1}.tc-header-stats small{margin-top:4px;color:#D9C9B0;font-size:8.5px;font-weight:800;line-height:1.4}.tc-header-stats article.attention{border-color:rgba(217,201,176,.36);background:rgba(184,160,130,.16)}
  .tc-classbar{display:block;border:1px solid #E5E0D5;border-radius:20px;background:rgba(255,251,245,.86);padding:13px;box-shadow:0 10px 30px rgba(107,30,45,.06)}.tc-classbar-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:2px 3px 11px}.tc-classbar-head>div{display:flex;align-items:center;gap:8px}.tc-classbar-head span{color:#6B1E2D;font-size:10px;font-weight:900}.tc-classbar-head strong{border-radius:999px;background:#EFEAE0;padding:3px 8px;color:#8F765B;font-size:8px}.tc-classbar-head>small{color:#796A62;font-size:9px;font-weight:700}.tc-tabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:7px}.tc-tab{position:relative;justify-content:flex-start;gap:9px;min-height:58px;border:1px solid #E5E0D5;border-radius:14px;background:#FFFBF5;padding:8px 10px;color:#32101A;text-align:start;box-shadow:none}.tc-tab:hover{border-color:#D9C9B0;background:#F7F3EB;transform:translateY(-1px)}.tc-tab.active{border-color:#6B1E2D;background:linear-gradient(135deg,#6B1E2D,#4A0E1C);color:#FFFBF5;box-shadow:0 8px 20px rgba(107,30,45,.16)}.tc-tab-mark{display:grid;width:37px;height:37px;flex:none;place-items:center;border-radius:11px;background:#EFEAE0;color:#6B1E2D;font-size:13px;font-weight:900}.tc-tab.active .tc-tab-mark{background:rgba(217,201,176,.16);color:#D9C9B0}.tc-tab-copy{display:flex;min-width:0;flex:1;flex-direction:column}.tc-tab-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px}.tc-tab-copy small{margin-top:2px;color:#796A62;font-size:8px}.tc-tab.active .tc-tab-copy small{color:#D9C9B0}.tc-tab>b{display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#B8A082;padding:0 5px;color:#32101A;font-size:8px}
  .tc-workspace-head{display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid #E5E0D5;border-radius:20px;background:#FFFBF5;padding:16px 18px;box-shadow:0 12px 32px rgba(107,30,45,.055)}.tc-workspace-title{display:flex;min-width:0;align-items:center;gap:12px}.tc-workspace-mark{display:grid;width:51px;height:51px;flex:none;place-items:center;border-radius:15px;background:linear-gradient(145deg,#32101A,#6B1E2D);color:#D9C9B0;font-size:18px;font-weight:900;box-shadow:0 8px 20px rgba(107,30,45,.17)}.tc-workspace-title>div{min-width:0}.tc-workspace-title small{color:#8F765B;font-size:8px;font-weight:900;letter-spacing:.08em}.tc-workspace-title h2{overflow:hidden;margin:2px 0;text-overflow:ellipsis;white-space:nowrap;color:#32101A;font-size:19px}.tc-workspace-title p{color:#796A62;font-size:9.5px;font-weight:700}.tc-workspace-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.tc-workspace-actions button{display:flex;min-height:39px;align-items:center;justify-content:center;gap:6px;border-radius:11px;padding:0 11px;font:800 9.5px 'Cairo',sans-serif;cursor:pointer}.tc-workspace-actions button:disabled{opacity:.5;cursor:not-allowed}.tc-workspace-actions .primary{border:1px solid #6B1E2D;background:#6B1E2D;color:#FFFBF5}.tc-workspace-actions .secondary{border:1px solid #D9C9B0;background:#F7F3EB;color:#6B1E2D}.tc-workspace-actions .secondary.icon-only{width:39px;flex:none;padding:0}.tc-workspace-actions .attention{border:1px solid rgba(107,30,45,.18);background:#EFEAE0;color:#6B1E2D}.tc-workspace-actions .attention b{display:grid;min-width:19px;height:19px;place-items:center;border-radius:999px;background:#6B1E2D;color:#FFFBF5;font-size:8px}.tc-workspace-actions .spin{animation:sp .7s linear infinite}
  .tc-overview-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.tc-overview-strip>article,.tc-overview-strip>button{display:flex;min-width:0;align-items:center;gap:9px;border:1px solid #E5E0D5;border-radius:15px;background:#FFFBF5;padding:11px 12px;text-align:start;color:#32101A}.tc-overview-strip>button{cursor:pointer;font-family:'Cairo',sans-serif}.tc-overview-strip>button:hover{border-color:#D9C9B0;background:#F7F3EB}.tc-overview-strip>button.has-pending{border-color:rgba(107,30,45,.22);background:#F7F3EB}.tc-overview-strip>article>span,.tc-overview-strip>button>span{display:grid;width:37px;height:37px;flex:none;place-items:center;border-radius:11px;background:#EFEAE0;color:#6B1E2D}.tc-overview-strip>div{min-width:0}.tc-overview-strip small{display:block;color:#796A62;font-size:8px;font-weight:800}.tc-overview-strip strong{display:block;overflow:hidden;margin-top:1px;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.tc-overview-strip>button>svg{margin-inline-start:auto;color:#B8A082}
  .tc-grid{grid-template-columns:minmax(330px,.85fr) minmax(430px,1.15fr);gap:12px}.tc-card{border:1px solid #E5E0D5;border-radius:20px;background:#FFFBF5;box-shadow:0 12px 32px rgba(107,30,45,.05)}.tc-card-head{padding:14px 15px;border-bottom:1px solid #E5E0D5;background:linear-gradient(180deg,#FFFBF5,#F7F3EB)}.tc-card-icon{width:37px;height:37px;border:0;border-radius:11px;background:#32101A;color:#D9C9B0}.tc-card-heading{min-width:0;flex:1}.tc-card-heading h2{color:#32101A;font-size:13px}.tc-card-heading p{margin-top:1px;color:#796A62;font-size:8px}.tc-badge{border:0;background:#EFEAE0;color:#6B1E2D;padding:4px 9px}
  .tc-roster-tools{display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1px solid #E5E0D5}.tc-roster-tools label{display:flex;min-width:0;flex:1;align-items:center;gap:7px;border:1px solid #E5E0D5;border-radius:10px;background:#F7F3EB;padding:0 10px;color:#8F765B}.tc-roster-tools input{min-width:0;height:37px;flex:1;border:0;background:transparent;color:#32101A;font:700 10px 'Cairo',sans-serif;outline:none}.tc-roster-tools button{display:flex;height:37px;align-items:center;gap:5px;border:1px solid #D9C9B0;border-radius:10px;background:#FFFBF5;padding:0 9px;color:#6B1E2D;font:800 8.5px 'Cairo',sans-serif;cursor:pointer}.tc-roster-tools button:disabled{opacity:.4}.tc-students{max-height:430px;gap:5px;padding:10px}.tc-student-row{gap:9px;border:1px solid transparent;border-radius:12px;padding:9px}.tc-student-row:hover{border-color:#E5E0D5;background:#F7F3EB;transform:translateY(-1px)}[dir="rtl"] .tc-student-row:hover{transform:translateY(-1px)}.tc-student-av,.tc-request-avatar{display:grid;width:38px;height:38px;flex:none;place-items:center;border:0;border-radius:11px;background:#EFEAE0 center/cover no-repeat;color:#6B1E2D;font-size:12px;font-weight:900}.tc-student-av.has-image,.tc-request-avatar.has-image{box-shadow:inset 0 0 0 1px rgba(107,30,45,.12)}.tc-student-copy{display:flex;min-width:0;flex:1;flex-direction:column}.tc-student-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#32101A;font-size:11px}.tc-student-copy small{color:#796A62;font-size:8px}.tc-profile-link{display:flex;align-items:center;gap:4px;color:#8F765B;font-size:8px;font-weight:900}.tc-inner-empty{padding:36px 12px;color:#796A62;font-size:10px}
  .tc-composer{gap:8px;padding:12px 14px}.tc-textarea{min-height:105px;border:1px solid #E5E0D5;border-radius:12px;background:#F7F3EB;padding:12px;color:#32101A;font-size:11px}.tc-textarea:focus{border-color:#B8A082;background:#FFFBF5;box-shadow:0 0 0 3px rgba(184,160,130,.12)}.tc-composer-meta{display:flex;align-items:center;justify-content:space-between;color:#8F765B;font-size:8px}.tc-composer-meta b{font-size:8px}.tc-post-btn{min-height:41px;border-radius:11px;background:#6B1E2D;color:#FFFBF5;font-size:10px}.tc-post-btn:hover:not(:disabled){background:#4A0E1C;color:#FFFBF5}.tc-action-error{border-radius:9px;background:rgba(107,30,45,.07);padding:7px 9px;color:#6B1E2D;font-size:9px;font-weight:800}.tc-ann-list{max-height:360px;padding:8px 14px}.tc-ann-item{padding:12px 0}.tc-ann-bar{background:#B8A082}.tc-ann-text{color:#32101A;font-size:11.5px}.tc-ann-meta{font-size:8.5px}
  .tc-settings-overlay{position:fixed;z-index:2147483000;inset:0;display:grid;place-items:center;background:rgba(107,30,45,.72);padding:18px;backdrop-filter:blur(12px)}.tc-settings-panel{display:flex;width:min(980px,100%);max-height:calc(100dvh - 36px);overflow:hidden;flex-direction:column;border:1px solid rgba(217,201,176,.34);border-radius:25px;background:#F7F3EB;box-shadow:0 38px 110px rgba(107,30,45,.38);font-family:'Cairo',sans-serif;color:#32101A}.tc-settings-head{min-height:91px;flex:none;background:radial-gradient(circle at 12% -15%,rgba(217,201,176,.18),transparent 32%),linear-gradient(135deg,#32101A,#6B1E2D);padding:16px 19px}.tc-settings-identity{display:flex;align-items:center;gap:11px}.tc-settings-identity>span{display:grid;width:48px;height:48px;flex:none;place-items:center;border:1px solid rgba(217,201,176,.25);border-radius:14px;background:rgba(217,201,176,.12);color:#D9C9B0;font-size:17px;font-weight:900}.tc-settings-identity>div{min-width:0}.tc-settings-identity small{color:#D9C9B0;font-size:8px;font-weight:900;letter-spacing:.08em}.tc-settings-identity h2{overflow:hidden;margin:1px 0;text-overflow:ellipsis;white-space:nowrap;color:#FFFBF5;font-size:18px}.tc-settings-identity p{color:#D9C9B0;font-size:9px}.tc-settings-head>button{width:39px;height:39px;border-radius:11px}
  .tc-settings-layout{display:grid;min-height:0;flex:1;grid-template-columns:205px minmax(0,1fr)}.tc-settings-nav{display:flex;min-height:0;flex-direction:column;gap:5px;border-inline-end:1px solid #E5E0D5;background:#EFEAE0;padding:13px}.tc-settings-nav button{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:45px;border:1px solid transparent;border-radius:11px;background:transparent;padding:7px 8px;color:#655B53;text-align:start;font:800 9.5px 'Cairo',sans-serif;cursor:pointer}.tc-settings-nav button:hover{background:#F7F3EB;color:#6B1E2D}.tc-settings-nav button.active{border-color:#D9C9B0;background:#FFFBF5;color:#6B1E2D;box-shadow:0 6px 16px rgba(107,30,45,.06)}.tc-settings-nav button>svg{width:28px;height:28px;border-radius:8px;background:#F7F3EB;padding:6px}.tc-settings-nav button.active>svg{background:#6B1E2D;color:#FFFBF5}.tc-settings-nav b{display:grid;min-width:19px;height:19px;place-items:center;border-radius:999px;background:#D9C9B0;padding:0 5px;color:#655B53;font-size:8px}.tc-settings-nav b.live{background:rgba(27,94,32,.09);color:#1B5E20}.tc-settings-nav b.alert{background:#6B1E2D;color:#FFFBF5}
  .tc-settings-body{display:block;max-height:none;min-height:0;overflow-y:auto;padding:17px}.tc-tab-panel{display:flex;flex-direction:column;gap:12px;animation:fadeUp .2s ease}.tc-panel-intro{display:flex;align-items:center;gap:10px;border-bottom:1px solid #E5E0D5;padding:0 1px 13px}.tc-panel-intro>span{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:11px;background:#32101A;color:#D9C9B0}.tc-panel-intro>div{min-width:0;flex:1}.tc-panel-intro h3{font-size:14px}.tc-panel-intro p{margin-top:2px;color:#796A62;font-size:9px;line-height:1.6}.tc-panel-intro>b{border-radius:999px;padding:5px 9px;font-size:8px}.tc-panel-intro>b.active,.tc-panel-intro>b.clear{background:rgba(27,94,32,.08);color:#1B5E20}.tc-panel-intro>b.inactive,.tc-panel-intro>b.pending{background:#EFEAE0;color:#6B1E2D}
  .tc-modal-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tc-modal-metrics article{display:flex;align-items:center;gap:9px;border:1px solid #E5E0D5;border-radius:13px;background:#FFFBF5;padding:11px;color:#6B1E2D}.tc-modal-metrics article>div{display:flex;flex-direction:column}.tc-modal-metrics strong{color:#32101A;font-size:17px}.tc-modal-metrics small{color:#796A62;font-size:8px}.tc-setting-section{border-color:#E5E0D5;background:#FFFBF5;padding:14px}.tc-setting-title{margin-bottom:10px}.tc-setting-title>div{min-width:0}.tc-setting-title>div p{margin-top:2px;color:#796A62;font-size:8.5px}.tc-name-row input{background:#F7F3EB}.tc-name-row button{background:#6B1E2D}.tc-modal-shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tc-modal-shortcuts button{display:flex;align-items:center;gap:9px;border:1px solid #E5E0D5;border-radius:13px;background:#FFFBF5;padding:10px;color:#32101A;text-align:start;font-family:'Cairo',sans-serif;cursor:pointer}.tc-modal-shortcuts button:hover{border-color:#D9C9B0;background:#F7F3EB}.tc-modal-shortcuts button>span{display:grid;width:37px;height:37px;place-items:center;border-radius:10px;background:#EFEAE0;color:#6B1E2D}.tc-modal-shortcuts button>div{display:flex;min-width:0;flex:1;flex-direction:column}.tc-modal-shortcuts strong{font-size:10px}.tc-modal-shortcuts small{color:#796A62;font-size:8px}.tc-modal-shortcuts button>svg{color:#B8A082}
  .tc-invite-workspace{border:1px solid #D9C9B0;border-radius:17px;background:#FFFBF5;padding:14px;box-shadow:0 10px 26px rgba(107,30,45,.05)}.tc-link-box{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:8px;border:1px solid #E5E0D5;border-radius:11px;background:#F7F3EB;padding:7px 8px;color:#8F765B}.tc-link-box>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}.tc-link-box>button{display:flex;align-items:center;gap:5px;border:0;border-radius:8px;background:#6B1E2D;padding:7px 9px;color:#FFFBF5;font:800 8.5px 'Cairo',sans-serif;cursor:pointer}.tc-invite-buttons{display:flex;grid-template-columns:none;gap:7px;margin-top:9px}.tc-invite-buttons button,.tc-invite-buttons a{min-height:37px;border:1px solid #D9C9B0;border-radius:9px;background:#F7F3EB;padding:0 10px;color:#6B1E2D;font-size:8.5px}.tc-invite-buttons a{display:flex;align-items:center;justify-content:center;gap:6px}.tc-invite-buttons button.danger{margin-inline-start:auto;border-color:rgba(107,30,45,.16);background:rgba(107,30,45,.05)}.tc-invite-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px;color:#655B53}.tc-invite-meta span{min-width:0;border-radius:9px;background:#F7F3EB;padding:8px;font-size:8px}.tc-invite-meta strong{color:#6B1E2D}.tc-invite-empty{display:flex;min-height:185px;align-items:center;justify-content:center;flex-direction:column;text-align:center}.tc-invite-empty>span{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#EFEAE0;color:#6B1E2D}.tc-invite-empty h4{margin-top:8px;font-size:13px}.tc-invite-empty p{max-width:440px;margin-top:3px;color:#796A62;font-size:9px;line-height:1.7}.tc-invite-empty button{display:flex;min-height:39px;align-items:center;gap:6px;margin-top:11px;border:0;border-radius:10px;background:#6B1E2D;padding:0 13px;color:#FFFBF5;font:800 9px 'Cairo',sans-serif;cursor:pointer}.tc-invite-error{margin-top:8px;border-radius:9px;background:rgba(107,30,45,.07);padding:7px;color:#6B1E2D}
  .tc-join-guide{border:1px solid #E5E0D5;border-radius:15px;background:#FFFBF5;padding:13px}.tc-join-guide header strong{font-size:11px}.tc-join-guide header p{margin-top:2px;color:#796A62;font-size:8.5px}.tc-join-guide>div{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.tc-join-guide article{display:flex;align-items:center;gap:7px;border-radius:10px;background:#F7F3EB;padding:8px;color:#655B53;font-size:8.5px;font-weight:800}.tc-join-guide article b{display:grid;width:24px;height:24px;flex:none;place-items:center;border-radius:8px;background:#D9C9B0;color:#32101A;font-size:9px}
  .tc-request-list{gap:7px}.tc-request-list.history{max-height:230px}.tc-request{border-color:#E5E0D5;border-radius:12px;background:#F7F3EB;padding:9px}.tc-request.pending{border-color:#D9C9B0;background:#FFFBF5}.tc-request>div>strong{font-size:10.5px}.tc-request>div>small,.tc-request time{font-size:8px}.tc-request-actions button{min-height:33px;padding:0 9px}.tc-requests-empty{min-height:122px;flex-direction:column;border-color:#D9C9B0;padding:18px;text-align:center}.tc-requests-empty>span{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;background:#EFEAE0;color:#6B1E2D}.tc-requests-empty strong{color:#32101A;font-size:10px}.tc-requests-empty p{max-width:430px;color:#796A62;font-size:8.5px;line-height:1.65}.tc-settings-message{z-index:2;margin-top:0}
  @media(max-width:900px){.tc-page-header{min-height:0;flex-direction:column}.tc-header-stats{width:100%}.tc-overview-strip{grid-template-columns:1fr 1fr}.tc-grid{grid-template-columns:1fr}.tc-settings-layout{grid-template-columns:175px minmax(0,1fr)}}
  @media(max-width:680px){.tc-shell{padding:14px}.tc-page-header{padding:21px;border-radius:21px}.tc-header-stats{grid-template-columns:1fr}.tc-header-stats article{min-height:52px}.tc-classbar-head>small,.tc-workspace-title p{display:none}.tc-tabs{display:flex;overflow-x:auto;flex-wrap:nowrap}.tc-tab{min-width:175px}.tc-workspace-head{align-items:flex-start;flex-direction:column}.tc-workspace-actions{width:100%;justify-content:stretch}.tc-workspace-actions button{flex:1}.tc-overview-strip{grid-template-columns:1fr 1fr}.tc-profile-link{font-size:0}.tc-settings-overlay{padding:0}.tc-settings-panel{width:100%;height:100dvh;max-height:100dvh;border:0;border-radius:0}.tc-settings-head{min-height:83px}.tc-settings-layout{display:flex;flex-direction:column}.tc-settings-nav{display:grid;flex:none;grid-template-columns:repeat(3,1fr);border-inline-end:0;border-bottom:1px solid #E5E0D5;padding:7px}.tc-settings-nav button{display:flex;min-height:42px;justify-content:center;padding:6px}.tc-settings-nav button>svg{width:25px;height:25px}.tc-settings-nav button span{display:none}.tc-settings-body{padding:12px}.tc-modal-metrics,.tc-invite-meta,.tc-join-guide>div{grid-template-columns:1fr}.tc-modal-shortcuts{grid-template-columns:1fr}.tc-invite-buttons{display:grid;grid-template-columns:1fr 1fr}.tc-invite-buttons button.danger{grid-column:1/-1;margin:0}.tc-link-box{grid-template-columns:18px minmax(0,1fr)}.tc-link-box>button{grid-column:1/-1;justify-content:center}.tc-request{align-items:stretch;flex-direction:column}.tc-request-avatar{display:grid}.tc-request-actions{display:grid;grid-template-columns:1fr 1fr}.tc-request-status{align-self:flex-start}}
  @media(max-width:460px){.tc-shell{padding:10px}.tc-page-header{padding:18px}.tc-page-title{font-size:23px}.tc-overview-strip{grid-template-columns:1fr}.tc-workspace-actions{display:grid;grid-template-columns:1fr 1fr}.tc-workspace-actions .primary{grid-column:1/-1}.tc-roster-tools{align-items:stretch;flex-direction:column}.tc-roster-tools button{justify-content:center}.tc-settings-identity p{display:none}.tc-settings-identity>span{width:42px;height:42px}.tc-settings-head{padding:13px}.tc-name-row{flex-direction:column}.tc-name-row button{min-height:40px}.tc-invite-buttons{grid-template-columns:1fr}}
`;
