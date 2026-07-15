"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityStar from "@/components/IdentityStar";
import IdentityMandala from "@/components/IdentityMandala";
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
    healthy: lang === "ar" ? "مستقر" : lang === "sq" ? "Në rregull" : "Healthy",
    setupNeeded: lang === "ar" ? "يحتاج إعداد" : lang === "sq" ? "Kërkon konfigurim" : "Setup needed",
    pending: lang === "ar" ? "قيد المراجعة" : lang === "sq" ? "Në shqyrtim" : "Pending",
    noUrgent: lang === "ar" ? "لا توجد مهام عاجلة الآن." : lang === "sq" ? "Nuk ka detyra urgjente tani." : "No urgent work right now.",
  };

  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    fetch("/api/school-admin/stats", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load dashboard stats");
        return response.json() as Promise<Stats>;
      })
      .then((d) => {
        if (d?.school) setStats(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [retryTick]);

  function retry() {
    setError(false);
    setLoading(true);
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
        <div className="school-dashboard-hero-star" aria-hidden="true">
          <IdentityMandala size={340} stroke="#D9C9B0" opacity={0.9} spin spinDuration={140} />
        </div>
        <div className="school-dashboard-hero-copy">
          <span>
            <IdentityStar size={12} strokeWidth={5} color="#D9C9B0" />
            {labels.eyebrow}
          </span>
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
            <span className="school-dashboard-kpi-star" aria-hidden="true">
              <IdentityMandala size={140} stroke="#4A0E1C" opacity={0.09} spin spinDuration={110} />
            </span>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
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
        <div className="school-dashboard-section-title">
          <IdentityStar size={16} strokeWidth={4} />
          <h2>{labels.ecosystem}</h2>
        </div>
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
  @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@500;700&family=Cairo:wght@400;600;700;800&display=swap');
  @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .school-dashboard-page{--font-head:'Noto Kufi Arabic','Cairo',sans-serif;font-family:'Cairo',sans-serif;display:flex;flex-direction:column;gap:20px;color:#1A1A1A;animation:rise .35s ease both}
  .school-dashboard-error{padding:40px;text-align:center;color:#796A62;font-family:'Cairo',sans-serif}

  /* ── Hero — identity dark mode: deep burgundy + thin gold linework ── */
  .school-dashboard-hero{position:relative;overflow:hidden;border-radius:26px;padding:32px 34px;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:22px;align-items:end;background:radial-gradient(circle at 85% -30%,rgba(184,160,130,.22),transparent 44%),radial-gradient(circle at 10% 120%,rgba(107,30,45,.55),transparent 46%),linear-gradient(140deg,#32101A 0%,#4A0E1C 55%,#5B1526 100%);border:1px solid rgba(184,160,130,.38);box-shadow:0 24px 60px rgba(50,16,26,.25),inset 0 1px 0 rgba(217,201,176,.12)}
  .school-dashboard-hero:before{content:"";position:absolute;top:0;inset-inline:30px;height:1.5px;background:linear-gradient(90deg,transparent,rgba(217,201,176,.55) 30%,rgba(217,201,176,.55) 70%,transparent)}
  .school-dashboard-hero-star{position:absolute;inset-inline-end:-85px;top:50%;transform:translateY(-50%);opacity:.14;pointer-events:none}
  .school-dashboard-hero-copy,.school-dashboard-hero-side{position:relative;z-index:1}
  .school-dashboard-hero-copy span{display:inline-flex;align-items:center;gap:8px;color:#D9C9B0;font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
  .school-dashboard-hero h1{margin:10px 0;color:#FFFBF5;font-family:var(--font-head);font-size:30px;font-weight:700;line-height:1.4}
  .school-dashboard-hero p{max-width:720px;margin:0;color:rgba(239,234,224,.72);font-size:13.5px;line-height:1.9;font-weight:400}
  .school-dashboard-hero-side{padding:18px 20px;border-radius:18px;background:rgba(50,16,26,.45);border:1px solid rgba(184,160,130,.30);backdrop-filter:blur(12px);box-shadow:inset 0 1px 0 rgba(217,201,176,.10)}
  .school-dashboard-hero-side strong{display:block;color:#B8A082;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
  .school-dashboard-hero-side span{display:block;margin-top:8px;color:#FFFBF5;font-family:var(--font-head);font-size:17px;font-weight:700}

  /* ── KPI cards — cream, gold top hairline, star watermark ── */
  .school-dashboard-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .school-dashboard-kpi{position:relative;overflow:hidden;min-height:132px;border-radius:20px;padding:20px;background:linear-gradient(180deg,#FFFBF5,#F7F3EB);border:1px solid rgba(184,160,130,.28);text-decoration:none;color:#1A1A1A;box-shadow:0 12px 30px rgba(50,16,26,.05);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
  .school-dashboard-kpi:hover{transform:translateY(-4px);border-color:rgba(184,160,130,.60);box-shadow:0 18px 40px rgba(50,16,26,.10)}
  .school-dashboard-kpi:before{content:"";position:absolute;top:0;inset-inline:18px;height:2px;background:linear-gradient(90deg,transparent,#B8A082,transparent)}
  .school-dashboard-kpi span{display:block;color:#8F765B;font-size:11.5px;font-weight:700;letter-spacing:.06em}
  .school-dashboard-kpi strong{display:block;margin-top:12px;font-family:var(--font-head);font-size:38px;line-height:1.15;font-weight:700;color:#4A0E1C}
  .school-dashboard-kpi-star{position:absolute;inset-inline-end:-26px;bottom:-26px;pointer-events:none}
  .school-dashboard-kpi.alert{border-color:rgba(107,30,45,.35)}
  .school-dashboard-kpi.alert strong{color:#6B1E2D}

  /* ── Panels ── */
  .school-dashboard-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:14px}
  .school-dashboard-panel{border-radius:22px;background:#FFFBF5;border:1px solid rgba(184,160,130,.22);padding:20px;box-shadow:0 12px 30px rgba(50,16,26,.045)}
  .school-dashboard-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(184,160,130,.18)}
  .school-dashboard-panel-head h2{margin:0;font-family:var(--font-head);font-size:15px;font-weight:700}
  .school-dashboard-panel-head span{padding:4px 12px;border-radius:999px;background:rgba(184,160,130,.14);border:1px solid rgba(184,160,130,.25);color:#6B1E2D;font-size:11px;font-weight:700}
  .school-dashboard-priority{display:flex;justify-content:space-between;gap:12px;padding:13px 15px;border-radius:14px;text-decoration:none;background:rgba(184,160,130,.10);border:1px solid rgba(184,160,130,.22);color:#655B53;margin-top:9px;transition:border-color .18s}
  .school-dashboard-priority:hover{border-color:rgba(184,160,130,.5)}
  .school-dashboard-priority.red{background:rgba(107,30,45,.06);border-color:rgba(107,30,45,.20);color:#6B1E2D}
  .school-dashboard-priority strong{font-size:12.5px;font-weight:700}
  .school-dashboard-priority span{font-size:12px;font-weight:700;color:#6B1E2D;white-space:nowrap}
  .school-dashboard-calm{margin:0;padding:22px;border-radius:16px;background:rgba(184,160,130,.10);border:1px dashed rgba(184,160,130,.35);color:#4A0E1C;font-size:13px;font-weight:600;text-align:center}
  .school-dashboard-status-row{display:flex;flex-direction:column;gap:7px;margin-top:11px}
  .school-dashboard-status-row>div:first-child{display:flex;justify-content:space-between;gap:12px;color:#655B53;font-size:12px;font-weight:700}
  .school-dashboard-status-row span{color:#796A62;font-weight:600}
  .school-dashboard-track{height:7px;border-radius:99px;background:#E5E0D5;overflow:hidden}
  .school-dashboard-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6B1E2D,#B8A082)}

  /* ── Platform map — star bullet + fading gold rule ── */
  .school-dashboard-modules{display:flex;flex-direction:column;gap:14px}
  .school-dashboard-section-title{display:flex;align-items:center;gap:10px}
  .school-dashboard-section-title h2{margin:0;font-family:var(--font-head);font-size:17px;font-weight:700}
  .school-dashboard-section-title:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(184,160,130,.5),transparent)}
  .school-dashboard-module-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .school-dashboard-module{display:flex;flex-direction:column;min-height:220px;border-radius:20px;padding:20px;background:linear-gradient(180deg,#FFFBF5,#F7F3EB);border:1px solid rgba(184,160,130,.24);box-shadow:0 12px 30px rgba(50,16,26,.045);transition:transform .22s ease,border-color .22s ease}
  .school-dashboard-module:hover{transform:translateY(-3px);border-color:rgba(184,160,130,.55)}
  .school-dashboard-module h3{margin:0;color:#1A1A1A;font-family:var(--font-head);font-size:14.5px;font-weight:700}
  .school-dashboard-module p{margin:9px 0 16px;color:#796A62;font-size:12.5px;line-height:1.8;font-weight:400}
  .school-dashboard-module div{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}
  .school-dashboard-module a{display:inline-flex;padding:8px 12px;border-radius:999px;text-decoration:none;background:#4A0E1C;color:#D9C9B0;font-size:11px;font-weight:700;border:1px solid rgba(184,160,130,.30);transition:background .18s}
  .school-dashboard-module a:hover{background:#6B1E2D}

  @media(max-width:1100px){.school-dashboard-hero,.school-dashboard-grid{grid-template-columns:1fr}.school-dashboard-kpis,.school-dashboard-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:640px){.school-dashboard-page{gap:14px}.school-dashboard-hero{padding:24px;border-radius:22px}.school-dashboard-hero h1{font-size:23px}.school-dashboard-hero-star{display:none}.school-dashboard-kpis,.school-dashboard-module-grid{grid-template-columns:1fr}.school-dashboard-kpi{min-height:116px}.school-dashboard-grid{gap:12px}.school-dashboard-panel,.school-dashboard-module{border-radius:18px}}
`;
