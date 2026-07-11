"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";

/* ───── i18n ───── */
const T = {
  ar: {
    dir: "rtl" as const,
    eyebrow: "إدارة الصلاحيات والوصول",
    title: "المدراء والدعوات",
    sub: "إدارة مدراء الجهات وإصدار دعوات تعيين المدراء الجدد",
    createInvite: "إنشاء دعوة",
    statActive: "مدراء نشطون",
    statSchools: "إجمالي الجهات",
    statInvites: "دعوات نشطة",
    statDeactivated: "معطّلون",
    tabAdmins: "المدراء",
    tabInvites: "الدعوات",
    inviteInfo1: "صلاحية الدعوة",
    inviteInfo2: "30 يومًا",
    inviteInfo3: "استخدام واحد فقط · يمكن إلغاؤها في أي وقت قبل قبولها",
    flashCreated: "تم إنشاء رابط الدعوة بنجاح",
    flashCopy: "نسخ الرابط",
    flashCopied: "تم النسخ!",
    loading: "جارٍ التحميل...",
    secWithAdmin: "جهات لديها مدير",
    secWithoutAdmin: "جهات بدون مدير",
    secActiveInvites: "الدعوات النشطة",
    secHistory: "السجل",
    statusActive: "نشط",
    statusInactive: "معطّل",
    statusActiveInvite: "دعوة مفعّلة",
    statusNone: "لا يوجد",
    statusUsed: "مُستخدمة",
    statusDisabled: "معطّلة",
    statusExpired: "منتهية",
    actDeactivate: "تعطيل",
    actActivate: "تفعيل",
    actInvite: "دعوة مدير",
    actDisableInvite: "تعطيل الدعوة",
    actCopy: "نسخ الرابط",
    joinedAt: "انضم",
    acceptedBy: "قبلها",
    usedAt: "استُخدمت",
    expiresAt: "تنتهي",
    createdAt: "أُنشئت",
    notAssigned: "لا يوجد مدير معيّن",
    waitingInvite: "دعوة نشطة قيد الانتظار",
    /* Empty states */
    emptyNoSchools: "لا توجد جهات مسجّلة بعد",
    emptyNoSchoolsSub: "يجب أن تكون لديك جهة (مدرسة) واحدة على الأقل قبل إصدار دعوات المدراء. أنشئ أول جهة من صفحة الجهات.",
    emptyGoSchools: "صفحة الجهات",
    emptyNoInvites: "لا توجد دعوات بعد",
    emptyCreateFirst: "إنشاء أول دعوة",
    /* Modal */
    modalTitle: "إنشاء دعوة مدير",
    modalDesc: "اختر الجهة التي تريد تعيين مدير لها. سيُرسَل الرابط للشخص المعني.",
    modalLabel: "الجهة",
    modalPlaceholder: "— اختر الجهة —",
    modalHint: "جميع الجهات لديها مدير أو دعوة نشطة",
    modalCancel: "إلغاء",
    modalCreate: "إنشاء الرابط",
    modalCreating: "جارٍ الإنشاء...",
    errLoad: "تعذر تحميل البيانات",
    errGeneric: "حدث خطأ",
    errNet: "تعذر الاتصال بالخادم",
    errChooseSchool: "يرجى اختيار الجهة أولاً",
  },
  en: {
    dir: "ltr" as const,
    eyebrow: "Access & Permissions",
    title: "Admins & Invites",
    sub: "Manage school admins and issue invite links for new admins",
    createInvite: "Create invite",
    statActive: "Active admins",
    statSchools: "Total schools",
    statInvites: "Active invites",
    statDeactivated: "Deactivated",
    tabAdmins: "Admins",
    tabInvites: "Invites",
    inviteInfo1: "Invite validity",
    inviteInfo2: "30 days",
    inviteInfo3: "Single-use · revocable any time before it's accepted",
    flashCreated: "Invite link created successfully",
    flashCopy: "Copy link",
    flashCopied: "Copied!",
    loading: "Loading...",
    secWithAdmin: "Schools with an admin",
    secWithoutAdmin: "Schools without an admin",
    secActiveInvites: "Active invites",
    secHistory: "History",
    statusActive: "Active",
    statusInactive: "Deactivated",
    statusActiveInvite: "Invite pending",
    statusNone: "None",
    statusUsed: "Used",
    statusDisabled: "Disabled",
    statusExpired: "Expired",
    actDeactivate: "Deactivate",
    actActivate: "Activate",
    actInvite: "Invite admin",
    actDisableInvite: "Disable invite",
    actCopy: "Copy link",
    joinedAt: "Joined",
    acceptedBy: "Accepted by",
    usedAt: "Used",
    expiresAt: "Expires",
    createdAt: "Created",
    notAssigned: "No admin assigned yet",
    waitingInvite: "Invite link awaiting acceptance",
    emptyNoSchools: "No schools registered yet",
    emptyNoSchoolsSub: "You need at least one school before you can issue admin invites. Go to the Schools page to create your first one.",
    emptyGoSchools: "Go to Schools",
    emptyNoInvites: "No invites yet",
    emptyCreateFirst: "Create your first invite",
    modalTitle: "Create an admin invite",
    modalDesc: "Pick the school you want to assign an admin to. The link will be sent to the recipient.",
    modalLabel: "School",
    modalPlaceholder: "— Pick a school —",
    modalHint: "All schools already have an admin or pending invite",
    modalCancel: "Cancel",
    modalCreate: "Create link",
    modalCreating: "Creating...",
    errLoad: "Failed to load data",
    errGeneric: "Something went wrong",
    errNet: "Could not reach the server",
    errChooseSchool: "Please pick a school first",
  },
} as const;

