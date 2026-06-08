"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { cachedFetch } from "@/lib/api-cache";

// ─── TYPES ────────────────────────────────────────────────────────────────────

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

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const TR: Record<string, Record<string, string>> = {
  ar: {
    loading: "جارٍ تحميل التقارير...",
    eyebrow: "تقارير المعلم",
    title: "أداء الطلاب",
    pendingSuffix: "تقييم سمات معلّق",
    noClasses: "لا توجد فصول مُعيَّنة لك بعد",
    studentsLabel: "طالب",
    attemptsLabel: "محاولة",
    avgLabel: "متوسط الدرجات",
    pendingLabel: "تقييم سمات معلّق",
    sectionStudents: "قائمة الطلاب",
    attempt: "محاولة",
    passedLabel: "ناجحة",
    traitsLabel: "سمات",
    noAssessments: "لا توجد تقييمات بعد",
    viewProfile: "عرض الملف",
  },
  sq: {
    loading: "Duke ngarkuar raportet...",
    eyebrow: "Raportet e Mësuesit",
    title: "Performanca e Nxënësve",
    pendingSuffix: "vlerësim tipari në pritje",
    noClasses: "Nuk keni klasa të caktuara akoma",
    studentsLabel: "nxënës",
    attemptsLabel: "tentativa",
    avgLabel: "Mesatarja",
    pendingLabel: "Vlerësime në pritje",
    sectionStudents: "Lista e Nxënësve",
    attempt: "tentativa",
    passedLabel: "kaloi",
    traitsLabel: "tipare",
    noAssessments: "Ende nuk ka vlerësime",
    viewProfile: "Shiko profilin",
  },
  en: {
    loading: "Loading reports...",
    eyebrow: "Teacher Reports",
    title: "Student Performance",
    pendingSuffix: "pending trait assessments",
    noClasses: "No classes assigned to you yet",
    studentsLabel: "students",
    attemptsLabel: "attempts",
    avgLabel: "Average Score",
    pendingLabel: "Pending assessments",
    sectionStudents: "Student List",
    attempt: "attempt",
    passedLabel: "passed",
    traitsLabel: "traits",
    noAssessments: "No assessments yet",
    viewProfile: "View profile",
  },
};

// ─── SCORE RING ───────────────────────────────────────────────────────────────

