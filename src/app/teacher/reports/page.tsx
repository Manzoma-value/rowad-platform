"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StudentSummary {
  id: string;
  full_name: string;
  attempts_count: number;
  passed_count: number;
  avg_score: number | null;
  trait_assessments_count: number;
  pending_trait_assessments: number;
}

interface ClassData {
  id: string;
  name: string;
  student_count: number;
  total_attempts: number;
  avg_score: number | null;
  score_distribution: number[];
  pending_trait_assessments: number;
  students: StudentSummary[];
}

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
        <span style={{ fontSize: size < 48 ? 10 : 12, fontWeight: 800, color }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export default function TeacherReportsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  useEffect(() => {
    fetch("/api/teacher/reports")
      .then((r) => r.json())
      .then((d) => {
        const cls: ClassData[] = d.classes ?? [];
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0]);
      })
      .finally(() => setLoading(false));
  }, []);

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
      {/* Header */}
      <div className="rp-header">
        <div>
          <p className="rp-eyebrow">تقارير المعلم</p>
          <h1 className="rp-title">أداء الطلاب</h1>
        </div>
        {selectedClass && selectedClass.pending_trait_assessments > 0 && (
          <div className="rp-pending-banner">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {selectedClass.pending_trait_assessments} تقييم سمات معلّق
          </div>
        )}
      </div>

      <div className="rp-rule">
        <div className="rp-rule-line" />
        <div className="rp-rule-diamond" />
        <div className="rp-rule-line" />
      </div>

      {classes.length === 0 ? (
        <div className="rp-empty">لا توجد فصول مُعيَّنة لك بعد</div>
      ) : (
        <>
          {/* Class tabs */}
          {classes.length > 1 && (
            <div className="rp-class-tabs">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  className={`rp-class-tab ${selectedClass?.id === cls.id ? "active" : ""}`}
                  onClick={() => setSelectedClass(cls)}
                >
                  {cls.name}
                  <span className="rp-tab-count">{cls.student_count}</span>
                  {cls.pending_trait_assessments > 0 && (
                    <span className="rp-tab-pending">
                      {cls.pending_trait_assessments}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedClass && (
            <>
              {/* Class stats row */}
              <div className="rp-stats-row">
                <div className="rp-stat-card">
                  <div className="rp-stat-num">
                    {selectedClass.student_count}
                  </div>
                  <div className="rp-stat-label">طالب</div>
                </div>
                <div className="rp-stat-card">
                  <div className="rp-stat-num">
                    {selectedClass.total_attempts}
                  </div>
                  <div className="rp-stat-label">محاولة</div>
                </div>
                <div className="rp-stat-card">
                  <div className="rp-stat-num">
                    {selectedClass.avg_score !== null
                      ? `${selectedClass.avg_score}%`
                      : "—"}
                  </div>
                  <div className="rp-stat-label">متوسط الدرجات</div>
                </div>
                <div className="rp-stat-card gold">
                  <div className="rp-stat-num">
                    {selectedClass.pending_trait_assessments}
                  </div>
                  <div className="rp-stat-label">تقييم سمات معلّق</div>
                </div>
              </div>

              {/* Student card grid */}
              <div className="rp-section-label">قائمة الطلاب</div>
              <div className="rp-student-grid">
                {selectedClass.students.map((s, i) => (
                  <button
                    key={s.id}
                    className="rp-student-card"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() =>
                      router.push(`/teacher/reports/students/${s.id}`)
                    }
                  >
                    {/* Pending badge */}
                    {s.pending_trait_assessments > 0 && (
                      <div className="rp-card-pending-badge">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {s.pending_trait_assessments}
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="rp-card-av">{s.full_name.charAt(0)}</div>

                    {/* Name */}
                    <div className="rp-card-name">{s.full_name}</div>

                    {/* Score ring */}
                    <ScoreRing pct={s.avg_score} size={52} />

                    {/* Stats */}
                    <div className="rp-card-stats">
                      <span>{s.attempts_count} محاولة</span>
                      <span className="rp-card-sep">·</span>
                      <span>{s.passed_count} ناجحة</span>
                    </div>

                    {/* Trait assessment bar */}
                    <div className="rp-card-trait-row">
                      {s.trait_assessments_count > 0 ||
                      s.pending_trait_assessments > 0 ? (
                        <>
                          <div className="rp-card-trait-bar-bg">
                            <div
                              className="rp-card-trait-bar-fill"
                              style={{
                                width: `${s.passed_count > 0 ? Math.round((s.trait_assessments_count / s.passed_count) * 100) : 0}%`,
                              }}
                            />
                          </div>
                          <span className="rp-card-trait-label">
                            {s.trait_assessments_count}/{s.passed_count} سمات
                          </span>
                        </>
                      ) : (
                        <span className="rp-card-trait-none">
                          لا توجد تقييمات بعد
                        </span>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="rp-card-arrow">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </button>
                ))}
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
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

:root{
  --gold:#C8A96A;--gold2:#E5B93C;
  --gold-pale:rgba(200,169,106,0.08);
  --gold-border:rgba(200,169,106,0.18);
  --black:#0B0B0C;--off-white:#F5F3EE;
  --text:#0B0B0C;--text2:#3D3526;--text3:#8A7B60;
  --surface:#FFFFFF;--surface2:#FAFAF8;
  --border:rgba(8,11,12,0.09);
  --font:'Cairo',sans-serif;
}

.rp-page{display:flex;flex-direction:column;gap:22px;font-family:var(--font);color:var(--text);animation:fadeUp 0.35s ease;padding:36px 40px 80px;min-height:100vh}

/* Header */
.rp-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
.rp-eyebrow{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);margin-bottom:6px}
.rp-title{font-size:28px;font-weight:900;color:var(--black);letter-spacing:-0.4px}
.rp-pending-banner{display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:10px;background:rgba(229,185,60,0.1);border:1px solid rgba(229,185,60,0.25);color:#7A6020;font-size:13px;font-weight:700;align-self:flex-end}

.rp-rule{display:flex;align-items:center;gap:10px}
.rp-rule-line{flex:1;height:1px;background:var(--border)}
.rp-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.5;flex-shrink:0}

.rp-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:200px;color:var(--text3);font-size:14px}
.rp-spinner{width:26px;height:26px;border:3px solid var(--gold-border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
.rp-empty{text-align:center;color:var(--text3);font-size:14px;padding:60px;background:var(--surface);border:1px solid var(--border);border-radius:16px}

/* Class tabs */
.rp-class-tabs{display:flex;gap:6px;flex-wrap:wrap}
.rp-class-tab{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;font-family:var(--font);font-size:13.5px;font-weight:600;color:var(--text2);transition:all 0.15s}
.rp-class-tab:hover{border-color:var(--gold-border)}
.rp-class-tab.active{background:var(--black);border-color:var(--black);color:var(--gold)}
.rp-tab-count{font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,0.12);color:inherit}
.rp-class-tab:not(.active) .rp-tab-count{background:rgba(8,11,12,0.06);color:var(--text3)}
.rp-tab-pending{font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(229,185,60,0.2);color:#7A6020;border:1px solid rgba(229,185,60,0.3)}

/* Stats row */
.rp-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.rp-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;position:relative;overflow:hidden}
.rp-stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(200,169,106,0.3),transparent)}
.rp-stat-card.gold::before{background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.rp-stat-num{font-size:26px;font-weight:900;color:var(--black);line-height:1;margin-bottom:4px;letter-spacing:-0.5px}
.rp-stat-card.gold .rp-stat-num{color:#7A6020}
.rp-stat-label{font-size:11.5px;color:var(--text3);font-weight:600}

/* Section label */
.rp-section-label{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--text3)}

/* Student card grid */
.rp-student-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}

.rp-student-card{
  position:relative;
  display:flex;flex-direction:column;align-items:center;
  gap:10px;padding:24px 18px 18px;
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:20px;
  cursor:pointer;
  font-family:var(--font);
  text-align:center;
  transition:all 0.2s cubic-bezier(0.22,1,0.36,1);
  animation:cardIn 0.35s ease both;
  box-shadow:0 2px 8px rgba(8,11,12,0.04);
}
.rp-student-card:hover{
  border-color:rgba(200,169,106,0.35);
  transform:translateY(-3px);
  box-shadow:0 12px 32px rgba(8,11,12,0.08);
}
.rp-student-card::before{
  content:'';position:absolute;top:0;left:20%;right:20%;height:2px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);
  border-radius:0 0 4px 4px;
  opacity:0;transition:opacity 0.2s;
}
.rp-student-card:hover::before{opacity:1}

/* Pending badge */
.rp-card-pending-badge{
  position:absolute;top:12px;left:12px;
  display:flex;align-items:center;gap:4px;
  font-size:10px;font-weight:800;
  color:#7A6020;
  background:rgba(229,185,60,0.15);
  border:1px solid rgba(229,185,60,0.3);
  border-radius:99px;padding:3px 8px;
}

/* Avatar */
.rp-card-av{
  width:60px;height:60px;border-radius:18px;
  background:var(--black);color:var(--gold);
  display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:900;
  flex-shrink:0;
}

.rp-card-name{font-size:14px;font-weight:800;color:var(--black);line-height:1.3}

.rp-card-stats{font-size:11.5px;color:var(--text3);font-weight:500;display:flex;align-items:center;gap:6px}
.rp-card-sep{opacity:0.4}

/* Trait bar */
.rp-card-trait-row{width:100%;display:flex;align-items:center;gap:8px}
.rp-card-trait-bar-bg{flex:1;height:4px;background:rgba(200,169,106,0.12);border-radius:99px;overflow:hidden}
.rp-card-trait-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:99px;transition:width 0.8s ease}
.rp-card-trait-label{font-size:10px;font-weight:700;color:var(--text3);white-space:nowrap;flex-shrink:0}
.rp-card-trait-none{font-size:10px;color:rgba(8,11,12,0.25);width:100%;text-align:center}

/* Arrow */
.rp-card-arrow{color:rgba(200,169,106,0.4);transition:color 0.15s,transform 0.15s}
.rp-student-card:hover .rp-card-arrow{color:var(--gold);transform:translateX(-3px)}

@media(max-width:900px){
  .rp-page{padding:24px 18px 60px}
  .rp-stats-row{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:500px){
  .rp-student-grid{grid-template-columns:1fr 1fr}
  .rp-stats-row{grid-template-columns:1fr 1fr}
}
`;
