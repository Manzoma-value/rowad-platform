"use client";
export const dynamic = "force-dynamic";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import TraitSpectrumBlob from "@/components/TraitSpectrumBlob";
import { seedFromString } from "@/lib/trait-spectrum";
import { ASSESS_UI, derive, averageTuples, pickAssessLang } from "@/lib/rowad-assessment";
import {
  useAssessmentData, traitLabel, membersSelfFirst,
  type Member, type Given,
} from "./useAssessmentData";

const UI = {
  ar: {
    back: "← العودة للمجموعة",
    locked: "هذا التقييم مغلق — العرض فقط.",
    sectionRate: "تقييم أعضاء المجموعة",
    sectionRateSub: "اختر عضوًا من القائمة أدناه لبدء تقييمه. توزّع 100 نقطة بالضبط لكل عضو، وليست هذه القراءة درجة نجاح أو حكمًا نهائيًا.",
    searchPlaceholder: "ابحث عن عضو بالاسم...",
    filterAll: "الكل",
    filterRated: "تم تقييمهم",
    filterPending: "بانتظار التقييم",
    noResults: "لا يوجد عضو مطابق للبحث.",
    targetSelf: "أنا",
    ratedBadge: "تم التقييم",
    pendingBadge: "لم يُقيَّم بعد",
    lastRated: "آخر تحديث",
    dominant: "الأبرز",
    rateBtn: "بدء التقييم",
    editBtn: "تعديل التقييم",
    rateSelfBtn: "قيّم نفسك",
    sectionMine: "ما تلقّيته من تقييمات",
    average: "المتوسط",
    averageOf: (n: number) => `متوسط ${n} تقييم${n === 1 ? "" : "ات"}`,
    raterCol: "المُقَيِّم",
    tableHelp: "كل صف يمثّل تقييم شخص لك. الصف العلوي هو متوسط الكل.",
    collectiveTitle: "طيف المجموعات",
    collectiveSub: "هذه قراءة جماعية حيّة؛ ترى طيف مجموعتك، طيف المجموعة الأخرى، والطيف العام دون كشف تقييمات الأفراد.",
    overall: "الطيف العام لكل المشرفين",
    completion: "اكتمال القراءات",
    ratingsOf: (done: number, total: number) => `${done} من ${total}`,
    noCollective: "سيظهر الطيف بعد وصول أول تقييم مكتمل.",
    earlyNote: "السمات الثلاث الأخيرة مؤشرات ملاحظة مبكرة تُنمّى تدريجياً وليست حكماً نهائياً.",
    progressTitle: "تقدمك في التقييم",
    completed: "مكتمل",
    pending: "متبقي",
    receivedCount: "تقييمات وصلتك",
    coreNow: "القراءة الحالية",
    noCoreYet: "لا توجد قراءة بعد",
    loadError: "تعذّر تحميل التقييم.",
    showSpectrumDetails: "عرض تفاصيل الطيف",
    hideSpectrumDetails: "إخفاء التفاصيل",
  },
  sq: {
    back: "← Kthehu te grupi",
    locked: "Ky vlerësim është i mbyllur — vetëm shikim.",
    sectionRate: "Vlerëso anëtarët e grupit",
    sectionRateSub: "Zgjidh një anëtar nga lista më poshtë për ta vlerësuar. Shpërndaj saktësisht 100 pikë për secilin; kjo nuk është notë suksesi apo gjykim përfundimtar.",
    searchPlaceholder: "Kërko anëtar me emër...",
    filterAll: "Të gjithë",
    filterRated: "Të vlerësuar",
    filterPending: "Në pritje",
    noResults: "Nuk u gjet anëtar me këtë kërkim.",
    targetSelf: "Unë",
    ratedBadge: "U vlerësua",
    pendingBadge: "Ende pa vlerësim",
    lastRated: "Përditësimi i fundit",
    dominant: "Kryesori",
    rateBtn: "Fillo vlerësimin",
    editBtn: "Ndrysho vlerësimin",
    rateSelfBtn: "Vlerëso veten",
    sectionMine: "Vlerësimet që ke marrë",
    average: "Mesatarja",
    averageOf: (n: number) => `Mesatare e ${n} vlerësime`,
    raterCol: "Vlerësuesi",
    tableHelp: "Çdo rresht është një vlerësim që dikush ka dhënë për ty. Rreshti i parë është mesatarja.",
    collectiveTitle: "Spektri i grupeve",
    collectiveSub: "Ky është një lexim i përbashkët në kohë reale: spektri i grupit tënd, grupit tjetër dhe spektri i përgjithshëm pa zbuluar vlerësimet individuale.",
    overall: "Spektri i përgjithshëm i edukatorëve",
    completion: "Përfundimi i leximeve",
    ratingsOf: (done: number, total: number) => `${done} nga ${total}`,
    noCollective: "Spektri shfaqet pas vlerësimit të parë të plotë.",
    earlyNote: "Tre tiparet e fundit janë tregues të hershëm vëzhgimi që zhvillohen gradualisht, jo gjykime përfundimtare.",
    progressTitle: "Progresi yt",
    completed: "Te plota",
    pending: "Te mbetura",
    receivedCount: "Vleresime te marra",
    coreNow: "Leximi aktual",
    noCoreYet: "Ende pa lexim",
    loadError: "Vlerësimi nuk u ngarkua.",
    showSpectrumDetails: "Shfaq detajet e spektrit",
    hideSpectrumDetails: "Fshih detajet",
  },
} as const;

