/* eslint-disable react-hooks/set-state-in-effect */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TraitEvalForm from "@/components/TraitEvalForm";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface TraitScore {
  trait_id: string;
  trait_name: string;
  maqsad: string;
  score: number;
  note: string | null;
}
interface TraitAssessment {
  module_id: string;
  module_title: string;
  stage_title: string;
  total_score: number;
  general_note: string | null;
  submitted_at: string;
  updated_at: string;
  trait_scores: TraitScore[];
}
interface PendingModule {
  module_id: string;
  module_title: string;
  stage_title: string;
  stage_order: number;
  completed_at: string;
}
interface TimelineItem {
  date: string;
  module_id: string;
  module_title: string;
  stage_title: string;
  stage_order: number;
  module_order: number;
  score_pct: number;
  passed: boolean;
  score: number;
  total: number;
  trait_assessed: boolean;
}
interface TypeAccuracy {
  type: string;
  correct: number;
  total: number;
  pct: number;
}
interface StageBreakdown {
  title: string;
  avg_score: number | null;
  modules_done: number;
}
interface RadarPoint {
  trait_id: string;
  name: string;
  maqsad: string;
  average: number;
}

interface StudentDetail {
  student: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    class_name: string | null;
    attempts_count: number;
    passed_count: number;
    avg_score: number | null;
    trait_assessments_count: number;
    pending_trait_assessments_count: number;
  };
  timeline: TimelineItem[];
  type_accuracy: TypeAccuracy[];
  stage_breakdown: StageBreakdown[];
  pending_trait_assessments: PendingModule[];
  trait_assessments: TraitAssessment[];
  trait_radar: RadarPoint[];
}

interface EvalTrait {
  id: string;
  maqsad: string;
  name: string;
  definition: string | null;
  elements: { id: string; text: string; order: number }[];
}
interface Weight {
  traitId: string;
  maxScore: number;
  isMain: boolean;
}

