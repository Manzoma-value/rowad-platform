/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";
import LangToggle from "@/lib/LangToggle";
import { t } from "@/lib/translations";
import Image from "next/image";
import { cachedFetch, clearCache } from "@/lib/api-cache";
import { ViewOnlyProvider } from "@/lib/view-only-context";
import { enforceTenantSubdomain } from "@/lib/enforce-subdomain";
import { TenantProvider, useTenant } from "@/lib/tenant-context";
import { featureForPath, type FeatureKey } from "@/lib/features";
import IdentityBackdrop from "@/components/IdentityBackdrop";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  QrCode,
  FileStack,
  MapPin,
  BarChart3,
  Mail,
  LayoutGrid,
  Gamepad2,
  Globe2,
  Menu,
  LogOut,
  Bell,
  Sparkles,
  FileText,
  X,
  LucideIcon,
} from "lucide-react";

/* ─── Inline SVG decorations ─── */

const r2 = (n: number) => Math.round(n * 1000) / 1000;

const STAR_LINES = Array.from({ length: 12 }, (_, i) => {
  const a1 = (i * 30 * Math.PI) / 180;
  const a2 = ((i * 30 + 15) * Math.PI) / 180;
  return {
    x1: r2(100 + 80 * Math.sin(a1)), y1: r2(100 - 80 * Math.cos(a1)),
    x2: r2(100 + 40 * Math.sin(a2)), y2: r2(100 - 40 * Math.cos(a2)),
  };
});
const PETAL_CIRCLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return { cx: r2(100 + 52 * Math.sin(a)), cy: r2(100 - 52 * Math.cos(a)) };
});
const INNER_PETALS = Array.from({ length: 4 }, (_, i) => {
  const a = (i * 90 * Math.PI) / 180;
  return { cx: r2(100 + 24 * Math.sin(a)), cy: r2(100 - 24 * Math.cos(a)) };
});

function Mandala({ size = 160, stroke = "rgba(184,160,130,0.32)", className = "" }: {
  size?: number; stroke?: string; className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      <circle cx="100" cy="100" r="92" stroke={stroke} strokeWidth="0.4" opacity="0.55" />
      <circle cx="100" cy="100" r="80" stroke={stroke} strokeWidth="0.35" opacity="0.45" />
      {PETAL_CIRCLES.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="52" stroke={stroke} strokeWidth="0.55" opacity="0.45" fill="none" />
      ))}
      <circle cx="100" cy="100" r="70" stroke={stroke} strokeWidth="0.45" opacity="0.55" strokeDasharray="2 7" />
      <circle cx="100" cy="100" r="58" stroke={stroke} strokeWidth="0.4" opacity="0.40" />
      <circle cx="100" cy="100" r="46" stroke={stroke} strokeWidth="0.45" opacity="0.55" strokeDasharray="4 5" />
      <circle cx="100" cy="100" r="34" stroke={stroke} strokeWidth="0.35" opacity="0.45" />
      <circle cx="100" cy="100" r="24" stroke={stroke} strokeWidth="0.45" opacity="0.60" strokeDasharray="3 4" />
      <circle cx="100" cy="100" r="14" stroke={stroke} strokeWidth="0.35" opacity="0.55" />
      <circle cx="100" cy="100" r="7" stroke={stroke} strokeWidth="0.55" opacity="0.70" />
      {STAR_LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={stroke} strokeWidth="0.40" opacity="0.50" />
      ))}
      {INNER_PETALS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="24" stroke={stroke} strokeWidth="0.40" opacity="0.50" fill="none" />
      ))}
      <line x1="100" y1="68" x2="100" y2="132" stroke={stroke} strokeWidth="0.55" opacity="0.60" />
      <line x1="72" y1="84" x2="128" y2="116" stroke={stroke} strokeWidth="0.55" opacity="0.60" />
      <line x1="128" y1="84" x2="72" y2="116" stroke={stroke} strokeWidth="0.55" opacity="0.60" />
      <circle cx="100" cy="100" r="5" fill="none" stroke={stroke} strokeWidth="0.70" opacity="0.80" />
      <circle cx="100" cy="100" r="2.5" fill="none" stroke={stroke} strokeWidth="0.50" opacity="0.85" />
      <circle cx="100" cy="100" r="1.2" fill={stroke} opacity="0.90" />
    </svg>
  );
}

function GeoMark({ size = 22, color = "var(--sa-gold)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9.5" stroke={color} strokeWidth="0.7" opacity="0.65" />
      <circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth="0.6" opacity="0.55" />
      <circle cx="11" cy="11" r="3.2" stroke={color} strokeWidth="0.55" opacity="0.65" />
      <line x1="11" y1="1" x2="11" y2="21" stroke={color} strokeWidth="0.45" opacity="0.40" />
      <line x1="1" y1="11" x2="21" y2="11" stroke={color} strokeWidth="0.45" opacity="0.40" />
      <line x1="3.7" y1="3.7" x2="18.3" y2="18.3" stroke={color} strokeWidth="0.35" opacity="0.28" />
      <line x1="18.3" y1="3.7" x2="3.7" y2="18.3" stroke={color} strokeWidth="0.35" opacity="0.28" />
    </svg>
  );
}

/* ─── Nav ─── */
interface NavItem {
  href: string;
  label: string;
  sublabel: string;
  exact: boolean;
  icon: LucideIcon;
  group?: "teachers" | "learning" | "reports" | "operations";
  /** When set, the item is hidden unless the school has this feature enabled. */
  feature?: FeatureKey;
  /** When true, the item is hidden for view-only (investor demo) accounts. */
  hideForViewOnly?: boolean;
}

const COMMUNITY_HREF = "/school-admin/hub";

/* ─── Layout (thin wrapper that provides tenant context) ─── */
export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <SchoolAdminLayoutInner>{children}</SchoolAdminLayoutInner>
    </TenantProvider>
  );
}

function SchoolAdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const tr = t[lang];
  const isRtl = lang === "ar";

  const [name, setName] = useState("");
  const [initials, setInitials] = useState("م");
  const [schoolName, setSchoolName] = useState("");
  const [schoolNameAlt, setSchoolNameAlt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Always show the language toggle — both options remain visible.
  const [showToggle] = useState(true);
  const [deactivated, setDeactivated] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [schoolLang, setSchoolLang] = useState<"ar" | "sq" | "en">("sq");
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({
    teachers: false,
    learning: false,
    reports: false,
    operations: false,
  });
  const schoolSlugRef = useRef<string>("");

  const navItems: NavItem[] = [
    {
      href: "/school-admin", sublabel: "Dashboard", exact: true, icon: LayoutDashboard,
      label: lang === "ar" ? "الرئيسية" : lang === "sq" ? "Kryesore" : "Dashboard",
    },
    {
      href: "/school-admin/students", sublabel: "Students", exact: false, icon: Users,
      label: tr.students,
      group: "learning",
    },
    {
      href: "/school-admin/teachers", sublabel: "Teachers", exact: false, icon: GraduationCap,
      label: tr.teachers,
      group: "teachers",
    },
    {
      href: "/school-admin/teacher-groups", sublabel: "Teacher Groups", exact: false, icon: Users,
      label: lang === "ar" ? "مجموعات المعلمين" : lang === "sq" ? "Grupet e mësuesve" : "Teacher Groups",
      hideForViewOnly: true,
      group: "teachers",
    },
    {
      href: "/school-admin/workshops", sublabel: "Workshops", exact: false, icon: QrCode,
      label: lang === "ar" ? "الورش التدريبية" : lang === "sq" ? "Punëtoritë" : "Workshops",
      group: "operations",
    },
    {
      href: "/school-admin/classes", sublabel: "Classes", exact: false, icon: BookOpen,
      label: tr.classes,
      group: "learning",
    },
    {
      href: "/school-admin/placement-assessment", sublabel: "Assessment", exact: false, icon: ClipboardCheck,
      label: tr.placementAssessment,
      hideForViewOnly: true,
      group: "learning",
    },
    {
      href: "/school-admin/submissions", sublabel: "Submissions", exact: false, icon: FileStack,
      label: tr.submissions,
      hideForViewOnly: true,
      group: "learning",
    },
    {
      href: "/school-admin/applications", sublabel: "Applications", exact: false, icon: LayoutGrid,
      label: lang === "ar" ? "طلبات المعلمين" : lang === "sq" ? "Aplikimet e mësuesve" : "Teacher Applications",
      hideForViewOnly: true,
      group: "teachers",
    },
    {
      href: "/school-admin/review-queue", sublabel: "Review queue", exact: false, icon: ClipboardCheck,
      label: lang === "ar" ? "قائمة المراجعة" : lang === "sq" ? "Lista e shqyrtimit" : "Review Queue",
      hideForViewOnly: true,
      group: "learning",
    },
    {
      href: "/school-admin/game-scores", sublabel: "Model game scores", exact: false, icon: Gamepad2,
      label: lang === "ar" ? "النموذج التعليمي" : lang === "sq" ? "Modeli Edukativ" : "Educational Model",
      group: "learning",
    },
    {
      href: "/school-admin/owner-reports", sublabel: "Owner Reports", exact: false, icon: FileText,
      label: lang === "ar" ? "تقارير المالك" : lang === "sq" ? "Raportet e pronarit" : "Owner Reports",
      group: "reports",
    },
    {
      href: "/school-admin/roadmap", sublabel: "Roadmap", exact: false, icon: MapPin,
      label: lang === "ar" ? "الخريطة" : lang === "sq" ? "Rruga e Pyetjeve" : "Roadmap",
      feature: "roadmap",
      group: "learning",
    },
    {
      href: "/school-admin/reports", sublabel: "Reports", exact: false, icon: BarChart3,
      label: lang === "ar" ? "التقارير" : lang === "sq" ? "Raportet" : "Reports",
      feature: "reports",
      group: "reports",
    },
    {
      href: "/school-admin/invites", sublabel: "Invites", exact: false, icon: Mail,
      label: lang === "ar" ? "الدعوات" : lang === "sq" ? "Ftesa" : "Invites",
      hideForViewOnly: true,
      group: "operations",
    },
  ];

  // ── Tenant feature flags ──
  const { hasFeature, loading: tenantLoading } = useTenant();
  const visibleNav = navItems.filter((i) => {
    if (i.feature && !hasFeature(i.feature)) return false;
    if (viewOnly && i.hideForViewOnly) return false;
    return true;
  });
  const showCommunity = hasFeature("hub");

  // Route guard: bounce away from a module the school disabled.
  useEffect(() => {
    if (tenantLoading) return;
    const feat = featureForPath(pathname) as FeatureKey | null;
    if (feat && !hasFeature(feat)) router.replace("/school-admin");
  }, [pathname, tenantLoading, hasFeature, router]);

  useEffect(() => {
    // All three layout fetches in parallel + cached so navigation is instant.
    // /me — 10 min TTL (activation rarely changes in a session)
    // /stats — 60s TTL (the dashboard sometimes refreshes counts)
    // /profile — 10 min TTL (avatar doesn't change between page views)
    cachedFetch<{ status?: string; is_view_only?: boolean }>("/api/school-admin/me", 600_000)
      .then((d) => {
        if (d?.status === "deactivated") setDeactivated(true);
        if (d?.is_view_only) setViewOnly(true);
      })
      .catch(() => {});

    cachedFetch<any>("/api/school-admin/stats", 60_000)
      .then((d) => {
        if (d?.error === "school_deactivated" && d?.school?.slug) {
          window.location.href = `/schools/${d.school.slug}`;
          return;
        }
        if (d?.school) {
          setSchoolName(d.school.name ?? "");
          setSchoolNameAlt(d.school.name_alt ?? null);
          if (d.school?.slug) {
            schoolSlugRef.current = d.school.slug;
            enforceTenantSubdomain(d.school.slug);
          }
          // Inherit the school's default language so the admin sees the
          // same locale teachers + students see (AR for ar-schools, SQ for
          // albanian-schools). Stored choice in localStorage wins.
          if (d.school.language) {
            const savedLang = localStorage.getItem("lang");
            const sl = d.school.language;
            if (sl === "ar" || sl === "sq" || sl === "en") {
              setSchoolLang(sl);
              if (!savedLang) setLang(sl);
            }
          }
        }
        if (d?.adminName) {
          setName(d.adminName);
          setInitials(d.adminName.split(" ").map((w: string) => w[0]).slice(0, 2).join(""));
        }
      })
      .catch(() => {});

    cachedFetch<{ profile?: { avatar_url?: string } }>("/api/profile", 600_000)
      .then((d) => { if (d?.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {});
  }, []);

  // ── Defence-in-depth: when this is a view-only session, monkey-patch
  //    window.fetch so any non-GET request to /api/school-admin/* is
  //    intercepted before it leaves the browser. The server already refuses
  //    these, but blocking client-side means a stray button click never
  //    even hits the wire.
  useEffect(() => {
    if (!viewOnly) return;
    const realFetch = window.fetch.bind(window);
    const isWriteAdminCall = (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      try {
        const u = new URL(url, window.location.origin);
        return u.pathname.startsWith("/api/school-admin/");
      } catch { return false; }
    };
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (isWriteAdminCall(input, init)) {
        console.warn("[view-only] blocked write call to", input);
        showViewOnlyToast();
        return Promise.resolve(new Response(
          JSON.stringify({ error: "view_only", message: "This demo account is read-only." }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ));
      }
      return realFetch(input, init);
    };

    // Tiny one-off toast injector — appended to <body>, fades after 2.4s.
    function showViewOnlyToast() {
      const id = "sa-view-only-toast";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.cssText = `
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(165deg,#5B1526,#32101A); color:#B8A082;
          padding: 12px 22px; border-radius: 12px;
          font-family: 'Cairo','Tajawal',sans-serif; font-size: 13.5px; font-weight: 800;
          box-shadow: 0 10px 30px rgba(0,0,0,.35);
          border:1px solid rgba(184,160,130,0.5); z-index: 9999;
          opacity: 0; transition: opacity 0.18s ease;
          max-width: 92vw; text-align: center;
        `;
        document.body.appendChild(el);
      }
      el.textContent = lang === "ar"
        ? "هذا حساب للعرض فقط — لا يمكن تنفيذ هذا الإجراء."
        : lang === "sq"
          ? "Llogari vetëm për shikim — ky veprim është i çaktivizuar."
          : "View-only account — this action is disabled.";
      // force reflow + fade in/out
      requestAnimationFrame(() => { if (el) el.style.opacity = "1"; });
      window.clearTimeout((el as HTMLElement & { _t?: number })._t);
      (el as HTMLElement & { _t?: number })._t = window.setTimeout(() => {
        if (el) el.style.opacity = "0";
      }, 2400);
    }

    return () => {
      window.fetch = realFetch;
      const toast = document.getElementById("sa-view-only-toast");
      if (toast) toast.remove();
    };
  }, [viewOnly, lang]);

  async function handleLogout() {
    setLoggingOut(true);
    clearCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    const slug = schoolSlugRef.current;
    window.location.href = slug ? `/schools/${slug}` : "/login";
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const currentLabel = (() => {
    if (isActive(COMMUNITY_HREF, false))
      return lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community";
    const found = navItems.find((item) => isActive(item.href, item.exact));
    return found?.label ?? (lang === "ar" ? "الصفحة" : "Faqja");
  })();

  const navGroups = [
    {
      key: "teachers",
      label: lang === "ar" ? "المعلمون" : lang === "sq" ? "Mësuesit" : "Teachers",
      sublabel: "Teachers",
    },
    {
      key: "learning",
      label: lang === "ar" ? "التعلم والفصول" : lang === "sq" ? "Mësimi" : "Learning",
      sublabel: "Classes",
    },
    {
      key: "reports",
      label: lang === "ar" ? "التقارير والقياس" : lang === "sq" ? "Raportet" : "Reports",
      sublabel: "Reports",
    },
    {
      key: "operations",
      label: lang === "ar" ? "الإدارة" : lang === "sq" ? "Administrimi" : "Operations",
      sublabel: "Admin",
    },
  ] as const;

  const renderNavItem = (item: NavItem, child = false) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`sa-nav-item ${child ? "sa-nav-child" : ""} ${active ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      >
        {active && (
          <>
            <span className="sa-nav-pill" />
            <span className="sa-nav-shimmer" />
          </>
        )}
        <span className="sa-nav-icon-wrap">
          <Icon size={17} strokeWidth={1.6} />
        </span>
        <span className="sa-nav-labels">
          <span className="sa-nav-label-main">{item.label}</span>
          <span className="sa-nav-label-sub">{item.sublabel}</span>
        </span>
        {active && <span className="sa-nav-dot" />}
      </Link>
    );
  };

  // ── Deactivated wall — replaces the entire UI ─────────────────────────────
  if (deactivated) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 20, textAlign: "center", padding: 32,
        fontFamily: "'Cairo', sans-serif", direction: "rtl",
        background: "radial-gradient(ellipse at 50% 0%, rgba(184,160,130,0.07), transparent 60%), #EFEAE0",
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#B8A082" strokeWidth={1.2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1A1A1A", margin: 0 }}>
          {lang === "ar" ? "تم تعطيل حسابك" : "Llogaria juaj është çaktivizuar"}
        </h1>
        <p style={{ fontSize: 14, color: "#8C8274", maxWidth: 380, lineHeight: 1.7, margin: 0 }}>
          {lang === "ar"
            ? "تم تعطيل حساب المدير الخاص بك من قِبل المالك. تواصل مع مالك النظام لإعادة التفعيل."
            : "Llogaria juaj e administratorit është çaktivizuar nga pronari. Kontaktoni pronarin e sistemit për riaktivizim."}
        </p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 8, padding: "10px 28px", borderRadius: 10,
            background: "#1A1A1A", color: "#B8A082", border: "1px solid rgba(184,160,130,0.3)",
            fontFamily: "'Cairo', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {lang === "ar" ? "تسجيل الخروج" : "Dalje"}
        </button>
      </div>
    );
  }

  return (
    <div className={`sa-shell${viewOnly ? " sa-shell--view-only" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Identity artwork watermark behind everything — hidden on the
          community/hub page (its chat-style feed keeps a clean surface). */}
      {pathname !== "/school-admin/hub" && <IdentityBackdrop />}

      {sidebarOpen && (
        <div className="sa-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={`sa-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sa-sidebar-glow" aria-hidden="true" />

        {/* Logo */}
        <div className="sa-logo-block">
          <Image
            src="/ahlia.png"
            alt="بناء الأهلية"
            fill
            style={{ objectFit: "contain", objectPosition: "center" }}
            priority
          />
          <div className="sa-logo-frame" aria-hidden="true" />
          <button
            className="sa-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Gold rule */}
        <div className="sa-gold-rule" aria-hidden="true">
          <div className="sa-rule-line" />
          <div className="sa-rule-diamond" />
          <div className="sa-rule-dash" />
          <div className="sa-rule-diamond" />
          <div className="sa-rule-line" />
        </div>

        {/* Section label */}
        <div className="sa-section-label">
          {lang === "ar" ? "القوائم الرئيسية · Main" : lang === "sq" ? "Menuja Kryesore · Main" : "Main Menu"}
        </div>

        {showToggle && (
          <div style={{ padding: "0 14px 10px" }}>
            {/* Admin pages are always AR + EN (not the school's display language) */}
            <LangToggle dark secondaryLang={schoolLang === "ar" ? "sq" : schoolLang} />
          </div>
        )}

        {/* Nav */}
        <nav className="sa-nav">
          {visibleNav.filter((item) => !item.group).map((item) => renderNavItem(item))}

          {navGroups.map((group) => {
            const items = visibleNav.filter((item) => item.group === group.key);
            if (items.length === 0) return null;
            const isOpen = openNavGroups[group.key] ?? true;
            const hasActive = items.some((item) => isActive(item.href, item.exact));
            return (
              <div key={group.key} className={`sa-nav-group ${hasActive ? "active" : ""}`}>
                <button
                  type="button"
                  className="sa-nav-group-head"
                  onClick={() =>
                    setOpenNavGroups((prev) => ({ ...prev, [group.key]: !(prev[group.key] ?? true) }))
                  }
                >
                  <span>
                    <span className="sa-nav-group-title">{group.label}</span>
                    <span className="sa-nav-group-sub">{group.sublabel}</span>
                  </span>
                  <span className={`sa-nav-group-chev ${isOpen ? "open" : ""}`}>⌄</span>
                </button>
                {isOpen && <div className="sa-nav-group-items">{items.map((item) => renderNavItem(item, true))}</div>}
              </div>
            );
          })}

          {/* Community — visually separated, gated by the hub feature */}
          {showCommunity && (
            <>
              <div className="sa-nav-sep" aria-hidden="true" />
              {(() => {
                const active = isActive(COMMUNITY_HREF, false);
                return (
                  <Link
                    href={COMMUNITY_HREF}
                    className={`sa-nav-item sa-nav-community ${active ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {active && (
                      <>
                        <span className="sa-nav-pill" />
                        <span className="sa-nav-shimmer" />
                      </>
                    )}
                    <span className="sa-nav-icon-wrap">
                      <Globe2 size={17} strokeWidth={1.6} />
                    </span>
                    <span className="sa-nav-labels">
                      <span className="sa-nav-label-main">
                        {lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community"}
                      </span>
                      <span className="sa-nav-label-sub">Community</span>
                    </span>
                    {active && <span className="sa-nav-dot" />}
                  </Link>
                );
              })()}
            </>
          )}

          <div className="sa-mandala-wrap" aria-hidden="true">
            <Mandala size={172} stroke="rgba(184,160,130,0.32)" />
          </div>
        </nav>

        {/* Footer rule */}
        <div className="sa-gold-rule sa-gold-rule--footer" aria-hidden="true">
          <div className="sa-rule-line" />
          <div className="sa-rule-diamond" />
          <div className="sa-rule-line" />
        </div>

        {/* User block */}
        <div className="sa-user-block">
          <div className="sa-user">
            <Link
              href="/school-admin/profile"
              className="sa-user-clickable"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="sa-user-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={40}
                    height={40}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                  />
                ) : (
                  <span className="sa-user-initial">{initials}</span>
                )}
              </div>
              <div className="sa-user-info">
                <span className="sa-user-name">
                  {name || (lang === "ar" ? "المدير" : "Drejtori")}
                </span>
                <span className="sa-user-role">
                  {lang === "ar" ? "مدير الجهة" : lang === "sq" ? "Drejtori" : "Admin"}
                </span>
              </div>
            </Link>
            <button
              className="sa-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title={lang === "ar" ? "تسجيل الخروج" : "Dalje"}
              type="button"
            >
              {loggingOut ? <div className="sa-spin" /> : <LogOut size={15} strokeWidth={1.7} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <div className="sa-main" dir={isRtl ? "rtl" : "ltr"}>
        {/* Topbar */}
        <header className="sa-topbar">
          <div className="sa-topbar-accent" aria-hidden="true" />
          <button
            type="button"
            className="sa-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={20} strokeWidth={1.7} />
          </button>

          <div className="sa-breadcrumb-wrap">
            <div className="sa-breadcrumb-geo">
              <GeoMark size={18} color="var(--sa-gold-deep)" />
            </div>
            <div className="sa-breadcrumb">
              <span className="sa-bc-cur">{currentLabel}</span>
            </div>
          </div>

          <div className="sa-topbar-spacer" />

          <div className="sa-topbar-actions">
            <div className="sa-topbar-divider" />
            <button type="button" className="sa-bell-btn" aria-label="الإشعارات">
              <Bell size={15} strokeWidth={1.7} />
            </button>
            <div className="sa-topbar-user-pill">
              <div className="sa-topbar-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={28}
                    height={28}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  <span className="sa-topbar-initial">{initials}</span>
                )}
              </div>
              <div className="sa-topbar-id">
                <span className="sa-topbar-name">{name || (lang === "ar" ? "المدير" : "Admin")}</span>
                {(schoolName || schoolNameAlt) && (
                  <span className="sa-topbar-sub">
                    {lang === "ar"
                      ? `مدير في ${schoolName || schoolNameAlt}`
                      : `Admin of ${schoolNameAlt && schoolNameAlt.trim() ? schoolNameAlt : schoolName}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`sa-content${pathname === "/school-admin/hub" ? " sa-content--hub" : ""}`}>
          <div className="sa-watermark" aria-hidden="true">
            <Mandala size={260} stroke="var(--sa-graphite)" />
          </div>
          <div className="sa-content-inner">
            {viewOnly && (
              <div className="sa-view-only-banner" role="status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                </svg>
                <span className="sa-view-only-text">
                  {lang === "ar"
                    ? "هذا حساب للعرض فقط — يمكنك تصفّح كل صفحات الإدارة، لكن لا يمكن تعديل أو حذف أي بيانات."
                    : lang === "sq"
                      ? "Kjo është një llogari vetëm për shikim — mund të shfletoni çdo faqe administrimi, por nuk mund të modifikoni ose fshini asnjë të dhënë."
                      : "This is a view-only account — you can browse every admin page, but no edits or deletions are allowed."}
                </span>
              </div>
            )}
            <ViewOnlyProvider value={viewOnly}>{children}</ViewOnlyProvider>
          </div>
        </main>

        {/* Bottom band + footer — hidden on the community page so the
            chat-style feed reaches the bottom of the viewport. */}
        {pathname !== "/school-admin/hub" && (
          <>
            <div className="sa-bottom-band" aria-hidden="true">
              <svg viewBox="0 0 1200 80" preserveAspectRatio="none" width="100%" height="100%">
                <line x1="0" y1="40" x2="1200" y2="40" stroke="rgba(184,160,130,0.25)" strokeWidth="0.5" />
                {Array.from({ length: 36 }).map((_, i) => (
                  <circle key={i} cx={(i + 0.5) * (1200 / 36)} cy="40" r="1.2" fill="rgba(184,160,130,0.45)" />
                ))}
                <circle cx="600" cy="40" r="6" fill="none" stroke="rgba(184,160,130,0.55)" strokeWidth="0.7" />
                <circle cx="600" cy="40" r="14" fill="none" stroke="rgba(184,160,130,0.30)" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="sa-footer-caption">
              <Sparkles size={11} className="sa-footer-sparkle" />
              <span className="sa-footer-text">
                {lang === "ar"
                  ? "جميع الحقوق محفوظة © منظومة - 2026"
                  : lang === "sq"
                    ? "Të gjitha të drejtat e rezervuara © Manzoma - 2026"
                    : "All rights reserved © Manzoma - 2026"}
              </span>
            </div>
          </>
        )}
      </div>

      <style>{styles}</style>
      <style>{brandStyles}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════════ */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes sa-fadein  { from { opacity: 0 }               to { opacity: 1 } }
  @keyframes sa-slidein { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes sa-spin    { to { transform: rotate(360deg) } }

  :root {
    --sa-bg-main:        #EFEAE0;
    --sa-bg-soft:        #FBFAF6;
    --sa-bg-card:        #FFFBF5;

    --sa-graphite:       #1A1A1A;
    --sa-graphite-muted: #655B53;
    --sa-graphite-soft:  #8C8274;

    --sa-gold:           #B8A082;
    --sa-gold-deep:      #B8A082;
    --sa-gold-soft:      #D9C9B0;

    --sa-bdr-soft:       rgba(26,26,26,0.07);
    --sa-bdr-med:        rgba(26,26,26,0.11);
    --sa-bdr-gold:       rgba(184,160,130,0.38);

    --sa-sidebar-w:      286px;
    --sa-topbar-h:       68px;

    --sa-font-heading:   'El Messiri', 'Cairo', serif;
    --sa-font-mono:      'IBM Plex Mono', monospace;
    --sa-font:           'Cairo', 'IBM Plex Sans Arabic', sans-serif;

    --sa-ease-out:       cubic-bezier(0.22, 1, 0.36, 1);
  }

  html, body {
    font-family: var(--sa-font);
    background:
      radial-gradient(ellipse at 12% 8%,  rgba(184,160,130,0.07), transparent 30%),
      radial-gradient(ellipse at 88% 85%, rgba(107,30,45,0.04),   transparent 32%),
      var(--sa-bg-main);
    color: var(--sa-graphite);
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: rgba(184,160,130,0.20); }

  /* ══ SHELL ══ */
  .sa-shell { display: flex; min-height: 100vh; width: 100%; }

  /* ══ OVERLAY ══ */
  .sa-overlay {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(26,26,26,0.55);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    animation: sa-fadein 0.22s ease;
  }

  /* ══ SIDEBAR ══ */
  .sa-sidebar {
    position: fixed; top: 0; inset-inline-start: 0;
    width: var(--sa-sidebar-w); height: 100vh;
    z-index: 50; display: flex; flex-direction: column; overflow: hidden;
    border-inline-end: 1px solid rgba(184,160,130,0.14);
    background: linear-gradient(180deg, #5B1526 0%, #4A0E1C 50%, #32101A 100%);
    transition: transform 0.32s var(--sa-ease-out);
    transform: translateX(0);
  }
  @media (max-width: 767px) {
    [dir="rtl"] .sa-sidebar      { transform: translateX(100%); }
    [dir="rtl"] .sa-sidebar.open { transform: translateX(0); box-shadow: -22px 0 60px rgba(26,26,26,0.42); }
    [dir="ltr"] .sa-sidebar      { transform: translateX(-100%); }
    [dir="ltr"] .sa-sidebar.open { transform: translateX(0); box-shadow: 22px 0 60px rgba(26,26,26,0.42); }
  }

  .sa-sidebar-glow {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%,   rgba(184,160,130,0.12), transparent 55%),
      radial-gradient(ellipse at 50% 100%, rgba(107,30,45,0.05),   transparent 44%);
  }

  /* Logo */
  .sa-logo-block {
    position: relative; z-index: 10; flex-shrink: 0;
    width: 100%; height: 86px; overflow: hidden;
    background: #1A1A1A;
    border-top: 1.5px solid rgba(184,160,130,0.55);
    border-bottom: 1px solid rgba(184,160,130,0.20);
    box-shadow: 0 6px 28px rgba(184,160,130,0.07), inset 0 -1px 0 rgba(184,160,130,0.08);
  }
  .sa-logo-frame {
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background:
      linear-gradient(to right, rgba(26,26,26,0.65) 0%, transparent 26%, transparent 74%, rgba(26,26,26,0.65) 100%),
      linear-gradient(to bottom, transparent 50%, rgba(26,26,26,0.72) 100%);
  }
  .sa-close-btn {
    display: none; align-items: center; justify-content: center;
    position: absolute; top: 10px; inset-inline-end: 10px;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(26,26,26,0.55); border: none; cursor: pointer;
    color: rgba(184,160,130,0.70); transition: color 0.15s, background 0.15s;
    z-index: 2;
  }
  .sa-close-btn:hover { color: var(--sa-gold); background: rgba(26,26,26,0.80); }
  @media (max-width: 767px) { .sa-close-btn { display: flex; } }

  /* Gold rule */
  .sa-gold-rule {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 6px;
    margin: 0 20px 14px;
  }
  .sa-gold-rule--footer { margin: 0 20px 12px; }
  .sa-rule-line  { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(184,160,130,0.22), transparent); }
  .sa-rule-diamond { width: 4px; height: 4px; border-radius: 1px; background: rgba(184,160,130,0.50); transform: rotate(45deg); flex-shrink: 0; }
  .sa-rule-dash  { width: 10px; height: 1px; background: rgba(184,160,130,0.38); flex-shrink: 0; }

  /* Section label */
  .sa-section-label {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 0 24px 10px;
    font-family: var(--sa-font-mono); font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(255, 247, 237, 0.45);
  }

  /* Nav */
  .sa-nav {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; gap: 2px;
    padding: 0 12px; flex: 1; overflow-y: auto;
  }
  .sa-nav::-webkit-scrollbar { display: none; }

  .sa-nav-sep {
    height: 1px; margin: 8px 8px;
    background: linear-gradient(90deg, transparent, rgba(184,160,130,0.15), transparent);
  }

  .sa-nav-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 5px 0;
    padding: 6px;
    border: 1px solid rgba(184,160,130,0.08);
    border-radius: 18px;
    background: rgba(255,255,255,0.018);
    flex-shrink: 0;
  }
  .sa-nav-group.active {
    border-color: rgba(184,160,130,0.22);
    background: rgba(184,160,130,0.035);
  }
  .sa-nav-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: rgba(245,229,188,0.88);
    cursor: pointer;
    text-align: start;
    font-family: var(--sa-font);
    transition: background 0.18s var(--sa-ease-out), color 0.18s var(--sa-ease-out);
  }
  .sa-nav-group-head:hover {
    background: rgba(255, 247, 237, 0.055);
    color: #F7EFE3;
  }
  .sa-nav-group-title {
    display: block;
    font-size: 12.5px;
    font-weight: 900;
    line-height: 1.25;
  }
  .sa-nav-group-sub {
    display: block;
    margin-top: 2px;
    font-family: var(--sa-font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,247,237,0.42);
  }
  .sa-nav-group-chev {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 8px;
    border: 1px solid rgba(184,160,130,0.14);
    color: var(--sa-gold-soft);
    transition: transform 0.18s var(--sa-ease-out), background 0.18s var(--sa-ease-out);
  }
  .sa-nav-group-chev.open { transform: rotate(180deg); }
  .sa-nav-group-head:hover .sa-nav-group-chev { background: rgba(184,160,130,0.10); }
  .sa-nav-group-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sa-nav-child {
    min-height: 46px;
    padding: 8px 10px;
    border-radius: 13px;
  }
  .sa-nav-child .sa-nav-icon-wrap {
    width: 30px;
    height: 30px;
    border-radius: 9px;
  }

  .sa-nav-item {
    position: relative; display: flex; align-items: center; gap: 11px;
    padding: 10px 12px; border-radius: 14px;
    text-decoration: none; border: 1px solid transparent;
    color: rgba(255, 247, 237, 0.70);
    transition: all 0.2s var(--sa-ease-out); overflow: hidden;
    /* Never let parent flex pressure collapse the row. With many nav
       items + a short viewport, omitting these caused labels to overlap. */
    flex-shrink: 0;
    min-height: 52px;
  }
  .sa-nav-item:hover {
    background: rgba(255, 247, 237, 0.06);
    color: rgba(255, 248, 230, 0.95);
    border-color: rgba(184,160,130,0.16);
  }
  .sa-nav-item.active {
    background: linear-gradient(180deg, rgba(184,160,130,0.18), rgba(184,160,130,0.08));
    color: #F7EFE3;
    border-color: rgba(184,160,130,0.42);
    box-shadow:
      0 4px 14px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .sa-nav-community { border-color: rgba(184,160,130,0.10); }
  .sa-nav-community:hover { border-color: rgba(184,160,130,0.22); }

  .sa-nav-pill    { position: absolute; inset-inline-end: 0; top: 7px; bottom: 7px; width: 3px; border-radius: 2px; background: linear-gradient(180deg, var(--sa-gold-soft), var(--sa-gold-deep)); }
  .sa-nav-shimmer { position: absolute; top: 0; left: 12px; right: 12px; height: 1px; background: linear-gradient(to left, transparent, rgba(184,160,130,0.55), transparent); }

  .sa-nav-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(255, 247, 237, 0.06);
    border: 1px solid rgba(184,160,130,0.06);
    transition: all 0.18s;
  }
  .sa-nav-item:hover  .sa-nav-icon-wrap {
    background: rgba(255, 247, 237, 0.12);
    border-color: rgba(184,160,130,0.18);
  }
  .sa-nav-item.active .sa-nav-icon-wrap {
    background: linear-gradient(135deg, rgba(184,160,130,0.22), rgba(184,160,130,0.14));
    border-color: rgba(184,160,130,0.40);
  }

  .sa-nav-labels     { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  /* display:block defensively forces a fresh block for each label so
     the two never share a baseline — protects against parent flex
     overrides from compromising vertical stacking. */
  .sa-nav-label-main { display: block; font-size: 13.5px; font-weight: 700; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.01em; }
  .sa-nav-label-sub  { display: block; font-family: var(--sa-font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.6; line-height: 1.2; }
  .sa-nav-dot        { width: 6px; height: 6px; border-radius: 50%; background: var(--sa-gold); box-shadow: 0 0 8px rgba(184,160,130,0.6); flex-shrink: 0; }

  .sa-mandala-wrap { margin-top: auto; display: flex; align-items: center; justify-content: center; padding: 20px 0 10px; opacity: 0.70; }

  /* User block */
  .sa-user-block { position: relative; z-index: 10; flex-shrink: 0; padding: 0 14px 20px; }
  .sa-user {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: 16px;
    background: rgba(255,247,237,0.05);
    border: 1px solid rgba(184,160,130,0.20);
    transition: all 0.2s;
  }
  .sa-user:hover { background: rgba(255,247,237,0.10); border-color: rgba(184,160,130,0.35); }
  .sa-user-av {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--sa-gold-soft), var(--sa-gold-deep));
  }
  .sa-user-initial { font-size: 16px; font-weight: 900; color: var(--sa-graphite); font-family: var(--sa-font-heading); }
  .sa-user-info    { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sa-user-name    { font-size: 13px; font-weight: 700; color: rgba(255,250,235,0.95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sa-user-role    { font-family: var(--sa-font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(184,160,130,0.70); }

  .sa-user-clickable {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
    text-decoration: none; border-radius: 10px; transition: opacity 0.15s;
  }
  .sa-user-clickable:hover { opacity: 0.80; }

  .sa-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(255,247,237,0.04);
    border: 1px solid rgba(184,160,130,0.10);
    cursor: pointer;
    color: rgba(255,247,237,0.65); transition: all 0.18s;
  }
  .sa-logout-btn:hover:not(:disabled) { background: rgba(184,160,130,0.15); color: var(--sa-gold); border-color: rgba(184,160,130,0.32); }
  .sa-logout-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sa-spin { width: 13px; height: 13px; border: 2px solid rgba(184,160,130,0.15); border-top-color: var(--sa-gold); border-radius: 50%; animation: sa-spin 0.7s linear infinite; }

  /* ══ MAIN ══ */
  .sa-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; margin-inline-start: var(--sa-sidebar-w); }
  @media (max-width: 767px) { .sa-main { margin-inline-start: 0; } }

  /* Topbar */
  .sa-topbar {
    position: sticky; top: 0; z-index: 40;
    height: var(--sa-topbar-h); display: flex; align-items: center; gap: 14px;
    padding: 0 20px;
    background: rgba(251,250,246,0.82);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(26,26,26,0.07);
    box-shadow: 0 1px 0 rgba(26,26,26,0.04), 0 6px 24px rgba(26,26,26,0.025);
  }
  @media (min-width: 768px) { .sa-topbar { padding: 0 36px; } }

  .sa-topbar-accent {
    position: absolute; inset-x: 0; top: 0; height: 1.5px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(184,160,130,0.30) 15%, rgba(184,160,130,0.55) 50%, rgba(184,160,130,0.30) 85%, transparent);
  }

  .sa-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px;
    background: none; border: none; cursor: pointer;
    color: var(--sa-graphite-muted); transition: all 0.15s; flex-shrink: 0;
  }
  .sa-hamburger:hover { background: rgba(184,160,130,0.10); color: var(--sa-graphite); }
  @media (min-width: 768px) { .sa-hamburger { display: none; } }

  .sa-breadcrumb-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
  .sa-breadcrumb-geo  {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
    border: 1px solid var(--sa-bdr-soft); background: var(--sa-bg-card); opacity: 0.90;
  }
  @media (min-width: 640px) { .sa-breadcrumb-geo { display: flex; } }
  .sa-breadcrumb { display: flex; align-items: center; gap: 8px; }
  .sa-bc-root { font-size: 12.5px; font-weight: 500; color: var(--sa-graphite-muted); }
  .sa-bc-sep  { color: var(--sa-graphite-muted); opacity: 0.38; flex-shrink: 0; }
  .sa-bc-cur  { font-size: 13.5px; font-weight: 700; color: var(--sa-graphite); }
  .sa-topbar-spacer { flex: 1; }

  .sa-topbar-actions  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .sa-topbar-divider  { display: none; width: 1px; height: 20px; background: var(--sa-bdr-med); opacity: 0.65; }
  @media (min-width: 768px) { .sa-topbar-divider { display: block; } }

  .sa-bell-btn {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--sa-bg-card); border: 1px solid var(--sa-bdr-soft);
    cursor: pointer; color: var(--sa-graphite-muted); transition: all 0.18s;
  }
  .sa-bell-btn:hover { border-color: var(--sa-bdr-gold); color: var(--sa-graphite); }
  @media (min-width: 768px) { .sa-bell-btn { display: flex; } }

  .sa-topbar-user-pill {
    display: none; align-items: center; gap: 8px;
    padding: 4px 12px 4px 4px; border-radius: 999px;
    border: 1px solid var(--sa-bdr-soft); background: var(--sa-bg-card);
    transition: all 0.18s var(--sa-ease-out);
  }
  .sa-topbar-user-pill:hover { border-color: var(--sa-bdr-gold); box-shadow: 0 4px 16px rgba(26,26,26,0.06); }
  @media (min-width: 768px) { .sa-topbar-user-pill { display: flex; } }

  .sa-topbar-av {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--sa-gold-soft), var(--sa-gold-deep));
  }
  .sa-topbar-initial { font-size: 11px; font-weight: 900; color: var(--sa-graphite); font-family: var(--sa-font-heading); }
  .sa-topbar-id      { display: flex; flex-direction: column; gap: 1px; padding-inline-start: 4px; padding-inline-end: 2px; line-height: 1.15; }
  .sa-topbar-name    { font-size: 12.5px; font-weight: 700; color: var(--sa-graphite); white-space: nowrap; }
  .sa-topbar-sub     { font-size: 10px; font-weight: 600; color: var(--sa-gold-deep); white-space: nowrap; letter-spacing: 0.02em; opacity: 0.85; }

  /* Content */
  .sa-content { position: relative; flex: 1; padding: 28px 20px; animation: sa-slidein 0.42s var(--sa-ease-out); }
  @media (min-width: 768px) { .sa-content { padding: 40px; } }
  .sa-content--hub { padding: 0 !important; }
  .sa-watermark    { position: absolute; left: 24px; top: 24px; opacity: 0.04; pointer-events: none; }
  .sa-content-inner { position: relative; z-index: 10; }

  /* ── view-only banner (investor demo) ── */
  .sa-view-only-banner {
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(135deg, #FFF4D2, #FCE9A8);
    border: 1.5px solid rgba(194,160,89,0.55);
    color: #6B1E2D;
    border-radius: 14px;
    padding: 12px 16px;
    margin-bottom: 18px;
    font-family: 'Cairo', 'Tajawal', sans-serif;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.6;
    box-shadow: 0 6px 18px rgba(150,115,50,0.08);
  }
  .sa-view-only-banner svg { color: #B8A082; flex-shrink: 0; }
  .sa-view-only-text { flex: 1; }

  /* ── Safety net: every mutating control inside the admin shell must be
       tagged with data-write="true" (or live inside an element that is).
       When the shell is in view-only mode, all such controls disappear. */
  .sa-shell--view-only [data-write="true"] { display: none !important; }
  .sa-shell--view-only [data-write-area="true"] { display: none !important; }
  /* Forms and form controls submitting data are also locked. */
  .sa-shell--view-only form[data-write="true"] input,
  .sa-shell--view-only form[data-write="true"] textarea,
  .sa-shell--view-only form[data-write="true"] select,
  .sa-shell--view-only form[data-write="true"] button { pointer-events: none; opacity: 0.4; }

  /* Bottom band */
  .sa-bottom-band {
    pointer-events: none; width: 100%; height: 80px; flex-shrink: 0;
    opacity: 0.60;
    mask-image: linear-gradient(to bottom, transparent, black 55%);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 55%);
  }

  /* Footer caption */
  .sa-footer-caption { display: flex; align-items: center; justify-content: center; gap: 8px; padding-bottom: 20px; padding-top: 4px; }
  .sa-footer-sparkle { color: var(--sa-gold-deep); opacity: 0.60; }
  .sa-footer-text    { font-family: var(--sa-font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.28em; text-transform: uppercase; color: var(--sa-graphite-muted); opacity: 0.60; }
`;

const brandStyles = `
  :root {
    --sa-cream: #EFEAE0;
    --sa-sand: #E5E0D5;
    --sa-burgundy: #6B1E2D;
    --sa-burgundy-deep: #4A0E1C;
    --sa-charcoal: #1A1A1A;
    --sa-success: #1B5E20;

    --sa-bg-main: #EFEAE0;
    --sa-bg-soft: #F6F1E8;
    --sa-bg-card: #FBF8F1;
    --sa-graphite: #1A1A1A;
    --sa-graphite-muted: #5D554A;
    --sa-graphite-soft: #8C8274;
    --sa-gold: #B8A082;
    --sa-gold-deep: #8F765B;
    --sa-gold-soft: #D9C9B0;
    --sa-bdr-soft: rgba(74,14,28,0.08);
    --sa-bdr-med: rgba(74,14,28,0.13);
    --sa-bdr-gold: rgba(184,160,130,0.42);

    --gold: #B8A082;
    --gold2: #D9C9B0;
    --gold3: #D9C9B0;
    --gold4: #D9C9B0;
    --gold-deep: #8F765B;
    --gold-soft: #D9C9B0;
    --gold-pale: rgba(184,160,130,0.08);
    --gold-border: rgba(184,160,130,0.22);
    --gold-l: rgba(184,160,130,0.08);
    --gold-b: rgba(184,160,130,0.22);
    --gold-dim: rgba(184,160,130,0.10);
    --gold-mid: rgba(184,160,130,0.18);

    --black: #1A1A1A;
    --graphite: #1A1A1A;
    --graphite2: #4A0E1C;
    --ink: #1A1A1A;
    --ink2: #5D554A;
    --ink3: #8C8274;
    --text: #1A1A1A;
    --text2: #3D3526;
    --text3: #8C8274;
    --surface: #FBF8F1;
    --surface2: #EFEAE0;
    --off-white: #EFEAE0;
    --border: rgba(184,160,130,0.26);
    --border2: rgba(184,160,130,0.36);
    --mine-bg: #B8A082;
    --mine-fg: #1A1A1A;
    --admin-mine-bg: linear-gradient(135deg,#D9C9B0,#B8A082);
    --admin-mine-border: rgba(184,160,130,0.45);
    --staff-bg: rgba(184,160,130,0.08);
    --staff-border: rgba(184,160,130,0.22);
  }

  html, body {
    background:
      radial-gradient(ellipse at 12% 8%, rgba(184,160,130,0.14), transparent 30%),
      radial-gradient(ellipse at 88% 85%, rgba(107,30,45,0.07), transparent 32%),
      #EFEAE0 !important;
    color: #1A1A1A;
  }

  ::selection { background: rgba(184,160,130,0.26); }

  .sa-sidebar {
    border-inline-end-color: rgba(184,160,130,0.18) !important;
    background:
      radial-gradient(circle at 20% 0%, rgba(107,30,45,0.48), transparent 34%),
      linear-gradient(180deg, #1A1A1A 0%, #230B13 46%, #12070B 100%) !important;
  }

  .sa-sidebar-glow {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(217,201,176,0.13), transparent 55%),
      radial-gradient(ellipse at 50% 100%, rgba(107,30,45,0.28), transparent 44%) !important;
  }

  .sa-logo-block {
    background: #12070B !important;
    border-top-color: rgba(217,201,176,0.55) !important;
    border-bottom-color: rgba(184,160,130,0.24) !important;
    box-shadow: 0 6px 28px rgba(107,30,45,0.18), inset 0 -1px 0 rgba(217,201,176,0.08) !important;
  }

  .sa-section-label,
  .sa-nav-group-sub,
  .sa-user-role {
    color: rgba(217,201,176,0.55) !important;
  }

  .sa-rule-line,
  .sa-nav-sep {
    background: linear-gradient(90deg, transparent, rgba(217,201,176,0.25), transparent) !important;
  }

  .sa-rule-diamond,
  .sa-rule-dash {
    background: rgba(217,201,176,0.55) !important;
  }

  .sa-nav-group {
    border-color: rgba(217,201,176,0.10) !important;
    background: rgba(239,234,224,0.025) !important;
  }

  .sa-nav-group.active {
    border-color: rgba(217,201,176,0.25) !important;
    background: rgba(107,30,45,0.24) !important;
  }

  .sa-nav-group-head,
  .sa-nav-item {
    color: rgba(239,234,224,0.78) !important;
  }

  .sa-nav-group-head:hover,
  .sa-nav-item:hover {
    background: rgba(239,234,224,0.07) !important;
    color: rgba(239,234,224,0.98) !important;
    border-color: rgba(217,201,176,0.18) !important;
  }

  .sa-nav-item.active {
    background: linear-gradient(180deg, rgba(107,30,45,0.72), rgba(74,14,28,0.54)) !important;
    color: #EFEAE0 !important;
    border-color: rgba(217,201,176,0.45) !important;
  }

  .sa-nav-pill {
    background: linear-gradient(180deg, #D9C9B0, #B8A082) !important;
  }

  .sa-nav-shimmer {
    background: linear-gradient(to left, transparent, rgba(217,201,176,0.55), transparent) !important;
  }

  .sa-nav-icon-wrap,
  .sa-user,
  .sa-logout-btn {
    background: rgba(239,234,224,0.065) !important;
    border-color: rgba(217,201,176,0.12) !important;
  }

  .sa-nav-item.active .sa-nav-icon-wrap,
  .sa-user:hover,
  .sa-logout-btn:hover:not(:disabled) {
    background: rgba(217,201,176,0.15) !important;
    border-color: rgba(217,201,176,0.34) !important;
  }

  .sa-nav-dot,
  .sa-user-av,
  .sa-topbar-av {
    background: linear-gradient(135deg, #D9C9B0, #B8A082) !important;
  }

  .sa-topbar {
    background: rgba(239,234,224,0.88) !important;
    border-bottom-color: rgba(74,14,28,0.08) !important;
    box-shadow: 0 1px 0 rgba(74,14,28,0.04), 0 6px 24px rgba(74,14,28,0.035) !important;
  }

  .sa-topbar-accent {
    background: linear-gradient(90deg, transparent, rgba(184,160,130,0.35) 15%, rgba(107,30,45,0.58) 50%, rgba(184,160,130,0.35) 85%, transparent) !important;
  }

  .sa-hamburger:hover,
  .sa-bell-btn:hover,
  .sa-topbar-user-pill:hover {
    border-color: rgba(184,160,130,0.42) !important;
    color: #4A0E1C !important;
  }

  .sa-shell :is(.school-dashboard-hero,.te-hero) {
    background:
      radial-gradient(circle at 12% 14%, rgba(217,201,176,0.18), transparent 30%),
      linear-gradient(135deg,#1A1A1A,#4A0E1C 58%,#6B1E2D) !important;
    border-color: rgba(217,201,176,0.25) !important;
    box-shadow: 0 18px 50px rgba(74,14,28,0.16) !important;
    color: #EFEAE0 !important;
  }

  .sa-shell :is(.school-dashboard-hero-copy span,.te-eyebrow,.school-dashboard-hero-side strong,.te-metric strong) {
    color: #D9C9B0 !important;
  }

  .sa-shell :is(.school-dashboard-kpi,.school-dashboard-panel,.school-dashboard-module,.te-card,.te-empty,.ap-toolbar,.ap-table-wrap,.ap-empty,.cl-card,.gs-toolbar,.gs-empty,.gs-table-wrap,.gs-history-list,.inv-card,.pf-card,.pf-panel,.rp-card,.rq-card,.tg-side,.tg-detail,.tg-dialog,.ws-card,.ws-panel,.workshop-card,.sub-card,.sub-table-wrap,.aor-card,.aor-empty,.rb-card,.rb-stat,.rb-panel) {
    background: #FBF8F1 !important;
    border-color: rgba(184,160,130,0.22) !important;
    box-shadow: 0 10px 28px rgba(74,14,28,0.045) !important;
    color: #1A1A1A !important;
  }

  .sa-shell .school-dashboard-modules {
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
    position: relative !important;
    z-index: 2 !important;
    opacity: 1 !important;
    visibility: visible !important;
  }

  .sa-shell .school-dashboard-module-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
    gap: 14px !important;
    width: 100% !important;
    opacity: 1 !important;
    visibility: visible !important;
  }

  .sa-shell .school-dashboard-module {
    display: flex !important;
    flex-direction: column !important;
    min-height: 210px !important;
    padding: 18px !important;
    border-radius: 24px !important;
    background: linear-gradient(180deg,#FBF8F1,#EFEAE0) !important;
    border: 1px solid rgba(184,160,130,0.28) !important;
    box-shadow: 0 14px 34px rgba(74,14,28,0.07) !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
  }

  .sa-shell .school-dashboard-module h3 {
    display: block !important;
    color: #1A1A1A !important;
  }

  .sa-shell .school-dashboard-module p {
    display: block !important;
    color: #5D554A !important;
  }

  .sa-shell .school-dashboard-module div {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    margin-top: auto !important;
  }

  .sa-shell :is(input,textarea,select) {
    border-color: rgba(184,160,130,0.30);
  }

  .sa-shell :is(input,textarea,select):focus {
    border-color: rgba(107,30,45,0.42) !important;
    box-shadow: 0 0 0 3px rgba(107,30,45,0.08) !important;
  }

  .sa-shell :is(.school-dashboard-module a,.te-toolbar a,.gs-toggle.active,.gs-open,.tg-btn-primary,.tg-ann-composer button,.inv-create-btn,.ap-view,.teacher-application-detail-print-btn,.cl-btn-primary,.pf-uploteacher-application-detail-btn,.rb-primary,.ws-primary,.hub-send,.admin-send) {
    background: #4A0E1C !important;
    color: #D9C9B0 !important;
    border-color: rgba(217,201,176,0.24) !important;
  }

  .sa-shell :is(.school-dashboard-kpi em,.school-dashboard-panel-head span,.te-status,.te-pill,.te-group-chip,.ap-status,.tg-list-meta,.tg-member-filter span,.inv-status,.gs-num,.gs-table th,.cl-eyebrow,.rb-eyebrow) {
    color: #6B1E2D !important;
  }

  .sa-shell :is(.school-dashboard-track i,.cl-card-accent,.rb-progress-fill) {
    background: linear-gradient(90deg,#6B1E2D,#B8A082) !important;
  }

  .sa-shell :is(.te-status.good,.te-pill.good,.school-dashboard-calm,.gs-score--great) {
    color: #1B5E20 !important;
  }

  .sa-shell :is(.te-toggle.on,.teacher-application-detail-btn.approve) {
    color: #1B5E20 !important;
    background: rgba(27,94,32,0.08) !important;
    border-color: rgba(27,94,32,0.20) !important;
  }

  .sa-shell :is(.te-toggle.off,.teacher-application-detail-btn.reject,.tg-btn-danger,.tg-mini-x,.tg-ann-delete) {
    color: #6B1E2D !important;
    background: rgba(107,30,45,0.08) !important;
    border-color: rgba(107,30,45,0.20) !important;
  }

  .sa-view-only-banner {
    background: linear-gradient(135deg,#FBF8F1,#E5E0D5) !important;
    border-color: rgba(184,160,130,0.55) !important;
    color: #4A0E1C !important;
  }

  .sa-bottom-band line,
  .sa-bottom-band circle {
    stroke: rgba(184,160,130,0.34);
  }
`;