/* ───── Types ───── */
interface AdminProfile {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}
interface SchoolWithAdmin {
  id: string;
  name: string;
  slug: string;
  language: string;
  admins: { profile: AdminProfile }[];
}
interface AdminInvite {
  id: string;
  token: string;
  is_active: boolean;
  use_count: number;
  max_uses: number | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  school: { id: string; name: string } | null;
  creator: { full_name: string } | null;
  usedBy: { full_name: string } | null;
}

function fmtDate(iso: string | null, lang: "ar" | "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function getInviteStatus(
  inv: AdminInvite,
  t: (typeof T)[keyof typeof T],
): { label: string; color: string; bg: string } {
  if (!inv.is_active && inv.used_at) return { label: t.statusUsed,     color: "#1B5E20", bg: "rgba(45,138,74,0.09)" };
  if (!inv.is_active)                return { label: t.statusDisabled, color: "#6B1E2D", bg: "rgba(107,30,45,0.09)" };
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
                                     return { label: t.statusExpired,  color: "#796A62", bg: "rgba(138,123,96,0.09)" };
  return { label: t.statusActive, color: "#B8A082", bg: "rgba(184,160,130,0.12)" };
}

type Tab = "admins" | "invites";

export default function OwnerAdminsPage() {
  // Bilingual: read from the global language context (ar/sq/en).
  // sq from other pages safely falls back to ar (we only support ar/en here).
  const { lang: globalLang, setLang: setGlobalLang } = useLang();
  const lang: "ar" | "en" = globalLang === "en" ? "en" : "ar";
  const t = T[lang];
  const dir = t.dir;
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("admins");

  /* ── Admins state ── */
  const [schools, setSchools] = useState<SchoolWithAdmin[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  /* ── Invites state ── */
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [newInvite, setNewInvite] = useState<AdminInvite | null>(null);
  const [disabling, setDisabling] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const newInviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Common ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  useEffect(() => {
    Promise.all([
      fetch("/api/owner/admins").then((r) => r.json()),
      fetch("/api/owner/invites").then((r) => r.json()),
    ])
      .then(([adm, inv]) => {
        setSchools(adm.schools ?? []);
        setInvites(inv.invites ?? []);
      })
      .catch(() => setError(t.errLoad))
      .finally(() => setLoading(false));
  }, []);

  /* ── Admins actions ── */
  const toggleAdmin = async (profileId: string, currentActive: boolean) => {
    if (currentActive) {
      const ok = await confirm({
        title: lang === "ar" ? "تعطيل حساب المدير" : "Deactivate admin account",
        message: lang === "ar"
          ? "سيتم تعطيل وصول هذا المدير إلى لوحته فوراً."
          : "This admin will lose access to their dashboard immediately.",
        variant: "warning",
        confirmText: lang === "ar" ? "تعطيل" : "Deactivate",
        irreversible: false,
      });
      if (!ok) return;
    }
    setToggling(profileId);
    setError("");
    try {
      const r = await fetch(`/api/owner/admins/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? t.errGeneric); return; }
      setSchools((prev) =>
        prev.map((school) => ({
          ...school,
          admins: school.admins.map((a) =>
            a.profile.id === profileId
              ? { ...a, profile: { ...a.profile, is_active: !currentActive } }
              : a,
          ),
        })),
      );
    } catch {
      setError(t.errNet);
    } finally {
      setToggling(null);
    }
  };

  /* ── Invites actions ── */
  const handleCreateInvite = async () => {
    if (!selectedSchool) { setError(t.errChooseSchool); return; }
    setError("");
    setCreating(true);
    try {
      const r = await fetch("/api/owner/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id: selectedSchool }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? t.errGeneric); return; }
      const invite = d.invite as AdminInvite;
      setInvites((prev) => [invite, ...prev]);
      setNewInvite(invite);
      setShowCreateModal(false);
      setSelectedSchool("");
      if (newInviteTimer.current) clearTimeout(newInviteTimer.current);
      newInviteTimer.current = setTimeout(() => setNewInvite(null), 12_000);
    } catch {
      setError(t.errNet);
    } finally {
      setCreating(false);
    }
  };

  const handleDisableInvite = async (id: string) => {
    setDisabling(id);
    setError("");
    try {
      const r = await fetch(`/api/owner/invites/${id}`, { method: "PATCH" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? t.errGeneric); return; }
      setInvites((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, is_active: false } : inv)),
      );
      if (newInvite?.id === id) setNewInvite(null);
    } catch {
      setError(t.errNet);
    } finally {
      setDisabling(null);
    }
  };

  const copyLink = (token: string) => {
    const link = `${siteUrl}/invite/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  /* ── Derived ── */
  const schoolsWithAdmin    = schools.filter((s) => s.admins.length > 0);
  const schoolsWithoutAdmin = schools.filter((s) => s.admins.length === 0);
  const allAdmins           = schools.flatMap((s) => s.admins.map((a) => a.profile));
  const activeCount         = allAdmins.filter((a) => a.is_active).length;
  const deactivatedCount    = allAdmins.filter((a) => !a.is_active).length;
  const activeInvites       = invites.filter((i) => i.is_active && (!i.expires_at || new Date(i.expires_at) > new Date()));
  const historyInvites      = invites.filter((i) => !activeInvites.includes(i));

  // All schools can receive invites (multiple admins allowed)
  const schoolIdsWithActiveInvite = new Set(activeInvites.map((i) => i.school?.id).filter(Boolean) as string[]);

  /* ──────────── Render ──────────── */
  return (
    <div className="owner-admins-page" dir={dir}>
      {/* ── Header ── */}
      <div className="owner-admins-header">
        <div>
          <p className="owner-admins-eyebrow">{t.eyebrow}</p>
          <h1 className="owner-admins-title">{t.title}</h1>
          <p className="owner-admins-sub">{t.sub}</p>
        </div>
        <div className="owner-admins-header-actions">
          {/* Language toggle (modern segmented control with sliding thumb) */}
          <div className="owner-admins-lang-toggle" dir="ltr" role="group" aria-label="Language">
            <span
              className="owner-admins-lang-thumb"
              style={{ transform: lang === "ar" ? "translateX(100%)" : "translateX(0%)" }}
              aria-hidden="true"
            />
            <button
              type="button"
              className={`owner-admins-lang-btn${lang === "en" ? " owner-admins-lang-btn--on" : ""}`}
              onClick={() => setGlobalLang("en")}
              aria-pressed={lang === "en"}
            >EN</button>
            <button
              type="button"
              className={`owner-admins-lang-btn${lang === "ar" ? " owner-admins-lang-btn--on" : ""}`}
              onClick={() => setGlobalLang("ar")}
              aria-pressed={lang === "ar"}
            >AR</button>
          </div>

          {tab === "invites" && schools.length > 0 && (
            <button className="owner-admins-primary-btn" onClick={() => setShowCreateModal(true)}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.createInvite}
            </button>
          )}
        </div>
      </div>

      <div className="owner-admins-rule">
        <div className="owner-admins-rule-line" /><div className="owner-admins-rule-diamond" /><div className="owner-admins-rule-line" />
      </div>

      {/* ── Summary cards ── */}
      <div className="owner-admins-stats">
        <div className="owner-admins-stat owner-admins-stat--gold">
          <div className="owner-admins-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            </svg>
          </div>
          <div>
            <div className="owner-admins-stat-n">{activeCount}</div>
            <div className="owner-admins-stat-l">{t.statActive}</div>
          </div>
        </div>
        <div className="owner-admins-stat">
          <div className="owner-admins-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="owner-admins-stat-n">{schools.length}</div>
            <div className="owner-admins-stat-l">{t.statSchools}</div>
          </div>
        </div>
        <div className="owner-admins-stat owner-admins-stat--invite">
          <div className="owner-admins-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" />
            </svg>
          </div>
          <div>
            <div className="owner-admins-stat-n">{activeInvites.length}</div>
            <div className="owner-admins-stat-l">{t.statInvites}</div>
          </div>
        </div>
        <div className="owner-admins-stat owner-admins-stat--muted">
          <div className="owner-admins-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
            </svg>
          </div>
          <div>
            <div className="owner-admins-stat-n">{deactivatedCount}</div>
            <div className="owner-admins-stat-l">{t.statDeactivated}</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="owner-admins-tabs">
        <button
          className={`owner-admins-tab ${tab === "admins" ? "owner-admins-tab--on" : ""}`}
          onClick={() => setTab("admins")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" />
          </svg>
          {t.tabAdmins}
          <span className="owner-admins-tab-count">{schoolsWithAdmin.length}</span>
        </button>
        <button
          className={`owner-admins-tab ${tab === "invites" ? "owner-admins-tab--on" : ""}`}
          onClick={() => setTab("invites")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          {t.tabInvites}
          {activeInvites.length > 0 && <span className="owner-admins-tab-count owner-admins-tab-count--accent">{activeInvites.length}</span>}
        </button>
      </div>

      {error && (
        <div className="owner-admins-error">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Flash card after invite created ── */}
      {newInvite && tab === "invites" && (
        <div className="owner-admins-flash">
          <div className="owner-admins-flash-head">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#1B5E20" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{t.flashCreated}</span>
            <button className="owner-admins-flash-close" onClick={() => setNewInvite(null)} aria-label="×">×</button>
          </div>
          <div className="owner-admins-flash-school">{newInvite.school?.name}</div>
          <div className="owner-admins-flash-link" dir="ltr">
            {siteUrl}/invite/{newInvite.token.slice(0, 18)}…
          </div>
          <button className="owner-admins-primary-btn" onClick={() => copyLink(newInvite.token)}>
            {copied === newInvite.token ? (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t.flashCopied}
              </>
            ) : (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {t.flashCopy}
              </>
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="owner-admins-loading">
          <div className="owner-admins-spin" />
          <span>{t.loading}</span>
        </div>
      ) : (
        <>
          {/* ════════════════ ADMINS TAB ════════════════ */}
          {tab === "admins" && (
            <>
              {schoolsWithAdmin.length > 0 && (
                <div className="owner-admins-section">
                  <div className="owner-admins-section-title">{t.secWithAdmin}</div>
                  <div className="owner-admins-list">
                    {schoolsWithAdmin.flatMap((school) =>
                      school.admins.map(({ profile: admin }) => {
                        const active = admin.is_active;
                        const isToggling = toggling === admin.id;
                        return (
                          <div key={`${school.id}-${admin.id}`} className={`owner-admins-card ${active ? "" : "owner-admins-card--inactive"}`}>
                            <div className="owner-admins-school-badge">{school.name.charAt(0)}</div>
                            <div className="owner-admins-card-info">
                              <div className="owner-admins-card-name">{admin.full_name}</div>
                              <div className="owner-admins-card-school">{school.name}</div>
                              {admin.email && <div className="owner-admins-card-email" dir="ltr">{admin.email}</div>}
                              <div className="owner-admins-card-meta">{t.joinedAt} {fmtDate(admin.created_at, lang)}</div>
                            </div>
                            <div className={`owner-admins-status-badge ${active ? "owner-admins-status-badge--active" : "owner-admins-status-badge--inactive"}`}>
                              {active ? t.statusActive : t.statusInactive}
                            </div>
                            <button
                              className={`owner-admins-toggle-btn ${active ? "owner-admins-toggle-btn--deactivate" : "owner-admins-toggle-btn--activate"}`}
                              onClick={() => toggleAdmin(admin.id, active)}
                              disabled={isToggling}
                            >
                              {isToggling ? (
                                <span className="owner-admins-spin owner-admins-spin--sm" />
                              ) : active ? (
                                <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
                                </svg>{t.actDeactivate}</>
                              ) : (
                                <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8m-4-4h8" />
                                </svg>{t.actActivate}</>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {schoolsWithoutAdmin.length > 0 && (
                <div className="owner-admins-section" style={{ marginTop: 32 }}>
                  <div className="owner-admins-section-title owner-admins-section-title--muted">
                    {t.secWithoutAdmin} ({schoolsWithoutAdmin.length})
                  </div>
                  <div className="owner-admins-list">
                    {schoolsWithoutAdmin.map((school) => {
                      const hasActiveInvite = schoolIdsWithActiveInvite.has(school.id);
                      return (
                        <div key={school.id} className="owner-admins-card owner-admins-card--no-admin">
                          <div className="owner-admins-school-badge owner-admins-school-badge--muted">{school.name.charAt(0)}</div>
                          <div className="owner-admins-card-info">
                            <div className="owner-admins-card-name">{school.name}</div>
                            <div className="owner-admins-card-school owner-admins-card-school--muted">
                              {hasActiveInvite ? t.waitingInvite : t.notAssigned}
                            </div>
                          </div>
                          {hasActiveInvite ? (
                            <span className="owner-admins-status-badge" style={{ color: "#B8A082", background: "rgba(184,160,130,0.12)" }}>
                              {t.statusActiveInvite}
                            </span>
                          ) : (
                            <button
                              className="owner-admins-toggle-btn owner-admins-toggle-btn--activate"
                              onClick={() => { setSelectedSchool(school.id); setShowCreateModal(true); }}
                            >
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              {t.actInvite}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {schools.length === 0 && (
                <div className="owner-admins-empty owner-admins-empty--big">
                  <div className="owner-admins-empty-icon owner-admins-empty-icon--big">
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <h2 className="owner-admins-empty-title">{t.emptyNoSchools}</h2>
                  <p className="owner-admins-empty-sub">{t.emptyNoSchoolsSub}</p>
                  <Link href="/owner/schools" className="owner-admins-primary-btn" style={{ textDecoration: "none", marginTop: 8 }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                    {t.emptyGoSchools}
                  </Link>
                </div>
              )}
            </>
          )}

          {/* ════════════════ INVITES TAB ════════════════ */}
          {tab === "invites" && (
            <>
              <div className="owner-admins-info">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
                </svg>
                <span>
                  {t.inviteInfo1} <strong>{t.inviteInfo2}</strong> · {t.inviteInfo3}
                </span>
              </div>

              {activeInvites.length > 0 && (
                <div className="owner-admins-section">
                  <div className="owner-admins-section-title">{t.secActiveInvites} ({activeInvites.length})</div>
                  <div className="owner-admins-list">
                    {activeInvites.map((inv, i) => {
                      const status = getInviteStatus(inv, t);
                      return (
                        <div key={inv.id} className="owner-admins-card" style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="owner-admins-school-badge owner-admins-school-badge--invite">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </div>
                          <div className="owner-admins-card-info">
                            <div className="owner-admins-card-name">{inv.school?.name ?? "—"}</div>
                            <div className="owner-admins-card-token" dir="ltr">/invite/{inv.token.slice(0, 22)}…</div>
                            <div className="owner-admins-card-meta">
                              {t.createdAt} {fmtDate(inv.created_at, lang)}
                              {inv.expires_at && <> · {t.expiresAt} {fmtDate(inv.expires_at, lang)}</>}
                            </div>
                          </div>
                          <span className="owner-admins-status-badge" style={{ color: status.color, background: status.bg }}>
                            {status.label}
                          </span>
                          <div className="owner-admins-card-actions">
                            <button className="owner-admins-action-btn" onClick={() => copyLink(inv.token)} title={t.actCopy}>
                              {copied === inv.token ? (
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                              )}
                            </button>
                            <button
                              className="owner-admins-action-btn owner-admins-action-btn--danger"
                              onClick={() => handleDisableInvite(inv.id)}
                              disabled={disabling === inv.id}
                              title={t.actDisableInvite}
                            >
                              {disabling === inv.id
                                ? <span className="owner-admins-spin owner-admins-spin--sm" />
                                : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
                                  </svg>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {historyInvites.length > 0 && (
                <div className="owner-admins-section" style={{ marginTop: 32 }}>
                  <div className="owner-admins-section-title owner-admins-section-title--muted">
                    {t.secHistory} ({historyInvites.length})
                  </div>
                  <div className="owner-admins-list">
                    {historyInvites.map((inv, i) => {
                      const status = getInviteStatus(inv, t);
                      return (
                        <div key={inv.id} className="owner-admins-card owner-admins-card--history" style={{ animationDelay: `${i * 30}ms` }}>
                          <div className="owner-admins-school-badge owner-admins-school-badge--invite owner-admins-school-badge--muted">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </div>
                          <div className="owner-admins-card-info">
                            <div className="owner-admins-card-name" style={{ opacity: 0.75 }}>{inv.school?.name ?? "—"}</div>
                            {inv.usedBy && <div className="owner-admins-card-meta">{t.acceptedBy}: {inv.usedBy.full_name}</div>}
                            <div className="owner-admins-card-meta" style={{ opacity: 0.65 }}>
                              {fmtDate(inv.created_at, lang)}
                              {inv.used_at && <> · {t.usedAt} {fmtDate(inv.used_at, lang)}</>}
                            </div>
                          </div>
                          <span className="owner-admins-status-badge" style={{ color: status.color, background: status.bg }}>
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {invites.length === 0 && (
                <div className="owner-admins-empty">
                  <div className="owner-admins-empty-icon">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <p>{t.emptyNoInvites}</p>
                  {schools.length > 0 && (
                    <button
                      className="owner-admins-primary-btn"
                      style={{ marginTop: 12 }}
                      onClick={() => setShowCreateModal(true)}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {t.emptyCreateFirst}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── CREATE INVITE MODAL ── */}
      {showCreateModal && (
        <div className="owner-admins-modal-overlay" onClick={() => { setShowCreateModal(false); setSelectedSchool(""); setError(""); }}>
          <div className="owner-admins-modal" onClick={(e) => e.stopPropagation()} dir={dir}>
            <div className="owner-admins-modal-header">
              <h2 className="owner-admins-modal-title">{t.modalTitle}</h2>
              <button
                className="owner-admins-modal-close"
                onClick={() => { setShowCreateModal(false); setSelectedSchool(""); setError(""); }}
                aria-label="×"
              >×</button>
            </div>
            <p className="owner-admins-modal-desc">{t.modalDesc}</p>
            <div className="owner-admins-modal-field">
              <label className="owner-admins-modal-label">{t.modalLabel}</label>
              <select
                className="owner-admins-modal-select"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                autoFocus
              >
                <option value="">{t.modalPlaceholder}</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.admins.length > 0 ? (lang === "ar" ? " (لديها مدير)" : " (has admin)") : ""}
                  </option>
                ))}
              </select>
            </div>
            {error && <div className="owner-admins-error" style={{ marginTop: 0 }}>{error}</div>}
            <div className="owner-admins-modal-actions">
              <button
                className="owner-admins-modal-cancel"
                onClick={() => { setShowCreateModal(false); setSelectedSchool(""); setError(""); }}
              >{t.modalCancel}</button>
              <button
                className="owner-admins-primary-btn"
                onClick={handleCreateInvite}
                disabled={creating || !selectedSchool}
              >
                {creating
                  ? <><span className="owner-admins-spin owner-admins-spin--sm" /> {t.modalCreating}</>
                  : t.modalCreate}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  @keyframes owner-admins-spin    { to { transform: rotate(360deg); } }
  @keyframes owner-admins-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes owner-admins-overlay { from { opacity:0; } to { opacity:1; } }
  @keyframes owner-admins-modal   { from { opacity:0; transform:scale(0.96) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }

  :root {
    --gold: #B8A082; --gold2: #B8A082;
    --graphite: #1A1A1A; --graphite-soft: #8C8274;
    --bg-card: #FFFBF5; --border: rgba(26,26,26,0.08);
  }

  .owner-admins-page { font-family: 'Cairo', sans-serif; max-width: 980px; }

  .owner-admins-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .owner-admins-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  /* Language toggle (sliding gold thumb) */
  .owner-admins-lang-toggle {
    position: relative; display: grid; grid-template-columns: 1fr 1fr;
    background: rgba(11,11,12,0.04); border: 1px solid rgba(168,134,62,0.30);
    border-radius: 11px; padding: 3px; width: 96px; overflow: hidden;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
  }
  .owner-admins-lang-thumb {
    position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px);
    border-radius: 8px;
    background: linear-gradient(135deg, #D9C9B0 0%, #B8A082 60%, #B8A082 100%);
    box-shadow: 0 2px 8px rgba(184,160,130,0.30), inset 0 1px 0 rgba(255,255,255,0.25);
    transition: transform .32s cubic-bezier(0.34,1.56,0.64,1);
    z-index: 0; pointer-events: none;
  }
  .owner-admins-lang-btn {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 6px 0; border: none; background: transparent; cursor: pointer;
    font-family: 'Cairo', sans-serif; font-size: 11.5px; font-weight: 800;
    letter-spacing: 0.05em; color: #6B5A38;
    transition: color .22s, transform .15s;
  }
  .owner-admins-lang-btn:hover:not(.owner-admins-lang-btn--on) { color: #3D3320; }
  .owner-admins-lang-btn:active { transform: scale(.97); }
  .owner-admins-lang-btn--on { color: #1A1A1A; }
  .owner-admins-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: var(--gold); margin-bottom: 4px; }
  .owner-admins-title { font-size: 26px; font-weight: 900; color: var(--graphite); margin: 0 0 4px; }
  .owner-admins-sub { font-size: 13px; color: var(--graphite-soft); }

  .owner-admins-primary-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 11px;
    background: var(--graphite); color: var(--gold);
    border: 1px solid rgba(184,160,130,0.25);
    font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 800;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: all 0.18s;
  }
  .owner-admins-primary-btn:hover:not(:disabled) { background: #1A1A1A; border-color: rgba(184,160,130,0.5); color: var(--gold2); }
  .owner-admins-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .owner-admins-rule { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; }
  .owner-admins-rule-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(184,160,130,0.35), transparent); }
  .owner-admins-rule-diamond { width: 5px; height: 5px; background: rgba(184,160,130,0.6); transform: rotate(45deg); flex-shrink: 0; }

  /* Summary stats */
  .owner-admins-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    margin-bottom: 22px;
  }
  .owner-admins-stat {
    display: flex; align-items: center; gap: 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px 16px;
    transition: all 0.18s;
  }
  .owner-admins-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.05); }
  .owner-admins-stat-icon {
    width: 40px; height: 40px; border-radius: 11px;
    background: rgba(184,160,130,0.08); color: var(--gold);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .owner-admins-stat--gold .owner-admins-stat-icon { background: linear-gradient(135deg, #B8A082, #B8A082); color: var(--graphite); }
  .owner-admins-stat--invite .owner-admins-stat-icon { background: rgba(45,138,74,0.10); color: #1B5E20; }
  .owner-admins-stat--muted .owner-admins-stat-icon { background: rgba(139,26,26,0.08); color: #6B1E2D; }
  .owner-admins-stat-n { font-size: 22px; font-weight: 900; color: var(--graphite); line-height: 1; }
  .owner-admins-stat-l { font-size: 11.5px; color: var(--graphite-soft); margin-top: 3px; font-weight: 600; }

  /* Tabs */
  .owner-admins-tabs {
    display: flex; gap: 4px;
    background: rgba(184,160,130,0.07);
    border: 1px solid rgba(184,160,130,0.18);
    border-radius: 13px; padding: 4px;
    margin-bottom: 20px; width: fit-content;
  }
  .owner-admins-tab {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 18px; border-radius: 10px;
    background: transparent; border: 1px solid transparent;
    font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 700;
    color: var(--graphite-soft); cursor: pointer;
    transition: all 0.18s;
  }
  .owner-admins-tab:hover { color: var(--graphite); }
  .owner-admins-tab--on {
    background: var(--graphite); color: var(--gold);
    border-color: rgba(184,160,130,0.3);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .owner-admins-tab-count {
    font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 100px;
    background: rgba(26,26,26,0.06); color: var(--graphite-soft);
  }
  .owner-admins-tab--on .owner-admins-tab-count { background: rgba(184,160,130,0.18); color: var(--gold); }
  .owner-admins-tab-count--accent { background: rgba(45,138,74,0.15); color: #1B5E20; }
  .owner-admins-tab--on .owner-admins-tab-count--accent { background: rgba(184,160,130,0.18); color: var(--gold); }

  /* Info bar */
  .owner-admins-info {
    display: flex; align-items: center; gap: 8px;
    background: rgba(184,160,130,0.07); border: 1px solid rgba(184,160,130,0.18);
    color: #6B4E18; font-size: 12.5px; padding: 10px 14px; border-radius: 10px;
    font-weight: 600; margin-bottom: 20px;
  }

  /* Error */
  .owner-admins-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.18);
    color: #6B1E2D; font-size: 13px; padding: 10px 14px; border-radius: 9px;
    font-weight: 600; margin-bottom: 16px;
  }

  /* Flash card */
  .owner-admins-flash {
    background: rgba(45,138,74,0.06); border: 1.5px solid rgba(45,138,74,0.22);
    border-radius: 14px; padding: 16px 18px; margin-bottom: 22px;
    animation: owner-admins-fadein 0.35s ease;
  }
  .owner-admins-flash-head { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; color: #1B5E20; margin-bottom: 6px; }
  .owner-admins-flash-close { margin-inline-start: auto; background: none; border: none; font-size: 20px; cursor: pointer; color: #1B5E20; padding: 0 4px; line-height: 1; }
  .owner-admins-flash-school { font-size: 14px; font-weight: 800; color: var(--graphite); margin-bottom: 6px; }
  .owner-admins-flash-link { font-size: 12px; color: var(--graphite-soft); font-family: monospace; margin-bottom: 12px; direction: ltr; }

  .owner-admins-loading { display: flex; align-items: center; gap: 10px; color: var(--graphite-soft); font-size: 14px; padding: 30px 0; }
  .owner-admins-spin { display: inline-block; width: 18px; height: 18px; border: 2.5px solid rgba(184,160,130,0.2); border-top-color: var(--gold); border-radius: 50%; animation: owner-admins-spin 0.7s linear infinite; flex-shrink: 0; }
  .owner-admins-spin--sm { width: 12px; height: 12px; border-width: 2px; }

  .owner-admins-section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: var(--graphite); margin-bottom: 12px; }
  .owner-admins-section-title--muted { color: var(--graphite-soft); }

  .owner-admins-list { display: flex; flex-direction: column; gap: 10px; }

  .owner-admins-card {
    display: flex; align-items: center; gap: 14px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    padding: 14px 16px;
    box-shadow: 0 1px 4px rgba(26,26,26,0.04);
    animation: owner-admins-fadein 0.35s ease both;
    transition: all 0.18s;
  }
  .owner-admins-card:hover { border-color: rgba(184,160,130,0.25); transform: translateY(-1px); }
  .owner-admins-card--inactive { opacity: 0.75; background: rgba(139,26,26,0.02); border-color: rgba(139,26,26,0.10); }
  .owner-admins-card--no-admin { opacity: 0.85; }
  .owner-admins-card--history { opacity: 0.80; }

  .owner-admins-school-badge {
    width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #B8A082, #B8A082);
    font-size: 20px; font-weight: 900; color: var(--graphite);
  }
  .owner-admins-school-badge--muted { background: rgba(184,160,130,0.12); color: var(--gold); border: 1.5px dashed rgba(184,160,130,0.35); }
  .owner-admins-school-badge--invite { background: rgba(45,138,74,0.10); color: #1B5E20; }
  .owner-admins-school-badge--invite.owner-admins-school-badge--muted { background: rgba(138,123,96,0.08); color: var(--graphite-soft); border: 1.5px dashed rgba(138,123,96,0.25); }

  .owner-admins-card-info { flex: 1; min-width: 0; }
  .owner-admins-card-name { font-size: 14px; font-weight: 800; color: var(--graphite); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .owner-admins-card-school { font-size: 12px; color: var(--gold); font-weight: 600; margin-top: 1px; }
  .owner-admins-card-school--muted { color: var(--graphite-soft); }
  .owner-admins-card-token { font-size: 11.5px; color: var(--graphite-soft); font-family: monospace; margin-top: 3px; }
  .owner-admins-card-email { font-size: 11.5px; color: var(--graphite-soft); margin-top: 2px; }
  .owner-admins-card-meta { font-size: 11px; color: var(--graphite-soft); margin-top: 3px; opacity: 0.85; }

  .owner-admins-status-badge {
    flex-shrink: 0; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.05em;
  }
  .owner-admins-status-badge--active   { background: rgba(45,138,74,0.10);  color: #1B5E20; border: 1px solid rgba(45,138,74,0.20); }
  .owner-admins-status-badge--inactive { background: rgba(139,26,26,0.08);  color: #6B1E2D; border: 1px solid rgba(139,26,26,0.18); }

  .owner-admins-toggle-btn {
    flex-shrink: 0; display: flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 9px;
    font-size: 12px; font-weight: 800; cursor: pointer;
    font-family: 'Cairo', sans-serif; border: 1px solid;
    transition: all 0.18s;
  }
  .owner-admins-toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .owner-admins-toggle-btn--deactivate {
    background: rgba(139,26,26,0.07); color: #6B1E2D;
    border-color: rgba(139,26,26,0.22);
  }
  .owner-admins-toggle-btn--deactivate:hover:not(:disabled) {
    background: rgba(139,26,26,0.14); border-color: rgba(139,26,26,0.38);
  }
  .owner-admins-toggle-btn--activate {
    background: rgba(45,138,74,0.08); color: #1B5E20;
    border-color: rgba(45,138,74,0.22);
  }
  .owner-admins-toggle-btn--activate:hover:not(:disabled) {
    background: rgba(45,138,74,0.15); border-color: rgba(45,138,74,0.38);
  }

  .owner-admins-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .owner-admins-action-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 9px;
    background: rgba(184,160,130,0.08); border: 1px solid rgba(184,160,130,0.18);
    color: var(--graphite-soft); cursor: pointer; transition: all 0.18s; flex-shrink: 0;
  }
  .owner-admins-action-btn:hover:not(:disabled) { background: rgba(184,160,130,0.18); color: var(--graphite); border-color: rgba(184,160,130,0.35); }
  .owner-admins-action-btn--danger { background: rgba(139,26,26,0.06); border-color: rgba(139,26,26,0.18); color: #6B1E2D; }
  .owner-admins-action-btn--danger:hover:not(:disabled) { background: rgba(139,26,26,0.14); }
  .owner-admins-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .owner-admins-empty {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 60px 0; color: var(--graphite-soft); text-align: center;
  }
  .owner-admins-empty--big {
    background: linear-gradient(180deg, var(--bg-card) 0%, rgba(184,160,130,0.04) 100%);
    border: 1px solid rgba(184,160,130,0.22);
    border-radius: 20px;
    padding: 56px 28px;
    margin-top: 8px;
    gap: 14px;
    box-shadow: 0 4px 28px rgba(0,0,0,0.04);
    animation: owner-admins-fadein 0.4s ease both;
  }
  .owner-admins-empty-icon {
    width: 64px; height: 64px; border-radius: 20px;
    background: rgba(184,160,130,0.08);
    display: flex; align-items: center; justify-content: center;
    color: rgba(184,160,130,0.5);
  }
  .owner-admins-empty-icon--big {
    width: 84px; height: 84px; border-radius: 22px;
    background: linear-gradient(135deg, rgba(184,160,130,0.18), rgba(184,160,130,0.10));
    border: 1px solid rgba(184,160,130,0.30);
    color: var(--gold); margin-bottom: 6px;
    box-shadow: 0 6px 20px rgba(184,160,130,0.12);
  }
  .owner-admins-empty-title {
    font-size: 20px; font-weight: 900; color: var(--graphite);
    margin: 0; letter-spacing: -0.3px;
  }
  .owner-admins-empty-sub {
    font-size: 13.5px; color: var(--graphite-soft);
    max-width: 460px; line-height: 1.75;
    margin: 0;
  }

  /* Modal */
  .owner-admins-modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(26,26,26,0.55); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    animation: owner-admins-overlay 0.22s ease;
  }
  .owner-admins-modal {
    background: #FFFBF5; border-radius: 20px; padding: 28px;
    width: min(480px, calc(100vw - 32px));
    box-shadow: 0 24px 64px rgba(26,26,26,0.25);
    animation: owner-admins-modal 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }
  .owner-admins-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .owner-admins-modal-title { font-size: 19px; font-weight: 900; color: var(--graphite); margin: 0; }
  .owner-admins-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--graphite-soft); line-height: 1; padding: 0; }
  .owner-admins-modal-desc { font-size: 13px; color: var(--graphite-soft); margin: 0 0 20px; line-height: 1.6; }
  .owner-admins-modal-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 20px; }
  .owner-admins-modal-label { font-size: 12px; font-weight: 700; color: #4a3f2e; text-transform: uppercase; letter-spacing: 0.06em; }
  .owner-admins-modal-select {
    padding: 11px 14px; border-radius: 10px;
    border: 1px solid rgba(26,26,26,0.12); background: #fff;
    font-family: 'Cairo', sans-serif; font-size: 14px; color: var(--graphite);
    outline: none; cursor: pointer; transition: border-color 0.18s;
  }
  .owner-admins-modal-select:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(184,160,130,0.12); }
  .owner-admins-modal-hint { font-size: 11.5px; color: var(--graphite-soft); margin-top: 4px; font-style: italic; }
  .owner-admins-modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 24px; }
  .owner-admins-modal-cancel {
    padding: 10px 22px; border-radius: 10px;
    background: none; border: 1px solid rgba(26,26,26,0.12);
    font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer;
    color: var(--graphite-soft); transition: all 0.18s;
  }
  .owner-admins-modal-cancel:hover { background: rgba(26,26,26,0.04); }

  @media (max-width: 760px) {
    .owner-admins-stats { grid-template-columns: repeat(2, 1fr); }
    .owner-admins-header { flex-direction: column; align-items: stretch; }
    .owner-admins-primary-btn { justify-content: center; }
    .owner-admins-card { flex-wrap: wrap; }
    .owner-admins-card-info { flex: 1 1 calc(100% - 60px); min-width: 0; }
    .owner-admins-status-badge { order: -1; }
  }
  @media (max-width: 460px) {
    .owner-admins-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
    .owner-admins-stat { padding: 12px; gap: 10px; }
    .owner-admins-stat-icon { width: 36px; height: 36px; }
    .owner-admins-stat-n { font-size: 18px; }
    .owner-admins-stat-l { font-size: 10.5px; }
    .owner-admins-title { font-size: 22px; }
    .owner-admins-tab { padding: 8px 14px; font-size: 12.5px; }
  }
`;
