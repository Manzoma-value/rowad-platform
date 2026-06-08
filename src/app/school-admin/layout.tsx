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
import { cachedFetch } from "@/lib/api-cache";
import { enforceTenantSubdomain } from "@/lib/enforce-subdomain";
import { TenantProvider, useTenant } from "@/lib/tenant-context";
import { featureForPath, type FeatureKey } from "@/lib/features";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileStack,
  MapPin,
  BarChart3,
  Mail,
  LayoutGrid,
  Globe2,
  Menu,
  LogOut,
  Bell,
  Sparkles,
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
  /** When set, the item is hidden unless the school has this feature enabled. */
  feature?: FeatureKey;
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
  const schoolSlugRef = useRef<string>("");

  const navItems: NavItem[] = [
    {
      href: "/school-admin", sublabel: "Dashboard", exact: true, icon: LayoutDashboard,
      label: lang === "ar" ? "الرئيسية" : lang === "sq" ? "Kryesore" : "Dashboard",
    },
    {
      href: "/school-admin/students", sublabel: "Students", exact: false, icon: Users,
      label: tr.students,
    },
    {
      href: "/school-admin/teachers", sublabel: "Teachers", exact: false, icon: GraduationCap,
      label: tr.teachers,
    },
    {
      href: "/school-admin/classes", sublabel: "Classes", exact: false, icon: BookOpen,
      label: tr.classes,
    },
    {
      href: "/school-admin/placement-assessment", sublabel: "Assessment", exact: false, icon: ClipboardCheck,
      label: tr.placementAssessment,
    },
    {
      href: "/school-admin/submissions", sublabel: "Submissions", exact: false, icon: FileStack,
      label: tr.submissions,
    },
    {
      href: "/school-admin/rowad", sublabel: "Rowad Model", exact: false, icon: LayoutGrid,
      label: lang === "ar" ? "النموذج التعليمي" : lang === "sq" ? "Modeli Edukativ" : "Educational Model",
    },
    {
      href: "/school-admin/roadmap", sublabel: "Roadmap", exact: false, icon: MapPin,
      label: lang === "ar" ? "الخريطة" : lang === "sq" ? "Rruga e Pyetjeve" : "Roadmap",
      feature: "roadmap",
    },
    {
      href: "/school-admin/reports", sublabel: "Reports", exact: false, icon: BarChart3,
      label: lang === "ar" ? "التقارير" : lang === "sq" ? "Raportet" : "Reports",
      feature: "reports",
    },
    {
      href: "/school-admin/invites", sublabel: "Invites", exact: false, icon: Mail,
      label: lang === "ar" ? "الدعوات" : lang === "sq" ? "Ftesa" : "Invites",
    },
  ];

  // ── Tenant feature flags ──
  const { hasFeature, loading: tenantLoading } = useTenant();
  const visibleNav = navItems.filter((i) => !i.feature || hasFeature(i.feature));
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
    cachedFetch<{ status?: string }>("/api/school-admin/me", 600_000)
      .then((d) => { if (d?.status === "deactivated") setDeactivated(true); })
      .catch(() => {});

    cachedFetch<any>("/api/school-admin/stats", 60_000)
      .then((d) => {
        if (d?.school) {
          setSchoolName(d.school.name ?? "");
          setSchoolNameAlt(d.school.name_alt ?? null);
          if (d.school?.slug) {
            schoolSlugRef.current = d.school.slug;
            enforceTenantSubdomain(d.school.slug);
          }
          // Admin layout only supports AR + EN. If the school's default is "sq"
          // we DON'T inherit it — we stick with AR as the default so the toggle
          // stays in sync with what's actually rendered.
          if (d.school.language) {
            const savedLang = localStorage.getItem("lang");
            const schoolLang = d.school.language;
            if (!savedLang && (schoolLang === "ar" || schoolLang === "en")) {
              setLang(schoolLang as "ar" | "en");
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

  async function handleLogout() {
    setLoggingOut(true);
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

  // ── Deactivated wall — replaces the entire UI ─────────────────────────────
  if (deactivated) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 20, textAlign: "center", padding: 32,
        fontFamily: "'Cairo', sans-serif", direction: "rtl",
        background: "radial-gradient(ellipse at 50% 0%, rgba(200,169,106,0.07), transparent 60%), #F6F4EE",
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#C8A96A" strokeWidth={1.2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0B0B0C", margin: 0 }}>
          {lang === "ar" ? "تم تعطيل حسابك" : "Llogaria juaj është çaktivizuar"}
        </h1>
        <p style={{ fontSize: 14, color: "#8A8478", maxWidth: 380, lineHeight: 1.7, margin: 0 }}>
          {lang === "ar"
            ? "تم تعطيل حساب المدير الخاص بك من قِبل المالك. تواصل مع مالك النظام لإعادة التفعيل."
            : "Llogaria juaj e administratorit është çaktivizuar nga pronari. Kontaktoni pronarin e sistemit për riaktivizim."}
        </p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 8, padding: "10px 28px", borderRadius: 10,
            background: "#0B0B0C", color: "#C8A96A", border: "1px solid rgba(200,169,106,0.3)",
            fontFamily: "'Cairo', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {lang === "ar" ? "تسجيل الخروج" : "Dalje"}
        </button>
      </div>
    );
  }

  return (
    <div className="sa-shell" dir={isRtl ? "rtl" : "ltr"}>
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
            <LangToggle dark secondaryLang="en" />
          </div>
        )}

        {/* Nav */}
        <nav className="sa-nav">
          {visibleNav.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sa-nav-item ${active ? "active" : ""}`}
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
            <Mandala size={172} stroke="rgba(200,169,106,0.32)" />
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
              <span className="sa-topbar-name">{name || (lang !== "ar" && schoolNameAlt && schoolNameAlt.trim() ? schoolNameAlt : schoolName)}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`sa-content${pathname === "/school-admin/hub" ? " sa-content--hub" : ""}`}>
          <div className="sa-watermark" aria-hidden="true">
            <Mandala size={260} stroke="var(--sa-graphite)" />
          </div>
          <div className="sa-content-inner">{children}</div>
        </main>

        {/* Bottom band */}
        <div className="sa-bottom-band" aria-hidden="true">
          <svg viewBox="0 0 1200 80" preserveAspectRatio="none" width="100%" height="100%">
            <line x1="0" y1="40" x2="1200" y2="40" stroke="rgba(200,169,106,0.25)" strokeWidth="0.5" />
            {Array.from({ length: 36 }).map((_, i) => (
              <circle key={i} cx={(i + 0.5) * (1200 / 36)} cy="40" r="1.2" fill="rgba(200,169,106,0.45)" />
            ))}
            <circle cx="600" cy="40" r="6" fill="none" stroke="rgba(200,169,106,0.55)" strokeWidth="0.7" />
            <circle cx="600" cy="40" r="14" fill="none" stroke="rgba(200,169,106,0.30)" strokeWidth="0.5" />
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
      </div>

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

  @keyframes sa-fadein  { from { opacity: 0 }               to { opacity: 1 } }
  @keyframes sa-slidein { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes sa-spin    { to { transform: rotate(360deg) } }

  :root {
    --sa-bg-main:        #F6F4EE;
    --sa-bg-soft:        #FBFAF6;
    --sa-bg-card:        #FFFDF8;

    --sa-graphite:       #080B0C;
    --sa-graphite-muted: #5E5A52;
    --sa-graphite-soft:  #8A8478;

    --sa-gold:           #C8A96A;
    --sa-gold-deep:      #B89B5E;
    --sa-gold-soft:      #D8C28A;

    --sa-bdr-soft:       rgba(8,11,12,0.07);
    --sa-bdr-med:        rgba(8,11,12,0.11);
    --sa-bdr-gold:       rgba(200,169,106,0.38);

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
      radial-gradient(ellipse at 12% 8%,  rgba(200,169,106,0.07), transparent 30%),
      radial-gradient(ellipse at 88% 85%, rgba(122,30,30,0.04),   transparent 32%),
      var(--sa-bg-main);
    color: var(--sa-graphite);
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: rgba(200,169,106,0.20); }

  /* ══ SHELL ══ */
  .sa-shell { display: flex; min-height: 100vh; width: 100%; }

  /* ══ OVERLAY ══ */
  .sa-overlay {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(8,11,12,0.55);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    animation: sa-fadein 0.22s ease;
  }

  /* ══ SIDEBAR ══ */
  .sa-sidebar {
    position: fixed; top: 0; inset-inline-start: 0;
    width: var(--sa-sidebar-w); height: 100vh;
    z-index: 50; display: flex; flex-direction: column; overflow: hidden;
    border-inline-end: 1px solid rgba(200,169,106,0.14);
    background: linear-gradient(180deg, #1E2329 0%, #181C21 50%, #11151A 100%);
    transition: transform 0.32s var(--sa-ease-out);
    transform: translateX(0);
  }
  @media (max-width: 767px) {
    [dir="rtl"] .sa-sidebar      { transform: translateX(100%); }
    [dir="rtl"] .sa-sidebar.open { transform: translateX(0); box-shadow: -22px 0 60px rgba(8,11,12,0.42); }
    [dir="ltr"] .sa-sidebar      { transform: translateX(-100%); }
    [dir="ltr"] .sa-sidebar.open { transform: translateX(0); box-shadow: 22px 0 60px rgba(8,11,12,0.42); }
  }

  .sa-sidebar-glow {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%,   rgba(200,169,106,0.12), transparent 55%),
      radial-gradient(ellipse at 50% 100%, rgba(122,30,30,0.05),   transparent 44%);
  }

  /* Logo */
  .sa-logo-block {
    position: relative; z-index: 10; flex-shrink: 0;
    width: 100%; height: 86px; overflow: hidden;
    background: #080B0C;
    border-top: 1.5px solid rgba(200,169,106,0.55);
    border-bottom: 1px solid rgba(200,169,106,0.20);
    box-shadow: 0 6px 28px rgba(200,169,106,0.07), inset 0 -1px 0 rgba(200,169,106,0.08);
  }
  .sa-logo-frame {
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background:
      linear-gradient(to right, rgba(8,11,12,0.65) 0%, transparent 26%, transparent 74%, rgba(8,11,12,0.65) 100%),
      linear-gradient(to bottom, transparent 50%, rgba(8,11,12,0.72) 100%);
  }
  .sa-close-btn {
    display: none; align-items: center; justify-content: center;
    position: absolute; top: 10px; inset-inline-end: 10px;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(8,11,12,0.55); border: none; cursor: pointer;
    color: rgba(200,169,106,0.70); transition: color 0.15s, background 0.15s;
    z-index: 2;
  }
  .sa-close-btn:hover { color: var(--sa-gold); background: rgba(8,11,12,0.80); }
  @media (max-width: 767px) { .sa-close-btn { display: flex; } }

  /* Gold rule */
  .sa-gold-rule {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 6px;
    margin: 0 20px 14px;
  }
  .sa-gold-rule--footer { margin: 0 20px 12px; }
  .sa-rule-line  { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,169,106,0.22), transparent); }
  .sa-rule-diamond { width: 4px; height: 4px; border-radius: 1px; background: rgba(200,169,106,0.50); transform: rotate(45deg); flex-shrink: 0; }
  .sa-rule-dash  { width: 10px; height: 1px; background: rgba(200,169,106,0.38); flex-shrink: 0; }

  /* Section label */
  .sa-section-label {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 0 24px 10px;
    font-family: var(--sa-font-mono); font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(232, 220, 188, 0.45);
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
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.15), transparent);
  }

  .sa-nav-item {
    position: relative; display: flex; align-items: center; gap: 11px;
    padding: 10px 12px; border-radius: 14px;
    text-decoration: none; border: 1px solid transparent;
    color: rgba(232, 220, 188, 0.70);
    transition: all 0.2s var(--sa-ease-out); overflow: hidden;
  }
  .sa-nav-item:hover {
    background: rgba(232, 220, 188, 0.06);
    color: rgba(255, 248, 230, 0.95);
    border-color: rgba(200,169,106,0.16);
  }
  .sa-nav-item.active {
    background: linear-gradient(180deg, rgba(200,169,106,0.18), rgba(200,169,106,0.08));
    color: #F5E5BC;
    border-color: rgba(200,169,106,0.42);
    box-shadow:
      0 4px 14px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .sa-nav-community { border-color: rgba(200,169,106,0.10); }
  .sa-nav-community:hover { border-color: rgba(200,169,106,0.22); }

  .sa-nav-pill    { position: absolute; inset-inline-end: 0; top: 7px; bottom: 7px; width: 3px; border-radius: 2px; background: linear-gradient(180deg, var(--sa-gold-soft), var(--sa-gold-deep)); }
  .sa-nav-shimmer { position: absolute; top: 0; left: 12px; right: 12px; height: 1px; background: linear-gradient(to left, transparent, rgba(200,169,106,0.55), transparent); }

  .sa-nav-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(232, 220, 188, 0.06);
    border: 1px solid rgba(200,169,106,0.06);
    transition: all 0.18s;
  }
  .sa-nav-item:hover  .sa-nav-icon-wrap {
    background: rgba(232, 220, 188, 0.12);
    border-color: rgba(200,169,106,0.18);
  }
  .sa-nav-item.active .sa-nav-icon-wrap {
    background: linear-gradient(135deg, rgba(229,185,60,0.22), rgba(200,169,106,0.14));
    border-color: rgba(200,169,106,0.40);
  }

  .sa-nav-labels     { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .sa-nav-label-main { font-size: 13.5px; font-weight: 700; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.01em; }
  .sa-nav-label-sub  { font-family: var(--sa-font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.6; line-height: 1.2; }
  .sa-nav-dot        { width: 6px; height: 6px; border-radius: 50%; background: var(--sa-gold); box-shadow: 0 0 8px rgba(200,169,106,0.6); flex-shrink: 0; }

  .sa-mandala-wrap { margin-top: auto; display: flex; align-items: center; justify-content: center; padding: 20px 0 10px; opacity: 0.70; }

  /* User block */
  .sa-user-block { position: relative; z-index: 10; flex-shrink: 0; padding: 0 14px 20px; }
  .sa-user {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: 16px;
    background: rgba(232,220,188,0.05);
    border: 1px solid rgba(200,169,106,0.20);
    transition: all 0.2s;
  }
  .sa-user:hover { background: rgba(232,220,188,0.10); border-color: rgba(200,169,106,0.35); }
  .sa-user-av {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--sa-gold-soft), var(--sa-gold-deep));
  }
  .sa-user-initial { font-size: 16px; font-weight: 900; color: var(--sa-graphite); font-family: var(--sa-font-heading); }
  .sa-user-info    { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sa-user-name    { font-size: 13px; font-weight: 700; color: rgba(255,250,235,0.95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sa-user-role    { font-family: var(--sa-font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(200,169,106,0.70); }

  .sa-user-clickable {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
    text-decoration: none; border-radius: 10px; transition: opacity 0.15s;
  }
  .sa-user-clickable:hover { opacity: 0.80; }

  .sa-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(232,220,188,0.04);
    border: 1px solid rgba(200,169,106,0.10);
    cursor: pointer;
    color: rgba(232,220,188,0.65); transition: all 0.18s;
  }
  .sa-logout-btn:hover:not(:disabled) { background: rgba(200,169,106,0.15); color: var(--sa-gold); border-color: rgba(200,169,106,0.32); }
  .sa-logout-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sa-spin { width: 13px; height: 13px; border: 2px solid rgba(200,169,106,0.15); border-top-color: var(--sa-gold); border-radius: 50%; animation: sa-spin 0.7s linear infinite; }

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
    border-bottom: 1px solid rgba(8,11,12,0.07);
    box-shadow: 0 1px 0 rgba(8,11,12,0.04), 0 6px 24px rgba(8,11,12,0.025);
  }
  @media (min-width: 768px) { .sa-topbar { padding: 0 36px; } }

  .sa-topbar-accent {
    position: absolute; inset-x: 0; top: 0; height: 1.5px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.30) 15%, rgba(229,185,60,0.55) 50%, rgba(200,169,106,0.30) 85%, transparent);
  }

  .sa-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px;
    background: none; border: none; cursor: pointer;
    color: var(--sa-graphite-muted); transition: all 0.15s; flex-shrink: 0;
  }
  .sa-hamburger:hover { background: rgba(200,169,106,0.10); color: var(--sa-graphite); }
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
  .sa-topbar-user-pill:hover { border-color: var(--sa-bdr-gold); box-shadow: 0 4px 16px rgba(8,11,12,0.06); }
  @media (min-width: 768px) { .sa-topbar-user-pill { display: flex; } }

  .sa-topbar-av {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--sa-gold-soft), var(--sa-gold-deep));
  }
  .sa-topbar-initial { font-size: 11px; font-weight: 900; color: var(--sa-graphite); font-family: var(--sa-font-heading); }
  .sa-topbar-name    { font-size: 12.5px; font-weight: 700; color: var(--sa-graphite); white-space: nowrap; padding-inline-start: 2px; }

  /* Content */
  .sa-content { position: relative; flex: 1; padding: 28px 20px; animation: sa-slidein 0.42s var(--sa-ease-out); }
  @media (min-width: 768px) { .sa-content { padding: 40px; } }
  .sa-content--hub { padding: 0 !important; }
  .sa-watermark    { position: absolute; left: 24px; top: 24px; opacity: 0.04; pointer-events: none; }
  .sa-content-inner { position: relative; z-index: 10; }

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
