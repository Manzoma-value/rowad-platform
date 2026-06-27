/* eslint-disable react-hooks/set-state-in-effect */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useConfirm } from "@/lib/confirm-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageProgress {
  title: string;
  passed: number;
  total: number;
}
interface RecentAttempt {
  module_title: string;
  stage_title: string;
  score_pct: number;
  passed: boolean;
  date: string;
}

interface Student {
  id: string;
  onboarding_status: string;
  created_at: string;
  profile: { full_name: string; avatar_url: string | null; is_active: boolean };
  class: { id: string; name: string } | null;
  attempts_count: number;
  passed_count: number;
  total_modules: number;
  avg_score: number | null;
  progress_pct: number;
  current_stage: { id: string; title: string; order: number } | null;
  current_module: { id: string; title: string } | null;
  stage_progress: StageProgress[];
  recent_attempts: RecentAttempt[];
}

interface ClassItem {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING_INTAKE: {
    label: "في انتظار القبول",
    color: "#8A7B60",
    bg: "rgba(138,123,96,0.08)",
    border: "rgba(138,123,96,0.18)",
  },
  INTAKE_SUBMITTED: {
    label: "بانتظار المراجعة",
    color: "#6B4E18",
    bg: "rgba(200,169,106,0.10)",
    border: "rgba(200,169,106,0.22)",
  },
  SCHOOL_ASSIGNED: {
    label: "تم تعيين المدرسة",
    color: "#1A4A7A",
    bg: "rgba(26,74,122,0.08)",
    border: "rgba(26,74,122,0.18)",
  },
  SCHOOL_PLACEMENT_SUBMITTED: {
    label: "اختبار التصنيف",
    color: "#4A2080",
    bg: "rgba(74,32,128,0.08)",
    border: "rgba(74,32,128,0.18)",
  },
  CLASS_ASSIGNED: {
    label: "في الفصل",
    color: "#1a6b3c",
    bg: "rgba(26,107,60,0.07)",
    border: "rgba(26,107,60,0.18)",
  },
};

// ─── Small components ─────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct >= 75
      ? "#2D8A4A"
      : pct >= 40
        ? "#C8A96A"
        : pct > 0
          ? "#C8A96A"
          : "#E4DDD0";
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F0EBE2"
          strokeWidth="5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 900, color }}>{pct}%</span>
      </div>
    </div>
  );
}

