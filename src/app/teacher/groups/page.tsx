"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Network, Users, ArrowUpRight, Crown, DoorOpen, LockKeyhole, Sparkles } from "lucide-react";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";

type TeacherGroup = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  joined_at: string;
  member_count: number;
  max_members: number;
  available_seats: number;
  is_full: boolean;
  is_member: boolean;
  leader: { id: string | null; name: string } | null;
};

const UI = {
  ar: {
    title: "مجموعاتي",
    sub: "المجتمعات الخاصة التي أضافك إليها مدير المنصة.",
    count: "مجموعة",
    members: "أعضاء",
    open: "فتح المجموعة",
    search: "ابحث في المجموعات...",
    noResults: "لا توجد مجموعات مطابقة للبحث.",
    emptyTitle: "لا توجد مجموعات بعد",
    emptySub: "عندما يضيفك مدير المنصة إلى مجموعة، ستظهر هنا.",
    opening: "جارٍ فتح مجموعتك…",
    chooseTitle: "اختر مجموعتك",
    chooseSub: "أنت غير منضم إلى مجموعة بعد. اختر المجموعة الأنسب لك، وسيتم تثبيت عضويتك فوراً.",
    chooseNote: "يمكن الانضمام إلى مجموعة واحدة فقط. يستطيع مدير المنصة تعديل عضويتك لاحقاً عند الحاجة.",
    join: "الانضمام إلى المجموعة",
    joining: "جارٍ تثبيت عضويتك…",
    seats: (available: number, total: number) => `${available} مقعد متاح من ${total}`,
    full: "اكتملت المقاعد",
    leader: "قائد المجموعة",
    noLeader: "سيُحدد القائد لاحقاً",
    confirmJoin: (name: string) => `هل تريد الانضمام إلى «${name}»؟ ستصبح هذه مجموعتك الأساسية.`,
    joinError: "تعذر الانضمام الآن. حدّث الصفحة وحاول مرة أخرى.",
    seatChanged: "تم حجز آخر مقعد للتو. اختر مجموعة أخرى.",
  },
  sq: {
    title: "Grupet e mia",
    sub: "Komunitetet private ku administratori i platformës ju ka shtuar.",
    count: "grupe",
    members: "anëtarë",
    open: "Hap grupin",
    search: "Kërko në grupe...",
    noResults: "Nuk ka grupe që përputhen me kërkimin.",
    emptyTitle: "Nuk ka grupe ende",
    emptySub: "Kur administratori ju shton në një grup, ai do të shfaqet këtu.",
    opening: "Po hapim grupin tënd…",
    chooseTitle: "Zgjidh grupin tënd",
    chooseSub: "Ende nuk je pjesë e një grupi. Zgjidh grupin që të përshtatet dhe anëtarësimi do të konfirmohet menjëherë.",
    chooseNote: "Mund të bashkohesh vetëm me një grup. Administratori mund ta ndryshojë anëtarësimin më vonë.",
    join: "Bashkohu me grupin",
    joining: "Po konfirmojmë anëtarësimin…",
    seats: (available: number, total: number) => `${available} vende të lira nga ${total}`,
    full: "Grupi është plot",
    leader: "Drejtuesi i grupit",
    noLeader: "Drejtuesi caktohet më vonë",
    confirmJoin: (name: string) => `Të bashkohesh me “${name}”? Ky do të bëhet grupi yt kryesor.`,
    joinError: "Nuk u bashkove dot tani. Rifresko dhe provo përsëri.",
    seatChanged: "Vendi i fundit sapo u rezervua. Zgjidh një grup tjetër.",
  },
} as const;

