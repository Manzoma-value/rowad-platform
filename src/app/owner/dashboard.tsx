"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  schoolCount: number;
  teacherCount: number;
  studentCount: number;
  pendingSubmissions: number;
  totalSubmissions: number;
  hasIntakeAssessment: boolean;
  studentsByStatus: { status: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_INTAKE: "في انتظار الاختبار",
  INTAKE_SUBMITTED: "تم تقديم الاختبار",
  SCHOOL_ASSIGNED: "تم تعيين المدرسة",
  SCHOOL_PLACEMENT_SUBMITTED: "تم تقديم التوزيع",
  CLASS_ASSIGNED: "تم تعيين الفصل",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_INTAKE: "#1a4fa0",
  INTAKE_SUBMITTED: "#b45309",
  SCHOOL_ASSIGNED: "#0d7c4f",
  SCHOOL_PLACEMENT_SUBMITTED: "#6d28d9",
  CLASS_ASSIGNED: "#0e7490",
};

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="spinner" />
        <span>جارٍ تحميل البيانات…</span>
      </div>
    );
  }

  if (!stats) return <div className="dash-error">تعذّر تحميل البيانات.</div>;

  const statCards = [
    {
      label: "المدارس",
      value: stats.schoolCount,
      icon: "🏫",
      href: "/owner/schools",
      accent: "#1a4fa0",
      desc: "مدرسة مسجّلة",
    },
    {
      label: "المعلمون",
      value: stats.teacherCount,
      icon: "👨‍🏫",
      href: "/owner/schools",
      accent: "#0d7c4f",
      desc: "معلم نشط",
    },
    {
      label: "الطلاب",
      value: stats.studentCount,
      icon: "🎓",
      href: "/owner/submissions",
      accent: "#6d28d9",
      desc: "طالب مسجّل",
    },
    {
      label: "بانتظار المراجعة",
      value: stats.pendingSubmissions,
      icon: "⏳",
      href: "/owner/submissions?status=PENDING",
      accent: stats.pendingSubmissions > 0 ? "#b45309" : "#0d7c4f",
      alert: stats.pendingSubmissions > 0,
      desc: "إجابة معلّقة",
    },
  ];

  return (
    <div className="dash" dir="rtl">
      {/* Page header */}
      <div className="dash-header">
        <div className="dash-header-text">
          <h1 className="dash-title">لوحة التحكم</h1>
          <p className="dash-subtitle">نظرة عامة شاملة على المنصة التعليمية</p>
        </div>
        {!stats.hasIntakeAssessment && (
          <Link href="/owner/intake-assessment" className="dash-cta-btn">
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            إنشاء اختبار القبول
          </Link>
        )}
      </div>

      {/* Alerts */}
      {!stats.hasIntakeAssessment && (
        <div className="alert-banner danger">
          <div className="alert-icon">
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="alert-body">
            <span className="alert-title">لم يتم إنشاء اختبار القبول بعد</span>
            <span className="alert-desc">
              لن يتمكن الطلاب الجدد من إجراء الاختبار الأوّلي.
            </span>
          </div>
          <Link href="/owner/intake-assessment" className="alert-action">
            إنشاء الآن ←
          </Link>
        </div>
      )}

      {stats.pendingSubmissions > 0 && (
        <div className="alert-banner warning">
          <div className="alert-icon">
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <div className="alert-body">
            <span className="alert-title">إجابات تنتظر المراجعة</span>
            <span className="alert-desc">
              يوجد {stats.pendingSubmissions} إجابة{" "}
              {stats.pendingSubmissions > 1 ? "معلّقة" : "معلّقة"} تحتاج إلى
              اتخاذ قرار.
            </span>
          </div>
          <Link
            href="/owner/submissions?status=PENDING"
            className="alert-action"
          >
            مراجعة الآن ←
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="stat-card"
            style={{ "--card-accent": card.accent } as React.CSSProperties}
          >
            <div className="stat-card-top">
              <div
                className="stat-icon-wrap"
                style={{
                  background: `${card.accent}12`,
                  border: `1px solid ${card.accent}22`,
                }}
              >
                <span className="stat-icon">{card.icon}</span>
              </div>
              {card.alert && <div className="stat-alert-dot" />}
            </div>
            <div className="stat-value">
              {card.value.toLocaleString("ar-SA-u-nu-latn")}
            </div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-desc">{card.desc}</div>
          </Link>
        ))}
      </div>

      {/* Two-column section */}
      <div className="two-col">
        {/* Pipeline */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">مسار تأهيل الطلاب</h2>
            <span className="section-card-badge">
              {stats.studentCount} طالب
            </span>
          </div>
          <div className="pipeline">
            {stats.studentsByStatus.length === 0 ? (
              <div className="empty-state">لا يوجد طلاب مسجّلون بعد.</div>
            ) : (
              stats.studentsByStatus.map((s) => {
                const pct = stats.studentCount
                  ? Math.min(100, (s.count / stats.studentCount) * 100)
                  : 0;
                return (
                  <div key={s.status} className="pipeline-item">
                    <div className="pipeline-label-row">
                      <div
                        className="pipeline-dot"
                        style={{
                          background: STATUS_COLORS[s.status] ?? "#4a5568",
                        }}
                      />
                      <span className="pipeline-label">
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                      <span className="pipeline-count">{s.count}</span>
                    </div>
                    <div className="pipeline-bar-wrap">
                      <div
                        className="pipeline-bar"
                        style={{
                          width: `${pct}%`,
                          background: STATUS_COLORS[s.status] ?? "#4a5568",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">الوصول السريع</h2>
          </div>
          <div className="quick-links">
            <Link href="/owner/intake-assessment" className="quick-link">
              <div className="ql-icon-wrap">📋</div>
              <div className="ql-body">
                <div className="ql-title">اختبار القبول</div>
                <div className="ql-sub">
                  {stats.hasIntakeAssessment
                    ? "عرض وتعديل الاختبار"
                    : "إنشاء اختبار جديد"}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: "var(--text3)" }}
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <Link href="/owner/submissions" className="quick-link">
              <div className="ql-icon-wrap">📝</div>
              <div className="ql-body">
                <div className="ql-title">الإجابات المُقدَّمة</div>
                <div className="ql-sub">
                  {stats.totalSubmissions} إجمالي · {stats.pendingSubmissions}{" "}
                  معلّق
                </div>
              </div>
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: "var(--text3)" }}
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <Link href="/owner/schools" className="quick-link">
              <div className="ql-icon-wrap">🏫</div>
              <div className="ql-body">
                <div className="ql-title">المدارس المسجّلة</div>
                <div className="ql-sub">
                  {stats.schoolCount} مدارس في النظام
                </div>
              </div>
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: "var(--text3)" }}
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .dash { display: flex; flex-direction: column; gap: 24px; }
        .dash-loading, .dash-error {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; height: 220px; color: var(--text2); font-size: 14px;
        }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap; gap: 12px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }
        .dash-title {
          font-size: 26px; font-weight: 800;
          color: var(--text); letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .dash-subtitle { font-size: 13.5px; color: var(--text2); margin-top: 4px; font-weight: 500; }
        .dash-cta-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--accent); color: white;
          padding: 10px 18px; border-radius: var(--radius);
          text-decoration: none; font-size: 13px; font-weight: 700;
          transition: opacity 0.15s; box-shadow: 0 2px 8px rgba(26,79,160,0.25);
        }
        .dash-cta-btn:hover { opacity: 0.88; }

        /* Alerts */
        .alert-banner {
          display: flex; align-items: center; gap: 14px;
          border-radius: var(--radius); padding: 14px 18px;
          border: 1px solid;
        }
        .alert-banner.danger {
          background: var(--danger-bg); border-color: rgba(192,57,43,0.2); color: var(--danger);
        }
        .alert-banner.warning {
          background: var(--warning-bg); border-color: rgba(180,83,9,0.2); color: var(--warning);
        }
        .alert-icon { flex-shrink: 0; }
        .alert-body { display: flex; flex-direction: column; gap: 1px; flex: 1; }
        .alert-title { font-size: 13px; font-weight: 700; }
        .alert-desc { font-size: 12px; opacity: 0.8; }
        .alert-action {
          white-space: nowrap; color: inherit; font-weight: 700;
          text-decoration: none; font-size: 12.5px;
          border: 1px solid currentColor; padding: 5px 12px;
          border-radius: 6px; opacity: 0.85; transition: opacity 0.15s;
        }
        .alert-action:hover { opacity: 1; }

        /* Stat grid */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 3px solid var(--card-accent, var(--accent));
          border-radius: var(--radius);
          padding: 20px 18px;
          text-decoration: none;
          display: flex; flex-direction: column;
          gap: 4px;
          position: relative;
          transition: box-shadow 0.18s, transform 0.18s;
          box-shadow: var(--shadow-sm);
        }
        .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .stat-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .stat-icon-wrap {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-icon { font-size: 22px; }
        .stat-alert-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--warning); box-shadow: 0 0 8px var(--warning);
          animation: blink 2s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .stat-value {
          font-size: 32px; font-weight: 800;
          color: var(--card-accent, var(--accent));
          letter-spacing: -1px; line-height: 1;
          font-family: 'IBM Plex Mono', monospace;
        }
        .stat-label { font-size: 13px; font-weight: 700; color: var(--text); margin-top: 4px; }
        .stat-desc { font-size: 11px; color: var(--text3); font-weight: 500; }

        /* Two-column */
        .two-col {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .section-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 22px;
          box-shadow: var(--shadow-sm);
        }
        .section-card-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px; padding-bottom: 14px;
          border-bottom: 1px solid var(--border);
        }
        .section-card-title { font-size: 15px; font-weight: 800; color: var(--text); }
        .section-card-badge {
          font-size: 11px; font-weight: 700;
          background: var(--accent-muted2); color: var(--accent);
          padding: 3px 10px; border-radius: 20px;
        }

        /* Pipeline */
        .pipeline { display: flex; flex-direction: column; gap: 14px; }
        .pipeline-item { display: flex; flex-direction: column; gap: 6px; }
        .pipeline-label-row { display: flex; align-items: center; gap: 8px; }
        .pipeline-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pipeline-label { font-size: 12.5px; color: var(--text2); font-weight: 600; flex: 1; }
        .pipeline-count {
          font-size: 12px; font-weight: 700; color: var(--text);
          font-family: 'IBM Plex Mono', monospace;
        }
        .pipeline-bar-wrap {
          height: 6px; background: var(--surface3);
          border-radius: 99px; overflow: hidden;
        }
        .pipeline-bar {
          height: 100%; border-radius: 99px;
          transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        .empty-state { font-size: 13px; color: var(--text3); text-align: center; padding: 24px 0; }

        /* Quick links */
        .quick-links { display: flex; flex-direction: column; gap: 10px; }
        .quick-link {
          display: flex; align-items: center; gap: 12px;
          border: 1px solid var(--border); border-radius: 8px;
          padding: 13px 14px; text-decoration: none; color: var(--text);
          transition: border-color 0.15s, background 0.15s;
        }
        .quick-link:hover { border-color: var(--accent); background: var(--accent-muted); }
        .ql-icon-wrap { font-size: 22px; flex-shrink: 0; }
        .ql-body { flex: 1; }
        .ql-title { font-size: 13px; font-weight: 700; color: var(--text); }
        .ql-sub { font-size: 11.5px; color: var(--text2); margin-top: 1px; font-weight: 500; }

        @media (max-width: 1024px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .two-col { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .dash-title { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}
