/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";
import LangToggle from "@/lib/LangToggle";
import { t } from "@/lib/translations";
import Image from "next/image";
import { cachedFetch, clearCache } from "@/lib/api-cache";
import MandalaLoader from "@/components/MandalaLoader";
import { enforceTenantSubdomain } from "@/lib/enforce-subdomain";
import { TenantProvider, useTenant } from "@/lib/tenant-context";
import { featureForPath, type FeatureKey } from "@/lib/features";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  BookOpen,
  Globe2,
  Menu,
  LogOut,
  Bell,
  Sparkles,
  Gamepad2,
  MapPin,
  LucideIcon,
  X,
} from "lucide-react";

/* ─── Geometric SVG decorations ─── */

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

function Mandala({ size = 160, stroke = "rgba(200,169,106,0.32)", className = "" }: {
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

function GeoMark({ size = 22, color = "var(--tl-gold)" }: { size?: number; color?: string }) {
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
  key: "dashboard" | "myClasses" | "lessons" | "quizzes" | "reports" | "roadmap";
  sublabel: string;
  exact?: boolean;
  icon: LucideIcon;
  /** When set, the item is hidden unless the school has this feature enabled. */
  feature?: FeatureKey;
}

interface NavItem2 extends Omit<NavItem, "key"> {
  key: NavItem["key"] | "games";
  labelAr?: string;
  labelSq?: string;
  labelEn?: string;
}

const navItems: NavItem2[] = [
  { href: "/teacher",          key: "dashboard", sublabel: "Dashboard", exact: true,  icon: LayoutDashboard },
  { href: "/teacher/classes",  key: "myClasses", sublabel: "Classes",   exact: false, icon: Users },
  {
    href: "/teacher/roadmap",  key: "roadmap",   sublabel: "Roadmap",   exact: false, icon: MapPin,
    feature: "roadmap",
    labelAr: "الخريطة التعليمية",
    labelSq: "Harta Edukative",
    labelEn: "Roadmap",
  },
  { href: "/teacher/lessons",  key: "lessons",   sublabel: "Lessons",   exact: false, icon: BookOpen, feature: "lessons" },
  { href: "/teacher/quizzes",  key: "quizzes",   sublabel: "Quizzes",   exact: false, icon: ClipboardList, feature: "quizzes" },
  { href: "/teacher/reports",  key: "reports",   sublabel: "Reports",   exact: false, icon: BarChart3, feature: "reports" },
  {
    href: "/teacher/games", key: "games", sublabel: "Learning Tools", exact: false,
    icon: Gamepad2,
    labelAr: "أدوات وألعاب التعلم",
    labelSq: "Mjete dhe lojëra mësimore",
    labelEn: "Learning Tools & Games",
  },
];

const COMMUNITY_HREF = "/teacher/hub";

/* ─── Layout (thin wrapper that provides tenant context) ─── */
export default function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <TenantProvider>
      <TeacherLayoutInner>{children}</TeacherLayoutInner>
    </TenantProvider>
  );
}

function TeacherLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const tr = t[lang];
  const isRtl = lang === "ar";

  // ── Tenant feature flags ──
  const { hasFeature, loading: tenantLoading } = useTenant();
  // Only show nav items whose feature is enabled (or that have no feature gate).
  const visibleNav = navItems.filter((i) => !i.feature || hasFeature(i.feature));
  const showCommunity = hasFeature("hub");

  // Route guard: if the user lands on a module their school disabled (e.g. via
  // a bookmark or direct URL), bounce them back to the dashboard. We wait until
  // the tenant config has loaded so we never redirect on a stale assumption.
  useEffect(() => {
    if (tenantLoading) return;
    const feat = featureForPath(pathname) as FeatureKey | null;
    if (feat && !hasFeature(feat)) router.replace("/teacher");
  }, [pathname, tenantLoading, hasFeature, router]);

  const [name, setName] = useState("");
  const [initials, setInitials] = useState("م");
  const [schoolName, setSchoolName] = useState("");
  const [schoolNameAlt, setSchoolNameAlt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Toggle is now ALWAYS visible (no gating on the school's default language).
  // Users can swap between Arabic and the school's secondary language at any time.
  const [showToggle] = useState(true);
  const [schoolLang, setSchoolLang] = useState("sq");
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const schoolSlugRef = useRef<string>("");

  useEffect(() => {
    cachedFetch<any>("/api/teacher", 300_000)
      .then((d) => {
        if (d?.error === "school_deactivated" && d?.school?.slug) {
          window.location.href = `/schools/${d.school.slug}`;
          return;
        }
        if (d?.school?.slug) {
          schoolSlugRef.current = d.school.slug;
          enforceTenantSubdomain(d.school.slug);
        }
        if (d?.school?.name) setSchoolName(d.school.name);
        setSchoolNameAlt(d?.school?.name_alt ?? null);
        if (d?.profile?.full_name) {
          setName(d.profile.full_name);
          setInitials(
            d.profile.full_name
              .split(" ")
              .map((w: string) => w[0])
              .slice(0, 2)
              .join(""),
          );
        }
        if (d?.school?.language) {
          const savedLang = localStorage.getItem("lang");
          if (!savedLang) setLang(d.school.language as "ar" | "sq" | "en");
          // Use the school's secondary language as the alternate option.
          // If the school IS Arabic, default the secondary to Albanian.
          setSchoolLang(d.school.language === "ar" ? "sq" : d.school.language);
        }
        setOnboardingStatus(d?.onboarding_status ?? null);
      })
      .catch(() => {})
      .finally(() => setStatusLoaded(true));

    // Cache profile — avatar doesn't change between page navigations.
    cachedFetch<{ profile?: { avatar_url?: string } }>("/api/profile", 600_000)
      .then((d) => { if (d?.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    clearCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    const slug = schoolSlugRef.current;
    window.location.href = slug ? `/schools/${slug}` : "/login";
  }

  // ── Application onboarding gate ──
  // PENDING_APPLICATION → /teacher/application
  // UNDER_REVIEW        → /teacher/under-review
  // REJECTED            → /teacher/rejected
  // ACTIVE              → full dashboard
  const gatedTo = (() => {
    if (!statusLoaded || !onboardingStatus) return null;
    if (onboardingStatus === "PENDING_APPLICATION") return "/teacher/application";
    if (onboardingStatus === "UNDER_REVIEW")        return "/teacher/under-review";
    if (onboardingStatus === "REJECTED")            return "/teacher/rejected";
    return null;
  })();
  const gated = gatedTo !== null;
  useEffect(() => {
    if (gatedTo && pathname !== gatedTo) router.replace(gatedTo);
  }, [gatedTo, pathname, router]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navLabel = (item: NavItem2) => {
    if (item.labelAr) {
      if (lang === "ar") return item.labelAr;
      if (lang === "sq") return item.labelSq!;
      return item.labelEn ?? item.labelAr;
    }
    return tr[item.key as Exclude<NavItem2["key"], "games" | "roadmap">];
  };

  const currentLabel = (() => {
    if (isActive(COMMUNITY_HREF))
      return lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community";
    const found = navItems.find((item) => isActive(item.href, item.exact));
    return found ? navLabel(found) : (lang === "ar" ? "الصفحة" : "Faqja");
  })();

  // ── Pre-status loader ──
  // Until /api/teacher resolves, we don't yet know whether this teacher is
  // onboarding (no nav) or active (full nav). Showing the full sidebar+topbar
  // shell and then collapsing it to the gated shell once status lands is
  // jarring — especially for a brand-new teacher who only ever sees the
  // onboarding view. Render a clean full-screen mandala loader instead.
  if (!statusLoaded) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(ellipse at 50% 8%, #F8F1E0, transparent 45%), linear-gradient(160deg,#EFE6D2 0%,#E9DFC7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Cairo','Tajawal',sans-serif",
        }}
      >
        <MandalaLoader />
      </div>
    );
  }

  // ── Gated onboarding shell (no sidebar / nav) ──
  if (gated) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(ellipse at 50% 8%, #F8F1E0, transparent 45%), linear-gradient(160deg,#EFE6D2 0%,#E9DFC7 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Cairo','Tajawal',sans-serif",
        }}
      >
        <header
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            background: "linear-gradient(180deg,#1E2329,#11151A)",
            borderBottom: "1px solid rgba(200,169,106,0.18)",
          }}
        >
          <div style={{ flex: 1 }} />
          {showToggle && <LangToggle dark secondaryLang={schoolLang} />}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(232,220,188,0.9)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#D8C28A,#B89B5E)",
                color: "#11151A",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {initials}
            </span>
            <span className="rg-name">{name}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "1px solid rgba(200,169,106,0.28)",
              color: "rgba(232,220,188,0.85)",
              borderRadius: 9,
              padding: "7px 13px",
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {loggingOut ? <div className="tl-spin" /> : <LogOut size={14} strokeWidth={1.8} />}
            <span>{lang === "ar" ? "تسجيل الخروج" : lang === "sq" ? "Dalje" : "Logout"}</span>
          </button>
        </header>
        <main style={{ flex: 1 }}>{children}</main>
        <style>{`
          .rg-games-btn {
            display: inline-flex; align-items: center; gap: 7px;
            padding: 7px 14px; border-radius: 999px;
            background: linear-gradient(135deg, rgba(200,169,106,0.18), rgba(200,169,106,0.08));
            border: 1px solid rgba(200,169,106,0.45);
            color: #E0C277;
            font-family: 'Cairo', 'Tajawal', sans-serif;
            font-size: 12.5px; font-weight: 800; letter-spacing: 0.02em;
            text-decoration: none;
            transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
            box-shadow: 0 4px 12px rgba(200,169,106,0.10);
            white-space: nowrap;
          }
          .rg-games-btn:hover {
            background: linear-gradient(135deg, rgba(229,185,60,0.28), rgba(200,169,106,0.14));
            border-color: rgba(229,185,60,0.65);
            color: #F0D690;
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(200,169,106,0.22);
          }
          @media(max-width:520px){
            .rg-name{display:none}
            .rg-games-btn{padding:6px 11px}
            .rg-games-btn-label{display:none}
          }
          ${styles}
        `}</style>
      </div>
    );
  }

  return (
    <div className="tl-shell" dir={isRtl ? "rtl" : "ltr"}>
      {sidebarOpen && (
        <div className="tl-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={`tl-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="tl-sidebar-glow" aria-hidden="true" />

        {/* Logo */}
        <div className="tl-logo-block">
          <Image
            src="/ahlia.png"
            alt="بناء الأهلية"
            fill
            style={{ objectFit: "contain", objectPosition: "center" }}
            priority
          />
          <div className="tl-logo-frame" aria-hidden="true" />
          <button
            className="tl-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Gold rule */}
        <div className="tl-gold-rule" aria-hidden="true">
          <div className="tl-rule-line" />
          <div className="tl-rule-diamond" />
          <div className="tl-rule-dash" />
          <div className="tl-rule-diamond" />
          <div className="tl-rule-line" />
        </div>

        {/* Section label */}
        <div className="tl-section-label">
          {lang === "ar" ? "القوائم الرئيسية · Main" : lang === "sq" ? "Menuja Kryesore · Main" : "Main Menu"}
        </div>

        {showToggle && (
          <div style={{ padding: "0 14px 10px" }}>
            <LangToggle dark secondaryLang={schoolLang} />
          </div>
        )}

        {/* Nav */}
        <nav className="tl-nav">
          {visibleNav.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`tl-nav-item ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {active && (
                  <>
                    <span className="tl-nav-pill" />
                    <span className="tl-nav-shimmer" />
                  </>
                )}
                <span className="tl-nav-icon-wrap">
                  <Icon size={17} strokeWidth={1.6} />
                </span>
                <span className="tl-nav-labels">
                  <span className="tl-nav-label-main">{navLabel(item)}</span>
                  <span className="tl-nav-label-sub">{item.sublabel}</span>
                </span>
                {active && <span className="tl-nav-dot" />}
              </Link>
            );
          })}

          {/* Community — visually separated, gated by the hub feature */}
          {showCommunity && (
            <>
              <div className="tl-nav-sep" aria-hidden="true" />
              {(() => {
                const active = isActive(COMMUNITY_HREF);
                return (
                  <Link
                    href={COMMUNITY_HREF}
                    className={`tl-nav-item tl-nav-community ${active ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {active && (
                      <>
                        <span className="tl-nav-pill" />
                        <span className="tl-nav-shimmer" />
                      </>
                    )}
                    <span className="tl-nav-icon-wrap">
                      <Globe2 size={17} strokeWidth={1.6} />
                    </span>
                    <span className="tl-nav-labels">
                      <span className="tl-nav-label-main">
                        {lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community"}
                      </span>
                      <span className="tl-nav-label-sub">Community</span>
                    </span>
                    {active && <span className="tl-nav-dot" />}
                  </Link>
                );
              })()}
            </>
          )}

          <div className="tl-mandala-wrap" aria-hidden="true">
            <Mandala size={172} stroke="rgba(200,169,106,0.32)" />
          </div>
        </nav>

        {/* Footer rule */}
        <div className="tl-gold-rule tl-gold-rule--footer" aria-hidden="true">
          <div className="tl-rule-line" />
          <div className="tl-rule-diamond" />
          <div className="tl-rule-line" />
        </div>

        {/* User block */}  
        <div className="tl-user-block">
          <div className="tl-user">
            <Link
              href="/teacher/profile"
              className="tl-user-clickable"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="tl-user-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={40}
                    height={40}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                  />
                ) : (
                  <span className="tl-user-initial">{initials}</span>
                )}
              </div>
              <div className="tl-user-info">
                <span className="tl-user-name">
                  {name || (lang === "ar" ? "مشرف" : "Mësuesi")}
                </span>
                <span className="tl-user-role">
                  {lang === "ar" ? "مشرف" : lang === "sq" ? "Mësues" : "Teacher"}
                </span>
              </div>
            </Link>
            <button
              className="tl-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title={lang === "ar" ? "تسجيل الخروج" : "Dalje"}
              type="button"
            >
              {loggingOut ? <div className="tl-spin" /> : <LogOut size={15} strokeWidth={1.7} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <div className="tl-main" dir={isRtl ? "rtl" : "ltr"}>
        {/* Topbar */}
        <header className="tl-topbar">
          <div className="tl-topbar-accent" aria-hidden="true" />
          <button
            type="button"
            className="tl-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={20} strokeWidth={1.7} />
          </button>

          <div className="tl-breadcrumb-wrap">
            <div className="tl-breadcrumb-geo">
              <GeoMark size={18} color="var(--tl-gold-deep)" />
            </div>
            <div className="tl-breadcrumb">
              <span className="tl-bc-cur">{currentLabel}</span>
            </div>
          </div>

          <div className="tl-topbar-spacer" />

          <div className="tl-topbar-actions">
            <div className="tl-topbar-divider" />
            <button type="button" className="tl-bell-btn" aria-label="الإشعارات">
              <Bell size={15} strokeWidth={1.7} />
            </button>
            <div className="tl-topbar-user-pill">
              <div className="tl-topbar-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={28}
                    height={28}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  <span className="tl-topbar-initial">{initials}</span>
                )}
              </div>
              <div className="tl-topbar-id">
                <span className="tl-topbar-name">{name || (lang === "ar" ? "المعلم" : "Teacher")}</span>
                {(schoolName || schoolNameAlt) && (
                  <span className="tl-topbar-sub">
                    {lang === "ar"
                      ? `معلم في ${schoolName || schoolNameAlt}`
                      : `Teacher of ${schoolNameAlt && schoolNameAlt.trim() ? schoolNameAlt : schoolName}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`tl-content${pathname === "/teacher/hub" ? " tl-content--hub" : ""}`}>
          <div className="tl-watermark" aria-hidden="true">
            <Mandala size={260} stroke="var(--tl-graphite)" />
          </div>
          <div className="tl-content-inner">{children}</div>
        </main>

        {/* Bottom band */}
        <div className="tl-bottom-band" aria-hidden="true">
          <svg viewBox="0 0 1200 80" preserveAspectRatio="none" width="100%" height="100%">
            <line x1="0" y1="40" x2="1200" y2="40" stroke="rgba(200,169,106,0.25)" strokeWidth="0.5" />
            {Array.from({ length: 36 }).map((_, i) => (
              <circle key={i} cx={(i + 0.5) * (1200 / 36)} cy="40" r="1.2" fill="rgba(200,169,106,0.45)" />
            ))}
            <circle cx="600" cy="40" r="6" fill="none" stroke="rgba(200,169,106,0.55)" strokeWidth="0.7" />
            <circle cx="600" cy="40" r="14" fill="none" stroke="rgba(200,169,106,0.30)" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="tl-footer-caption">
          <Sparkles size={11} className="tl-footer-sparkle" />
          <span className="tl-footer-text">
            {lang === "ar"
              ? "جميع الحقوق محفوظة © منظومة - 2026"
              : lang === "sq"
                ? "Të gjitha të drejtat e rezervuara © Manzoma - 2026"
                : "All rights reserved © Manzoma - 2026"}
          </span>
        </div>
      </div>

      {/* ═══════════════════ MOBILE BOTTOM TAB BAR ═══════════════════ */}
      <nav className="tl-bottom-tabs" dir={isRtl ? "rtl" : "ltr"} aria-label="Mobile navigation">
        {visibleNav.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`tl-tab-item ${active ? "active" : ""}`}
            >
              <span className="tl-tab-icon"><Icon size={22} strokeWidth={1.6} /></span>
              <span className="tl-tab-label">{navLabel(item)}</span>
            </Link>
          );
        })}
        {showCommunity && (() => {
          const active = isActive(COMMUNITY_HREF);
          return (
            <Link href={COMMUNITY_HREF} className={`tl-tab-item ${active ? "active" : ""}`}>
              <span className="tl-tab-icon"><Globe2 size={22} strokeWidth={1.6} /></span>
              <span className="tl-tab-label">
                {lang === "ar" ? "المجتمع" : lang === "sq" ? "Hub" : "Hub"}
              </span>
            </Link>
          );
        })()}
      </nav>

      <style>{styles}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════════ */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes tl-fadein  { from { opacity: 0 }               to { opacity: 1 } }
  @keyframes tl-slidein { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes tl-spin    { to { transform: rotate(360deg) } }

  :root {
    --tl-bg-main:        #F6F4EE;
    --tl-bg-soft:        #FBFAF6;
    --tl-bg-card:        #FFFDF8;

    --tl-graphite:       #080B0C;
    --tl-graphite-muted: #5E5A52;
    --tl-graphite-soft:  #8A8478;

    --tl-gold:           #C8A96A;
    --tl-gold-deep:      #B89B5E;
    --tl-gold-soft:      #D8C28A;

    --tl-bdr-soft:       rgba(8,11,12,0.07);
    --tl-bdr-med:        rgba(8,11,12,0.11);
    --tl-bdr-gold:       rgba(200,169,106,0.38);

    --tl-sidebar-w:      286px;
    --tl-topbar-h:       68px;

    --tl-font-heading:   'El Messiri', 'Cairo', serif;
    --tl-font-mono:      'IBM Plex Mono', monospace;
    --tl-font:           'Cairo', 'IBM Plex Sans Arabic', sans-serif;

    --tl-ease-out:       cubic-bezier(0.22, 1, 0.36, 1);
  }

  html, body {
    font-family: var(--tl-font);
    background:
      radial-gradient(ellipse at 12% 8%,  rgba(200,169,106,0.07), transparent 30%),
      radial-gradient(ellipse at 88% 85%, rgba(122,30,30,0.04),   transparent 32%),
      var(--tl-bg-main);
    color: var(--tl-graphite);
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: rgba(200,169,106,0.20); }

  /* ══ SHELL ══ */
  .tl-shell { display: flex; min-height: 100vh; width: 100%; }

  /* ══ OVERLAY ══ */
  .tl-overlay {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(8,11,12,0.55);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    animation: tl-fadein 0.22s ease;
  }

  /* ══ SIDEBAR ══ */
  .tl-sidebar {
    position: fixed; top: 0; inset-inline-start: 0;
    width: var(--tl-sidebar-w); height: 100vh;
    z-index: 50; display: flex; flex-direction: column; overflow: hidden;
    border-inline-end: 1px solid rgba(200,169,106,0.14);
    /* Layered charcoal — depth + a little warmth, not pitch-black */
    background:
      linear-gradient(180deg, #1E2329 0%, #181C21 50%, #11151A 100%);
    transition: transform 0.32s var(--tl-ease-out);
    transform: translateX(0);
  }
  @media (max-width: 767px) {
    [dir="rtl"] .tl-sidebar       { transform: translateX(100%); }
    [dir="rtl"] .tl-sidebar.open  { transform: translateX(0); box-shadow: -22px 0 60px rgba(8,11,12,0.42); }
    [dir="ltr"] .tl-sidebar       { transform: translateX(-100%); }
    [dir="ltr"] .tl-sidebar.open  { transform: translateX(0); box-shadow: 22px 0 60px rgba(8,11,12,0.42); }
  }

  .tl-sidebar-glow {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%,   rgba(200,169,106,0.12), transparent 55%),
      radial-gradient(ellipse at 50% 100%, rgba(122,30,30,0.05),   transparent 44%);
  }

  /* Logo */
  .tl-logo-block {
    position: relative; z-index: 10; flex-shrink: 0;
    width: 100%; height: 86px; overflow: hidden;
    background: #080B0C;
    border-top: 1.5px solid rgba(200,169,106,0.55);
    border-bottom: 1px solid rgba(200,169,106,0.20);
    box-shadow: 0 6px 28px rgba(200,169,106,0.07), inset 0 -1px 0 rgba(200,169,106,0.08);
  }
  .tl-logo-frame {
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background:
      linear-gradient(to right, rgba(8,11,12,0.65) 0%, transparent 26%, transparent 74%, rgba(8,11,12,0.65) 100%),
      linear-gradient(to bottom, transparent 50%, rgba(8,11,12,0.72) 100%);
  }
  .tl-logo-frame::before {
    content: ''; position: absolute; top: 7px; left: 10px;
    width: 16px; height: 16px;
    border-top: 1.5px solid rgba(200,169,106,0.75);
    border-left: 1.5px solid rgba(200,169,106,0.75);
  }
  .tl-logo-frame::after {
    content: ''; position: absolute; top: 7px; right: 10px;
    width: 16px; height: 16px;
    border-top: 1.5px solid rgba(200,169,106,0.75);
    border-right: 1.5px solid rgba(200,169,106,0.75);
  }
  .tl-close-btn {
    display: none; align-items: center; justify-content: center;
    position: absolute; top: 10px; inset-inline-end: 10px;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(8,11,12,0.55); border: none; cursor: pointer;
    color: rgba(200,169,106,0.70); transition: color 0.15s, background 0.15s;
    z-index: 2;
  }
  .tl-close-btn:hover { color: var(--tl-gold); background: rgba(8,11,12,0.80); }
  @media (max-width: 767px) { .tl-close-btn { display: flex; } }

  /* Gold rule */
  .tl-gold-rule {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 6px;
    margin: 0 20px 14px;
  }
  .tl-gold-rule--footer { margin: 0 20px 12px; }
  .tl-rule-line    { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,169,106,0.22), transparent); }
  .tl-rule-diamond { width: 4px; height: 4px; border-radius: 1px; background: rgba(200,169,106,0.50); transform: rotate(45deg); flex-shrink: 0; }
  .tl-rule-dash    { width: 10px; height: 1px; background: rgba(200,169,106,0.38); flex-shrink: 0; }

  /* Section label */
  .tl-section-label {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 0 24px 10px;
    font-family: var(--tl-font-mono); font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(232, 220, 188, 0.45);
  }

  /* Nav */
  .tl-nav {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; gap: 2px;
    padding: 0 12px; flex: 1; overflow-y: auto;
  }
  .tl-nav::-webkit-scrollbar { display: none; }

  .tl-nav-sep {
    height: 1px; margin: 8px 8px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.15), transparent);
  }

  .tl-nav-item {
    position: relative; display: flex; align-items: center; gap: 11px;
    padding: 10px 12px; border-radius: 14px;
    text-decoration: none; border: 1px solid transparent;
    color: rgba(232, 220, 188, 0.70);     /* cream — clearly readable */
    transition: all 0.2s var(--tl-ease-out); overflow: hidden;
    flex-shrink: 0;
    min-height: 52px;
  }
  .tl-nav-item:hover {
    background: rgba(232, 220, 188, 0.06);
    color: rgba(255, 248, 230, 0.95);
    border-color: rgba(200,169,106,0.16);
  }
  .tl-nav-item.active {
    background: linear-gradient(180deg, rgba(200,169,106,0.18), rgba(200,169,106,0.08));
    color: #F5E5BC;
    border-color: rgba(200,169,106,0.42);
    box-shadow:
      0 4px 14px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .tl-nav-community { border-color: rgba(200,169,106,0.10); }
  .tl-nav-community:hover { border-color: rgba(200,169,106,0.22); }

  .tl-nav-pill    { position: absolute; inset-inline-end: 0; top: 7px; bottom: 7px; width: 3px; border-radius: 2px; background: linear-gradient(180deg, var(--tl-gold-soft), var(--tl-gold-deep)); }
  .tl-nav-shimmer { position: absolute; top: 0; left: 12px; right: 12px; height: 1px; background: linear-gradient(to left, transparent, rgba(200,169,106,0.55), transparent); }

  .tl-nav-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(232, 220, 188, 0.06);
    border: 1px solid rgba(200,169,106,0.06);
    transition: all 0.18s;
  }
  .tl-nav-item:hover  .tl-nav-icon-wrap {
    background: rgba(232, 220, 188, 0.12);
    border-color: rgba(200,169,106,0.18);
  }
  .tl-nav-item.active .tl-nav-icon-wrap {
    background: linear-gradient(135deg, rgba(229,185,60,0.22), rgba(200,169,106,0.14));
    border-color: rgba(200,169,106,0.40);
  }

  .tl-nav-labels     { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tl-nav-label-main { display: block; font-size: 13.5px; font-weight: 700; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.01em; }
  .tl-nav-label-sub  { display: block; font-family: var(--tl-font-mono); font-size: 9.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55; line-height: 1.2; }
  .tl-nav-dot        { width: 6px; height: 6px; border-radius: 50%; background: var(--tl-gold); box-shadow: 0 0 8px rgba(200,169,106,0.6); flex-shrink: 0; }

  .tl-mandala-wrap { margin-top: auto; display: flex; align-items: center; justify-content: center; padding: 20px 0 10px; opacity: 0.70; }

  /* User block */
  .tl-user-block { position: relative; z-index: 10; flex-shrink: 0; padding: 0 14px 20px; }
  .tl-user {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: 16px;
    background: rgba(232,220,188,0.05);
    border: 1px solid rgba(200,169,106,0.20);
    transition: all 0.2s;
  }
  .tl-user:hover { background: rgba(232,220,188,0.10); border-color: rgba(200,169,106,0.35); }

  .tl-user-clickable {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
    text-decoration: none; border-radius: 10px; transition: opacity 0.15s;
  }
  .tl-user-clickable:hover { opacity: 0.80; }

  .tl-user-av {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--tl-gold-soft), var(--tl-gold-deep));
  }
  .tl-user-initial { font-size: 16px; font-weight: 900; color: var(--tl-graphite); font-family: var(--tl-font-heading); }
  .tl-user-info    { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tl-user-name    { font-size: 13px; font-weight: 700; color: rgba(255,250,235,0.95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-user-role    { font-family: var(--tl-font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(200,169,106,0.70); }

  .tl-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(232,220,188,0.04);
    border: 1px solid rgba(200,169,106,0.10);
    cursor: pointer;
    color: rgba(232,220,188,0.65); transition: all 0.18s;
  }
  .tl-logout-btn:hover:not(:disabled) { background: rgba(200,169,106,0.15); color: var(--tl-gold); border-color: rgba(200,169,106,0.32); }
  .tl-logout-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .tl-spin { width: 13px; height: 13px; border: 2px solid rgba(200,169,106,0.15); border-top-color: var(--tl-gold); border-radius: 50%; animation: tl-spin 0.7s linear infinite; }

  /* ══ MAIN ══ */
  .tl-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; margin-inline-start: var(--tl-sidebar-w); }
  @media (max-width: 767px) { .tl-main { margin-inline-start: 0; } }

  /* Topbar */
  .tl-topbar {
    position: sticky; top: 0; z-index: 40;
    height: var(--tl-topbar-h); display: flex; align-items: center; gap: 14px;
    padding: 0 20px;
    background: rgba(251,250,246,0.82);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(8,11,12,0.07);
    box-shadow: 0 1px 0 rgba(8,11,12,0.04), 0 6px 24px rgba(8,11,12,0.025);
  }
  @media (min-width: 768px) { .tl-topbar { padding: 0 36px; } }

  .tl-topbar-accent {
    position: absolute; inset-x: 0; top: 0; height: 1.5px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.30) 15%, rgba(229,185,60,0.55) 50%, rgba(200,169,106,0.30) 85%, transparent);
  }

  .tl-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px;
    background: none; border: none; cursor: pointer;
    color: var(--tl-graphite-muted); transition: all 0.15s; flex-shrink: 0;
  }
  .tl-hamburger:hover { background: rgba(200,169,106,0.10); color: var(--tl-graphite); }
  @media (min-width: 768px) { .tl-hamburger { display: none; } }

  .tl-breadcrumb-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
  .tl-breadcrumb-geo  {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
    border: 1px solid var(--tl-bdr-soft); background: var(--tl-bg-card); opacity: 0.90;
  }
  @media (min-width: 640px) { .tl-breadcrumb-geo { display: flex; } }
  .tl-breadcrumb { display: flex; align-items: center; gap: 8px; }
  .tl-bc-root { font-size: 12.5px; font-weight: 500; color: var(--tl-graphite-muted); white-space: nowrap; }
  .tl-bc-sep  { color: var(--tl-graphite-muted); opacity: 0.38; flex-shrink: 0; }
  .tl-bc-cur  { font-size: 13.5px; font-weight: 700; color: var(--tl-graphite); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tl-topbar-spacer { flex: 1; }

  .tl-topbar-actions  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .tl-topbar-divider  { display: none; width: 1px; height: 20px; background: var(--tl-bdr-med); opacity: 0.65; }
  @media (min-width: 768px) { .tl-topbar-divider { display: block; } }

  .tl-bell-btn {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--tl-bg-card); border: 1px solid var(--tl-bdr-soft);
    cursor: pointer; color: var(--tl-graphite-muted); transition: all 0.18s;
  }
  .tl-bell-btn:hover { border-color: var(--tl-bdr-gold); color: var(--tl-graphite); }
  @media (min-width: 768px) { .tl-bell-btn { display: flex; } }

  .tl-topbar-user-pill {
    display: none; align-items: center; gap: 8px;
    padding: 4px 12px 4px 4px; border-radius: 999px;
    border: 1px solid var(--tl-bdr-soft); background: var(--tl-bg-card);
    transition: all 0.18s var(--tl-ease-out);
  }
  .tl-topbar-user-pill:hover { border-color: var(--tl-bdr-gold); box-shadow: 0 4px 16px rgba(8,11,12,0.06); }
  @media (min-width: 768px) { .tl-topbar-user-pill { display: flex; } }

  .tl-topbar-av {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--tl-gold-soft), var(--tl-gold-deep));
  }
  .tl-topbar-initial { font-size: 11px; font-weight: 900; color: var(--tl-graphite); font-family: var(--tl-font-heading); }
  .tl-topbar-id      { display: flex; flex-direction: column; gap: 1px; padding-inline-start: 4px; padding-inline-end: 2px; line-height: 1.15; }
  .tl-topbar-name    { font-size: 12.5px; font-weight: 700; color: var(--tl-graphite); white-space: nowrap; }
  .tl-topbar-sub     { font-size: 10px; font-weight: 600; color: var(--tl-gold-deep, #B89B5E); white-space: nowrap; letter-spacing: 0.02em; opacity: 0.85; }

  /* Content */
  .tl-content { position: relative; flex: 1; padding: 28px 20px; animation: tl-slidein 0.42s var(--tl-ease-out); }
  @media (min-width: 768px) { .tl-content { padding: 40px; } }
  .tl-content--hub { padding: 0 !important; }
  .tl-watermark    { position: absolute; left: 24px; top: 24px; opacity: 0.04; pointer-events: none; }
  .tl-content-inner { position: relative; z-index: 10; }

  /* Bottom band */
  .tl-bottom-band {
    pointer-events: none; width: 100%; height: 80px; flex-shrink: 0;
    opacity: 0.60;
    mask-image: linear-gradient(to bottom, transparent, black 55%);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 55%);
  }

  /* Footer caption */
  .tl-footer-caption { display: flex; align-items: center; justify-content: center; gap: 8px; padding-bottom: 20px; padding-top: 4px; }
  .tl-footer-sparkle { color: var(--tl-gold-deep); opacity: 0.60; }
  .tl-footer-text    { font-family: var(--tl-font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.28em; text-transform: uppercase; color: var(--tl-graphite-muted); opacity: 0.60; }

  /* ══ MOBILE BOTTOM TAB BAR ══ */
  .tl-bottom-tabs { display: none; }

  @media (max-width: 767px) {
    /* Content padding for tab bar + safe area */
    .tl-content {
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 84px);
    }
    .tl-content--hub {
      padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 84px) !important;
    }
    /* Hide decorative footer on mobile */
    .tl-bottom-band { display: none; }
    .tl-footer-caption { display: none; }

    /* Bottom tab bar */
    .tl-bottom-tabs {
      display: flex;
      justify-content: space-around;
      align-items: stretch;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 45;
      background: rgba(8, 11, 12, 0.94);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border-top: 1px solid rgba(200, 169, 106, 0.14);
      padding: 6px 4px calc(env(safe-area-inset-bottom, 0px) + 6px);
      box-shadow: 0 -6px 30px rgba(8,11,12,0.30);
    }

    .tl-tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex: 1;
      padding: 4px 2px;
      text-decoration: none;
      color: rgba(200,169,106,0.32);
      transition: color 0.15s;
      min-width: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .tl-tab-item.active { color: var(--tl-gold); }
    .tl-tab-item:active { opacity: 0.75; }

    .tl-tab-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px; height: 30px;
      border-radius: 10px;
      transition: background 0.15s;
    }
    .tl-tab-item.active .tl-tab-icon {
      background: rgba(200,169,106,0.12);
    }
    .tl-tab-label {
      font-size: 9.5px;
      font-weight: 700;
      font-family: 'Cairo', sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    /* Safe area for topbar on notched phones */
    .tl-topbar {
      padding-top: max(0px, env(safe-area-inset-top, 0px));
      height: calc(var(--tl-topbar-h) + max(0px, env(safe-area-inset-top, 0px)));
    }

    /* Smaller breadcrumb on mobile */
    .tl-bc-cur { max-width: 120px; font-size: 12.5px; }
    .tl-bc-root { display: none; }
    .tl-bc-sep { display: none; }
  }

  @media (max-width: 400px) {
    .tl-tab-label { font-size: 8.5px; }
    .tl-tab-icon { width: 34px; }
  }
`;
