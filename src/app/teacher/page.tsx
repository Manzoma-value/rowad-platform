"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";
import { useLang } from "@/lib/language-context";

type Lang = "ar" | "sq" | "en";

type Announcement = {
  id: string;
  content: string;
  created_at: string;
  teacher: { profile: { full_name: string } };
};

type ClassItem = {
  id: string;
  name: string;
  students: { id: string; profile: { full_name: string } }[];
};

type DashboardData = {
  totals: {
    classes: number;
    students: number;
    groups: number;
    lessons: number;
    quizzes: number;
    pending_review: number;
    announcements: number;
  };
  groups: {
    id: string;
    name: string;
    description: string | null;
    updated_at: string;
    joined_at: string;
    member_count: number;
    announcement_count: number;
    assessment_count: number;
  }[];
  group_announcements: {
    id: string;
    content: string;
    created_at: string;
    group: { id: string; name: string };
    author: { full_name: string; role: string; avatar_url: string | null };
  }[];
  community_posts: {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    author: { full_name: string; role: string; avatar_url: string | null };
    _count: { replies: number; reactions: number };
  }[];
};

type TeacherData = {
  profile: { full_name: string };
  school: { id: string; name: string; name_alt?: string | null; language: string };
  classes: ClassItem[];
  dashboard?: DashboardData;
};

const STR = {
  ar: {
    welcome: "مرحباً بك",
    subtitle: "مركزك اليومي لإدارة الفصول، المجتمع، المجموعات، والمحتوى.",
    command: "لوحة قيادة المعلم",
    classes: "الفصول",
    students: "الطلاب",
    groups: "المجموعات",
    content: "المحتوى",
    pending: "بانتظار المراجعة",
    announcements: "الإعلانات",
    quickActions: "اختصارات سريعة",
    openCommunity: "فتح المجتمع",
    openGroups: "مجموعات المعلمين",
    createLesson: "إنشاء درس",
    createQuiz: "إنشاء اختبار",
    viewReports: "تقارير الطلاب",
    classCommand: "مركز الفصول",
    selectedClass: "الفصل المحدد",
    classStudents: "طلاب الفصل",
    noStudents: "لا يوجد طلاب في هذا الفصل بعد",
    classAnnouncements: "إعلانات الفصل",
    newAnnouncement: "إعلان جديد",
    announcementPlaceholder: "اكتب إعلاناً واضحاً للطلاب...",
    publish: "نشر الإعلان",
    posting: "جار النشر...",
    chars: "حرف",
    delete: "حذف",
    deleteConfirm: "حذف هذا الإعلان؟",
    noAnnouncements: "لا توجد إعلانات لهذا الفصل بعد",
    groupsPulse: "نبض المجموعات",
    noGroups: "لم تتم إضافتك إلى أي مجموعة بعد",
    latestGroupPosts: "آخر إعلانات المجموعات",
    noGroupUpdates: "لا توجد تحديثات جديدة في المجموعات",
    communityPulse: "نبض المجتمع",
    noCommunity: "لا توجد رسائل حديثة في المجتمع",
    imageOnly: "صورة",
    replies: "ردود",
    reactions: "تفاعلات",
    members: "أعضاء",
    assessments: "تقييمات",
    noClassesTitle: "لم يتم تعيينك في أي فصل بعد",
    noClassesText: "تواصل مع مدير المدرسة لإضافتك إلى الفصول.",
  },
  sq: {
    welcome: "Mirësevini",
    subtitle: "Qendra juaj ditore për klasat, komunitetin, grupet dhe përmbajtjen.",
    command: "Paneli i mësuesit",
    classes: "Klasat",
    students: "Nxënësit",
    groups: "Grupet",
    content: "Përmbajtja",
    pending: "Në shqyrtim",
    announcements: "Njoftimet",
    quickActions: "Veprime të shpejta",
    openCommunity: "Hap komunitetin",
    openGroups: "Grupet e mësuesve",
    createLesson: "Krijo mësim",
    createQuiz: "Krijo test",
    viewReports: "Raportet e nxënësve",
    classCommand: "Qendra e klasave",
    selectedClass: "Klasa e zgjedhur",
    classStudents: "Nxënësit e klasës",
    noStudents: "Nuk ka nxënës në këtë klasë ende",
    classAnnouncements: "Njoftimet e klasës",
    newAnnouncement: "Njoftim i ri",
    announcementPlaceholder: "Shkruaj një njoftim të qartë për nxënësit...",
    publish: "Posto njoftimin",
    posting: "Duke postuar...",
    chars: "shkronja",
    delete: "Fshij",
    deleteConfirm: "Fshi këtë njoftim?",
    noAnnouncements: "Nuk ka njoftime për këtë klasë ende",
    groupsPulse: "Pulsi i grupeve",
    noGroups: "Nuk jeni shtuar në asnjë grup ende",
    latestGroupPosts: "Njoftimet e fundit në grupe",
    noGroupUpdates: "Nuk ka përditësime të reja në grupe",
    communityPulse: "Pulsi i komunitetit",
    noCommunity: "Nuk ka mesazhe të fundit në komunitet",
    imageOnly: "Foto",
    replies: "përgjigje",
    reactions: "reagime",
    members: "anëtarë",
    assessments: "vlerësime",
    noClassesTitle: "Nuk jeni caktuar në asnjë klasë ende",
    noClassesText: "Kontaktoni drejtorin e shkollës për t'u shtuar në klasa.",
  },
} as const;