interface EvalData {
  module: { id: string; title: string; main_trait_id: string | null };
  stage: { id: string; title: string };
  traits: EvalTrait[];
  weights: Weight[];
  attempt: { score: number; total: number; passed: boolean };
  assessment: {
    id: string;
    general_note: string | null;
    trait_scores: { trait_id: string; score: number; note: string | null }[];
  } | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAQSAD_LABELS: Record<string, string> = {
  DEEN: "الدين",
  AQL: "العقل",
  NAFS: "النفس",
  NASL: "النسل",
  MAL: "المال",
};
const MAQSAD_COLORS: Record<string, { color: string; bg: string }> = {
  DEEN: { color: "#7A6020", bg: "rgba(229,185,60,0.10)" },
  AQL: { color: "#4A2080", bg: "rgba(74,32,128,0.08)" },
  NAFS: { color: "#1A5C3A", bg: "rgba(26,92,58,0.09)" },
  NASL: { color: "#7A1E1E", bg: "rgba(122,30,30,0.08)" },
  MAL: { color: "#5A4A10", bg: "rgba(154,98,0,0.09)" },
};
const TYPE_LABELS: Record<string, string> = {
  MCQ: "اختيار متعدد",
  TF: "صح/خطأ",
  WRITTEN: "مقالي",
  MATCHING: "توصيل",
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function ScoreRing({ pct, size = 52 }: { pct: number | null; size?: number }) {
  if (pct === null)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(200,169,106,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#9a7a6a", fontWeight: 700 }}>
          —
        </span>
      </div>
    );
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? "#2D8A4A" : pct >= 50 ? "#C8A96A" : "#7A1E1E";
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
          stroke="rgba(200,169,106,0.12)"
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
        <span style={{ fontSize: size < 48 ? 10 : 13, fontWeight: 800, color }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

function RadarChart({ data }: { data: RadarPoint[] }) {
  if (!data.length)
    return (
      <div
        style={{
          color: "#9a7a6a",
          fontSize: 12,
          textAlign: "center",
          padding: 20,
        }}
      >
        لا توجد بيانات
      </div>
    );
  const n = data.length;
  const cx = 120,
    cy = 120,
    r = 90;
  const angles = data.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);
  const pts = (scale: number) =>
    angles
      .map(
        (a, i) =>
          `${cx + r * scale * (data[i].average / 100) * Math.cos(a)},${cy + r * scale * (data[i].average / 100) * Math.sin(a)}`,
      )
      .join(" ");
  const gridPts = (scale: number) =>
    angles
      .map(
        (a) =>
          `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`,
      )
      .join(" ");
  return (
    <svg viewBox="0 0 240 240" width="100%" style={{ maxWidth: 240 }}>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={gridPts(s)}
          fill="none"
          stroke="rgba(200,169,106,0.12)"
          strokeWidth="1"
        />
      ))}
      {angles.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + r * Math.cos(a)}
          y2={cy + r * Math.sin(a)}
          stroke="rgba(200,169,106,0.1)"
          strokeWidth="1"
        />
      ))}
      <polygon
        points={pts(1)}
        fill="rgba(200,169,106,0.15)"
        stroke="#C8A96A"
        strokeWidth="2"
      />
      {data.map((d, i) => {
        const x = cx + r * (d.average / 100) * Math.cos(angles[i]);
        const y = cy + r * (d.average / 100) * Math.sin(angles[i]);
        const lx = cx + (r + 18) * Math.cos(angles[i]);
        const ly = cy + (r + 18) * Math.sin(angles[i]);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#C8A96A" />
            <text
              x={lx}
              y={ly}
              fontSize="9"
              fill="#8A7B60"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}



// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StudentReportPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [evalModuleId, setEvalModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"progress" | "traits" | "stats">(
    "progress",
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/teacher/reports/students/${studentId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="sp-page" dir="rtl">
        <div className="sp-loading">
          <div className="sp-spinner" />
          <span>جارٍ التحميل...</span>
        </div>
        <style>{css}</style>
      </div>
    );

  if (!data) return null;

  const { student } = data;
  const allModules = [...data.trait_assessments.map((a) => a.module_id)];
  const pendingIds = new Set(
    data.pending_trait_assessments.map((p) => p.module_id),
  );

  return (
    <div className="sp-page" dir="rtl">
      {/* Back */}
      <button className="sp-back" onClick={() => router.back()}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        العودة للتقارير
      </button>

      {/* Student header */}
      <div className="sp-header-card">
        <div className="sp-header-av">{student.full_name.charAt(0)}</div>
        <div className="sp-header-info">
          <h1 className="sp-header-name">{student.full_name}</h1>
          {student.class_name && (
            <div className="sp-header-class">{student.class_name}</div>
          )}
        </div>
        <div className="sp-header-stats">
          <div className="sp-hstat">
            <span className="sp-hstat-num">{student.attempts_count}</span>
            <span className="sp-hstat-label">محاولة</span>
          </div>

          <div className="sp-hstat">
            <span className="sp-hstat-num">
              {student.trait_assessments_count}
            </span>
            <span className="sp-hstat-label">تقييم سمات</span>
          </div>
          {student.pending_trait_assessments_count > 0 && (
            <div className="sp-hstat pending">
              <span className="sp-hstat-num">
                {student.pending_trait_assessments_count}
              </span>
              <span className="sp-hstat-label">معلّق</span>
            </div>
          )}
          <ScoreRing pct={student.avg_score} size={60} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sp-tabs">
        {(
          [
            ["progress", "المسار والتقييم"],
            ["traits", "السمات"],
            ["stats", "الإحصائيات"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`sp-tab ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
            {key === "traits" &&
              student.pending_trait_assessments_count > 0 && (
                <span className="sp-tab-badge">
                  {student.pending_trait_assessments_count}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* ── TAB: PROGRESS ── */}
      {activeTab === "progress" && (
        <div className="sp-section">
          <div className="sp-section-title">سجل المستويات</div>
          <div className="sp-timeline">
            {data.timeline.map((item, idx) => (
              <div
                key={idx}
                className={`sp-tl-row ${item.passed ? "passed" : "failed"}`}
              >
                <div className="sp-tl-dot-wrap">
                  <div className="sp-tl-dot" />
                  {idx < data.timeline.length - 1 && (
                    <div className="sp-tl-line" />
                  )}
                </div>
                <div className="sp-tl-body">
                  <div className="sp-tl-head">
                    <div className="sp-tl-info">
                      <span className="sp-tl-stage">{item.stage_title}</span>
                      <span className="sp-tl-mod">{item.module_title}</span>
                    </div>
                    <div className="sp-tl-right">
                      <span
                        className="sp-tl-score"
                        style={{ color: item.passed ? "#2D8A4A" : "#7A1E1E" }}
                      >
                        {item.score}/{item.total} ({item.score_pct}%)
                      </span>
                      <span className="sp-tl-date">
                        {new Date(item.date).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  {/* Trait status */}
                  {
                    <div className="sp-tl-trait-row">
                      {item.trait_assessed ? (
                        <div className="sp-tl-trait-done">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          تم تقييم السمات
                        </div>
                      ) : (
                        <button
                          className="sp-tl-eval-btn"
                          onClick={() => setEvalModuleId(item.module_id)}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          تقييم السمات
                        </button>
                      )}
                    </div>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: TRAITS ── */}
      {activeTab === "traits" && (
        <div className="sp-section">
          {/* Pending evaluations */}
          {data.pending_trait_assessments.length > 0 && (
            <div className="sp-pending-section">
              <div className="sp-section-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                تقييمات معلّقة ({data.pending_trait_assessments.length})
              </div>
              <div className="sp-pending-list">
                {data.pending_trait_assessments.map((p) => (
                  <div key={p.module_id} className="sp-pending-row">
                    <div className="sp-pending-info">
                      <span className="sp-pending-stage">{p.stage_title}</span>
                      <span className="sp-pending-mod">{p.module_title}</span>
                    </div>
                    <button
                      className="sp-eval-btn"
                      onClick={() => setEvalModuleId(p.module_id)}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      تقييم السمات
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Radar chart */}
          {data.trait_radar.length > 0 && (
            <div className="sp-radar-section">
              <div className="sp-section-title">متوسط السمات</div>
              <div className="sp-radar-wrap">
                <RadarChart data={data.trait_radar} />
                <div className="sp-radar-legend">
                  {data.trait_radar.map((r) => {
                    const m = MAQSAD_COLORS[r.maqsad];
                    return (
                      <div key={r.trait_id} className="sp-legend-row">
                        <span
                          className="sp-legend-tag"
                          style={{ background: m.bg, color: m.color }}
                        >
                          {MAQSAD_LABELS[r.maqsad]}
                        </span>
                        <span className="sp-legend-name">{r.name}</span>
                        <span
                          className="sp-legend-avg"
                          style={{
                            color:
                              r.average >= 75
                                ? "#2D8A4A"
                                : r.average >= 50
                                  ? "#C8A96A"
                                  : "#7A1E1E",
                          }}
                        >
                          {r.average}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Completed assessments */}
          {data.trait_assessments.length > 0 && (
            <div className="sp-assessed-section">
              <div className="sp-section-title">التقييمات المكتملة</div>
              <div className="sp-assessed-list">
                {data.trait_assessments.map((a) => (
                  <div key={a.module_id} className="sp-assessed-card">
                    <div className="sp-assessed-head">
                      <div className="sp-assessed-info">
                        <span className="sp-assessed-stage">
                          {a.stage_title}
                        </span>
                        <span className="sp-assessed-mod">
                          {a.module_title}
                        </span>
                      </div>
                      <div className="sp-assessed-right">
                        <div
                          className="sp-assessed-total"
                          style={{
                            color:
                              a.total_score >= 75
                                ? "#2D8A4A"
                                : a.total_score >= 50
                                  ? "#C8A96A"
                                  : "#7A1E1E",
                          }}
                        >
                          {Math.round(a.total_score * 10) / 10}
                          <span style={{ fontSize: 11, opacity: 0.6 }}>
                            /100
                          </span>
                        </div>
                        <button
                          className="sp-reassess-btn"
                          onClick={() => setEvalModuleId(a.module_id)}
                        >
                          تعديل
                        </button>
                      </div>
                    </div>
                    {/* Trait scores */}
                    <div className="sp-assessed-traits">
                      {a.trait_scores.map((ts) => {
                        const m = MAQSAD_COLORS[ts.maqsad];
                        return (
                          <div
                            key={ts.trait_id}
                            className="sp-assessed-trait-row"
                          >
                            <span
                              className="sp-assessed-maqsad"
                              style={{ background: m.bg, color: m.color }}
                            >
                              {MAQSAD_LABELS[ts.maqsad]}
                            </span>
                            <span className="sp-assessed-tname">
                              {ts.trait_name}
                            </span>
                            <div className="sp-assessed-bar-bg">
                              <div
                                className="sp-assessed-bar-fill"
                                style={{
                                  width: `${Math.min(ts.score * 2, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="sp-assessed-tscore">
                              {ts.score}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {a.general_note && (
                      <div className="sp-assessed-note">
                        &ldquo;{a.general_note}&ldquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.trait_assessments.length === 0 &&
            data.pending_trait_assessments.length === 0 && (
              <div className="sp-empty-traits">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <p>لم يُكمل الطالب أي مستوى بعد</p>
              </div>
            )}
        </div>
      )}

      {/* ── TAB: STATS ── */}
      {activeTab === "stats" && (
        <div className="sp-section">
          {/* Type accuracy */}
          {data.type_accuracy.length > 0 && (
            <div className="sp-stat-card">
              <div className="sp-section-title">الدقة حسب نوع السؤال</div>
              <div className="sp-type-list">
                {data.type_accuracy.map((item) => (
                  <div key={item.type} className="sp-type-row">
                    <span className="sp-type-label">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    <div className="sp-type-track">
                      <div
                        className="sp-type-fill"
                        style={{
                          width: `${item.pct}%`,
                          background:
                            item.pct >= 75
                              ? "#2D8A4A"
                              : item.pct >= 50
                                ? "#C8A96A"
                                : "#7A1E1E",
                        }}
                      />
                    </div>
                    <span className="sp-type-pct">{item.pct}%</span>
                    <span className="sp-type-frac">
                      {item.correct}/{item.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Stage breakdown */}
          {data.stage_breakdown.length > 0 && (
            <div className="sp-stat-card">
              <div className="sp-section-title">الأداء حسب المرحلة</div>
              <div className="sp-stage-list">
                {data.stage_breakdown.map((s, i) => (
                  <div key={i} className="sp-stage-row">
                    <span className="sp-stage-name">{s.title}</span>
                    <div className="sp-stage-track">
                      <div
                        className="sp-stage-fill"
                        style={{
                          width: `${s.avg_score ?? 0}%`,
                          background:
                            (s.avg_score ?? 0) >= 75
                              ? "#2D8A4A"
                              : (s.avg_score ?? 0) >= 50
                                ? "#C8A96A"
                                : "#7A1E1E",
                        }}
                      />
                    </div>
                    <span className="sp-stage-avg">
                      {s.avg_score !== null ? `${s.avg_score}%` : "—"}
                    </span>
                    <span className="sp-stage-mods">{s.modules_done} وحدة</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EVAL FORM (inline overlay) ── */}
      {evalModuleId && (
        <div className="sp-eval-overlay">
          <div className="sp-eval-panel">
            <TraitEvalForm
              studentId={studentId}
              moduleId={evalModuleId}
              onClose={() => setEvalModuleId(null)}
              onSaved={() => {
                setEvalModuleId(null);
                load();
              }}
            />
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fillIn{from{width:0}}
@keyframes overlayIn{from{opacity:0}to{opacity:1}}
@keyframes panelIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

:root{
  --gold:#C8A96A;--gold2:#E5B93C;
  --gold-pale:rgba(200,169,106,0.08);
  --gold-border:rgba(200,169,106,0.18);
  --black:#0B0B0C;
  --text:#0B0B0C;--text2:#3D3526;--text3:#8A7B60;
  --surface:#FFFFFF;--surface2:#FAFAF8;
  --border:rgba(8,11,12,0.09);
  --font:'Cairo',sans-serif;
}

.sp-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);color:var(--text);padding:36px 40px 80px;min-height:100vh;animation:fadeUp 0.35s ease;position:relative}

.sp-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:200px;color:var(--text3);font-size:14px}
.sp-spinner{width:26px;height:26px;border:3px solid var(--gold-border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}

/* Back */
.sp-back{display:inline-flex;align-items:center;gap:7px;background:none;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--text3);padding:0;transition:color 0.15s}
.sp-back:hover{color:var(--text)}

/* Header card */
.sp-header-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px 28px;display:flex;align-items:center;gap:18px;box-shadow:0 4px 20px rgba(8,11,12,0.05);position:relative;overflow:hidden}
.sp-header-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.sp-header-av{width:64px;height:64px;border-radius:18px;background:var(--black);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;flex-shrink:0}
.sp-header-info{flex:1;min-width:0}
.sp-header-name{font-size:22px;font-weight:900;color:var(--black);letter-spacing:-0.3px}
.sp-header-class{font-size:12px;color:var(--text3);font-weight:600;margin-top:4px}
.sp-header-stats{display:flex;align-items:center;gap:20px;flex-shrink:0}
.sp-hstat{display:flex;flex-direction:column;align-items:center;gap:2px}
.sp-hstat-num{font-size:20px;font-weight:900;color:var(--black);line-height:1}
.sp-hstat-label{font-size:10px;color:var(--text3);font-weight:600}
.sp-hstat.pending .sp-hstat-num{color:#7A6020}

/* Tabs */
.sp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);padding-bottom:0}
.sp-tab{padding:10px 20px;border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;font-family:var(--font);font-size:13.5px;font-weight:600;color:var(--text3);transition:all 0.15s;display:flex;align-items:center;gap:7px;margin-bottom:-1px}
.sp-tab:hover{color:var(--text)}
.sp-tab.active{color:var(--black);border-bottom-color:var(--gold);font-weight:800}
.sp-tab-badge{font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(229,185,60,0.15);color:#7A6020;border:1px solid rgba(229,185,60,0.25)}

/* Sections */
.sp-section{display:flex;flex-direction:column;gap:18px;animation:fadeUp 0.25s ease}
.sp-section-title{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--text3);display:flex;align-items:center;gap:7px}

/* Timeline */
.sp-timeline{display:flex;flex-direction:column}
.sp-tl-row{display:flex;gap:14px}
.sp-tl-dot-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:4px}
.sp-tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.sp-tl-row.passed .sp-tl-dot{background:#2D8A4A}
.sp-tl-row.failed .sp-tl-dot{background:#7A1E1E}
.sp-tl-line{width:1px;flex:1;background:var(--border);margin-top:4px;min-height:20px}
.sp-tl-body{flex:1;padding-bottom:18px;display:flex;flex-direction:column;gap:8px}
.sp-tl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px}
.sp-tl-info{display:flex;flex-direction:column;gap:2px}
.sp-tl-stage{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px}
.sp-tl-mod{font-size:14px;font-weight:700;color:var(--black)}
.sp-tl-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0}
.sp-tl-score{font-size:13px;font-weight:800}
.sp-tl-date{font-size:11px;color:var(--text3)}
.sp-tl-trait-row{padding-right:4px}
.sp-tl-trait-done{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#2D8A4A;background:rgba(45,138,74,0.08);border-radius:6px;padding:4px 10px}
.sp-tl-eval-btn{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#7A6020;background:rgba(229,185,60,0.1);border:1px solid rgba(229,185,60,0.25);border-radius:6px;padding:4px 12px;cursor:pointer;font-family:var(--font);transition:all 0.15s}
.sp-tl-eval-btn:hover{background:rgba(229,185,60,0.18);border-color:rgba(229,185,60,0.4)}

/* Pending section */
.sp-pending-section{background:rgba(229,185,60,0.05);border:1px solid rgba(229,185,60,0.2);border-radius:16px;padding:18px}
.sp-pending-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.sp-pending-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.sp-pending-info{display:flex;flex-direction:column;gap:2px}
.sp-pending-stage{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px}
.sp-pending-mod{font-size:14px;font-weight:700;color:var(--black)}
.sp-eval-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;background:var(--black);border:none;color:var(--gold);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;flex-shrink:0}
.sp-eval-btn:hover{background:#1a1a1a;box-shadow:0 4px 14px rgba(8,11,12,0.2)}

/* Radar */
.sp-radar-section{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px}
.sp-radar-wrap{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-top:14px}
.sp-radar-legend{display:flex;flex-direction:column;gap:8px;flex:1;min-width:160px}
.sp-legend-row{display:flex;align-items:center;gap:8px}
.sp-legend-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;flex-shrink:0}
.sp-legend-name{flex:1;font-size:12.5px;font-weight:600;color:var(--text)}
.sp-legend-avg{font-size:13px;font-weight:800;flex-shrink:0}

/* Assessed cards */
.sp-assessed-section{display:flex;flex-direction:column;gap:10px}
.sp-assessed-list{display:flex;flex-direction:column;gap:10px}
.sp-assessed-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px}
.sp-assessed-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.sp-assessed-info{display:flex;flex-direction:column;gap:2px}
.sp-assessed-stage{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px}
.sp-assessed-mod{font-size:15px;font-weight:800;color:var(--black)}
.sp-assessed-right{display:flex;align-items:center;gap:12px}
.sp-assessed-total{font-size:22px;font-weight:900;line-height:1}
.sp-reassess-btn{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:none;font-family:var(--font);font-size:12px;font-weight:700;color:var(--text3);cursor:pointer;transition:all 0.15s}
.sp-reassess-btn:hover{border-color:var(--gold-border);color:var(--text)}
.sp-assessed-traits{display:flex;flex-direction:column;gap:6px}
.sp-assessed-trait-row{display:flex;align-items:center;gap:8px}
.sp-assessed-maqsad{font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;flex-shrink:0}
.sp-assessed-tname{font-size:12px;font-weight:600;color:var(--text);width:110px;flex-shrink:0}
.sp-assessed-bar-bg{flex:1;height:4px;background:var(--border);border-radius:99px;overflow:hidden}
.sp-assessed-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:99px;animation:fillIn 0.8s ease both}
.sp-assessed-tscore{font-size:11.5px;font-weight:800;color:var(--text);width:28px;text-align:end;flex-shrink:0}
.sp-assessed-note{font-size:12px;color:var(--text3);font-style:italic;padding:8px 12px;background:var(--surface2);border-radius:8px;border-right:2px solid var(--gold-border)}

.sp-empty-traits{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px;color:var(--text3);text-align:center}
.sp-empty-traits svg{color:rgba(200,169,106,0.3)}
.sp-empty-traits p{font-size:14px;font-weight:600}

/* Stats tab */
.sp-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:14px}
.sp-type-list,.sp-stage-list{display:flex;flex-direction:column;gap:10px}
.sp-type-row,.sp-stage-row{display:flex;align-items:center;gap:10px}
.sp-type-label,.sp-stage-name{font-size:12px;color:var(--text2);font-weight:600;width:90px;flex-shrink:0}
.sp-type-track,.sp-stage-track{flex:1;height:7px;background:var(--border);border-radius:99px;overflow:hidden}
.sp-type-fill,.sp-stage-fill{height:100%;border-radius:99px;animation:fillIn 0.8s ease both}
.sp-type-pct,.sp-stage-avg{font-size:12px;font-weight:800;color:var(--text);width:36px;text-align:end}
.sp-type-frac{font-size:11px;color:var(--text3);width:34px}
.sp-stage-mods{font-size:11px;color:var(--text3);width:46px;text-align:end}

/* Eval overlay */
.sp-eval-overlay{position:fixed;inset:0;z-index:200;background:rgba(8,11,12,0.6);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:20px;animation:overlayIn 0.2s ease}
@media(min-width:768px){.sp-eval-overlay{align-items:center}}
.sp-eval-panel{background:var(--surface);border-radius:24px 24px 0 0;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;animation:panelIn 0.28s cubic-bezier(0.22,1,0.36,1)}
@media(min-width:768px){.sp-eval-panel{border-radius:24px;max-height:85vh}}

/* ── EVAL FORM ── */
.ef-wrap{display:flex;flex-direction:column;gap:0}
.ef-loading{display:flex;align-items:center;justify-content:center;height:200px}
.ef-spinner{width:28px;height:28px;border:3px solid var(--gold-border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}

.ef-topbar{display:flex;align-items:center;gap:14px;padding:20px 22px 16px;border-bottom:1px solid var(--border)}
.ef-topbar-left{flex:1;display:flex;flex-direction:column;gap:4px}
.ef-module-tag{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px}
.ef-module-title{font-size:17px;font-weight:900;color:var(--black)}
.ef-total-badge{display:flex;align-items:baseline;gap:3px;padding:8px 14px;border-radius:12px;border:1.5px solid;flex-shrink:0}
.ef-total-num{font-size:22px;font-weight:900;line-height:1}
.ef-total-denom{font-size:12px;font-weight:700;opacity:0.6}
.ef-close-btn{width:34px;height:34px;border-radius:50%;background:var(--border);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text3);transition:all 0.15s;flex-shrink:0}
.ef-close-btn:hover{background:rgba(8,11,12,0.12);color:var(--text)}

.ef-progress-wrap{padding:12px 22px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:6px}
.ef-progress-bg{height:5px;background:var(--border);border-radius:99px;overflow:hidden}
.ef-progress-fill{height:100%;border-radius:99px;transition:width 0.4s ease,background 0.3s}
.ef-progress-label{font-size:11.5px;font-weight:700}

.ef-traits{display:flex;flex-direction:column;gap:0;padding:0 22px}

/* Trait card */
.ef-trait-card{border-bottom:1px solid var(--border);padding:18px 0;display:flex;flex-direction:column;gap:12px;position:relative}
.ef-trait-card.main{background:rgba(229,185,60,0.02)}
.ef-main-glow{position:absolute;right:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold2),var(--gold));border-radius:0 0 0 0}

.ef-trait-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.ef-trait-head-left{display:flex;flex-direction:column;gap:6px;flex:1}
.ef-main-badge{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:#7A6020;background:rgba(229,185,60,0.12);border:1px solid rgba(229,185,60,0.25);border-radius:6px;padding:3px 9px;width:fit-content}
.ef-trait-name-row{display:flex;align-items:center;gap:8px}
.ef-trait-maqsad-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;flex-shrink:0}
.ef-trait-name{font-size:15px;font-weight:800;color:var(--black)}
.ef-trait-def{font-size:11.5px;color:var(--text3);line-height:1.5}

.ef-trait-head-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.ef-weight-tag{font-size:10px;font-weight:700;color:var(--text3);background:var(--border);border-radius:5px;padding:2px 7px}
.ef-score-display{display:flex;align-items:baseline;gap:2px}
.ef-score-num{font-size:20px;font-weight:900;line-height:1}
.ef-score-max{font-size:11px;font-weight:700;opacity:0.5}

/* Slider */
.ef-slider-wrap{display:flex;flex-direction:column;gap:5px}
.ef-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:99px;background:linear-gradient(to left,var(--border) calc(100% - var(--pct,0%)),var(--gold) calc(100% - var(--pct,0%)));outline:none;cursor:pointer;transition:background 0.2s}
.ef-slider.main{background:linear-gradient(to left,var(--border) calc(100% - var(--pct,0%)),var(--gold2) calc(100% - var(--pct,0%)))}
.ef-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--black);border:2px solid var(--gold);cursor:pointer;box-shadow:0 2px 6px rgba(8,11,12,0.2);transition:transform 0.15s}
.ef-slider::-webkit-slider-thumb:hover{transform:scale(1.2)}
.ef-slider.main::-webkit-slider-thumb{background:var(--gold2);border-color:var(--gold2)}
.ef-slider-labels{display:flex;justify-content:space-between;font-size:9.5px;color:var(--text3);font-weight:600}

/* Elements */
.ef-elements-toggle{display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);border-radius:7px;padding:5px 11px;font-family:var(--font);font-size:11.5px;font-weight:700;color:var(--text3);cursor:pointer;transition:all 0.15s;width:fit-content}
.ef-elements-toggle:hover{border-color:var(--gold-border);color:var(--text)}
.ef-elements-list{background:rgba(200,169,106,0.04);border:1px solid var(--gold-border);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:7px}
.ef-element-row{display:flex;align-items:flex-start;gap:9px}
.ef-el-num{width:18px;height:18px;border-radius:5px;background:rgba(200,169,106,0.12);color:#7A6020;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.ef-el-text{font-size:12.5px;color:var(--text2);line-height:1.55;direction:rtl}

/* Note */
.ef-note-input{width:100%;border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-family:var(--font);font-size:12.5px;color:var(--text);outline:none;background:var(--surface2);transition:border-color 0.15s}
.ef-note-input:focus{border-color:var(--gold-border);box-shadow:0 0 0 3px rgba(200,169,106,0.08)}
.ef-note-input::placeholder{color:rgba(8,11,12,0.25)}

/* General note */
.ef-general-note-wrap{padding:16px 22px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:7px}
.ef-general-note-label{font-size:10.5px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px}
.ef-general-note{width:100%;border:1px solid var(--border);border-radius:10px;padding:11px 14px;font-family:var(--font);font-size:13px;color:var(--text);outline:none;resize:vertical;background:var(--surface2);transition:border-color 0.15s}
.ef-general-note:focus{border-color:var(--gold-border);box-shadow:0 0 0 3px rgba(200,169,106,0.08)}

.ef-error{margin:0 22px;padding:10px 14px;background:rgba(122,30,30,0.07);border:1px solid rgba(122,30,30,0.2);border-radius:8px;font-size:13px;color:#7A1E1E;font-weight:600}

/* Footer */
.ef-footer{display:flex;gap:10px;padding:16px 22px 22px;border-top:1px solid var(--border)}
.ef-save-btn{display:flex;align-items:center;justify-content:center;gap:8px;flex:1;padding:12px;border-radius:12px;background:var(--black);border:none;color:var(--gold);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer;transition:all 0.18s;box-shadow:0 4px 16px rgba(8,11,12,0.15)}
.ef-save-btn:hover:not(:disabled){background:#1a1a1a;box-shadow:0 6px 22px rgba(8,11,12,0.22)}
.ef-save-btn:disabled{opacity:0.5;cursor:not-allowed}
.ef-btn-spin{width:14px;height:14px;border:2px solid rgba(200,169,106,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
.ef-cancel-btn{padding:12px 22px;border-radius:12px;border:1px solid var(--border);background:none;font-family:var(--font);font-size:14px;font-weight:600;color:var(--text3);cursor:pointer;transition:all 0.15s}
.ef-cancel-btn:hover{border-color:rgba(8,11,12,0.2);color:var(--text)}

@media(max-width:768px){
  .sp-page{padding:20px 16px 80px}
  .sp-header-card{flex-wrap:wrap}
  .sp-header-stats{flex-wrap:wrap;gap:12px}
  .sp-eval-overlay{padding:0}
}
`;
