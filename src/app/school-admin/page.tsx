"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch } from "@/lib/api-cache";
interface Stats {
  school: { name: string };
  teacherCount: number;
  studentCount: number;
  classCount: number;
  pendingPlacements: number;
  hasPlacementAssessment: boolean;
  studentsByStatus: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_INTAKE: "#C8A96A",
  INTAKE_SUBMITTED: "#B8935A",
  SCHOOL_ASSIGNED: "#9A7840",
  SCHOOL_PLACEMENT_SUBMITTED: "#7A5C2C",
  CLASS_ASSIGNED: "#5A4020",
};

export default function SchoolAdminDashboard() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const STATUS_LABELS: Record<string, string> = {
    PENDING_INTAKE: tr.waitingClass,
    INTAKE_SUBMITTED: tr.waitingReview,
    SCHOOL_ASSIGNED: tr.schoolAssigned,
    SCHOOL_PLACEMENT_SUBMITTED: tr.placementAssessment,
    CLASS_ASSIGNED: tr.classAssigned,
  };

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    cachedFetch<Stats>("/api/school-admin/stats", 60_000)
      .then((d) => {
        if (d?.school) setStats(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MandalaLoader label={tr.loading} />;
  if (error || !stats)
    return (
      <>
        <div className="dash-error">{tr.failedLoad}</div>
        <style>{css}</style>
      </>
    );

  const statCards = [
    {
      label: tr.teachers,
      value: stats.teacherCount,
      href: "/school-admin/teachers",
      icon: (
        <svg
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: tr.students,
      value: stats.studentCount,
      href: "/school-admin/students",
      icon: (
        <svg
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      label: tr.classes,
      value: stats.classCount,
      href: "/school-admin/classes",
      icon: (
        <svg
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      ),
    },
    {
      label: tr.awaitingPlacement,
      value: stats.pendingPlacements,
      href: "/school-admin/submissions",
      alert: stats.pendingPlacements > 0,
      icon: (
        <svg
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="dash" dir={dir}>
      {/* Page header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <p className="dash-eyebrow">{tr.schoolAdminDashboard}</p>
          <h1 className="dash-title">{stats.school?.name ?? ""}</h1>
        </div>
        {!stats.hasPlacementAssessment && (
          <Link href="/school-admin/placement-assessment" className="dash-cta">
            <svg
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {tr.createAssessment}
          </Link>
        )}
      </div>

      {/* Hairline separator */}
      <div className="dash-rule">
        <div className="dash-rule-line" />
        <div className="dash-rule-diamond" />
        <div className="dash-rule-line" />
      </div>

      {/* Alert banners */}
      {!stats.hasPlacementAssessment && (
        <div className="alert-banner alert-critical">
          <div className="alert-icon-wrap">
            <svg
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
          <span className="alert-text">{tr.noAssessmentWarning}</span>
          <Link
            href="/school-admin/placement-assessment"
            className="alert-action"
          >
            {tr.createNow}
            <svg
              width="11"
              height="11"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                d="M9 18l6-6-6-6"
                style={{
                  transform: dir === "rtl" ? "rotate(180deg)" : "none",
                  transformOrigin: "center",
                }}
              />
            </svg>
          </Link>
        </div>
      )}

      {stats.pendingPlacements > 0 && (
        <div className="alert-banner alert-warn">
          <div className="alert-icon-wrap">
            <svg
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <span className="alert-text">
            {stats.pendingPlacements} {tr.pendingPlacementsWarning}
          </span>
          <Link
            href="/school-admin/submissions?status=PENDING"
            className="alert-action"
          >
            {tr.reviewNow}
            <svg
              width="11"
              height="11"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="kpi-grid">
        {statCards.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className={`kpi-card ${card.alert ? "kpi-alert" : ""}`}
          >
            <div className="kpi-top">
              <div className="kpi-icon">{card.icon}</div>
              {card.alert && <div className="kpi-badge" />}
            </div>
            <div className="kpi-val">{card.value}</div>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-arrow">
              <svg
                width="11"
                height="11"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Status pipeline */}
      {stats.studentsByStatus.length > 0 && (
        <div className="pipeline-section">
          <div className="section-header">
            <h2 className="section-title">{tr.studentsByStatus}</h2>
            <div className="section-rule" />
          </div>
          <div className="pipeline-card">
            {stats.studentsByStatus.map((s, i) => (
              <div
                key={s.status}
                className="pipe-row"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="pipe-dot"
                  style={{ background: STATUS_COLORS[s.status] ?? "#C8A96A" }}
                />
                <div className="pipe-label">
                  {STATUS_LABELS[s.status] ?? s.status}
                </div>
                <div className="pipe-track">
                  <div
                    className="pipe-fill"
                    style={{
                      width: stats.studentCount
                        ? `${(s.count / stats.studentCount) * 100}%`
                        : "0%",
                      background: STATUS_COLORS[s.status] ?? "#C8A96A",
                    }}
                  />
                </div>
                <div className="pipe-count">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');

  @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.25} }
  @keyframes fillIn { from { width: 0 } }

  :root {
    --gold:        #C8A96A;
    --gold-bright: #E5B93C;
    --gold-pale:   rgba(200,169,106,0.08);
    --gold-border: rgba(200,169,106,0.18);
    --black:       #0B0B0C;
    --off-white:   #F5F3EE;
    --text:        #0B0B0C;
    --text2:       #3D3526;
    --text3:       #8A7B60;
    --surface:     #FFFFFF;
    --border:      #E4DDD0;
    --font:        'Cairo', sans-serif;
  }

  .dash {
    display: flex;
    flex-direction: column;
    gap: 22px;
    font-family: var(--font);
    color: var(--text);
    animation: fadeUp 0.35s ease;
  }

  .dash-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 180px;
    color: var(--text3);
    font-size: 14px;
    font-family: var(--font);
  }

  /* Header */
  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .dash-eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 5px;
  }
  .dash-title {
    font-size: 26px;
    font-weight: 900;
    color: var(--black);
    letter-spacing: -0.5px;
    line-height: 1.1;
  }
  .dash-cta {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--black);
    color: var(--gold);
    padding: 10px 20px;
    border-radius: 7px;
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 700;
    transition: background 0.15s;
    white-space: nowrap;
    font-family: var(--font);
    letter-spacing: 0.1px;
  }
  .dash-cta:hover { background: #1A1A1E; }

  /* Ornamental rule */
  .dash-rule {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dash-rule-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .dash-rule-diamond {
    width: 5px; height: 5px;
    background: var(--gold);
    transform: rotate(45deg);
    opacity: 0.5;
    flex-shrink: 0;
  }

  /* Alert banners */
  .alert-banner {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid;
  }
  .alert-critical {
    background: rgba(180,40,40,0.05);
    border-color: rgba(180,40,40,0.15);
    color: #8B2020;
  }
  .alert-warn {
    background: rgba(200,169,106,0.07);
    border-color: rgba(200,169,106,0.2);
    color: #6B4E18;
  }
  .alert-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 6px;
    background: currentColor;
    color: inherit;
    opacity: 0.12;
    flex-shrink: 0;
    position: relative;
  }
  .alert-icon-wrap svg {
    position: absolute;
    opacity: 8;
    color: inherit;
  }
  .alert-text { flex: 1; }
  .alert-action {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: inherit;
    font-weight: 800;
    text-decoration: none;
    font-size: 12.5px;
    white-space: nowrap;
    padding: 5px 11px;
    border-radius: 5px;
    border: 1px solid currentColor;
    opacity: 0.75;
    transition: opacity 0.15s;
  }
  .alert-action:hover { opacity: 1; }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 18px 16px;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  /* Top gold accent stripe */
  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.3) 50%, transparent);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .kpi-card:hover {
    border-color: rgba(200,169,106,0.5);
    box-shadow: 0 10px 28px rgba(11,11,12,0.07), 0 2px 6px rgba(200,169,106,0.10);
    transform: translateY(-3px);
  }
  .kpi-card:hover::before { opacity: 1; }
  .kpi-card:active { transform: translateY(-1px); transition: transform 0.05s; }
  .kpi-card.kpi-alert { border-color: rgba(200,169,106,0.3); }

  .kpi-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .kpi-icon {
    width: 38px; height: 38px;
    border-radius: 8px;
    background: var(--black);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gold);
  }
  .kpi-badge {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--gold-bright);
    animation: pulse 2s infinite;
  }
  .kpi-val {
    font-size: 32px;
    font-weight: 900;
    color: var(--black);
    letter-spacing: -1px;
    line-height: 1;
  }
  .kpi-label {
    font-size: 11.5px;
    color: var(--text3);
    font-weight: 600;
  }
  .kpi-arrow {
    position: absolute;
    bottom: 16px;
    inset-inline-end: 16px;
    color: rgba(200,169,106,0.25);
    transition: color 0.15s;
  }
  .kpi-card:hover .kpi-arrow { color: var(--gold); }

  /* Pipeline */
  .pipeline-section { display: flex; flex-direction: column; gap: 14px; }
  .section-header { display: flex; align-items: center; gap: 14px; }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .section-rule { flex: 1; height: 1px; background: var(--border); }

  .pipeline-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .pipe-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    margin: 0 -8px;
    border-radius: 8px;
    animation: fadeUp 0.4s ease both;
    transition: background 0.18s;
  }
  .pipe-row:hover { background: rgba(200,169,106,0.05); }
  .pipe-dot {
    width: 9px; height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(255,255,255,1), 0 0 0 4px currentColor;
    color: rgba(200,169,106,0.1);
    transition: color 0.18s;
  }
  .pipe-row:hover .pipe-dot { color: rgba(200,169,106,0.25); }
  .pipe-label {
    font-size: 12px;
    color: var(--text2);
    width: 210px;
    flex-shrink: 0;
    font-weight: 500;
  }
  .pipe-track {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
  }
  .pipe-fill {
    height: 100%;
    border-radius: 99px;
    animation: fillIn 0.8s ease both;
  }
  .pipe-count {
    font-size: 12px;
    font-weight: 800;
    color: var(--text);
    width: 28px;
    text-align: start;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 800px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .pipe-label { width: 140px; }
  }
  @media (max-width: 600px) {
    .dash-page { gap: 16px; }
    .dash-title { font-size: 22px; }
    .dash-sub { font-size: 12.5px; }
    .pipe-label { width: 100px; font-size: 11px; }
    .kpi-card { padding: 16px; }
    .kpi-num { font-size: 24px; }
    .kpi-label { font-size: 11px; }
  }
  @media (max-width: 480px) {
    .kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .dash-title { font-size: 20px; }
    .kpi-card { padding: 14px; }
    .kpi-num { font-size: 22px; }
  }
`;