function ScoreRing({ pct, size = 52 }: { pct: number | null; size?: number }) {
  if (pct === null)
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "rgba(200,169,106,0.08)", border: "2px solid rgba(200,169,106,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 11, color: "#9A8A70", fontWeight: 700 }}>—</span>
      </div>
    );
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? "#2D8A4A" : pct >= 50 ? "#C8A96A" : "#64748B";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(200,169,106,0.12)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size < 48 ? 10 : 12, fontWeight: 800, color }}>{pct}%</span>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function TeacherReportsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const tr = TR[lang] ?? TR["sq"];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  useEffect(() => {
    cachedFetch<{ classes: ClassData[] }>("/api/teacher/reports", 60_000)
      .then((d) => {
        const cls: ClassData[] = d?.classes ?? [];
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="rp-shell" dir={dir}>
        <div className="rp-loading">
          <div className="rp-spinner" />
          <span>{tr.loading}</span>
        </div>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="rp-shell" dir={dir}>

      {/* ── Hero Header ── */}
      <div className="rp-hero">
        <div className="rp-hero-stripe" />
        <div className="rp-hero-body">
          <div className="rp-hero-left">
            <span className="rp-eyebrow">{tr.eyebrow}</span>
            <h1 className="rp-title">{tr.title}</h1>
          </div>
          {selectedClass && selectedClass.pending_trait_assessments > 0 && (
            <div className="rp-pending-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {selectedClass.pending_trait_assessments} {tr.pendingSuffix}
            </div>
          )}
        </div>
      </div>

      <div className="rp-content">

        {classes.length === 0 ? (
          <div className="rp-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p>{tr.noClasses}</p>
          </div>
        ) : (
          <>
            {/* Class tabs */}
            {classes.length > 1 && (
              <div className="rp-tabs">
                {classes.map((cls) => (
                  <button key={cls.id}
                    className={`rp-tab ${selectedClass?.id === cls.id ? "active" : ""}`}
                    onClick={() => setSelectedClass(cls)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    {cls.name}
                    <span className="rp-tab-badge">{cls.student_count}</span>
                    {cls.pending_trait_assessments > 0 && (
                      <span className="rp-tab-star">{cls.pending_trait_assessments} ★</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedClass && (
              <>
                {/* Stats row */}
                <div className="rp-stats">
                  <div className="rp-stat">
                    <div className="rp-stat-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <div className="rp-stat-body">
                      <span className="rp-stat-num">{selectedClass.student_count}</span>
                      <span className="rp-stat-label">{tr.studentsLabel}</span>
                    </div>
                  </div>

                  <div className="rp-stat">
                    <div className="rp-stat-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    </div>
                    <div className="rp-stat-body">
                      <span className="rp-stat-num">{selectedClass.total_attempts}</span>
                      <span className="rp-stat-label">{tr.attemptsLabel}</span>
                    </div>
                  </div>

                  <div className="rp-stat rp-stat-score">
                    <ScoreRing pct={selectedClass.avg_score} size={56} />
                    <div className="rp-stat-body">
                      <span className="rp-stat-num" style={{ fontSize: 13, color: "#9A8A70", fontWeight: 700 }}>{tr.avgLabel}</span>
                    </div>
                  </div>

                  <div className="rp-stat rp-stat-pending">
                    <div className="rp-stat-icon gold">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </div>
                    <div className="rp-stat-body">
                      <span className="rp-stat-num gold">{selectedClass.pending_trait_assessments}</span>
                      <span className="rp-stat-label">{tr.pendingLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Section label */}
                <div className="rp-section-label">
                  <span>{tr.sectionStudents}</span>
                  <div className="rp-section-rule" />
                </div>

                {/* Student grid */}
                <div className="rp-grid">
                  {selectedClass.students.map((s, i) => (
                    <button key={s.id} className="rp-card"
                      style={{ animationDelay: `${i * 35}ms` }}
                      onClick={() => router.push(`/teacher/reports/students/${s.id}`)}>

                      {s.pending_trait_assessments > 0 && (
                        <div className="rp-card-star">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          {s.pending_trait_assessments}
                        </div>
                      )}

                      <div className="rp-card-av">{s.full_name.charAt(0)}</div>
                      <div className="rp-card-name">{s.full_name}</div>

                      <ScoreRing pct={s.avg_score} size={54} />

                      <div className="rp-card-meta">
                        <span>{s.attempts_count} {tr.attempt}</span>
                        <span className="rp-dot">·</span>
                        <span>{s.passed_count} {tr.passedLabel}</span>
                      </div>

                      <div className="rp-card-trait-row">
                        {s.trait_assessments_count > 0 || s.pending_trait_assessments > 0 ? (
                          <>
                            <div className="rp-trait-bar">
                              <div className="rp-trait-fill" style={{
                                width: `${s.passed_count > 0 ? Math.round((s.trait_assessments_count / Math.max(s.passed_count,1)) * 100) : 0}%`,
                              }} />
                            </div>
                            <span className="rp-trait-label">
                              {s.trait_assessments_count}/{Math.max(s.passed_count,0)} {tr.traitsLabel}
                            </span>
                          </>
                        ) : (
                          <span className="rp-trait-none">{tr.noAssessments}</span>
                        )}
                      </div>

                      <div className="rp-card-arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@keyframes rp-fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes rp-spin{to{transform:rotate(360deg)}}
@keyframes rp-cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes rp-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

:root{
  --rp-gold:#C8A96A; --rp-gold2:#E5B93C;
  --rp-black:#0B0B0C; --rp-bg:#F6F4EE;
  --rp-card:#FFFDF8; --rp-border:rgba(200,169,106,0.14);
  --rp-text:#0B0B0C; --rp-text2:#3D3526; --rp-text3:#9A8A70;
  --rp-font:'Cairo',sans-serif;
}

/* Shell */
.rp-shell{
  min-height:100vh; background:var(--rp-bg);
  font-family:var(--rp-font); color:var(--rp-text);
  animation:rp-fadeUp 0.35s ease;
}

/* Loading */
.rp-loading{
  display:flex;align-items:center;justify-content:center;gap:12px;
  height:60vh; color:var(--rp-text3); font-size:14px; font-weight:600;
}
.rp-spinner{
  width:26px;height:26px;border-radius:50%;
  border:3px solid rgba(200,169,106,0.15);border-top-color:var(--rp-gold);
  animation:rp-spin 0.7s linear infinite;
}

/* Hero */
.rp-hero{
  background:var(--rp-black); position:relative; overflow:hidden;
  padding:28px 40px 24px;
  border-bottom:1px solid rgba(200,169,106,0.08);
}
.rp-hero-stripe{
  position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent);
}
.rp-hero::after{
  content:'';position:absolute;bottom:-60px;right:-60px;
  width:220px;height:220px;border-radius:50%;
  background:radial-gradient(circle,rgba(200,169,106,0.06),transparent 70%);
  pointer-events:none;
}
.rp-hero-body{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.rp-hero-left{display:flex;flex-direction:column;gap:6px}
.rp-eyebrow{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(200,169,106,0.55)}
.rp-title{font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:-0.3px}
.rp-pending-chip{
  display:flex;align-items:center;gap:7px;
  padding:8px 16px;border-radius:10px;
  background:rgba(229,185,60,0.12);border:1px solid rgba(229,185,60,0.25);
  color:#C8A96A;font-size:12.5px;font-weight:700;flex-shrink:0;
}

/* Content */
.rp-content{
  display:flex;flex-direction:column;gap:24px;
  padding:28px 40px 80px;
}

/* Empty */
.rp-empty{
  display:flex;flex-direction:column;align-items:center;gap:14px;
  padding:64px 32px;background:var(--rp-card);
  border:1px solid var(--rp-border);border-radius:20px;text-align:center;
}
.rp-empty svg{color:rgba(200,169,106,0.3)}
.rp-empty p{font-size:14px;font-weight:600;color:var(--rp-text3)}

/* Tabs */
.rp-tabs{display:flex;gap:8px;flex-wrap:wrap}
.rp-tab{
  display:flex;align-items:center;gap:8px;
  padding:9px 18px;border-radius:12px;
  border:1.5px solid var(--rp-border);background:var(--rp-card);
  cursor:pointer;font-family:var(--rp-font);font-size:13.5px;font-weight:600;
  color:var(--rp-text2);transition:all 0.18s;
}
.rp-tab:hover{border-color:rgba(200,169,106,0.3)}
.rp-tab.active{background:var(--rp-black);border-color:var(--rp-black);color:var(--rp-gold)}
.rp-tab-badge{
  font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;
  background:rgba(200,169,106,0.12);color:var(--rp-text3);
}
.rp-tab.active .rp-tab-badge{background:rgba(200,169,106,0.2);color:var(--rp-gold)}
.rp-tab-star{font-size:10px;font-weight:800;color:#C8A96A;background:rgba(229,185,60,0.12);padding:2px 8px;border-radius:99px;border:1px solid rgba(229,185,60,0.25)}

/* Stats */
.rp-stats{
  display:grid;grid-template-columns:repeat(4,1fr);gap:14px;
}
.rp-stat{
  display:flex;align-items:center;gap:14px;
  background:var(--rp-card);border:1.5px solid var(--rp-border);
  border-radius:18px;padding:18px 20px;
  position:relative;overflow:hidden;
  box-shadow:0 2px 10px rgba(0,0,0,0.04);
  transition:all 0.2s ease;
}
.rp-stat:hover{border-color:rgba(200,169,106,0.28);box-shadow:0 4px 16px rgba(200,169,106,0.1)}
.rp-stat::after{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.25),transparent);
}
.rp-stat-pending::after{background:linear-gradient(90deg,transparent,var(--rp-gold),transparent)}
.rp-stat-score{gap:12px}
.rp-stat-icon{
  width:40px;height:40px;border-radius:12px;flex-shrink:0;
  background:#F0EDE6;border:1px solid rgba(200,169,106,0.2);
  display:flex;align-items:center;justify-content:center;
  color:var(--rp-text3);
}
.rp-stat-icon.gold{background:rgba(229,185,60,0.1);border-color:rgba(229,185,60,0.25);color:var(--rp-gold)}
.rp-stat-body{display:flex;flex-direction:column;gap:2px}
.rp-stat-num{font-size:26px;font-weight:900;color:var(--rp-black);line-height:1;letter-spacing:-0.5px}
.rp-stat-num.gold{color:#A8863E}
.rp-stat-label{font-size:11.5px;color:var(--rp-text3);font-weight:600}

/* Section label */
.rp-section-label{
  display:flex;align-items:center;gap:14px;
}
.rp-section-label span{
  font-size:10px;font-weight:800;letter-spacing:2px;
  text-transform:uppercase;color:var(--rp-text3);white-space:nowrap;
}
.rp-section-rule{flex:1;height:1px;background:var(--rp-border)}

/* Student grid */
.rp-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:14px;
}

/* Student card */
.rp-card{
  position:relative;display:flex;flex-direction:column;align-items:center;
  gap:10px;padding:28px 18px 18px;
  background:var(--rp-card);border:1.5px solid var(--rp-border);
  border-radius:22px;cursor:pointer;font-family:var(--rp-font);text-align:center;
  transition:all 0.22s cubic-bezier(0.22,1,0.36,1);
  animation:rp-cardIn 0.38s ease both;
  box-shadow:0 2px 10px rgba(0,0,0,0.04);
  overflow:hidden;
}
.rp-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,transparent,var(--rp-gold),transparent);
  transform:scaleX(0);transition:transform 0.25s ease;transform-origin:center;
}
.rp-card:hover{
  border-color:rgba(200,169,106,0.35);
  transform:translateY(-4px);
  box-shadow:0 14px 36px rgba(0,0,0,0.1),0 4px 14px rgba(200,169,106,0.1);
}
.rp-card:hover::before{transform:scaleX(1)}

/* Pending star */
.rp-card-star{
  position:absolute;top:12px;left:12px;
  display:flex;align-items:center;gap:4px;
  font-size:10px;font-weight:800;color:#A8863E;
  background:rgba(229,185,60,0.12);border:1px solid rgba(229,185,60,0.28);
  border-radius:99px;padding:3px 8px;
}

/* Avatar */
.rp-card-av{
  width:64px;height:64px;border-radius:20px;
  background:var(--rp-black);color:var(--rp-gold);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:900;flex-shrink:0;
  box-shadow:0 4px 14px rgba(0,0,0,0.15);
}

.rp-card-name{font-size:14px;font-weight:800;color:var(--rp-black);line-height:1.3}

.rp-card-meta{
  font-size:11.5px;color:var(--rp-text3);font-weight:500;
  display:flex;align-items:center;gap:6px;
}
.rp-dot{opacity:0.4}

/* Trait bar */
.rp-card-trait-row{width:100%;display:flex;align-items:center;gap:8px}
.rp-trait-bar{flex:1;height:4px;background:rgba(200,169,106,0.1);border-radius:99px;overflow:hidden}
.rp-trait-fill{height:100%;background:linear-gradient(90deg,var(--rp-gold),var(--rp-gold2));border-radius:99px;transition:width 0.8s ease}
.rp-trait-label{font-size:10px;font-weight:700;color:var(--rp-text3);white-space:nowrap;flex-shrink:0}
.rp-trait-none{font-size:10px;color:rgba(200,169,106,0.3);width:100%;text-align:center}

/* Arrow */
.rp-card-arrow{
  color:rgba(200,169,106,0.35);transition:color 0.15s,transform 0.15s;margin-top:2px;
}
.rp-card:hover .rp-card-arrow{color:var(--rp-gold);transform:translateX(3px)}

@media(max-width:900px){
  .rp-hero,.rp-content{padding-inline:20px}
  .rp-stats{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:600px){
  .rp-hero{padding:22px 16px 20px}
  .rp-content{padding:20px 16px 60px;gap:18px}
  .rp-title{font-size:21px}
  .rp-empty{padding:44px 20px}
}
@media(max-width:540px){
  .rp-grid{grid-template-columns:1fr}
  .rp-stats{grid-template-columns:1fr 1fr}
}
@media(max-width:380px){
  .rp-hero,.rp-content{padding-inline:12px}
  .rp-title{font-size:18px}
  .rp-stats{grid-template-columns:1fr 1fr;gap:10px}
}
`;
