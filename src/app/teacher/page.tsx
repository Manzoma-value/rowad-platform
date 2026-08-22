"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, LayoutGrid, List, Search, Settings2, UsersRound, X } from "lucide-react";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";
import { useLang } from "@/lib/language-context";
import TeacherLoadError from "@/components/TeacherLoadError";
import { NotificationFeed } from "@/components/NotificationCenter";

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
    subtitle: "مركزك اليومي لإدارة مجموعات المستفيدين، مجموعات المشرفين، المجتمع، والمحتوى.",
    command: "لوحة قيادة المشرف",
    classes: "مجموعات المستفيدين",
    students: "المستفيدون",
    groups: "مجموعات المشرفين",
    content: "المحتوى",
    pending: "بانتظار المراجعة",
    announcements: "الإعلانات",
    quickActions: "اختصارات سريعة",
    openCommunity: "فتح المجتمع",
    openGroups: "مجموعات المشرفين",
    createLesson: "إنشاء درس",
    createQuiz: "إنشاء اختبار",
    viewReports: "تقارير المستفيدون",
    classCommand: "إدارة مجموعات المستفيدين",
    selectedClass: "المجموعة المحددة",
    classStudents: "مستفيدو المجموعة",
    noStudents: "لا يوجد مستفيدون في هذه المجموعة بعد",
    classAnnouncements: "إعلانات المجموعة",
    newAnnouncement: "إعلان جديد",
    announcementPlaceholder: "اكتب إعلاناً واضحاً للمستفيدين...",
    publish: "نشر الإعلان",
    posting: "جار النشر...",
    chars: "حرف",
    delete: "حذف",
    deleteConfirm: "حذف هذا الإعلان؟",
    noAnnouncements: "لا توجد إعلانات لهذا المجموعة بعد",
    groupsPulse: "التقييم والتواصل بين المشرفين",
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
    noClassesTitle: "لم يتم تعيينك في أي مجموعة بعد",
    noClassesText: "تواصل مع مدير المنصة لإضافتك إلى المجموعات.",
    school: "المنصة",
    groupUpdates: "تحديثات المجموعات",
    communityLatest: "آخر المجتمع",
    profile: "ملف المشرف",
    dashboardControls: "تنظيم لوحة التحكم",
    dashboardControlsHint: "اختر طريقة العرض وانتقل مباشرة إلى مساحة العمل التي تحتاجها.",
    comfortableView: "عرض مريح",
    compactView: "عرض مختصر",
    manageClasses: "إدارة مجموعات المستفيدين",
    allReports: "كل تقارير المستفيدين",
    searchStudents: "ابحث باسم المستفيد...",
    clearSearch: "مسح البحث",
    openStudent: "فتح ملف المستفيد",
    manageSelectedClass: "إدارة المجموعة الحالية",
    noStudentResults: "لا يوجد مستفيدون مطابقون للبحث.",
    showingStudents: "ظاهر الآن",
  },
  sq: {
    welcome: "Mirësevini",
    subtitle: "Qendra juaj ditore për grupet e pjesëmarrësve, grupet e edukatorëve, komunitetin dhe përmbajtjen.",
    command: "Paneli i edukatorit",
    classes: "Grupet e pjesëmarrësve",
    students: "Pjesëmarrësit",
    groups: "Grupet e edukatorëve",
    content: "Përmbajtja",
    pending: "Në shqyrtim",
    announcements: "Njoftimet",
    quickActions: "Veprime të shpejta",
    openCommunity: "Hap komunitetin",
    openGroups: "Grupet e edukatorëve",
    createLesson: "Krijo mësim",
    createQuiz: "Krijo test",
    viewReports: "Raportet e pjesëmarrësve",
    classCommand: "Menaxhimi i grupeve të pjesëmarrësve",
    selectedClass: "Grupi e zgjedhur",
    classStudents: "Pjesëmarrësit e grupit",
    noStudents: "Nuk ka pjesëmarrës në këtë grup ende",
    classAnnouncements: "Njoftimet e grupit",
    newAnnouncement: "Njoftim i ri",
    announcementPlaceholder: "Shkruaj një njoftim të qartë për pjesëmarrësit...",
    publish: "Posto njoftimin",
    posting: "Duke postuar...",
    chars: "shkronja",
    delete: "Fshij",
    deleteConfirm: "Fshi këtë njoftim?",
    noAnnouncements: "Nuk ka njoftime për këtë grup ende",
    groupsPulse: "Vlerësimi dhe komunikimi mes edukatorëve",
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
    noClassesTitle: "Nuk jeni caktuar në asnjë grup ende",
    noClassesText: "Kontaktoni drejtorin e platformës për t'u shtuar në grup.",
    school: "Platforma",
    groupUpdates: "Përditësime grupesh",
    communityLatest: "Komuniteti i fundit",
    profile: "Profili i edukatorit",
    dashboardControls: "Organizo panelin",
    dashboardControlsHint: "Zgjidh pamjen dhe hap menjëherë hapësirën që të nevojitet.",
    comfortableView: "Pamje e rehatshme",
    compactView: "Pamje kompakte",
    manageClasses: "Menaxho grupet e pjesëmarrësve",
    allReports: "Të gjitha raportet",
    searchStudents: "Kërko pjesëmarrës...",
    clearSearch: "Pastro kërkimin",
    openStudent: "Hap profilin",
    manageSelectedClass: "Menaxho grupin aktual",
    noStudentResults: "Nuk ka pjesëmarrës që përputhen me kërkimin.",
    showingStudents: "Shfaqen tani",
  },
} as const;