function ScoreChip({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#1a6b3c" : pct >= 50 ? "#6B4E18" : "#7A1E1E";
  const bg =
    pct >= 75
      ? "rgba(26,107,60,0.09)"
      : pct >= 50
        ? "rgba(200,169,106,0.12)"
        : "rgba(122,30,30,0.08)";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: 5,
        background: bg,
        color,
      }}
    >
      {pct}%
    </span>
  );
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({
  student,
  classes,
  onAssign,
  onToggle,
  toggling,
}: {
  student: Student;
  classes: ClassItem[];
  onAssign: (studentId: string, classId: string) => void;
  onToggle: (studentId: string, currentActive: boolean) => void;
  toggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta =
    STATUS_META[student.onboarding_status] ?? STATUS_META.PENDING_INTAKE;
  const initials = student.profile.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className={`sc-card${expanded ? " sc-card--open" : ""}`}>
      {/* ── Card top ── */}
      <div className="sc-top" onClick={() => setExpanded((v) => !v)}>
        {/* Avatar */}
        <div className="sc-av">
          {student.profile.avatar_url ? (
            <img
              src={student.profile.avatar_url}
              alt={student.profile.full_name}
              className="sc-av-img"
            />
          ) : (
            <span className="sc-av-initials">{initials}</span>
          )}
        </div>

        {/* Info */}
        <div className="sc-info">
          <div className="sc-name">{student.profile.full_name}</div>
          <div className="sc-meta-row">
            <span
              className="sc-status"
              style={{
                color: meta.color,
                background: meta.bg,
                borderColor: meta.border,
              }}
            >
              {meta.label}
            </span>
            {student.class && (
              <span className="sc-class-chip">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                {student.class.name}
              </span>
            )}
          </div>

          {/* Inactive badge */}
          {!student.profile.is_active && (
            <div className="sc-inactive-badge">معطّل</div>
          )}

          {/* Current position */}
          {student.current_stage ? (
            <div className="sc-current">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                {student.current_stage.title} ·{" "}
                {student.current_module?.title ?? "—"}
              </span>
            </div>
          ) : student.attempts_count > 0 ? (
            <div className="sc-current sc-current--done">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>أكمل جميع المستويات</span>
            </div>
          ) : (
            <div className="sc-current sc-current--none">لم يبدأ بعد</div>
          )}
        </div>

        {/* Stats + ring */}
        <div className="sc-right">
          <ProgressRing pct={student.progress_pct} />
          <div className="sc-stat-row">
            <div className="sc-stat">
              <span className="sc-stat-n">{student.passed_count}</span>
              <span className="sc-stat-l">مكتمل</span>
            </div>
            <div className="sc-stat-div" />
            <div className="sc-stat">
              <span className="sc-stat-n">{student.total_modules}</span>
              <span className="sc-stat-l">إجمالي</span>
            </div>
          </div>
          {student.avg_score !== null && (
            <div style={{ textAlign: "center" }}>
              <ScoreChip pct={student.avg_score} />
            </div>
          )}
        </div>

        {/* Activate / Deactivate toggle */}
        <button
          data-write="true"
          className={`sc-toggle-btn ${student.profile.is_active ? "sc-toggle-btn--off" : "sc-toggle-btn--on"}`}
          onClick={(e) => { e.stopPropagation(); onToggle(student.id, student.profile.is_active); }}
          disabled={toggling}
          title={student.profile.is_active ? "تعطيل الطالب" : "تفعيل الطالب"}
        >
          {toggling ? (
            <span className="sc-spin" />
          ) : student.profile.is_active ? (
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
            </svg>
          ) : (
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v8m-4-4h8" />
            </svg>
          )}
        </button>

        {/* Chevron */}
        <div
          className="sc-chevron"
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      <div className="sc-progress-bar">
        <div
          className="sc-progress-fill"
          style={{ width: `${student.progress_pct}%` }}
        />
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="sc-detail">
          {/* Stage breakdown */}
          {student.stage_progress.length > 0 && (
            <div className="sc-section">
              <div className="sc-section-title">تقدم المراحل</div>
              <div className="sc-stages">
                {student.stage_progress.map((stage, i) => {
                  const stagePct =
                    stage.total > 0
                      ? Math.round((stage.passed / stage.total) * 100)
                      : 0;
                  const isDone =
                    stage.passed === stage.total && stage.total > 0;
                  const isActive =
                    !isDone &&
                    (i === 0 ||
                      student.stage_progress
                        .slice(0, i)
                        .every((s) => s.passed === s.total));
                  return (
                    <div key={i} className="sc-stage-row">
                      <div
                        className={`sc-stage-dot${isDone ? " done" : isActive ? " active" : ""}`}
                      />
                      <div className="sc-stage-body">
                        <div className="sc-stage-head">
                          <span className="sc-stage-title">{stage.title}</span>
                          <span className="sc-stage-count">
                            {stage.passed}/{stage.total}
                          </span>
                        </div>
                        <div className="sc-stage-track">
                          <div
                            className="sc-stage-fill"
                            style={{
                              width: `${stagePct}%`,
                              background: isDone
                                ? "#2D8A4A"
                                : isActive
                                  ? "#C8A96A"
                                  : "#E4DDD0",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent attempts */}
          {student.recent_attempts.length > 0 && (
            <div className="sc-section">
              <div className="sc-section-title">آخر المحاولات</div>
              <div className="sc-attempts">
                {student.recent_attempts.map((a, i) => (
                  <div key={i} className="sc-attempt-row">
                    <div
                      className={`sc-att-dot${a.passed ? " passed" : " failed"}`}
                    />
                    <div className="sc-att-info">
                      <span className="sc-att-stage">{a.stage_title}</span>
                      <span className="sc-att-mod">{a.module_title}</span>
                    </div>
                    <div className="sc-att-right">
                      <ScoreChip pct={a.score_pct} />
                      <span className="sc-att-date">
                        {new Date(a.date).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {student.attempts_count === 0 && (
            <div className="sc-no-attempts">لم يبدأ أي مستوى بعد</div>
          )}

          {/* Assign class */}
          <div className="sc-section">
            <div className="sc-section-title">تعيين الفصل</div>
            <select
              className="sc-select"
              value={student.class?.id ?? ""}
              onChange={(e) => onAssign(student.id, e.target.value)}
              dir="rtl"
            >
              <option value="">— بدون فصل —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchoolAdminStudentsPage() {
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "none">("all");
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState("");

  async function load() {
    const [sRes, cRes] = await Promise.all([
      fetch("/api/school-admin/students"),
      fetch("/api/school-admin/classes"),
    ]);
    const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
    setStudents(sData.students ?? []);
    setClasses(cData.classes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(studentId: string, currentActive: boolean) {
    if (currentActive) {
      const ok = await confirm({
        title: "تعطيل حساب الطالب",
        message: "سيتم تعطيل وصول هذا الطالب فوراً. لن يتمكن من الدخول حتى تعيد تفعيله.",
        variant: "warning",
        confirmText: "تعطيل",
        irreversible: false,
      });
      if (!ok) return;
    }
    setToggling(studentId);
    setToggleError("");
    try {
      const r = await fetch(`/api/school-admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const d = await r.json();
      if (!r.ok) { setToggleError(d.error ?? "حدث خطأ"); return; }
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? { ...s, profile: { ...s.profile, is_active: !currentActive } }
            : s,
        ),
      );
    } catch {
      setToggleError("تعذر الاتصال بالخادم");
    } finally {
      setToggling(null);
    }
  }

  async function handleAssign(studentId: string, classId: string) {
    await fetch(`/api/school-admin/students/${studentId}/assign-class`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: classId || null }),
    });
    load();
  }

  const filtered = students.filter((s) => {
    const matchSearch = s.profile.full_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? s.attempts_count > 0
          : s.attempts_count === 0;
    return matchSearch && matchFilter;
  });

  const totalActive = students.filter((s) => s.attempts_count > 0).length;
  const avgProgress =
    students.length > 0
      ? Math.round(
          students.reduce((sum, s) => sum + s.progress_pct, 0) /
            students.length,
        )
      : 0;

  return (
    <div className="sp-page" dir="rtl">
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="sp-header">
        <div>
          <p className="sp-eyebrow">سجل الطلاب</p>
          <h1 className="sp-title">الطلاب</h1>
          <p className="sp-sub">{students.length} طالب مسجل</p>
        </div>
        <div className="sp-header-stats">
          <div className="sp-hstat">
            <span className="sp-hstat-n">{totalActive}</span>
            <span className="sp-hstat-l">نشط</span>
          </div>
          <div className="sp-hstat">
            <span className="sp-hstat-n">{avgProgress}%</span>
            <span className="sp-hstat-l">متوسط التقدم</span>
          </div>
        </div>
      </div>

      <div className="sp-rule">
        <div className="sp-rule-line" />
        <div className="sp-rule-diamond" />
        <div className="sp-rule-line" />
      </div>

      {/* ── Toolbar ── */}
      <div className="sp-toolbar">
        {/* Search */}
        <div className="sp-search-wrap">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="sp-search-icon"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="sp-search"
            placeholder="بحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="rtl"
          />
          {search && (
            <button className="sp-search-clear" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="sp-filters">
          {(
            [
              ["all", "الكل"],
              ["active", "النشطون"],
              ["none", "لم يبدأ"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              className={`sp-filter-btn${filter === v ? " active" : ""}`}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {toggleError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(139,26,26,0.06)", border: "1px solid rgba(139,26,26,0.18)",
          color: "#8b1a1a", fontSize: 13, padding: "10px 14px", borderRadius: 9, fontWeight: 600,
        }}>
          {toggleError}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="sp-loading">
          <div className="sp-spinner" />
          <span>جارٍ تحميل الطلاب...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sp-empty">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <p>لا يوجد طلاب</p>
        </div>
      ) : (
        <div className="sp-grid">
          {filtered.map((s, i) => (
            <div key={s.id} style={{ animationDelay: `${i * 35}ms` }}>
              <StudentCard
                student={s}
                classes={classes}
                onAssign={handleAssign}
                onToggle={handleToggle}
                toggling={toggling === s.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}

:root{
  --gold:#C8A96A;--gold2:#E5B93C;
  --black:#0B0B0C;--off-white:#F5F3EE;
  --text:#0B0B0C;--text2:#3D3526;--text3:#8A7B60;
  --surface:#FFFFFF;--surface2:#FAFAF8;
  --border:rgba(8,11,12,0.09);--border2:#E4DDD0;
  --font:'Cairo',sans-serif;
}

/* Page */
.sp-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);color:var(--text);animation:fadeUp 0.3s ease}

/* Header */
.sp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.sp-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:4px}
.sp-title{font-size:26px;font-weight:900;color:var(--black);letter-spacing:-0.4px}
.sp-sub{font-size:12px;color:var(--text3);margin-top:3px;font-weight:500}
.sp-header-stats{display:flex;gap:20px;align-items:center}
.sp-hstat{display:flex;flex-direction:column;align-items:center;gap:2px}
.sp-hstat-n{font-size:22px;font-weight:900;color:var(--gold);line-height:1}
.sp-hstat-l{font-size:10px;color:var(--text3);font-weight:600}

.sp-rule{display:flex;align-items:center;gap:10px}
.sp-rule-line{flex:1;height:1px;background:var(--border2)}
.sp-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.45;flex-shrink:0}

/* Toolbar */
.sp-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.sp-search-wrap{position:relative;display:flex;align-items:center}
.sp-search-icon{position:absolute;right:12px;color:var(--text3);pointer-events:none}
.sp-search{padding:9px 34px 9px 14px;background:var(--surface);border:1px solid var(--border2);border-radius:8px;font-size:13px;font-family:var(--font);color:var(--text);outline:none;width:220px;transition:border-color 0.15s,box-shadow 0.15s}
.sp-search:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,169,106,0.1)}
.sp-search-clear{position:absolute;left:10px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:2px 5px;border-radius:4px;transition:color 0.15s}
.sp-search-clear:hover{color:var(--text)}
.sp-filters{display:flex;gap:4px}
.sp-filter-btn{padding:7px 14px;border-radius:7px;border:1px solid var(--border2);background:var(--surface);font-family:var(--font);font-size:12px;font-weight:600;color:var(--text3);cursor:pointer;transition:all 0.15s}
.sp-filter-btn:hover{border-color:rgba(200,169,106,0.35)}
.sp-filter-btn.active{background:var(--black);border-color:var(--black);color:var(--gold)}

/* Loading / empty */
.sp-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:200px;color:var(--text3);font-size:14px}
.sp-spinner{width:24px;height:24px;border:3px solid rgba(200,169,106,0.15);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
.sp-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px;color:var(--text3);font-size:14px;font-weight:600;text-align:center}
.sp-empty svg{color:rgba(200,169,106,0.35)}

/* Grid */
.sp-grid{display:flex;flex-direction:column;gap:10px}

/* ── Student Card ── */
.sc-card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:16px;
  overflow:hidden;
  transition:border-color 0.2s,box-shadow 0.2s;
  animation:fadeUp 0.35s ease both;
}
.sc-card:hover{border-color:rgba(200,169,106,0.3);box-shadow:0 4px 20px rgba(8,11,12,0.06)}
.sc-card--open{border-color:rgba(200,169,106,0.35);box-shadow:0 6px 28px rgba(8,11,12,0.08)}

.sc-top{
  display:flex;align-items:flex-start;gap:14px;
  padding:18px 18px 14px;cursor:pointer;
  position:relative;
}
.sc-top::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0;transition:opacity 0.2s}
.sc-card--open .sc-top::before{opacity:1}

/* Avatar */
.sc-av{
  width:52px;height:52px;border-radius:14px;
  background:var(--black);flex-shrink:0;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
}
.sc-av-img{width:100%;height:100%;object-fit:cover}
.sc-av-initials{font-size:18px;font-weight:900;color:var(--gold)}

/* Info */
.sc-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.sc-name{font-size:15px;font-weight:900;color:var(--black);letter-spacing:-0.2px}
.sc-meta-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.sc-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid;white-space:nowrap}
.sc-class-chip{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--text3)}
.sc-current{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text3);font-weight:600}
.sc-current svg{color:var(--gold);flex-shrink:0}
.sc-current--done{color:#2D8A4A}
.sc-current--done svg{color:#2D8A4A}
.sc-current--none{color:rgba(8,11,12,0.25);font-style:italic}

/* Right stats */
.sc-right{display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0}
.sc-stat-row{display:flex;align-items:center;gap:6px}
.sc-stat{display:flex;flex-direction:column;align-items:center;gap:1px}
.sc-stat-n{font-size:14px;font-weight:900;color:var(--black);line-height:1}
.sc-stat-l{font-size:9px;color:var(--text3);font-weight:600}
.sc-stat-div{width:1px;height:18px;background:var(--border)}

/* Chevron */
.sc-chevron{color:var(--text3);flex-shrink:0;margin-top:4px;transition:transform 0.2s;display:flex}

/* Progress bar */
.sc-progress-bar{height:3px;background:#F0EBE2;overflow:hidden}
.sc-progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width 0.8s ease}

/* Detail */
.sc-detail{padding:18px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:18px;background:var(--surface2)}

.sc-section{display:flex;flex-direction:column;gap:10px}
.sc-section-title{font-size:9.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3)}

/* Stage progress */
.sc-stages{display:flex;flex-direction:column;gap:10px}
.sc-stage-row{display:flex;align-items:flex-start;gap:10px}
.sc-stage-dot{width:10px;height:10px;border-radius:50%;background:#E4DDD0;flex-shrink:0;margin-top:4px;border:2px solid #E4DDD0;transition:all 0.2s}
.sc-stage-dot.done{background:#2D8A4A;border-color:#2D8A4A}
.sc-stage-dot.active{background:var(--gold);border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,169,106,0.2)}
.sc-stage-body{flex:1;display:flex;flex-direction:column;gap:5px}
.sc-stage-head{display:flex;justify-content:space-between;align-items:center}
.sc-stage-title{font-size:13px;font-weight:700;color:var(--text)}
.sc-stage-count{font-size:11px;font-weight:700;color:var(--text3)}
.sc-stage-track{height:5px;background:#F0EBE2;border-radius:99px;overflow:hidden}
.sc-stage-fill{height:100%;border-radius:99px;transition:width 0.8s ease}

/* Attempts */
.sc-attempts{display:flex;flex-direction:column;gap:7px}
.sc-attempt-row{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 12px}
.sc-att-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.sc-att-dot.passed{background:#2D8A4A}
.sc-att-dot.failed{background:#C8A96A}
.sc-att-info{flex:1;display:flex;flex-direction:column;gap:1px}
.sc-att-stage{font-size:9.5px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px}
.sc-att-mod{font-size:13px;font-weight:700;color:var(--black)}
.sc-att-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.sc-att-date{font-size:10px;color:var(--text3)}

/* No attempts */
.sc-no-attempts{text-align:center;color:rgba(8,11,12,0.25);font-size:12px;font-style:italic;padding:12px 0}

/* Class select */
.sc-select{width:100%;max-width:280px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 12px;font-size:13px;font-family:var(--font);outline:none;cursor:pointer;transition:border-color 0.15s}
.sc-select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,169,106,0.1)}

/* Inactive badge */
.sc-inactive-badge{font-size:10px;font-weight:800;color:#8b1a1a;background:rgba(139,26,26,0.08);border:1px solid rgba(139,26,26,0.18);border-radius:5px;padding:2px 7px;display:inline-block;width:fit-content}

/* Activate / deactivate toggle */
.sc-toggle-btn{flex-shrink:0;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid;transition:all 0.18s;background:none;margin-top:2px}
.sc-toggle-btn:disabled{opacity:0.4;cursor:not-allowed}
.sc-toggle-btn--off{background:rgba(139,26,26,0.07);border-color:rgba(139,26,26,0.22);color:#8b1a1a}
.sc-toggle-btn--off:hover:not(:disabled){background:rgba(139,26,26,0.14)}
.sc-toggle-btn--on{background:rgba(45,138,74,0.08);border-color:rgba(45,138,74,0.22);color:#2D8A4A}
.sc-toggle-btn--on:hover:not(:disabled){background:rgba(45,138,74,0.15)}
.sc-spin{display:inline-block;width:11px;height:11px;border:2px solid rgba(200,169,106,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}

@media(max-width:700px){
  .sc-top{flex-wrap:wrap; gap:10px}
  .sc-right{flex-direction:row; align-items:center; flex-wrap:wrap}
  .sc-name{font-size:14px}
  .sc-stat-n{font-size:13px}
  .sc-stat-l{font-size:8.5px}
  .sc-card{padding:14px}
  .sc-status{font-size:9.5px}
  .sc-select{font-size:12.5px; max-width:100%}
}
@media(max-width:420px){
  .sc-card{padding:12px}
  .sc-stat-row{gap:4px}
  .sc-stat-div{height:14px}
}
`;
