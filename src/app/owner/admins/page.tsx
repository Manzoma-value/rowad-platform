"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";

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
  admin: AdminProfile | null;
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

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function getInviteStatus(inv: AdminInvite): { label: string; color: string; bg: string } {
  if (!inv.is_active && inv.used_at) return { label: "مُستخدمة", color: "#2D8A4A", bg: "rgba(45,138,74,0.09)" };
  if (!inv.is_active)                return { label: "معطّلة",   color: "#7A1E1E", bg: "rgba(122,30,30,0.09)" };
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
                                     return { label: "منتهية",   color: "#8A7B60", bg: "rgba(138,123,96,0.09)" };
  return { label: "نشطة", color: "#C8A96A", bg: "rgba(200,169,106,0.12)" };
}

type Tab = "admins" | "invites";

export default function OwnerAdminsPage() {
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
      .catch(() => setError("تعذر تحميل البيانات"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Admins actions ── */
  const toggleAdmin = async (profileId: string, currentActive: boolean) => {
    setToggling(profileId);
    setError("");
    try {
      const r = await fetch(`/api/owner/admins/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "حدث خطأ"); return; }
      setSchools((prev) =>
        prev.map((school) =>
          school.admin?.id === profileId
            ? { ...school, admin: { ...school.admin!, is_active: !currentActive } }
            : school,
        ),
      );
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setToggling(null);
    }
  };

  /* ── Invites actions ── */
  const handleCreateInvite = async () => {
    if (!selectedSchool) { setError("يرجى اختيار الجهة أولاً"); return; }
    setError("");
    setCreating(true);
    try {
      const r = await fetch("/api/owner/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id: selectedSchool }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "حدث خطأ"); return; }
      const invite = d.invite as AdminInvite;
      setInvites((prev) => [invite, ...prev]);
      setNewInvite(invite);
      setShowCreateModal(false);
      setSelectedSchool("");
      if (newInviteTimer.current) clearTimeout(newInviteTimer.current);
      newInviteTimer.current = setTimeout(() => setNewInvite(null), 12_000);
    } catch {
      setError("تعذر الاتصال بالخادم");
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
      if (!r.ok) { setError(d.error ?? "حدث خطأ"); return; }
      setInvites((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, is_active: false } : inv)),
      );
      if (newInvite?.id === id) setNewInvite(null);
    } catch {
      setError("تعذر الاتصال بالخادم");
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
  const schoolsWithAdmin    = schools.filter((s) => s.admin);
  const schoolsWithoutAdmin = schools.filter((s) => !s.admin);
  const activeCount         = schoolsWithAdmin.filter((s) => s.admin!.is_active).length;
  const deactivatedCount    = schoolsWithAdmin.filter((s) => !s.admin!.is_active).length;
  const activeInvites       = invites.filter((i) => i.is_active && (!i.expires_at || new Date(i.expires_at) > new Date()));
  const historyInvites      = invites.filter((i) => !activeInvites.includes(i));

  // Schools available for new invites: those without an admin AND without an active invite
  const schoolIdsWithActiveInvite = new Set(activeInvites.map((i) => i.school?.id).filter(Boolean) as string[]);
  const inviteCandidateSchools = schoolsWithoutAdmin.filter((s) => !schoolIdsWithActiveInvite.has(s.id));

  /* ──────────── Render ──────────── */
  return (
    <div className="ad-page" dir="rtl">
      {/* ── Header ── */}
      <div className="ad-header">
        <div>
          <p className="ad-eyebrow">إدارة الصلاحيات والوصول</p>
          <h1 className="ad-title">المدراء والدعوات</h1>
          <p className="ad-sub">إدارة مدراء الجهات وإصدار دعوات تعيين المدراء الجدد</p>
        </div>
        {tab === "invites" && inviteCandidateSchools.length > 0 && (
          <button className="ad-primary-btn" onClick={() => setShowCreateModal(true)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            إنشاء دعوة
          </button>
        )}
      </div>

      <div className="ad-rule">
        <div className="ad-rule-line" /><div className="ad-rule-diamond" /><div className="ad-rule-line" />
      </div>

      {/* ── Summary cards ── */}
      <div className="ad-stats">
        <div className="ad-stat ad-stat--gold">
          <div className="ad-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            </svg>
          </div>
          <div>
            <div className="ad-stat-n">{activeCount}</div>
            <div className="ad-stat-l">مدراء نشطون</div>
          </div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="ad-stat-n">{schools.length}</div>
            <div className="ad-stat-l">إجمالي الجهات</div>
          </div>
        </div>
        <div className="ad-stat ad-stat--invite">
          <div className="ad-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" />
            </svg>
          </div>
          <div>
            <div className="ad-stat-n">{activeInvites.length}</div>
            <div className="ad-stat-l">دعوات نشطة</div>
          </div>
        </div>
        <div className="ad-stat ad-stat--muted">
          <div className="ad-stat-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
            </svg>
          </div>
          <div>
            <div className="ad-stat-n">{deactivatedCount}</div>
            <div className="ad-stat-l">معطّلون</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ad-tabs">
        <button
          className={`ad-tab ${tab === "admins" ? "ad-tab--on" : ""}`}
          onClick={() => setTab("admins")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" />
          </svg>
          المدراء
          <span className="ad-tab-count">{schoolsWithAdmin.length}</span>
        </button>
        <button
          className={`ad-tab ${tab === "invites" ? "ad-tab--on" : ""}`}
          onClick={() => setTab("invites")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          الدعوات
          {activeInvites.length > 0 && <span className="ad-tab-count ad-tab-count--accent">{activeInvites.length}</span>}
        </button>
      </div>

      {error && (
        <div className="ad-error">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Flash card after invite created ── */}
      {newInvite && tab === "invites" && (
        <div className="ad-flash">
          <div className="ad-flash-head">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2D8A4A" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>تم إنشاء رابط الدعوة بنجاح</span>
            <button className="ad-flash-close" onClick={() => setNewInvite(null)} aria-label="إغلاق">×</button>
          </div>
          <div className="ad-flash-school">{newInvite.school?.name}</div>
          <div className="ad-flash-link" dir="ltr">
            {siteUrl}/invite/{newInvite.token.slice(0, 18)}…
          </div>
          <button className="ad-primary-btn" onClick={() => copyLink(newInvite.token)}>
            {copied === newInvite.token ? (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                تم النسخ!
              </>
            ) : (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                نسخ الرابط
              </>
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="ad-loading">
          <div className="ad-spin" />
          <span>جارٍ التحميل...</span>
        </div>
      ) : (
        <>
          {/* ════════════════ ADMINS TAB ════════════════ */}
          {tab === "admins" && (
            <>
              {schoolsWithAdmin.length > 0 && (
                <div className="ad-section">
                  <div className="ad-section-title">جهات لديها مدير</div>
                  <div className="ad-list">
                    {schoolsWithAdmin.map((school) => {
                      const admin = school.admin!;
                      const active = admin.is_active;
                      const isToggling = toggling === admin.id;
                      return (
                        <div key={school.id} className={`ad-card ${active ? "" : "ad-card--inactive"}`}>
                          <div className="ad-school-badge">{school.name.charAt(0)}</div>
                          <div className="ad-card-info">
                            <div className="ad-card-name">{admin.full_name}</div>
                            <div className="ad-card-school">{school.name}</div>
                            {admin.email && <div className="ad-card-email" dir="ltr">{admin.email}</div>}
                            <div className="ad-card-meta">انضم {fmtDate(admin.created_at)}</div>
                          </div>
                          <div className={`ad-status-badge ${active ? "ad-status-badge--active" : "ad-status-badge--inactive"}`}>
                            {active ? "نشط" : "معطّل"}
                          </div>
                          <button
                            className={`ad-toggle-btn ${active ? "ad-toggle-btn--deactivate" : "ad-toggle-btn--activate"}`}
                            onClick={() => toggleAdmin(admin.id, active)}
                            disabled={isToggling}
                          >
                            {isToggling ? (
                              <span className="ad-spin ad-spin--sm" />
                            ) : active ? (
                              <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
                              </svg>تعطيل</>
                            ) : (
                              <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" /><path d="M12 8v8m-4-4h8" />
                              </svg>تفعيل</>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {schoolsWithoutAdmin.length > 0 && (
                <div className="ad-section" style={{ marginTop: 32 }}>
                  <div className="ad-section-title ad-section-title--muted">
                    جهات بدون مدير ({schoolsWithoutAdmin.length})
                  </div>
                  <div className="ad-list">
                    {schoolsWithoutAdmin.map((school) => {
                      const hasActiveInvite = schoolIdsWithActiveInvite.has(school.id);
                      return (
                        <div key={school.id} className="ad-card ad-card--no-admin">
                          <div className="ad-school-badge ad-school-badge--muted">{school.name.charAt(0)}</div>
                          <div className="ad-card-info">
                            <div className="ad-card-name">{school.name}</div>
                            <div className="ad-card-school ad-card-school--muted">
                              {hasActiveInvite ? "دعوة نشطة قيد الانتظار" : "لا يوجد مدير معيّن"}
                            </div>
                          </div>
                          {hasActiveInvite ? (
                            <span className="ad-status-badge" style={{ color: "#C8A96A", background: "rgba(200,169,106,0.12)" }}>
                              دعوة مفعّلة
                            </span>
                          ) : (
                            <button
                              className="ad-toggle-btn ad-toggle-btn--activate"
                              onClick={() => { setSelectedSchool(school.id); setShowCreateModal(true); }}
                            >
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              دعوة مدير
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {schools.length === 0 && (
                <div className="ad-empty">
                  <div className="ad-empty-icon">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <p>لا توجد جهات مسجّلة بعد</p>
                </div>
              )}
            </>
          )}

          {/* ════════════════ INVITES TAB ════════════════ */}
          {tab === "invites" && (
            <>
              <div className="ad-info">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
                </svg>
                <span>
                  صلاحية الدعوة <strong>30 يومًا</strong> · استخدام واحد فقط ·
                  يمكن إلغاؤها في أي وقت قبل قبولها
                </span>
              </div>

              {activeInvites.length > 0 && (
                <div className="ad-section">
                  <div className="ad-section-title">الدعوات النشطة ({activeInvites.length})</div>
                  <div className="ad-list">
                    {activeInvites.map((inv, i) => {
                      const status = getInviteStatus(inv);
                      return (
                        <div key={inv.id} className="ad-card" style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="ad-school-badge ad-school-badge--invite">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </div>
                          <div className="ad-card-info">
                            <div className="ad-card-name">{inv.school?.name ?? "—"}</div>
                            <div className="ad-card-token" dir="ltr">/invite/{inv.token.slice(0, 22)}…</div>
                            <div className="ad-card-meta">
                              أُنشئت {fmtDate(inv.created_at)}
                              {inv.expires_at && <> · تنتهي {fmtDate(inv.expires_at)}</>}
                            </div>
                          </div>
                          <span className="ad-status-badge" style={{ color: status.color, background: status.bg }}>
                            {status.label}
                          </span>
                          <div className="ad-card-actions">
                            <button className="ad-action-btn" onClick={() => copyLink(inv.token)} title="نسخ الرابط">
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
                              className="ad-action-btn ad-action-btn--danger"
                              onClick={() => handleDisableInvite(inv.id)}
                              disabled={disabling === inv.id}
                              title="تعطيل الدعوة"
                            >
                              {disabling === inv.id
                                ? <span className="ad-spin ad-spin--sm" />
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
                <div className="ad-section" style={{ marginTop: 32 }}>
                  <div className="ad-section-title ad-section-title--muted">
                    السجل ({historyInvites.length})
                  </div>
                  <div className="ad-list">
                    {historyInvites.map((inv, i) => {
                      const status = getInviteStatus(inv);
                      return (
                        <div key={inv.id} className="ad-card ad-card--history" style={{ animationDelay: `${i * 30}ms` }}>
                          <div className="ad-school-badge ad-school-badge--invite ad-school-badge--muted">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </div>
                          <div className="ad-card-info">
                            <div className="ad-card-name" style={{ opacity: 0.75 }}>{inv.school?.name ?? "—"}</div>
                            {inv.usedBy && <div className="ad-card-meta">قبلها: {inv.usedBy.full_name}</div>}
                            <div className="ad-card-meta" style={{ opacity: 0.65 }}>
                              {fmtDate(inv.created_at)}
                              {inv.used_at && <> · استُخدمت {fmtDate(inv.used_at)}</>}
                            </div>
                          </div>
                          <span className="ad-status-badge" style={{ color: status.color, background: status.bg }}>
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {invites.length === 0 && (
                <div className="ad-empty">
                  <div className="ad-empty-icon">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <p>لا توجد دعوات بعد</p>
                  {inviteCandidateSchools.length > 0 && (
                    <button
                      className="ad-primary-btn"
                      style={{ marginTop: 12 }}
                      onClick={() => setShowCreateModal(true)}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      إنشاء أول دعوة
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
        <div className="ad-modal-overlay" onClick={() => { setShowCreateModal(false); setSelectedSchool(""); setError(""); }}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h2 className="ad-modal-title">إنشاء دعوة مدير</h2>
              <button
                className="ad-modal-close"
                onClick={() => { setShowCreateModal(false); setSelectedSchool(""); setError(""); }}
                aria-label="إغلاق"
              >×</button>
            </div>
            <p className="ad-modal-desc">
              اختر الجهة التي تريد تعيين مدير لها. سيُرسَل الرابط للشخص المعني.
            </p>
            <div className="ad-modal-field">
              <label className="ad-modal-label">الجهة</label>
              <select
                className="ad-modal-select"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                autoFocus
              >
                <option value="">— اختر الجهة —</option>
                {inviteCandidateSchools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {inviteCandidateSchools.length === 0 && (
                <p className="ad-modal-hint">جميع الجهات لديها مدير أو دعوة نشطة</p>
              )}
            </div>
            {error && <div className="ad-error" style={{ marginTop: 0 }}>{error}</div>}
            <div className="ad-modal-actions">
              <button
                className="ad-modal-cancel"
                onClick={() => { setShowCreateModal(false); setSelectedSchool(""); setError(""); }}
              >إلغاء</button>
              <button
                className="ad-primary-btn"
                onClick={handleCreateInvite}
                disabled={creating || !selectedSchool}
              >
                {creating
                  ? <><span className="ad-spin ad-spin--sm" /> جارٍ الإنشاء...</>
                  : "إنشاء الرابط"}
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
  @keyframes ad-spin    { to { transform: rotate(360deg); } }
  @keyframes ad-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ad-overlay { from { opacity:0; } to { opacity:1; } }
  @keyframes ad-modal   { from { opacity:0; transform:scale(0.96) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }

  :root {
    --gold: #C8A96A; --gold2: #E5B93C;
    --graphite: #0B0B0C; --graphite-soft: #8A8478;
    --bg-card: #FFFDF8; --border: rgba(8,11,12,0.08);
  }

  .ad-page { font-family: 'Cairo', sans-serif; max-width: 980px; }

  .ad-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .ad-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: var(--gold); margin-bottom: 4px; }
  .ad-title { font-size: 26px; font-weight: 900; color: var(--graphite); margin: 0 0 4px; }
  .ad-sub { font-size: 13px; color: var(--graphite-soft); }

  .ad-primary-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 11px;
    background: var(--graphite); color: var(--gold);
    border: 1px solid rgba(200,169,106,0.25);
    font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 800;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: all 0.18s;
  }
  .ad-primary-btn:hover:not(:disabled) { background: #1a1a1e; border-color: rgba(200,169,106,0.5); color: var(--gold2); }
  .ad-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ad-rule { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; }
  .ad-rule-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(200,169,106,0.35), transparent); }
  .ad-rule-diamond { width: 5px; height: 5px; background: rgba(200,169,106,0.6); transform: rotate(45deg); flex-shrink: 0; }

  /* Summary stats */
  .ad-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    margin-bottom: 22px;
  }
  .ad-stat {
    display: flex; align-items: center; gap: 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px 16px;
    transition: all 0.18s;
  }
  .ad-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.05); }
  .ad-stat-icon {
    width: 40px; height: 40px; border-radius: 11px;
    background: rgba(200,169,106,0.08); color: var(--gold);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ad-stat--gold .ad-stat-icon { background: linear-gradient(135deg, #C8A96A, #E5B93C); color: var(--graphite); }
  .ad-stat--invite .ad-stat-icon { background: rgba(45,138,74,0.10); color: #2D8A4A; }
  .ad-stat--muted .ad-stat-icon { background: rgba(139,26,26,0.08); color: #8b1a1a; }
  .ad-stat-n { font-size: 22px; font-weight: 900; color: var(--graphite); line-height: 1; }
  .ad-stat-l { font-size: 11.5px; color: var(--graphite-soft); margin-top: 3px; font-weight: 600; }

  /* Tabs */
  .ad-tabs {
    display: flex; gap: 4px;
    background: rgba(200,169,106,0.07);
    border: 1px solid rgba(200,169,106,0.18);
    border-radius: 13px; padding: 4px;
    margin-bottom: 20px; width: fit-content;
  }
  .ad-tab {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 18px; border-radius: 10px;
    background: transparent; border: 1px solid transparent;
    font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 700;
    color: var(--graphite-soft); cursor: pointer;
    transition: all 0.18s;
  }
  .ad-tab:hover { color: var(--graphite); }
  .ad-tab--on {
    background: var(--graphite); color: var(--gold);
    border-color: rgba(200,169,106,0.3);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .ad-tab-count {
    font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 100px;
    background: rgba(8,11,12,0.06); color: var(--graphite-soft);
  }
  .ad-tab--on .ad-tab-count { background: rgba(200,169,106,0.18); color: var(--gold); }
  .ad-tab-count--accent { background: rgba(45,138,74,0.15); color: #2D8A4A; }
  .ad-tab--on .ad-tab-count--accent { background: rgba(200,169,106,0.18); color: var(--gold); }

  /* Info bar */
  .ad-info {
    display: flex; align-items: center; gap: 8px;
    background: rgba(200,169,106,0.07); border: 1px solid rgba(200,169,106,0.18);
    color: #6B4E18; font-size: 12.5px; padding: 10px 14px; border-radius: 10px;
    font-weight: 600; margin-bottom: 20px;
  }

  /* Error */
  .ad-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.18);
    color: #8b1a1a; font-size: 13px; padding: 10px 14px; border-radius: 9px;
    font-weight: 600; margin-bottom: 16px;
  }

  /* Flash card */
  .ad-flash {
    background: rgba(45,138,74,0.06); border: 1.5px solid rgba(45,138,74,0.22);
    border-radius: 14px; padding: 16px 18px; margin-bottom: 22px;
    animation: ad-fadein 0.35s ease;
  }
  .ad-flash-head { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; color: #2D8A4A; margin-bottom: 6px; }
  .ad-flash-close { margin-inline-start: auto; background: none; border: none; font-size: 20px; cursor: pointer; color: #2D8A4A; padding: 0 4px; line-height: 1; }
  .ad-flash-school { font-size: 14px; font-weight: 800; color: var(--graphite); margin-bottom: 6px; }
  .ad-flash-link { font-size: 12px; color: var(--graphite-soft); font-family: monospace; margin-bottom: 12px; direction: ltr; }

  .ad-loading { display: flex; align-items: center; gap: 10px; color: var(--graphite-soft); font-size: 14px; padding: 30px 0; }
  .ad-spin { display: inline-block; width: 18px; height: 18px; border: 2.5px solid rgba(200,169,106,0.2); border-top-color: var(--gold); border-radius: 50%; animation: ad-spin 0.7s linear infinite; flex-shrink: 0; }
  .ad-spin--sm { width: 12px; height: 12px; border-width: 2px; }

  .ad-section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: var(--graphite); margin-bottom: 12px; }
  .ad-section-title--muted { color: var(--graphite-soft); }

  .ad-list { display: flex; flex-direction: column; gap: 10px; }

  .ad-card {
    display: flex; align-items: center; gap: 14px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    padding: 14px 16px;
    box-shadow: 0 1px 4px rgba(8,11,12,0.04);
    animation: ad-fadein 0.35s ease both;
    transition: all 0.18s;
  }
  .ad-card:hover { border-color: rgba(200,169,106,0.25); transform: translateY(-1px); }
  .ad-card--inactive { opacity: 0.75; background: rgba(139,26,26,0.02); border-color: rgba(139,26,26,0.10); }
  .ad-card--no-admin { opacity: 0.85; }
  .ad-card--history { opacity: 0.80; }

  .ad-school-badge {
    width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #C8A96A, #E5B93C);
    font-size: 20px; font-weight: 900; color: var(--graphite);
  }
  .ad-school-badge--muted { background: rgba(200,169,106,0.12); color: var(--gold); border: 1.5px dashed rgba(200,169,106,0.35); }
  .ad-school-badge--invite { background: rgba(45,138,74,0.10); color: #2D8A4A; }
  .ad-school-badge--invite.ad-school-badge--muted { background: rgba(138,123,96,0.08); color: var(--graphite-soft); border: 1.5px dashed rgba(138,123,96,0.25); }

  .ad-card-info { flex: 1; min-width: 0; }
  .ad-card-name { font-size: 14px; font-weight: 800; color: var(--graphite); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ad-card-school { font-size: 12px; color: var(--gold); font-weight: 600; margin-top: 1px; }
  .ad-card-school--muted { color: var(--graphite-soft); }
  .ad-card-token { font-size: 11.5px; color: var(--graphite-soft); font-family: monospace; margin-top: 3px; }
  .ad-card-email { font-size: 11.5px; color: var(--graphite-soft); margin-top: 2px; }
  .ad-card-meta { font-size: 11px; color: var(--graphite-soft); margin-top: 3px; opacity: 0.85; }

  .ad-status-badge {
    flex-shrink: 0; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.05em;
  }
  .ad-status-badge--active   { background: rgba(45,138,74,0.10);  color: #2D8A4A; border: 1px solid rgba(45,138,74,0.20); }
  .ad-status-badge--inactive { background: rgba(139,26,26,0.08);  color: #8b1a1a; border: 1px solid rgba(139,26,26,0.18); }

  .ad-toggle-btn {
    flex-shrink: 0; display: flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 9px;
    font-size: 12px; font-weight: 800; cursor: pointer;
    font-family: 'Cairo', sans-serif; border: 1px solid;
    transition: all 0.18s;
  }
  .ad-toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ad-toggle-btn--deactivate {
    background: rgba(139,26,26,0.07); color: #8b1a1a;
    border-color: rgba(139,26,26,0.22);
  }
  .ad-toggle-btn--deactivate:hover:not(:disabled) {
    background: rgba(139,26,26,0.14); border-color: rgba(139,26,26,0.38);
  }
  .ad-toggle-btn--activate {
    background: rgba(45,138,74,0.08); color: #2D8A4A;
    border-color: rgba(45,138,74,0.22);
  }
  .ad-toggle-btn--activate:hover:not(:disabled) {
    background: rgba(45,138,74,0.15); border-color: rgba(45,138,74,0.38);
  }

  .ad-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .ad-action-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 9px;
    background: rgba(200,169,106,0.08); border: 1px solid rgba(200,169,106,0.18);
    color: var(--graphite-soft); cursor: pointer; transition: all 0.18s; flex-shrink: 0;
  }
  .ad-action-btn:hover:not(:disabled) { background: rgba(200,169,106,0.18); color: var(--graphite); border-color: rgba(200,169,106,0.35); }
  .ad-action-btn--danger { background: rgba(139,26,26,0.06); border-color: rgba(139,26,26,0.18); color: #8b1a1a; }
  .ad-action-btn--danger:hover:not(:disabled) { background: rgba(139,26,26,0.14); }
  .ad-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .ad-empty {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 60px 0; color: var(--graphite-soft); text-align: center;
  }
  .ad-empty-icon {
    width: 64px; height: 64px; border-radius: 20px;
    background: rgba(200,169,106,0.08);
    display: flex; align-items: center; justify-content: center;
    color: rgba(200,169,106,0.5);
  }

  /* Modal */
  .ad-modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(8,11,12,0.55); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    animation: ad-overlay 0.22s ease;
  }
  .ad-modal {
    background: #FFFDF8; border-radius: 20px; padding: 28px;
    width: min(480px, calc(100vw - 32px));
    box-shadow: 0 24px 64px rgba(8,11,12,0.25);
    animation: ad-modal 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }
  .ad-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ad-modal-title { font-size: 19px; font-weight: 900; color: var(--graphite); margin: 0; }
  .ad-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--graphite-soft); line-height: 1; padding: 0; }
  .ad-modal-desc { font-size: 13px; color: var(--graphite-soft); margin: 0 0 20px; line-height: 1.6; }
  .ad-modal-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 20px; }
  .ad-modal-label { font-size: 12px; font-weight: 700; color: #4a3f2e; text-transform: uppercase; letter-spacing: 0.06em; }
  .ad-modal-select {
    padding: 11px 14px; border-radius: 10px;
    border: 1px solid rgba(8,11,12,0.12); background: #fff;
    font-family: 'Cairo', sans-serif; font-size: 14px; color: var(--graphite);
    outline: none; cursor: pointer; transition: border-color 0.18s;
  }
  .ad-modal-select:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200,169,106,0.12); }
  .ad-modal-hint { font-size: 11.5px; color: var(--graphite-soft); margin-top: 4px; font-style: italic; }
  .ad-modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 24px; }
  .ad-modal-cancel {
    padding: 10px 22px; border-radius: 10px;
    background: none; border: 1px solid rgba(8,11,12,0.12);
    font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer;
    color: var(--graphite-soft); transition: all 0.18s;
  }
  .ad-modal-cancel:hover { background: rgba(8,11,12,0.04); }

  @media (max-width: 760px) {
    .ad-stats { grid-template-columns: repeat(2, 1fr); }
    .ad-header { flex-direction: column; align-items: stretch; }
    .ad-primary-btn { justify-content: center; }
    .ad-card { flex-wrap: wrap; }
    .ad-card-info { flex: 1 1 calc(100% - 60px); min-width: 0; }
    .ad-status-badge { order: -1; }
  }
  @media (max-width: 460px) {
    .ad-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
    .ad-stat { padding: 12px; gap: 10px; }
    .ad-stat-icon { width: 36px; height: 36px; }
    .ad-stat-n { font-size: 18px; }
    .ad-stat-l { font-size: 10.5px; }
    .ad-title { font-size: 22px; }
    .ad-tab { padding: 8px 14px; font-size: 12.5px; }
  }
`;
