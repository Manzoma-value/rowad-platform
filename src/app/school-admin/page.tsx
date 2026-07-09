"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useViewOnly } from "@/lib/view-only-context";

interface Stats {
  school: { name: string; name_alt?: string | null };
  adminName?: string | null;
  teacherCount: number;
  studentCount: number;
  classCount: number;
  pendingPlacements: number;
  hasPlacementAssessment: boolean;
  studentsByStatus?: { status: string; count: number }[];
}

export default function SchoolAdminDashboard() {
  const { lang } = useLang();
  const viewOnly = useViewOnly();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const labels = {
    eyebrow: lang === "ar" ? "مركز القيادة المدرسي" : lang === "sq" ? "Qendra e drejtimit" : "School Command Center",
    welcome: lang === "ar" ? "لوحة تحكم الإدارة" : lang === "sq" ? "Paneli i administrimit" : "Administration dashboard",
    subtitle: lang === "ar" ? "نظرة تنفيذية على المعلمين، الطلاب، الفصول، التقييمات والمجتمع من مكان واحد." : lang === "sq" ? "Pamje ekzekutive për mësuesit, nxënësit, klasat, vlerësimet dhe komunitetin." : "An executive view of teachers, students, classes, assessments and community work.",
    urgent: lang === "ar" ? "الأولويات الآن" : lang === "sq" ? "Prioritetet tani" : "Priorities now",
    ecosystem: lang === "ar" ? "خريطة المنصة" : lang === "sq" ? "Harta e platformës" : "Platform map",
    open: lang === "ar" ? "فتح" : lang === "sq" ? "Hap" : "Open",
    healthy: lang === "ar" ? "مستقر" : lang === "sq" ? "Në rregull" : "Healthy",
    setupNeeded: lang === "ar" ? "يحتاج إعداد" : lang === "sq" ? "Kërkon konfigurim" : "Setup needed",
    pending: lang === "ar" ? "قيد المراجعة" : lang === "sq" ? "Në shqyrtim" : "Pending",
    noUrgent: lang === "ar" ? "لا توجد مهام عاجلة الآن." : lang === "sq" ? "Nuk ka detyra urgjente tani." : "No urgent work right now.",
  };

  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError(false);
    cachedFetch<Stats>("/api/school-admin/stats", 60_000)
      .then((d) => {
        if (d?.school) setStats(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [retryTick]);

  function retry() {
    invalidateCache("/api/school-admin/stats");
    setRetryTick((n) => n + 1);
  }

  const studentStatus = useMemo(() => {
    const rows = stats?.studentsByStatus ?? [];
    const total = Math.max(stats?.studentCount ?? 0, 1);
    return rows.map((row) => ({ ...row, pct: Math.round((row.count / total) * 100) }));
  }, [stats]);

  if (loading) return <MandalaLoader label={tr.loading} />;
  if (error || !stats) {
    return (
      <div className="ad-error-wrap" dir={dir} style={{ padding: 60, textAlign: "center", fontFamily: "'Cairo',sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#7A1E1E", marginBottom: 16 }}>{tr.failedLoad}</div>
        <button
          onClick={retry}
          style={{
            background: "linear-gradient(180deg,#1E2329,#11151A)", color: "#E5B93C",
            border: "none", padding: "10px 26px", borderRadius: 11,
            fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}
        >
          {lang === "ar" ? "إعادة المحاولة" : lang === "sq" ? "Provo përsëri" : "Retry"}
        </button>
      </div>
    );
  }

  const schoolName = lang === "ar" ? stats.school.name : stats.school.name_alt || stats.school.name;
  const kpis = [
    { label: tr.teachers, value: stats.teacherCount, href: "/school-admin/teachers", tone: "gold" },
    { label: tr.students, value: stats.studentCount, href: "/school-admin/students", tone: "blue" },
    { label: tr.classes, value: stats.classCount, href: "/school-admin/classes", tone: "green" },
    { label: tr.awaitingPlacement, value: stats.pendingPlacements, href: "/school-admin/submissions?status=PENDING", tone: stats.pendingPlacements > 0 ? "red" : "gold", hidden: viewOnly },
  ].filter((card) => !card.hidden);

  const priorities = [
    !stats.hasPlacementAssessment
      ? { title: tr.noAssessmentWarning, href: "/school-admin/placement-assessment", tone: "red", action: tr.createNow }
      : null,
    stats.pendingPlacements > 0 && !viewOnly
      ? { title: `${stats.pendingPlacements} ${tr.pendingPlacementsWarning}`, href: "/school-admin/submissions?status=PENDING", tone: "gold", action: tr.reviewNow }
      : null,
  ].filter(Boolean) as { title: string; href: string; tone: string; action: string }[];

  const modules = [
    { title: lang === "ar" ? "المعلمون والتأهيل" : lang === "sq" ? "Mësuesit" : "Teachers", desc: lang === "ar" ? "المعلمون، المجموعات، الطلبات والورش." : lang === "sq" ? "Mësuesit, grupet, aplikimet dhe punëtoritë." : "Teachers, groups, applications and workshops.", href: "/school-admin/teachers", links: [[tr.teachers, "/school-admin/teachers"], [lang === "ar" ? "المجموعات" : "Groups", "/school-admin/teacher-groups"], [lang === "ar" ? "الطلبات" : "Applications", "/school-admin/applications"], [lang === "ar" ? "الورش" : "Workshops", "/school-admin/workshops"]] },
    { title: lang === "ar" ? "الطلاب والفصول" : lang === "sq" ? "Nxënësit dhe klasat" : "Students and classes", desc: lang === "ar" ? "الطلاب، الفصول، الفرز، والمراجعة التعليمية." : lang === "sq" ? "Nxënësit, klasat, vendosja dhe shqyrtimi." : "Students, classes, placement and learning review.", href: "/school-admin/students", links: [[tr.students, "/school-admin/students"], [tr.classes, "/school-admin/classes"], [tr.submissions, "/school-admin/submissions"], [lang === "ar" ? "المراجعة" : "Review", "/school-admin/review-queue"]] },
    { title: lang === "ar" ? "التقارير والقياس" : lang === "sq" ? "Raporte dhe matje" : "Reports and measurement", desc: lang === "ar" ? "تقارير المدرسة، تقارير المالك، ونتائج النموذج." : lang === "sq" ? "Raportet, raportet e pronarit dhe modeli edukativ." : "School reports, owner reports and model scores.", href: "/school-admin/reports", links: [[tr.reports ?? "Reports", "/school-admin/reports"], [lang === "ar" ? "تقارير المالك" : "Owner Reports", "/school-admin/owner-reports"], [lang === "ar" ? "النموذج" : "Model", "/school-admin/game-scores"]] },
    { title: lang === "ar" ? "المجتمع والتواصل" : lang === "sq" ? "Komuniteti" : "Community", desc: lang === "ar" ? "المجتمع، الإعلانات، الدعوات والتواصل." : lang === "sq" ? "Komuniteti, njoftimet, ftesat dhe komunikimi." : "Community, announcements, invites and communication.", href: "/school-admin/hub", links: [[lang === "ar" ? "المجتمع" : "Community", "/school-admin/hub"], [lang === "ar" ? "الدعوات" : "Invites", "/school-admin/invites"]] },
  ];

  return (
    <div className="ad-page" dir={dir}>
      <section className="ad-hero">
        <div className="ad-hero-copy">
          <span>{labels.eyebrow}</span>
          <h1>{schoolName}</h1>
          <p>{labels.subtitle}</p>
        </div>
        <div className="ad-hero-side">
          <strong>{labels.welcome}</strong>
          <span>{stats.adminName ?? "Admin"}</span>
        </div>
      </section>

      <section className="ad-kpis">
        {kpis.map((card) => (
          <Link key={card.href} href={card.href} className={`ad-kpi ${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <em>{labels.open}</em>
          </Link>
        ))}
      </section>

      <section className="ad-grid">
        <div className="ad-panel ad-priorities">
          <div className="ad-panel-head">
            <h2>{labels.urgent}</h2>
            <span>{priorities.length > 0 ? labels.pending : labels.healthy}</span>
          </div>
          {priorities.length > 0 ? priorities.map((item) => (
            <Link key={item.href} href={item.href} className={`ad-priority ${item.tone}`}>
              <strong>{item.title}</strong>
              <span>{item.action}</span>
            </Link>
          )) : <p className="ad-calm">{labels.noUrgent}</p>}
        </div>

        <div className="ad-panel ad-status">
          <div className="ad-panel-head">
            <h2>{lang === "ar" ? "حالة الطلاب" : lang === "sq" ? "Statusi i nxënësve" : "Student status"}</h2>
            <span>{stats.studentCount}</span>
          </div>
          {studentStatus.length > 0 ? studentStatus.map((row) => (
            <div key={row.status} className="ad-status-row">
              <div><strong>{row.status.replaceAll("_", " ")}</strong><span>{row.count}</span></div>
              <div className="ad-track"><i style={{ width: `${row.pct}%` }} /></div>
            </div>
          )) : <p className="ad-calm">{lang === "ar" ? "لا توجد بيانات حالة بعد." : "No status data yet."}</p>}
        </div>
      </section>

      <section className="ad-modules">
        <div className="ad-section-title"><h2>{labels.ecosystem}</h2></div>
        <div className="ad-module-grid">
          {modules.map((module) => (
            <article key={module.title} className="ad-module">
              <h3>{module.title}</h3>
              <p>{module.desc}</p>
              <div>
                {module.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .ad-page{font-family:'Cairo',sans-serif;display:flex;flex-direction:column;gap:18px;color:#0B0B0C;animation:rise .35s ease both}
  .ad-error{padding:40px;text-align:center;color:#8A7B60;font-family:'Cairo',sans-serif}
  .ad-hero{position:relative;overflow:hidden;border-radius:28px;padding:30px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:22px;align-items:end;background:radial-gradient(circle at 12% 12%,rgba(229,185,60,.22),transparent 30%),linear-gradient(135deg,#08111B,#0B0B0C 62%,#1A160E);border:1px solid rgba(200,169,106,.24);box-shadow:0 18px 50px rgba(8,11,12,.14)}
  .ad-hero:after{content:"";position:absolute;inset-inline-end:-120px;top:-140px;width:360px;height:360px;border-radius:999px;border:1px solid rgba(200,169,106,.16);box-shadow:inset 0 0 80px rgba(200,169,106,.08)}
  .ad-hero-copy,.ad-hero-side{position:relative;z-index:1}.ad-hero-copy span{display:block;color:#D9BC78;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.ad-hero h1{margin:7px 0 8px;color:#fff;font-size:34px;font-weight:900;letter-spacing:-.6px}.ad-hero p{max-width:720px;margin:0;color:rgba(255,255,255,.72);font-size:14px;line-height:1.8}.ad-hero-side{padding:18px;border-radius:20px;background:rgba(255,255,255,.07);border:1px solid rgba(200,169,106,.18);backdrop-filter:blur(10px)}.ad-hero-side strong{display:block;color:#E5B93C;font-size:13px}.ad-hero-side span{display:block;margin-top:6px;color:#fff;font-size:18px;font-weight:900}
  .ad-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.ad-kpi{position:relative;overflow:hidden;min-height:128px;border-radius:22px;padding:18px;background:#FFFDF8;border:1px solid rgba(200,169,106,.18);text-decoration:none;color:#0B0B0C;box-shadow:0 10px 28px rgba(8,11,12,.055);transition:.2s ease}.ad-kpi:hover{transform:translateY(-3px);border-color:rgba(200,169,106,.45);box-shadow:0 16px 34px rgba(8,11,12,.08)}.ad-kpi:before{content:"";position:absolute;inset-inline-end:-34px;bottom:-42px;width:120px;height:120px;border-radius:999px;background:rgba(200,169,106,.12)}.ad-kpi span{display:block;color:#7B6B52;font-size:12px;font-weight:900}.ad-kpi strong{display:block;margin-top:14px;font-size:38px;line-height:1;font-weight:900}.ad-kpi em{position:absolute;bottom:16px;inset-inline-start:18px;color:#A8863E;font-size:11px;font-style:normal;font-weight:900}.ad-kpi.red:before{background:rgba(139,26,26,.10)}.ad-kpi.blue:before{background:rgba(57,101,126,.12)}.ad-kpi.green:before{background:rgba(45,138,74,.10)}
  .ad-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:14px}.ad-panel{border-radius:24px;background:#FFFDF8;border:1px solid rgba(200,169,106,.16);padding:18px;box-shadow:0 10px 28px rgba(8,11,12,.045)}.ad-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.ad-panel-head h2{margin:0;font-size:16px;font-weight:900}.ad-panel-head span{padding:4px 10px;border-radius:999px;background:rgba(200,169,106,.10);color:#8A6523;font-size:11px;font-weight:900}.ad-priority{display:flex;justify-content:space-between;gap:12px;padding:13px 14px;border-radius:16px;text-decoration:none;background:rgba(200,169,106,.08);border:1px solid rgba(200,169,106,.18);color:#4B3511;margin-top:9px}.ad-priority.red{background:rgba(139,26,26,.06);border-color:rgba(139,26,26,.16);color:#8b1a1a}.ad-priority strong{font-size:12.5px}.ad-priority span{font-size:12px;font-weight:900}.ad-calm{margin:0;padding:22px;border-radius:18px;background:rgba(45,138,74,.07);color:#2D744A;font-size:13px;font-weight:900;text-align:center}.ad-status-row{display:flex;flex-direction:column;gap:7px;margin-top:10px}.ad-status-row>div:first-child{display:flex;justify-content:space-between;gap:12px;color:#3D3526;font-size:12px;font-weight:900}.ad-status-row span{color:#8A7B60}.ad-track{height:8px;border-radius:99px;background:#EFE6D4;overflow:hidden}.ad-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#C8A96A,#E5B93C)}
  .ad-modules{display:flex;flex-direction:column;gap:12px}.ad-section-title h2{margin:0;font-size:18px;font-weight:900}.ad-module-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.ad-module{min-height:220px;border-radius:24px;padding:18px;background:linear-gradient(180deg,#FFFDF8,#F8F1E5);border:1px solid rgba(200,169,106,.17);box-shadow:0 10px 28px rgba(8,11,12,.045)}.ad-module h3{margin:0;color:#0B0B0C;font-size:16px;font-weight:900}.ad-module p{margin:8px 0 16px;color:#7D6E55;font-size:12.5px;line-height:1.75;font-weight:700}.ad-module div{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}.ad-module a{display:inline-flex;padding:8px 10px;border-radius:999px;text-decoration:none;background:#0B1118;color:#D9BC78;font-size:11px;font-weight:900;border:1px solid rgba(200,169,106,.18)}
  @media(max-width:1100px){.ad-hero,.ad-grid{grid-template-columns:1fr}.ad-kpis,.ad-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:640px){.ad-page{gap:14px}.ad-hero{padding:22px;border-radius:22px}.ad-hero h1{font-size:26px}.ad-kpis,.ad-module-grid{grid-template-columns:1fr}.ad-kpi{min-height:112px}.ad-grid{gap:12px}.ad-panel,.ad-module{border-radius:20px}}
`;
