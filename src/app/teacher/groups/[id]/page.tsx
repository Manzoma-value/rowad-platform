"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Languages, MapPin, Network, UserRound, Users } from "lucide-react";
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

const UI = {
  ar: {
    back: "العودة للمجموعات",
    members: "الأعضاء",
    overview: "نظرة عامة",
    activities: "أنشطة المجموعة",
    emptyActivities: "لم تتم إضافة أنشطة لهذه المجموعة بعد.",
    noMembers: "لا يوجد أعضاء في هذه المجموعة بعد.",
    qualification: "المؤهل",
    specialization: "التخصص",
    experience: "الخبرة",
    languages: "اللغات",
    location: "الموقع",
    unavailable: "غير متوفر",
    notFound: "تعذر فتح هذه المجموعة.",
  },
  sq: {
    back: "Kthehu te grupet",
    members: "Anëtarët",
    overview: "Përmbledhje",
    activities: "Aktivitetet e grupit",
    emptyActivities: "Nuk ka aktivitete të shtuara për këtë grup ende.",
    noMembers: "Ky grup nuk ka anëtarë ende.",
    qualification: "Kualifikimi",
    specialization: "Specializimi",
    experience: "Përvoja",
    languages: "Gjuhët",
    location: "Vendndodhja",
    unavailable: "Nuk disponohet",
    notFound: "Ky grup nuk mund të hapet.",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
  }, [params?.id]);

  const memberCount = group?.members.length ?? 0;
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
          <div className="gd-members">
            {group.members.map((member) => {
              const app = member.teacher.application;
              const languages = normalizeLanguages(app?.languages, L);
              return (
                <article key={member.teacher.id} className="gd-member">
                  <div className="gd-avatar">{initials.get(member.teacher.id) || <UserRound size={18} />}</div>
                  <div className="gd-member-body">
                    <h3>{member.teacher.profile.full_name}</h3>
                    <div className="gd-facts">
                      <Fact icon={<MapPin size={14} />} label={T.location} value={app ? joinParts([app.country, app.city]) : T.unavailable} />
                      <Fact label={T.specialization} value={app?.specialization || T.unavailable} />
                      <Fact label={T.qualification} value={labelFor(QUAL, app?.qualification, L, T.unavailable)} />
                      <Fact label={T.experience} value={labelFor(EXP, app?.years_of_experience, L, T.unavailable)} />
                      <Fact icon={<Languages size={14} />} label={T.languages} value={languages || T.unavailable} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="gd-section">
        <div className="gd-section-head">
          <Network size={18} strokeWidth={1.7} />
          <h2>{T.activities}</h2>
        </div>
        <div className="gd-activities-empty">{T.emptyActivities}</div>
      </section>

      <style>{styles}</style>
    </div>
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
  .gd-muted, .gd-activities-empty, .gd-empty {
    min-height: 120px; display: flex; align-items: center; justify-content: center; text-align: center;
    border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; color: #8A8478; font-size: 13.5px; font-weight: 800; padding: 24px;
  }
  .gd-activities-empty { min-height: 150px; background: rgba(194,160,89,0.04); }
  @media (max-width: 640px) {
    .gd-page { padding: 16px; }
    .gd-head { padding: 18px; }
    .gd-title { font-size: 20px; }
    .gd-members { grid-template-columns: 1fr; }
  }
`;
