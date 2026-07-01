"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Network, Users, ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

type TeacherGroup = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  joined_at: string;
  member_count: number;
};

const UI = {
  ar: {
    title: "مجموعاتي",
    sub: "المجتمعات الخاصة التي أضافك إليها مدير المدرسة.",
    count: "مجموعة",
    members: "أعضاء",
    open: "فتح المجموعة",
    search: "ابحث في المجموعات...",
    noResults: "لا توجد مجموعات مطابقة للبحث.",
    emptyTitle: "لا توجد مجموعات بعد",
    emptySub: "عندما يضيفك مدير المدرسة إلى مجموعة، ستظهر هنا.",
  },
  sq: {
    title: "Grupet e mia",
    sub: "Komunitetet private ku administratori i shkollës ju ka shtuar.",
    count: "grupe",
    members: "anëtarë",
    open: "Hap grupin",
    search: "Kërko në grupe...",
    noResults: "Nuk ka grupe që përputhen me kërkimin.",
    emptyTitle: "Nuk ka grupe ende",
    emptySub: "Kur administratori ju shton në një grup, ai do të shfaqet këtu.",
  },
} as const;

export default function TeacherGroupsPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/teacher/groups", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGroups(Array.isArray(d?.groups) ? d.groups : []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) =>
      [group.name, group.description ?? ""].some((value) => value.toLowerCase().includes(q)),
    );
  }, [groups, query]);

  if (loading) {
    return (
      <div className="tg-page" dir={dir}>
        <div className="tg-loading"><MandalaLoader /></div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="tg-page" dir={dir}>
      <header className="tg-head">
        <div className="tg-title-block">
          <span className="tg-mark"><Network size={18} strokeWidth={1.8} /></span>
          <div>
            <h1 className="tg-title">{T.title}</h1>
            <p className="tg-sub">{T.sub}</p>
          </div>
        </div>
        <div className="tg-count">
          <strong>{groups.length}</strong>
          <span>{T.count}</span>
        </div>
      </header>

      {groups.length > 0 && (
        <div className="tg-filter">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.search} />
        </div>
      )}

      {groups.length === 0 ? (
        <section className="tg-empty">
          <Network size={34} strokeWidth={1.4} />
          <h2>{T.emptyTitle}</h2>
          <p>{T.emptySub}</p>
        </section>
      ) : visibleGroups.length === 0 ? (
        <section className="tg-empty">
          <Network size={34} strokeWidth={1.4} />
          <h2>{T.noResults}</h2>
        </section>
      ) : (
        <section className="tg-grid">
          {visibleGroups.map((group) => (
            <Link key={group.id} href={`/teacher/groups/${group.id}`} className="tg-card">
              <div className="tg-card-top">
                <span className="tg-card-icon"><Users size={17} strokeWidth={1.7} /></span>
                <span className="tg-open"><ArrowUpRight size={16} strokeWidth={1.8} /></span>
              </div>
              <h2 className="tg-card-title">{group.name}</h2>
              <p className="tg-card-desc">{group.description || " "}</p>
              <div className="tg-card-foot">
                <span>{group.member_count} {T.members}</span>
                <span>{T.open}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  .tg-page { min-height: 100%; padding: 28px; background: #F6F4EE; font-family: 'Cairo', sans-serif; color: #0B0B0C; }
  .tg-loading { min-height: 50vh; display: flex; align-items: center; justify-content: center; }
  .tg-head {
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    padding: 22px 24px; margin-bottom: 18px; border-radius: 18px;
    background: #0B0B0C; border: 1px solid rgba(200,169,106,0.14);
  }
  .tg-title-block { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .tg-mark {
    width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
    background: rgba(200,169,106,0.12); color: #C8A96A; border: 1px solid rgba(200,169,106,0.22); flex-shrink: 0;
  }
  .tg-title { margin: 0 0 4px; font-size: 23px; font-weight: 900; color: #C8A96A; }
  .tg-sub { margin: 0; font-size: 13.5px; line-height: 1.7; color: rgba(232,220,188,0.72); }
  .tg-count {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 10px 18px; border-radius: 12px; background: rgba(200,169,106,0.08); border: 1px solid rgba(200,169,106,0.16);
  }
  .tg-count strong { font-size: 25px; line-height: 1; color: #C8A96A; }
  .tg-count span { font-size: 11.5px; font-weight: 700; color: rgba(232,220,188,0.64); }
  .tg-filter { margin: 0 0 16px; }
  .tg-filter input {
    width: min(520px, 100%); border: 1.5px solid rgba(184,155,94,0.24); border-radius: 14px;
    background: #FFFDF8; padding: 12px 15px; font: inherit; font-size: 14px; outline: none;
    box-shadow: 0 10px 24px rgba(8,11,12,0.04);
  }
  .tg-filter input:focus { border-color: rgba(184,155,94,0.62); box-shadow: 0 0 0 4px rgba(184,155,94,0.10); }
  .tg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .tg-card {
    display: flex; flex-direction: column; min-height: 190px; padding: 17px; text-decoration: none;
    background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 12px;
    transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .tg-card:hover { transform: translateY(-2px); border-color: rgba(184,155,94,0.55); box-shadow: 0 10px 24px rgba(8,11,12,0.08); }
  .tg-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
  .tg-card-icon { width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: #0B0B0C; color: #C8A96A; }
  .tg-open { color: #B89B5E; }
  .tg-card-title { margin: 0 0 8px; font-size: 16px; font-weight: 900; color: #1B1810; }
  .tg-card-desc { margin: 0; color: #625A4E; font-size: 13px; line-height: 1.7; flex: 1; }
  .tg-card-foot { display: flex; justify-content: space-between; gap: 10px; margin-top: 16px; color: #8B6915; font-size: 12px; font-weight: 800; }
  .tg-empty {
    min-height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    text-align: center; border: 1px dashed rgba(184,155,94,0.34); border-radius: 14px; background: #FFFDF8; color: #9A8A70; padding: 32px;
  }
  .tg-empty h2 { margin: 0; color: #1B1810; font-size: 17px; font-weight: 900; }
  .tg-empty p { margin: 0; max-width: 360px; font-size: 13.5px; line-height: 1.8; }
  @media (max-width: 640px) {
    .tg-page { padding: 16px; }
    .tg-head { padding: 18px; }
    .tg-title { font-size: 20px; }
  }
`;
