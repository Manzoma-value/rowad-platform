"use client";
export const dynamic = "force-dynamic";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";
import TeacherLoadError from "@/components/TeacherLoadError";
import { Check, Clock3, Copy, Link2, RefreshCw, Save, Send, Settings, ShieldCheck, UserCheck, UserPlus, UserX, X } from "lucide-react";

const S = {
  ar: {
    loading: "جارٍ التحميل...",
    eyebrow: "مجموعاتي الدراسية",
    pageTitle: "إدارة المجموعات",
    classCount: "مجموعة",
    noClassTitle: "لم يتم تعيينك في أي مجموعة بعد",
    noClassSub: "تواصل مع مدير المنصة",
    students: "المستفيدون",
    noStudents: "لا يوجد مستفيدون في هذا المجموعة",
    announcements: "الإعلانات",
    announcementPH: "اكتب إعلاناً للمجموعة...",
    posting: "جارٍ النشر...",
    postBtn: "نشر الإعلان",
    noAnnouncements: "لا توجد إعلانات بعد",
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
    classCount: "grup",
    noClassTitle: "Nuk jeni caktuar në asnjë grup ende",
    noClassSub: "Kontaktoni drejtuesin e platformës",
    students: "Pjesëmarrësit",
    noStudents: "Nuk ka pjesëmarrës në këtë grup",
    announcements: "Njoftime",
    announcementPH: "Shkruaj një njoftim për grupin...",
    posting: "Duke postuar...",
    postBtn: "Posto njoftimin",
    noAnnouncements: "Nuk ka njoftime ende",
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

type Student = { id: string; profile: { full_name: string } };
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
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function replaceClass(next: ClassItem) {
    setSelectedClass(next);
    setData((current) => current ? { ...current, classes: current.classes.map((item) => item.id === next.id ? next : item) } : current);
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
    cachedFetch<TeacherData>("/api/teacher", 300_000).then((d) => {
      setData(d);
      if (d.classes?.length > 0) selectClass(d.classes[0]);
      setLoading(false);
    }).catch(() => { setLoadError(true); setLoading(false); });
  }, [selectClass]);

  async function handlePost() {
    if (!newAnnouncement.trim() || !selectedClass) return;
    setPosting(true);
    await fetch("/api/teacher/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass.id, content: newAnnouncement }),
    });
    setNewAnnouncement("");
    invalidateCache(`/api/teacher/announcements?classId=${selectedClass.id}`);
    await loadAnnouncements(selectedClass.id);
    setPosting(false);
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

      {/* ── Page header ── */}
      <div className="tc-page-header">
        <div>
          <p className="tc-eyebrow">{T.eyebrow}</p>
          <h1 className="tc-page-title">{T.pageTitle}</h1>
        </div>
        <div className="tc-header-stat">
          <span className="tc-header-stat-num">{data?.classes.length ?? 0}</span>
          <span className="tc-header-stat-lbl">{T.classCount}</span>
        </div>
      </div>

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
          {/* ── Class tabs ── */}
          <div className="tc-classbar">
            <div className="tc-tabs">
              {data.classes.map((cls) => (
                <button key={cls.id} className={`tc-tab ${selectedClass?.id === cls.id ? "active" : ""}`} onClick={() => selectClass(cls)}>
                  <span className="tc-tab-name">{cls.name}</span>
                  <span className="tc-tab-count">{cls.students.length}</span>
                </button>
              ))}
            </div>
            {selectedClass && (
              <button className="tc-settings-btn" type="button" onClick={() => { setClassName(selectedClass.name); setSettingsMessage(""); setSettingsOpen(true); }}>
                <Settings size={16} />
                <span>{T.settings}</span>
                {selectedClass.join_requests.some((request) => request.status === "PENDING") && (
                  <b>{selectedClass.join_requests.filter((request) => request.status === "PENDING").length}</b>
                )}
              </button>
            )}
          </div>

          {selectedClass && (
            <>
            <div className="tc-grid">

              {/* ── Students card ── */}
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <h2 className="tc-card-title">{T.students}</h2>
                  <span className="tc-badge">{selectedClass.students.length}</span>
                </div>
                <div className="tc-students">
                  {selectedClass.students.length === 0 ? (
                    <div className="tc-inner-empty">{T.noStudents}</div>
                  ) : (
                    selectedClass.students.map((s, i) => (
                      <Link
                        key={s.id}
                        href={`/teacher/reports/students/${s.id}`}
                        className="tc-student-row"
                        style={{ animationDelay: `${i * 33}ms` }}
                      >
                        <div className="tc-student-av">{s.profile.full_name.charAt(0)}</div>
                        <span className="tc-student-name">{s.profile.full_name}</span>
                        <svg className="tc-student-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* ── Announcements card ── */}
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                  </div>
                  <h2 className="tc-card-title">{T.announcements}</h2>
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
                    dir={dir}
                  />
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

      {settingsOpen && selectedClass && (
        <div className="tc-settings-overlay" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section className="tc-settings-panel" role="dialog" aria-modal="true" aria-label={T.settings} onMouseDown={(event) => event.stopPropagation()}>
            <header className="tc-settings-head">
              <div>
                <span><Settings size={18} /></span>
                <div><h2>{T.settings}</h2><p>{T.settingsSub}</p></div>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label={T.close}><X size={18} /></button>
            </header>

            <div className="tc-settings-body">
              <section className="tc-setting-section tc-name-setting">
                <div className="tc-setting-title"><strong>{T.groupName}</strong><small>{selectedClass.name}</small></div>
                <div className="tc-name-row">
                  <input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={100} />
                  <button type="button" onClick={() => void renameClass()} disabled={classBusy || className.trim() === selectedClass.name || className.trim().length < 2}>
                    <Save size={15} />{T.saveName}
                  </button>
                </div>
              </section>

              <section className="tc-invite-card">
                <div className="tc-invite-main">
                  <div className="tc-invite-heading">
                    <span className="tc-invite-symbol"><UserPlus size={21} /></span>
                    <div><p>{T.inviteEyebrow}</p><h2>{T.inviteTitle}</h2><span>{T.inviteSub}</span></div>
                  </div>
                  <div className="tc-invite-steps">
                    {[T.inviteStep1, T.inviteStep2, T.inviteStep3].map((label, index) => (
                      <div key={label}><b>{index + 1}</b><span>{label}</span>{index < 2 && <i />}</div>
                    ))}
                  </div>
                </div>
                <div className="tc-invite-action">
                  {invite?.is_active ? (
                    <>
                      <div className="tc-link-box" dir="ltr"><Link2 size={15} /><span>{inviteUrl}</span></div>
                      <div className="tc-invite-buttons">
                        <button className="primary" onClick={() => void copyInvite()}><Copy size={15} />{copied ? T.copied : T.copyInvite}</button>
                        <a href={`https://wa.me/?text=${encodeURIComponent(T.shareText(selectedClass.name, inviteUrl))}`} target="_blank" rel="noreferrer"><Send size={15} />{T.whatsapp}</a>
                      </div>
                      <div className="tc-invite-meta"><span><Check size={13} />{invite.use_count} {T.inviteUses}</span><span><ShieldCheck size={13} />{T.inviteSafe}</span></div>
                      <div className="tc-invite-quiet-actions">
                        <button onClick={() => void createInvite()} disabled={inviteBusy}><RefreshCw size={13} />{T.rotateInvite}</button>
                        <button onClick={() => void revokeInvite()} disabled={inviteBusy}>{T.revokeInvite}</button>
                      </div>
                    </>
                  ) : (
                    <button className="tc-create-invite" onClick={() => void createInvite()} disabled={inviteBusy}><Link2 size={17} />{T.createInvite}</button>
                  )}
                  {inviteError && <p className="tc-invite-error" role="alert">{inviteError}</p>}
                </div>
              </section>

              <section className="tc-setting-section">
                <div className="tc-setting-title">
                  <strong>{T.pending}</strong>
                  <small>{selectedClass.join_requests.filter((request) => request.status === "PENDING").length}</small>
                </div>
                <div className="tc-request-list">
                  {selectedClass.join_requests.filter((request) => request.status === "PENDING").map((request) => (
                    <article className="tc-request pending" key={request.id}>
                      <span className="tc-request-avatar">{request.student.profile.full_name.charAt(0)}</span>
                      <div><strong>{request.student.profile.full_name}</strong><small>{[request.student.city, request.student.age ? `${request.student.age}` : null].filter(Boolean).join(" · ")}</small><time>{new Date(request.created_at).toLocaleDateString(T.dateLocale)}</time></div>
                      <div className="tc-request-actions">
                        <button className="approve" type="button" disabled={requestBusy === request.id} onClick={() => void decideRequest(request.id, "APPROVED")}><UserCheck size={14} />{T.approve}</button>
                        <button className="reject" type="button" disabled={requestBusy === request.id} onClick={() => void decideRequest(request.id, "REJECTED")}><UserX size={14} />{T.reject}</button>
                      </div>
                    </article>
                  ))}
                  {!selectedClass.join_requests.some((request) => request.status === "PENDING") && <div className="tc-requests-empty"><Check size={17} />{T.noRequests}</div>}
                </div>
              </section>

              <section className="tc-setting-section">
                <div className="tc-setting-title"><strong>{T.inviteHistory}</strong><small>{selectedClass.join_requests.length}</small></div>
                <div className="tc-request-list history">
                  {selectedClass.join_requests.map((request) => (
                    <article className="tc-request" key={request.id}>
                      <span className="tc-request-avatar">{request.student.profile.full_name.charAt(0)}</span>
                      <div><strong>{request.student.profile.full_name}</strong><small>{request.student.city ?? "—"}</small><time>{new Date(request.created_at).toLocaleDateString(T.dateLocale)}</time></div>
                      <span className={`tc-request-status ${request.status.toLowerCase()}`}>
                        {request.status === "APPROVED" ? <UserCheck size={13} /> : request.status === "REJECTED" ? <UserX size={13} /> : <Clock3 size={13} />}
                        {request.status === "APPROVED" ? T.approved : request.status === "REJECTED" ? T.rejected : T.waiting}
                      </span>
                    </article>
                  ))}
                  {selectedClass.join_requests.length === 0 && <div className="tc-requests-empty">{T.noRequests}</div>}
                </div>
              </section>

              {settingsMessage && <p className="tc-settings-message" role="status">{settingsMessage}</p>}
            </div>
          </section>
        </div>
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
`;
