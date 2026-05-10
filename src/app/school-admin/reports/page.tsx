"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface StudentStat {
  student_id: string;
  attempts_count: number;
  passed_count: number;
  avg_score: number | null;
}

interface ClassData {
  id: string;
  name: string;
  teacher_name: string | null;
  student_count: number;
  total_attempts: number;
  passed_attempts: number;
  avg_score: number | null;
  score_distribution: number[];
  student_stats: StudentStat[];
}

interface StudentDetail {
  id: string;
  full_name: string;
  class_name: string | null;
  attempts_count: number;
  passed_count: number;
  avg_score: number | null;
  timeline: TimelineItem[];
}

interface TimelineItem {
  date: string;
  module_title: string;
  stage_title: string;
  score_pct: number;
  passed: boolean;
}

interface HeatmapRow {
  student_id: string;
  student_name: string;
  scores: (number | null)[];
}

interface DistributionItem {
  label: string;
  count: number;
}

interface ClassDetail {
  class: { id: string; name: string; teacher_name: string | null };
  students: StudentDetail[];
  modules: { id: string; title: string; stage: string }[];
  heatmap: HeatmapRow[];
  distribution: DistributionItem[];
}

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = value;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(from + (to - from) * ease));
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

// ─── RING CHART ───────────────────────────────────────────────────────────────

