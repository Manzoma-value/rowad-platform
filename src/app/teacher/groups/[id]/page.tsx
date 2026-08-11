"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, Award, Clock3, ClipboardCheck, GraduationCap,
  Languages, Lock, MapPin, MessageSquare, Network, Search, Send, Sparkles,
  Trash2, Unlock, UserRound, Users,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityMandala from "@/components/IdentityMandala";

type LanguageEntry = { lang?: string; level?: string };
type Member = {
  joined_at: string;
  teacher: {
    id: string;
    profile: { id: string; full_name: string };
    application: {
      country: string;
      city: string;
      qualification: string;
      specialization: string;
      years_of_experience: string;
      languages: unknown;
      experience_areas: string[];
    } | null;
  };
};
type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  members: Member[];
};
type GroupAnnouncement = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { id: string; full_name: string; role: string };
};

const UI = {
  ar: {
    back: "العودة للمجموعات",
    members: "الأعضاء",
    overview: "نظرة عامة",
    activities: "مجتمع المجموعة",
    announcementPlaceholder: "اكتب إعلاناً أو تعليقاً لهذه المجموعة...",
    post: "نشر",
    posting: "جاري النشر...",
    emptyActivities: "لم تتم إضافة إعلانات لهذه المجموعة بعد.",
    delete: "حذف",
    noMembers: "لا يوجد أعضاء في هذه المجموعة بعد.",
    memberSearch: "ابحث بالاسم، الموقع، التخصص أو اللغة...",
    noMemberResults: "لا يوجد أعضاء مطابقون للبحث.",
    qualification: "المؤهل",
    specialization: "التخصص",
    experience: "الخبرة",
    languages: "اللغات",
    location: "الموقع",
    unavailable: "غير متوفر",
    notFound: "تعذر فتح هذه المجموعة.",
    assessments: "نماذج القياس",
    assessmentsEmpty: "لا توجد تقييمات نشطة لهذه المجموعة.",
    assessmentOpen: "افتح التقييم",
    assessmentClosed: "مغلق",
    assessmentOpenStatus: "مفتوح",
    showMore: "التفاصيل الكاملة",
    showLess: "عرض أقل",
    groupHome: "مساحة مجموعتي",
    groupHomeSub: "كل ما تحتاجه مع مجموعتك في مكان واحد.",
    assessmentHint: "ابدأ أو أكمل تقييم أعضاء مجموعتك",
    openAssessments: "نماذج مفتوحة",
    browseAssessments: "عرض كل نماذج القياس",
    membersHint: "تعرّف على أعضاء مجموعتك",
    communityHint: "تابع الإعلانات والنقاشات",
  },
  sq: {
    back: "Kthehu te grupet",
    members: "Anëtarët",
    overview: "Përmbledhje",
    activities: "Komuniteti i grupit",
    announcementPlaceholder: "Shkruaj një njoftim ose koment për këtë grup...",
    post: "Posto",
    posting: "Duke postuar...",
    emptyActivities: "Nuk ka njoftime të shtuara për këtë grup ende.",
    delete: "Fshi",
    noMembers: "Ky grup nuk ka anëtarë ende.",
    memberSearch: "Kërko sipas emrit, vendit, specializimit ose gjuhës...",
    noMemberResults: "Nuk ka anëtarë që përputhen me kërkimin.",
    qualification: "Kualifikimi",
    specialization: "Specializimi",
    experience: "Përvoja",
    languages: "Gjuhët",
    location: "Vendndodhja",
    unavailable: "Nuk disponohet",
    notFound: "Ky grup nuk mund të hapet.",
    assessments: "Modelet e Matjes",
    assessmentsEmpty: "Nuk ka vlerësime aktive për këtë grup.",
    assessmentOpen: "Hap vlerësimin",
    assessmentClosed: "I mbyllur",
    assessmentOpenStatus: "I hapur",
    showMore: "Detajet e plota",
    showLess: "Shfaq më pak",
    groupHome: "Hapësira e grupit tim",
    groupHomeSub: "Gjithçka që të duhet me grupin tënd, në një vend.",
    assessmentHint: "Fillo ose vazhdo vlerësimin e anëtarëve",
    openAssessments: "modele të hapura",
    browseAssessments: "Shiko të gjitha modelet",
    membersHint: "Njih anëtarët e grupit",
    communityHint: "Ndiq njoftimet dhe diskutimet",
  },
} as const;

