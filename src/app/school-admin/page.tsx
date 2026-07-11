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
      <div className="school-dashboard-error-wrap" dir={dir} style={{ padding: 60, textAlign: "center", fontFamily: "'Cairo',sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#6B1E2D", marginBottom: 16 }}>{tr.failedLoad}</div>
        <button
          onClick={retry}
          style={{
            background: "linear-gradient(180deg,#5B1526,#32101A)", color: "#B8A082",
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
    { label: tr.teachers, value: stats.teacherCount, href: "/school-admin/teachers", tone: "formal" },
    { label: tr.students, value: stats.studentCount, href: "/school-admin/students", tone: "formal" },
    { label: tr.classes, value: stats.classCount, href: "/school-admin/classes", tone: "formal" },
    { label: tr.awaitingPlacement, value: stats.pendingPlacements, href: "/school-admin/submissions?status=PENDING", tone: stats.pendingPlacements > 0 ? "alert" : "formal", hidden: viewOnly },
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
    <div className="school-dashboard-page" dir={dir}>
      <section className="school-dashboard-hero">
        <div className="school-dashboard-hero-copy">
          <span>{labels.eyebrow}</span>
          <h1>{schoolName}</h1>
          <p>{labels.subtitle}</p>
        </div>
        <div className="school-dashboard-hero-side">
          <strong>{labels.welcome}</strong>
          <span>{stats.adminName ?? "Admin"}</span>
        </div>
      </section>

      <section className="school-dashboard-kpis">
        {kpis.map((card) => (
          <Link key={card.href} href={card.href} className={`school-dashboard-kpi ${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <em>{labels.open}</em>
          </Link>
        ))}
      </section>

      <section className="school-dashboard-grid">
        <div className="school-dashboard-panel school-dashboard-priorities">
          <div className="school-dashboard-panel-head">
            <h2>{labels.urgent}</h2>
            <span>{priorities.length > 0 ? labels.pending : labels.healthy}</span>
          </div>
          {priorities.length > 0 ? priorities.map((item) => (
            <Link key={item.href} href={item.href} className={`school-dashboard-priority ${item.tone}`}>
              <strong>{item.title}</strong>
              <span>{item.action}</span>
            </Link>
          )) : <p className="school-dashboard-calm">{labels.noUrgent}</p>}
        </div>

        <div className="school-dashboard-panel school-dashboard-status">
          <div className="school-dashboard-panel-head">
            <h2>{lang === "ar" ? "حالة الطلاب" : lang === "sq" ? "Statusi i nxënësve" : "Student status"}</h2>
            <span>{stats.studentCount}</span>
          </div>
          {studentStatus.length > 0 ? studentStatus.map((row) => (
            <div key={row.status} className="school-dashboard-status-row">
              <div><strong>{row.status.replaceAll("_", " ")}</strong><span>{row.count}</span></div>
              <div className="school-dashboard-track"><i style={{ width: `${row.pct}%` }} /></div>
            </div>
          )) : <p className="school-dashboard-calm">{lang === "ar" ? "لا توجد بيانات حالة بعد." : "No status data yet."}</p>}
        </div>
      </section>

      <section className="school-dashboard-modules" data-testid="platform-map">
        <div className="school-dashboard-section-title"><h2>{labels.ecosystem}</h2></div>
        <div className="school-dashboard-module-grid" data-testid="platform-map-grid">
          {modules.map((module) => (
            <article key={module.title} className="school-dashboard-module">
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
  .school-dashboard-page{font-family:'Cairo',sans-serif;display:flex;flex-direction:column;gap:18px;color:#1A1A1A;animation:rise .35s ease both}
  .school-dashboard-error{padding:40px;text-align:center;color:#796A62;font-family:'Cairo',sans-serif}
  .school-dashboard-hero{position:relative;overflow:hidden;border-radius:28px;padding:30px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:22px;align-items:end;background:radial-gradient(circle at 12% 12%,rgba(184,160,130,.22),transparent 30%),linear-gradient(135deg,#08111B,#1A1A1A 62%,#1A160E);border:1px solid rgba(184,160,130,.24);box-shadow:0 18px 50px rgba(26,26,26,.14)}
  .school-dashboard-hero:after{content:"";position:absolute;inset-inline-end:-120px;top:-140px;width:360px;height:360px;border-radius:999px;border:1px solid rgba(184,160,130,.16);box-shadow:inset 0 0 80px rgba(184,160,130,.08)}
  .school-dashboard-hero-copy,.school-dashboard-hero-side{position:relative;z-index:1}.school-dashboard-hero-copy span{display:block;color:#D9C9B0;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.school-dashboard-hero h1{margin:7px 0 8px;color:#fff;font-size:34px;font-weight:900;letter-spacing:-.6px}.school-dashboard-hero p{max-width:720px;margin:0;color:rgba(255,255,255,.72);font-size:14px;line-height:1.8}.school-dashboard-hero-side{padding:18px;border-radius:20px;background:rgba(255,255,255,.07);border:1px solid rgba(184,160,130,.18);backdrop-filter:blur(10px)}.school-dashboard-hero-side strong{display:block;color:#B8A082;font-size:13px}.school-dashboard-hero-side span{display:block;margin-top:6px;color:#fff;font-size:18px;font-weight:900}
  .school-dashboard-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.school-dashboard-kpi{position:relative;overflow:hidden;min-height:128px;border-radius:22px;padding:18px;background:linear-gradient(180deg,#FBF8F1,#F1EBDD);border:1px solid rgba(184,160,130,.26);text-decoration:none;color:#1A1A1A;box-shadow:0 10px 28px rgba(74,14,28,.045);transition:.2s ease}.school-dashboard-kpi:hover{transform:translateY(-3px);border-color:rgba(107,30,45,.25);box-shadow:0 16px 34px rgba(74,14,28,.08)}.school-dashboard-kpi:before{content:"";position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,#6B1E2D,#B8A082)}.school-dashboard-kpi span{display:block;color:#7B6B52;font-size:12px;font-weight:900}.school-dashboard-kpi strong{display:block;margin-top:14px;font-size:38px;line-height:1;font-weight:900}.school-dashboard-kpi em{position:absolute;bottom:16px;inset-inline-start:18px;color:#6B1E2D;font-size:11px;font-style:normal;font-weight:900}.school-dashboard-kpi.alert:before{background:#6B1E2D}
  .school-dashboard-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:14px}.school-dashboard-panel{border-radius:24px;background:#FFFBF5;border:1px solid rgba(184,160,130,.16);padding:18px;box-shadow:0 10px 28px rgba(26,26,26,.045)}.school-dashboard-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.school-dashboard-panel-head h2{margin:0;font-size:16px;font-weight:900}.school-dashboard-panel-head span{padding:4px 10px;border-radius:999px;background:rgba(184,160,130,.14);color:#6B1E2D;font-size:11px;font-weight:900}.school-dashboard-priority{display:flex;justify-content:space-between;gap:12px;padding:13px 14px;border-radius:16px;text-decoration:none;background:rgba(184,160,130,.10);border:1px solid rgba(184,160,130,.20);color:#4B3511;margin-top:9px}.school-dashboard-priority.red{background:rgba(107,30,45,.06);border-color:rgba(107,30,45,.18);color:#6B1E2D}.school-dashboard-priority strong{font-size:12.5px}.school-dashboard-priority span{font-size:12px;font-weight:900}.school-dashboard-calm{margin:0;padding:22px;border-radius:18px;background:rgba(184,160,130,.10);color:#4A0E1C;font-size:13px;font-weight:900;text-align:center}.school-dashboard-status-row{display:flex;flex-direction:column;gap:7px;margin-top:10px}.school-dashboard-status-row>div:first-child{display:flex;justify-content:space-between;gap:12px;color:#3D3526;font-size:12px;font-weight:900}.school-dashboard-status-row span{color:#796A62}.school-dashboard-track{height:8px;border-radius:99px;background:#EFE6D4;overflow:hidden}.school-dashboard-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6B1E2D,#B8A082)}
  .school-dashboard-modules{display:flex;flex-direction:column;gap:12px}.school-dashboard-section-title h2{margin:0;font-size:18px;font-weight:900}.school-dashboard-module-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.school-dashboard-module{min-height:220px;border-radius:24px;padding:18px;background:linear-gradient(180deg,#FFFBF5,#F8F1E5);border:1px solid rgba(184,160,130,.17);box-shadow:0 10px 28px rgba(26,26,26,.045)}.school-dashboard-module h3{margin:0;color:#1A1A1A;font-size:16px;font-weight:900}.school-dashboard-module p{margin:8px 0 16px;color:#7D6E55;font-size:12.5px;line-height:1.75;font-weight:700}.school-dashboard-module div{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}.school-dashboard-module a{display:inline-flex;padding:8px 10px;border-radius:999px;text-decoration:none;background:#0B1118;color:#D9C9B0;font-size:11px;font-weight:900;border:1px solid rgba(184,160,130,.18)}
  @media(max-width:1100px){.school-dashboard-hero,.school-dashboard-grid{grid-template-columns:1fr}.school-dashboard-kpis,.school-dashboard-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:640px){.school-dashboard-page{gap:14px}.school-dashboard-hero{padding:22px;border-radius:22px}.school-dashboard-hero h1{font-size:26px}.school-dashboard-kpis,.school-dashboard-module-grid{grid-template-columns:1fr}.school-dashboard-kpi{min-height:112px}.school-dashboard-grid{gap:12px}.school-dashboard-panel,.school-dashboard-module{border-radius:20px}}
`;
