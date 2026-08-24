"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell, BookOpenCheck, ChevronLeft, ChevronRight, Crown, Eye, EyeOff,
  CheckCircle2, Clock3, History, LogOut, MapPin, Megaphone, PencilLine, Plus, Search, Trash2, UserMinus,
  Paperclip, Send, UserPlus, Users, X,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import GroupChatAttachments from "@/components/GroupChatAttachments";
import { formatAttachmentSize, type TeacherGroupAttachment } from "@/lib/teacher-group-attachments";
import {
  discardTeacherGroupAttachments,
  uploadTeacherGroupAttachments,
  validateGroupAttachmentFiles,
} from "@/lib/upload-teacher-group-attachments";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  created_at?: string;
  _count: { members: number; join_requests: number };
  max_members: number;
  leader_teacher_id: string | null;
  leader: { profile: { full_name: string } } | null;
};

type Member = {
  joined_at: string;
  teacher: {
    id: string;
    profile: { id: string; full_name: string; email: string | null };
    application: {
      country: string;
      city: string;
      qualification: string;
      specialization: string;
      years_of_experience: string;
      languages: unknown;
    } | null;
  };
};

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  leader_teacher_id: string | null;
  leader: { id: string; profile: { full_name: string; avatar_url: string | null } } | null;
  members: Member[];
  join_requests: JoinRequest[];
  leave_events: LeaveEvent[];
};

type JoinRequest = {
  id: string;
  requested_at: string;
  teacher: Member["teacher"];
};

type LeaveEvent = {
  id: string;
  reason: string;
  left_at: string;
  teacher: {
    id: string;
    profile: { full_name: string; email: string | null };
  };
};

type GroupAnnouncement = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { id: string; full_name: string; role: string };
  attachments: TeacherGroupAttachment[];
};

type Eligible = {
  id: string;
  profile: { id: string; full_name: string; email: string | null };
  application: {
    country: string;
    city: string;
    specialization: string;
    years_of_experience: string;
  } | null;
};

const UI = {
  ar: {
    title: "مجموعات المشرفين",
    sub: "نظِّم المشرفين المقبولين في مجموعات عمل وتدريب ومجتمع خاصة.",
    create: "+ مجموعة جديدة",
    empty: "لا توجد مجموعات بعد. أنشئ أول مجموعة لتنظيم مشرفيك.",
    members: "أعضاء",
    pickOne: "اختر مجموعة لعرض أعضائها",
    rename: "تعديل الاسم والوصف",
    name: "اسم المجموعة",
    desc: "الوصف",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    assessments: "نماذج القياس",
    deleteGroup: "حذف المجموعة",
    confirmDelete: "هل تريد حذف هذه المجموعة؟ سيتم إلغاء عضوية كل المشرفين.",
    addMembers: "+ إضافة أعضاء",
    searchPh: "ابحث بالاسم أو البريد…",
    groupSearchPh: "ابحث في المجموعات…",
    memberSearchPh: "ابحث في أعضاء المجموعة…",
    noGroupResults: "لا توجد مجموعات مطابقة.",
    noMemberResults: "لا يوجد أعضاء مطابقون للبحث.",
    noEligible: "لا يوجد مشرفون متاحون للإضافة.",
    add: "إضافة",
    remove: "إزالة",
    confirmRemove: "إزالة هذا المشرف من المجموعة؟",
    cancel: "إلغاء",
    yearsExp: "سنوات الخبرة",
    spec: "التخصص",
    location: "الموقع",
    close: "إغلاق",
    newGroupTitle: "إنشاء مجموعة جديدة",
    namePh: "مثال: مجموعة مشرفي القرآن",
    descPh: "وصف اختياري للمجموعة وأهدافها…",
    creating: "جارٍ الإنشاء…",
    capacity: "الحد الأقصى للأعضاء",
    leader: "قائد المجموعة",
    noLeader: "بدون قائد حالياً",
    capacityHelp: "يتوقف الانضمام الذاتي تلقائياً عند اكتمال العدد.",
    requests: "طلبات الانضمام",
    requestsSub: "راجع طلبات المشرفين قبل إضافتهم إلى المجموعة.",
    noRequests: "لا توجد طلبات انضمام معلّقة لهذه المجموعة.",
    selectAll: "تحديد الكل",
    clearSelection: "إلغاء التحديد",
    approveSelected: "قبول المحدد",
    rejectSelected: "رفض المحدد",
    requestPending: "بانتظار المراجعة",
    requestError: "تعذر تحديث الطلبات. حدّث الصفحة وحاول مرة أخرى.",
    capacityError: (available: number) => `لا توجد مقاعد كافية. المقاعد المتاحة الآن: ${available}.`,
    confirmApprove: (count: number) => `قبول ${count} من طلبات الانضمام وإضافة أصحابها إلى المجموعة؟`,
    confirmReject: (count: number) => `رفض ${count} من طلبات الانضمام؟`,
  },
  sq: {
    title: "Grupet e edukatorëve",
    sub: "Organizo edukatorët e pranuar në grupe pune, trajnimi dhe komunitete private.",
    create: "+ Grup i ri",
    empty: "Nuk ka grupe ende. Krijo grupin e parë.",
    members: "anëtarë",
    pickOne: "Zgjidh një grup për të parë anëtarët",
    rename: "Redakto emrin dhe përshkrimin",
    name: "Emri i grupit",
    desc: "Përshkrimi",
    save: "Ruaj",
    saving: "Po ruhet…",
    assessments: "Modelet e Matjes",
    deleteGroup: "Fshi grupin",
    confirmDelete: "Të fshihet ky grup? Të gjithë anëtarët do hiqen.",
    addMembers: "+ Shto anëtarë",
    searchPh: "Kërko sipas emrit ose email-it…",
    groupSearchPh: "Kërko në grupe…",
    memberSearchPh: "Kërko në anëtarët e grupit…",
    noGroupResults: "Nuk ka grupe që përputhen.",
    noMemberResults: "Nuk ka anëtarë që përputhen.",
    noEligible: "Nuk ka edukatorë të disponueshëm.",
    add: "Shto",
    remove: "Hiq",
    confirmRemove: "Të hiqet ky edukator nga grupi?",
    cancel: "Anulo",
    yearsExp: "Vitet e përvojës",
    spec: "Specializimi",
    location: "Vendndodhja",
    close: "Mbyll",
    newGroupTitle: "Krijo grup të ri",
    namePh: "Shembull: Edukatorët e Kuranit",
    descPh: "Përshkrim opsional…",
    creating: "Po krijohet…",
    capacity: "Numri maksimal i anëtarëve",
    leader: "Drejtuesi i grupit",
    noLeader: "Pa drejtues për momentin",
    capacityHelp: "Bashkimi automatik ndalet kur grupi mbushet.",
    requests: "Kërkesat për anëtarësim",
    requestsSub: "Shqyrto kërkesat e edukatorëve para se t'i shtosh në grup.",
    noRequests: "Nuk ka kërkesa në pritje për këtë grup.",
    selectAll: "Zgjidhi të gjitha",
    clearSelection: "Hiq përzgjedhjen",
    approveSelected: "Mirato të zgjedhurat",
    rejectSelected: "Refuzo të zgjedhurat",
    requestPending: "Në pritje të shqyrtimit",
    requestError: "Kërkesat nuk u përditësuan. Rifresko dhe provo përsëri.",
    capacityError: (available: number) => `Nuk ka vende të mjaftueshme. Vende të lira: ${available}.`,
    confirmApprove: (count: number) => `Të miratohen ${count} kërkesa dhe edukatorët të shtohen në grup?`,
    confirmReject: (count: number) => `Të refuzohen ${count} kërkesa?`,
  },
} as const;