export default function TeacherGroupsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [needsSelection, setNeedsSelection] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");

  const loadGroups = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/teacher/groups", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        setGroups(Array.isArray(d?.groups) ? d.groups : []);
        setNeedsSelection(d?.needs_group_selection === true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(loadGroups);
    return () => cancelAnimationFrame(frame);
  }, [loadGroups]);

  useEffect(() => {
    if (!loading && !loadError && !needsSelection && groups.length === 1 && groups[0].is_member) {
      router.replace(`/teacher/groups/${groups[0].id}`);
    }
  }, [groups, loadError, loading, needsSelection, router]);

  async function joinGroup(group: TeacherGroup) {
    if (group.is_full || joiningId) return;
    const approved = await confirm({
      title: T.chooseTitle,
      message: T.confirmJoin(group.name),
      confirmText: T.join,
      cancelText: L === "ar" ? "إلغاء" : "Anulo",
      variant: "normal",
    });
    if (!approved) return;
    setJoiningId(group.id);
    setJoinError("");
    try {
      const response = await fetch(`/api/teacher/groups/${group.id}/join`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setJoinError(result?.error === "group_full" || result?.error === "seat_changed_retry" ? T.seatChanged : T.joinError);
        await loadGroups();
        return;
      }
      router.replace(`/teacher/groups/${group.id}`);
    } catch {
      setJoinError(T.joinError);
    } finally {
      setJoiningId(null);
    }
  }

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
  if (loadError) return <TeacherLoadError onRetry={loadGroups} />;
  if (!needsSelection && groups.length === 1 && groups[0].is_member) {
    return (
      <div className="tg-page" dir={dir}>
        <div className="tg-opening"><MandalaLoader /><strong>{T.opening}</strong></div>
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
            <h1 className="tg-title">{needsSelection ? T.chooseTitle : T.title}</h1>
            <p className="tg-sub">{needsSelection ? T.chooseSub : T.sub}</p>
          </div>
        </div>
        <div className="tg-count">
          <strong>{groups.length}</strong>
          <span>{T.count}</span>
        </div>
      </header>

      {needsSelection && (
        <div className="tg-choice-note"><Sparkles size={16} /><span>{T.chooseNote}</span></div>
      )}
      {joinError && <div className="tg-error" role="alert">{joinError}</div>}

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
          {visibleGroups.map((group) => needsSelection ? (
            <article key={group.id} className={`tg-card tg-choice-card${group.is_full ? " full" : ""}`}>
              <div className="tg-card-top">
                <span className="tg-card-icon"><Users size={17} strokeWidth={1.7} /></span>
                <span className={`tg-seat-badge${group.is_full ? " full" : ""}`}>
                  {group.is_full ? <LockKeyhole size={13} /> : <DoorOpen size={13} />}
                  {group.is_full ? T.full : T.seats(group.available_seats, group.max_members)}
                </span>
              </div>
              <h2 className="tg-card-title">{group.name}</h2>
              <p className="tg-card-desc">{group.description || " "}</p>
              <div className="tg-leader"><Crown size={14} /><span><small>{T.leader}</small><strong>{group.leader?.name || T.noLeader}</strong></span></div>
              <div className="tg-card-foot">
                <span>{group.member_count} {T.members}</span>
                <span>{group.max_members}</span>
              </div>
              <button className="tg-join" onClick={() => void joinGroup(group)} disabled={group.is_full || joiningId !== null}>
                {joiningId === group.id ? T.joining : group.is_full ? T.full : T.join}
                {!group.is_full && joiningId !== group.id && <ArrowUpRight size={16} />}
              </button>
            </article>
          ) : (
            <Link key={group.id} href={`/teacher/groups/${group.id}`} className="tg-card">
              <div className="tg-card-top"><span className="tg-card-icon"><Users size={17} strokeWidth={1.7} /></span><span className="tg-open"><ArrowUpRight size={16} strokeWidth={1.8} /></span></div>
              <h2 className="tg-card-title">{group.name}</h2><p className="tg-card-desc">{group.description || " "}</p>
              <div className="tg-card-foot"><span>{group.member_count} {T.members}</span><span>{T.open}</span></div>
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
  .tg-page { min-height: 100%; padding: 28px; background: #EFEAE0; font-family: 'Cairo', sans-serif; color: #1A1A1A; }
  .tg-loading { min-height: 50vh; display: flex; align-items: center; justify-content: center; }
  .tg-opening { min-height: 56vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #6B1E2D; }
  .tg-opening strong { font-size: 14px; }
  .tg-head {
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    padding: 22px 24px; margin-bottom: 18px; border-radius: 18px;
    background: #1A1A1A; border: 1px solid rgba(184,160,130,0.14);
  }
  .tg-title-block { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .tg-mark {
    width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
    background: rgba(184,160,130,0.12); color: #B8A082; border: 1px solid rgba(184,160,130,0.22); flex-shrink: 0;
  }
  .tg-title { margin: 0 0 4px; font-size: 23px; font-weight: 900; color: #B8A082; }
  .tg-sub { margin: 0; font-size: 13.5px; line-height: 1.7; color: rgba(255,251,245,0.72); }
  .tg-count {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 10px 18px; border-radius: 12px; background: rgba(184,160,130,0.08); border: 1px solid rgba(184,160,130,0.16);
  }
  .tg-count strong { font-size: 25px; line-height: 1; color: #B8A082; }
  .tg-count span { font-size: 11.5px; font-weight: 700; color: rgba(255,251,245,0.64); }
  .tg-filter { margin: 0 0 16px; }
  .tg-choice-note,.tg-error { display:flex; align-items:center; gap:9px; margin:0 0 14px; border-radius:13px; padding:11px 13px; font-size:12px; font-weight:800; }
  .tg-choice-note { border:1px solid rgba(107,30,45,.14); background:#FFFBF5; color:#655B53; }
  .tg-choice-note svg { color:#6B1E2D; flex:none; }
  .tg-error { border:1px solid rgba(107,30,45,.25); background:rgba(107,30,45,.07); color:#6B1E2D; }
  .tg-filter input {
    width: min(520px, 100%); border: 1.5px solid rgba(107,30,45,0.24); border-radius: 14px;
    background: #FFFBF5; padding: 12px 15px; font: inherit; font-size: 14px; outline: none;
    box-shadow: 0 10px 24px rgba(26,26,26,0.04);
  }
  .tg-filter input:focus { border-color: rgba(107,30,45,0.62); box-shadow: 0 0 0 4px rgba(107,30,45,0.10); }
  .tg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .tg-card {
    display: flex; flex-direction: column; min-height: 190px; padding: 17px; text-decoration: none;
    background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 12px;
    transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .tg-card:hover { transform: translateY(-2px); border-color: rgba(107,30,45,0.55); box-shadow: 0 10px 24px rgba(26,26,26,0.08); }
  .tg-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
  .tg-card-icon { width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: #1A1A1A; color: #B8A082; }
  .tg-open { color: #B8A082; }
  .tg-card-title { margin: 0 0 8px; font-size: 16px; font-weight: 900; color: #32101A; }
  .tg-card-desc { margin: 0; color: #655B53; font-size: 13px; line-height: 1.7; flex: 1; }
  .tg-card-foot { display: flex; justify-content: space-between; gap: 10px; margin-top: 16px; color: #8F765B; font-size: 12px; font-weight: 800; }
  .tg-choice-card { min-height:260px; }
  .tg-choice-card.full { opacity:.72; }
  .tg-seat-badge { display:inline-flex; align-items:center; gap:5px; border-radius:999px; background:rgba(27,94,32,.09); padding:5px 8px; color:#1B5E20; font-size:9.5px; font-weight:900; }
  .tg-seat-badge.full { background:rgba(107,30,45,.09); color:#6B1E2D; }
  .tg-leader { display:flex; align-items:center; gap:8px; margin-top:12px; border-radius:11px; background:#F7F3EB; padding:9px 10px; color:#6B1E2D; }
  .tg-leader>span { min-width:0; display:flex; flex-direction:column; }
  .tg-leader small { color:#8F765B; font-size:8.5px; font-weight:900; }
  .tg-leader strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10.5px; }
  .tg-join { width:100%; display:flex; align-items:center; justify-content:center; gap:7px; margin-top:12px; border:0; border-radius:11px; background:#6B1E2D; padding:11px; color:#FFF; font:900 11.5px 'Cairo',sans-serif; cursor:pointer; }
  .tg-join:disabled { opacity:.48; cursor:not-allowed; }
  .tg-empty {
    min-height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    text-align: center; border: 1px dashed rgba(107,30,45,0.34); border-radius: 14px; background: #FFFBF5; color: #796A62; padding: 32px;
  }
  .tg-empty h2 { margin: 0; color: #32101A; font-size: 17px; font-weight: 900; }
  .tg-empty p { margin: 0; max-width: 360px; font-size: 13.5px; line-height: 1.8; }
  @media (max-width: 640px) {
    .tg-page { padding: 16px; }
    .tg-head { padding: 18px; }
    .tg-title { font-size: 20px; }
  }
`;