function RingChart({
  pct,
  size = 60,
  stroke = 5,
}: {
  pct: number | null;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (pct === null) return;
    const t = setTimeout(() => setAnimated(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  if (pct === null)
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700 }}>
          —
        </span>
      </div>
    );

  const color = pct >= 75 ? "#4ADE80" : pct >= 50 ? "#C8A96A" : "#EF4444";
  const offset = circ - (Math.min(animated, 100) / 100) * circ;

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
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
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
        <span style={{ fontSize: size < 52 ? 10 : 12, fontWeight: 900, color }}>
          {Math.min(pct, 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── SPARK BAR ────────────────────────────────────────────────────────────────

function SparkBar({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const colors = ["#EF4444", "#C8A96A", "#E5B93C", "#4ADE80"];
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32 }}
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(10, (v / max) * 100)}%`,
            background: colors[i],
            borderRadius: "3px 3px 0 0",
            opacity: 0.85,
            transition: "height 0.6s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── DISTRIBUTION BAR ─────────────────────────────────────────────────────────

function DistBar({ data }: { data: DistributionItem[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const colors = ["#EF4444", "#C8A96A", "#E5B93C", "#4ADE80"];
  const labels = ["0–25%", "26–50%", "51–75%", "76–100%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--dim)",
              width: 52,
              flexShrink: 0,
              textAlign: "right",
            }}
          >
            {labels[i]}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 99,
                width: `${(item.count / max) * 100}%`,
                background: colors[i],
                transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: colors[i],
              width: 20,
              textAlign: "center",
            }}
          >
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2)
    return <span style={{ fontSize: 11, color: "var(--dim)" }}>—</span>;
  const w = 90,
    h = 30,
    pad = 3;
  const max = Math.max(...points, 1);
  const xs = points.map(
    (_, i) => pad + (i / (points.length - 1)) * (w - pad * 2),
  );
  const ys = points.map(
    (v) => pad + (1 - Math.min(v, 100) / max) * (h - pad * 2),
  );
  const d = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const color = last >= 75 ? "#4ADE80" : last >= 50 ? "#C8A96A" : "#EF4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────

function Heatmap({
  data,
  modules,
}: {
  data: HeatmapRow[];
  modules: { id: string; title: string; stage: string }[];
}) {
  if (!data?.length || !modules?.length)
    return (
      <div
        style={{
          color: "var(--dim)",
          fontSize: 13,
          textAlign: "center",
          padding: "24px 0",
        }}
      >
        لا توجد بيانات بعد
      </div>
    );

  const getColor = (v: number | null) => {
    if (v === null) return "var(--border2)";
    if (v >= 75) return "rgba(74,222,128,0.25)";
    if (v >= 50) return "rgba(200,169,106,0.35)";
    return "rgba(239,68,68,0.25)";
  };
  const getTextColor = (v: number | null) => {
    if (v === null) return "var(--dim)";
    if (v >= 75) return "#4ADE80";
    if (v >= 50) return "#C8A96A";
    return "#EF4444";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ overflowX: "auto", borderRadius: 8 }}>
        <table
          style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: 11 }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "right",
                  padding: "6px 12px 10px",
                  color: "var(--dim)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  fontSize: 10,
                  letterSpacing: "0.5px",
                }}
              >
                الطالب
              </th>
              {modules.map((m) => (
                <th
                  key={m.id}
                  title={`${m.stage} — ${m.title}`}
                  style={{
                    textAlign: "center",
                    padding: "6px 4px 10px",
                    color: "var(--dim)",
                    fontWeight: 700,
                    maxWidth: 44,
                    fontSize: 9,
                    letterSpacing: "0.3px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 42,
                    }}
                  >
                    {m.title.slice(0, 7)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr
                key={row.student_id}
                style={{ animationDelay: `${ri * 0.04}s` }}
              >
                <td
                  style={{
                    padding: "3px 12px",
                    whiteSpace: "nowrap",
                    color: "rgba(255,255,255,0.75)",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {row.student_name}
                </td>
                {row.scores.map((score, i) => (
                  <td key={i} style={{ padding: 3, textAlign: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 5,
                        margin: "0 auto",
                        background: getColor(score),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: getTextColor(score),
                      }}
                    >
                      {score !== null ? score : "·"}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { bg: "rgba(74,222,128,0.25)", text: "#4ADE80", label: "75%+" },
          { bg: "rgba(200,169,106,0.35)", text: "#C8A96A", label: "50–74%" },
          { bg: "rgba(239,68,68,0.25)", text: "#EF4444", label: "أقل من 50%" },
          {
            bg: "rgba(255,255,255,0.04)",
            text: "var(--dim)",
            label: "لم يبدأ",
          },
        ].map(({ bg, text, label }) => (
          <span
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--dim)",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: bg,
                border: `1px solid ${text}`,
                display: "inline-block",
                opacity: 0.9,
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SchoolAdminReportsPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school-admin/reports/classes")
      .then((r) => r.json())
      .then((d) => {
        setClasses(d.classes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openClass = async (cls: ClassData) => {
    if (selectedClass?.id === cls.id) {
      setSelectedClass(null);
      setDetail(null);
      setSelectedStudent(null);
      return;
    }
    setSelectedClass(cls);
    setDetail(null);
    setSelectedStudent(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/school-admin/reports/classes/${cls.id}`);
      const d: ClassDetail = await res.json();
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalStudents = classes.reduce((a, c) => a + c.student_count, 0);
  const totalAttempts = classes.reduce((a, c) => a + c.total_attempts, 0);
  const validAvgs = classes.filter((c) => c.avg_score !== null);
  const schoolAvg =
    validAvgs.length > 0
      ? Math.round(
          validAvgs.reduce((a, c) => a + (c.avg_score ?? 0), 0) /
            validAvgs.length,
        )
      : null;

  const currentStudent =
    detail?.students?.find((s) => s.id === selectedStudent) ?? null;

  if (loading)
    return (
      <div className="rp-page" dir="rtl">
        <div className="rp-loading">
          <div className="rp-spinner" />
          <span>جارٍ تحميل التقارير...</span>
        </div>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="rp-page" dir="rtl">
      {/* ── PAGE HEADER ── */}
      <div className="rp-masthead">
        <div className="rp-masthead-left">
          <div className="rp-eyebrow">
            <span className="rp-eyebrow-dot" />
            لوحة التحليلات
          </div>
          <h1 className="rp-headline">تقارير الأداء</h1>
          <p className="rp-subline">مراقبة شاملة لأداء الفصول والطلاب</p>
        </div>
        <div className="rp-masthead-badge">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="rp-kpi-strip">
        {[
          {
            label: "الفصول",
            value: classes.length,
            suffix: "",
            accent: "#C8A96A",
            icon: "🏛",
          },
          {
            label: "الطلاب",
            value: totalStudents,
            suffix: "",
            accent: "#E5B93C",
            icon: "👤",
          },
          {
            label: "المحاولات",
            value: totalAttempts,
            suffix: "",
            accent: "#A78BFA",
            icon: "📝",
          },
          {
            label: "متوسط المدرسة",
            value: schoolAvg ?? 0,
            suffix: "%",
            accent: "#4ADE80",
            icon: "◎",
          },
        ].map((k, i) => (
          <div
            key={k.label}
            className="rp-kpi"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="rp-kpi-top">
              <span className="rp-kpi-icon">{k.icon}</span>
              <span className="rp-kpi-label">{k.label}</span>
            </div>
            <div className="rp-kpi-value" style={{ color: k.accent }}>
              {schoolAvg === null && k.label === "متوسط المدرسة" ? (
                "—"
              ) : (
                <AnimatedNumber value={k.value} suffix={k.suffix} />
              )}
            </div>
            <div className="rp-kpi-bar" style={{ background: `${k.accent}22` }}>
              <div
                className="rp-kpi-bar-fill"
                style={{ background: k.accent }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── CLASSES SECTION ── */}
      <div className="rp-section-head">
        <div className="rp-sh-line" />
        <span className="rp-sh-label">الفصول الدراسية</span>
        <div className="rp-sh-count">{classes.length}</div>
        <div className="rp-sh-line" />
      </div>

      {classes.length === 0 ? (
        <div className="rp-empty">لا توجد فصول بعد</div>
      ) : (
        <div className="rp-classes-grid">
          {classes.map((cls, i) => {
            const active = selectedClass?.id === cls.id;
            return (
              <button
                key={cls.id}
                className={`rp-class-card ${active ? "active" : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
                onClick={() => openClass(cls)}
              >
                {/* Top stripe with class name */}
                <div className="rp-cc-header">
                  <div className="rp-cc-name">{cls.name}</div>
                  {cls.teacher_name && (
                    <div className="rp-cc-teacher">{cls.teacher_name}</div>
                  )}
                  <div className={`rp-cc-status ${active ? "open" : ""}`}>
                    {active ? "▲" : "▼"}
                  </div>
                </div>

                {/* Stats row */}
                <div className="rp-cc-stats">
                  <div className="rp-cc-stat">
                    <div className="rp-cc-stat-num">{cls.student_count}</div>
                    <div className="rp-cc-stat-lbl">طالب</div>
                  </div>
                  <div className="rp-cc-divider" />
                  <div className="rp-cc-stat">
                    <div className="rp-cc-stat-num">{cls.total_attempts}</div>
                    <div className="rp-cc-stat-lbl">محاولة</div>
                  </div>
                  <div className="rp-cc-divider" />
                  <div className="rp-cc-stat" style={{ flex: "none" }}>
                    <RingChart pct={cls.avg_score} size={54} stroke={4} />
                  </div>
                </div>

                {/* Spark bars */}
                <div className="rp-cc-spark-labels">
                  <span>0-25%</span>
                  <span>26-50%</span>
                  <span>51-75%</span>
                  <span>76-100%</span>
                </div>
                <SparkBar data={cls.score_distribution} />
              </button>
            );
          })}
        </div>
      )}

      {/* ── CLASS DETAIL ── */}
      {selectedClass && (
        <div className="rp-detail-panel">
          {/* Panel header */}
          <div className="rp-dp-header">
            <div>
              <div className="rp-eyebrow">
                <span className="rp-eyebrow-dot" />
                تفاصيل الفصل
              </div>
              <h2 className="rp-dp-title">{selectedClass.name}</h2>
            </div>
            <button
              className="rp-close-btn"
              onClick={() => {
                setSelectedClass(null);
                setDetail(null);
                setSelectedStudent(null);
              }}
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {detailLoading ? (
            <div className="rp-loading" style={{ height: 120 }}>
              <div className="rp-spinner" />
            </div>
          ) : detail ? (
            <>
              {/* Two-col charts */}
              <div className="rp-charts-row">
                <div className="rp-panel">
                  <div className="rp-panel-label">توزيع الدرجات</div>
                  <DistBar data={detail.distribution} />
                </div>
                <div className="rp-panel" style={{ flex: 2 }}>
                  <div className="rp-panel-label">
                    خريطة الأداء · طالب × وحدة
                  </div>
                  <Heatmap data={detail.heatmap} modules={detail.modules} />
                </div>
              </div>

              {/* Students table */}
              <div className="rp-panel">
                <div className="rp-panel-label">أداء الطلاب الفردي</div>

                {detail.students?.length === 0 ? (
                  <div
                    style={{
                      color: "var(--dim)",
                      fontSize: 13,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    لا يوجد طلاب في هذا الفصل
                  </div>
                ) : (
                  <div className="rp-table">
                    <div className="rp-table-head">
                      <span>الطالب</span>
                      <span>المحاولات</span>
                      <span>الناجحة</span>
                      <span>المتوسط</span>
                      <span>منحنى الأداء</span>
                    </div>
                    {detail.students?.map((s, i) => (
                      <div
                        key={s.id}
                        className={`rp-table-row ${selectedStudent === s.id ? "active" : ""}`}
                        style={{ animationDelay: `${i * 0.03}s` }}
                        onClick={() =>
                          setSelectedStudent(
                            selectedStudent === s.id ? null : s.id,
                          )
                        }
                      >
                        <span className="rp-td-name">
                          <div className="rp-avatar">
                            {s.full_name.charAt(0)}
                          </div>
                          {s.full_name}
                        </span>
                        <span className="rp-td-num">{s.attempts_count}</span>
                        <span
                          className="rp-td-num"
                          style={{ color: "#4ADE80" }}
                        >
                          {s.passed_count}
                        </span>
                        <span>
                          <RingChart pct={s.avg_score} size={44} stroke={4} />
                        </span>
                        <span>
                          <Sparkline
                            points={s.timeline?.map((t) => t.score_pct) ?? []}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student drill-down */}
              {selectedStudent && currentStudent && (
                <div className="rp-panel rp-drill">
                  <div
                    className="rp-panel-label"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>سجل {currentStudent.full_name}</span>
                    <button
                      className="rp-close-sm"
                      onClick={() => setSelectedStudent(null)}
                    >
                      ✕
                    </button>
                  </div>

                  {currentStudent.timeline?.length === 0 ? (
                    <div
                      style={{
                        color: "var(--dim)",
                        fontSize: 13,
                        textAlign: "center",
                        padding: "20px 0",
                      }}
                    >
                      لا توجد محاولات بعد
                    </div>
                  ) : (
                    <div className="rp-timeline">
                      {currentStudent.timeline?.map((item, i) => {
                        const color =
                          item.score_pct >= 75
                            ? "#4ADE80"
                            : item.score_pct >= 50
                              ? "#C8A96A"
                              : "#EF4444";
                        return (
                          <div
                            key={i}
                            className="rp-tl-item"
                            style={{ animationDelay: `${i * 0.04}s` }}
                          >
                            <div
                              className="rp-tl-dot"
                              style={{
                                background: color,
                                boxShadow: `0 0 8px ${color}66`,
                              }}
                            />
                            <div className="rp-tl-connector" />
                            <div className="rp-tl-card">
                              <div className="rp-tl-stage">
                                {item.stage_title}
                              </div>
                              <div className="rp-tl-mod">
                                {item.module_title}
                              </div>
                              <div className="rp-tl-meta">
                                <span className="rp-tl-date">
                                  {new Date(item.date).toLocaleDateString(
                                    "ar-SA",
                                    { month: "short", day: "numeric" },
                                  )}
                                </span>
                                <span className="rp-tl-score" style={{ color }}>
                                  {item.score_pct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes kbFill   { from { width:0; } }
  @keyframes glow     { 0%,100% { opacity:0.4; } 50% { opacity:0.8; } }

 /* AFTER */
:root {
  --bg: #F5F3EE;
  --surface: #FFFFFF;
  --surface2: #FAF8F4;
  --border: rgba(200,169,106,0.2);
  --border2: rgba(200,169,106,0.1);
  --text: #0B0B0C;
  --text2: #3D3526;
  --dim: #8A7B60;
}
  /* ── PAGE ── */
  .rp-page {
    display: flex; flex-direction: column; gap: 28px;
    font-family: var(--font); color: var(--text);
    background: var(--bg);
    min-height: 100vh;
    padding: 32px 36px 60px;
    animation: fadeIn 0.4s ease;
  }

  /* ── LOADING ── */
  .rp-loading { display:flex; align-items:center; justify-content:center; gap:12px; height:200px; color:var(--dim); font-size:14px; }
  .rp-spinner { width:24px; height:24px; border:2.5px solid rgba(200,169,106,0.15); border-top-color:var(--gold); border-radius:50%; animation:spin 0.7s linear infinite; }
  .rp-empty { text-align:center; color:var(--dim); font-size:14px; padding:48px; border:1px dashed var(--border); border-radius:12px; }

  /* ── MASTHEAD ── */
  .rp-masthead {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
    animation: fadeUp 0.5s ease;
  }
  .rp-masthead-left { display: flex; flex-direction: column; gap: 6px; }
  .rp-eyebrow {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--gold);
  }
  .rp-eyebrow-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--gold); animation: glow 2s ease-in-out infinite;
  }
  .rp-headline {
    font-size: 32px; font-weight: 900; color: var(--text);
    letter-spacing: -1px; line-height: 1.1;
  }
  .rp-subline { font-size: 13px; color: var(--dim); font-weight: 500; }
  .rp-masthead-badge {
    width: 52px; height: 52px; border-radius: 14px;
color: var(--gold);
    display: flex; align-items: center; justify-content: center;
    color: #0C0C0E; flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(200,169,106,0.3);
  }

  /* ── KPI STRIP ── */
  .rp-kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .rp-kpi {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 14px; padding: 18px 16px 14px;
    display: flex; flex-direction: column; gap: 8px;
    position: relative; overflow: hidden;
    animation: fadeUp 0.5s ease backwards;
    transition: border-color 0.2s, transform 0.2s;
  }
  .rp-kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1.5px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    opacity: 0.4;
  }
  .rp-kpi:hover { border-color: var(--border); transform: translateY(-2px); }
  .rp-kpi-top { display: flex; align-items: center; gap: 8px; }
  .rp-kpi-icon { font-size: 14px; opacity: 0.7; }
  .rp-kpi-label { font-size: 10px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: 1.5px; }
  .rp-kpi-value { font-size: 36px; font-weight: 900; line-height: 1; letter-spacing: -1.5px; }
  .rp-kpi-bar { height: 3px; border-radius: 99px; overflow: hidden; }
  .rp-kpi-bar-fill { height: 100%; width: 70%; border-radius: 99px; animation: kbFill 1.2s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* ── SECTION HEAD ── */
  .rp-section-head {
    display: flex; align-items: center; gap: 14px;
  }
  .rp-sh-line { flex: 1; height: 1px; background: var(--border); }
  .rp-sh-label { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); white-space: nowrap; }
  .rp-sh-count {
    width: 22px; height: 22px; border-radius: 6px;
    background: var(--gold); color: #0B0B0C;
;
    font-size: 11px; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ── CLASS CARDS ── */
  .rp-classes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .rp-class-card {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 14px; padding: 18px; cursor: pointer;
    text-align: right; display: flex; flex-direction: column; gap: 14px;
    font-family: var(--font); transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    animation: fadeUp 0.5s ease backwards;
    position: relative; overflow: hidden;
  }
  .rp-class-card::after {
    content: ''; position: absolute; inset: 0; border-radius: 14px;
    background: radial-gradient(ellipse at 80% 20%, rgba(200,169,106,0.06), transparent 60%);
    pointer-events: none; opacity: 0; transition: opacity 0.3s;
  }
  .rp-class-card:hover { border-color: var(--border); transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.4); }
  .rp-class-card:hover::after { opacity: 1; }
  .rp-class-card.active { border-color: rgba(200,169,106,0.4); box-shadow: 0 0 0 1px rgba(200,169,106,0.2), 0 12px 40px rgba(0,0,0,0.4); }
  .rp-class-card.active::after { opacity: 1; }
  .rp-cc-header { display: flex; flex-direction: column; gap: 3px; position: relative; }
  .rp-cc-name { font-size: 16px; font-weight: 800; color: var(--text); }
  .rp-cc-teacher { font-size: 12px; color: var(--dim); font-weight: 500; }
  .rp-cc-status {
    position: absolute; top: 0; left: 0;
    font-size: 9px; color: var(--dim); transition: color 0.2s;
  }
  .rp-cc-status.open { color: var(--gold); }
  .rp-cc-stats { display: flex; align-items: center; gap: 0; }
  .rp-cc-stat { flex: 1; display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
  .rp-cc-stat:last-child { flex: none; padding-right: 0; }
  .rp-cc-stat-num { font-size: 22px; font-weight: 900; color: var(--text); line-height: 1; letter-spacing: -0.5px; }
  .rp-cc-stat-lbl { font-size: 10px; color: var(--dim); font-weight: 600; letter-spacing: 0.5px; }
  .rp-cc-divider { width: 1px; height: 32px; background: var(--border2); margin: 0 16px; flex-shrink: 0; }
  .rp-cc-spark-labels { display: flex; justify-content: space-between; }
  .rp-cc-spark-labels span { font-size: 8px; color: var(--dim); font-weight: 600; }

  /* ── DETAIL PANEL ── */
  .rp-detail-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 18px; padding: 24px;
    display: flex; flex-direction: column; gap: 20px;
    animation: fadeUp 0.35s ease;
    position: relative; overflow: hidden;
  }
  .rp-detail-panel::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    opacity: 0.5;
  }
  .rp-dp-header { display: flex; align-items: flex-start; justify-content: space-between; }
  .rp-dp-title { font-size: 22px; font-weight: 900; color: var(--text); margin-top: 4px; }
  .rp-close-btn {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--dim); cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .rp-close-btn:hover { border-color: #EF4444; color: #EF4444; }

  /* ── CHARTS ROW ── */
  .rp-charts-row { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; align-items: start; }

  /* ── PANELS ── */
  .rp-panel {
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 12px; padding: 18px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .rp-panel-label {
    font-size: 9.5px; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--dim);
  }

  /* ── TABLE ── */
  .rp-table { display: flex; flex-direction: column; gap: 2px; }
  .rp-table-head {
    display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
    gap: 8px; padding: 6px 12px;
    font-size: 9px; font-weight: 800; color: var(--dim);
    text-transform: uppercase; letter-spacing: 1px;
  }
  .rp-table-row {
    display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
    gap: 8px; padding: 10px 12px; border-radius: 8px;
    border: 1px solid transparent; cursor: pointer;
    transition: all 0.15s; align-items: center;
    animation: fadeUp 0.4s ease backwards;
  }
  .rp-table-row:hover { background: rgba(200,169,106,0.04); border-color: var(--border); }
  .rp-table-row.active { background: rgba(200,169,106,0.07); border-color: rgba(200,169,106,0.2); }
  .rp-td-name { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: var(--text); }
  .rp-td-num { font-size: 14px; font-weight: 700; color: var(--text2); display: flex; align-items: center; }
  .rp-avatar {
    width: 28px; height: 28px; border-radius: 8px;
    background: linear-gradient(135deg, var(--gold), var(--gold-b));
    color: #0C0C0E; font-size: 12px; font-weight: 900;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  /* ── TIMELINE ── */
  .rp-drill { }
  .rp-close-sm {
    background: none; border: none; cursor: pointer;
    color: var(--dim); font-size: 14px; padding: 2px 6px;
    border-radius: 4px; transition: color 0.15s;
  }
  .rp-close-sm:hover { color: #EF4444; }
  .rp-timeline {
    display: flex; flex-direction: column; gap: 0;
    max-height: 340px; overflow-y: auto;
    padding-right: 4px;
  }
  .rp-timeline::-webkit-scrollbar { width: 4px; }
  .rp-timeline::-webkit-scrollbar-track { background: transparent; }
  .rp-timeline::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  .rp-tl-item {
    display: flex; align-items: flex-start; gap: 12px;
    position: relative; animation: fadeUp 0.4s ease backwards;
    padding-bottom: 12px;
  }
  .rp-tl-dot {
    width: 10px; height: 10px; border-radius: 50%;
    flex-shrink: 0; margin-top: 6px; position: relative; z-index: 1;
  }
  .rp-tl-connector {
    position: absolute; top: 16px; right: 4px;
    width: 2px; height: calc(100% - 4px);
    background: var(--border2);
    transform: translateX(50%);
  }
  .rp-tl-item:last-child .rp-tl-connector { display: none; }
  .rp-tl-card {
    flex: 1; background: var(--bg); border: 1px solid var(--border2);
    border-radius: 10px; padding: 10px 14px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .rp-tl-stage { font-size: 9px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: 0.8px; }
  .rp-tl-mod { font-size: 13px; font-weight: 700; color: var(--text); }
  .rp-tl-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
  .rp-tl-date { font-size: 11px; color: var(--dim); }
  .rp-tl-score { font-size: 16px; font-weight: 900; line-height: 1; }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .rp-charts-row { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .rp-page { padding: 20px 16px 48px; }
    .rp-kpi-strip { grid-template-columns: repeat(2, 1fr); }
    .rp-headline { font-size: 24px; }
    .rp-table-head, .rp-table-row { grid-template-columns: 2fr 1fr 1fr 1fr; }
    .rp-table-head span:last-child, .rp-table-row > span:last-child { display: none; }
  }
  @media (max-width: 480px) {
    .rp-kpi-strip { grid-template-columns: 1fr 1fr; }
    .rp-classes-grid { grid-template-columns: 1fr; }
  }
`;