const QUAL: Record<string, { ar: string; sq: string }> = {
  DIPLOMA: { ar: "دبلوم", sq: "Diplomë" },
  BACHELOR: { ar: "بكالوريوس", sq: "Bachelor" },
  HIGHER_DIPLOMA: { ar: "دبلوم عالٍ", sq: "Diplomë e lartë" },
  MASTER: { ar: "ماجستير", sq: "Master" },
  PHD: { ar: "دكتوراه", sq: "Doktoraturë" },
};
const EXP: Record<string, { ar: string; sq: string }> = {
  LT_3: { ar: "أقل من 3 سنوات", sq: "Më pak se 3 vite" },
  Y_3_5: { ar: "3 إلى 5 سنوات", sq: "3 deri 5 vite" },
  Y_6_10: { ar: "6 إلى 10 سنوات", sq: "6 deri 10 vite" },
  Y_11_15: { ar: "11 إلى 15 سنة", sq: "11 deri 15 vite" },
  GT_15: { ar: "أكثر من 15 سنة", sq: "Mbi 15 vite" },
};
const LANG: Record<string, { ar: string; sq: string }> = {
  ar: { ar: "العربية", sq: "Arabisht" },
  en: { ar: "الإنجليزية", sq: "Anglisht" },
  sq: { ar: "الألبانية", sq: "Shqip" },
  tr: { ar: "التركية", sq: "Turqisht" },
  fr: { ar: "الفرنسية", sq: "Frëngjisht" },
};

