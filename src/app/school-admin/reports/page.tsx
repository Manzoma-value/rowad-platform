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

// Traits
interface TraitRadarPoint {
  trait_id: string;
  name: string;
  maqsad: string;
  class_average?: number;
  average?: number;
}

interface StudentTraitSummary {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  assessments_count: number;
  trait_averages: { trait_id: string; name: string; average: number }[];
}

interface ClassTraitData {
  class: { id: string; name: string };
  student_count: number;
  class_radar: TraitRadarPoint[];
  students: StudentTraitSummary[];
}

interface StudentTraitDetail {
  trait_id: string;
  name: string;
  maqsad: string;
  average: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAQSAD_LABELS: Record<string, string> = {
  DEEN: "الدين",
  AQL: "العقل",
  NAFS: "النفس",
  NASL: "النسل",
  MAL: "المال",
};
const MAQSAD_COLORS: Record<
  string,
  { color: string; bg: string; fill: string }
> = {
  DEEN: { color: "#78590A", bg: "rgba(229,185,60,0.12)", fill: "#E5B93C" },
  AQL: { color: "#4A2595", bg: "rgba(91,53,160,0.10)", fill: "#7C4DFF" },
  NAFS: { color: "#115C35", bg: "rgba(26,107,66,0.10)", fill: "#1DB85A" },
  NASL: { color: "#7A1818", bg: "rgba(139,30,30,0.10)", fill: "#E03535" },
  MAL: { color: "#5C3D08", bg: "rgba(154,98,0,0.10)", fill: "#C47F0A" },
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

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
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(value * ease));
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
          }}
        />
      ))}
    </div>
  );
}

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
              background: "rgba(0,0,0,0.06)",
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
  const getColor = (v: number | null) =>
    v === null
      ? "rgba(0,0,0,0.04)"
      : v >= 75
        ? "rgba(74,222,128,0.18)"
        : v >= 50
          ? "rgba(200,169,106,0.28)"
          : "rgba(239,68,68,0.18)";
  const getTextColor = (v: number | null) =>
    v === null
      ? "var(--dim)"
      : v >= 75
        ? "#2D8A4A"
        : v >= 50
          ? "#8B6914"
          : "#8B1E1E";
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
              <tr key={row.student_id}>
                <td
                  style={{
                    padding: "3px 12px",
                    whiteSpace: "nowrap",
                    color: "var(--text2)",
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
    </div>
  );
}

// ─── TRAIT RADAR CHART ────────────────────────────────────────────────────────

