"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  _count: { members: number };
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
  members: Member[];
};

type GroupAnnouncement = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { id: string; full_name: string; role: string };
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
    title: "مجموعات المعلمين",
    sub: "نظِّم المعلمين المقبولين في مجموعات عمل وتدريب ومجتمع خاصة.",
    create: "+ مجموعة جديدة",
    empty: "لا توجد مجموعات بعد. أنشئ أول مجموعة لتنظيم معلميك.",
    members: "أعضاء",
    pickOne: "اختر مجموعة لعرض أعضائها",
    rename: "تعديل الاسم والوصف",
    name: "اسم المجموعة",
    desc: "الوصف",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    assessments: "نماذج القياس",
    deleteGroup: "حذف المجموعة",
    confirmDelete: "هل تريد حذف هذه المجموعة؟ سيتم إلغاء عضوية كل المعلمين.",
    addMembers: "+ إضافة أعضاء",
    searchPh: "ابحث بالاسم أو البريد…",
    groupSearchPh: "ابحث في المجموعات…",
    memberSearchPh: "ابحث في أعضاء المجموعة…",
    noGroupResults: "لا توجد مجموعات مطابقة.",
    noMemberResults: "لا يوجد أعضاء مطابقون للبحث.",
    noEligible: "لا يوجد معلمون متاحون للإضافة.",
    add: "إضافة",
    remove: "إزالة",
    confirmRemove: "إزالة هذا المعلم من المجموعة؟",
    cancel: "إلغاء",
    yearsExp: "سنوات الخبرة",
    spec: "التخصص",
    location: "الموقع",
    close: "إغلاق",
    newGroupTitle: "إنشاء مجموعة جديدة",
    namePh: "مثال: مجموعة معلمي القرآن",
    descPh: "وصف اختياري للمجموعة وأهدافها…",
    creating: "جارٍ الإنشاء…",
  },
  sq: {
    title: "Grupet e mësuesve",
    sub: "Organizo mësuesit e pranuar në grupe pune, trajnimi dhe komunitete private.",
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
    noEligible: "Nuk ka mësues të disponueshëm.",
    add: "Shto",
    remove: "Hiq",
    confirmRemove: "Të hiqet ky mësues nga grupi?",
    cancel: "Anulo",
    yearsExp: "Vitet e përvojës",
    spec: "Specializimi",
    location: "Vendndodhja",
    close: "Mbyll",
    newGroupTitle: "Krijo grup të ri",
    namePh: "Shembull: Mësuesit e Kuranit",
    descPh: "Përshkrim opsional…",
    creating: "Po krijohet…",
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
  };
  const viewOnly = useViewOnly();
  const confirm = useConfirm();

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

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  // add-members dialog
  const [addOpen, setAddOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // edit-meta state
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch("/api/school-admin/teacher-groups", { cache: "no-store" });
      const d = await r.json();
      setGroups(d?.groups ?? []);
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
      setEditForm({ name: d?.group?.name ?? "", description: d?.group?.description ?? "" });
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
      setCreateForm({ name: "", description: "" });
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
        body: JSON.stringify({ name: editForm.name, description: editForm.description }),
      });
      if (r.ok) {
        await Promise.all([loadList(), loadDetail(selectedId)]);
      }
    } finally { setSavingMeta(false); }
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

  async function postAnnouncement() {
    if (!selectedId || !newAnnouncement.trim()) return;
    setPostingAnnouncement(true);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${selectedId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newAnnouncement }),
      });
      if (!r.ok) return;
      const d = await r.json();
      setAnnouncements((current) => [d.announcement, ...current]);
      setNewAnnouncement("");
    } finally { setPostingAnnouncement(false); }
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
        <div>
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
              <strong>{L === "ar" ? "رؤية المجموعات" : "Shikimi i grupeve"}</strong>
              <span>{openVisibility ? (L === "ar" ? "مفتوحة لكل المعلمين" : "E hapur për mësuesit") : (L === "ar" ? "خاصة بكل مجموعة" : "Private për çdo grup")}</span>
            </button>
          )}
          {!viewOnly && (
            <button className="tg-new" onClick={() => setCreateOpen(true)} data-write="true">
              {T.create}
            </button>
          )}
        </div>
      </header>

      <div className="tg-layout">
        <aside className="tg-side">
          {groups.length > 0 && (
            <input
              className="tg-side-search"
              value={groupQuery}
              onChange={(e) => setGroupQuery(e.target.value)}
              placeholder={T.groupSearchPh}
            />
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
                    <span className="tg-list-name">{g.name}</span>
                    <span className="tg-list-meta">
                      {g._count.members} {T.members}
                    </span>
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
                <input
                  className="tg-meta-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={viewOnly}
                  data-write={viewOnly ? undefined : "true"}
                />
                <textarea
                  className="tg-meta-desc"
                  placeholder={T.descPh}
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  disabled={viewOnly}
                  data-write={viewOnly ? undefined : "true"}
                />
                <div className="tg-meta-actions">
                  {!viewOnly && (
                    <>
                      <button className="tg-btn" onClick={saveMeta} disabled={savingMeta || !editForm.name.trim()} data-write="true">
                        {savingMeta ? T.saving : T.save}
                      </button>
                      <button className="tg-btn tg-btn-danger" onClick={deleteGroup} data-write="true">
                        {T.deleteGroup}
                      </button>
                    </>
                  )}
                  <Link className="tg-btn" href={`/school-admin/teacher-groups/${detail.id}/assessments`}>
                    {T.assessments} →
                  </Link>
                  <span className="tg-spacer" />
                  {!viewOnly && (
                    <button className="tg-btn tg-btn-primary" onClick={() => { setAddOpen(true); setPicked(new Set()); setSearchQ(""); }} data-write="true">
                      {T.addMembers}
                    </button>
                  )}
                </div>
              </div>

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
                    <div className="tg-member-main">
                      <div className="tg-member-name">{m.teacher.profile.full_name}</div>
                      {m.teacher.profile.email && <div className="tg-member-email">{m.teacher.profile.email}</div>}
                      {m.teacher.application && (
                        <div className="tg-member-meta">
                          {m.teacher.application.specialization && (
                            <span>{T.spec}: <strong>{m.teacher.application.specialization}</strong></span>
                          )}
                          {(m.teacher.application.country || m.teacher.application.city) && (
                            <span>{T.location}: <strong>{m.teacher.application.country}{m.teacher.application.city ? " · " + m.teacher.application.city : ""}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                    {!viewOnly && (
                      <button className="tg-mini-x" onClick={() => removeMember(m.teacher.id)} data-write="true" title={T.remove}>×</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="tg-ann-section">
                <h3 className="tg-ann-title">{A.announcements}</h3>
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
                    <button
                      onClick={postAnnouncement}
                      disabled={postingAnnouncement || !newAnnouncement.trim()}
                      data-write="true"
                    >
                      {postingAnnouncement ? A.posting : A.post}
                    </button>
                  </div>
                )}
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
                          <p>{announcement.content}</p>
                        </div>
                        {!viewOnly && (
                          <button
                            className="tg-ann-delete"
                            onClick={() => deleteAnnouncement(announcement.id)}
                            disabled={deletingAnnouncementId === announcement.id}
                            title={A.delete}
                            data-write="true"
                          >
                            x
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
        .tg-title { font-size: 24px; font-weight: 900; color: #1B1810; margin: 0 0 6px; }
        .tg-sub { font-size: 13.5px; color: #5E5A52; max-width: 680px; line-height: 1.85; margin: 0; }
        .tg-hero-actions { display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap; }
        .tg-visibility { display: flex; flex-direction: column; gap: 2px; text-align: start; min-width: 220px; border: 1.5px solid rgba(184,160,130,0.32); border-radius: 12px; background: #FBF8F1; color: #4A0E1C; padding: 9px 13px; font-family: inherit; cursor: pointer; }
        .tg-visibility strong { font-size: 12.5px; font-weight: 900; }
        .tg-visibility span { font-size: 11.5px; color: #7B6B52; font-weight: 800; }
        .tg-visibility.on { background: rgba(107,30,45,0.08); border-color: rgba(107,30,45,0.24); }
        .tg-visibility:disabled { opacity: 0.6; cursor: progress; }
        .tg-new { background: linear-gradient(180deg,#1E2329,#11151A); color: #E5B93C; border: none; padding: 10px 18px; border-radius: 11px; font-family: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; }

        .tg-layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
        @media (max-width: 880px) { .tg-layout { grid-template-columns: 1fr; } }

        .tg-side { background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; padding: 10px; min-height: 200px; }
        .tg-side-search, .tg-member-filter input { width: 100%; border: 1.5px solid rgba(194,160,89,0.26); border-radius: 10px; background: #FFF; padding: 9px 12px; font: inherit; font-size: 13px; outline: none; }
        .tg-side-search { margin-bottom: 10px; }
        .tg-side-search:focus, .tg-member-filter input:focus { border-color: #B89B5E; box-shadow: 0 0 0 3px rgba(194,160,89,0.10); }
        .tg-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .tg-list-item { width: 100%; text-align: start; background: transparent; border: 1px solid transparent; padding: 11px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; gap: 4px; transition: background .15s; }
        .tg-list-item:hover { background: rgba(194,160,89,0.10); }
        .tg-list-item.active { background: linear-gradient(165deg,#FCF6E6,#F4EBD3); border-color: #B89B5E; }
        .tg-list-name { font-size: 13.5px; font-weight: 800; color: #1B1810; }
        .tg-list-meta { font-size: 11.5px; color: #8B6915; font-weight: 700; }

        .tg-detail { background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; padding: 18px; min-height: 320px; }
        .tg-detail-empty { padding: 60px 20px; text-align: center; color: #8A8478; font-weight: 700; }
        .tg-detail-head { padding-bottom: 14px; border-bottom: 1px solid rgba(8,11,12,0.07); margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
        .tg-meta-name { font-family: inherit; font-size: 19px; font-weight: 900; color: #1B1810; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 8px; outline: none; }
        .tg-meta-name:focus { border-color: rgba(194,160,89,0.5); background: #FFF; }
        .tg-meta-desc { font-family: inherit; font-size: 13px; color: #5E4A20; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 8px; outline: none; resize: vertical; line-height: 1.7; }
        .tg-meta-desc:focus { border-color: rgba(194,160,89,0.5); background: #FFF; }
        .tg-meta-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
        .tg-spacer { flex: 1; }
        .tg-btn { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #5E4A20; padding: 7px 13px; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }
        .tg-btn-primary { background: linear-gradient(180deg,#1E2329,#11151A); color: #E5B93C; border-color: transparent; }
        .tg-btn-danger  { background: linear-gradient(180deg,#A33333,#7A1E1E); color: #FFF; border-color: transparent; }

        .tg-members { display: flex; flex-direction: column; gap: 8px; }
        .tg-member-filter { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .tg-member-filter input { flex: 1; min-width: 0; }
        .tg-member-filter span { color: #8B6915; font-size: 12px; font-weight: 900; white-space: nowrap; }
        .tg-members-empty { padding: 30px; text-align: center; color: #BFB6A8; font-weight: 700; }
        .tg-member { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid rgba(194,160,89,0.25); border-radius: 11px; background: linear-gradient(165deg,#FFFFFF,#FFFDF8); }
        .tg-member-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .tg-member-name { font-size: 14px; font-weight: 800; color: #1B1810; }
        .tg-member-email { font-size: 11.5px; color: #8B6915; }
        .tg-member-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #5E4A20; margin-top: 2px; }
        .tg-member-meta strong { font-weight: 800; color: #1B1810; }
        .tg-mini-x { background: rgba(139,26,26,0.10); border: 1px solid rgba(139,26,26,0.32); color: #7A1E1E; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; font-weight: 800; flex-shrink: 0; }
        .tg-mini-x:hover { background: rgba(139,26,26,0.18); }

        .tg-ann-section { margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(8,11,12,0.07); }
        .tg-ann-title { margin: 0 0 10px; font-size: 15px; font-weight: 900; color: #6B4F1E; }
        .tg-ann-composer { display: flex; flex-direction: column; gap: 10px; padding: 12px; margin-bottom: 12px; border-radius: 12px; background: rgba(194,160,89,0.05); border: 1px solid rgba(194,160,89,0.16); }
        .tg-ann-composer textarea { width: 100%; border: 1.5px solid rgba(194,160,89,0.24); border-radius: 10px; background: #FFF; padding: 10px 12px; font-family: inherit; font-size: 13px; line-height: 1.7; resize: vertical; outline: none; }
        .tg-ann-composer textarea:focus { border-color: #B89B5E; box-shadow: 0 0 0 3px rgba(194,160,89,0.08); }
        .tg-ann-composer button { align-self: flex-end; border: 0; border-radius: 10px; padding: 8px 16px; background: #0B0B0C; color: #E5B93C; font-family: inherit; font-size: 12.5px; font-weight: 900; cursor: pointer; }
        .tg-ann-composer button:disabled { opacity: 0.45; cursor: not-allowed; }
        .tg-ann-empty { min-height: 110px; display: flex; align-items: center; justify-content: center; text-align: center; border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; color: #8A8478; font-size: 13px; font-weight: 800; padding: 22px; background: rgba(194,160,89,0.04); }
        .tg-ann-list { display: flex; flex-direction: column; gap: 8px; }
        .tg-ann { display: flex; gap: 10px; padding: 12px; border: 1px solid rgba(194,160,89,0.18); border-radius: 12px; background: #FFF; }
        .tg-ann-avatar { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #0B0B0C; color: #C8A96A; font-size: 10px; font-weight: 900; }
        .tg-ann-body { flex: 1; min-width: 0; }
        .tg-ann-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
        .tg-ann-meta strong { font-size: 13px; color: #1B1810; }
        .tg-ann-meta span { font-size: 11.5px; color: #8A7B60; font-weight: 800; }
        .tg-ann p { margin: 0; color: #2E2210; font-size: 13px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
        .tg-ann-delete { width: 28px; height: 28px; border-radius: 9px; border: 1px solid rgba(139,26,26,0.22); background: rgba(139,26,26,0.08); color: #7A1E1E; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-weight: 900; }
        .tg-ann-delete:disabled { opacity: 0.45; cursor: not-allowed; }

        .tg-empty { padding: 30px 16px; text-align: center; color: #8A8478; font-weight: 700; font-size: 13px; line-height: 1.7; }

        .tg-overlay { position: fixed; inset: 0; background: rgba(8,11,12,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(4px); }
        .tg-dialog { background: #FFFDF8; border-radius: 16px; padding: 22px; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .tg-dialog-wide { max-width: 560px; }
        .tg-dlg-title { font-size: 17px; font-weight: 900; color: #1B1810; margin: 0 0 14px; }
        .tg-lbl { display: block; font-size: 12px; font-weight: 800; color: #6B4F1E; margin: 10px 0 4px; }
        .tg-input { width: 100%; padding: 10px 13px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px; font-family: inherit; font-size: 13.5px; background: #FFF; outline: none; resize: vertical; }
        .tg-input:focus { border-color: #B89B5E; }
        .tg-dlg-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }

        .tg-eligible { margin-top: 10px; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .tg-elig { width: 100%; text-align: start; background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 10px; padding: 10px 14px; font-family: inherit; cursor: pointer; position: relative; transition: all .15s; }
        .tg-elig:hover { border-color: #B89B5E; }
        .tg-elig.on { background: linear-gradient(165deg,#FCF6E6,#F4EBD3); border-color: #B89B5E; }
        .tg-elig-name { font-size: 13.5px; font-weight: 800; color: #1B1810; }
        .tg-elig-meta { font-size: 11.5px; color: #5E4A20; display: flex; gap: 8px; margin-top: 3px; flex-wrap: wrap; }
        .tg-elig-tick { position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; border-radius: 50%; background: #B89B5E; color: #1E1605; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12.5px; }
        .tg-elig:not(.on) .tg-elig-tick { background: rgba(194,160,89,0.18); color: #8B6915; }
        .tg-mini-load { padding: 20px; text-align: center; color: #8B6915; font-weight: 700; }
      `}</style>
    </div>
  );
}