export default function TeacherGroupsPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const A = {
    announcements: L === "ar" ? "إعلانات المجموعة" : "Njoftimet e grupit",
    announcementPh: L === "ar"
      ? "اكتب إعلاناً أو تعليقاً لهذه المجموعة..."
      : "Shkruaj një njoftim ose koment për këtë grup...",
    post: L === "ar" ? "نشر" : "Posto",
    posting: L === "ar" ? "جاري النشر..." : "Duke postuar...",
    noAnnouncements: L === "ar"
      ? "لم تتم إضافة إعلانات لهذه المجموعة بعد."
      : "Nuk ka njoftime për këtë grup ende.",
    delete: L === "ar" ? "حذف" : "Fshi",
    departures: L === "ar" ? "سجل المغادرات" : "Historiku i largimeve",
    departuresSub: L === "ar"
      ? "أسباب المغادرة التي كتبها المشرفون، مرتبة من الأحدث."
      : "Arsyet e shkruara nga edukatorët, nga më e reja.",
    noDepartures: L === "ar"
      ? "لا توجد مغادرات مسجلة لهذه المجموعة."
      : "Nuk ka largime të regjistruara për këtë grup.",
    leaveReason: L === "ar" ? "سبب المغادرة" : "Arsyeja e largimit",
    attach: L === "ar" ? "إرفاق صور أو فيديو أو PDF" : "Bashkëngjit foto, video ose PDF",
    openAttachment: L === "ar" ? "فتح المرفق" : "Hap bashkëngjitjen",
    tooManyFiles: L === "ar" ? "يمكنك إرفاق 4 ملفات كحد أقصى في الرسالة الواحدة." : "Mund të bashkëngjitësh deri në 4 skedarë për mesazh.",
    unsupportedFile: L === "ar" ? "الملف غير مدعوم. اختر صورة أو فيديو أو ملف PDF." : "Skedari nuk mbështetet. Zgjidh foto, video ose PDF.",
    fileTooLarge: L === "ar" ? "حجم الصورة أو PDF يجب ألا يتجاوز 40 MB، والفيديو 2 GB." : "Fotoja ose PDF-ja duhet të jetë deri në 40 MB, ndërsa videoja deri në 2 GB.",
    uploadError: L === "ar" ? "تعذر رفع المرفق أو نشر الرسالة. حاول مرة أخرى." : "Skedari ose mesazhi nuk u dërgua. Provo përsëri.",
    uploading: (percent: number) => L === "ar" ? `جاري رفع المرفقات... ${percent}%` : `Po ngarkohen skedarët... ${percent}%`,
  };
  const viewOnly = useViewOnly();
  const confirm = useConfirm();
  const IconChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [openVisibility, setOpenVisibility] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [groupQuery, setGroupQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
  const [selectedAnnouncementFiles, setSelectedAnnouncementFiles] = useState<File[]>([]);
  const [announcementUploadProgress, setAnnouncementUploadProgress] = useState<number | null>(null);
  const [announcementError, setAnnouncementError] = useState("");
  const announcementFileInputRef = useRef<HTMLInputElement>(null);

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", max_members: 30 });
  const [creating, setCreating] = useState(false);

  // add-members dialog
  const [addOpen, setAddOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // edit-meta state
  const [editForm, setEditForm] = useState({ name: "", description: "", max_members: 30, leader_teacher_id: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [pickedRequests, setPickedRequests] = useState<Set<string>>(new Set());
  const [requestAction, setRequestAction] = useState<"approve" | "reject" | null>(null);
  const [requestError, setRequestError] = useState("");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch("/api/school-admin/teacher-groups", { cache: "no-store" });
      const d = await r.json();
      const nextGroups = d?.groups ?? [];
      setGroups(nextGroups);
      setSelectedId((current) => current ?? nextGroups[0]?.id ?? null);
      setOpenVisibility(d?.openVisibility === true);
    } finally { setLoadingList(false); }
  }, []);

  async function toggleOpenVisibility() {
    if (viewOnly || savingVisibility) return;
    const next = !openVisibility;
    setOpenVisibility(next);
    setSavingVisibility(true);
    try {
      const r = await fetch("/api/school-admin/teacher-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openVisibility: next }),
      });
      if (!r.ok) setOpenVisibility(!next);
    } catch {
      setOpenVisibility(!next);
    } finally {
      setSavingVisibility(false);
    }
  }

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setDetail(null);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${id}`, { cache: "no-store" });
      if (!r.ok) { setDetail(null); return; }
      const d = await r.json();
      setDetail(d?.group ?? null);
      setPickedRequests(new Set());
      setRequestError("");
      setEditForm({
        name: d?.group?.name ?? "",
        description: d?.group?.description ?? "",
        max_members: d?.group?.max_members ?? 30,
        leader_teacher_id: d?.group?.leader_teacher_id ?? "",
      });
    } finally { setLoadingDetail(false); }
  }, []);

  const loadAnnouncements = useCallback(async (id: string) => {
    setLoadingAnnouncements(true);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${id}/announcements`, { cache: "no-store" });
      const d = await r.json();
      setAnnouncements(Array.isArray(d?.announcements) ? d.announcements : []);
    } finally { setLoadingAnnouncements(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    setSelectedAnnouncementFiles([]);
    setAnnouncementError("");
    setAnnouncementUploadProgress(null);
    if (announcementFileInputRef.current) announcementFileInputRef.current.value = "";
    if (!selectedId) {
      setAnnouncements([]);
      return;
    }
    loadDetail(selectedId);
    loadAnnouncements(selectedId);
  }, [selectedId, loadDetail, loadAnnouncements]);

  // ── eligible-teacher fetch (debounced)
  useEffect(() => {
    if (!addOpen || !selectedId) return;
    const t = setTimeout(async () => {
      setLoadingEligible(true);
      try {
        const url = new URL(`/api/school-admin/teacher-groups/${selectedId}/eligible`, window.location.origin);
        if (searchQ.trim()) url.searchParams.set("q", searchQ.trim());
        const r = await fetch(url.toString(), { cache: "no-store" });
        const d = await r.json();
        setEligible(d?.teachers ?? []);
      } finally { setLoadingEligible(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [addOpen, selectedId, searchQ]);

  async function createGroup() {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const r = await fetch("/api/school-admin/teacher-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!r.ok) return;
      const d = await r.json();
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", max_members: 30 });
      await loadList();
      setSelectedId(d?.group?.id ?? null);
    } finally { setCreating(false); }
  }

  async function saveMeta() {
    if (!selectedId) return;
    setSavingMeta(true);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (r.ok) {
        await Promise.all([loadList(), loadDetail(selectedId)]);
      }
    } finally { setSavingMeta(false); }
  }

  async function setLeader(teacherId: string | null) {
    if (!selectedId) return;
    const response = await fetch(`/api/school-admin/teacher-groups/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_teacher_id: teacherId }),
    });
    if (response.ok) await Promise.all([loadList(), loadDetail(selectedId)]);
  }

  async function deleteGroup() {
    if (!selectedId) return;
    const ok = await confirm({ title: T.deleteGroup, message: T.confirmDelete, confirmText: T.deleteGroup, cancelText: T.cancel, variant: "danger" });
    if (!ok) return;
    const r = await fetch(`/api/school-admin/teacher-groups/${selectedId}`, { method: "DELETE" });
    if (r.ok) {
      setSelectedId(null);
      setDetail(null);
      loadList();
    }
  }

  async function removeMember(teacherId: string) {
    if (!selectedId) return;
    const ok = await confirm({ title: T.remove, message: T.confirmRemove, confirmText: T.remove, cancelText: T.cancel, variant: "warning" });
    if (!ok) return;
    const r = await fetch(`/api/school-admin/teacher-groups/${selectedId}/members?teacher_id=${encodeURIComponent(teacherId)}`, { method: "DELETE" });
    if (r.ok) { loadDetail(selectedId); loadList(); }
  }

  async function addPicked() {
    if (!selectedId || picked.size === 0) return;
    const r = await fetch(`/api/school-admin/teacher-groups/${selectedId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_ids: Array.from(picked) }),
    });
    if (r.ok) {
      setAddOpen(false);
      setPicked(new Set());
      setSearchQ("");
      loadDetail(selectedId);
      loadList();
    }
  }

  async function reviewRequests(action: "approve" | "reject") {
    if (!selectedId || pickedRequests.size === 0 || requestAction) return;
    const count = pickedRequests.size;
    const approved = await confirm({
      title: action === "approve" ? T.approveSelected : T.rejectSelected,
      message: action === "approve" ? T.confirmApprove(count) : T.confirmReject(count),
      confirmText: action === "approve" ? T.approveSelected : T.rejectSelected,
      cancelText: T.cancel,
      variant: action === "approve" ? "normal" : "danger",
    });
    if (!approved) return;
    setRequestAction(action);
    setRequestError("");
    try {
      const response = await fetch(`/api/school-admin/teacher-groups/${selectedId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, request_ids: Array.from(pickedRequests) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRequestError(result?.error === "capacity_insufficient" ? T.capacityError(Number(result.available ?? 0)) : T.requestError);
        return;
      }
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch {
      setRequestError(T.requestError);
    } finally {
      setRequestAction(null);
    }
  }

  async function postAnnouncement() {
    if (!selectedId || (!newAnnouncement.trim() && selectedAnnouncementFiles.length === 0)) return;
    setPostingAnnouncement(true);
    setAnnouncementError("");
    setAnnouncementUploadProgress(selectedAnnouncementFiles.length ? 0 : null);
    const uploadEndpoint = `/api/school-admin/teacher-groups/${selectedId}/attachments/upload-url`;
    let attachmentTokens: string[] = [];
    try {
      if (selectedAnnouncementFiles.length) {
        attachmentTokens = await uploadTeacherGroupAttachments({
          endpoint: uploadEndpoint,
          files: selectedAnnouncementFiles,
          onProgress: setAnnouncementUploadProgress,
        });
      }
      const r = await fetch(`/api/school-admin/teacher-groups/${selectedId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newAnnouncement, attachment_tokens: attachmentTokens }),
      });
      if (!r.ok) throw new Error("post_failed");
      const d = await r.json();
      setAnnouncements((current) => [d.announcement, ...current]);
      setNewAnnouncement("");
      setSelectedAnnouncementFiles([]);
      if (announcementFileInputRef.current) announcementFileInputRef.current.value = "";
    } catch (error) {
      const partialTokens = (error as Error & { uploadedTokens?: string[] }).uploadedTokens ?? [];
      await discardTeacherGroupAttachments(uploadEndpoint, attachmentTokens.length ? attachmentTokens : partialTokens);
      setAnnouncementError(A.uploadError);
    } finally {
      setPostingAnnouncement(false);
      setAnnouncementUploadProgress(null);
    }
  }

  function selectAnnouncementAttachments(files: FileList | null) {
    const next = Array.from(files ?? []).slice(0, 5);
    const error = validateGroupAttachmentFiles(next);
    if (error) {
      setAnnouncementError(error === "too_many_attachments" ? A.tooManyFiles : error === "file_too_large" ? A.fileTooLarge : A.unsupportedFile);
      if (announcementFileInputRef.current) announcementFileInputRef.current.value = "";
      return;
    }
    setAnnouncementError("");
    setSelectedAnnouncementFiles(next);
  }

  async function deleteAnnouncement(announcementId: string) {
    if (!selectedId) return;
    setDeletingAnnouncementId(announcementId);
    try {
      const r = await fetch(
        `/api/school-admin/teacher-groups/${selectedId}/announcements?announcement_id=${encodeURIComponent(announcementId)}`,
        { method: "DELETE" },
      );
      if (r.ok) setAnnouncements((current) => current.filter((a) => a.id !== announcementId));
    } finally { setDeletingAnnouncementId(null); }
  }

  const visibleGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => [g.name, g.description ?? ""].some((v) => v.toLowerCase().includes(q)));
  }, [groups, groupQuery]);

  const visibleMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const members = detail?.members ?? [];
    if (!q) return members;
    return members.filter((m) => {
      const app = m.teacher.application;
      const haystack = [
        m.teacher.profile.full_name,
        m.teacher.profile.email,
        app?.country,
        app?.city,
        app?.specialization,
        app?.qualification,
        app?.years_of_experience,
        Array.isArray(app?.languages) ? JSON.stringify(app?.languages) : "",
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [detail?.members, memberQuery]);

  return (
    <div className="tg" dir={dir}>
      <header className="tg-hero">
        <div className="tg-hero-copy">
          <span className="tg-eyebrow"><Users size={15} />{L === "ar" ? "مساحة تنظيم المشرفين" : "Hapësira e organizimit"}</span>
          <h1 className="tg-title">{T.title}</h1>
          <p className="tg-sub">{T.sub}</p>
        </div>
        <div className="tg-hero-actions">
          {!viewOnly && (
            <button
              className={`tg-visibility${openVisibility ? " on" : ""}`}
              onClick={toggleOpenVisibility}
              disabled={savingVisibility}
              data-write="true"
            >
              <span className="tg-visibility-icon">{openVisibility ? <Eye size={17} /> : <EyeOff size={17} />}</span>
              <span><strong>{L === "ar" ? "رؤية المجموعات" : "Shikimi i grupeve"}</strong>
              <span>{openVisibility ? (L === "ar" ? "مفتوحة لكل المشرفين" : "E hapur për edukatorët") : (L === "ar" ? "خاصة بكل مجموعة" : "Private për çdo grup")}</span>
              </span>
            </button>
          )}
          {!viewOnly && (
            <button className="tg-new" onClick={() => setCreateOpen(true)} data-write="true">
              <Plus size={17} />{T.create.replace(/^\+\s*/, "")}
            </button>
          )}
        </div>
      </header>

      <div className="tg-layout">
        <aside className="tg-side">
          <div className="tg-side-head">
            <div><strong>{L === "ar" ? "كل المجموعات" : "Të gjitha grupet"}</strong><span>{groups.length} {T.members.replace(/.*/, L === "ar" ? "مجموعات" : "grupe")}</span></div>
            {!viewOnly && <button onClick={() => setCreateOpen(true)} aria-label={T.create}><Plus size={16} /></button>}
          </div>
          {groups.length > 0 && (
            <label className="tg-side-search"><Search size={16}/><input value={groupQuery} onChange={(e) => setGroupQuery(e.target.value)} placeholder={T.groupSearchPh}/></label>
          )}
          {loadingList ? <MandalaLoader /> : visibleGroups.length === 0 ? (
            <div className="tg-empty">{groups.length === 0 ? T.empty : T.noGroupResults}</div>
          ) : (
            <ul className="tg-list">
              {visibleGroups.map((g) => (
                <li key={g.id}>
                  <button
                    className={`tg-list-item${selectedId === g.id ? " active" : ""}`}
                    onClick={() => setSelectedId(g.id)}
                  >
                    <span className="tg-group-mark">{g.name.trim().slice(0, 1).toUpperCase()}</span>
                    <span className="tg-list-copy"><span className="tg-list-name">{g.name}</span><span className="tg-list-meta">{g._count.members} / {g.max_members} {T.members}{g._count.join_requests > 0 && <b>{g._count.join_requests} {T.requests}</b>}</span></span>
                    <IconChevron className="tg-list-arrow" size={16}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="tg-detail">
          {!selectedId ? (
            <div className="tg-detail-empty">{T.pickOne}</div>
          ) : loadingDetail || !detail ? (
            <MandalaLoader />
          ) : (
            <>
              <div className="tg-detail-head">
                <div className="tg-detail-title-row">
                  <div className="tg-detail-mark"><Users size={25}/></div>
                  <div><span className="tg-detail-kicker">{L === "ar" ? "مجموعة مشرفين" : "Grup edukatorësh"}</span><h2>{detail.name}</h2><p>{detail.description || (L === "ar" ? "لا يوجد وصف لهذه المجموعة بعد." : "Nuk ka përshkrim për këtë grup.")}</p></div>
                </div>
                {!viewOnly && <details className="tg-edit-panel"><summary><PencilLine size={14}/>{T.rename}</summary><div className="tg-edit-fields">
                  <label>{T.name}<input className="tg-meta-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}/></label>
                  <label>{T.desc}<textarea className="tg-meta-desc" placeholder={T.descPh} rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}/></label>
                  <label>{T.capacity}<input type="number" min={Math.max(1, detail.members.length)} max={500} value={editForm.max_members} onChange={(e) => setEditForm({ ...editForm, max_members: Number(e.target.value) })}/><small>{T.capacityHelp}</small></label>
                  <label>{T.leader}<select value={editForm.leader_teacher_id} onChange={(e) => setEditForm({ ...editForm, leader_teacher_id: e.target.value })}><option value="">{T.noLeader}</option>{detail.members.map((member) => <option value={member.teacher.id} key={member.teacher.id}>{member.teacher.profile.full_name}</option>)}</select></label>
                  <button className="tg-btn tg-btn-primary" onClick={saveMeta} disabled={savingMeta || !editForm.name.trim()}>{savingMeta ? T.saving : T.save}</button>
                </div></details>}
                <div className="tg-meta-actions">
                  <Link className="tg-btn" href={`/school-admin/assessments?group=${detail.id}`}>
                    <BookOpenCheck size={15}/>{T.assessments}
                  </Link>
                  <span className="tg-spacer" />
                  {!viewOnly && (
                    <button className="tg-btn tg-btn-primary" onClick={() => { setAddOpen(true); setPicked(new Set()); setSearchQ(""); }} data-write="true">
                      <UserPlus size={15}/>{T.addMembers.replace(/^\+\s*/, "")}
                    </button>
                  )}
                  {!viewOnly && <button className="tg-icon-danger" onClick={deleteGroup} title={T.deleteGroup}><Trash2 size={16}/></button>}
                </div>
              </div>

              <div className="tg-overview-strip">
                <div><span className="tg-overview-icon"><Users size={18}/></span><strong>{detail.members.length} / {detail.max_members}</strong><small>{T.members}</small></div>
                <div><span className="tg-overview-icon"><Clock3 size={18}/></span><strong>{detail.join_requests.length}</strong><small>{T.requests}</small></div>
                <div><span className="tg-overview-icon"><Megaphone size={18}/></span><strong>{announcements.length}</strong><small>{A.announcements}</small></div>
                <div><span className="tg-overview-icon"><Crown size={18}/></span><strong>{detail.leader?.profile.full_name || T.noLeader}</strong><small>{T.leader}</small></div>
                <div><span className="tg-overview-icon"><Eye size={18}/></span><strong>{openVisibility ? (L === "ar" ? "مفتوحة" : "E hapur") : (L === "ar" ? "خاصة" : "Private")}</strong><small>{L === "ar" ? "خصوصية المجموعة" : "Privatësia e grupit"}</small></div>
              </div>

              <section className="tg-requests-section">
                <div className="tg-section-heading tg-request-heading">
                  <div><Clock3 size={18}/><span><strong>{T.requests}</strong><small>{T.requestsSub}</small></span></div>
                  <b>{detail.join_requests.length}</b>
                </div>
                {detail.join_requests.length === 0 ? (
                  <div className="tg-request-empty"><CheckCircle2 size={22}/><span>{T.noRequests}</span></div>
                ) : (
                  <>
                    {!viewOnly && <div className="tg-request-toolbar" data-write-area="true">
                      <button className="tg-request-select" onClick={() => setPickedRequests(pickedRequests.size === detail.join_requests.length ? new Set() : new Set(detail.join_requests.map((item) => item.id)))}>
                        {pickedRequests.size === detail.join_requests.length ? T.clearSelection : T.selectAll}
                      </button>
                      <span>{pickedRequests.size} / {detail.join_requests.length}</span>
                      <div />
                      <button className="tg-request-approve" onClick={() => void reviewRequests("approve")} disabled={pickedRequests.size === 0 || requestAction !== null}><CheckCircle2 size={14}/>{T.approveSelected}</button>
                      <button className="tg-request-reject" onClick={() => void reviewRequests("reject")} disabled={pickedRequests.size === 0 || requestAction !== null}><X size={14}/>{T.rejectSelected}</button>
                    </div>}
                    {requestError && <div className="tg-request-error" role="alert">{requestError}</div>}
                    <div className="tg-request-list">
                      {detail.join_requests.map((request) => {
                        const selected = pickedRequests.has(request.id);
                        return (
                          <label key={request.id} className={`tg-request${selected ? " selected" : ""}`}>
                            {!viewOnly && (
                              <input type="checkbox" checked={selected} onChange={() => { const next = new Set(pickedRequests); if (selected) next.delete(request.id); else next.add(request.id); setPickedRequests(next); }}/>
                            )}
                            <span className="tg-request-avatar">{request.teacher.profile.full_name.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase()}</span>
                            <span className="tg-request-main"><strong>{request.teacher.profile.full_name}</strong>{request.teacher.profile.email && <small>{request.teacher.profile.email}</small>}<em><Clock3 size={11}/>{T.requestPending} · {new Date(request.requested_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { month: "short", day: "numeric" })}</em></span>
                            {request.teacher.application && <span className="tg-request-context">{request.teacher.application.specialization || "—"}<small>{[request.teacher.application.country, request.teacher.application.city].filter(Boolean).join(" · ")}</small></span>}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              <details className="tg-departures">
                <summary>
                  <span className="tg-departure-title"><History size={18}/><span><strong>{A.departures}</strong><small>{A.departuresSub}</small></span></span>
                  <b>{detail.leave_events.length}</b>
                </summary>
                {detail.leave_events.length === 0 ? (
                  <div className="tg-departure-empty"><CheckCircle2 size={20}/>{A.noDepartures}</div>
                ) : (
                  <div className="tg-departure-list">
                    {detail.leave_events.map((event) => (
                      <article className="tg-departure" key={event.id}>
                        <span className="tg-departure-icon"><LogOut size={17}/></span>
                        <div className="tg-departure-main">
                          <div><strong>{event.teacher.profile.full_name}</strong><time>{new Date(event.left_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { year: "numeric", month: "short", day: "numeric" })}</time></div>
                          {event.teacher.profile.email && <small>{event.teacher.profile.email}</small>}
                          <p><b>{A.leaveReason}:</b> {event.reason}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </details>

              <div className="tg-section-heading"><div><Users size={18}/><span><strong>{L === "ar" ? "أعضاء المجموعة" : "Anëtarët e grupit"}</strong><small>{L === "ar" ? "ملفات المشرفين ومعلوماتهم الأساسية" : "Profilet dhe të dhënat kryesore"}</small></span></div></div>

              {detail.members.length > 0 && (
                <div className="tg-member-filter">
                  <input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder={T.memberSearchPh}
                  />
                  <span>{visibleMembers.length} / {detail.members.length}</span>
                </div>
              )}
              <div className="tg-members">
                {detail.members.length === 0 ? (
                  <div className="tg-members-empty">—</div>
                ) : visibleMembers.length === 0 ? (
                  <div className="tg-members-empty">{T.noMemberResults}</div>
                ) : visibleMembers.map((m) => (
                  <div key={m.teacher.id} className="tg-member">
                    <div className="tg-member-avatar">{m.teacher.profile.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
                    <div className="tg-member-main">
                      <div className="tg-member-name">{m.teacher.profile.full_name}</div>
                      {m.teacher.profile.email && <div className="tg-member-email">{m.teacher.profile.email}</div>}
                      {m.teacher.application && (
                        <div className="tg-member-meta">
                          {m.teacher.application.specialization && (
                            <span>{T.spec}: <strong>{m.teacher.application.specialization}</strong></span>
                          )}
                          {(m.teacher.application.country || m.teacher.application.city) && (
                            <span><MapPin size={12}/>{m.teacher.application.country}{m.teacher.application.city ? " · " + m.teacher.application.city : ""}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {!viewOnly && <button className={`tg-leader-btn${detail.leader_teacher_id === m.teacher.id ? " active" : ""}`} onClick={() => void setLeader(detail.leader_teacher_id === m.teacher.id ? null : m.teacher.id)} title={T.leader}><Crown size={15}/></button>}
                    {!viewOnly && (
                      <button className="tg-mini-x" onClick={() => removeMember(m.teacher.id)} data-write="true" title={T.remove}><UserMinus size={15}/></button>
                    )}
                  </div>
                ))}
              </div>

              <div className="tg-ann-section">
                <div className="tg-section-heading"><div><Bell size={18}/><span><strong>{A.announcements}</strong><small>{L === "ar" ? "تحديثات واضحة تصل لكل أعضاء المجموعة" : "Përditësime për të gjithë anëtarët"}</small></span></div></div>
                {!viewOnly && (
                  <div className="tg-ann-composer" data-write="true">
                    <textarea
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                          e.preventDefault();
                          postAnnouncement();
                        }
                      }}
                      placeholder={A.announcementPh}
                      rows={3}
                    />
                    {selectedAnnouncementFiles.length > 0 && (
                      <div className="tg-selected-files">
                        {selectedAnnouncementFiles.map((file, index) => (
                          <span key={`${file.name}-${file.size}-${index}`}>
                            <Paperclip size={12}/>{file.name}<small>{formatAttachmentSize(file.size)}</small>
                            <button type="button" onClick={() => setSelectedAnnouncementFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={postingAnnouncement} aria-label={A.delete}><X size={12}/></button>
                          </span>
                        ))}
                      </div>
                    )}
                    {announcementUploadProgress !== null && <div className="tg-upload-progress" role="status"><span style={{ width: `${announcementUploadProgress}%` }}/><small>{A.uploading(announcementUploadProgress)}</small></div>}
                    <div className="tg-composer-actions">
                      <input ref={announcementFileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/*,application/pdf" multiple onChange={(event) => selectAnnouncementAttachments(event.target.files)} disabled={postingAnnouncement}/>
                      <button type="button" className="tg-attach-btn" onClick={() => announcementFileInputRef.current?.click()} disabled={postingAnnouncement} data-write="true"><Paperclip size={14}/>{A.attach}</button>
                      <button
                        type="button"
                        onClick={postAnnouncement}
                        disabled={postingAnnouncement || (!newAnnouncement.trim() && selectedAnnouncementFiles.length === 0)}
                        data-write="true"
                      >
                        <Send size={13}/>{postingAnnouncement ? A.posting : A.post}
                      </button>
                    </div>
                  </div>
                )}
                {announcementError && <p className="tg-ann-error" role="alert">{announcementError}</p>}
                {loadingAnnouncements ? (
                  <div className="tg-ann-empty"><MandalaLoader /></div>
                ) : announcements.length === 0 ? (
                  <div className="tg-ann-empty">{A.noAnnouncements}</div>
                ) : (
                  <div className="tg-ann-list">
                    {announcements.map((announcement) => (
                      <article key={announcement.id} className="tg-ann">
                        <div className="tg-ann-avatar">
                          {announcement.author.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="tg-ann-body">
                          <div className="tg-ann-meta">
                            <strong>{announcement.author.full_name}</strong>
                            <span>{new Date(announcement.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { month: "short", day: "numeric" })}</span>
                          </div>
                          {announcement.content && <p>{announcement.content}</p>}
                          <GroupChatAttachments attachments={announcement.attachments ?? []} openLabel={A.openAttachment}/>
                        </div>
                        {!viewOnly && (
                          <button
                            className="tg-ann-delete"
                            onClick={() => deleteAnnouncement(announcement.id)}
                            disabled={deletingAnnouncementId === announcement.id}
                            title={A.delete}
                            data-write="true"
                          >
                            <X size={14}/>
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Create dialog */}
      {createOpen && !viewOnly && (
        <div className="tg-overlay" onClick={() => !creating && setCreateOpen(false)}>
          <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="tg-dlg-title">{T.newGroupTitle}</h3>
            <label className="tg-lbl">{T.name}</label>
            <input className="tg-input" placeholder={T.namePh} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} autoFocus />
            <label className="tg-lbl">{T.desc}</label>
            <textarea className="tg-input" rows={3} placeholder={T.descPh} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
            <label className="tg-lbl">{T.capacity}</label>
            <input className="tg-input" type="number" min={1} max={500} value={createForm.max_members} onChange={(e) => setCreateForm({ ...createForm, max_members: Number(e.target.value) })} />
            <small className="tg-field-help">{T.capacityHelp}</small>
            <div className="tg-dlg-actions">
              <button className="tg-btn" onClick={() => setCreateOpen(false)} disabled={creating}>{T.cancel}</button>
              <button className="tg-btn tg-btn-primary" onClick={createGroup} disabled={creating || !createForm.name.trim()}>
                {creating ? T.creating : T.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-members dialog */}
      {addOpen && !viewOnly && selectedId && (
        <div className="tg-overlay" onClick={() => setAddOpen(false)}>
          <div className="tg-dialog tg-dialog-wide" onClick={(e) => e.stopPropagation()}>
            <h3 className="tg-dlg-title">{T.addMembers}</h3>
            <input
              className="tg-input"
              placeholder={T.searchPh}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              autoFocus
            />
            <div className="tg-eligible">
              {loadingEligible ? <div className="tg-mini-load">…</div>
                : eligible.length === 0 ? <div className="tg-empty">{T.noEligible}</div>
                : eligible.map((t) => {
                  const on = picked.has(t.id);
                  return (
                    <button
                      key={t.id}
                      className={`tg-elig${on ? " on" : ""}`}
                      onClick={() => {
                        const next = new Set(picked);
                        if (on) next.delete(t.id); else next.add(t.id);
                        setPicked(next);
                      }}
                    >
                      <div className="tg-elig-name">{t.profile.full_name}</div>
                      {t.application && (
                        <div className="tg-elig-meta">
                          {t.application.specialization && <span>{t.application.specialization}</span>}
                          {t.application.country && <span>· {t.application.country}{t.application.city ? " · " + t.application.city : ""}</span>}
                        </div>
                      )}
                      <span className="tg-elig-tick">{on ? "✓" : "+"}</span>
                    </button>
                  );
                })}
            </div>
            <div className="tg-dlg-actions">
              <button className="tg-btn" onClick={() => setAddOpen(false)}>{T.cancel}</button>
              <button className="tg-btn tg-btn-primary" onClick={addPicked} disabled={picked.size === 0}>
                {T.add} ({picked.size})
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .tg { font-family: 'Cairo', sans-serif; }
        .tg-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .tg-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .tg-sub { font-size: 13.5px; color: #655B53; max-width: 680px; line-height: 1.85; margin: 0; }
        .tg-hero-actions { display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap; }
        .tg-visibility { display: flex; flex-direction: column; gap: 2px; text-align: start; min-width: 220px; border: 1.5px solid rgba(184,160,130,0.32); border-radius: 12px; background: #FBF8F1; color: #4A0E1C; padding: 9px 13px; font-family: inherit; cursor: pointer; }
        .tg-visibility strong { font-size: 12.5px; font-weight: 900; }
        .tg-visibility span { font-size: 11.5px; color: #7B6B52; font-weight: 800; }
        .tg-visibility.on { background: rgba(107,30,45,0.08); border-color: rgba(107,30,45,0.24); }
        .tg-visibility:disabled { opacity: 0.6; cursor: progress; }
        .tg-new { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 10px 18px; border-radius: 11px; font-family: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; }

        .tg-layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
        @media (max-width: 880px) { .tg-layout { grid-template-columns: 1fr; } }

        .tg-side { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; padding: 10px; min-height: 200px; }
        .tg-side-search, .tg-member-filter input { width: 100%; border: 1.5px solid rgba(194,160,89,0.26); border-radius: 10px; background: #FFF; padding: 9px 12px; font: inherit; font-size: 13px; outline: none; }
        .tg-side-search { margin-bottom: 10px; }
        .tg-side-search:focus, .tg-member-filter input:focus { border-color: #B8A082; box-shadow: 0 0 0 3px rgba(194,160,89,0.10); }
        .tg-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .tg-list-item { width: 100%; text-align: start; background: transparent; border: 1px solid transparent; padding: 11px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; gap: 4px; transition: background .15s; }
        .tg-list-item:hover { background: rgba(194,160,89,0.10); }
        .tg-list-item.active { background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border-color: #B8A082; }
        .tg-list-name { font-size: 13.5px; font-weight: 800; color: #32101A; }
        .tg-list-meta { font-size: 11.5px; color: #8F765B; font-weight: 700; }
        .tg-list-meta b { display:inline-flex; margin-inline-start:6px; border-radius:999px; padding:2px 6px; color:#6B1E2D; background:rgba(184,160,130,.16); font-size:8px; }

        .tg-detail { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; padding: 18px; min-height: 320px; }
        .tg-detail-empty { padding: 60px 20px; text-align: center; color: #8C8274; font-weight: 700; }
        .tg-detail-head { padding-bottom: 14px; border-bottom: 1px solid rgba(26,26,26,0.07); margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
        .tg-meta-name { font-family: inherit; font-size: 19px; font-weight: 900; color: #32101A; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 8px; outline: none; }
        .tg-meta-name:focus { border-color: rgba(194,160,89,0.5); background: #FFF; }
        .tg-meta-desc { font-family: inherit; font-size: 13px; color: #6B1E2D; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 8px; outline: none; resize: vertical; line-height: 1.7; }
        .tg-meta-desc:focus { border-color: rgba(194,160,89,0.5); background: #FFF; }
        .tg-meta-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
        .tg-spacer { flex: 1; }
        .tg-btn { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #6B1E2D; padding: 7px 13px; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }
        .tg-btn-primary { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border-color: transparent; }
        .tg-btn-danger  { background: linear-gradient(180deg,#6B1E2D,#6B1E2D); color: #FFF; border-color: transparent; }

        .tg-members { display: flex; flex-direction: column; gap: 8px; }
        .tg-requests-section { margin:4px 0 20px; padding:14px; border:1px solid #E5E0D5; border-radius:15px; background:#F7F3EB; }
        .tg-request-heading { margin:0 0 11px; }.tg-request-heading>b { display:grid; place-items:center; min-width:29px; height:29px; border-radius:9px; color:#D9C9B0; background:#32101A; font-size:11px; }
        .tg-request-empty { display:flex; align-items:center; justify-content:center; gap:8px; min-height:82px; border:1px dashed rgba(184,160,130,.34); border-radius:12px; color:#796A62; background:#FFFBF5; font-size:11.5px; font-weight:800; }
        .tg-request-toolbar { display:grid; grid-template-columns:auto auto 1fr auto auto; align-items:center; gap:7px; margin-bottom:9px; }
        .tg-request-toolbar button { display:flex; align-items:center; justify-content:center; gap:5px; min-height:34px; border-radius:9px; padding:7px 10px; font:800 10px 'Cairo',sans-serif; cursor:pointer; }
        .tg-request-select { border:1px solid #E5E0D5; color:#655B53; background:#FFFFFF; }.tg-request-toolbar>span { color:#8F765B; font-size:10px; font-weight:900; }
        .tg-request-approve { border:0; color:#FFFFFF; background:#1B5E20; }.tg-request-reject { border:1px solid rgba(107,30,45,.18); color:#6B1E2D; background:#FFFFFF; }
        .tg-request-toolbar button:disabled { opacity:.45; cursor:not-allowed; }
        .tg-request-error { margin-bottom:9px; border:1px solid rgba(107,30,45,.22); border-radius:9px; padding:8px 10px; color:#6B1E2D; background:rgba(107,30,45,.06); font-size:10px; font-weight:800; }
        .tg-request-list { display:flex; flex-direction:column; gap:7px; }
        .tg-request { display:grid; grid-template-columns:auto 38px minmax(0,1fr) minmax(110px,.35fr); align-items:center; gap:10px; padding:10px 11px; border:1px solid #E5E0D5; border-radius:12px; background:#FFFFFF; cursor:pointer; transition:border-color .15s,box-shadow .15s; }
        .tg-request.selected { border-color:#B8A082; box-shadow:0 0 0 3px rgba(184,160,130,.1); }.tg-request input { width:16px; height:16px; accent-color:#6B1E2D; }
        .tg-request-avatar { width:38px; height:38px; display:grid; place-items:center; border-radius:11px; color:#D9C9B0; background:#32101A; font-size:9px; font-weight:900; }
        .tg-request-main { min-width:0; display:flex; flex-direction:column; }.tg-request-main strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-size:12px; }.tg-request-main small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#8F765B; font-size:9px; }.tg-request-main em { display:flex; align-items:center; gap:4px; margin-top:3px; color:#6B1E2D; font-size:8.5px; font-style:normal; font-weight:800; }
        .tg-request-context { display:flex; flex-direction:column; color:#655B53; font-size:9.5px; font-weight:800; }.tg-request-context small { color:#8F765B; font-size:8.5px; font-weight:700; }
        .tg-departures { margin:0 0 20px; border:1px solid #E5E0D5; border-radius:15px; background:#FFFBF5; overflow:hidden; }
        .tg-departures summary { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px; cursor:pointer; list-style:none; }
        .tg-departures summary::-webkit-details-marker { display:none; }
        .tg-departure-title { display:flex; align-items:center; gap:9px; color:#6B1E2D; }
        .tg-departure-title>span { display:flex; flex-direction:column; }
        .tg-departure-title strong { color:#32101A; font-size:12.5px; font-weight:900; }
        .tg-departure-title small { color:#8F765B; font-size:9.5px; font-weight:700; }
        .tg-departures summary>b { display:grid; place-items:center; min-width:29px; height:29px; border-radius:9px; color:#6B1E2D; background:#F3E3E6; font-size:11px; }
        .tg-departure-list { display:flex; flex-direction:column; gap:7px; padding:0 14px 14px; }
        .tg-departure { display:flex; align-items:flex-start; gap:10px; padding:11px; border:1px solid #E9E1D6; border-radius:12px; background:#F8F4ED; }
        .tg-departure-icon { display:grid; width:36px; height:36px; flex:none; place-items:center; border-radius:10px; color:#6B1E2D; background:#F3E3E6; }
        .tg-departure-main { flex:1; min-width:0; }
        .tg-departure-main>div { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .tg-departure-main strong { color:#32101A; font-size:11.5px; font-weight:900; }
        .tg-departure-main time,.tg-departure-main small { color:#8F765B; font-size:9px; font-weight:700; }
        .tg-departure-main p { margin:7px 0 0; padding-top:7px; border-top:1px solid #E5DDD2; color:#655B53; font-size:10.5px; line-height:1.75; white-space:pre-wrap; overflow-wrap:anywhere; }
        .tg-departure-main p b { color:#6B1E2D; }
        .tg-departure-empty { display:flex; align-items:center; justify-content:center; gap:8px; margin:0 14px 14px; min-height:72px; border:1px dashed rgba(184,160,130,.34); border-radius:11px; color:#796A62; background:#F7F3EB; font-size:10.5px; font-weight:800; }
        .tg-member-filter { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .tg-member-filter input { flex: 1; min-width: 0; }
        .tg-member-filter span { color: #8F765B; font-size: 12px; font-weight: 900; white-space: nowrap; }
        .tg-members-empty { padding: 30px; text-align: center; color: #BFB6A8; font-weight: 700; }
        .tg-member { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid rgba(194,160,89,0.25); border-radius: 11px; background: linear-gradient(165deg,#FFFFFF,#FFFBF5); }
        .tg-member-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .tg-member-name { font-size: 14px; font-weight: 800; color: #32101A; }
        .tg-member-email { font-size: 11.5px; color: #8F765B; }
        .tg-member-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #6B1E2D; margin-top: 2px; }
        .tg-member-meta strong { font-weight: 800; color: #32101A; }
        .tg-mini-x { background: rgba(139,26,26,0.10); border: 1px solid rgba(139,26,26,0.32); color: #6B1E2D; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; font-weight: 800; flex-shrink: 0; }
        .tg-mini-x:hover { background: rgba(139,26,26,0.18); }
        .tg-leader-btn { display:grid; place-items:center; width:31px; height:31px; flex:none; border:1px solid rgba(184,160,130,.3); border-radius:9px; background:#F7F3EB; color:#8F765B; cursor:pointer; }
        .tg-leader-btn.active { border-color:#B8A082; background:#32101A; color:#D9C9B0; }

        .tg-ann-section { margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(26,26,26,0.07); }
        .tg-ann-title { margin: 0 0 10px; font-size: 15px; font-weight: 900; color: #6B1E2D; }
        .tg-ann-composer { display: flex; flex-direction: column; gap: 10px; padding: 12px; margin-bottom: 12px; border-radius: 12px; background: rgba(194,160,89,0.05); border: 1px solid rgba(194,160,89,0.16); }
        .tg-ann-composer textarea { width: 100%; border: 1.5px solid rgba(194,160,89,0.24); border-radius: 10px; background: #FFF; padding: 10px 12px; font-family: inherit; font-size: 13px; line-height: 1.7; resize: vertical; outline: none; }
        .tg-ann-composer textarea:focus { border-color: #B8A082; box-shadow: 0 0 0 3px rgba(194,160,89,0.08); }
        .tg-ann-composer button { align-self: flex-end; border: 0; border-radius: 10px; padding: 8px 16px; background: #1A1A1A; color: #B8A082; font-family: inherit; font-size: 12.5px; font-weight: 900; cursor: pointer; }
        .tg-ann-composer button:disabled { opacity: 0.45; cursor: not-allowed; }
        .tg-composer-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .tg-composer-actions>input { display:none; }
        .tg-composer-actions>button:last-child { margin-inline-start:auto; display:inline-flex; align-items:center; gap:5px; }
        .tg-ann-composer .tg-attach-btn { align-self:auto; display:inline-flex; align-items:center; gap:6px; background:#FFF; color:#4A0E1C; border:1px solid rgba(194,160,89,.28); }
        .tg-selected-files { display:flex; flex-wrap:wrap; gap:7px; }
        .tg-selected-files>span { display:flex; align-items:center; gap:5px; max-width:100%; padding:7px 9px; border-radius:9px; background:#FFF; border:1px solid rgba(194,160,89,.22); color:#4A0E1C; font-size:10.5px; font-weight:800; }
        .tg-selected-files>span small { color:#89766B; font-weight:600; }
        .tg-selected-files>span button { padding:2px; background:transparent; color:#6B1E2D; }
        .tg-upload-progress { position:relative; height:24px; overflow:hidden; border-radius:8px; background:rgba(194,160,89,.1); }
        .tg-upload-progress>span { position:absolute; inset-block:0; inset-inline-start:0; background:rgba(194,160,89,.25); transition:width .2s; }
        .tg-upload-progress>small { position:relative; z-index:1; display:flex; height:100%; align-items:center; justify-content:center; font-size:10.5px; font-weight:800; color:#4A0E1C; }
        .tg-ann-error { margin:-4px 0 10px; color:#8B1A1A; font-size:11px; font-weight:800; }
        .group-chat-attachments { display:grid; gap:8px; margin-top:9px; }
        .group-chat-image { display:block; width:min(100%,420px); overflow:hidden; border-radius:11px; background:#F3EEE6; }
        .group-chat-image img { display:block; width:100%; max-height:330px; object-fit:cover; }
        .group-chat-video { width:min(100%,500px); overflow:hidden; border:1px solid rgba(194,160,89,.16); border-radius:11px; background:#1A1A1A; }
        .group-chat-video video { display:block; width:100%; max-height:390px; background:#1A1A1A; }
        .group-chat-video>span { display:block; padding:7px 9px; color:#F7F3EB; font-size:10.5px; overflow-wrap:anywhere; }
        .group-chat-pdf { display:flex; align-items:center; gap:9px; width:min(100%,450px); padding:10px; border:1px solid rgba(194,160,89,.2); border-radius:10px; background:#FFF; color:#4A0E1C; text-decoration:none; }
        .group-chat-pdf>span { display:flex; flex:1; min-width:0; flex-direction:column; }
        .group-chat-pdf strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; }
        .group-chat-pdf small { color:#89766B; }
        .group-chat-pdf em { font-size:10.5px; font-style:normal; font-weight:800; }
        .tg-ann-empty { min-height: 110px; display: flex; align-items: center; justify-content: center; text-align: center; border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; color: #8C8274; font-size: 13px; font-weight: 800; padding: 22px; background: rgba(194,160,89,0.04); }
        .tg-ann-list { display: flex; flex-direction: column; gap: 8px; }
        .tg-ann { display: flex; gap: 10px; padding: 12px; border: 1px solid rgba(194,160,89,0.18); border-radius: 12px; background: #FFF; }
        .tg-ann-avatar { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1A1A1A; color: #B8A082; font-size: 10px; font-weight: 900; }
        .tg-ann-body { flex: 1; min-width: 0; }
        .tg-ann-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
        .tg-ann-meta strong { font-size: 13px; color: #32101A; }
        .tg-ann-meta span { font-size: 11.5px; color: #796A62; font-weight: 800; }
        .tg-ann p { margin: 0; color: #4A0E1C; font-size: 13px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
        .tg-ann-delete { width: 28px; height: 28px; border-radius: 9px; border: 1px solid rgba(139,26,26,0.22); background: rgba(139,26,26,0.08); color: #6B1E2D; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-weight: 900; }
        .tg-ann-delete:disabled { opacity: 0.45; cursor: not-allowed; }

        .tg-empty { padding: 30px 16px; text-align: center; color: #8C8274; font-weight: 700; font-size: 13px; line-height: 1.7; }

        .tg-overlay { position: fixed; inset: 0; background: rgba(26,26,26,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(4px); }
        .tg-dialog { background: #FFFBF5; border-radius: 16px; padding: 22px; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .tg-dialog-wide { max-width: 560px; }
        .tg-dlg-title { font-size: 17px; font-weight: 900; color: #32101A; margin: 0 0 14px; }
        .tg-lbl { display: block; font-size: 12px; font-weight: 800; color: #6B1E2D; margin: 10px 0 4px; }
        .tg-input { width: 100%; padding: 10px 13px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px; font-family: inherit; font-size: 13.5px; background: #FFF; outline: none; resize: vertical; }
        .tg-input:focus { border-color: #B8A082; }
        .tg-field-help { display:block; margin-top:5px; color:#8F765B; font-size:9px; font-weight:700; }
        .tg-dlg-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }

        .tg-eligible { margin-top: 10px; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .tg-elig { width: 100%; text-align: start; background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 10px; padding: 10px 14px; font-family: inherit; cursor: pointer; position: relative; transition: all .15s; }
        .tg-elig:hover { border-color: #B8A082; }
        .tg-elig.on { background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border-color: #B8A082; }
        .tg-elig-name { font-size: 13.5px; font-weight: 800; color: #32101A; }
        .tg-elig-meta { font-size: 11.5px; color: #6B1E2D; display: flex; gap: 8px; margin-top: 3px; flex-wrap: wrap; }
        .tg-elig-tick { position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; border-radius: 50%; background: #B8A082; color: #4A0E1C; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12.5px; }
        .tg-elig:not(.on) .tg-elig-tick { background: rgba(194,160,89,0.18); color: #8F765B; }
        .tg-mini-load { padding: 20px; text-align: center; color: #8F765B; font-weight: 700; }

        /* 2026 workspace refresh: clearer hierarchy, calmer density and stronger actions. */
        .tg { max-width: 1480px; margin: 0 auto; color: #32101A; }
        .tg-hero { position: relative; overflow: hidden; align-items: center; padding: 25px 27px; border: 1px solid rgba(217,201,176,.28); border-radius: 22px; background: radial-gradient(circle at 86% -20%,rgba(217,201,176,.2),transparent 36%),linear-gradient(135deg,#32101A 0%,#5D1728 100%); box-shadow: 0 18px 48px rgba(50,16,26,.14); }
        .tg-hero:after { content:""; position:absolute; width:210px; height:210px; inset-inline-end:-90px; bottom:-145px; border:32px solid rgba(217,201,176,.08); border-radius:50%; pointer-events:none; }
        .tg-hero-copy { position:relative; z-index:1; }
        .tg-eyebrow { display:inline-flex; align-items:center; gap:7px; color:#D9C9B0; font-size:11px; font-weight:900; letter-spacing:.03em; }
        .tg-title { color:#FFF9EF; font-size:29px; margin-top:7px; }
        .tg-sub { color:#DDCEBA; max-width:740px; }
        .tg-hero-actions { position:relative; z-index:1; }
        .tg-new { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:48px; color:#32101A; background:#F2DFC0; box-shadow:0 7px 18px rgba(0,0,0,.14); }
        .tg-visibility { min-height:48px; min-width:245px; flex-direction:row; align-items:center; gap:10px; color:#FFF9EF; background:rgba(255,255,255,.07); border-color:rgba(217,201,176,.3); }
        .tg-visibility.on { background:rgba(217,201,176,.13); border-color:rgba(217,201,176,.48); }
        .tg-visibility-icon { width:31px; height:31px; display:grid; place-items:center; flex:0 0 auto; border-radius:9px; color:#F2DFC0; background:rgba(255,255,255,.09); }
        .tg-visibility > span:last-child { display:flex; flex-direction:column; gap:1px; }
        .tg-visibility span span { color:#D9C9B0; }
        .tg-layout { grid-template-columns:minmax(260px,330px) minmax(0,1fr); align-items:start; gap:18px; }
        .tg-side,.tg-detail { border-color:#E4DACB; border-radius:18px; background:rgba(255,252,247,.88); box-shadow:0 10px 34px rgba(67,35,28,.055); }
        .tg-side { position:sticky; top:18px; padding:12px; max-height:calc(100vh - 40px); overflow:auto; }
        .tg-side-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:4px 4px 12px; }
        .tg-side-head>div { display:flex; flex-direction:column; gap:1px; }
        .tg-side-head strong { font-size:13px; }
        .tg-side-head span { font-size:10px; color:#8F765B; font-weight:800; }
        .tg-side-head button { width:31px; height:31px; border:0; border-radius:9px; display:grid; place-items:center; background:#32101A; color:#F2DFC0; cursor:pointer; }
        .tg-side-search { display:flex; align-items:center; gap:7px; padding:0 11px; margin-bottom:10px; color:#8F765B; border:1.5px solid #E4DACB; border-radius:11px; background:#FFF; }
        .tg-side-search input { width:100%; min-width:0; padding:10px 0; border:0; outline:0; background:transparent; font:inherit; font-size:12px; }
        .tg-list { gap:6px; }
        .tg-list-item { display:grid; grid-template-columns:38px minmax(0,1fr) 18px; align-items:center; gap:10px; padding:10px; border-color:transparent; }
        .tg-list-item.active { background:#32101A; border-color:#32101A; box-shadow:0 8px 19px rgba(50,16,26,.14); }
        .tg-group-mark { width:38px; height:38px; display:grid; place-items:center; border-radius:11px; background:#F0E7D9; color:#6B1E2D; font-weight:900; }
        .tg-list-item.active .tg-group-mark { background:#F2DFC0; color:#32101A; }
        .tg-list-copy { display:flex; flex-direction:column; min-width:0; gap:2px; }
        .tg-list-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tg-list-item.active :is(.tg-list-name,.tg-list-meta,.tg-list-arrow) { color:#FFF9EF; }
        .tg-list-arrow { color:#B8A082; }
        .tg-detail { padding:22px; }
        .tg-detail-head { gap:14px; margin-bottom:15px; }
        .tg-detail-title-row { display:grid; grid-template-columns:52px minmax(0,1fr); gap:13px; align-items:start; }
        .tg-detail-mark { width:52px; height:52px; display:grid; place-items:center; border-radius:15px; color:#F2DFC0; background:linear-gradient(145deg,#32101A,#6B1E2D); }
        .tg-detail-kicker { display:block; color:#8F765B; font-size:10px; font-weight:900; }
        .tg-detail-title-row h2 { margin:1px 0 3px; font-size:23px; line-height:1.3; }
        .tg-detail-title-row p { margin:0; color:#6E625A; font-size:12px; line-height:1.65; }
        .tg-edit-panel { border:1px solid #E5DCCD; border-radius:12px; background:#FFF; }
        .tg-edit-panel summary { display:flex; align-items:center; gap:7px; padding:9px 12px; cursor:pointer; color:#6B1E2D; font-size:11px; font-weight:900; list-style:none; }
        .tg-edit-panel summary::-webkit-details-marker { display:none; }
        .tg-edit-fields { display:grid; grid-template-columns:repeat(2,minmax(180px,1fr)); align-items:end; gap:10px; padding:0 12px 12px; }
        .tg-edit-fields label { color:#7B6B52; font-size:10px; font-weight:900; }
        .tg-edit-fields :is(input,textarea,select) { display:block; width:100%; min-height:40px; margin-top:4px; border:1px solid #DCCFBD; border-radius:9px; background:#FFFCF7; padding:8px 10px; font:inherit; font-size:12px; }
        .tg-edit-fields label small { display:block; margin-top:4px; color:#8F765B; font-size:8px; font-weight:700; }
        .tg-edit-fields>.tg-btn { justify-self:end; min-width:130px; }
        .tg-meta-actions { margin:0; }
        .tg-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:36px; text-decoration:none; }
        .tg-icon-danger { width:36px; height:36px; display:grid; place-items:center; border-radius:9px; border:1px solid rgba(139,26,26,.18); color:#8B1A1A; background:#FFF4F1; cursor:pointer; }
        .tg-overview-strip { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:9px; margin:0 0 19px; }
        .tg-overview-strip>div { display:grid; grid-template-columns:38px 1fr; grid-template-rows:auto auto; gap:0 9px; padding:12px; border:1px solid #E8DFD2; border-radius:13px; background:linear-gradient(145deg,#FFF,#FBF6EF); }
        .tg-overview-icon { grid-row:1/3; width:38px; height:38px; display:grid; place-items:center; border-radius:11px; color:#6B1E2D; background:#F0E7D9; }
        .tg-overview-strip strong { align-self:end; font-size:16px; line-height:1.2; }
        .tg-overview-strip small { color:#8F765B; font-size:9px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tg-section-heading { display:flex; align-items:center; justify-content:space-between; margin:16px 0 10px; }
        .tg-section-heading>div { display:flex; align-items:center; gap:8px; }
        .tg-section-heading>div>svg { color:#6B1E2D; }
        .tg-section-heading span { display:flex; flex-direction:column; }
        .tg-section-heading strong { font-size:13px; }
        .tg-section-heading small { color:#8F765B; font-size:9.5px; font-weight:700; }
        .tg-member { align-items:center; padding:11px 12px; border-radius:13px; transition:transform .15s,border-color .15s,box-shadow .15s; }
        .tg-member:hover { transform:translateY(-1px); border-color:#D1BFA8; box-shadow:0 7px 18px rgba(67,35,28,.06); }
        .tg-member-avatar { width:39px; height:39px; display:grid; place-items:center; flex:0 0 auto; border-radius:12px; color:#F2DFC0; background:#32101A; font-size:10px; font-weight:900; }
        .tg-member-meta span { display:inline-flex; align-items:center; gap:4px; }
        .tg-mini-x { display:grid; place-items:center; border-radius:9px; }
        .tg-ann-section { margin-top:22px; }
        .tg-ann-title { display:none; }
        .tg-ann-composer { border-radius:14px; background:#F8F2E9; }
        .tg-ann { border-radius:13px; }
        .tg-dialog { border:1px solid #E1D5C5; border-radius:20px; box-shadow:0 26px 80px rgba(26,12,13,.32); }
        @media(max-width:980px){.tg-layout{grid-template-columns:280px minmax(0,1fr)}.tg-overview-strip{grid-template-columns:1fr}.tg-edit-fields{grid-template-columns:1fr}}
        @media(max-width:760px){.tg-hero{padding:21px}.tg-hero-actions,.tg-visibility{width:100%}.tg-new{flex:1}.tg-layout{grid-template-columns:1fr}.tg-side{position:static;max-height:none}.tg-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.tg-detail{padding:16px}.tg-detail-title-row{grid-template-columns:44px 1fr}.tg-detail-mark{width:44px;height:44px}.tg-overview-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.tg-overview-strip>div{grid-template-columns:1fr;text-align:center}.tg-overview-icon{grid-row:auto;margin:auto}.tg-meta-actions{align-items:stretch}.tg-spacer{display:none}.tg-request-toolbar{grid-template-columns:1fr auto}.tg-request-toolbar>div{display:none}.tg-request-toolbar :is(.tg-request-approve,.tg-request-reject){grid-column:auto}.tg-request{grid-template-columns:auto 38px minmax(0,1fr)}.tg-request-context{grid-column:3}}
        @media(max-width:500px){.tg-title{font-size:24px}.tg-list{grid-template-columns:1fr}.tg-overview-strip{grid-template-columns:1fr}.tg-overview-strip>div{grid-template-columns:38px 1fr;text-align:start}.tg-overview-icon{grid-row:1/3;margin:0}.tg-member{align-items:flex-start}.tg-member-meta{gap:6px;flex-direction:column}.tg-meta-actions .tg-btn{flex:1}}
      `}</style>
    </div>
  );
}