function pickLang(lang: Lang) {
  return lang === "ar" ? "ar" : "sq";
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
}

function formatDate(value: string, lang: "ar" | "sq") {
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-SA" : "sq-AL", { month: "short", day: "numeric" });
}

function Skeleton() {
  return (
    <div className="td-page" dir="rtl">
      <div className="td-shell">
        <div className="td-skel td-skel-hero" />
        <div className="td-skel-grid">
          <div className="td-skel td-skel-card" />
          <div className="td-skel td-skel-card" />
          <div className="td-skel td-skel-card" />
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

export default function TeacherPage() {
  const { lang } = useLang();
  const L = pickLang(lang);
  const tr = STR[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const confirm = useConfirm();

  const [data, setData] = useState<TeacherData | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [loading, setLoading] = useState(true);
  const [annLoading, setAnnLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async (classId: string) => {
    setAnnLoading(true);
    const rows = await cachedFetch<Announcement[]>(`/api/teacher/announcements?classId=${classId}`, 30_000);
    setAnnouncements(Array.isArray(rows) ? rows : []);
    setAnnLoading(false);
  }, []);

  const handleSelectClass = useCallback(async (cls: ClassItem) => {
    setSelectedClass(cls);
    await fetchAnnouncements(cls.id);
  }, [fetchAnnouncements]);

  useEffect(() => {
    cachedFetch<TeacherData>("/api/teacher", 60_000).then((payload) => {
      setData(payload);
      const firstClass = payload.classes?.[0] ?? null;
      setSelectedClass(firstClass);
      if (firstClass) void fetchAnnouncements(firstClass.id);
      setLoading(false);
    });
  }, [fetchAnnouncements]);

  const totals = data?.dashboard?.totals;
  const totalStudents = totals?.students ?? data?.classes.reduce((sum, cls) => sum + cls.students.length, 0) ?? 0;
  const totalContent = (totals?.lessons ?? 0) + (totals?.quizzes ?? 0);

  const topClasses = useMemo(
    () => [...(data?.classes ?? [])].sort((a, b) => b.students.length - a.students.length).slice(0, 4),
    [data?.classes],
  );

  const handlePost = async () => {
    if (!newAnnouncement.trim() || !selectedClass) return;
    setPosting(true);
    const res = await fetch("/api/teacher/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass.id, content: newAnnouncement.trim() }),
    });
    if (res.ok) {
      setNewAnnouncement("");
      invalidateCache(`/api/teacher/announcements?classId=${selectedClass.id}`);
      await fetchAnnouncements(selectedClass.id);
    }
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: tr.deleteConfirm });
    if (!ok || !selectedClass) return;
    setDeletingId(id);
    const res = await fetch(`/api/teacher/announcements?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      invalidateCache(`/api/teacher/announcements?classId=${selectedClass.id}`);
      await fetchAnnouncements(selectedClass.id);
    }
    setDeletingId(null);
  };

  if (loading || !data) return <Skeleton />;

  return (
    <div className="td-page" dir={dir}>
      <div className="td-glow td-glow-a" />
      <div className="td-glow td-glow-b" />
      <main className="td-shell">
        <section className="td-hero">
          <div className="td-hero-copy">
            <span className="td-kicker">{tr.command}</span>
            <h1>{tr.welcome}, {data.profile.full_name}</h1>
            <p>{tr.subtitle}</p>
            <div className="td-actions">
              <Link href="/teacher/hub" className="td-action primary">{tr.openCommunity}</Link>
              <Link href="/teacher/groups" className="td-action">{tr.openGroups}</Link>
              <Link href="/teacher/lessons" className="td-action">{tr.createLesson}</Link>
            </div>
          </div>
          <div className="td-orbit" aria-hidden="true">
            <div className="td-orbit-ring" />
            <div className="td-orbit-core">{initials(data.profile.full_name)}</div>
            <span className="td-orbit-chip c1">{tr.classes}</span>
            <span className="td-orbit-chip c2">{tr.groups}</span>
            <span className="td-orbit-chip c3">{tr.communityPulse}</span>
          </div>
        </section>

        <section className="td-stats">
          <StatCard label={tr.classes} value={data.classes.length} hint={tr.classCommand} />
          <StatCard label={tr.students} value={totalStudents} hint={tr.classStudents} />
          <StatCard label={tr.groups} value={totals?.groups ?? 0} hint={tr.groupsPulse} />
          <StatCard label={tr.content} value={totalContent} hint={`${totals?.pending_review ?? 0} ${tr.pending}`} />
        </section>

        {!data.classes.length ? (
          <section className="td-empty">
            <div className="td-empty-icon">!</div>
            <h2>{tr.noClassesTitle}</h2>
            <p>{tr.noClassesText}</p>
          </section>
        ) : (
          <section className="td-grid">
            <aside className="td-panel td-classes-panel">
              <div className="td-panel-head">
                <div>
                  <span className="td-section-label">{tr.classCommand}</span>
                  <h2>{tr.selectedClass}</h2>
                </div>
                <Link href="/teacher/classes" className="td-mini-link">{tr.viewReports}</Link>
              </div>

              <div className="td-class-list">
                {data.classes.map((cls) => (
                  <button key={cls.id} className={`td-class-row ${selectedClass?.id === cls.id ? "active" : ""}`} onClick={() => void handleSelectClass(cls)}>
                    <span className="td-class-mark">{cls.name.slice(0, 2)}</span>
                    <span>
                      <strong>{cls.name}</strong>
                      <small>{cls.students.length} {tr.students}</small>
                    </span>
                    <span className="td-class-arrow">›</span>
                  </button>
                ))}
              </div>

              <div className="td-roster">
                <div className="td-roster-head">
                  <span>{tr.classStudents}</span>
                  <strong>{selectedClass?.students.length ?? 0}</strong>
                </div>
                {(selectedClass?.students.length ?? 0) === 0 ? (
                  <p className="td-muted">{tr.noStudents}</p>
                ) : (
                  <div className="td-student-grid">
                    {selectedClass?.students.slice(0, 12).map((student) => (
                      <div key={student.id} className="td-student">
                        <span>{student.profile.full_name.charAt(0)}</span>
                        <p>{student.profile.full_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <section className="td-panel td-ann-panel">
              <div className="td-panel-head">
                <div>
                  <span className="td-section-label">{tr.classAnnouncements}</span>
                  <h2>{selectedClass?.name}</h2>
                </div>
                <span className="td-soft-pill">{totals?.announcements ?? announcements.length} {tr.announcements}</span>
              </div>

              <div className="td-compose">
                <div className="td-compose-top">
                  <span className="td-avatar">{initials(data.profile.full_name)}</span>
                  <strong>{tr.newAnnouncement}</strong>
                </div>
                <textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder={tr.announcementPlaceholder}
                  rows={3}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      void handlePost();
                    }
                  }}
                />
                <div className="td-compose-foot">
                  <span>{newAnnouncement.length} {tr.chars}</span>
                  <button onClick={() => void handlePost()} disabled={posting || !newAnnouncement.trim()}>{posting ? tr.posting : tr.publish}</button>
                </div>
              </div>

              <div className="td-ann-list">
                {annLoading ? (
                  [1, 2, 3].map((n) => <div key={n} className="td-skel td-skel-ann" />)
                ) : announcements.length === 0 ? (
                  <div className="td-empty-mini">{tr.noAnnouncements}</div>
                ) : (
                  announcements.map((item) => (
                    <article key={item.id} className={`td-ann ${deletingId === item.id ? "muting" : ""}`}>
                      <div className="td-ann-main">
                        <div className="td-ann-meta">
                          <span className="td-avatar sm">{initials(item.teacher.profile.full_name)}</span>
                          <strong>{item.teacher.profile.full_name}</strong>
                          <small>{formatDate(item.created_at, L)}</small>
                        </div>
                        <p>{item.content}</p>
                      </div>
                      <button onClick={() => void handleDelete(item.id)} disabled={deletingId === item.id}>{tr.delete}</button>
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="td-side-stack">
              <section className="td-panel">
                <div className="td-panel-head compact">
                  <div>
                    <span className="td-section-label">{tr.groupsPulse}</span>
                    <h2>{tr.groups}</h2>
                  </div>
                  <Link href="/teacher/groups" className="td-mini-link">{tr.openGroups}</Link>
                </div>
                {(data.dashboard?.groups.length ?? 0) === 0 ? (
                  <p className="td-muted">{tr.noGroups}</p>
                ) : (
                  <div className="td-group-list">
                    {data.dashboard?.groups.slice(0, 4).map((group) => (
                      <Link key={group.id} href={`/teacher/groups/${group.id}`} className="td-group-card">
                        <strong>{group.name}</strong>
                        <span>{group.member_count} {tr.members} · {group.assessment_count} {tr.assessments}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="td-panel">
                <div className="td-panel-head compact">
                  <div>
                    <span className="td-section-label">{tr.latestGroupPosts}</span>
                    <h2>{tr.groupsPulse}</h2>
                  </div>
                </div>
                {(data.dashboard?.group_announcements.length ?? 0) === 0 ? (
                  <p className="td-muted">{tr.noGroupUpdates}</p>
                ) : (
                  <div className="td-feed-list">
                    {data.dashboard?.group_announcements.slice(0, 3).map((item) => (
                      <Link key={item.id} href={`/teacher/groups/${item.group.id}`} className="td-feed-item">
                        <span>{item.group.name}</span>
                        <p>{item.content}</p>
                        <small>{formatDate(item.created_at, L)}</small>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="td-panel">
                <div className="td-panel-head compact">
                  <div>
                    <span className="td-section-label">{tr.communityPulse}</span>
                    <h2>{tr.openCommunity}</h2>
                  </div>
                  <Link href="/teacher/hub" className="td-mini-link">{tr.openCommunity}</Link>
                </div>
                {(data.dashboard?.community_posts.length ?? 0) === 0 ? (
                  <p className="td-muted">{tr.noCommunity}</p>
                ) : (
                  <div className="td-feed-list">
                    {data.dashboard?.community_posts.slice(0, 3).map((post) => (
                      <Link key={post.id} href="/teacher/hub" className="td-feed-item">
                        <span>{post.author.full_name}</span>
                        <p>{post.content || (post.image_url ? tr.imageOnly : "")}</p>
                        <small>{post._count.replies} {tr.replies} · {post._count.reactions} {tr.reactions}</small>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="td-quick">
                <h2>{tr.quickActions}</h2>
                <Link href="/teacher/quizzes">{tr.createQuiz}</Link>
                <Link href="/teacher/lessons">{tr.createLesson}</Link>
                <Link href="/teacher/reports">{tr.viewReports}</Link>
              </section>
            </aside>
          </section>
        )}

        {topClasses.length > 0 && (
          <section className="td-strip">
            {topClasses.map((cls) => (
              <div key={cls.id} className="td-strip-card">
                <strong>{cls.name}</strong>
                <span>{cls.students.length} {tr.students}</span>
              </div>
            ))}
          </section>
        )}
      </main>
      <style>{styles}</style>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="td-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box}
.td-page{min-height:100%;position:relative;overflow:hidden;background:radial-gradient(circle at 12% 0%,rgba(229,185,60,.18),transparent 28%),linear-gradient(180deg,#F8F1E6 0%,#EEE2D2 100%);font-family:Cairo,Tajawal,sans-serif;color:#171716}
.td-glow{position:absolute;border-radius:999px;filter:blur(8px);pointer-events:none}.td-glow-a{width:420px;height:420px;inset-inline-end:-140px;top:-130px;background:rgba(200,169,106,.18)}.td-glow-b{width:300px;height:300px;inset-inline-start:-100px;bottom:12%;background:rgba(122,30,30,.08)}
.td-shell{position:relative;z-index:1;width:min(1500px,100%);margin:0 auto;padding:26px clamp(14px,3vw,34px) 44px;display:flex;flex-direction:column;gap:18px}
.td-hero{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:22px;align-items:stretch;background:linear-gradient(135deg,#111315,#3E2D14);border:1px solid rgba(229,185,60,.22);border-radius:32px;padding:30px;box-shadow:0 24px 60px rgba(20,14,6,.22);overflow:hidden}
.td-kicker,.td-section-label{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#C8A96A}.td-hero h1{margin:8px 0 8px;font-size:clamp(26px,4vw,48px);line-height:1.05;color:#F7EDD8;letter-spacing:-.04em}.td-hero p{max-width:680px;color:rgba(247,237,216,.74);font-size:15px;line-height:1.8}
.td-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.td-action,.td-mini-link,.td-quick a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:999px;font-weight:900;transition:.18s ease}.td-action{padding:10px 15px;color:#F7EDD8;border:1px solid rgba(247,237,216,.16);background:rgba(255,255,255,.06)}.td-action.primary{color:#171716;background:linear-gradient(135deg,#F0CE70,#C8A96A);border-color:transparent}.td-action:hover,.td-mini-link:hover,.td-quick a:hover{transform:translateY(-1px)}
.td-orbit{position:relative;min-height:210px;display:grid;place-items:center}.td-orbit-ring{position:absolute;width:210px;height:210px;border-radius:50%;border:1px solid rgba(229,185,60,.20);box-shadow:inset 0 0 0 18px rgba(255,255,255,.03)}.td-orbit-core{width:104px;height:104px;border-radius:32px;background:linear-gradient(145deg,#F7EDD8,#C8A96A);display:grid;place-items:center;font-size:32px;font-weight:900;color:#171716;box-shadow:0 18px 36px rgba(0,0,0,.26)}.td-orbit-chip{position:absolute;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid rgba(247,237,216,.18);color:#F7EDD8;font-size:12px;font-weight:900;backdrop-filter:blur(10px)}.td-orbit-chip.c1{top:18px;inset-inline-start:18px}.td-orbit-chip.c2{bottom:22px;inset-inline-end:14px}.td-orbit-chip.c3{top:70px;inset-inline-end:0}
.td-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.td-stat-card{position:relative;overflow:hidden;border-radius:24px;background:rgba(255,253,248,.82);border:1px solid rgba(184,155,94,.18);padding:18px;box-shadow:0 14px 36px rgba(42,26,10,.08)}.td-stat-card::after{content:"";position:absolute;inset-inline-end:-26px;top:-30px;width:90px;height:90px;border-radius:50%;background:rgba(200,169,106,.12)}.td-stat-card span{font-size:12px;font-weight:900;color:#8E7243}.td-stat-card strong{display:block;margin-top:8px;font-size:34px;line-height:1;color:#171716}.td-stat-card small{display:block;margin-top:8px;color:#7D6F5A;font-weight:700}
.td-grid{display:grid;grid-template-columns:330px minmax(0,1fr) 360px;gap:14px;align-items:start}.td-panel{background:rgba(255,253,248,.86);border:1px solid rgba(184,155,94,.18);border-radius:26px;padding:18px;box-shadow:0 16px 40px rgba(42,26,10,.09);backdrop-filter:blur(18px)}.td-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.td-panel-head h2{margin:2px 0 0;font-size:19px}.td-panel-head.compact h2{font-size:17px}.td-mini-link{padding:7px 11px;background:#171716;color:#C8A96A;font-size:12px;white-space:nowrap}.td-soft-pill{border-radius:999px;background:rgba(200,169,106,.14);color:#775922;padding:6px 10px;font-size:12px;font-weight:900;white-space:nowrap}
.td-class-list,.td-group-list,.td-feed-list,.td-ann-list,.td-side-stack{display:flex;flex-direction:column;gap:10px}.td-class-row{width:100%;display:flex;align-items:center;gap:10px;border:1px solid rgba(184,155,94,.15);border-radius:18px;background:#fff;padding:11px;cursor:pointer;font-family:inherit;text-align:start;transition:.18s ease}.td-class-row:hover,.td-class-row.active{border-color:rgba(200,169,106,.45);background:rgba(200,169,106,.10);transform:translateY(-1px)}.td-class-mark,.td-avatar{width:38px;height:38px;border-radius:14px;background:#171716;color:#C8A96A;display:grid;place-items:center;font-weight:900;flex-shrink:0}.td-class-row strong{display:block;font-size:13px}.td-class-row small{color:#7D6F5A;font-weight:700}.td-class-arrow{margin-inline-start:auto;color:#B89B5E;font-size:24px}
.td-roster{margin-top:16px;border-top:1px solid rgba(184,155,94,.16);padding-top:14px}.td-roster-head{display:flex;justify-content:space-between;font-weight:900;margin-bottom:10px}.td-student-grid{display:grid;gap:7px}.td-student{display:flex;align-items:center;gap:8px;border-radius:14px;padding:8px;background:rgba(246,240,230,.72)}.td-student span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#8E7243;font-weight:900}.td-student p{margin:0;font-size:12.5px;font-weight:800}
.td-compose{display:flex;flex-direction:column;gap:12px;border-radius:22px;padding:14px;background:linear-gradient(145deg,#fff,rgba(246,240,230,.70));border:1px solid rgba(184,155,94,.16)}.td-compose-top,.td-ann-meta{display:flex;align-items:center;gap:9px}.td-avatar.sm{width:28px;height:28px;border-radius:10px;font-size:10px}.td-compose textarea{width:100%;border:1.5px solid rgba(184,155,94,.18);border-radius:17px;background:#FFFDF8;padding:12px 14px;resize:none;outline:none;font:inherit;font-size:16px;line-height:1.7;color:#171716}.td-compose textarea:focus{border-color:rgba(200,169,106,.55);box-shadow:0 0 0 4px rgba(200,169,106,.12)}.td-compose-foot{display:flex;justify-content:space-between;align-items:center;color:#8B7B62;font-size:12px;font-weight:800}.td-compose-foot button{border:0;border-radius:999px;background:#171716;color:#C8A96A;padding:10px 16px;font:inherit;font-weight:900;cursor:pointer}.td-compose-foot button:disabled{opacity:.45;cursor:not-allowed}
.td-ann{display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(184,155,94,.15);border-radius:20px;background:#fff;padding:13px}.td-ann.muting{opacity:.45}.td-ann-main{flex:1}.td-ann-meta small{color:#89765A;font-weight:700}.td-ann p{margin:9px 0 0;line-height:1.75;color:#3D2E10}.td-ann button{border:1px solid rgba(184,155,94,.22);background:rgba(246,240,230,.70);border-radius:999px;padding:7px 11px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;color:#775922}.td-empty-mini,.td-muted{border-radius:18px;background:rgba(246,240,230,.68);padding:16px;color:#7D6F5A;font-weight:800;line-height:1.7}
.td-group-card,.td-feed-item{display:block;text-decoration:none;border-radius:18px;background:#fff;border:1px solid rgba(184,155,94,.16);padding:12px;transition:.18s ease;color:#171716}.td-group-card:hover,.td-feed-item:hover{transform:translateY(-1px);border-color:rgba(200,169,106,.42)}.td-group-card strong,.td-feed-item span{display:block;font-weight:900}.td-group-card span,.td-feed-item small{color:#7D6F5A;font-size:12px;font-weight:800}.td-feed-item p{margin:5px 0;color:#3D2E10;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.td-quick{border-radius:26px;padding:18px;background:linear-gradient(135deg,#171716,#3D2D14);box-shadow:0 18px 44px rgba(20,14,6,.20)}.td-quick h2{margin:0 0 12px;color:#F7EDD8;font-size:18px}.td-quick a{width:100%;margin-top:8px;padding:10px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(247,237,216,.14);color:#F7EDD8}
.td-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.td-strip-card{border-radius:20px;background:rgba(255,253,248,.70);border:1px solid rgba(184,155,94,.16);padding:14px}.td-strip-card strong{display:block}.td-strip-card span{font-size:12px;color:#7D6F5A;font-weight:800}.td-empty{background:rgba(255,253,248,.86);border:1px solid rgba(184,155,94,.18);border-radius:26px;padding:46px;text-align:center}.td-empty-icon{margin:0 auto 12px;width:50px;height:50px;border-radius:18px;display:grid;place-items:center;background:#171716;color:#C8A96A;font-weight:900}.td-empty h2{margin:0 0 6px}.td-empty p{color:#7D6F5A;font-weight:800}
.td-skel{background:linear-gradient(90deg,rgba(255,255,255,.45),rgba(200,169,106,.18),rgba(255,255,255,.45));background-size:220% 100%;animation:td-pulse 1.3s infinite;border-radius:24px}@keyframes td-pulse{to{background-position:-220% 0}}.td-skel-hero{height:260px}.td-skel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.td-skel-card{height:180px}.td-skel-ann{height:86px}
@media(max-width:1180px){.td-grid{grid-template-columns:310px minmax(0,1fr)}.td-side-stack{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.td-quick{grid-column:1/-1}.td-hero{grid-template-columns:1fr}}
@media(max-width:760px){.td-shell{padding:16px 12px 34px}.td-hero{padding:22px;border-radius:26px}.td-orbit{display:none}.td-stats,.td-grid,.td-side-stack,.td-strip,.td-skel-grid{grid-template-columns:1fr}.td-panel{border-radius:22px;padding:14px}.td-actions{gap:8px}.td-action{flex:1;min-width:140px}.td-ann{flex-direction:column}.td-ann button{align-self:flex-start}}
`;
