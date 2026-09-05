"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, BookOpen, Check, CheckCircle2, Copy, ExternalLink, Filter, Link2, Link2Off,
  Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, UserRound,
  UserRoundCheck, UsersRound, X,
} from "lucide-react";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { useViewOnly } from "@/lib/view-only-context";
import styles from "./classes.module.css";

interface ClassItem {
  id: string;
  name: string;
  created_at: string;
  teacher: { id: string; profile: { full_name: string } } | null;
  _count: { students: number };
  invite: { token: string; is_active: boolean; use_count: number; updated_at: string } | null;
}

interface Teacher { id: string; profile: { full_name: string } }
type GroupFilter = "all" | "assigned" | "unassigned" | "activeInvite";
type SortOption = "recent" | "studentsDesc" | "studentsAsc" | "name";

export default function SchoolAdminClassesPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const confirm = useConfirm();
  const viewOnly = useViewOnly();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState("");
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const copy = lang === "ar" ? {
    eyebrow: "إدارة المجموعات التعليمية", title: "مساحة المجموعات",
    subtitle: "نظّم المجموعات، عيّن المشرفين، وتابع روابط الانضمام من مساحة واحدة واضحة.",
    addGroup: "إضافة مجموعة", close: "إغلاق", totalGroups: "إجمالي المجموعات",
    beneficiaries: "المستفيدون", assigned: "بإشراف مشرف", activeLinks: "روابط فعّالة",
    createTitle: "أنشئ مجموعة تعليمية جديدة", createHint: "اكتب اسمًا واضحًا يسهّل على المشرف والمستفيد معرفة المجموعة.",
    nameLabel: "اسم المجموعة", searchPlaceholder: "ابحث باسم المجموعة أو المشرف…",
    all: "كل المجموعات", assignedFilter: "بإشراف مشرف", unassigned: "بدون مشرف",
    sortBy: "الترتيب", sortRecent: "الترتيب الافتراضي", sortStudentsDesc: "الأكثر أعضاءً", sortStudentsAsc: "الأقل أعضاءً", sortName: "الاسم (أ-ي)",
    activeInvite: "رابط فعّال", results: "نتيجة ظاهرة", noResults: "لا توجد مجموعات مطابقة",
    noResultsHint: "جرّب تغيير كلمة البحث أو عامل التصفية.", clearFilters: "مسح التصفية",
    noGroupsHint: "ابدأ بإنشاء أول مجموعة ثم عيّن لها مشرفًا.", supervisor: "المشرف المسؤول",
    withoutSupervisor: "تحتاج إلى مشرف", members: "مستفيدين", joined: "انضمام عبر الرابط",
    inviteActive: "رابط الانضمام فعّال", inviteInactive: "رابط الانضمام غير مفعّل",
    copyLink: "نسخ رابط الانضمام", copied: "تم النسخ", createLink: "إنشاء رابط انضمام",
    stopLink: "إيقاف الرابط", profile: "ملف المشرف", rename: "تعديل اسم المجموعة",
    remove: "حذف المجموعة", save: "حفظ", cancel: "إلغاء", created: "أُنشئت",
    assignmentFailed: "تعذر تحديث مشرف المجموعة", deleteFailed: "تعذر حذف المجموعة",
    loadFailed: "تعذر تحميل بيانات المجموعات", createFailed: "تعذر إنشاء المجموعة",
    deleteTitle: "حذف المجموعة", deleteConfirm: "سيتم حذف المجموعة وما يرتبط بها من تعيينات. هل تريد المتابعة؟",
    assignFirst: "عيّن مشرفًا أولًا لتفعيل رابط الانضمام",
  } : {
    eyebrow: "Menaxhimi i grupeve mësimore", title: "Hapësira e grupeve",
    subtitle: "Organizo grupet, cakto edukatorët dhe menaxho lidhjet e anëtarësimit nga një hapësirë e qartë.",
    addGroup: "Shto grup", close: "Mbyll", totalGroups: "Gjithsej grupe",
    beneficiaries: "Pjesëmarrës", assigned: "Me edukator", activeLinks: "Lidhje aktive",
    createTitle: "Krijo një grup të ri mësimor", createHint: "Përdor një emër të qartë që edukatori dhe pjesëmarrësi ta njohin lehtë.",
    nameLabel: "Emri i grupit", searchPlaceholder: "Kërko grupin ose edukatorin…",
    all: "Të gjitha grupet", assignedFilter: "Me edukator", unassigned: "Pa edukator",
    sortBy: "Rendit sipas", sortRecent: "Rendi i zakonshëm", sortStudentsDesc: "Më shumë anëtarë", sortStudentsAsc: "Më pak anëtarë", sortName: "Emri (A-Zh)",
    activeInvite: "Lidhje aktive", results: "rezultate", noResults: "Nuk u gjet asnjë grup",
    noResultsHint: "Provo një kërkim ose filtër tjetër.", clearFilters: "Pastro filtrat",
    noGroupsHint: "Krijo grupin e parë dhe më pas cakto një edukator.", supervisor: "Edukatori përgjegjës",
    withoutSupervisor: "Kërkon edukator", members: "pjesëmarrës", joined: "anëtarësime nga lidhja",
    inviteActive: "Lidhja e anëtarësimit është aktive", inviteInactive: "Lidhja e anëtarësimit nuk është aktive",
    copyLink: "Kopjo lidhjen", copied: "U kopjua", createLink: "Krijo lidhje anëtarësimi",
    stopLink: "Çaktivizo lidhjen", profile: "Profili i edukatorit", rename: "Ndrysho emrin",
    remove: "Fshi grupin", save: "Ruaj", cancel: "Anulo", created: "Krijuar",
    assignmentFailed: "Edukatori i grupit nuk u përditësua", deleteFailed: "Grupi nuk u fshi",
    loadFailed: "Të dhënat e grupeve nuk u ngarkuan", createFailed: "Grupi nuk u krijua",
    deleteTitle: "Fshi grupin", deleteConfirm: "Grupi dhe caktimet e lidhura do të fshihen. Dëshiron të vazhdosh?",
    assignFirst: "Cakto fillimisht një edukator për të aktivizuar lidhjen",
  };

  async function load() {
    try {
      const [classData, teacherData] = await Promise.all([
        cachedFetch<{ classes: ClassItem[]; school: { slug: string } }>("/api/school-admin/classes", 60_000),
        cachedFetch<{ teachers: Teacher[] }>("/api/school-admin/teachers", 60_000),
      ]);
      const nextClasses = classData.classes ?? [];
      setClasses(nextClasses);
      setSchoolSlug(classData.school?.slug ?? "");
      setTeachers(teacherData.teachers ?? []);
      if (nextClasses.length === 0 && !viewOnly) setShowCreate(true);
    } catch { setError(copy.loadFailed); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    // This page owns its initial data lifecycle; language changes only affect labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => ({
    students: classes.reduce((sum, cls) => sum + cls._count.students, 0),
    assigned: classes.filter((cls) => cls.teacher).length,
    activeInvites: classes.filter((cls) => cls.invite?.is_active).length,
  }), [classes]);

  const filteredClasses = useMemo(() => {
    const locale = lang === "ar" ? "ar" : "sq";
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    const matched = classes.filter((cls) => {
      const matchesQuery = !normalizedQuery || [cls.name, cls.teacher?.profile.full_name ?? ""]
        .some((value) => value.toLocaleLowerCase(locale).includes(normalizedQuery));
      const matchesFilter = filter === "all"
        || (filter === "assigned" && Boolean(cls.teacher))
        || (filter === "unassigned" && !cls.teacher)
        || (filter === "activeInvite" && Boolean(cls.invite?.is_active));
      return matchesQuery && matchesFilter;
    });
    if (sortBy === "recent") return matched;
    const sorted = [...matched];
    if (sortBy === "studentsDesc") sorted.sort((a, b) => b._count.students - a._count.students);
    else if (sortBy === "studentsAsc") sorted.sort((a, b) => a._count.students - b._count.students);
    else if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, locale));
    return sorted;
  }, [classes, filter, lang, query, sortBy]);

  async function handleCreate() {
    if (!newName.trim()) { setError(tr.enterClassName); return; }
    setCreating(true); setError("");
    try {
      const response = await fetch("/api/school-admin/classes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? copy.createFailed);
      invalidateCache("/api/school-admin/classes"); setNewName(""); setShowCreate(false); await load();
    } catch (createError) { setError(createError instanceof Error ? createError.message : copy.createFailed); }
    finally { setCreating(false); }
  }

  async function handleDelete(cls: ClassItem) {
    const accepted = await confirm({
      title: copy.deleteTitle, message: `${copy.deleteConfirm} (${cls.name})`,
      confirmText: copy.remove, variant: "danger",
    });
    if (!accepted) return;
    setError("");
    try {
      const response = await fetch(`/api/school-admin/classes/${cls.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(copy.deleteFailed);
      invalidateCache("/api/school-admin/classes"); await load();
    } catch { setError(copy.deleteFailed); }
  }

  async function handleAssignTeacher(classId: string, teacherId: string) {
    setAssigningId(classId); setError("");
    try {
      const response = await fetch(`/api/school-admin/classes/${classId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId || null }),
      });
      if (!response.ok) throw new Error(copy.assignmentFailed);
      invalidateCache("/api/school-admin/classes"); await load();
    } catch { setError(copy.assignmentFailed); }
    finally { setAssigningId(null); }
  }

  async function handleRename(classId: string) {
    if (!editingName.trim() || savingName) return;
    setSavingName(true); setError("");
    try {
      const response = await fetch(`/api/school-admin/classes/${classId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingName.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? copy.createFailed);
      invalidateCache("/api/school-admin/classes"); setEditingId(null); await load();
    } catch (renameError) { setError(renameError instanceof Error ? renameError.message : copy.createFailed); }
    finally { setSavingName(false); }
  }

  function inviteUrl(token: string) {
    const path = window.location.pathname.startsWith("/schools/") ? `/schools/${schoolSlug}/signup` : "/signup";
    return `${window.location.origin}${path}?groupInvite=${encodeURIComponent(token)}`;
  }

  async function manageInvite(cls: ClassItem, action: "create" | "revoke") {
    if (inviteBusyId) return;
    setInviteBusyId(cls.id); setError("");
    try {
      const response = await fetch(`/api/school-admin/classes/${cls.id}/invite`, { method: action === "create" ? "POST" : "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "invite_failed");
      invalidateCache("/api/school-admin/classes"); await load();
    } catch (inviteFailure) {
      setError(inviteFailure instanceof Error && inviteFailure.message === "Assign a supervisor first"
        ? copy.assignFirst : (lang === "ar" ? "تعذر تحديث رابط الانضمام" : "Lidhja e anëtarësimit nuk u përditësua"));
    } finally { setInviteBusyId(null); }
  }

  async function copyAdminInvite(cls: ClassItem) {
    if (!cls.invite?.token) return;
    await navigator.clipboard.writeText(inviteUrl(cls.invite.token));
    setCopiedId(cls.id); window.setTimeout(() => setCopiedId(null), 1600);
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "sq-AL", {
      day: "numeric", month: "short", year: "numeric",
    }).format(new Date(value));
  }

  if (loading) return <MandalaLoader label={tr.loading} />;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <main className={styles.page} dir={dir}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Sparkles size={14} /> {copy.eyebrow}</span>
          <h1>{copy.title}</h1><p>{copy.subtitle}</p>
        </div>
        {!viewOnly && <button type="button" className={`${styles.heroAction} ${showCreate ? styles.heroActionOpen : ""}`}
          onClick={() => { setShowCreate((current) => !current); setError(""); }} aria-expanded={showCreate}>
          {showCreate ? <X size={18} /> : <Plus size={18} />}{showCreate ? copy.close : copy.addGroup}
        </button>}
        <div className={styles.heroOrnament} aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className={styles.metrics} aria-label={copy.eyebrow}>
        <Metric icon={<BookOpen />} value={classes.length} label={copy.totalGroups} tone="wine" />
        <Metric icon={<UsersRound />} value={metrics.students} label={copy.beneficiaries} tone="gold" />
        <Metric icon={<UserRoundCheck />} value={metrics.assigned} label={copy.assigned} tone="stone" />
        <Metric icon={<Link2 />} value={metrics.activeInvites} label={copy.activeLinks} tone="green" />
      </section>

      {showCreate && !viewOnly && <section className={styles.createPanel} data-write-area="true">
        <div className={styles.createIcon}><Plus size={22} /></div>
        <div className={styles.createCopy}><h2>{copy.createTitle}</h2><p>{copy.createHint}</p></div>
        <label className={styles.createField}><span>{copy.nameLabel}</span><input value={newName}
          onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleCreate()}
          placeholder={tr.newClassName} dir={dir} autoFocus /></label>
        <button type="button" data-write="true" className={styles.createButton} onClick={() => void handleCreate()}
          disabled={creating || !newName.trim()}>{creating ? <span className={styles.spinner} /> : <Plus size={17} />}
          {creating ? tr.creating : tr.createClass}</button>
      </section>}

      {error && <div className={styles.error} role="alert"><ShieldCheck size={17} /><span>{error}</span>
        <button type="button" onClick={() => setError("")} aria-label={copy.close}><X size={15} /></button></div>}

      {classes.length > 0 && <section className={styles.toolbar}>
        <label className={styles.search}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={copy.clearFilters}><X size={14} /></button>}</label>
        <label className={styles.filter}><Filter size={16} /><select value={filter}
          onChange={(event) => setFilter(event.target.value as GroupFilter)} aria-label={copy.all}>
          <option value="all">{copy.all}</option><option value="assigned">{copy.assignedFilter}</option>
          <option value="unassigned">{copy.unassigned}</option><option value="activeInvite">{copy.activeInvite}</option>
        </select></label>
        <label className={styles.filter}><ArrowDownUp size={16} /><select value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)} aria-label={copy.sortBy}>
          <option value="recent">{copy.sortRecent}</option>
          <option value="studentsDesc">{copy.sortStudentsDesc}</option>
          <option value="studentsAsc">{copy.sortStudentsAsc}</option>
          <option value="name">{copy.sortName}</option>
        </select></label>
        <span className={styles.resultCount}>{filteredClasses.length} {copy.results}</span>
      </section>}

      {classes.length === 0 ? <EmptyState icon={<BookOpen />} title={tr.noClassesYet} body={copy.noGroupsHint}
        action={!viewOnly ? copy.addGroup : undefined} onAction={() => setShowCreate(true)} />
      : filteredClasses.length === 0 ? <EmptyState icon={<Search />} title={copy.noResults} body={copy.noResultsHint}
        action={copy.clearFilters} onAction={() => { setQuery(""); setFilter("all"); }} />
      : <section className={styles.grid}>{filteredClasses.map((cls, index) => {
        const teacherId = cls.teacher?.id ?? "";
        const inviteActive = Boolean(cls.invite?.is_active);
        return <article className={styles.card} key={cls.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
          <header className={styles.cardHeader}>
            <div className={styles.groupMark} aria-hidden="true"><BookOpen size={20} /></div>
            <div className={styles.cardTitle}>{editingId === cls.id ? <div className={styles.renameRow}>
              <input value={editingName} onChange={(event) => setEditingName(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void handleRename(cls.id); if (event.key === "Escape") setEditingId(null); }}
                aria-label={copy.rename} autoFocus />
              <button type="button" onClick={() => void handleRename(cls.id)} disabled={savingName} title={copy.save}><Check size={15} /></button>
              <button type="button" onClick={() => setEditingId(null)} title={copy.cancel}><X size={15} /></button>
            </div> : <><h2>{cls.name}</h2><span>{copy.created} {formatDate(cls.created_at)}</span></>}</div>
            {!viewOnly && editingId !== cls.id && <div className={styles.iconActions}>
              <button type="button" data-write="true" onClick={() => { setEditingId(cls.id); setEditingName(cls.name); }}
                title={copy.rename} aria-label={copy.rename}><Pencil size={15} /></button>
              <button type="button" data-write="true" className={styles.deleteAction} onClick={() => void handleDelete(cls)}
                title={copy.remove} aria-label={copy.remove}><Trash2 size={15} /></button>
            </div>}
          </header>

          <div className={`${styles.memberStat} ${cls._count.students === 0 ? styles.needsAttention : ""}`}><span><UsersRound size={19} /></span>
            <div><strong>{cls._count.students}</strong><small>{copy.members}</small></div><span className={styles.memberPulse} aria-hidden="true" />
          </div>

          <section className={styles.supervisorBlock}><div className={styles.sectionLabel}>
            <span><UserRound size={15} /> {copy.supervisor}</span>
            {cls.teacher && <Link href={`/school-admin/teachers/${cls.teacher.id}`} title={copy.profile}>{copy.profile} <ExternalLink size={12} /></Link>}
          </div>{viewOnly ? <div className={`${styles.teacherReadonly} ${!cls.teacher ? styles.needsAttention : ""}`}>
            <span className={styles.avatar}>{cls.teacher ? cls.teacher.profile.full_name.trim().charAt(0) : "!"}</span>
            <strong>{cls.teacher?.profile.full_name ?? copy.withoutSupervisor}</strong>
          </div> : <div className={styles.selectWrap}>
            <span className={styles.avatar}>{cls.teacher ? cls.teacher.profile.full_name.trim().charAt(0) : "!"}</span>
            <select value={teacherId} onChange={(event) => void handleAssignTeacher(cls.id, event.target.value)}
              disabled={assigningId === cls.id} aria-label={copy.supervisor} dir={dir}>
              <option value="">{tr.withoutTeacher}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.profile.full_name}</option>)}
            </select>{assigningId === cls.id && <span className={styles.miniSpinner} />}
          </div>}</section>

          <section className={`${styles.inviteBlock} ${inviteActive ? styles.inviteBlockActive : ""}`}>
            <div className={styles.inviteStatus}><span>{inviteActive ? <CheckCircle2 size={17} /> : <Link2Off size={17} />}</span>
              <div><strong>{inviteActive ? copy.inviteActive : copy.inviteInactive}</strong>
                <small>{cls.invite?.use_count ?? 0} {copy.joined}</small></div></div>
            {!viewOnly && <div className={styles.inviteActions} data-write-area="true">{inviteActive ? <>
              <button type="button" data-write="true" onClick={() => void copyAdminInvite(cls)}>
                {copiedId === cls.id ? <Check size={15} /> : <Copy size={15} />}{copiedId === cls.id ? copy.copied : copy.copyLink}</button>
              <button type="button" data-write="true" className={styles.secondaryButton} onClick={() => void manageInvite(cls, "revoke")}
                disabled={inviteBusyId === cls.id}><Link2Off size={15} /> {copy.stopLink}</button>
            </> : <button type="button" data-write="true" onClick={() => void manageInvite(cls, "create")}
              disabled={inviteBusyId === cls.id || !cls.teacher} title={!cls.teacher ? copy.assignFirst : copy.createLink}>
              <Link2 size={15} /> {copy.createLink}</button>}</div>}
          </section>
        </article>;
      })}</section>}
    </main>
  );
}

function Metric({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: "wine" | "gold" | "stone" | "green" }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><span className={styles.metricIcon}>{icon}</span>
    <div><strong>{value.toLocaleString()}</strong><small>{label}</small></div></article>;
}

function EmptyState({ icon, title, body, action, onAction }: { icon: React.ReactNode; title: string; body: string; action?: string; onAction: () => void }) {
  return <section className={styles.empty}><div className={styles.emptyIcon}>{icon}</div><h2>{title}</h2><p>{body}</p>
    {action && <button type="button" onClick={onAction}><Plus size={16} /> {action}</button>}</section>;
}
