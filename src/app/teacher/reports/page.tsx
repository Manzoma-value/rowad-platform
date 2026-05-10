"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface StudentSummary {
  id: string;
  full_name: string;
  attempts_count: number;
  passed_count: number;
  avg_score: number | null;
}

interface ClassData {
  id: string;
  name: string;
  student_count: number;
  total_attempts: number;
  avg_score: number | null;
  score_distribution: number[];
  students: StudentSummary[];
}

interface TimelineItem {
  date: string;
  module_title: string;
  stage_title: string;
  stage_order: number;
  module_order: number;
  score_pct: number;
  passed: boolean;
  score: number;
  total: number;
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

interface StudentDetail {
  student: {
    id: string;
    full_name: string;
    class_name: string | null;
    attempts_count: number;
    passed_count: number;
    avg_score: number | null;
  };
  timeline: TimelineItem[];
  type_accuracy: TypeAccuracy[];
  stage_breakdown: StageBreakdown[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  MCQ: "اختيار متعدد",
  TF: "صح/خطأ",
  WRITTEN: "مقالي",
  MATCHING: "توصيل",
};

function ScoreRing({ pct, size = 56 }: { pct: number | null; size?: number }) {
  if (pct === null)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#f0e8e0",
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
          stroke="#f0e8e0"
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
        <span style={{ fontSize: size < 48 ? 10 : 12, fontWeight: 800, color }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

function LineChart({
  points,
  labels,
}: {
  points: number[];
  labels?: string[];
}) {
  if (points.length < 2)
    return (
      <div
        style={{
          color: "#9a7a6a",
          fontSize: 12,
          padding: "20px 0",
          textAlign: "center",
        }}
      >
        لا توجد بيانات كافية
      </div>
    );
  const w = 560,
    h = 140,
    pad = 20;
  const maxV = Math.max(...points, 1);
  const xs = points.map(
    (_, i) => pad + (i / (points.length - 1)) * (w - pad * 2),
  );
  const ys = points.map((v) => pad + (1 - v / maxV) * (h - pad * 2));
  const pathD = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`)
    .join(" ");
  const areaD = `${pathD} L${xs[xs.length - 1]},${h} L${xs[0]},${h} Z`;
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h + 30}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8A96A" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = pad + (1 - v / 100) * (h - pad * 2);
        return (
          <g key={v}>
            <line
              x1={pad}
              y1={y}
              x2={w - pad}
              y2={y}
              stroke="#f0e8e0"
              strokeWidth="1"
            />
            <text
              x={pad - 4}
              y={y + 4}
              fontSize="9"
              fill="#9a7a6a"
              textAnchor="end"
            >
              {v}%
            </text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#tGrad)" />
      <path
        d={pathD}
        fill="none"
        stroke="#C8A96A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={ys[i]}
            r="5"
            fill={points[i] >= 50 ? "#C8A96A" : "#7A1E1E"}
            stroke="white"
            strokeWidth="2"
          />
          {labels && (
            <text
              x={x}
              y={h + 18}
              fontSize="9"
              fill="#9a7a6a"
              textAnchor="middle"
              transform={`rotate(-30,${x},${h + 18})`}
            >
              {labels[i]?.slice(0, 6)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function TypeAccuracyChart({ data }: { data: TypeAccuracy[] }) {
  if (!data.length)
    return (
      <div
        style={{
          color: "#9a7a6a",
          fontSize: 12,
          textAlign: "center",
          padding: 16,
        }}
      >
        لا توجد بيانات
      </div>
    );
  return (
    <div className="tr-type-chart">
      {data.map((item) => (
        <div key={item.type} className="tr-type-row">
          <span className="tr-type-label">
            {TYPE_LABELS[item.type] ?? item.type}
          </span>
          <div className="tr-type-track">
            <div
              className="tr-type-fill"
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
          <span className="tr-type-pct">{item.pct}%</span>
          <span className="tr-type-frac">
            {item.correct}/{item.total}
          </span>
        </div>
      ))}
    </div>
  );
}

function StageChart({ data }: { data: StageBreakdown[] }) {
  if (!data.length)
    return (
      <div
        style={{
          color: "#9a7a6a",
          fontSize: 12,
          textAlign: "center",
          padding: 16,
        }}
      >
        لا توجد بيانات
      </div>
    );
  const max = Math.max(...data.map((d) => d.avg_score ?? 0), 1);
  return (
    <div className="tr-stage-chart">
      {data.map((s, i) => (
        <div key={i} className="tr-stage-bar-col">
          <div className="tr-stage-bar-wrap">
            <div
              className="tr-stage-bar"
              style={{
                height: `${((s.avg_score ?? 0) / max) * 100}%`,
                background:
                  (s.avg_score ?? 0) >= 75
                    ? "#2D8A4A"
                    : (s.avg_score ?? 0) >= 50
                      ? "#C8A96A"
                      : "#7A1E1E",
              }}
            />
          </div>
          <span className="tr-stage-val">
            {s.avg_score !== null ? `${s.avg_score}%` : "—"}
          </span>
          <span className="tr-stage-name">{s.title.slice(0, 10)}</span>
          <span className="tr-stage-mods">{s.modules_done} وحدة</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TeacherReportsPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(
    null,
  );
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/reports")
      .then((r) => r.json())
      .then((d) => {
        const cls = d.classes ?? [];
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openStudent = async (studentId: string) => {
    if (selectedStudentId === studentId) {
      setSelectedStudentId(null);
      setStudentDetail(null);
      return;
    }
    setSelectedStudentId(studentId);
    setStudentDetail(null);
    setStudentLoading(true);
    const res = await fetch(`/api/teacher/reports/students/${studentId}`);
    const d = await res.json();
    setStudentDetail(d);
    setStudentLoading(false);
  };

  if (loading)
    return (
      <div className="tr-page" dir="rtl">
        <div className="tr-loading">
          <div className="tr-spinner" />
          <span>جارٍ تحميل التقارير...</span>
        </div>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="tr-page" dir="rtl">
      {/* ── HEADER ── */}
      <div className="tr-header">
        <div>
          <p className="tr-eyebrow">تقارير المعلم</p>
          <h1 className="tr-title">أداء الطلاب</h1>
        </div>
      </div>
      <div className="tr-rule">
        <div className="tr-rule-line" />
        <div className="tr-rule-diamond" />
        <div className="tr-rule-line" />
      </div>

      {classes.length === 0 ? (
        <div className="tr-empty">لا توجد فصول مُعيَّنة لك بعد</div>
      ) : (
        <>
          {/* ── CLASS TABS ── */}
          {classes.length > 1 && (
            <div className="tr-class-tabs">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  className={`tr-class-tab ${selectedClass?.id === cls.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedClass(cls);
                    setSelectedStudentId(null);
                    setStudentDetail(null);
                  }}
                >
                  {cls.name}
                  <span className="tr-tab-count">{cls.student_count}</span>
                </button>
              ))}
            </div>
          )}

          {selectedClass && (
            <>
              {/* ── CLASS SUMMARY CARDS ── */}
              <div className="tr-summary-grid">
                {[
                  { label: "عدد الطلاب", value: selectedClass.student_count },
                  {
                    label: "إجمالي المحاولات",
                    value: selectedClass.total_attempts,
                  },
                  {
                    label: "متوسط الدرجات",
                    value:
                      selectedClass.avg_score !== null
                        ? `${selectedClass.avg_score}%`
                        : "—",
                  },
                ].map((c) => (
                  <div key={c.label} className="tr-sum-card">
                    <div className="tr-sum-val">{c.value}</div>
                    <div className="tr-sum-label">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* ── SCORE DISTRIBUTION ── */}
              <div className="tr-card">
                <div className="tr-card-title">
                  توزيع الدرجات — {selectedClass.name}
                </div>
                <div className="tr-dist-wrap">
                  {["0–25%", "26–50%", "51–75%", "76–100%"].map((label, i) => {
                    const count = selectedClass.score_distribution[i] ?? 0;
                    const max = Math.max(
                      ...selectedClass.score_distribution,
                      1,
                    );
                    const colors = ["#7A1E1E", "#C8A96A", "#A8863E", "#2D8A4A"];
                    return (
                      <div key={label} className="tr-dist-row">
                        <span className="tr-dist-label">{label}</span>
                        <div className="tr-dist-track">
                          <div
                            className="tr-dist-fill"
                            style={{
                              width: `${(count / max) * 100}%`,
                              background: colors[i],
                            }}
                          />
                        </div>
                        <span className="tr-dist-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── STUDENT LIST ── */}
              <div className="tr-card">
                <div className="tr-card-title">قائمة الطلاب</div>
                <div className="tr-student-list">
                  {selectedClass.students.map((s, i) => (
                    <div key={s.id}>
                      <div
                        className={`tr-student-row ${selectedStudentId === s.id ? "active" : ""}`}
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() => openStudent(s.id)}
                      >
                        <div className="tr-student-av">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="tr-student-info">
                          <span className="tr-student-name">{s.full_name}</span>
                          <span className="tr-student-meta">
                            {s.attempts_count} محاولة · {s.passed_count} ناجحة
                          </span>
                        </div>
                        <ScoreRing pct={s.avg_score} size={48} />
                        <div className="tr-student-chevron">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <polyline
                              points={
                                selectedStudentId === s.id
                                  ? "18 15 12 9 6 15"
                                  : "6 9 12 15 18 9"
                              }
                            />
                          </svg>
                        </div>
                      </div>

                      {/* ── STUDENT DETAIL PANEL ── */}
                      {selectedStudentId === s.id && (
                        <div className="tr-student-panel">
                          {studentLoading ? (
                            <div className="tr-loading-sm">
                              <div className="tr-spinner" />
                            </div>
                          ) : studentDetail ? (
                            <div className="tr-panel-inner">
                              {/* KPIs */}
                              <div className="tr-panel-kpis">
                                <div className="tr-panel-kpi">
                                  <span className="tr-panel-kpi-val">
                                    {studentDetail.student.attempts_count}
                                  </span>
                                  <span className="tr-panel-kpi-label">
                                    محاولة
                                  </span>
                                </div>
                                <div className="tr-panel-kpi">
                                  <span className="tr-panel-kpi-val">
                                    {studentDetail.student.passed_count}
                                  </span>
                                  <span className="tr-panel-kpi-label">
                                    ناجحة
                                  </span>
                                </div>
                                <div className="tr-panel-kpi">
                                  <ScoreRing
                                    pct={studentDetail.student.avg_score}
                                    size={52}
                                  />
                                </div>
                              </div>

                              {/* Line chart */}
                              {studentDetail.timeline.length >= 2 && (
                                <div className="tr-panel-chart-section">
                                  <div className="tr-panel-subtitle">
                                    الأداء عبر الوحدات
                                  </div>
                                  <div className="tr-line-chart-wrap">
                                    <LineChart
                                      points={studentDetail.timeline.map(
                                        (t) => t.score_pct,
                                      )}
                                      labels={studentDetail.timeline.map(
                                        (t) => t.module_title,
                                      )}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="tr-panel-two-col">
                                {/* Type accuracy */}
                                <div className="tr-panel-sub-card">
                                  <div className="tr-panel-subtitle">
                                    الدقة حسب نوع السؤال
                                  </div>
                                  <TypeAccuracyChart
                                    data={studentDetail.type_accuracy}
                                  />
                                </div>

                                {/* Stage breakdown */}
                                <div className="tr-panel-sub-card">
                                  <div className="tr-panel-subtitle">
                                    الأداء حسب المرحلة
                                  </div>
                                  <StageChart
                                    data={studentDetail.stage_breakdown}
                                  />
                                </div>
                              </div>

                              {/* Timeline */}
                              <div className="tr-panel-subtitle">
                                سجل المحاولات
                              </div>
                              <div className="tr-attempts-list">
                                {studentDetail.timeline.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className={`tr-attempt-row ${item.passed ? "passed" : "failed"}`}
                                  >
                                    <div className="tr-att-dot" />
                                    <div className="tr-att-body">
                                      <span className="tr-att-stage">
                                        {item.stage_title}
                                      </span>
                                      <span className="tr-att-mod">
                                        {item.module_title}
                                      </span>
                                    </div>
                                    <div className="tr-att-right">
                                      <span
                                        className="tr-att-score"
                                        style={{
                                          color: item.passed
                                            ? "#2D8A4A"
                                            : "#7A1E1E",
                                        }}
                                      >
                                        {item.score}/{item.total} (
                                        {item.score_pct}%)
                                      </span>
                                      <span className="tr-att-date">
                                        {new Date(item.date).toLocaleDateString(
                                          "ar-SA",
                                          { month: "short", day: "numeric" },
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fillIn{from{width:0}}
  @keyframes spin{to{transform:rotate(360deg)}}

  :root{
    --gold:#C8A96A; --gold-bright:#E5B93C;
    --gold-pale:rgba(200,169,106,0.08);
    --gold-border:rgba(200,169,106,0.18);
    --black:#0B0B0C; --off-white:#F5F3EE;
    --text:#0B0B0C; --text2:#3D3526; --text3:#8A7B60;
    --surface:#FFFFFF; --border:#E4DDD0;
    --red:#7A1E1E; --red-pale:rgba(122,30,30,0.07);
    --red-border:rgba(122,30,30,0.2);
    --font:'Cairo',sans-serif;
  }

  .tr-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);color:var(--text);animation:fadeUp 0.35s ease}

  .tr-header{display:flex;align-items:flex-start;justify-content:space-between}
  .tr-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:5px}
  .tr-title{font-size:26px;font-weight:900;color:var(--black);letter-spacing:-0.5px}

  .tr-rule{display:flex;align-items:center;gap:10px}
  .tr-rule-line{flex:1;height:1px;background:var(--border)}
  .tr-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.5;flex-shrink:0}

  .tr-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:200px;color:var(--text3);font-size:14px}
  .tr-loading-sm{display:flex;align-items:center;justify-content:center;height:60px}
  .tr-spinner{width:26px;height:26px;border:3px solid var(--gold-border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
  .tr-empty{text-align:center;color:var(--text3);font-size:14px;padding:60px;background:var(--surface);border:1px solid var(--border);border-radius:12px}

  /* Class tabs */
  .tr-class-tabs{display:flex;gap:6px;flex-wrap:wrap}
  .tr-class-tab{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;font-family:var(--font);font-size:13.5px;font-weight:600;color:var(--text2);transition:all 0.15s}
  .tr-class-tab:hover{border-color:var(--gold-border)}
  .tr-class-tab.active{background:var(--black);border-color:var(--black);color:var(--gold)}
  .tr-tab-count{font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,0.15);color:inherit}
  .tr-class-tab:not(.active) .tr-tab-count{background:#f0e8e0;color:var(--text3)}

  /* Summary */
  .tr-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .tr-sum-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 18px;position:relative;overflow:hidden}
  .tr-sum-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold),var(--gold-bright))}
  .tr-sum-val{font-size:28px;font-weight:900;color:var(--black);line-height:1;margin-bottom:4px;letter-spacing:-0.5px}
  .tr-sum-label{font-size:11.5px;color:var(--text3);font-weight:600}

  /* Card */
  .tr-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
  .tr-card-title{font-size:11px;font-weight:800;color:var(--text);letter-spacing:1px;text-transform:uppercase}

  /* Distribution */
  .tr-dist-wrap{display:flex;flex-direction:column;gap:10px}
  .tr-dist-row{display:flex;align-items:center;gap:10px}
  .tr-dist-label{font-size:12px;color:var(--text2);font-weight:500;width:64px;flex-shrink:0}
  .tr-dist-track{flex:1;height:8px;background:var(--border);border-radius:99px;overflow:hidden}
  .tr-dist-fill{height:100%;border-radius:99px;animation:fillIn 0.8s ease both}
  .tr-dist-count{font-size:12px;font-weight:800;color:var(--text);width:22px;text-align:start}

  /* Students */
  .tr-student-list{display:flex;flex-direction:column;gap:0}
  .tr-student-row{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:all 0.15s;animation:fadeUp 0.3s ease both}
  .tr-student-row:hover{background:var(--gold-pale);border-color:var(--gold-border)}
  .tr-student-row.active{background:rgba(200,169,106,0.08);border-color:var(--gold-border)}
  .tr-student-av{width:36px;height:36px;border-radius:9px;background:var(--black);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0}
  .tr-student-info{flex:1;display:flex;flex-direction:column;gap:2px}
  .tr-student-name{font-size:14px;font-weight:700;color:var(--black)}
  .tr-student-meta{font-size:11.5px;color:var(--text3);font-weight:500}
  .tr-student-chevron{color:var(--text3);display:flex;flex-shrink:0}

  /* Student panel */
  .tr-student-panel{background:rgba(200,169,106,0.04);border:1px solid var(--gold-border);border-radius:0 0 12px 12px;padding:20px;animation:fadeUp 0.25s ease}
  .tr-panel-inner{display:flex;flex-direction:column;gap:18px}
  .tr-panel-kpis{display:flex;align-items:center;gap:20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px}
  .tr-panel-kpi{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
  .tr-panel-kpi-val{font-size:24px;font-weight:900;color:var(--black);line-height:1}
  .tr-panel-kpi-label{font-size:11px;color:var(--text3);font-weight:600}
  .tr-panel-subtitle{font-size:10.5px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px}
  .tr-panel-chart-section{display:flex;flex-direction:column;gap:10px}
  .tr-line-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;overflow:hidden}
  .tr-panel-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tr-panel-sub-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px}

  /* Type accuracy */
  .tr-type-chart{display:flex;flex-direction:column;gap:10px}
  .tr-type-row{display:flex;align-items:center;gap:8px}
  .tr-type-label{font-size:11.5px;color:var(--text2);font-weight:600;width:72px;flex-shrink:0}
  .tr-type-track{flex:1;height:7px;background:var(--border);border-radius:99px;overflow:hidden}
  .tr-type-fill{height:100%;border-radius:99px;animation:fillIn 0.8s ease both}
  .tr-type-pct{font-size:11.5px;font-weight:800;color:var(--text);width:34px;text-align:start}
  .tr-type-frac{font-size:10.5px;color:var(--text3);width:32px}

  /* Stage chart */
  .tr-stage-chart{display:flex;align-items:flex-end;gap:8px;height:100px;padding-top:10px}
  .tr-stage-bar-col{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
  .tr-stage-bar-wrap{flex:1;width:100%;display:flex;align-items:flex-end;border-bottom:1px solid var(--border)}
  .tr-stage-bar{width:100%;border-radius:4px 4px 0 0;min-height:4px;transition:height 0.6s ease}
  .tr-stage-val{font-size:10px;font-weight:800;color:var(--text)}
  .tr-stage-name{font-size:9px;color:var(--text3);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}
  .tr-stage-mods{font-size:9px;color:var(--text3)}

  /* Attempts list */
  .tr-attempts-list{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}
  .tr-attempt-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface)}
  .tr-attempt-row.passed .tr-att-dot{background:#2D8A4A}
  .tr-attempt-row.failed .tr-att-dot{background:var(--red)}
  .tr-att-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .tr-att-body{flex:1;display:flex;flex-direction:column;gap:1px}
  .tr-att-stage{font-size:9.5px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
  .tr-att-mod{font-size:13px;font-weight:700;color:var(--black)}
  .tr-att-right{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
  .tr-att-score{font-size:13px;font-weight:800}
  .tr-att-date{font-size:11px;color:var(--text3)}

  @media(max-width:700px){
    .tr-summary-grid{grid-template-columns:1fr 1fr 1fr}
    .tr-panel-two-col{grid-template-columns:1fr}
  }
  @media(max-width:500px){
    .tr-summary-grid{grid-template-columns:1fr 1fr}
  }
`;