function TraitRadar({
  data,
  size = 200,
}: {
  data: { name: string; maqsad: string; value: number }[];
  size?: number;
}) {
  if (!data.length)
    return (
      <div
        style={{
          color: "var(--dim)",
          fontSize: 12,
          textAlign: "center",
          padding: 20,
        }}
      >
        لا توجد بيانات سمات
      </div>
    );
  const n = data.length;
  const cx = size / 2,
    cy = size / 2,
    r = size * 0.38;
  const angles = data.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);
  const pts = angles
    .map(
      (a, i) =>
        `${cx + r * (data[i].value / 100) * Math.cos(a)},${cy + r * (data[i].value / 100) * Math.sin(a)}`,
    )
    .join(" ");
  const gridPts = (s: number) =>
    angles
      .map((a) => `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`)
      .join(" ");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size }}
    >
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={gridPts(s)}
          fill="none"
          stroke="rgba(0,0,0,0.07)"
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
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />
      ))}
      <polygon
        points={pts}
        fill="rgba(200,169,106,0.12)"
        stroke="#C8A96A"
        strokeWidth="2"
      />
      {data.map((d, i) => {
        const x = cx + r * (d.value / 100) * Math.cos(angles[i]);
        const y = cy + r * (d.value / 100) * Math.sin(angles[i]);
        const lx = cx + (r + 22) * Math.cos(angles[i]);
        const ly = cy + (r + 22) * Math.sin(angles[i]);
        const cfg = MAQSAD_COLORS[d.maqsad];
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill={cfg?.fill ?? "#C8A96A"} />
            <text
              x={lx}
              y={ly}
              fontSize="9"
              fill="var(--text3)"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
            >
              {d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── TRAIT BARS ───────────────────────────────────────────────────────────────

function TraitBars({
  traits,
}: {
  traits: {
    trait_id: string;
    name: string;
    maqsad: string;
    average?: number;
    class_average?: number;
  }[];
}) {
  if (!traits.length)
    return (
      <div
        style={{
          color: "var(--dim)",
          fontSize: 12,
          textAlign: "center",
          padding: 16,
        }}
      >
        لا توجد تقييمات سمات بعد
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {traits.map((t) => {
        const val = t.average ?? t.class_average ?? 0;
        const cfg = MAQSAD_COLORS[t.maqsad];
        return (
          <div
            key={t.trait_id}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 5,
                background: cfg?.bg ?? "rgba(200,169,106,0.1)",
                color: cfg?.color ?? "#8B6914",
                flexShrink: 0,
                minWidth: 44,
                textAlign: "center",
              }}
            >
              {MAQSAD_LABELS[t.maqsad] ?? t.maqsad}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text2)",
                width: 80,
                flexShrink: 0,
              }}
            >
              {t.name}
            </span>
            <div
              style={{
                flex: 1,
                height: 7,
                background: "rgba(0,0,0,0.06)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${val}%`,
                  background: cfg?.fill ?? "#C8A96A",
                  borderRadius: 99,
                  transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color:
                  val >= 75 ? "#2D8A4A" : val >= 50 ? "#8B6914" : "#8B1E1E",
                width: 36,
                textAlign: "end",
                flexShrink: 0,
              }}
            >
              {val}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SchoolAdminReportsPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [traitData, setTraitData] = useState<ClassTraitData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentTraits, setStudentTraits] = useState<
    StudentTraitDetail[] | null
  >(null);
  const [activeTab, setActiveTab] = useState<"performance" | "traits">(
    "performance",
  );

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
      setTraitData(null);
      setSelectedStudent(null);
      setStudentTraits(null);
      return;
    }
    setSelectedClass(cls);
    setDetail(null);
    setTraitData(null);
    setSelectedStudent(null);
    setStudentTraits(null);
    setDetailLoading(true);
    try {
      const [detailRes, traitRes] = await Promise.all([
        fetch(`/api/school-admin/reports/classes/${cls.id}`),
        fetch(`/api/school-admin/reports/classes/${cls.id}/traits`),
      ]);
      const [d, t] = await Promise.all([detailRes.json(), traitRes.json()]);
      setDetail(d);
      setTraitData(t);
    } finally {
      setDetailLoading(false);
    }
  };

  const openStudent = async (studentId: string) => {
    if (selectedStudent === studentId) {
      setSelectedStudent(null);
      setStudentTraits(null);
      return;
    }
    setSelectedStudent(studentId);
    setStudentTraits(null);
    try {
      const res = await fetch(
        `/api/school-admin/reports/students/${studentId}/traits`,
      );
      const d = await res.json();
      setStudentTraits(d.trait_radar ?? []);
    } catch {
      setStudentTraits([]);
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
      {/* ── MASTHEAD ── */}
      <div className="rp-masthead">
        <div className="rp-masthead-left">
          <div className="rp-eyebrow">
            <span className="rp-eyebrow-dot" />
            لوحة التحليلات
          </div>
          <h1 className="rp-headline">تقارير الأداء</h1>
          <p className="rp-subline">
            مراقبة شاملة لأداء الفصول والطلاب والسمات
          </p>
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
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
      </div>

      {/* ── KPIs ── */}
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

      {/* ── CLASSES ── */}
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
                <div className="rp-cc-header">
                  <div className="rp-cc-name">{cls.name}</div>
                  {cls.teacher_name && (
                    <div className="rp-cc-teacher">{cls.teacher_name}</div>
                  )}
                  <div className={`rp-cc-status ${active ? "open" : ""}`}>
                    {active ? "▲" : "▼"}
                  </div>
                </div>
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
                setTraitData(null);
                setSelectedStudent(null);
                setStudentTraits(null);
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

          {/* Tabs */}
          <div className="rp-tabs">
            <button
              className={`rp-tab ${activeTab === "performance" ? "active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              الأداء الأكاديمي
            </button>
            <button
              className={`rp-tab ${activeTab === "traits" ? "active" : ""}`}
              onClick={() => setActiveTab("traits")}
            >
              السمات والمقاصد
              {traitData && traitData.class_radar.length > 0 && (
                <span className="rp-tab-badge">
                  {traitData.class_radar.length}
                </span>
              )}
            </button>
          </div>

          {detailLoading ? (
            <div className="rp-loading" style={{ height: 120 }}>
              <div className="rp-spinner" />
            </div>
          ) : (
            <>
              {/* ── PERFORMANCE TAB ── */}
              {activeTab === "performance" && detail && (
                <>
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
                            onClick={() => openStudent(s.id)}
                          >
                            <span className="rp-td-name">
                              <div className="rp-avatar">
                                {s.full_name.charAt(0)}
                              </div>
                              {s.full_name}
                            </span>
                            <span className="rp-td-num">
                              {s.attempts_count}
                            </span>
                            <span
                              className="rp-td-num"
                              style={{ color: "#4ADE80" }}
                            >
                              {s.passed_count}
                            </span>
                            <span>
                              <RingChart
                                pct={s.avg_score}
                                size={44}
                                stroke={4}
                              />
                            </span>
                            <span>
                              <Sparkline
                                points={
                                  s.timeline?.map((t) => t.score_pct) ?? []
                                }
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
                          onClick={() => {
                            setSelectedStudent(null);
                            setStudentTraits(null);
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            studentTraits && studentTraits.length > 0
                              ? "1fr 1fr"
                              : "1fr",
                          gap: 16,
                        }}
                      >
                        {/* Timeline */}
                        <div>
                          <div
                            className="rp-panel-label"
                            style={{ marginBottom: 12 }}
                          >
                            المسار الأكاديمي
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
                                          {new Date(
                                            item.date,
                                          ).toLocaleDateString("ar-SA", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                        <span
                                          className="rp-tl-score"
                                          style={{ color }}
                                        >
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

                        {/* Student traits */}
                        {studentTraits && studentTraits.length > 0 && (
                          <div>
                            <div
                              className="rp-panel-label"
                              style={{ marginBottom: 12 }}
                            >
                              السمات الشخصية
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 14,
                              }}
                            >
                              <TraitRadar
                                data={studentTraits.map((t) => ({
                                  name: t.name,
                                  maqsad: t.maqsad,
                                  value: t.average,
                                }))}
                                size={180}
                              />
                              <TraitBars
                                traits={studentTraits.map((t) => ({
                                  ...t,
                                  trait_id: t.trait_id,
                                  average: t.average,
                                }))}
                              />
                            </div>
                          </div>
                        )}
                        {studentTraits && studentTraits.length === 0 && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--dim)",
                              fontSize: 12,
                              padding: 20,
                            }}
                          >
                            لا توجد تقييمات سمات بعد
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── TRAITS TAB ── */}
              {activeTab === "traits" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {!traitData || traitData.class_radar.length === 0 ? (
                    <div className="rp-panel">
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          color: "var(--dim)",
                        }}
                      >
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          style={{
                            opacity: 0.3,
                            display: "block",
                            margin: "0 auto 12px",
                          }}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          لا توجد تقييمات سمات بعد
                        </div>
                        <div style={{ fontSize: 12 }}>
                          قم بتقييم سمات الطلاب من لوحة المعلم
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Class-wide radar + bars */}
                      <div className="rp-charts-row">
                        <div
                          className="rp-panel"
                          style={{ alignItems: "center" }}
                        >
                          <div className="rp-panel-label">
                            رادار السمات · متوسط الفصل
                          </div>
                          <TraitRadar
                            data={traitData.class_radar.map((r) => ({
                              name: r.name,
                              maqsad: r.maqsad,
                              value: r.class_average ?? 0,
                            }))}
                            size={220}
                          />
                        </div>
                        <div className="rp-panel" style={{ flex: 2 }}>
                          <div className="rp-panel-label">
                            متوسط السمات · مقارنة الفصل
                          </div>
                          <TraitBars
                            traits={traitData.class_radar.map((r) => ({
                              trait_id: r.trait_id,
                              name: r.name,
                              maqsad: r.maqsad,
                              class_average: r.class_average,
                            }))}
                          />
                          <div
                            className="rp-panel-label"
                            style={{ marginTop: 8 }}
                          >
                            بناءً على{" "}
                            {
                              traitData.students.filter(
                                (s) => s.assessments_count > 0,
                              ).length
                            }{" "}
                            طالب تم تقييمهم
                          </div>
                        </div>
                      </div>

                      {/* Per-student trait table */}
                      <div className="rp-panel">
                        <div className="rp-panel-label">
                          السمات الفردية · كل طالب
                        </div>
                        {traitData.students.map((s, i) => (
                          <div
                            key={s.student_id}
                            className={`rp-trait-student-row ${i > 0 ? "bordered" : ""}`}
                          >
                            <div className="rp-trait-student-head">
                              <div className="rp-avatar">
                                {s.full_name.charAt(0)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "var(--text)",
                                  }}
                                >
                                  {s.full_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--dim)",
                                    marginTop: 1,
                                  }}
                                >
                                  {s.assessments_count} تقييم مكتمل
                                </div>
                              </div>
                              {s.assessments_count === 0 && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--dim)",
                                    fontStyle: "italic",
                                  }}
                                >
                                  لا توجد تقييمات
                                </span>
                              )}
                            </div>
                            {s.assessments_count > 0 && (
                              <div className="rp-trait-student-bars">
                                {s.trait_averages.map((t) => {
                                  const cfg =
                                    MAQSAD_COLORS[t.name] ??
                                    Object.values(MAQSAD_COLORS)[0];
                                  const classAvg =
                                    traitData.class_radar.find(
                                      (r) => r.trait_id === t.trait_id,
                                    )?.class_average ?? 0;
                                  return (
                                    <div
                                      key={t.trait_id}
                                      className="rp-trait-mini-row"
                                    >
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color: "var(--text2)",
                                          width: 70,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {t.name}
                                      </span>
                                      <div
                                        style={{
                                          flex: 1,
                                          height: 6,
                                          background: "rgba(0,0,0,0.06)",
                                          borderRadius: 99,
                                          overflow: "visible",
                                          position: "relative",
                                        }}
                                      >
                                        {/* Class average marker */}
                                        <div
                                          style={{
                                            position: "absolute",
                                            top: -3,
                                            width: 2,
                                            height: 12,
                                            background: "rgba(0,0,0,0.15)",
                                            borderRadius: 1,
                                            left: `${classAvg}%`,
                                            zIndex: 2,
                                          }}
                                          title={`متوسط الفصل: ${classAvg}%`}
                                        />
                                        <div
                                          style={{
                                            height: "100%",
                                            width: `${t.average}%`,
                                            background:
                                              t.average >= 75
                                                ? "#1DB85A"
                                                : t.average >= 50
                                                  ? "#C8A96A"
                                                  : "#E03535",
                                            borderRadius: 99,
                                            transition: "width 0.8s ease",
                                          }}
                                        />
                                      </div>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 800,
                                          color:
                                            t.average >= 75
                                              ? "#2D8A4A"
                                              : t.average >= 50
                                                ? "#8B6914"
                                                : "#8B1E1E",
                                          width: 32,
                                          textAlign: "end",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {t.average}%
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
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
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes kbFill{from{width:0}}
@keyframes glow{0%,100%{opacity:0.4}50%{opacity:0.8}}

:root{
  --bg:#F5F3EE;--surface:#FFFFFF;--surface2:#FAF8F4;
  --border:rgba(200,169,106,0.18);--border2:rgba(0,0,0,0.07);
  --text:#16120C;--text2:#42392A;--text3:#8A7A5A;--dim:#8A7A5A;
  --gold:#C8A96A;--gold-b:#E5B93C;
  --font:'Cairo',sans-serif;
}

.rp-page{display:flex;flex-direction:column;gap:28px;font-family:var(--font);color:var(--text);background:var(--bg);min-height:100vh;padding:32px 36px 60px;animation:fadeIn 0.4s ease}

.rp-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:200px;color:var(--dim);font-size:14px}
.rp-spinner{width:24px;height:24px;border:2.5px solid rgba(200,169,106,0.15);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
.rp-empty{text-align:center;color:var(--dim);font-size:14px;padding:48px;border:1px dashed var(--border);border-radius:12px}

/* Masthead */
.rp-masthead{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:24px;border-bottom:1px solid var(--border);animation:fadeUp 0.5s ease}
.rp-masthead-left{display:flex;flex-direction:column;gap:6px}
.rp-eyebrow{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.rp-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:glow 2s ease-in-out infinite}
.rp-headline{font-size:32px;font-weight:900;color:var(--text);letter-spacing:-1px;line-height:1.1}
.rp-subline{font-size:13px;color:var(--dim);font-weight:500}
.rp-masthead-badge{width:52px;height:52px;border-radius:14px;color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* KPIs */
.rp-kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.rp-kpi{background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:18px 16px 14px;display:flex;flex-direction:column;gap:8px;position:relative;overflow:hidden;animation:fadeUp 0.5s ease backwards;transition:border-color 0.2s,transform 0.2s}
.rp-kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0.35}
.rp-kpi:hover{border-color:var(--border);transform:translateY(-2px)}
.rp-kpi-top{display:flex;align-items:center;gap:8px}
.rp-kpi-icon{font-size:14px;opacity:0.7}
.rp-kpi-label{font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px}
.rp-kpi-value{font-size:36px;font-weight:900;line-height:1;letter-spacing:-1.5px}
.rp-kpi-bar{height:3px;border-radius:99px;overflow:hidden}
.rp-kpi-bar-fill{height:100%;width:70%;border-radius:99px;animation:kbFill 1.2s cubic-bezier(0.34,1.56,0.64,1) both}

/* Section head */
.rp-section-head{display:flex;align-items:center;gap:14px}
.rp-sh-line{flex:1;height:1px;background:var(--border)}
.rp-sh-label{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--dim);white-space:nowrap}
.rp-sh-count{width:22px;height:22px;border-radius:6px;background:var(--gold);color:#0B0B0C;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* Class cards */
.rp-classes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.rp-class-card{background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:18px;cursor:pointer;text-align:right;display:flex;flex-direction:column;gap:14px;font-family:var(--font);transition:all 0.2s cubic-bezier(0.4,0,0.2,1);animation:fadeUp 0.5s ease backwards;position:relative;overflow:hidden}
.rp-class-card:hover{border-color:var(--border);transform:translateY(-3px);box-shadow:0 12px 36px rgba(0,0,0,0.08)}
.rp-class-card.active{border-color:rgba(200,169,106,0.4);box-shadow:0 0 0 1px rgba(200,169,106,0.2),0 12px 40px rgba(0,0,0,0.08)}
.rp-cc-header{display:flex;flex-direction:column;gap:3px;position:relative}
.rp-cc-name{font-size:16px;font-weight:800;color:var(--text)}
.rp-cc-teacher{font-size:12px;color:var(--dim);font-weight:500}
.rp-cc-status{position:absolute;top:0;left:0;font-size:9px;color:var(--dim);transition:color 0.2s}
.rp-cc-status.open{color:var(--gold)}
.rp-cc-stats{display:flex;align-items:center;gap:0}
.rp-cc-stat{flex:1;display:flex;flex-direction:column;gap:2px;align-items:flex-end}
.rp-cc-stat:last-child{flex:none}
.rp-cc-stat-num{font-size:22px;font-weight:900;color:var(--text);line-height:1;letter-spacing:-0.5px}
.rp-cc-stat-lbl{font-size:10px;color:var(--dim);font-weight:600;letter-spacing:0.5px}
.rp-cc-divider{width:1px;height:32px;background:var(--border2);margin:0 16px;flex-shrink:0}
.rp-cc-spark-labels{display:flex;justify-content:space-between}
.rp-cc-spark-labels span{font-size:8px;color:var(--dim);font-weight:600}

/* Detail panel */
.rp-detail-panel{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:20px;animation:fadeUp 0.35s ease;position:relative;overflow:hidden}
.rp-detail-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0.5}
.rp-dp-header{display:flex;align-items:flex-start;justify-content:space-between}
.rp-dp-title{font-size:22px;font-weight:900;color:var(--text);margin-top:4px}
.rp-close-btn{width:32px;height:32px;border-radius:8px;background:var(--surface2);border:1px solid var(--border2);color:var(--dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0}
.rp-close-btn:hover{border-color:rgba(239,68,68,0.4);color:#EF4444}

/* Tabs */
.rp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border2);padding-bottom:0}
.rp-tab{padding:9px 18px;border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--dim);transition:all 0.15s;display:flex;align-items:center;gap:7px;margin-bottom:-1px}
.rp-tab:hover{color:var(--text)}
.rp-tab.active{color:var(--text);border-bottom-color:var(--gold);font-weight:800}
.rp-tab-badge{font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(200,169,106,0.15);color:#78590A;border:1px solid rgba(200,169,106,0.25)}

/* Charts row */
.rp-charts-row{display:grid;grid-template-columns:1fr 2fr;gap:14px;align-items:start}

/* Panels */
.rp-panel{background:var(--surface2);border:1px solid var(--border2);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:14px}
.rp-panel-label{font-size:9.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim)}

/* Table */
.rp-table{display:flex;flex-direction:column;gap:2px}
.rp-table-head{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr;gap:8px;padding:6px 12px;font-size:9px;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:1px}
.rp-table-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr;gap:8px;padding:10px 12px;border-radius:8px;border:1px solid transparent;cursor:pointer;transition:all 0.15s;align-items:center;animation:fadeUp 0.4s ease backwards}
.rp-table-row:hover{background:rgba(200,169,106,0.05);border-color:var(--border)}
.rp-table-row.active{background:rgba(200,169,106,0.08);border-color:rgba(200,169,106,0.2)}
.rp-td-name{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:var(--text)}
.rp-td-num{font-size:14px;font-weight:700;color:var(--text2);display:flex;align-items:center}
.rp-avatar{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--gold),var(--gold-b));color:#0B0B0C;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* Timeline */
.rp-close-sm{background:none;border:none;cursor:pointer;color:var(--dim);font-size:14px;padding:2px 6px;border-radius:4px;transition:color 0.15s}
.rp-close-sm:hover{color:#EF4444}
.rp-timeline{display:flex;flex-direction:column;gap:0;max-height:340px;overflow-y:auto;padding-right:4px}
.rp-tl-item{display:flex;align-items:flex-start;gap:12px;position:relative;animation:fadeUp 0.4s ease backwards;padding-bottom:12px}
.rp-tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:6px;position:relative;z-index:1}
.rp-tl-connector{position:absolute;top:16px;right:4px;width:2px;height:calc(100% - 4px);background:var(--border2);transform:translateX(50%)}
.rp-tl-item:last-child .rp-tl-connector{display:none}
.rp-tl-card{flex:1;background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;display:flex;flex-direction:column;gap:4px}
.rp-tl-stage{font-size:9px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.8px}
.rp-tl-mod{font-size:13px;font-weight:700;color:var(--text)}
.rp-tl-meta{display:flex;align-items:center;justify-content:space-between;margin-top:2px}
.rp-tl-date{font-size:11px;color:var(--dim)}
.rp-tl-score{font-size:16px;font-weight:900;line-height:1}

/* Trait student rows */
.rp-trait-student-row{display:flex;flex-direction:column;gap:10px;padding:14px 0}
.rp-trait-student-row.bordered{border-top:1px solid var(--border2)}
.rp-trait-student-head{display:flex;align-items:center;gap:10px}
.rp-trait-student-bars{display:flex;flex-direction:column;gap:7px;padding-right:38px}
.rp-trait-mini-row{display:flex;align-items:center;gap:8px}

@media(max-width:1024px){.rp-charts-row{grid-template-columns:1fr}}
@media(max-width:768px){
  .rp-page{padding:20px 16px 48px}
  .rp-kpi-strip{grid-template-columns:repeat(2,1fr)}
  .rp-headline{font-size:24px}
  .rp-table-head,.rp-table-row{grid-template-columns:2fr 1fr 1fr 1fr}
  .rp-table-head span:last-child,.rp-table-row>span:last-child{display:none}
}
@media(max-width:480px){
  .rp-kpi-strip{grid-template-columns:1fr 1fr; gap:8px}
  .rp-classes-grid{grid-template-columns:1fr}
  .rp-page{padding:16px 12px 48px}
  .rp-headline{font-size:21px}
  .rp-table-head,.rp-table-row{grid-template-columns:1.6fr 1fr 1fr; font-size:11.5px}
  .rp-table-head span:nth-child(3),.rp-table-row>span:nth-child(3){display:none}
}
@media(max-width:380px){
  .rp-page{padding:14px 10px 44px}
  .rp-headline{font-size:19px}
}
`;
