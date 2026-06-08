"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch } from "@/lib/api-cache";

/* ─── Types ─── */
type AttemptStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
type Stage = "STAGE1" | "STAGE2";
type TeacherStatus =
  | "STAGE1_PENDING"
  | "STAGE1_REVIEW"
  | "STAGE2_PENDING"
  | "STAGE2_REVIEW"
  | "AWAITING_CLASS"
  | "ACTIVE";

interface Attempt {
  id: string;
  stage: Stage;
  attempt_number: number;
  status: AttemptStatus;
  score: number | null;
  total: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

interface StageBlock {
  attempts: Attempt[];
  attempt_count: number;
  latest_status: AttemptStatus | null;
  latest_score: number | null;
  latest_total: number | null;
  latest_submitted_at: string | null;
}

interface TeacherRow {
  id: string;
  onboarding_status: TeacherStatus;
  joined_at: string;
  profile: {
    full_name: string;
    email: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
  pending_review: boolean;
  stage1: StageBlock;
  stage2: StageBlock;
}

/* ─── i18n ─── */
const L = {
  ar: {
    title: "النموذج التعليمي للرواد",
    sub: "مراجعة محاولات المعلمين والموافقة على المراحل",
    searchPH: "ابحث باسم المعلم...",
    filterAll: "الكل",
    filterPending: "بانتظار المراجعة",
    filterApproved: "تمت الموافقة",
    filterRejected: "رفض",
    filterStage1: "المرحلة الأولى",
    filterStage2: "المرحلة الثانية",
    stage: "المرحلة",
    stage1: "المرحلة الأولى",
    stage2: "المرحلة الثانية",
    notStarted: "لم تبدأ بعد",
    attempts: (n: number) => (n === 1 ? "محاولة واحدة" : `${n} محاولات`),
    attempt: (n: number) => `المحاولة #${n}`,
    review: "مراجعة",
    view: "عرض",
    teacherCount: (n: number) => (n === 1 ? "معلم واحد" : `${n} معلمًا`),
    pendingBadge: (n: number) => `بانتظار المراجعة: ${n}`,
    empty: "لا توجد محاولات بعد",
    emptySub: "ستظهر هنا محاولات المعلمين بعد إرسالها.",
    emptyFiltered: "لا توجد نتائج مطابقة",
    emptyFilteredSub: "جرّب تغيير الفلتر أو البحث.",
    statusSUBMITTED: "بانتظار المراجعة",
    statusAPPROVED: "تمت الموافقة",
    statusREJECTED: "مرفوضة",
    teacherSTAGE1_PENDING: "يحضّر المرحلة الأولى",
    teacherSTAGE1_REVIEW: "بانتظار مراجعة المرحلة الأولى",
    teacherSTAGE2_PENDING: "يحضّر المرحلة الثانية",
    teacherSTAGE2_REVIEW: "بانتظار مراجعة المرحلة الثانية",
    teacherAWAITING_CLASS: "بانتظار تعيين فصل",
    teacherACTIVE: "معلم فعّال",
    expand: "عرض كل المحاولات",
    collapse: "إخفاء المحاولات",
    avgScore: "أعلى درجة",
    submittedAt: "تاريخ الإرسال",
    notes: "ملاحظات",
    inactive: "حساب معطّل",
  },
  en: {
    title: "Rowad Educational Model",
    sub: "Review teacher attempts and approve stages",
    searchPH: "Search teachers...",
    filterAll: "All",
    filterPending: "Awaiting review",
    filterApproved: "Approved",
    filterRejected: "Rejected",
    filterStage1: "Stage 1",
    filterStage2: "Stage 2",
    stage: "Stage",
    stage1: "Stage 1",
    stage2: "Stage 2",
    notStarted: "Not started",
    attempts: (n: number) => (n === 1 ? "1 attempt" : `${n} attempts`),
    attempt: (n: number) => `Attempt #${n}`,
    review: "Review",
    view: "View",
    teacherCount: (n: number) => (n === 1 ? "1 teacher" : `${n} teachers`),
    pendingBadge: (n: number) => `Awaiting review: ${n}`,
    empty: "No attempts yet",
    emptySub: "Teacher attempts appear here once submitted.",
    emptyFiltered: "No matching teachers",
    emptyFilteredSub: "Try a different filter or search.",
    statusSUBMITTED: "Awaiting review",
    statusAPPROVED: "Approved",
    statusREJECTED: "Rejected",
    teacherSTAGE1_PENDING: "Working on Stage 1",
    teacherSTAGE1_REVIEW: "Stage 1 under review",
    teacherSTAGE2_PENDING: "Working on Stage 2",
    teacherSTAGE2_REVIEW: "Stage 2 under review",
    teacherAWAITING_CLASS: "Awaiting class assignment",
    teacherACTIVE: "Active teacher",
    expand: "Show all attempts",
    collapse: "Hide attempts",
    avgScore: "Top score",
    submittedAt: "Submitted",
    notes: "Notes",
    inactive: "Account disabled",
  },
} as const;

const STATUS_STYLE: Record<AttemptStatus | "NONE", { bg: string; fg: string; bdr: string; dot: string }> = {
  SUBMITTED: { bg: "rgba(229,185,60,0.13)", fg: "#8B6915", bdr: "rgba(229,185,60,0.35)", dot: "#E5B93C" },
  APPROVED: { bg: "rgba(63,138,79,0.13)", fg: "#1F5C30", bdr: "rgba(63,138,79,0.32)", dot: "#3F8A4F" },
  REJECTED: { bg: "rgba(139,26,26,0.10)", fg: "#7A1E1E", bdr: "rgba(139,26,26,0.28)", dot: "#A33333" },
  NONE: { bg: "rgba(11,11,12,0.04)", fg: "#8A7B60", bdr: "rgba(11,11,12,0.10)", dot: "#C7BEAB" },
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type StageFilter = "all" | "STAGE1" | "STAGE2";

/* ─── Helpers ─── */
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatDate(iso: string | null, lang: "ar" | "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─── Component ─── */
export default function SchoolAdminRowadPage() {
  const { lang } = useLang();
  const tr = L[lang === "en" ? "en" : "ar"];
  const dir = lang === "en" ? "ltr" : "rtl";

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [stage, setStage] = useState<StageFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    cachedFetch<{ teachers: TeacherRow[] }>("/api/school-admin/rowad", 30_000)
      .then((d) => setTeachers(d?.teachers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Stats + filtering ── */
  const totalPending = useMemo(
    () => teachers.filter((t) => t.pending_review).length,
    [teachers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    function matchStatus(t: TeacherRow): boolean {
      if (status === "all") return true;
      const blocks: StageBlock[] = [];
      if (stage === "all" || stage === "STAGE1") blocks.push(t.stage1);
      if (stage === "all" || stage === "STAGE2") blocks.push(t.stage2);
      const all = blocks.flatMap((b) => b.attempts);
      if (status === "pending") return all.some((a) => a.status === "SUBMITTED");
      if (status === "approved") return all.some((a) => a.status === "APPROVED");
      if (status === "rejected") return all.some((a) => a.status === "REJECTED");
      return true;
    }

    function matchStage(t: TeacherRow): boolean {
      if (stage === "all") return true;
      const block = stage === "STAGE1" ? t.stage1 : t.stage2;
      return block.attempt_count > 0;
    }

    return teachers.filter((t) => {
      if (q && !t.profile.full_name.toLowerCase().includes(q)) return false;
      if (!matchStage(t)) return false;
      if (!matchStatus(t)) return false;
      return true;
    });
  }, [teachers, query, status, stage]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) return <MandalaLoader />;

  return (
    <div className="rw-page" dir={dir}>
      {/* ── HEADER ── */}
      <div className="rw-hero">
        <div className="rw-hero-inner">
          <div>
            <span className="rw-eyebrow">{lang === "ar" ? "النموذج التعليمي" : "Educational Model"}</span>
            <h1 className="rw-title">{tr.title}</h1>
            <p className="rw-sub">{tr.sub}</p>
          </div>
          <div className="rw-hero-stats">
            <div className="rw-stat">
              <div className="rw-stat-val">{teachers.length}</div>
              <div className="rw-stat-lbl">{tr.teacherCount(teachers.length)}</div>
            </div>
            {totalPending > 0 && (
              <div className="rw-stat rw-stat--accent">
                <div className="rw-stat-val">{totalPending}</div>
                <div className="rw-stat-lbl">{tr.pendingBadge(totalPending)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="rw-filters">
        <div className="rw-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr.searchPH}
            className="rw-search-input"
            dir={dir}
          />
        </div>

        <div className="rw-segment">
          <button className={`rw-seg-btn${stage === "all" ? " on" : ""}`} onClick={() => setStage("all")}>
            {tr.filterAll}
          </button>
          <button className={`rw-seg-btn${stage === "STAGE1" ? " on" : ""}`} onClick={() => setStage("STAGE1")}>
            {tr.filterStage1}
          </button>
          <button className={`rw-seg-btn${stage === "STAGE2" ? " on" : ""}`} onClick={() => setStage("STAGE2")}>
            {tr.filterStage2}
          </button>
        </div>

        <div className="rw-segment">
          <button className={`rw-seg-btn${status === "all" ? " on" : ""}`} onClick={() => setStatus("all")}>
            {tr.filterAll}
          </button>
          <button className={`rw-seg-btn${status === "pending" ? " on" : ""}`} onClick={() => setStatus("pending")}>
            <span className="rw-dot" style={{ background: STATUS_STYLE.SUBMITTED.dot }} />
            {tr.filterPending}
          </button>
          <button className={`rw-seg-btn${status === "approved" ? " on" : ""}`} onClick={() => setStatus("approved")}>
            <span className="rw-dot" style={{ background: STATUS_STYLE.APPROVED.dot }} />
            {tr.filterApproved}
          </button>
          <button className={`rw-seg-btn${status === "rejected" ? " on" : ""}`} onClick={() => setStatus("rejected")}>
            <span className="rw-dot" style={{ background: STATUS_STYLE.REJECTED.dot }} />
            {tr.filterRejected}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      {teachers.length === 0 ? (
        <EmptyState title={tr.empty} sub={tr.emptySub} icon="📋" />
      ) : filtered.length === 0 ? (
        <EmptyState title={tr.emptyFiltered} sub={tr.emptyFilteredSub} icon="🔎" />
      ) : (
        <div className="rw-list">
          {filtered.map((t) => (
            <TeacherCard
              key={t.id}
              teacher={t}
              tr={tr}
              lang={lang === "en" ? "en" : "ar"}
              expanded={expanded.has(t.id)}
              onToggle={() => toggleExpand(t.id)}
            />
          ))}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

/* ─── Teacher card ─── */
function TeacherCard({
  teacher: t,
  tr,
  lang,
  expanded,
  onToggle,
}: {
  teacher: TeacherRow;
  tr: (typeof L)["ar"] | (typeof L)["en"];
  lang: "ar" | "en";
  expanded: boolean;
  onToggle: () => void;
}) {
  const teacherStatusKey = `teacher${t.onboarding_status}` as keyof typeof tr;
  const teacherStatusLabel = tr[teacherStatusKey] as string;
  const showExpand = t.stage1.attempt_count + t.stage2.attempt_count > 0;

  return (
    <div className={`rw-card${t.pending_review ? " rw-card--alert" : ""}${!t.profile.is_active ? " rw-card--inactive" : ""}`}>
      {/* gold accent rail */}
      <div className="rw-card-rail" />

      <div className="rw-card-top">
        <div className="rw-av-wrap">
          {t.profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.profile.avatar_url} alt={t.profile.full_name} className="rw-av-img" />
          ) : (
            <div className="rw-av">{initials(t.profile.full_name)}</div>
          )}
          {t.pending_review && <span className="rw-av-ping" aria-hidden />}
        </div>

        <div className="rw-card-id">
          <div className="rw-card-name">
            {t.profile.full_name}
            {!t.profile.is_active && <span className="rw-inactive-tag">{tr.inactive}</span>}
          </div>
          {t.profile.email && <div className="rw-card-email" dir="ltr">{t.profile.email}</div>}
          <div className="rw-card-status">
            <span className="rw-status-mark" />
            {teacherStatusLabel}
          </div>
        </div>

        {showExpand && (
          <button className="rw-expand-btn" onClick={onToggle} type="button">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {expanded ? tr.collapse : tr.expand}
          </button>
        )}
      </div>

      <div className="rw-stage-grid">
        <StageSummary
          label={tr.stage1}
          stageNum={1}
          block={t.stage1}
          tr={tr}
          lang={lang}
        />
        <StageSummary
          label={tr.stage2}
          stageNum={2}
          block={t.stage2}
          tr={tr}
          lang={lang}
        />
      </div>

      {expanded && (
        <div className="rw-attempts">
          {t.stage1.attempts.length > 0 && (
            <AttemptList title={tr.stage1} attempts={t.stage1.attempts} tr={tr} lang={lang} />
          )}
          {t.stage2.attempts.length > 0 && (
            <AttemptList title={tr.stage2} attempts={t.stage2.attempts} tr={tr} lang={lang} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Stage summary chip ─── */
function StageSummary({
  label,
  stageNum,
  block,
  tr,
  lang,
}: {
  label: string;
  stageNum: 1 | 2;
  block: StageBlock;
  tr: (typeof L)["ar"] | (typeof L)["en"];
  lang: "ar" | "en";
}) {
  const status = block.latest_status;
  const style = status ? STATUS_STYLE[status] : STATUS_STYLE.NONE;
  const statusLabel = status
    ? (tr[`status${status}` as keyof typeof tr] as string)
    : tr.notStarted;

  const latest = block.attempts[block.attempts.length - 1];
  const ctaLabel = status === "SUBMITTED" ? tr.review : tr.view;

  return (
    <div className="rw-stage" style={{ borderColor: style.bdr }}>
      <div className="rw-stage-head">
        <span className="rw-stage-num">{stageNum}</span>
        <span className="rw-stage-label">{label}</span>
      </div>

      <div className="rw-stage-status" style={{ background: style.bg, color: style.fg, borderColor: style.bdr }}>
        <span className="rw-dot" style={{ background: style.dot }} />
        <span>{statusLabel}</span>
      </div>

      <div className="rw-stage-meta">
        <div className="rw-stage-meta-row">
          <span className="rw-meta-lbl">{lang === "ar" ? "المحاولات" : "Attempts"}</span>
          <span className="rw-meta-val">{block.attempt_count}</span>
        </div>
        {block.latest_score != null && block.latest_total != null && (
          <div className="rw-stage-meta-row">
            <span className="rw-meta-lbl">{tr.avgScore}</span>
            <span className="rw-meta-val rw-meta-val--num">
              {block.latest_score} / {block.latest_total}
            </span>
          </div>
        )}
        {block.latest_submitted_at && (
          <div className="rw-stage-meta-row">
            <span className="rw-meta-lbl">{tr.submittedAt}</span>
            <span className="rw-meta-val">{formatDate(block.latest_submitted_at, lang)}</span>
          </div>
        )}
      </div>

      {latest && (
        <Link
          href={`/school-admin/rowad/${latest.id}`}
          className={`rw-stage-cta${status === "SUBMITTED" ? " rw-stage-cta--primary" : ""}`}
        >
          {ctaLabel}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <polyline points={lang === "ar" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
          </svg>
        </Link>
      )}
    </div>
  );
}

/* ─── Attempts list (expanded view) ─── */
function AttemptList({
  title,
  attempts,
  tr,
  lang,
}: {
  title: string;
  attempts: Attempt[];
  tr: (typeof L)["ar"] | (typeof L)["en"];
  lang: "ar" | "en";
}) {
  // Newest first
  const ordered = [...attempts].reverse();
  return (
    <div className="rw-att-block">
      <div className="rw-att-block-title">
        <span className="rw-att-block-bar" />
        {title}
      </div>
      <div className="rw-att-rows">
        {ordered.map((a) => {
          const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.NONE;
          const statusLabel = tr[`status${a.status}` as keyof typeof tr] as string;
          return (
            <Link key={a.id} href={`/school-admin/rowad/${a.id}`} className="rw-att-row">
              <span className="rw-att-num">{tr.attempt(a.attempt_number)}</span>
              <span
                className="rw-att-status"
                style={{ background: st.bg, color: st.fg, borderColor: st.bdr }}
              >
                <span className="rw-dot" style={{ background: st.dot }} />
                {statusLabel}
              </span>
              <span className="rw-att-score">
                {a.score != null ? `${a.score} / ${a.total}` : "—"}
              </span>
              <span className="rw-att-date">{formatDate(a.submitted_at, lang)}</span>
              {a.reviewer_notes && (
                <span className="rw-att-notes" title={a.reviewer_notes}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {tr.notes}
                </span>
              )}
              <span className="rw-att-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <polyline points={lang === "ar" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState({ title, sub, icon }: { title: string; sub: string; icon: string }) {
  return (
    <div className="rw-empty">
      <div className="rw-empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

/* ─── Styles ─── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

  *,*::before,*::after{box-sizing:border-box}
  @keyframes rwFade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
  @keyframes rwPing { 0% { transform: scale(1); opacity:.7 } 80% { transform: scale(1.9); opacity:0 } 100% { transform: scale(1.9); opacity:0 } }

  .rw-page {
    font-family: 'Cairo', sans-serif;
    color: #1B1409;
    animation: rwFade .35s ease;
    display: flex; flex-direction: column; gap: 22px;
  }

  /* ── HERO ── */
  .rw-hero {
    position: relative;
    background: linear-gradient(180deg, #FFFBF1 0%, #FAF3DE 100%);
    border: 1px solid rgba(200,169,106,0.32);
    border-radius: 22px;
    padding: 26px 28px;
    box-shadow: 0 12px 36px rgba(11,11,12,0.04);
    overflow: hidden;
  }
  .rw-hero::after {
    content:''; position:absolute; inset:0; pointer-events:none;
    background:
      radial-gradient(ellipse at 90% 0%, rgba(229,185,60,0.14), transparent 45%),
      radial-gradient(ellipse at 5% 100%, rgba(122,30,30,0.04), transparent 45%);
  }
  .rw-hero-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
  }
  .rw-eyebrow {
    font-size: 10.5px; font-weight: 800; color: #B89B5E;
    letter-spacing: .22em; text-transform: uppercase;
  }
  .rw-title {
    font-size: 26px; font-weight: 900; color: #0B0B0C; margin: 6px 0 0;
    letter-spacing: -.4px;
  }
  .rw-title::after {
    content:''; display:block; width:56px; height:3px; border-radius:2px; margin-top:9px;
    background: linear-gradient(90deg, #C8A96A, #E5B93C);
  }
  .rw-sub { font-size: 14px; color: #8A7B60; margin-top: 12px; max-width: 560px; line-height: 1.7; }

  .rw-hero-stats { display: flex; gap: 10px; }
  .rw-stat {
    background: #FFFEFA;
    border: 1px solid rgba(11,11,12,0.08);
    border-radius: 14px;
    padding: 12px 18px;
    text-align: center;
    min-width: 130px;
  }
  .rw-stat--accent {
    background: linear-gradient(180deg, #0B0B0C, #1B1814);
    border-color: rgba(200,169,106,0.45);
  }
  .rw-stat--accent .rw-stat-val { color: #E5B93C; }
  .rw-stat--accent .rw-stat-lbl { color: rgba(232,220,188,0.85); }
  .rw-stat-val {
    font-size: 24px; font-weight: 900; color: #0B0B0C; line-height: 1;
    font-variant-numeric: tabular-nums; letter-spacing: -.5px;
  }
  .rw-stat-lbl {
    font-size: 11.5px; font-weight: 700; color: #8A7B60;
    margin-top: 6px;
  }

  /* ── FILTERS ── */
  .rw-filters {
    background: #FFFEFA; border: 1px solid rgba(11,11,12,0.07); border-radius: 16px;
    padding: 14px;
    display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
    box-shadow: 0 2px 16px rgba(11,11,12,0.025);
  }
  .rw-search {
    flex: 1; min-width: 220px;
    display: flex; align-items: center; gap: 8px;
    padding: 9px 14px; border-radius: 11px;
    background: #FBF8F0;
    border: 1px solid rgba(11,11,12,0.07);
    color: #8A7B60;
    transition: border-color .15s, background .15s;
  }
  .rw-search:focus-within { border-color: rgba(200,169,106,0.55); background: #fff; color: #B89B5E; }
  .rw-search-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-family: 'Cairo', sans-serif; font-size: 13.5px; color: #1B1409;
  }
  .rw-search-input::placeholder { color: #B0A487; font-weight: 500; }

  .rw-segment {
    display: inline-flex; gap: 4px;
    padding: 4px;
    background: #F4EDDA;
    border-radius: 11px;
    border: 1px solid rgba(200,169,106,0.20);
  }
  .rw-seg-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px;
    background: transparent; border: none; cursor: pointer;
    font-family: 'Cairo', sans-serif;
    font-size: 12.5px; font-weight: 700; color: #6E5E3F;
    transition: all .15s;
  }
  .rw-seg-btn:hover:not(.on) { color: #1B1409; background: rgba(255,255,255,0.5); }
  .rw-seg-btn.on {
    background: #0B0B0C; color: #E5B93C;
    box-shadow: 0 4px 12px rgba(11,11,12,0.18);
  }
  .rw-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }

  /* ── LIST ── */
  .rw-list { display: flex; flex-direction: column; gap: 14px; }

  /* ── CARD ── */
  .rw-card {
    position: relative;
    background: #FFFEFA;
    border: 1px solid rgba(11,11,12,0.08);
    border-radius: 18px;
    padding: 20px 22px;
    box-shadow: 0 6px 22px rgba(11,11,12,0.04);
    transition: box-shadow .2s, border-color .2s, transform .2s;
  }
  .rw-card:hover { box-shadow: 0 12px 32px rgba(11,11,12,0.07); border-color: rgba(200,169,106,0.32); }
  .rw-card--alert { border-color: rgba(229,185,60,0.45); }
  .rw-card--alert .rw-card-rail { opacity: 1; }
  .rw-card--inactive { opacity: 0.65; }
  .rw-card-rail {
    position: absolute; inset-inline-start: 0; top: 24px; bottom: 24px; width: 3px; border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, #E5B93C, #C8A96A);
    opacity: 0.0; transition: opacity .2s;
  }
  [dir="ltr"] .rw-card-rail { border-radius: 0 3px 3px 0; }
  [dir="rtl"] .rw-card-rail { border-radius: 3px 0 0 3px; }

  .rw-card-top { display: flex; align-items: center; gap: 14px; }

  .rw-av-wrap { position: relative; flex-shrink: 0; }
  .rw-av, .rw-av-img {
    width: 46px; height: 46px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0B0B0C, #1F1B14); color: #E5B93C;
    font-weight: 800; font-size: 15px; letter-spacing: 0.5px;
    object-fit: cover; border: 1px solid rgba(200,169,106,0.25);
  }
  .rw-av-img { padding: 0; background: #F4EDDA; }
  .rw-av-ping {
    position: absolute; inset: -4px; border-radius: 16px;
    border: 2px solid rgba(229,185,60,0.65);
    animation: rwPing 1.6s ease-out infinite;
    pointer-events: none;
  }

  .rw-card-id { flex: 1; min-width: 0; }
  .rw-card-name {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font-size: 15.5px; font-weight: 800; color: #0B0B0C;
  }
  .rw-inactive-tag {
    font-size: 10.5px; font-weight: 700; color: #7A1E1E;
    background: rgba(122,30,30,0.08); border: 1px solid rgba(122,30,30,0.20);
    padding: 2px 8px; border-radius: 99px;
  }
  .rw-card-email {
    font-size: 12px; color: #8A7B60; margin-top: 3px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rw-card-status {
    margin-top: 6px;
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11.5px; font-weight: 700; color: #6E5E3F;
  }
  .rw-status-mark {
    width: 5px; height: 5px; border-radius: 50%;
    background: linear-gradient(135deg, #C8A96A, #E5B93C);
  }

  .rw-expand-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 99px;
    background: #FBF8F0; border: 1px solid rgba(200,169,106,0.32);
    color: #6E5E3F; font-family: 'Cairo', sans-serif;
    font-size: 12px; font-weight: 700; cursor: pointer;
    transition: all .15s; flex-shrink: 0;
  }
  .rw-expand-btn:hover { background: #fff; border-color: #C8A96A; color: #0B0B0C; }

  /* ── STAGE GRID ── */
  .rw-stage-grid {
    margin-top: 16px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }
  @media (max-width: 720px) {
    .rw-stage-grid { grid-template-columns: 1fr; }
    .rw-hero-stats { width: 100%; }
    .rw-stat { flex: 1; min-width: 0; }
  }

  .rw-stage {
    background: #FFFCF3;
    border: 1px solid;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex; flex-direction: column; gap: 10px;
    position: relative;
  }
  .rw-stage-head { display: flex; align-items: center; gap: 8px; }
  .rw-stage-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: 8px;
    background: #0B0B0C; color: #E5B93C;
    font-size: 12px; font-weight: 900;
  }
  .rw-stage-label { font-size: 13.5px; font-weight: 800; color: #1B1409; }

  .rw-stage-status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 11px; border-radius: 99px;
    border: 1px solid;
    font-size: 12px; font-weight: 800;
    align-self: flex-start;
  }

  .rw-stage-meta {
    display: flex; flex-direction: column; gap: 4px;
    padding: 8px 0;
    border-top: 1px dashed rgba(200,169,106,0.20);
    border-bottom: 1px dashed rgba(200,169,106,0.20);
  }
  .rw-stage-meta-row {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11.5px;
  }
  .rw-meta-lbl { color: #8A7B60; font-weight: 600; }
  .rw-meta-val { color: #1B1409; font-weight: 700; }
  .rw-meta-val--num { font-variant-numeric: tabular-nums; }

  .rw-stage-cta {
    align-self: flex-start;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 9px;
    background: #FBF8F0;
    color: #1B1409;
    border: 1px solid rgba(11,11,12,0.10);
    font-size: 12.5px; font-weight: 800; text-decoration: none;
    transition: all .15s;
  }
  .rw-stage-cta:hover { background: #fff; border-color: rgba(200,169,106,0.55); }
  .rw-stage-cta--primary {
    background: #0B0B0C; color: #E5B93C;
    border-color: transparent;
    box-shadow: 0 6px 18px rgba(11,11,12,0.22);
  }
  .rw-stage-cta--primary:hover { background: #1A1610; color: #FFD66B; }

  /* ── ATTEMPTS ── */
  .rw-attempts {
    margin-top: 16px; padding-top: 14px;
    border-top: 1px dashed rgba(200,169,106,0.32);
    display: flex; flex-direction: column; gap: 14px;
    animation: rwFade .25s ease;
  }
  .rw-att-block-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 11.5px; font-weight: 800; color: #6E5E3F;
    letter-spacing: 1.2px; text-transform: uppercase;
    margin-bottom: 6px;
  }
  .rw-att-block-bar {
    width: 18px; height: 2px; border-radius: 2px;
    background: linear-gradient(90deg, #C8A96A, #E5B93C);
  }
  .rw-att-rows { display: flex; flex-direction: column; gap: 6px; }

  .rw-att-row {
    display: grid;
    grid-template-columns: 110px 150px 90px 1fr auto auto;
    align-items: center; gap: 14px;
    padding: 10px 14px; border-radius: 10px;
    background: #FBF8F0;
    border: 1px solid rgba(200,169,106,0.16);
    color: #1B1409; text-decoration: none;
    transition: all .15s;
  }
  .rw-att-row:hover { background: #fff; border-color: rgba(200,169,106,0.55); transform: translateY(-1px); }
  .rw-att-num { font-size: 12.5px; font-weight: 800; color: #0B0B0C; }
  .rw-att-status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 99px;
    border: 1px solid;
    font-size: 11px; font-weight: 800;
    justify-self: start;
  }
  .rw-att-score {
    font-size: 12.5px; font-weight: 800; color: #1B1409;
    font-variant-numeric: tabular-nums;
  }
  .rw-att-date { font-size: 12px; color: #8A7B60; font-weight: 600; }
  .rw-att-notes {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; color: #B89B5E;
  }
  .rw-att-arrow { color: #8A7B60; opacity: 0.7; }
  .rw-att-row:hover .rw-att-arrow { color: #0B0B0C; opacity: 1; }

  @media (max-width: 720px) {
    .rw-att-row {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .rw-att-num { grid-column: 1 / -1; }
    .rw-att-arrow { display: none; }
  }

  /* ── EMPTY STATE ── */
  .rw-empty {
    background: #FFFEFA;
    border: 1px solid rgba(11,11,12,0.07);
    border-radius: 18px; padding: 64px 32px;
    text-align: center;
    box-shadow: 0 2px 14px rgba(11,11,12,0.025);
  }
  .rw-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.85; }
  .rw-empty h2 { font-size: 18px; font-weight: 800; color: #0B0B0C; margin: 0 0 8px; }
  .rw-empty p { font-size: 13.5px; color: #8A7B60; margin: 0; }
`;