export default function TeacherGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [loading, setLoading] = useState(true);
  const [annLoading, setAnnLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  type AssessmentRow = { id: string; title: string; status: "OPEN" | "CLOSED"; created_at: string; closed_at: string | null };
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    fetch(`/api/teacher/groups/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((d) => setGroup(d?.group ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    fetch(`/api/teacher/groups/${id}/assessments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAssessments(Array.isArray(d?.assessments) ? d.assessments : []))
      .catch(() => setAssessments([]));
  }, [params?.id]);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    setAnnLoading(true);
    fetch(`/api/teacher/groups/${id}/announcements`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAnnouncements(Array.isArray(d?.announcements) ? d.announcements : []);
        setCurrentProfileId(typeof d?.current_profile_id === "string" ? d.current_profile_id : null);
      })
      .catch(() => {
        setAnnouncements([]);
        setCurrentProfileId(null);
      })
      .finally(() => setAnnLoading(false));
  }, [params?.id]);

  async function postAnnouncement() {
    const id = params?.id;
    if (!id || !newAnnouncement.trim()) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/teacher/groups/${id}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newAnnouncement }),
      });
      if (r.ok) {
        const d = await r.json();
        setAnnouncements((current) => [d.announcement, ...current]);
        setNewAnnouncement("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function deleteAnnouncement(announcementId: string) {
    const id = params?.id;
    if (!id) return;
    setDeletingId(announcementId);
    try {
      const r = await fetch(
        `/api/teacher/groups/${id}/announcements?announcement_id=${encodeURIComponent(announcementId)}`,
        { method: "DELETE" },
      );
      if (r.ok) setAnnouncements((current) => current.filter((a) => a.id !== announcementId));
    } finally {
      setDeletingId(null);
    }
  }

  const memberCount = group?.members.length ?? 0;
  const openAssessmentCount = assessments.filter((assessment) => assessment.status === "OPEN").length;
  const visibleMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const members = group?.members ?? [];
    if (!q) return members;
    return members.filter((member) => {
      const app = member.teacher.application;
      const haystack = [
        member.teacher.profile.full_name,
        app?.country,
        app?.city,
        app?.specialization,
        app?.qualification,
        app?.years_of_experience,
        normalizeLanguages(app?.languages, L),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [group?.members, memberQuery, L]);
  const initials = useMemo(() => {
    const out = new Map<string, string>();
    for (const member of group?.members ?? []) {
      out.set(member.teacher.id, member.teacher.profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join(""));
    }
    return out;
  }, [group]);

  if (loading) {
    return (
      <div className="gd-page" dir={dir}>
        <div className="gd-loading"><MandalaLoader /></div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="gd-page" dir={dir}>
        <button className="gd-back" onClick={() => router.push("/teacher/groups")}>
          <ArrowLeft size={15} /> {T.back}
        </button>
        <div className="gd-empty"><Sparkles size={18} />{T.notFound}</div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="gd-page" dir={dir}>
      <Link className="gd-back" href="/teacher/groups">
        <ArrowLeft size={15} /> {T.back}
      </Link>

      <header className="gd-hero">
        <div className="gd-hero-orbit gd-hero-orbit-1" />
        <div className="gd-hero-orbit gd-hero-orbit-2" />
        <div className="gd-hero-mandala"><IdentityMandala size={340} stroke="#B8A082" opacity={0.14} spin spinDuration={80} /></div>
        <div className="gd-hero-main">
          <span className="gd-hero-icon"><Network size={22} strokeWidth={1.7} /></span>
          <div className="gd-hero-copy">
            <span className="gd-eyebrow"><Sparkles size={12} />{T.groupHome}</span>
            <h1 className="gd-title">{group.name}</h1>
            <p className="gd-desc">{group.description || T.groupHomeSub}</p>
          </div>
        </div>
        <div className="gd-hero-stats">
          <div className="gd-hero-stat"><strong>{memberCount}</strong><span>{T.members}</span></div>
          <div className="gd-hero-stat"><strong>{openAssessmentCount}</strong><span>{T.openAssessments}</span></div>
          <div className="gd-hero-stat"><strong>{announcements.length}</strong><span>{T.activities}</span></div>
        </div>
      </header>

      <nav className="gd-hub" aria-label={T.groupHome}>
        <Link href={`/teacher/groups/${params?.id}/assessments`} className="gd-hub-card gd-hub-primary">
          <span className="gd-hub-icon"><ClipboardCheck size={22} /></span>
          <div><strong>{T.assessments}</strong><p>{T.assessmentHint}</p><small>{openAssessmentCount} {T.openAssessments}</small></div>
          <span className="gd-hub-arrow"><ArrowUpRight size={19} /></span>
        </Link>
        <a href="#group-members" className="gd-hub-card">
          <span className="gd-hub-icon"><Users size={20} /></span>
          <div><strong>{T.members}</strong><p>{T.membersHint}</p><small>{memberCount}</small></div>
        </a>
        <a href="#group-community" className="gd-hub-card">
          <span className="gd-hub-icon"><MessageSquare size={20} /></span>
          <div><strong>{T.activities}</strong><p>{T.communityHint}</p><small>{announcements.length}</small></div>
        </a>
      </nav>

      <section className="gd-section" id="group-members">
        <div className="gd-section-head">
          <span className="gd-section-icon"><Users size={16} strokeWidth={1.8} /></span>
          <h2>{T.members}</h2>
        </div>
        {group.members.length === 0 ? (
          <div className="gd-muted"><Sparkles size={16} />{T.noMembers}</div>
        ) : (
          <>
            <div className="gd-filter">
              <Search size={15} />
              <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder={T.memberSearch} />
              <span>{visibleMembers.length} / {group.members.length}</span>
            </div>
            {visibleMembers.length === 0 ? (
              <div className="gd-muted"><Sparkles size={16} />{T.noMemberResults}</div>
            ) : (
              <div className="gd-members">
                {visibleMembers.map((member) => (
                  <MemberCard
                    key={member.teacher.id}
                    member={member}
                    T={T}
                    L={L}
                    initial={initials.get(member.teacher.id) ?? null}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="gd-section">
        <div className="gd-section-head">
          <span className="gd-section-icon"><ClipboardCheck size={16} strokeWidth={1.8} /></span>
          <h2>{T.assessments}</h2>
          <Link href={`/teacher/groups/${params?.id}/assessments`} className="gd-section-link">{T.browseAssessments}</Link>
        </div>
        {assessments.length === 0 ? (
          <div className="gd-muted"><Sparkles size={16} />{T.assessmentsEmpty}</div>
        ) : (
          <ul className="gd-assess-list">
            {assessments.map((a) => (
              <li key={a.id}>
                <Link href={`/teacher/groups/${params?.id}/assessments/${a.id}`} className={`gd-assess-card gd-assess-card-${a.status}`}>
                  <div className="gd-assess-meta">
                    <span className={`gd-assess-tag gd-assess-${a.status}`}>
                      {a.status === "OPEN" ? <Unlock size={11} /> : <Lock size={11} />}
                      {a.status === "OPEN" ? T.assessmentOpenStatus : T.assessmentClosed}
                    </span>
                    <span className="gd-assess-date">{new Date(a.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL")}</span>
                  </div>
                  <h3 className="gd-assess-title">{a.title}</h3>
                  <span className="gd-assess-open">{T.assessmentOpen} <ArrowUpRight size={13} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="gd-section" id="group-community">
        <div className="gd-section-head">
          <span className="gd-section-icon"><MessageSquare size={16} strokeWidth={1.8} /></span>
          <h2>{T.activities}</h2>
        </div>
        <div className="gd-composer">
          <textarea
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                postAnnouncement();
              }
            }}
            placeholder={T.announcementPlaceholder}
            rows={3}
          />
          <button onClick={postAnnouncement} disabled={posting || !newAnnouncement.trim()}>
            <Send size={14} strokeWidth={2} />
            {posting ? T.posting : T.post}
          </button>
        </div>

        {annLoading ? (
          <div className="gd-activities-empty"><MandalaLoader /></div>
        ) : announcements.length === 0 ? (
          <div className="gd-activities-empty"><Sparkles size={18} />{T.emptyActivities}</div>
        ) : (
          <div className="gd-ann-list">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="gd-ann">
                <div className="gd-ann-avatar">
                  {announcement.author.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="gd-ann-body">
                  <div className="gd-ann-meta">
                    <strong>{announcement.author.full_name}</strong>
                    <span>{new Date(announcement.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p>{announcement.content}</p>
                </div>
                {announcement.author_id === currentProfileId && (
                  <button
                    className="gd-ann-delete"
                    onClick={() => deleteAnnouncement(announcement.id)}
                    disabled={deletingId === announcement.id}
                    title={T.delete}
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{styles}</style>
    </div>
  );
}

/** Group-member card. Shows name + location + specialization by default;
 *  the rest (qualification, experience, languages) is behind Show More. */
function MemberCard({
  member, T, L, initial,
}: {
  member: Member;
  T: typeof UI.ar | typeof UI.sq;
  L: "ar" | "sq";
  initial: string | null;
}) {
  const [open, setOpen] = useState(false);
  const app = member.teacher.application;
  const location = app ? joinParts([app.city, app.country]) : T.unavailable;
  const specialization = app?.specialization || T.unavailable;
  return (
    <article className={`gd-member ${open ? "gd-member--open" : ""}`}>
      <div className="gd-member-head">
        <div className="gd-avatar">{initial || <UserRound size={19} />}</div>
        <h3>{member.teacher.profile.full_name}</h3>
      </div>
      <div className="gd-chips">
        <span className="gd-chip"><MapPin size={12} />{location}</span>
        <span className="gd-chip"><GraduationCap size={12} />{specialization}</span>
      </div>
      {open && (
        <div className="gd-detail-grid">
          <DetailChip icon={<Award size={13} />} label={T.qualification} value={labelFor(QUAL, app?.qualification, L, T.unavailable)} />
          <DetailChip icon={<Clock3 size={13} />} label={T.experience} value={labelFor(EXP, app?.years_of_experience, L, T.unavailable)} />
          <DetailChip icon={<Languages size={13} />} label={T.languages} value={normalizeLanguages(app?.languages, L) || T.unavailable} />
        </div>
      )}
      <button className="gd-more" onClick={() => setOpen((v) => !v)} type="button">
        {open ? T.showLess : T.showMore}
      </button>
    </article>
  );
}

function DetailChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="gd-detail-chip">
      <span className="gd-detail-icon">{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}

function labelFor(map: Record<string, { ar: string; sq: string }>, key: string | undefined, lang: "ar" | "sq", fallback: string) {
  if (!key) return fallback;
  return map[key]?.[lang] ?? key;
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function normalizeLanguages(value: unknown, lang: "ar" | "sq") {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry: LanguageEntry) => entry?.lang ? (LANG[entry.lang]?.[lang] ?? entry.lang) : "")
    .filter(Boolean)
    .join(" · ");
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  .gd-page { min-height: 100%; max-width: 1240px; margin: 0 auto; padding: 18px 28px 60px; font-family: 'Cairo', sans-serif; color: #1A1A1A; }
  .gd-loading { min-height: 50vh; display: flex; align-items: center; justify-content: center; }
  .gd-back {
    display: inline-flex; align-items: center; gap: 7px; margin-bottom: 16px;
    color: #6B1E2D; text-decoration: none; font-size: 13px; font-weight: 900;
    border: 0; background: transparent; font-family: inherit; cursor: pointer;
  }
  [dir="rtl"] .gd-back svg { transform: scaleX(-1); }

  /* ── Hero ── */
  .gd-hero {
    position: relative; isolation: isolate; overflow: hidden;
    display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
    min-height: 190px; padding: 32px; margin-bottom: 16px;
    background: radial-gradient(circle at 8% 0,rgba(217,201,176,.2),transparent 34%),linear-gradient(135deg,#32101A,#6B1E2D 68%,#4A0E1C);
    border-radius: 28px; box-shadow: 0 26px 56px rgba(107,30,45,.2);
  }
  .gd-hero:after { content:""; position:absolute; inset:9px; z-index:-1; border:1px solid rgba(217,201,176,.15); border-radius:21px; }
  .gd-hero-mandala { position:absolute; inset-inline-end:-70px; inset-block-end:-110px; z-index:-1; }
  .gd-hero-orbit { position:absolute; border:1px solid rgba(217,201,176,.12); border-radius:50%; pointer-events:none; }
  .gd-hero-orbit-1 { width:220px; height:220px; inset-inline-start:-96px; top:-86px; }
  .gd-hero-orbit-2 { width:130px; height:130px; inset-inline-start:-34px; top:-42px; }
  .gd-hero-main { position:relative; z-index:1; display:flex; align-items:center; gap:16px; min-width:0; }
  .gd-hero-icon {
    width:52px; height:52px; flex:none; display:grid; place-items:center; border-radius:16px;
    background:rgba(255,251,245,.09); color:#D9C9B0; border:1px solid rgba(217,201,176,.24);
  }
  .gd-hero-copy { min-width:0; }
  .gd-eyebrow { display:inline-flex; align-items:center; gap:6px; margin-bottom:6px; color:#D9C9B0; font-size:10.5px; font-weight:900; letter-spacing:.08em; }
  .gd-title { margin: 0 0 6px; color: #FFFBF5; font-size: 27px; font-weight: 900; }
  .gd-desc { margin: 0; max-width: 620px; color: rgba(255,251,245,0.72); font-size: 12.5px; line-height: 1.8; font-weight: 600; }
  .gd-hero-stats { position:relative; z-index:1; display:flex; gap:10px; flex-wrap:wrap; }
  .gd-hero-stat {
    display:flex; flex-direction:column; align-items:center; gap:2px; min-width:78px;
    padding:11px 16px; border-radius:14px; background:rgba(184,160,130,0.09); border:1px solid rgba(217,201,176,.2);
    backdrop-filter: blur(6px);
  }
  .gd-hero-stat strong { color:#FFFBF5; font-size:22px; line-height:1; }
  .gd-hero-stat span { color:rgba(255,251,245,0.62); font-size:10px; font-weight:800; margin-top:4px; }

  /* ── Hub quick-nav ── */
  .gd-hub { display:grid; grid-template-columns:1.35fr repeat(2,minmax(0,.75fr)); gap:12px; margin:0 0 18px; }
  .gd-hub-card { position:relative; display:flex; align-items:center; gap:12px; min-width:0; min-height:112px; padding:16px; overflow:hidden; border:1px solid rgba(107,30,45,.13); border-radius:20px; background:#FFFBF5; color:#32101A; text-decoration:none; box-shadow:0 10px 26px rgba(107,30,45,.05); transition:.18s; }
  .gd-hub-card:hover { transform:translateY(-3px); border-color:rgba(107,30,45,.4); box-shadow:0 18px 36px rgba(107,30,45,.12); }
  .gd-hub-primary { background:linear-gradient(145deg,#FFFBF5,#F7F3EB); box-shadow:inset 4px 0 0 #6B1E2D,0 10px 26px rgba(107,30,45,.06); }
  [dir="rtl"] .gd-hub-primary { box-shadow:inset -4px 0 0 #6B1E2D,0 10px 26px rgba(107,30,45,.06); }
  .gd-hub-icon { width:44px; height:44px; flex:none; display:grid; place-items:center; border-radius:14px; background:#F7F3EB; color:#6B1E2D; transition:.18s; }
  .gd-hub-primary .gd-hub-icon { background:#6B1E2D; color:#FFFBF5; }
  .gd-hub-card:hover .gd-hub-icon { transform:scale(1.08); }
  .gd-hub-card>div { min-width:0; flex:1; }
  .gd-hub-card strong { display:block; font-size:14px; font-weight:900; }
  .gd-hub-card p { margin:3px 0; color:#655B53; font-size:10.5px; line-height:1.55; font-weight:700; }
  .gd-hub-card small { color:#8F765B; font-size:10px; font-weight:900; }
  .gd-hub-arrow { color:#6B1E2D; }

  /* ── Sections ── */
  .gd-section { scroll-margin-top:18px; background: #FFFBF5; border: 1px solid rgba(107,30,45,0.1); border-radius: 22px; padding: 22px; margin-bottom: 14px; box-shadow:0 12px 30px rgba(107,30,45,.05); }
  .gd-section-head { display: flex; align-items: center; gap: 10px; padding-bottom: 13px; margin-bottom: 16px; border-bottom: 1px solid rgba(107,30,45,0.12); }
  .gd-section-icon { width:32px; height:32px; flex:none; display:grid; place-items:center; border-radius:10px; background:#F7F3EB; color:#6B1E2D; }
  .gd-section-head h2 { margin: 0; font-size: 15px; font-weight: 900; color: #32101A; }
  .gd-section-link { margin-inline-start:auto; color:#6B1E2D; font-size:10.5px; font-weight:900; text-decoration:none; padding:6px 12px; border-radius:999px; background:#F7F3EB; transition:.15s; }
  .gd-section-link:hover { background:rgba(107,30,45,.1); }

  /* ── Member search ── */
  .gd-filter { display: flex; align-items: center; gap: 9px; margin: 0 0 14px; padding: 3px 14px; border: 1.5px solid rgba(107,30,45,0.16); border-radius: 13px; background: #F7F3EB; color:#8F765B; }
  .gd-filter input {
    flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
    padding: 11px 0; font: inherit; font-size: 13px; color:#32101A;
  }
  .gd-filter:focus-within { border-color: #B8A082; box-shadow: 0 0 0 3px rgba(107,30,45,0.08); background:#FFF; }
  .gd-filter span { color: #8F765B; font-size: 11px; font-weight: 900; white-space: nowrap; }

  /* ── Member cards ── */
  .gd-members { display: grid; grid-template-columns: repeat(auto-fill, minmax(255px, 1fr)); gap: 12px; }
  .gd-member { display:flex; flex-direction:column; gap:11px; padding: 16px; border: 1px solid rgba(107,30,45,0.12); border-radius: 17px; background: linear-gradient(165deg,#FFFFFF,#FFFBF5); transition:.18s; }
  .gd-member:hover { transform:translateY(-2px); border-color:rgba(107,30,45,.32); box-shadow:0 14px 30px rgba(107,30,45,.08); }
  .gd-member-head { display:flex; align-items:center; gap:11px; min-width:0; }
  .gd-avatar {
    width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(150deg,#6B1E2D,#32101A); color: #D9C9B0; box-shadow: 0 0 0 3px rgba(184,160,130,0.15); font-size: 12.5px; font-weight: 900;
  }
  .gd-member h3 { margin: 0; font-size: 14px; font-weight: 900; color: #32101A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .gd-chips { display:flex; flex-wrap:wrap; gap:6px; }
  .gd-chip { display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border-radius:999px; background:#F7F3EB; color:#6B1E2D; font-size:10.5px; font-weight:800; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .gd-detail-grid { display:grid; gap:7px; padding-top:4px; border-top:1px dashed rgba(107,30,45,.16); }
  .gd-detail-chip { display:flex; align-items:center; gap:9px; }
  .gd-detail-icon { width:26px; height:26px; flex:none; display:grid; place-items:center; border-radius:8px; background:#F7F3EB; color:#8F765B; }
  .gd-detail-chip small { display:block; color:#8F765B; font-size:8.5px; font-weight:900; text-transform:uppercase; }
  .gd-detail-chip strong { display:block; color:#4A0E1C; font-size:11.5px; font-weight:800; overflow-wrap:anywhere; }
  .gd-more {
    align-self:flex-start; margin-top: 2px; padding: 6px 13px; border-radius: 99px;
    background: rgba(107,30,45,0.08); border: 1px solid rgba(107,30,45,0.24);
    color: #6B1E2D; font-family: inherit; font-size: 10.5px; font-weight: 800; cursor: pointer;
    transition: .15s;
  }
  .gd-more:hover { background: rgba(107,30,45,0.16); border-color:rgba(107,30,45,.4); }

  .gd-muted, .gd-activities-empty, .gd-empty {
    min-height: 120px; display: flex; flex-direction:column; align-items: center; justify-content: center; gap:8px; text-align: center;
    border: 1px dashed rgba(107,30,45,0.24); border-radius: 15px; background:#F7F3EB; color: #8F765B; font-size: 12.5px; font-weight: 800; padding: 24px;
  }
  .gd-activities-empty { min-height: 150px; }

  /* ── Assessment cards ── */
  .gd-assess-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 12px; }
  .gd-assess-card { position:relative; display: flex; flex-direction: column; gap: 9px; padding: 17px 19px; background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1px solid rgba(107,30,45,0.14); border-radius: 16px; text-decoration: none; color: inherit; transition: all .18s; overflow:hidden; }
  .gd-assess-card:before { content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width:4px; background:#8F765B; }
  .gd-assess-card-OPEN:before { background:#1B5E20; }
  .gd-assess-card:hover { transform: translateY(-3px); border-color: #B8A082; box-shadow: 0 16px 32px rgba(107,30,45,0.14); }
  .gd-assess-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
  .gd-assess-tag { display:inline-flex; align-items:center; gap:5px; font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 99px; letter-spacing: .02em; }
  .gd-assess-OPEN   { background: rgba(27,94,32,0.12); color: #1B5E20; }
  .gd-assess-CLOSED { background: rgba(26,26,26,0.07);  color: #655B53; }
  .gd-assess-date { font-size: 10.5px; color: #8F765B; font-weight: 700; }
  .gd-assess-title { font-size: 15px; font-weight: 900; color: #32101A; margin: 0; line-height: 1.4; }
  .gd-assess-open { display:inline-flex; align-items:center; gap:4px; font-size: 11.5px; font-weight: 900; color: #6B1E2D; margin-top: auto; padding-top: 4px; }
  [dir="rtl"] .gd-assess-open svg { transform: scaleX(-1); }

  /* ── Community ── */
  .gd-composer { display: flex; flex-direction: column; gap: 10px; padding: 14px; margin-bottom: 14px; border-radius: 15px; background: rgba(107,30,45,0.04); border: 1px solid rgba(107,30,45,0.14); }
  .gd-composer textarea { width: 100%; border: 1.5px solid rgba(107,30,45,0.18); border-radius: 12px; background: #FFF; padding: 11px 13px; font-family: inherit; font-size: 13.5px; line-height: 1.7; resize: vertical; outline: none; }
  .gd-composer textarea:focus { border-color: #B8A082; box-shadow: 0 0 0 3px rgba(107,30,45,0.08); }
  .gd-composer button { align-self: flex-end; display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 11px; padding: 10px 18px; background: linear-gradient(135deg,#4A0E1C,#6B1E2D); color: #F7F3EB; font-family: inherit; font-size: 13px; font-weight: 900; cursor: pointer; transition:.15s; }
  .gd-composer button:hover:not(:disabled) { box-shadow:0 8px 18px rgba(107,30,45,.25); }
  .gd-composer button:disabled { opacity: 0.45; cursor: not-allowed; }
  .gd-ann-list { display: flex; flex-direction: column; gap: 9px; }
  .gd-ann { display: flex; gap: 11px; padding: 14px; border: 1px solid rgba(107,30,45,0.14); border-radius: 14px; background: #FFF; transition:.15s; }
  .gd-ann:hover { border-color:rgba(107,30,45,.28); }
  .gd-ann-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(150deg,#6B1E2D,#32101A); color: #D9C9B0; font-size: 10.5px; font-weight: 900; }
  .gd-ann-body { flex: 1; min-width: 0; }
  .gd-ann-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
  .gd-ann-meta strong { font-size: 12.5px; color: #32101A; }
  .gd-ann-meta span { font-size: 10.5px; color: #8F765B; font-weight: 800; }
  .gd-ann p { margin: 0; color: #4A0E1C; font-size: 13px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
  .gd-ann-delete { width: 30px; height: 30px; border-radius: 9px; border: 1px solid rgba(107,30,45,0.18); background: rgba(107,30,45,0.05); color: #6B1E2D; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition:.15s; }
  .gd-ann-delete:hover:not(:disabled) { background:rgba(107,30,45,.14); }
  .gd-ann-delete:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 640px) {
    .gd-page { padding: 16px; }
    .gd-hero { padding: 22px 20px; flex-direction:column; align-items:flex-start; }
    .gd-title { font-size: 21px; }
    .gd-hero-stats { width:100%; }
    .gd-hero-stat { flex:1; }
    .gd-members { grid-template-columns: 1fr; }
    .gd-hub { grid-template-columns:1fr; }
    .gd-section { padding:16px; border-radius:18px; }
  }
  @media (min-width:641px) and (max-width:900px){.gd-hub{grid-template-columns:1fr 1fr}.gd-hub-primary{grid-column:1/-1}}
`;
