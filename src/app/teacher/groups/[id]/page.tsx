"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Languages, MapPin, Network, Send, Trash2, UserRound, Users } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

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
    showMore: "المزيد ↓",
    showLess: "أقل ↑",
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
    showMore: "Më shumë ↓",
    showLess: "Më pak ↑",
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
        <div className="gd-empty">{T.notFound}</div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="gd-page" dir={dir}>
      <Link className="gd-back" href="/teacher/groups">
        <ArrowLeft size={15} /> {T.back}
      </Link>

      <header className="gd-head">
        <div className="gd-head-main">
          <span className="gd-mark"><Network size={20} strokeWidth={1.8} /></span>
          <div>
            <h1 className="gd-title">{group.name}</h1>
            <p className="gd-desc">{group.description || T.overview}</p>
          </div>
        </div>
        <div className="gd-stat">
          <strong>{memberCount}</strong>
          <span>{T.members}</span>
        </div>
      </header>

      <section className="gd-section">
        <div className="gd-section-head">
          <Users size={18} strokeWidth={1.7} />
          <h2>{T.members}</h2>
        </div>
        {group.members.length === 0 ? (
          <div className="gd-muted">{T.noMembers}</div>
        ) : (
          <>
            <div className="gd-filter">
              <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder={T.memberSearch} />
              <span>{visibleMembers.length} / {group.members.length}</span>
            </div>
            {visibleMembers.length === 0 ? (
              <div className="gd-muted">{T.noMemberResults}</div>
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
          <Network size={18} strokeWidth={1.7} />
          <h2>{T.assessments}</h2>
        </div>
        {assessments.length === 0 ? (
          <div className="gd-muted">{T.assessmentsEmpty}</div>
        ) : (
          <ul className="gd-assess-list">
            {assessments.map((a) => (
              <li key={a.id}>
                <Link href={`/teacher/groups/${params?.id}/assessments/${a.id}`} className="gd-assess-card">
                  <div className="gd-assess-meta">
                    <span className={`gd-assess-tag gd-assess-${a.status}`}>
                      {a.status === "OPEN" ? T.assessmentOpenStatus : T.assessmentClosed}
                    </span>
                    <span className="gd-assess-date">{new Date(a.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL")}</span>
                  </div>
                  <h3 className="gd-assess-title">{a.title}</h3>
                  <span className="gd-assess-open">{T.assessmentOpen} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="gd-section">
        <div className="gd-section-head">
          <Network size={18} strokeWidth={1.7} />
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
          <div className="gd-activities-empty">{T.emptyActivities}</div>
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

/** Group-member card. Shows only name + location + specialization by default;
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
  const location = app ? joinParts([app.country, app.city]) : T.unavailable;
  const specialization = app?.specialization || T.unavailable;
  return (
    <article className={`gd-member ${open ? "gd-member--open" : ""}`}>
      <div className="gd-avatar">{initial || <UserRound size={18} />}</div>
      <div className="gd-member-body">
        <h3>{member.teacher.profile.full_name}</h3>
        <div className="gd-facts">
          <Fact icon={<MapPin size={14} />} label={T.location} value={location} />
          <Fact label={T.specialization} value={specialization} />
          {open && (
            <>
              <Fact label={T.qualification} value={labelFor(QUAL, app?.qualification, L, T.unavailable)} />
              <Fact label={T.experience} value={labelFor(EXP, app?.years_of_experience, L, T.unavailable)} />
              <Fact icon={<Languages size={14} />} label={T.languages} value={normalizeLanguages(app?.languages, L) || T.unavailable} />
            </>
          )}
        </div>
        <button className="gd-more" onClick={() => setOpen((v) => !v)} type="button">
          {open ? T.showLess : T.showMore}
        </button>
      </div>
    </article>
  );
}

function Fact({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="gd-fact">
      <span className="gd-fact-label">{icon}{label}</span>
      <span className="gd-fact-value">{value}</span>
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
  .gd-page { min-height: 100%; padding: 28px; background: #F6F4EE; font-family: 'Cairo', sans-serif; color: #0B0B0C; }
  .gd-loading { min-height: 50vh; display: flex; align-items: center; justify-content: center; }
  .gd-back {
    display: inline-flex; align-items: center; gap: 7px; margin-bottom: 16px;
    color: #6B4F1E; text-decoration: none; font-size: 13px; font-weight: 900;
    border: 0; background: transparent; font-family: inherit; cursor: pointer;
  }
  [dir="rtl"] .gd-back svg { transform: scaleX(-1); }
  .gd-head {
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    padding: 24px; margin-bottom: 16px; background: #0B0B0C; border-radius: 18px; border: 1px solid rgba(200,169,106,0.14);
  }
  .gd-head-main { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .gd-mark {
    width: 46px; height: 46px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center;
    background: rgba(200,169,106,0.12); color: #C8A96A; border: 1px solid rgba(200,169,106,0.22); flex-shrink: 0;
  }
  .gd-title { margin: 0 0 5px; color: #C8A96A; font-size: 24px; font-weight: 900; }
  .gd-desc { margin: 0; max-width: 720px; color: rgba(232,220,188,0.72); font-size: 13.5px; line-height: 1.8; }
  .gd-stat {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 10px 18px; border-radius: 12px; background: rgba(200,169,106,0.08); border: 1px solid rgba(200,169,106,0.16);
  }
  .gd-stat strong { color: #C8A96A; font-size: 25px; line-height: 1; }
  .gd-stat span { color: rgba(232,220,188,0.64); font-size: 11.5px; font-weight: 800; }
  .gd-section { background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; padding: 18px; margin-bottom: 14px; }
  .gd-section-head { display: flex; align-items: center; gap: 9px; padding-bottom: 11px; margin-bottom: 14px; border-bottom: 1px solid rgba(194,160,89,0.18); color: #6B4F1E; }
  .gd-section-head h2 { margin: 0; font-size: 15px; font-weight: 900; color: #6B4F1E; }
  .gd-filter { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; }
  .gd-filter input {
    flex: 1; min-width: 0; border: 1.5px solid rgba(194,160,89,0.24); border-radius: 12px;
    background: #FFF; padding: 10px 13px; font: inherit; font-size: 13px; outline: none;
  }
  .gd-filter input:focus { border-color: #B89B5E; box-shadow: 0 0 0 3px rgba(194,160,89,0.10); }
  .gd-filter span { color: #8B6915; font-size: 12px; font-weight: 900; white-space: nowrap; }
  .gd-members { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .gd-member { display: flex; gap: 12px; padding: 14px; border: 1px solid rgba(194,160,89,0.22); border-radius: 12px; background: linear-gradient(165deg,#FFFFFF,#FFFDF8); }
  .gd-avatar {
    width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    background: #0B0B0C; color: #C8A96A; border: 1px solid rgba(200,169,106,0.22); font-size: 12px; font-weight: 900;
  }
  .gd-member-body { min-width: 0; flex: 1; }
  .gd-member h3 { margin: 0 0 10px; font-size: 14.5px; font-weight: 900; color: #1B1810; }
  .gd-facts { display: grid; gap: 7px; }
  .gd-fact { display: grid; gap: 2px; }
  .gd-fact-label { display: inline-flex; align-items: center; gap: 5px; color: #8A7B60; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .gd-fact-value { color: #2E2210; font-size: 12.5px; font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
  .gd-more {
    margin-top: 10px; padding: 5px 12px; border-radius: 99px;
    background: rgba(194,160,89,0.10); border: 1px solid rgba(184,155,94,0.32);
    color: #6B4F1E; font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer;
    transition: background .15s;
  }
  .gd-more:hover { background: rgba(194,160,89,0.20); }
  .gd-muted, .gd-activities-empty, .gd-empty {
    min-height: 120px; display: flex; align-items: center; justify-content: center; text-align: center;
    border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; color: #8A8478; font-size: 13.5px; font-weight: 800; padding: 24px;
  }
  .gd-activities-empty { min-height: 150px; background: rgba(194,160,89,0.04); }
  .gd-assess-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 12px; }
  .gd-assess-card { display: flex; flex-direction: column; gap: 8px; padding: 16px 18px; background: linear-gradient(165deg,#FCF6E6,#F4EBD3); border: 1.5px solid rgba(184,155,94,0.40); border-radius: 13px; text-decoration: none; color: inherit; transition: all .18s; }
  .gd-assess-card:hover { transform: translateY(-2px); border-color: #B89B5E; box-shadow: 0 10px 26px rgba(150,115,50,0.16); }
  .gd-assess-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
  .gd-assess-tag { font-size: 10.5px; font-weight: 800; padding: 3px 10px; border-radius: 99px; letter-spacing: .04em; }
  .gd-assess-OPEN   { background: rgba(76,107,60,0.14); color: #4C6B3C; }
  .gd-assess-CLOSED { background: rgba(8,11,12,0.08);  color: #5E5A52; }
  .gd-assess-date { font-size: 11.5px; color: #8B6915; font-weight: 700; }
  .gd-assess-title { font-size: 15px; font-weight: 900; color: #1B1810; margin: 0; line-height: 1.4; }
  .gd-assess-open { font-size: 12px; font-weight: 800; color: #6B4F1E; margin-top: auto; padding-top: 4px; }
  .gd-composer { display: flex; flex-direction: column; gap: 10px; padding: 12px; margin-bottom: 14px; border-radius: 12px; background: rgba(194,160,89,0.04); border: 1px solid rgba(194,160,89,0.16); }
  .gd-composer textarea { width: 100%; border: 1.5px solid rgba(194,160,89,0.20); border-radius: 10px; background: #FFF; padding: 11px 13px; font-family: inherit; font-size: 13.5px; line-height: 1.7; resize: vertical; outline: none; }
  .gd-composer textarea:focus { border-color: #B89B5E; box-shadow: 0 0 0 3px rgba(194,160,89,0.08); }
  .gd-composer button { align-self: flex-end; display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 10px; padding: 9px 16px; background: #0B0B0C; color: #C8A96A; font-family: inherit; font-size: 13px; font-weight: 900; cursor: pointer; }
  .gd-composer button:disabled { opacity: 0.45; cursor: not-allowed; }
  .gd-ann-list { display: flex; flex-direction: column; gap: 9px; }
  .gd-ann { display: flex; gap: 11px; padding: 13px; border: 1px solid rgba(194,160,89,0.18); border-radius: 12px; background: #FFF; }
  .gd-ann-avatar { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #0B0B0C; color: #C8A96A; font-size: 10px; font-weight: 900; }
  .gd-ann-body { flex: 1; min-width: 0; }
  .gd-ann-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
  .gd-ann-meta strong { font-size: 13px; color: #1B1810; }
  .gd-ann-meta span { font-size: 11.5px; color: #8A7B60; font-weight: 800; }
  .gd-ann p { margin: 0; color: #2E2210; font-size: 13.5px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
  .gd-ann-delete { width: 30px; height: 30px; border-radius: 9px; border: 1px solid rgba(139,26,26,0.20); background: rgba(139,26,26,0.06); color: #7A1E1E; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .gd-ann-delete:disabled { opacity: 0.45; cursor: not-allowed; }
  @media (max-width: 640px) {
    .gd-page { padding: 16px; }
    .gd-head { padding: 18px; }
    .gd-title { font-size: 20px; }
    .gd-members { grid-template-columns: 1fr; }
  }
`;
