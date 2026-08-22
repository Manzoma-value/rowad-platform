"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, ChevronDown, ChevronUp, Clock3, History, UserCheck, Users } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import TraitSpectrumBlob from "@/components/TraitSpectrumBlob";
import { seedFromString } from "@/lib/trait-spectrum";
import { ASSESS_UI, derive, averageTuples, pickAssessLang } from "@/lib/rowad-assessment";
import {
  useAssessmentData, traitLabel, membersSelfFirst,
  type Member, type Given, type GroupRating, type RatingHistory,
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
    availableNow: "متاح الآن",
    cooldownRemaining: (hours: number, minutes: number) => `باقي ${hours} س ${minutes} د`,
    nextRating: "موعد التقييم التالي",
    viewBtn: "عرض التقييم",
    groupInsightsTitle: "متابعة تقييمات المعلمين",
    groupInsightsSub: "ملخص واضح لكل معلم: التقييمات التي حصل عليها، من قيّمه، ومتى سُجل كل تقييم.",
    participatingRaters: "شاركوا في التقييم",
    ratedTeachers: "تم تقييمهم",
    ratingEntries: "تقييمات حالية",
    teacherRatings: (n: number) => `${n} مقيّم`,
    currentReading: "القراءة الحالية",
    previousReading: "قراءة سابقة",
    ratedBy: "قيّمه",
    noTimeline: "لم يحصل على تقييم بعد.",
    showTimeline: "عرض السجل الكامل",
    hideTimeline: "إخفاء السجل",
    timelineTitle: "الخط الزمني للتقييمات",
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
    availableNow: "E disponueshme tani",
    cooldownRemaining: (hours: number, minutes: number) => `Edhe ${hours} o ${minutes} min`,
    nextRating: "Vlerësimi i radhës",
    viewBtn: "Shiko vlerësimin",
    groupInsightsTitle: "Ndjekja e vlerësimeve të edukatorëve",
    groupInsightsSub: "Një pasqyrë e qartë për secilin: vlerësimet, vlerësuesit dhe koha e çdo leximi.",
    participatingRaters: "Kanë vlerësuar",
    ratedTeachers: "Janë vlerësuar",
    ratingEntries: "Vlerësime aktuale",
    teacherRatings: (n: number) => `${n} vlerësues`,
    currentReading: "Leximi aktual",
    previousReading: "Lexim i mëparshëm",
    ratedBy: "Vlerësuar nga",
    noTimeline: "Ende nuk ka marrë vlerësim.",
    showTimeline: "Shfaq historikun e plotë",
    hideTimeline: "Fshih historikun",
    timelineTitle: "Kronologjia e vlerësimeve",
  },
} as const;

