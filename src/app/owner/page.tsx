/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/api-cache";

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
  SCHOOL_ASSIGNED: "تم تعيين الجهة",
  SCHOOL_PLACEMENT_SUBMITTED: "تم تقديم التوزيع",
  CLASS_ASSIGNED: "تم تعيين الفصل",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_INTAKE: "#6B1E2D",
  INTAKE_SUBMITTED: "#B8A082",
  SCHOOL_ASSIGNED: "#1A1A1A",
  SCHOOL_PLACEMENT_SUBMITTED: "#B8A082",
  CLASS_ASSIGNED: "#B8A082",
};

function MandalaLoader() {
  const [phase, setPhase] = useState(0);
  const [label, setLabel] = useState("جارٍ تهيئة النظام");
  const [mounted, setMounted] = useState(false);

  const labels = ["جارٍ تهيئة النظام", "جارٍ استرداد البيانات", "جارٍ إعداد اللوحة"];

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setPhase((p) => (p + 1) % 360), 16);
    const labelInterval = setInterval(() => {
      setLabel((l) => {
        const idx = labels.indexOf(l);
        return labels[(idx + 1) % labels.length];
      });
    }, 1400);
    return () => { clearInterval(interval); clearInterval(labelInterval); };
  }, []);

  const rings = [
    { r: 82, strokeW: 0.5, opacity: 0.18, dashLen: 6,  gapLen: 16, speed: 0.4  },
    { r: 66, strokeW: 0.8, opacity: 0.28, dashLen: 10, gapLen: 10, speed: -0.6 },
    { r: 50, strokeW: 0.4, opacity: 0.2,  dashLen: 4,  gapLen: 10, speed: 0.9  },
    { r: 36, strokeW: 1.0, opacity: 0.35, dashLen: 14, gapLen: 8,  speed: -1.2 },
    { r: 22, strokeW: 0.6, opacity: 0.25, dashLen: 7,  gapLen: 5,  speed: 1.8  },
  ];

  return (
    <div className="ml-backdrop">
      <div className="ml-panel">
        <div className="ml-crest">
          <div className="ml-crest-line" /><div className="ml-crest-diamond" /><div className="ml-crest-line" />
        </div>
        <div className="ml-canvas">
          {mounted ? (
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="100" stroke="rgba(184,160,130,0.06)" strokeWidth="1" fill="none" />
              <circle cx="110" cy="110" r="95"  stroke="rgba(184,160,130,0.04)" strokeWidth="0.5" fill="none" />
              {rings.map((ring, ri) => {
                const circumference = 2 * Math.PI * ring.r;
                const offset = (phase * ring.speed) % circumference;
                return (
                  <circle key={ri} cx="110" cy="110" r={ring.r} fill="none"
                    stroke="#B8A082" strokeWidth={ring.strokeW} opacity={ring.opacity}
                    strokeDasharray={`${ring.dashLen} ${ring.gapLen}`} strokeDashoffset={-offset} />
                );
              })}
              {Array.from({ length: 8 }).map((_, i) => {
                const a = (i * 45 * Math.PI) / 180;
                return <circle key={i} cx={110 + 36 * Math.sin(a)} cy={110 - 36 * Math.cos(a)}
                  r={36} fill="none" stroke="#B8A082" strokeWidth="0.5" opacity="0.14" />;
              })}
              {Array.from({ length: 12 }).map((_, i) => {
                const a = ((i * 30 + phase * 0.15) * Math.PI) / 180;
                const brightness = 0.06 + 0.14 * Math.abs(Math.sin(((i * 30 + phase * 0.5) * Math.PI) / 180));
                return <line key={i} x1={110 + 22 * Math.sin(a)} y1={110 - 22 * Math.cos(a)}
                  x2={110 + 82 * Math.sin(a)} y2={110 - 82 * Math.cos(a)}
                  stroke="#B8A082" strokeWidth="0.5" opacity={brightness} />;
              })}
              {Array.from({ length: 6 }).map((_, i) => {
                const a1 = ((i * 60 + phase * 0.25) * Math.PI) / 180;
                const a2 = ((i * 60 + 30 + phase * 0.25) * Math.PI) / 180;
                return <line key={i} x1={110 + 36 * Math.sin(a1)} y1={110 - 36 * Math.cos(a1)}
                  x2={110 + 22 * Math.sin(a2)} y2={110 - 22 * Math.cos(a2)}
                  stroke="#B8A082" strokeWidth="0.7" opacity="0.3" />;
              })}
              {Array.from({ length: 8 }).map((_, i) => {
                const a = ((i * 45 + phase * 0.3) * Math.PI) / 180;
                return <rect key={i} x={110 + 90 * Math.sin(a) - 2.5} y={110 - 90 * Math.cos(a) - 2.5}
                  width="5" height="5" fill="none" stroke="#B8A082" strokeWidth="0.6" opacity="0.18"
                  transform={`rotate(45 ${110 + 90 * Math.sin(a)} ${110 - 90 * Math.cos(a)})`} />;
              })}
              <circle cx="110" cy="110" r="8" fill="none" stroke="#B8A082" strokeWidth="0.6" opacity="0.25" />
              <circle cx="110" cy="110" r="4" fill="none" stroke="#B8A082" strokeWidth="0.8" opacity="0.4" />
              <circle cx="110" cy="110" r="2" fill="#B8A082" opacity={0.4 + 0.3 * Math.sin(phase * 0.06)} />
            </svg>
          ) : (
            <div style={{ width: 220, height: 220 }} />
          )}
        </div>
        <div className="ml-text">
          <div className="ml-label">{label}</div>
          <div className="ml-dots">
            <div className="ml-dot" style={{ animationDelay: "0ms" }} />
            <div className="ml-dot" style={{ animationDelay: "200ms" }} />
            <div className="ml-dot" style={{ animationDelay: "400ms" }} />
          </div>
        </div>
        <div className="ml-crest" style={{ marginTop: 20 }}>
          <div className="ml-crest-line" /><div className="ml-crest-diamond" /><div className="ml-crest-line" />
        </div>
      </div>
      <style>{`
        @keyframes mlDotBlink { 0%,80%,100%{opacity:0.2;transform:scaleY(0.6)} 40%{opacity:1;transform:scaleY(1)} }
        @keyframes mlPanelIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .ml-backdrop { display:flex;align-items:center;justify-content:center;min-height:480px;width:100%; }
        .ml-panel { display:flex;flex-direction:column;align-items:center;padding:32px 40px 28px;background:#FFFFFF;border:1px solid #E2D9CA;border-top:2px solid #B8A082;border-radius:12px;box-shadow:0 8px 32px rgba(11,11,12,0.08);animation:mlPanelIn 0.4s cubic-bezier(0.4,0,0.2,1);min-width:300px; }
        .ml-crest { display:flex;align-items:center;width:100%;margin-bottom:20px; }
        .ml-crest-line { flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,0.25),transparent); }
        .ml-crest-diamond { width:5px;height:5px;background:rgba(184,160,130,0.4);transform:rotate(45deg);margin:0 10px;flex-shrink:0; }
        .ml-canvas { margin:0 0 16px;display:flex;align-items:center;justify-content:center; }
        .ml-text { display:flex;flex-direction:column;align-items:center;gap:10px; }
        .ml-label { font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;color:#8A7A5A; }
        .ml-dots { display:flex;gap:5px;align-items:center;height:16px; }
        .ml-dot { width:3px;height:14px;border-radius:2px;background:#B8A082;opacity:0.2;animation:mlDotBlink 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    cachedFetch<Stats>("/api/owner/stats", 30_000)
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !mounted) return (
    <div className="dash" dir="rtl">
      <MandalaLoader />
      <style>{dashCSS}</style>
    </div>
  );

  if (!stats) return (
    <div className="dash dash-error" dir="rtl">
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "#8A7A5A" }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
      </svg>
      <span>تعذّر تحميل البيانات.</span>
      <style>{dashCSS}</style>
    </div>
  );

  const statCards = [
    { label: "الجهات",          value: stats.schoolCount,        href: "/owner/schools",                  accent: "#6B1E2D", sub: "جهة مسجّلة",  icon: "🏫" },
    { label: "المشرفون",         value: stats.teacherCount,       href: "/owner/schools",                  accent: "#1A1A1A", sub: "مشرف نشط",       icon: "👨‍🏫" },
    { label: "المستفيدين",           value: stats.studentCount,       href: "/owner/submissions",              accent: "#B8A082", sub: "مستفيد مسجّل",     icon: "🎓" },
    { label: "بانتظار المراجعة", value: stats.pendingSubmissions, href: "/owner/submissions?status=PENDING", accent: "#6B1E2D", sub: "إجابة معلّقة", icon: "⏳", alert: stats.pendingSubmissions > 0 },
  ];

  return (
    <div className="dash" dir="rtl">
      <div className="dash-header">
        <div className="dash-header-label">
          <div className="dash-eyebrow">
            <div className="dash-eyebrow-line" />
            <span>لوحة التحكم الرئيسية</span>
            <div className="dash-eyebrow-line" />
          </div>
          <h1 className="dash-title">نظرة عامة شاملة</h1>
          <p className="dash-subtitle">المنصة التعليمية — بناء الأهلية</p>
        </div>
        {!stats.hasIntakeAssessment && (
          <Link href="/owner/intake-assessment" className="dash-cta-btn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            إنشاء اختبار القبول
          </Link>
        )}
      </div>

      {!stats.hasIntakeAssessment && (
        <div className="alert-banner danger">
          <div className="alert-icon">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="alert-body">
            <span className="alert-title">لم يتم إنشاء اختبار القبول بعد</span>
            <span className="alert-desc">لن يتمكن الطلاب الجدد من إجراء الاختبار الأوّلي.</span>
          </div>
          <Link href="/owner/intake-assessment" className="alert-action">إنشاء الآن →</Link>
        </div>
      )}

      {stats.pendingSubmissions > 0 && (
        <div className="alert-banner warning">
          <div className="alert-icon">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <div className="alert-body">
            <span className="alert-title">إجابات تنتظر المراجعة</span>
            <span className="alert-desc">يوجد {stats.pendingSubmissions.toLocaleString("en")} إجابة معلّقة تحتاج إلى اتخاذ قرار.</span>
          </div>
          <Link href="/owner/submissions?status=PENDING" className="alert-action">مراجعة الآن →</Link>
        </div>
      )}

      <div className="stat-grid">
        {statCards.map((card, i) => (
          <Link key={card.label} href={card.href} className="stat-card"
            style={{ "--accent": card.accent, animationDelay: `${i * 60}ms` } as React.CSSProperties}>
            {card.alert && <div className="stat-alert-stripe" />}
            <div className="stat-card-inner">
              <div className="stat-top">
                <div className="stat-icon-box" style={{ borderColor: `${card.accent}22`, background: `${card.accent}0d` }}>
                  <span className="stat-icon">{card.icon}</span>
                </div>
                {card.alert && (
                  <div className="stat-pulse-ring">
                    <div className="stat-pulse-dot" style={{ background: card.accent }} />
                  </div>
                )}
              </div>
              <div className="stat-value" style={{ color: card.accent }}>{card.value.toLocaleString("en")}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-sub">{card.sub}</div>
              <div className="stat-arrow">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="two-col">
        <div className="section-card">
          <div className="section-card-head">
            <div className="section-card-head-left">
              <h2 className="section-card-title">مسار تأهيل الطلاب</h2>
              <p className="section-card-desc">توزيع الطلاب حسب مرحلة القبول</p>
            </div>
            <span className="section-badge">{stats.studentCount.toLocaleString("en")} طالب</span>
          </div>
          <div className="pipeline">
            {stats.studentsByStatus.length === 0 ? (
              <div className="empty-state">لا يوجد طلاب مسجّلون بعد.</div>
            ) : (
              stats.studentsByStatus.map((s, i) => {
                const pct = stats.studentCount ? Math.min(100, (s.count / stats.studentCount) * 100) : 0;
                const color = STATUS_COLORS[s.status] ?? "#888";
                return (
                  <div key={s.status} className="pipeline-item" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="pipeline-head">
                      <div className="pipeline-dot" style={{ background: color }} />
                      <span className="pipeline-label">{STATUS_LABELS[s.status] ?? s.status}</span>
                      <span className="pipeline-count" style={{ color }}>{s.count.toLocaleString("en")}</span>
                      <span className="pipeline-pct">{Math.round(pct)}%</span>
                    </div>
                    <div className="pipeline-track">
                      <div className="pipeline-bar" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head">
            <div className="section-card-head-left">
              <h2 className="section-card-title">الوصول السريع</h2>
              <p className="section-card-desc">اختصارات للأقسام الرئيسية</p>
            </div>
          </div>
          <div className="quick-links">
            {[
              {
                href: "/owner/intake-assessment", icon: "📋", title: "اختبار القبول",
                sub: stats.hasIntakeAssessment ? "عرض وتعديل الاختبار الحالي" : "إنشاء اختبار جديد للطلاب",
                tag: stats.hasIntakeAssessment ? "نشط" : "مطلوب",
                tagType: stats.hasIntakeAssessment ? "success" : "danger",
              },
              {
                href: "/owner/submissions", icon: "📝", title: "الإجابات المُقدَّمة",
                sub: `${stats.totalSubmissions.toLocaleString("en")} إجمالي · ${stats.pendingSubmissions.toLocaleString("en")} معلّق`,
                tag: stats.pendingSubmissions > 0 ? "يحتاج مراجعة" : "محدّث",
                tagType: stats.pendingSubmissions > 0 ? "warning" : "success",
              },
              {
                href: "/owner/schools", icon: "🏫", title: "الجهات المسجّلة",
                sub: `${stats.schoolCount.toLocaleString("en")} جهات في منظومة النظام`,
                tag: "نشطة", tagType: "success",
              },
            ].map((link, i) => (
              <Link key={link.href} href={link.href} className="quick-link" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="ql-icon">{link.icon}</div>
                <div className="ql-body">
                  <div className="ql-title">{link.title}</div>
                  <div className="ql-sub">{link.sub}</div>
                </div>
                <span className={`ql-tag ${link.tagType}`}>{link.tag}</span>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text3)", flexShrink: 0 }}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{dashCSS}</style>
    </div>
  );
}

const dashCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  :root { --gold:#B8A082;--gold2:#B8A082;--black:#0A0A0B;--off-white:#F6F3EE;--text:#1A1A1A;--text2:#3E3526;--text3:#8A7A5A;--surface:#FFFFFF;--surface2:#FAF8F4;--surface3:#F3EEE5;--border:#E2D9CA;--border2:#CEC2AD;--success:#1B5E20;--success-bg:rgba(26,107,60,0.07);--warning:#9a6200;--warning-bg:rgba(154,98,0,0.07);--danger:#6B1E2D;--danger-bg:rgba(139,26,26,0.07);--radius:10px;--shadow-sm:0 1px 4px rgba(11,11,12,0.05);--shadow:0 4px 16px rgba(11,11,12,0.08);--shadow-md:0 8px 28px rgba(11,11,12,0.10); }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pipeIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulseRing{0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.2);opacity:0}}
  .dash{display:flex;flex-direction:column;gap:24px;font-family:'Cairo',sans-serif}
  .dash-error{align-items:center;justify-content:center;min-height:300px;flex-direction:row;gap:10px;color:var(--text3);font-size:14px}
  .dash-header{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;padding-bottom:24px;border-bottom:1px solid var(--border);position:relative}
  .dash-header::after{content:'';position:absolute;bottom:-1px;right:0;width:80px;height:2px;background:linear-gradient(90deg,var(--gold),transparent)}
  .dash-eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .dash-eyebrow-line{flex:1;height:1px;max-width:24px;background:rgba(184,160,130,0.35)}
  .dash-eyebrow span{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}
  .dash-title{font-size:28px;font-weight:900;color:var(--text);letter-spacing:-0.6px;line-height:1.05}
  .dash-subtitle{font-size:13px;color:var(--text3);margin-top:5px;font-weight:500}
  .dash-cta-btn{display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:var(--radius);background:var(--black);color:var(--gold);text-decoration:none;font-size:13px;font-weight:700;border:1px solid rgba(184,160,130,0.25);transition:all 0.18s}
  .dash-cta-btn:hover{background:#1A1A1A;border-color:rgba(184,160,130,0.45)}
  .alert-banner{display:flex;align-items:center;gap:14px;border-radius:var(--radius);padding:14px 18px;border:1px solid;position:relative;overflow:hidden}
  .alert-banner::before{content:'';position:absolute;right:0;top:0;bottom:0;width:3px}
  .alert-banner.danger{background:var(--danger-bg);border-color:rgba(139,26,26,0.18);color:var(--danger)}
  .alert-banner.danger::before{background:var(--danger)}
  .alert-banner.warning{background:var(--warning-bg);border-color:rgba(154,98,0,0.18);color:var(--warning)}
  .alert-banner.warning::before{background:var(--warning)}
  .alert-icon{flex-shrink:0;display:flex}
  .alert-body{display:flex;flex-direction:column;gap:2px;flex:1}
  .alert-title{font-size:13px;font-weight:800}
  .alert-desc{font-size:12px;opacity:0.75}
  .alert-action{white-space:nowrap;color:inherit;font-weight:800;text-decoration:none;font-size:12.5px;border:1px solid currentColor;padding:5px 13px;border-radius:6px;transition:all 0.15s;opacity:0.85}
  .alert-action:hover{opacity:1;background:rgba(255,255,255,0.3)}
  .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .stat-card{display:block;text-decoration:none;background:var(--surface);border:1px solid var(--border);border-radius:12px;position:relative;overflow:hidden;box-shadow:var(--shadow-sm);transition:box-shadow 0.2s,transform 0.2s;animation:cardIn 0.45s cubic-bezier(0.4,0,0.2,1) both}
  .stat-card:hover{box-shadow:var(--shadow-md);transform:translateY(-3px)}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent)}
  .stat-card::after{content:'';position:absolute;bottom:0;right:0;width:80px;height:80px;background:var(--accent);opacity:0.03;border-radius:80px 0 0 0}
  .stat-alert-stripe{position:absolute;top:0;right:0;bottom:0;width:3px;background:var(--accent);opacity:0.5}
  .stat-card-inner{padding:18px 18px 16px}
  .stat-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
  .stat-icon-box{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid}
  .stat-icon{font-size:20px;line-height:1}
  .stat-pulse-ring{position:relative;width:14px;height:14px}
  .stat-pulse-dot{position:absolute;inset:3px;border-radius:50%}
  .stat-pulse-dot::before{content:'';position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--accent);animation:pulseRing 1.6s cubic-bezier(0,0,0.2,1) infinite}
  .stat-value{font-size:34px;font-weight:900;font-family:'IBM Plex Mono',monospace;letter-spacing:-1.5px;line-height:1}
  .stat-label{font-size:13px;font-weight:700;color:var(--text);margin-top:6px}
  .stat-sub{font-size:11px;color:var(--text3);font-weight:500;margin-top:2px}
  .stat-arrow{margin-top:14px;color:var(--text3);display:flex;justify-content:flex-start;opacity:0.5}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .section-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;box-shadow:var(--shadow-sm)}
  .section-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);position:relative}
  .section-card-head::after{content:'';position:absolute;bottom:-1px;right:0;width:40px;height:2px;background:linear-gradient(90deg,var(--gold),transparent)}
  .section-card-head-left{display:flex;flex-direction:column;gap:3px}
  .section-card-title{font-size:15px;font-weight:800;color:var(--text)}
  .section-card-desc{font-size:12px;color:var(--text3);font-weight:500}
  .section-badge{font-size:11px;font-weight:700;background:rgba(184,160,130,0.1);color:var(--gold);border:1px solid rgba(184,160,130,0.22);padding:4px 12px;border-radius:20px;white-space:nowrap}
  .pipeline{display:flex;flex-direction:column;gap:16px}
  .pipeline-item{display:flex;flex-direction:column;gap:7px;animation:pipeIn 0.4s ease both}
  .pipeline-head{display:flex;align-items:center;gap:8px}
  .pipeline-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .pipeline-label{flex:1;font-size:12.5px;color:var(--text2);font-weight:600}
  .pipeline-count{font-size:13px;font-weight:800;font-family:'IBM Plex Mono',monospace}
  .pipeline-pct{font-size:10.5px;color:var(--text3);font-weight:600;min-width:32px;text-align:left}
  .pipeline-track{height:5px;background:var(--surface3);border-radius:99px;overflow:hidden}
  .pipeline-bar{height:100%;border-radius:99px;transition:width 0.7s cubic-bezier(0.4,0,0.2,1)}
  .empty-state{font-size:13px;color:var(--text3);text-align:center;padding:28px 0}
  .quick-links{display:flex;flex-direction:column;gap:10px}
  .quick-link{display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:9px;padding:13px 14px;text-decoration:none;color:var(--text);transition:all 0.18s;background:var(--surface);animation:cardIn 0.4s ease both;position:relative;overflow:hidden}
  .quick-link::after{content:'';position:absolute;right:0;top:0;bottom:0;width:2px;background:var(--gold);opacity:0;transition:opacity 0.18s}
  .quick-link:hover{border-color:rgba(184,160,130,0.3);background:var(--surface2)}
  .quick-link:hover::after{opacity:1}
  .ql-icon{font-size:22px;flex-shrink:0;line-height:1}
  .ql-body{flex:1;min-width:0}
  .ql-title{font-size:13px;font-weight:700;color:var(--text)}
  .ql-sub{font-size:11.5px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ql-tag{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid;white-space:nowrap;flex-shrink:0}
  .ql-tag.success{background:var(--success-bg);color:var(--success);border-color:rgba(26,107,60,0.2)}
  .ql-tag.warning{background:var(--warning-bg);color:var(--warning);border-color:rgba(154,98,0,0.2)}
  .ql-tag.danger{background:var(--danger-bg);color:var(--danger);border-color:rgba(139,26,26,0.2)}
  @media(max-width:1100px){.stat-grid{grid-template-columns:repeat(2,1fr)}.two-col{grid-template-columns:1fr}}
  @media(max-width:600px){.stat-grid{grid-template-columns:1fr 1fr}.dash-title{font-size:22px}}
`;