function pickLang(lang: Lang) {
  return lang === "ar" ? "ar" : "sq";
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
}

function formatDate(value: string, lang: "ar" | "sq") {
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { month: "short", day: "numeric" });
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
  const [loadError, setLoadError] = useState(false);
  const [annLoading, setAnnLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rosterQuery, setRosterQuery] = useState("");
  const [dashboardDensity, setDashboardDensity] = useState<"comfortable" | "compact">("comfortable");

  const fetchAnnouncements = useCallback(async (classId: string) => {
    setAnnLoading(true);
    const rows = await cachedFetch<Announcement[]>(`/api/teacher/announcements?classId=${classId}`, 30_000);
    setAnnouncements(Array.isArray(rows) ? rows : []);
    setAnnLoading(false);
  }, []);

  const handleSelectClass = useCallback(async (cls: ClassItem) => {
    setSelectedClass(cls);
    setRosterQuery("");
    await fetchAnnouncements(cls.id);
  }, [fetchAnnouncements]);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    cachedFetch<TeacherData>("/api/teacher", 60_000).then((payload) => {
      setData(payload);
      const firstClass = payload.classes?.[0] ?? null;
      setSelectedClass(firstClass);
      if (firstClass) void fetchAnnouncements(firstClass.id);
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, [fetchAnnouncements]);

  useEffect(() => {
    const frame = requestAnimationFrame(loadDashboard);
    return () => cancelAnimationFrame(frame);
  }, [loadDashboard]);

  useEffect(() => {
    const stored = window.localStorage.getItem("teacher-dashboard-density");
    if (stored !== "compact" && stored !== "comfortable") return;
    const frame = requestAnimationFrame(() => setDashboardDensity(stored));
    return () => cancelAnimationFrame(frame);
  }, []);

  const totals = data?.dashboard?.totals;
  const totalStudents = totals?.students ?? data?.classes.reduce((sum, cls) => sum + cls.students.length, 0) ?? 0;
  const totalContent = (totals?.lessons ?? 0) + (totals?.quizzes ?? 0);
  const visibleStudents = useMemo(() => {
    const needle = rosterQuery.trim().toLocaleLowerCase();
    return (selectedClass?.students ?? []).filter((student) => !needle || student.profile.full_name.toLocaleLowerCase().includes(needle));
  }, [rosterQuery, selectedClass]);

  const setDensity = (density: "comfortable" | "compact") => {
    setDashboardDensity(density);
    window.localStorage.setItem("teacher-dashboard-density", density);
  };

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

  if (loading) return <Skeleton />;
  if (loadError || !data) return <TeacherLoadError onRetry={() => { invalidateCache("/api/teacher"); loadDashboard(); }} />;

  return (
    <div className={`td-page ${dashboardDensity === "compact" ? "td-compact" : ""}`} dir={dir}>
      <div className="td-glow td-glow-a" />
      <div className="td-glow td-glow-b" />
      <main className="td-shell">
        <NotificationFeed basePath="/teacher" />

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
          <div className="td-hero-summary">
            <span className="td-hero-summary-label">{tr.command}</span>
            <div><strong>{totals?.pending_review ?? 0}</strong><small>{tr.pending}</small></div>
            <div><strong>{totals?.announcements ?? 0}</strong><small>{tr.announcements}</small></div>
            <div><strong>{totals?.groups ?? 0}</strong><small>{tr.groups}</small></div>
          </div>
        </section>

        <section className="td-stats">
          <StatCard href="/teacher/classes" label={tr.classes} value={data.classes.length} hint={tr.classCommand} />
          <StatCard href="/teacher/reports" label={tr.students} value={totalStudents} hint={tr.classStudents} />
          <StatCard href="/teacher/groups" label={tr.groups} value={totals?.groups ?? 0} hint={tr.groupsPulse} />
          <StatCard href="/teacher/lessons" label={tr.content} value={totalContent} hint={`${totals?.pending_review ?? 0} ${tr.pending}`} />
        </section>

        <section className="td-controlbar" aria-label={tr.dashboardControls}>
          <div className="td-controlbar-copy">
            <span><Settings2 size={16} /></span>
            <div><strong>{tr.dashboardControls}</strong><small>{tr.dashboardControlsHint}</small></div>
          </div>
          <div className="td-density" role="group" aria-label={tr.dashboardControls}>
            <button className={dashboardDensity === "comfortable" ? "active" : ""} onClick={() => setDensity("comfortable")} aria-pressed={dashboardDensity === "comfortable"}><LayoutGrid size={14} />{tr.comfortableView}</button>
            <button className={dashboardDensity === "compact" ? "active" : ""} onClick={() => setDensity("compact")} aria-pressed={dashboardDensity === "compact"}><List size={14} />{tr.compactView}</button>
          </div>
          <nav className="td-control-links">
            <Link href="/teacher/classes"><UsersRound size={14} />{tr.manageClasses}<ArrowUpLeft size={13} /></Link>
            <Link href="/teacher/reports">{tr.allReports}<ArrowUpLeft size={13} /></Link>
          </nav>
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
                  <Link href="/teacher/classes" className="td-section-link">{tr.classCommand}<ArrowUpLeft size={13} /></Link>
                  <h2><Link href="/teacher/classes">{tr.selectedClass}</Link></h2>
                </div>
                <Link href="/teacher/reports" className="td-mini-link">{tr.viewReports}</Link>
              </div>

              <div className="td-class-list">
                {data.classes.map((cls) => (
                  <button key={cls.id} className={`td-class-row ${selectedClass?.id === cls.id ? "active" : ""}`} onClick={() => void handleSelectClass(cls)} aria-pressed={selectedClass?.id === cls.id}>
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
                  <Link href="/teacher/reports">{tr.classStudents}<ArrowUpLeft size={13} /></Link>
                  <span>{tr.showingStudents} <strong>{visibleStudents.length}</strong> / {selectedClass?.students.length ?? 0}</span>
                </div>
                {(selectedClass?.students.length ?? 0) > 0 && <label className="td-roster-search"><Search size={15} /><input value={rosterQuery} onChange={(event) => setRosterQuery(event.target.value)} placeholder={tr.searchStudents} />{rosterQuery && <button onClick={() => setRosterQuery("")} aria-label={tr.clearSearch}><X size={13} /></button>}</label>}
                {(selectedClass?.students.length ?? 0) === 0 ? (
                  <p className="td-muted">{tr.noStudents}</p>
                ) : visibleStudents.length === 0 ? (
                  <p className="td-muted">{tr.noStudentResults}</p>
                ) : (
                  <div className="td-student-grid">
                    {visibleStudents.slice(0, 12).map((student) => (
                      <Link key={student.id} href={`/teacher/reports/students/${student.id}`} className="td-student" aria-label={`${tr.openStudent}: ${student.profile.full_name}`}>
                        <span>{student.profile.full_name.charAt(0)}</span>
                        <p>{student.profile.full_name}</p>
                        <ArrowUpLeft size={13} />
                      </Link>
                    ))}
                  </div>
                )}
                <div className="td-roster-actions">
                  <Link href="/teacher/classes">{tr.manageSelectedClass}<ArrowUpLeft size={13} /></Link>
                  <Link href="/teacher/reports">{tr.allReports}<ArrowUpLeft size={13} /></Link>
                </div>
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
      </main>
      <style>{styles}</style>
    </div>
  );
}

function StatCard({ href, label, value, hint }: { href: string; label: string; value: number; hint: string }) {
  return (
    <Link href={href} className="td-stat-card" aria-label={`${label}: ${value}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
      <b className="td-stat-open" aria-hidden="true">↗</b>
    </Link>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box}
.td-page{min-height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#F7F3EB 0%,#EFEAE0 100%);font-family:Cairo,Tajawal,sans-serif;color:#32101A}
.td-glow{display:none}
.td-shell{position:relative;z-index:1;width:min(1320px,100%);margin:0 auto;padding:26px clamp(14px,2.5vw,32px) 46px;display:flex;flex-direction:column;gap:18px}
.td-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,330px);gap:30px;align-items:center;background:radial-gradient(circle at 88% 0%,rgba(184,160,130,.22),transparent 35%),linear-gradient(135deg,#1A1A1A,#1A1A1A 62%,#6B1E2D);border:1px solid rgba(184,160,130,.30);border-radius:24px;padding:30px;box-shadow:0 22px 48px rgba(107,30,45,.18);overflow:hidden}
.td-kicker,.td-section-label{font-size:10.5px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#B8A082}.td-hero h1{margin:8px 0;font-size:clamp(28px,3.5vw,44px);line-height:1.12;color:#F7F3EB;letter-spacing:-.035em}.td-hero p{max-width:650px;color:rgba(239,234,224,.74);font-size:14px;line-height:1.8}
.td-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.td-action,.td-mini-link,.td-quick a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:10px;font-weight:900;transition:.18s ease}.td-action{padding:10px 15px;color:#F7F3EB;border:1px solid rgba(239,234,224,.18);background:rgba(255,255,255,.06)}.td-action.primary{color:#32101A;background:linear-gradient(135deg,#D9C9B0,#B8A082);border-color:transparent}.td-action:hover,.td-mini-link:hover,.td-quick a:hover{transform:translateY(-1px)}
.td-hero-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:13px;border:1px solid rgba(217,201,176,.2);border-radius:19px;background:rgba(107,30,45,.34);backdrop-filter:blur(10px)}.td-hero-summary-label{grid-column:1/-1;color:#D9C9B0;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.td-hero-summary>div{min-width:0;border-radius:13px;background:rgba(255,255,255,.07);padding:11px 8px;text-align:center}.td-hero-summary strong,.td-hero-summary small{display:block}.td-hero-summary strong{color:#F7F3EB;font-size:23px;line-height:1}.td-hero-summary small{margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(247,243,235,.62);font-size:9px;font-weight:800}
.td-orbit{position:relative;min-height:210px;display:grid;place-items:center}.td-orbit-ring{position:absolute;width:210px;height:210px;border-radius:50%;border:1px solid rgba(184,160,130,.20);box-shadow:inset 0 0 0 18px rgba(255,255,255,.03)}.td-orbit-core{width:104px;height:104px;border-radius:32px;background:linear-gradient(145deg,#F7F3EB,#B8A082);display:grid;place-items:center;font-size:32px;font-weight:900;color:#32101A;box-shadow:0 18px 36px rgba(26,26,26,.26)}.td-orbit-chip{position:absolute;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid rgba(239,234,224,.18);color:#F7F3EB;font-size:12px;font-weight:900;backdrop-filter:blur(10px)}.td-orbit-chip.c1{top:18px;inset-inline-start:18px}.td-orbit-chip.c2{bottom:22px;inset-inline-end:14px}.td-orbit-chip.c3{top:70px;inset-inline-end:0}
.td-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.td-stat-card{position:relative;overflow:hidden;display:block;border-radius:14px;background:#FFFBF5;border:1px solid rgba(107,30,45,.20);padding:16px;text-decoration:none;color:inherit;box-shadow:0 10px 24px rgba(107,30,45,.06);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.td-stat-card::after{content:"";position:absolute;inset-inline-end:0;top:0;width:4px;height:100%;background:#B8A082;transition:width .18s ease}.td-stat-card:hover,.td-stat-card:focus-visible{transform:translateY(-3px);border-color:rgba(107,30,45,.42);box-shadow:0 16px 30px rgba(107,30,45,.12);outline:none}.td-stat-card:hover::after,.td-stat-card:focus-visible::after{width:7px}.td-stat-card span{display:block;max-width:calc(100% - 34px);font-size:12px;font-weight:900;color:#6B1E2D}.td-stat-card strong{display:block;margin-top:8px;font-size:32px;line-height:1;color:#32101A}.td-stat-card small{display:block;margin-top:8px;color:#796A62;font-weight:700}.td-stat-open{position:absolute;inset-inline-end:16px;top:15px;width:27px;height:27px;display:grid;place-items:center;border-radius:9px;background:#F7F3EB;color:#6B1E2D;font-size:13px;line-height:1;transition:background .18s ease,color .18s ease}.td-stat-card:hover .td-stat-open,.td-stat-card:focus-visible .td-stat-open{background:#6B1E2D;color:#FFFBF5}
.td-controlbar{display:grid;grid-template-columns:minmax(250px,1fr) auto auto;align-items:center;gap:12px;border:1px solid rgba(107,30,45,.15);border-radius:18px;background:rgba(255,251,245,.82);padding:10px 12px;box-shadow:0 10px 28px rgba(107,30,45,.055);backdrop-filter:blur(14px)}.td-controlbar-copy{display:flex;align-items:center;gap:10px;min-width:0}.td-controlbar-copy>span{width:37px;height:37px;display:grid;flex:none;place-items:center;border-radius:11px;background:#32101A;color:#D9C9B0}.td-controlbar-copy strong,.td-controlbar-copy small{display:block}.td-controlbar-copy strong{font-size:11.5px}.td-controlbar-copy small{margin-top:1px;color:#796A62;font-size:9px;font-weight:700}.td-density{display:flex;gap:3px;border-radius:11px;background:#F7F3EB;padding:3px}.td-density button{display:flex;align-items:center;gap:5px;border:0;border-radius:8px;background:transparent;padding:8px 10px;color:#796A62;font:800 9px Cairo,sans-serif;white-space:nowrap;cursor:pointer}.td-density button.active{background:#FFFBF5;color:#6B1E2D;box-shadow:0 4px 12px rgba(107,30,45,.09)}.td-control-links{display:flex;gap:6px}.td-control-links a{display:flex;align-items:center;gap:5px;border-radius:10px;background:#32101A;padding:9px 11px;color:#F7F3EB;text-decoration:none;font-size:9px;font-weight:900;white-space:nowrap;transition:.18s ease}.td-control-links a:last-child{background:#6B1E2D}.td-control-links a:hover{transform:translateY(-1px)}
.td-command-row{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.75fr);gap:14px;align-items:stretch}
.td-command-panel{display:block;text-decoration:none;color:#32101A;background:#FFFBF5;border:1px solid rgba(107,30,45,.20);border-radius:16px;padding:16px;box-shadow:0 12px 28px rgba(107,30,45,.07)}
.td-command-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(107,30,45,.14)}
.td-command-head h2{margin:2px 0 0;font-size:18px;font-weight:900;color:#32101A}
.td-groups-table{display:grid;gap:8px}
.td-group-row{display:grid;grid-template-columns:minmax(170px,1fr) repeat(3,auto);gap:14px;align-items:center;text-decoration:none;color:#32101A;border:1px solid rgba(107,30,45,.16);border-radius:12px;background:#fff;padding:11px 12px;transition:.16s ease}
.td-group-row:hover{border-color:rgba(184,160,130,.55);background:#F7F3EB;transform:translateY(-1px)}
.td-group-row span:not(.td-group-name){font-size:12px;font-weight:900;color:#796A62;white-space:nowrap}
.td-group-name{font-size:14px;font-weight:900;color:#1A1A1A;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.td-community-card{background:linear-gradient(150deg,#FFFBF5,#EFEAE0)}
.td-community-count{width:34px;height:34px;border-radius:11px;background:#1A1A1A;color:#6B1E2D;display:grid;place-items:center;font-weight:900}
.td-community-preview{display:grid;gap:9px}
.td-community-preview article{border:1px solid rgba(107,30,45,.16);border-radius:12px;background:#fff;padding:12px}
.td-community-preview strong{display:block;font-size:13px;color:#1A1A1A}.td-community-preview p{margin:5px 0;color:#4A0E1C;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.td-community-preview small{color:#796A62;font-weight:900}
.td-grid{display:grid;grid-template-columns:330px minmax(0,1fr);gap:16px;align-items:start}.td-panel{background:#FFFBF5;border:1px solid rgba(107,30,45,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(107,30,45,.065);transition:padding .2s ease}.td-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px;padding-bottom:12px;border-bottom:1px solid rgba(107,30,45,.12)}.td-panel-head h2{margin:2px 0 0;font-size:18px}.td-panel-head h2 a{color:#32101A;text-decoration:none}.td-section-link{display:flex;align-items:center;gap:5px;color:#B8A082;text-decoration:none;font-size:10.5px;font-weight:900;letter-spacing:.08em}.td-section-link:hover,.td-panel-head h2 a:hover{color:#6B1E2D}.td-panel-head.compact h2{font-size:16px}.td-mini-link{padding:7px 11px;background:#1A1A1A;color:#B8A082;font-size:11px;white-space:nowrap}.td-soft-pill{border-radius:999px;background:rgba(184,160,130,.14);color:#6B1E2D;padding:6px 10px;font-size:11px;font-weight:900;white-space:nowrap}
.td-side-stack{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}.td-side-stack>.td-panel,.td-side-stack>.td-quick{height:100%}
.td-class-list,.td-group-list,.td-feed-list,.td-ann-list{display:flex;flex-direction:column;gap:10px}.td-class-row{width:100%;display:flex;align-items:center;gap:10px;border:1px solid rgba(107,30,45,.15);border-radius:14px;background:#fff;padding:11px;cursor:pointer;font-family:inherit;text-align:start;transition:.18s ease}.td-class-row:hover,.td-class-row.active{border-color:rgba(184,160,130,.45);background:rgba(184,160,130,.10);transform:translateY(-1px)}.td-class-mark,.td-avatar{width:38px;height:38px;border-radius:12px;background:#32101A;color:#B8A082;display:grid;place-items:center;font-weight:900;flex-shrink:0}.td-class-row strong{display:block;font-size:13px}.td-class-row small{color:#796A62;font-weight:700}.td-class-arrow{margin-inline-start:auto;color:#B8A082;font-size:24px}
.td-roster{margin-top:16px;border-top:1px solid rgba(107,30,45,.16);padding-top:14px}.td-roster-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.td-roster-head>a{display:flex;align-items:center;gap:5px;color:#32101A;text-decoration:none;font-size:13px;font-weight:900}.td-roster-head>a:hover{color:#6B1E2D}.td-roster-head>span{color:#796A62;font-size:8.5px;font-weight:800;white-space:nowrap}.td-roster-head>span strong{color:#6B1E2D;font-size:11px}.td-roster-search{height:39px;display:flex;align-items:center;gap:7px;margin-bottom:9px;border:1px solid rgba(107,30,45,.13);border-radius:11px;background:#F7F3EB;padding:0 10px;color:#8F765B}.td-roster-search input{width:100%;min-width:0;border:0;background:transparent;outline:none;color:#32101A;font:800 10px Cairo,sans-serif}.td-roster-search button{width:24px;height:24px;display:grid;flex:none;place-items:center;border:0;border-radius:7px;background:#FFFBF5;color:#6B1E2D;cursor:pointer}.td-student-grid{display:grid;gap:7px}.td-student{display:flex;align-items:center;gap:8px;border:1px solid transparent;border-radius:13px;padding:8px;background:rgba(247,243,235,.72);color:#32101A;text-decoration:none;transition:.16s ease}.td-student:hover,.td-student:focus-visible{border-color:rgba(107,30,45,.2);background:#FFF;transform:translateY(-1px);outline:none}.td-student span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#6B1E2D;font-weight:900}.td-student p{min-width:0;flex:1;overflow:hidden;margin:0;font-size:11.5px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.td-student>svg{flex:none;color:#B8A082}.td-roster-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;padding-top:10px;border-top:1px dashed rgba(107,30,45,.15)}.td-roster-actions a{display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(107,30,45,.15);border-radius:10px;background:#FFF;padding:8px;color:#6B1E2D;text-decoration:none;font-size:8.5px;font-weight:900}.td-roster-actions a:first-child{background:#32101A;color:#D9C9B0}
.td-compose{display:flex;flex-direction:column;gap:12px;border-radius:16px;padding:15px;background:linear-gradient(145deg,#fff,rgba(247,243,235,.70));border:1px solid rgba(107,30,45,.14)}.td-compose-top,.td-ann-meta{display:flex;align-items:center;gap:9px}.td-avatar.sm{width:28px;height:28px;border-radius:9px;font-size:10px}.td-compose textarea{width:100%;border:1.5px solid rgba(107,30,45,.18);border-radius:13px;background:#FFFBF5;padding:12px 14px;resize:none;outline:none;font:inherit;font-size:14px;line-height:1.7;color:#32101A}.td-compose textarea:focus{border-color:rgba(184,160,130,.55);box-shadow:0 0 0 4px rgba(184,160,130,.12)}.td-compose-foot{display:flex;justify-content:space-between;align-items:center;color:#8F765B;font-size:11px;font-weight:800}.td-compose-foot button{border:0;border-radius:11px;background:#32101A;color:#D9C9B0;padding:10px 16px;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.td-compose-foot button:disabled{opacity:.45;cursor:not-allowed}
.td-ann{display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(107,30,45,.15);border-radius:20px;background:#fff;padding:13px}.td-ann.muting{opacity:.45}.td-ann-main{flex:1}.td-ann-meta small{color:#8F765B;font-weight:700}.td-ann p{margin:9px 0 0;line-height:1.75;color:#4A0E1C}.td-ann button{border:1px solid rgba(107,30,45,.22);background:rgba(247,243,235,.70);border-radius:999px;padding:7px 11px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;color:#6B1E2D}.td-empty-mini,.td-muted{border-radius:18px;background:rgba(247,243,235,.68);padding:16px;color:#796A62;font-weight:800;line-height:1.7}
.td-group-card,.td-feed-item{display:block;text-decoration:none;border-radius:13px;background:#fff;border:1px solid rgba(107,30,45,.14);padding:11px;transition:.18s ease;color:#32101A}.td-group-card:hover,.td-feed-item:hover{transform:translateY(-1px);border-color:rgba(184,160,130,.42)}.td-group-card strong,.td-feed-item span{display:block;font-weight:900}.td-group-card span,.td-feed-item small{color:#796A62;font-size:11px;font-weight:800}.td-feed-item p{margin:5px 0;color:#4A0E1C;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.td-quick{border-radius:20px;padding:18px;background:linear-gradient(135deg,#32101A,#6B1E2D);box-shadow:0 14px 34px rgba(107,30,45,.17)}.td-quick h2{margin:0 0 12px;color:#F7F3EB;font-size:17px}.td-quick a{width:100%;margin-top:8px;padding:10px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(239,234,224,.14);color:#F7F3EB}
.td-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.td-strip-card{border-radius:20px;background:rgba(255,251,245,.70);border:1px solid rgba(107,30,45,.16);padding:14px}.td-strip-card strong{display:block}.td-strip-card span{font-size:12px;color:#796A62;font-weight:800}.td-empty{background:rgba(255,251,245,.86);border:1px solid rgba(107,30,45,.18);border-radius:26px;padding:46px;text-align:center}.td-empty-icon{margin:0 auto 12px;width:50px;height:50px;border-radius:18px;display:grid;place-items:center;background:#32101A;color:#B8A082;font-weight:900}.td-empty h2{margin:0 0 6px}.td-empty p{color:#796A62;font-weight:800}
.td-compact .td-shell{gap:12px}.td-compact .td-hero{padding-block:23px}.td-compact .td-stat-card{padding-block:12px}.td-compact .td-stat-card strong{font-size:27px}.td-compact .td-panel{padding:14px}.td-compact .td-panel-head{margin-bottom:11px;padding-bottom:9px}.td-compact .td-class-list,.td-compact .td-group-list,.td-compact .td-feed-list,.td-compact .td-ann-list{gap:7px}.td-compact .td-ann{padding:10px}.td-compact .td-side-stack{gap:10px}
.td-skel{background:linear-gradient(90deg,rgba(255,255,255,.45),rgba(184,160,130,.18),rgba(255,255,255,.45));background-size:220% 100%;animation:td-pulse 1.3s infinite;border-radius:24px}@keyframes td-pulse{to{background-position:-220% 0}}.td-skel-hero{height:260px}.td-skel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.td-skel-card{height:180px}.td-skel-ann{height:86px}
@media(max-width:1180px){.td-hero{grid-template-columns:1fr}.td-hero-summary{max-width:520px}.td-controlbar{grid-template-columns:minmax(240px,1fr) auto}.td-control-links{grid-column:1/-1}.td-grid{grid-template-columns:300px minmax(0,1fr)}.td-side-stack{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.td-shell{padding:16px 12px 34px}.td-hero{padding:22px;border-radius:20px}.td-hero-summary{grid-template-columns:repeat(3,1fr)}.td-stats,.td-grid,.td-side-stack,.td-strip,.td-skel-grid{grid-template-columns:1fr}.td-controlbar{grid-template-columns:1fr}.td-density{width:100%}.td-density button{flex:1;justify-content:center}.td-control-links{grid-column:auto;display:grid;grid-template-columns:1fr 1fr}.td-control-links a{justify-content:center}.td-panel{border-radius:17px;padding:14px}.td-actions{gap:8px}.td-action{flex:1;min-width:140px}.td-ann{flex-direction:column}.td-ann button{align-self:flex-start}.td-group-row{grid-template-columns:1fr 1fr;gap:7px}.td-group-name{grid-column:1/-1}}
@media(max-width:430px){.td-controlbar-copy small{display:none}.td-control-links{grid-template-columns:1fr}.td-roster-actions{grid-template-columns:1fr}.td-panel-head{align-items:center}.td-panel-head h2{font-size:16px}.td-mini-link{font-size:9px}}
`;