function formatDate(value: string, lang: "ar" | "sq") {
  return new Date(value).toLocaleDateString(
    lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

function formatDateTime(value: string, lang: "ar" | "sq") {
  return new Date(value).toLocaleString(
    lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL",
    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  );
}

function cooldownParts(nextAllowedAt: string | undefined, now: number) {
  if (!nextAllowedAt) return { active: false, hours: 0, minutes: 0 };
  const remaining = Math.max(0, new Date(nextAllowedAt).getTime() - now);
  if (remaining <= 0) return { active: false, hours: 0, minutes: 0 };
  const totalMinutes = Math.ceil(remaining / 60_000);
  return { active: true, hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

function MemberCard({
  member, given, traitMeta, lang, T, now, assessmentLocked, onOpen,
}: {
  member: Member;
  given: Given | undefined;
  traitMeta: { label: string; color: string }[];
  lang: "ar" | "sq";
  T: {
    targetSelf: string; ratedBadge: string; pendingBadge: string;
    dominant: string; lastRated: string; editBtn: string; rateBtn: string; rateSelfBtn: string;
    availableNow: string; cooldownRemaining: (hours: number, minutes: number) => string;
    nextRating: string; viewBtn: string;
  };
  now: number;
  assessmentLocked: boolean;
  onOpen: () => void;
}) {
  const rated = !!given;
  const cooldown = cooldownParts(given?.next_allowed_at, now);
  const availability = assessmentLocked
    ? T.viewBtn
    : cooldown.active
      ? T.cooldownRemaining(cooldown.hours, cooldown.minutes)
      : T.availableNow;
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
        <span className={`mc-status ${cooldown.active ? "waiting" : rated ? "rated" : "pending"}`}>
          {cooldown.active ? <Clock3 size={13} /> : rated ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
          {cooldown.active ? availability : rated ? T.ratedBadge : T.pendingBadge}
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
            <span className={`mc-next ${cooldown.active ? "waiting" : "ready"}`}>{T.nextRating}: {availability}</span>
          </>
        ) : (
          <><span className="mc-nodata">{T.pendingBadge}</span><span className="mc-next ready">{T.nextRating}: {availability}</span></>
        )}
      </div>

      <button className="mc-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        {rated ? (cooldown.active || assessmentLocked ? T.viewBtn : T.editBtn) : (member.is_self ? T.rateSelfBtn : T.rateBtn)}
      </button>
    </article>
  );
}

type TeacherTimelineEntry = {
  id: string;
  rater_teacher_id: string;
  rater_name: string;
  scores: number[];
  recorded_at: string;
  is_current: boolean;
};

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
  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(() => new Set());
  const [showAverageDetails, setShowAverageDetails] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleSpectrum(key: string) {
    setExpandedSpectra((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleHistory(key: string) {
    setExpandedHistories((current) => {
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

  const groupRatings: GroupRating[] = useMemo(() => data?.all_ratings ?? [], [data?.all_ratings]);
  const ratingHistory: RatingHistory[] = useMemo(() => data?.rating_history ?? [], [data?.rating_history]);
  const participatingRaterCount = useMemo(
    () => new Set(groupRatings.map((rating) => rating.rater_teacher_id)).size,
    [groupRatings],
  );
  const ratedTeacherCount = useMemo(
    () => new Set(groupRatings.map((rating) => rating.target_teacher_id)).size,
    [groupRatings],
  );
  const memberReports = useMemo(() => orderedMembers.map((member) => {
    const currentRatings = groupRatings.filter((rating) => rating.target_teacher_id === member.teacher_id);
    const revisions = ratingHistory.filter((rating) => rating.target_teacher_id === member.teacher_id);
    const timeline: TeacherTimelineEntry[] = [
      ...currentRatings.map((rating) => ({
        id: `current:${rating.rater_teacher_id}`,
        rater_teacher_id: rating.rater_teacher_id,
        rater_name: rating.rater_name,
        scores: rating.scores,
        recorded_at: rating.updated_at,
        is_current: true,
      })),
      ...revisions.map((rating) => ({
        id: rating.id,
        rater_teacher_id: rating.rater_teacher_id,
        rater_name: rating.rater_name,
        scores: rating.scores,
        recorded_at: rating.recorded_at,
        is_current: false,
      })),
    ].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    return {
      member,
      currentRatings,
      timeline,
      average: averageTuples(currentRatings.map((rating) => rating.scores)),
    };
  }), [orderedMembers, groupRatings, ratingHistory]);

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
                now={now}
                assessmentLocked={locked}
                onOpen={() => router.push(`/teacher/groups/${id}/assessments/${aid}/rate/${member.teacher_id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="ap-section ap-insights">
        <div className="ap-insights-head">
          <div>
            <span>{T.timelineTitle}</span>
            <h2>{T.groupInsightsTitle}</h2>
            <p>{T.groupInsightsSub}</p>
          </div>
          <History size={28} />
        </div>

        <div className="ap-insight-stats">
          <div><Users size={18} /><span>{T.participatingRaters}</span><strong>{participatingRaterCount}<small>/ {memberCount}</small></strong></div>
          <div><UserCheck size={18} /><span>{T.ratedTeachers}</span><strong>{ratedTeacherCount}<small>/ {memberCount}</small></strong></div>
          <div><CheckCircle2 size={18} /><span>{T.ratingEntries}</span><strong>{groupRatings.length}</strong></div>
        </div>

        <div className="ap-report-grid">
          {memberReports.map((report) => {
            const expanded = expandedHistories.has(report.member.teacher_id);
            const visibleTimeline = expanded ? report.timeline : report.timeline.slice(0, 2);
            return (
              <article className="ap-report-card" key={report.member.teacher_id}>
                <header>
                  <div className="ap-report-person">
                    <span>{report.member.profile.full_name.trim().charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{report.member.profile.full_name}</strong>
                      <small>{T.teacherRatings(report.currentRatings.length)}</small>
                    </div>
                  </div>
                  <em>{report.currentRatings.length}</em>
                </header>

                {report.average && (
                  <div className="ap-report-spectrum">
                    <TraitSpectrumBlob
                      traits={traitMeta.map((trait, index) => ({ ...trait, pct: report.average?.[index] ?? 0 }))}
                      size={82}
                      seed={seedFromString(`${aid}:${report.member.teacher_id}:report`)}
                      mode="compact"
                    />
                    <div>
                      <span>{T.average}</span>
                      <strong>{traitMeta[derive(report.average).coreIdx ?? 0]?.label}</strong>
                      {report.timeline[0] && <small>{formatDateTime(report.timeline[0].recorded_at, L)}</small>}
                    </div>
                  </div>
                )}

                <div className="ap-timeline">
                  {visibleTimeline.length === 0 ? (
                    <div className="ap-timeline-empty">{T.noTimeline}</div>
                  ) : visibleTimeline.map((event) => {
                    const reading = derive(event.scores);
                    const dominantIndex = reading.coreIdx ?? reading.connectingIdx;
                    return (
                      <div className={`ap-timeline-event ${event.is_current ? "current" : "previous"}`} key={event.id}>
                        <i />
                        <div className="ap-timeline-content">
                          <div className="ap-timeline-meta">
                            <span>{event.is_current ? T.currentReading : T.previousReading}</span>
                            <time>{formatDateTime(event.recorded_at, L)}</time>
                          </div>
                          <strong>{T.ratedBy}: {event.rater_teacher_id === report.member.teacher_id ? AT.selfBy(event.rater_name) : event.rater_name}</strong>
                          <div className="ap-timeline-scores">
                            {event.scores.map((score, index) => (
                              <span className={index === dominantIndex ? "dominant" : ""} key={index}>
                                <i style={{ background: traitMeta[index]?.color }} />
                                {traitMeta[index]?.label}<b>{score}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {report.timeline.length > 2 && (
                  <button className="ap-history-toggle" onClick={() => toggleHistory(report.member.teacher_id)} aria-expanded={expanded}>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? T.hideTimeline : T.showTimeline}
                  </button>
                )}
              </article>
            );
          })}
        </div>
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
        .ap-collective-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; }
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
        .mc-status.waiting { background:#EFEAE0; color:#6B1E2D; }
        .mc-visual { display: flex; justify-content: center; padding: 4px 0; }
        .mc-visual-empty { width: 104px; height: 104px; display: grid; place-items: center; border: 1.5px dashed rgba(184,160,130,.4); border-radius: 50%; color: #B8A082; font-size: 26px; font-weight: 900; background: #F7F3EB; }
        .mc-foot { display: flex; flex-direction: column; gap: 3px; min-height: 34px; text-align: center; }
        .mc-dominant { font-size: 11px; font-weight: 700; color: #655B53; }
        .mc-dominant b { color: #6B1E2D; font-weight: 900; }
        .mc-lastrated { font-size: 10px; color: #8C8274; font-weight: 700; }
        .mc-next { font-size:10px; font-weight:900; }
        .mc-next.ready { color:#1B5E20; }
        .mc-next.waiting { color:#6B1E2D; }
        .mc-nodata { font-size: 11px; color: #8C8274; font-weight: 700; }
        .mc-btn { border: 0; border-radius: 11px; padding: 10px; background: #6B1E2D; color: #fff; font: 800 12px 'Cairo',sans-serif; cursor: pointer; transition: background .15s; }
        .mc-btn:hover { background: #4A0E1C; }
        .mc-card.rated .mc-btn { background: rgba(27,94,32,.85); }
        .mc-card.rated .mc-btn:hover { background: #1B5E20; }

        .ap-empty { padding: 40px; text-align: center; color: #8C8274; font-weight: 700; background: rgba(107,30,45,0.04); border: 1px dashed rgba(107,30,45,0.32); border-radius: 12px; }

        .ap-insights { overflow:hidden; border:1px solid rgba(107,30,45,.2); border-radius:22px; background:linear-gradient(145deg,#32101A 0,#6B1E2D 165px,#F7F3EB 165px); padding:18px; box-shadow:0 18px 42px rgba(107,30,45,.12); }
        .ap-insights-head { min-height:118px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; color:#F7F3EB; }
        .ap-insights-head>div>span { color:#D9C9B0; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
        .ap-insights-head h2 { margin:5px 0 4px; font-size:19px; font-weight:900; }
        .ap-insights-head p { max-width:720px; margin:0; color:rgba(247,243,235,.72); font-size:11.5px; font-weight:700; line-height:1.75; }
        .ap-insights-head>svg { flex:none; color:#D9C9B0; }
        .ap-insight-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin:-26px 0 14px; position:relative; }
        .ap-insight-stats>div { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; min-height:72px; border:1px solid rgba(107,30,45,.12); border-radius:15px; background:#FFFBF5; padding:12px; box-shadow:0 10px 22px rgba(107,30,45,.08); }
        .ap-insight-stats svg { color:#6B1E2D; }
        .ap-insight-stats span { color:#655B53; font-size:10.5px; font-weight:900; }
        .ap-insight-stats strong { color:#32101A; font-size:23px; font-weight:900; }
        .ap-insight-stats small { color:#8F765B; font-size:9px; }
        .ap-report-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr)); gap:12px; }
        .ap-report-card { min-width:0; border:1px solid rgba(107,30,45,.15); border-radius:18px; background:#FFFBF5; padding:13px; }
        .ap-report-card>header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding-bottom:10px; border-bottom:1px solid rgba(107,30,45,.1); }
        .ap-report-person { min-width:0; display:flex; align-items:center; gap:9px; }
        .ap-report-person>span { flex:none; width:38px; height:38px; display:grid; place-items:center; border-radius:12px; background:linear-gradient(145deg,#32101A,#6B1E2D); color:#FFF; font-size:14px; font-weight:900; }
        .ap-report-person>div { min-width:0; display:flex; flex-direction:column; }
        .ap-report-person strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#32101A; font-size:12.5px; }
        .ap-report-person small { color:#8F765B; font-size:9.5px; font-weight:800; }
        .ap-report-card>header>em { width:31px; height:31px; display:grid; place-items:center; border-radius:10px; background:rgba(107,30,45,.1); color:#6B1E2D; font-size:12px; font-style:normal; font-weight:900; }
        .ap-report-spectrum { display:flex; align-items:center; justify-content:center; gap:10px; padding:10px 0 4px; }
        .ap-report-spectrum>div { display:flex; flex-direction:column; gap:2px; }
        .ap-report-spectrum span { color:#8F765B; font-size:9px; font-weight:900; }
        .ap-report-spectrum strong { color:#6B1E2D; font-size:12px; font-weight:900; }
        .ap-report-spectrum small { color:#796A62; font-size:9px; font-weight:700; }
        .ap-timeline { position:relative; display:flex; flex-direction:column; gap:0; margin-top:8px; }
        .ap-timeline-event { position:relative; display:grid; grid-template-columns:14px 1fr; gap:8px; padding-bottom:13px; }
        .ap-timeline-event:last-child { padding-bottom:2px; }
        .ap-timeline-event>i { position:relative; z-index:1; width:10px; height:10px; margin-top:5px; border:2px solid #FFFBF5; border-radius:50%; background:#B8A082; box-shadow:0 0 0 1px #B8A082; }
        .ap-timeline-event.current>i { background:#1B5E20; box-shadow:0 0 0 1px #1B5E20; }
        .ap-timeline-event:not(:last-child)::after { content:""; position:absolute; inset-inline-start:4px; top:16px; bottom:1px; width:2px; background:#D9C9B0; }
        .ap-timeline-content { min-width:0; border-radius:12px; background:#F7F3EB; padding:9px 10px; }
        .ap-timeline-event.current .ap-timeline-content { background:rgba(27,94,32,.055); }
        .ap-timeline-meta { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .ap-timeline-meta span { color:#6B1E2D; font-size:9px; font-weight:900; }
        .ap-timeline-meta time { color:#8C8274; font-size:8.5px; font-weight:800; }
        .ap-timeline-content>strong { display:block; margin:3px 0 7px; color:#32101A; font-size:10.5px; font-weight:900; }
        .ap-timeline-scores { display:flex; flex-wrap:wrap; gap:4px; }
        .ap-timeline-scores>span { display:inline-flex; align-items:center; gap:4px; border:1px solid rgba(107,30,45,.09); border-radius:999px; background:#FFFBF5; padding:3px 6px; color:#655B53; font-size:8.5px; font-weight:800; }
        .ap-timeline-scores>span>i { width:6px; height:6px; border-radius:50%; }
        .ap-timeline-scores b { color:#32101A; font-size:9px; }
        .ap-timeline-scores>span.dominant { border-color:rgba(107,30,45,.3); color:#6B1E2D; }
        .ap-timeline-empty { padding:22px; border:1px dashed rgba(107,30,45,.2); border-radius:12px; color:#8C8274; text-align:center; font-size:10.5px; font-weight:800; }
        .ap-history-toggle { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:10px; border:1px solid rgba(107,30,45,.16); border-radius:10px; background:#F7F3EB; padding:8px; color:#6B1E2D; font:900 10px 'Cairo',sans-serif; cursor:pointer; }
        @media(max-width:680px){.ap-insights{padding:13px}.ap-insight-stats{grid-template-columns:1fr;margin:-18px 0 12px}.ap-insights-head{min-height:132px}}

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