function formatDate(value: string, lang: "ar" | "sq") {
  return new Date(value).toLocaleDateString(
    lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

function MemberCard({
  member, given, traitMeta, lang, T, onOpen,
}: {
  member: Member;
  given: Given | undefined;
  traitMeta: { label: string; color: string }[];
  lang: "ar" | "sq";
  T: {
    targetSelf: string; ratedBadge: string; pendingBadge: string;
    dominant: string; lastRated: string; editBtn: string; rateBtn: string; rateSelfBtn: string;
  };
  onOpen: () => void;
}) {
  const rated = !!given;
  const spectrumTraits = useMemo(
    () => traitMeta.map((t, i) => ({ label: t.label, color: t.color, pct: given?.scores[i] ?? 0 })),
    [traitMeta, given],
  );
  const dominance = useMemo(() => rated ? derive(given!.scores) : null, [rated, given]);
  const dominantLabel = dominance
    ? (dominance.hasCore && dominance.coreIdx !== null ? traitMeta[dominance.coreIdx]?.label : traitMeta[dominance.connectingIdx]?.label)
    : null;

  return (
    <article className={`mc-card ${rated ? "rated" : "pending"} ${member.is_self ? "self" : ""}`} onClick={onOpen}>
      <div className="mc-head">
        <div className="mc-avatar">{member.profile.full_name.trim().charAt(0).toUpperCase()}</div>
        <div className="mc-name-wrap">
          <strong className="mc-name">{member.profile.full_name}</strong>
          {member.is_self && <span className="mc-self-tag">{T.targetSelf}</span>}
        </div>
        <span className={`mc-status ${rated ? "rated" : "pending"}`}>
          {rated ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
          {rated ? T.ratedBadge : T.pendingBadge}
        </span>
      </div>

      <div className="mc-visual">
        {rated ? (
          <TraitSpectrumBlob traits={spectrumTraits} size={104} seed={seedFromString(`${member.teacher_id}:card`)} mode="compact" />
        ) : (
          <div className="mc-visual-empty">?</div>
        )}
      </div>

      <div className="mc-foot">
        {rated ? (
          <>
            <span className="mc-dominant">{T.dominant}: <b>{dominantLabel}</b></span>
            <span className="mc-lastrated">{T.lastRated}: {formatDate(given!.updated_at, lang)}</span>
          </>
        ) : (
          <span className="mc-nodata">{T.pendingBadge}</span>
        )}
      </div>

      <button className="mc-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        {rated ? T.editBtn : (member.is_self ? T.rateSelfBtn : T.rateBtn)}
      </button>
    </article>
  );
}

export default function AssessmentPage({ params }: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = use(params);
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const AT = ASSESS_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const router = useRouter();

  const { data, loading, notFound } = useAssessmentData(id, aid);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "rated" | "pending">("all");
  const [expandedSpectra, setExpandedSpectra] = useState<Set<string>>(() => new Set());
  const [showAverageDetails, setShowAverageDetails] = useState(false);

  function toggleSpectrum(key: string) {
    setExpandedSpectra((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const traits = useMemo(() => data?.traits ?? [], [data?.traits]);
  const traitMeta = useMemo(
    () => traits.map((t) => ({ label: traitLabel(t, L), color: t.color })),
    [traits, L],
  );

  const givenByTarget = useMemo(() => {
    const map: Record<string, Given> = {};
    for (const g of data?.my_ratings_given ?? []) map[g.target_teacher_id] = g;
    return map;
  }, [data?.my_ratings_given]);

  const orderedMembers = useMemo(
    () => data ? membersSelfFirst(data.members) : [],
    [data],
  );

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedMembers.filter((m) => {
      if (q && !m.profile.full_name.toLowerCase().includes(q)) return false;
      const rated = !!givenByTarget[m.teacher_id];
      if (filter === "rated" && !rated) return false;
      if (filter === "pending" && rated) return false;
      return true;
    });
  }, [orderedMembers, query, filter, givenByTarget]);

  const received = useMemo(() => data?.my_ratings_received ?? [], [data?.my_ratings_received]);
  const avg = useMemo(() => averageTuples(received.map((r) => r.scores)), [received]);
  const completedCount = data?.members.filter((m) => !!givenByTarget[m.teacher_id]).length ?? 0;
  const memberCount = data?.members.length ?? 0;
  const pendingCount = Math.max(0, memberCount - completedCount);
  const completionPct = memberCount > 0 ? Math.round((completedCount / memberCount) * 100) : 0;

  if (loading) return <MandalaLoader />;
  if (notFound || !data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6B1E2D", fontWeight: 800, fontFamily: "'Cairo',sans-serif" }} dir={dir}>
        {T.loadError}
      </div>
    );
  }

  const locked = data.status === "CLOSED";

  return (
    <div className="ap" dir={dir}>
      <Link href={`/teacher/groups/${id}`} className="ap-back">{T.back}</Link>

      <header className="ap-head">
        <div className="ap-head-text">
          <p className="ap-eyebrow">{data.group.name}</p>
          <h1 className="ap-title">{data.title}</h1>
        </div>
        {locked && <div className="ap-locked">{T.locked}</div>}
      </header>

      <section className="ap-overview" aria-label={T.progressTitle}>
        <div className="ap-progress-card ap-progress-main">
          <div>
            <span className="ap-card-kicker">{T.progressTitle}</span>
            <strong>{completionPct}%</strong>
          </div>
          <div className="ap-progress-track">
            <span style={{ width: `${completionPct}%` }} />
          </div>
        </div>
        <div className="ap-progress-card">
          <span className="ap-card-kicker">{T.completed}</span>
          <strong>{completedCount}</strong>
          <small>/ {memberCount}</small>
        </div>
        <div className="ap-progress-card">
          <span className="ap-card-kicker">{T.pending}</span>
          <strong>{pendingCount}</strong>
          <small>/ {memberCount}</small>
        </div>
        <div className="ap-progress-card">
          <span className="ap-card-kicker">{T.receivedCount}</span>
          <strong>{received.length}</strong>
          <small>{avg ? T.coreNow : T.noCoreYet}</small>
        </div>
      </section>

      <section className="ap-section ap-collective">
        <div className="ap-collective-head">
          <div>
            <span>{T.collectiveTitle}</span>
            <h2>{data.title}</h2>
            <p>{T.collectiveSub}</p>
          </div>
          <strong>{data.overall_spectrum.completion_pct}%</strong>
        </div>
        <div className="ap-collective-note">{T.earlyNote}</div>
        <div className="ap-collective-grid">
          {[{ ...data.overall_spectrum, group_name: T.overall }, ...data.group_spectra].map((spectrum, index) => {
            const spectrumKey = spectrum.group_id ?? "overall";
            const expanded = expandedSpectra.has(spectrumKey);
            return (
            <article className={`ap-collective-card ${spectrum.group_id === id ? "mine" : ""} ${spectrum.group_id === null ? "overall" : ""}`} key={spectrumKey}>
              <header>
                <div><strong>{spectrum.group_name}</strong><span>{spectrum.member_count}</span></div>
                <em>{T.completion} · {spectrum.completion_pct}%</em>
              </header>
              <div className="ap-collective-track"><span style={{ width: `${Math.min(100, spectrum.completion_pct)}%` }} /></div>
              <small>{T.ratingsOf(spectrum.rating_count, spectrum.expected_count)}</small>
              {spectrum.average ? (
                <TraitSpectrumPanel
                  traits={traitMeta.map((trait, traitIndex) => ({
                    label: trait.label, color: trait.color, pct: spectrum.average?.[traitIndex] ?? 0,
                  }))}
                  seed={seedFromString(`${aid}:${spectrum.group_id ?? "overall"}:${index}`)}
                  lang={L}
                  compact
                  summary={!expanded}
                />
              ) : <div className="ap-collective-empty">{T.noCollective}</div>}
              {spectrum.average && (
                <button className="ap-details-btn" onClick={() => toggleSpectrum(spectrumKey)} aria-expanded={expanded}>
                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {expanded ? T.hideSpectrumDetails : T.showSpectrumDetails}
                </button>
              )}
            </article>
          )})}
        </div>
      </section>

      {/* ── Member grid — the primary "who do I rate" screen. Scales to any
          group size via search + status filters, unlike a linear carousel. ── */}
      <section className="ap-section ap-members-section">
        <h2 className="ap-section-h">{T.sectionRate}</h2>
        <p className="ap-section-sub">{T.sectionRateSub}</p>

        <div className="ap-members-tools">
          <label className="ap-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={T.searchPlaceholder}
            />
          </label>
          <div className="ap-filter-chips">
            <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
              {T.filterAll} <em>{memberCount}</em>
            </button>
            <button className={filter === "rated" ? "on" : ""} onClick={() => setFilter("rated")}>
              {T.filterRated} <em>{completedCount}</em>
            </button>
            <button className={filter === "pending" ? "on" : ""} onClick={() => setFilter("pending")}>
              {T.filterPending} <em>{pendingCount}</em>
            </button>
          </div>
        </div>

        {visibleMembers.length === 0 ? (
          <div className="ap-empty">{T.noResults}</div>
        ) : (
          <div className="ap-members-grid">
            {visibleMembers.map((member) => (
              <MemberCard
                key={member.teacher_id}
                member={member}
                given={givenByTarget[member.teacher_id]}
                traitMeta={traitMeta}
                lang={L}
                T={T}
                onOpen={() => router.push(`/teacher/groups/${id}/assessments/${aid}/rate/${member.teacher_id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Per-rater breakdown — kept below the member grid for anyone who wants
          to see each rater's individual scores. */}
      {received.length > 0 && (
        <section className="ap-section">
          <h2 className="ap-section-h">{T.sectionMine}</h2>
          <p className="ap-section-sub">{T.tableHelp}</p>
          {avg && (
            <div className="ap-avg-card">
              <div className="ap-avg-head">
                <span className="ap-avg-label">{T.average}</span>
                <strong>{T.averageOf(received.length)}</strong>
              </div>
              <div className="ap-spectrum-row">
                <TraitSpectrumPanel
                  traits={traitMeta.map((t, i) => ({ label: t.label, color: t.color, pct: avg[i] ?? 0 }))}
                  seed={seedFromString(`${aid}:my-results`)}
                  lang={L}
                  summary={!showAverageDetails}
                />
                <button className="ap-details-btn ap-details-wide" onClick={() => setShowAverageDetails((value) => !value)} aria-expanded={showAverageDetails}>
                  {showAverageDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {showAverageDetails ? T.hideSpectrumDetails : T.showSpectrumDetails}
                </button>
              </div>
            </div>
          )}
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>{T.raterCol}</th>
                  {traitMeta.map((t, i) => <th key={i}>{t.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {received.map((r) => {
                  const d = derive(r.scores);
                  return (
                    <tr key={r.rater_teacher_id}>
                      <td className="ap-rater-cell">
                        {r.is_self ? <span className="ap-self-row">{AT.selfBy(r.rater_name)}</span> : r.rater_name}
                      </td>
                      {r.scores.map((v, i) => {
                        const isCore = d.coreIdx === i && d.hasCore;
                        const isCollective = d.connectingIdx === i;
                        const cls = isCore ? "ap-cell-core" : isCollective ? "ap-cell-coll" : "";
                        return <td key={i} className={cls}>{v}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        .ap { max-width: 1240px; margin: 0 auto; font-family: 'Cairo', sans-serif; padding: 8px 0 60px; }
        .ap-back { display: inline-block; color: #6B1E2D; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 14px; }
        .ap-back:hover { text-decoration: underline; }
        .ap-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid rgba(107,30,45,0.32); }
        .ap-eyebrow { font-size: 11.5px; font-weight: 800; color: #8F765B; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 4px; }
        .ap-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0; line-height: 1.3; }
        .ap-locked { background: rgba(26,26,26,0.08); color: #655B53; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 800; }

        .ap-overview { display: grid; grid-template-columns: 1.35fr repeat(3, minmax(130px, .65fr)); gap: 12px; margin: 0 0 22px; }
        @media (max-width: 900px) { .ap-overview { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 560px) { .ap-overview { grid-template-columns: 1fr; } }
        .ap-progress-card {
          min-height: 104px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;
          padding: 16px; border-radius: 16px; background: linear-gradient(150deg,#FFFBF5,#EFEAE0);
          border: 1px solid rgba(107,30,45,0.34); box-shadow: 0 14px 30px rgba(107,30,45,0.07);
        }
        .ap-progress-main { background: linear-gradient(135deg,#32101A,#6B1E2D); color: #E5E0D5; border-color: rgba(184,160,130,0.24); }
        .ap-card-kicker { display: block; font-size: 11px; font-weight: 900; color: #8F765B; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 4px; }
        .ap-progress-main .ap-card-kicker { color: rgba(229,224,213,.72); }
        .ap-progress-card strong { font-size: 34px; line-height: 1; font-weight: 900; color: #32101A; }
        .ap-progress-main strong { color: #B8A082; }
        .ap-progress-card small { color: #655B53; font-size: 12px; font-weight: 800; }
        .ap-progress-main small { color: rgba(229,224,213,.72); }
        .ap-progress-track { height: 10px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.12); }
        .ap-progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#B8A082,#E5E0D5); transition: width .35s ease; }

        .ap-section { margin-top: 28px; }
        .ap-section-h { font-size: 18px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .ap-section-sub { font-size: 13px; color: #655B53; margin: 0 0 14px; line-height: 1.85; }

        .ap-collective { margin: 0 0 24px; padding: 18px; overflow: hidden; border: 1px solid rgba(107,30,45,.24); border-radius: 22px; background: radial-gradient(circle at 90% -20%,rgba(184,160,130,.22),transparent 38%),linear-gradient(145deg,#EFEAE0,#FFFBF5 52%,#F7F3EB); box-shadow: 0 18px 38px rgba(107,30,45,.08); }
        .ap-collective-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .ap-collective-head span { color: #8F765B; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .ap-collective-head h2 { margin: 4px 0; color: #32101A; font-size: 18px; font-weight: 900; }
        .ap-collective-head p { max-width: 720px; margin: 0; color: #655B53; font-size: 12px; font-weight: 700; line-height: 1.75; }
        .ap-collective-head>strong { flex: none; min-width: 70px; border-radius: 15px; background: #32101A; padding: 10px 12px; color: #D9C9B0; text-align: center; font-size: 18px; }
        .ap-collective-note { margin: 12px 0; border-inline-start: 3px solid #8F765B; border-radius: 9px; background: rgba(184,160,130,.12); padding: 9px 11px; color: #655B53; font-size: 11px; font-weight: 800; }
        .ap-collective-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,340px),1fr)); gap: 12px; }
        .ap-collective-card { min-width: 0; overflow: hidden; border: 1px solid rgba(184,160,130,.32); border-radius: 18px; background: #FFFBF5; padding: 13px; }
        .ap-collective-card.mine { border-color: rgba(107,30,45,.42); box-shadow: inset 0 3px 0 #6B1E2D; }
        .ap-collective-card.overall { background: linear-gradient(155deg,#FFFBF5,#EFEAE0); }
        .ap-collective-card>header { display: flex; align-items: center; justify-content: space-between; gap: 9px; }
        .ap-collective-card>header>div { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .ap-collective-card>header strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #32101A; font-size: 12.5px; }
        .ap-collective-card>header span { display: grid; place-items: center; min-width: 25px; height: 25px; border-radius: 8px; background: #EFEAE0; color: #6B1E2D; font-size: 10px; font-weight: 900; }
        .ap-collective-card>header em { flex: none; color: #8F765B; font-size: 9.5px; font-style: normal; font-weight: 800; }
        .ap-collective-track { height: 7px; margin: 8px 0 5px; overflow: hidden; border-radius: 99px; background: #D9C9B0; }
        .ap-collective-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#8F765B,#6B1E2D); }
        .ap-collective-card>small { display: block; margin-bottom: 9px; color: #796A62; font-size: 9.5px; font-weight: 800; }
        .ap-details-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:7px; min-height:42px; margin-top:10px; border:1px solid rgba(107,30,45,.2); border-radius:12px; background:#F7F3EB; color:#6B1E2D; font:900 11px 'Cairo',sans-serif; cursor:pointer; transition:.15s; }
        .ap-details-btn:hover { border-color:#6B1E2D; background:#FFFBF5; }
        .ap-details-wide { max-width:320px; align-self:center; }
        .ap-collective-empty { display: grid; place-items: center; min-height: 100px; border: 1px dashed rgba(184,160,130,.35); border-radius: 14px; background: #F7F3EB; padding: 12px; color: #796A62; text-align: center; font-size: 11px; font-weight: 800; }
        @media (max-width: 620px) { .ap-collective { padding: 13px; } .ap-collective-head { flex-direction: column; } }

        /* ─── Member grid ─── */
        .ap-members-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
        .ap-search { flex: 1 1 260px; display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 0 14px; border: 1.5px solid rgba(107,30,45,.22); border-radius: 13px; background: #FFFBF5; color: #6B1E2D; }
        .ap-search input { flex: 1; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; color: #32101A; }
        .ap-filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .ap-filter-chips button { display: flex; align-items: center; gap: 6px; min-height: 46px; padding: 0 14px; border: 1.5px solid rgba(107,30,45,.22); border-radius: 13px; background: #FFFBF5; color: #6B1E2D; font: 800 12px 'Cairo',sans-serif; cursor: pointer; transition: .15s; }
        .ap-filter-chips button:hover { border-color: #B8A082; }
        .ap-filter-chips button.on { background: #32101A; color: #D9C9B0; border-color: #32101A; }
        .ap-filter-chips button em { font-style: normal; min-width: 20px; height: 20px; display: grid; place-items: center; border-radius: 999px; background: rgba(107,30,45,.12); color: #6B1E2D; font-size: 10px; font-weight: 900; padding: 0 5px; }
        .ap-filter-chips button.on em { background: rgba(217,201,176,.22); color: #D9C9B0; }

        .ap-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .mc-card { display: flex; flex-direction: column; gap: 10px; border: 1.5px solid rgba(107,30,45,.16); border-radius: 18px; background: #FFFBF5; padding: 14px; cursor: pointer; transition: transform .15s, border-color .15s, box-shadow .15s; }
        .mc-card:hover { transform: translateY(-3px); border-color: #B8A082; box-shadow: 0 14px 30px rgba(107,30,45,.10); }
        .mc-card.rated { border-color: rgba(27,94,32,.28); }
        .mc-card.self { border-color: rgba(107,30,45,.4); box-shadow: inset 0 3px 0 #6B1E2D; }
        .mc-head { display: flex; align-items: center; gap: 9px; }
        .mc-avatar { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; background: linear-gradient(145deg,#32101A,#6B1E2D); color: #F7F3EB; font-size: 15px; font-weight: 900; }
        .mc-name-wrap { min-width: 0; flex: 1; display: flex; flex-direction: column; }
        .mc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: #32101A; }
        .mc-self-tag { align-self: flex-start; margin-top: 2px; padding: 1px 7px; border-radius: 999px; background: rgba(107,30,45,.12); color: #6B1E2D; font-size: 9px; font-weight: 900; }
        .mc-status { flex: none; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 900; }
        .mc-status.rated { background: rgba(27,94,32,.12); color: #1B5E20; }
        .mc-status.pending { background: rgba(184,160,130,.22); color: #8F765B; }
        .mc-visual { display: flex; justify-content: center; padding: 4px 0; }
        .mc-visual-empty { width: 104px; height: 104px; display: grid; place-items: center; border: 1.5px dashed rgba(184,160,130,.4); border-radius: 50%; color: #B8A082; font-size: 26px; font-weight: 900; background: #F7F3EB; }
        .mc-foot { display: flex; flex-direction: column; gap: 3px; min-height: 34px; text-align: center; }
        .mc-dominant { font-size: 11px; font-weight: 700; color: #655B53; }
        .mc-dominant b { color: #6B1E2D; font-weight: 900; }
        .mc-lastrated { font-size: 10px; color: #8C8274; font-weight: 700; }
        .mc-nodata { font-size: 11px; color: #8C8274; font-weight: 700; }
        .mc-btn { border: 0; border-radius: 11px; padding: 10px; background: #6B1E2D; color: #fff; font: 800 12px 'Cairo',sans-serif; cursor: pointer; transition: background .15s; }
        .mc-btn:hover { background: #4A0E1C; }
        .mc-card.rated .mc-btn { background: rgba(27,94,32,.85); }
        .mc-card.rated .mc-btn:hover { background: #1B5E20; }

        .ap-empty { padding: 40px; text-align: center; color: #8C8274; font-weight: 700; background: rgba(107,30,45,0.04); border: 1px dashed rgba(107,30,45,0.32); border-radius: 12px; }

        .ap-avg-card { background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1.5px solid rgba(107,30,45,0.40); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
        .ap-avg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ap-avg-head strong { color: #32101A; font-size: 13px; font-weight: 900; }
        .ap-avg-label { font-size: 12px; font-weight: 800; color: #6B1E2D; letter-spacing: .04em; text-transform: uppercase; }
        .ap-spectrum-row { display: flex; flex-direction: column; align-items: center; gap: 10px; }

        .ap-table-wrap { overflow-x: auto; border: 1px solid rgba(26,26,26,0.08); border-radius: 12px; background: #FFFBF5; }
        .ap-table { width: 100%; border-collapse: collapse; min-width: 560px; }
        .ap-table th { background: rgba(107,30,45,0.10); color: #6B1E2D; font-size: 11px; font-weight: 800; padding: 10px 8px; text-align: center; letter-spacing: .04em; text-transform: uppercase; border-bottom: 1px solid rgba(107,30,45,0.32); }
        .ap-table th:first-child { text-align: start; padding-inline-start: 14px; min-width: 160px; }
        .ap-table td { padding: 11px 8px; font-size: 13px; text-align: center; border-bottom: 1px solid rgba(26,26,26,0.06); font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; }
        .ap-table tr:last-child td { border-bottom: none; }
        .ap-rater-cell { font-family: 'Cairo', sans-serif !important; font-weight: 800 !important; text-align: start !important; padding-inline-start: 14px !important; color: #32101A; }
        .ap-self-row { color: #6B1E2D; }
        .ap-cell-core { background: rgba(107,30,45,0.08); color: #6B1E2D; }
        .ap-cell-coll { background: rgba(107,30,45,0.14); color: #8F765B; }
      `}</style>
    </div>
  );
}
