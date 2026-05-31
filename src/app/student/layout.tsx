/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { cachedFetch } from "@/lib/api-cache";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";
import LangToggle from "@/lib/LangToggle";
import { t } from "@/lib/translations";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MapPin,
  Globe2,
  Menu,
  LogOut,
  Bell,
  ChevronLeft,
  Sparkles,
  X,
  LucideIcon,
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

function GeoMark({ size = 22, color = "var(--sl-gold)" }: { size?: number; color?: string }) {
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

/* ─── Onboarding config ─── */

const ONBOARDING_ROUTES: Record<string, string> = {
  PENDING_INTAKE: "/student/intake",
  INTAKE_SUBMITTED: "/student/waiting",
  SCHOOL_ASSIGNED: "/student/school-assigned",
  SCHOOL_PLACEMENT_SUBMITTED: "/student/waiting-class",
  CLASS_ASSIGNED: "/student/welcome",
};

const ALLOWED_PAGES: Record<string, string[]> = {
  PENDING_INTAKE: ["/student/intake"],
  INTAKE_SUBMITTED: ["/student/waiting"],
  SCHOOL_ASSIGNED: ["/student/school-assigned", "/student/placement"],
  SCHOOL_PLACEMENT_SUBMITTED: ["/student/waiting-class"],
  CLASS_ASSIGNED: [
    "/student/welcome",
    "/student",
    "/student/classes",
    "/student/quizzes",
    "/student/announcements",
    "/student/roadmap",
    "/student/hub",
    "/student/profile",
  ],
};

const SHOW_NAV_STATUSES = ["CLASS_ASSIGNED"];

/* ─── Nav ─── */
interface NavItem {
  key: "dashboard" | "myClass" | "quizzes" | "roadmap";
  href: string;
  exact: boolean;
  sublabel: string;
  labelAr?: string;
  labelSq?: string;
  labelEn?: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { key: "dashboard", href: "/student",          exact: true,  sublabel: "Dashboard", icon: LayoutDashboard },
  { key: "myClass",   href: "/student/classes",  exact: false, sublabel: "Classes",   icon: Users },
  { key: "quizzes",   href: "/student/quizzes",  exact: false, sublabel: "Quizzes",   icon: ClipboardList },
  {
    key: "roadmap", href: "/student/roadmap", exact: false, sublabel: "Roadmap",
    labelAr: "الخريطة", labelSq: "Banka e Pyetjeve", labelEn: "Question Bank",
    icon: MapPin,
  },
];

const COMMUNITY_HREF = "/student/hub";

/* ─── Layout ─── */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { lang, setLang } = useLang();
  const tr        = t[lang];
  const isRtl     = lang === "ar";

  const [name, setName]                   = useState("");
  const [initials, setInitials]           = useState("ط");
  const [schoolName, setSchoolName]       = useState("");
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [showToggle, setShowToggle]       = useState(false);
  const [schoolLang, setSchoolLang]       = useState("ar");
  const [checked, setChecked]             = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState("");
  const langInitialized = useRef(false);
  const schoolSlugRef   = useRef<string>("");

  const showFullNav = SHOW_NAV_STATUSES.includes(onboardingStatus);

  useEffect(() => {
    cachedFetch<any>("/api/student", 60_000)
      .then((data) => {
        if (data.error) { router.push("/login"); return; }

        if (data?.profile?.full_name) {
          setName(data.profile.full_name);
          setInitials(
            data.profile.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join(""),
          );
        }
        if (data?.school?.name) setSchoolName(data.school.name);
        if (data?.school?.slug) schoolSlugRef.current = data.school.slug;

        if (data.school?.language && !langInitialized.current) {
          langInitialized.current = true;
          const savedLang = localStorage.getItem("lang");
          if (!savedLang) setLang(data.school.language as "ar" | "sq" | "en");
          setSchoolLang(data.school.language ?? "ar");
          if (data.school.language && data.school.language !== "ar") setShowToggle(true);
        }

        const status: string = data.onboarding_status;
        setOnboardingStatus(status);

        const allowed = ALLOWED_PAGES[status];
        if (!allowed) { setChecked(true); return; }

        if (status === "CLASS_ASSIGNED") {
          const onDashboard = pathname === "/student" || pathname.startsWith("/student/");
          if (!onDashboard || pathname === "/student/school-assigned")
            router.push("/student/welcome");
          else setChecked(true);
          return;
        }

        const isAllowed = allowed.some((p) => p === pathname || pathname.startsWith(p + "/"));
        if (!isAllowed) router.push(ONBOARDING_ROUTES[status] ?? "/student");
        else setChecked(true);
      })
      .catch(() => router.push("/login"));

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d?.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => {});
  }, [pathname, router, setLang]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    const slug = schoolSlugRef.current;
    window.location.href = slug ? `/schools/${slug}` : "/login";
  }

  const getNavLabel = (item: NavItem) => {
    if (item.labelAr) {
      if (lang === "ar") return item.labelAr;
      if (lang === "sq") return item.labelSq!;
      return item.labelEn ?? item.labelAr;
    }
    return tr[item.key as keyof typeof tr] as string;
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const currentLabel = (() => {
    if (isActive(COMMUNITY_HREF))
      return lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community";
    const found = navItems.find((item) => isActive(item.href, item.exact));
    if (!found) return lang === "ar" ? "الصفحة" : "Faqja";
    return getNavLabel(found);
  })();

  /* ── Loading guard ── */
  if (!checked)
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F6F4EE" }}>
        <div style={{ width: 28, height: 28, border: "2.5px solid rgba(200,169,106,0.25)", borderTopColor: "#C8A96A", borderRadius: "50%", animation: "sl-spin 0.7s linear infinite" }} />
        <style>{`@keyframes sl-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  return (
    <div className="sl-shell" dir={isRtl ? "rtl" : "ltr"}>
      {sidebarOpen && (
        <div className="sl-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={`sl-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sl-sidebar-glow" aria-hidden="true" />

        {/* Logo */}
        <div className="sl-logo-block">
          <Image
            src="/ahlia.png"
            alt="بناء الأهلية"
            fill
            style={{ objectFit: "contain", objectPosition: "center" }}
            priority
          />
          <div className="sl-logo-frame" aria-hidden="true" />
          <button className="sl-close-btn" onClick={() => setSidebarOpen(false)} aria-label="إغلاق">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Gold rule */}
        <div className="sl-gold-rule" aria-hidden="true">
          <div className="sl-rule-line" />
          <div className="sl-rule-diamond" />
          <div className="sl-rule-dash" />
          <div className="sl-rule-diamond" />
          <div className="sl-rule-line" />
        </div>

        {/* Section label */}
        <div className="sl-section-label">
          {lang === "ar" ? "القوائم الرئيسية · Main" : lang === "sq" ? "Menuja Kryesore · Main" : "Main Menu"}
        </div>

        {showToggle && (
          <div style={{ padding: "0 14px 10px" }}>
            <LangToggle dark secondaryLang={schoolLang} />
          </div>
        )}

        {/* Nav — only shown when CLASS_ASSIGNED */}
        <nav className="sl-nav">
          {showFullNav && navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon   = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sl-nav-item ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {active && (<><span className="sl-nav-pill" /><span className="sl-nav-shimmer" /></>)}
                <span className="sl-nav-icon-wrap"><Icon size={17} strokeWidth={1.6} /></span>
                <span className="sl-nav-labels">
                  <span className="sl-nav-label-main">{getNavLabel(item)}</span>
                  <span className="sl-nav-label-sub">{item.sublabel}</span>
                </span>
                {active && <span className="sl-nav-dot" />}
              </Link>
            );
          })}

          {/* Community — visually separated */}
          {showFullNav && (
            <>
              <div className="sl-nav-sep" aria-hidden="true" />
              {(() => {
                const active = isActive(COMMUNITY_HREF);
                return (
                  <Link
                    href={COMMUNITY_HREF}
                    className={`sl-nav-item sl-nav-community ${active ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {active && (<><span className="sl-nav-pill" /><span className="sl-nav-shimmer" /></>)}
                    <span className="sl-nav-icon-wrap"><Globe2 size={17} strokeWidth={1.6} /></span>
                    <span className="sl-nav-labels">
                      <span className="sl-nav-label-main">
                        {lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community"}
                      </span>
                      <span className="sl-nav-label-sub">Community</span>
                    </span>
                    {active && <span className="sl-nav-dot" />}
                  </Link>
                );
              })()}
            </>
          )}

          <div className="sl-mandala-wrap" aria-hidden="true">
            <Mandala size={172} stroke="rgba(200,169,106,0.32)" />
          </div>
        </nav>

        {/* Footer rule */}
        <div className="sl-gold-rule sl-gold-rule--footer" aria-hidden="true">
          <div className="sl-rule-line" />
          <div className="sl-rule-diamond" />
          <div className="sl-rule-line" />
        </div>

        {/* User block */}
        <div className="sl-user-block">
          <div className="sl-user">
            <Link
              href="/student/profile"
              className="sl-user-clickable"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="sl-user-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={40}
                    height={40}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                  />
                ) : (
                  <span className="sl-user-initial">{initials}</span>
                )}
              </div>
              <div className="sl-user-info">
                <span className="sl-user-name">
                  {name || (lang === "ar" ? "الطالب" : "Nxënësi")}
                </span>
                <span className="sl-user-role">
                  {lang === "ar" ? "طالب" : lang === "sq" ? "Nxënës" : "Student"}
                </span>
              </div>
            </Link>
            <button
              className="sl-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title={lang === "ar" ? "تسجيل الخروج" : "Dalje"}
              type="button"
            >
              {loggingOut ? <div className="sl-spin" /> : <LogOut size={15} strokeWidth={1.7} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <div className="sl-main" dir={isRtl ? "rtl" : "ltr"}>
        {/* Topbar */}
        <header className="sl-topbar">
          <div className="sl-topbar-accent" aria-hidden="true" />
          <button
            type="button"
            className="sl-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={20} strokeWidth={1.7} />
          </button>

          <div className="sl-breadcrumb-wrap">
            <div className="sl-breadcrumb-geo">
              <GeoMark size={18} color="var(--sl-gold-deep)" />
            </div>
            <div className="sl-breadcrumb">
              <span className="sl-bc-root">{lang === "ar" ? "الرئيسية" : "Kryesore"}</span>
              <ChevronLeft size={13} strokeWidth={1.8} className="sl-bc-sep" />
              <span className="sl-bc-cur">{currentLabel}</span>
            </div>
          </div>

          <div className="sl-topbar-spacer" />

          <div className="sl-topbar-actions">
            <div className="sl-topbar-divider" />
            <button type="button" className="sl-bell-btn" aria-label="الإشعارات">
              <Bell size={15} strokeWidth={1.7} />
            </button>
            <div className="sl-topbar-user-pill">
              <div className="sl-topbar-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={28}
                    height={28}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  <span className="sl-topbar-initial">{initials}</span>
                )}
              </div>
              <span className="sl-topbar-name">{name || schoolName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`sl-content${pathname === "/student/hub" ? " sl-content--hub" : ""}`}>
          <div className="sl-watermark" aria-hidden="true">
            <Mandala size={260} stroke="var(--sl-graphite)" />
          </div>
          <div className="sl-content-inner">{children}</div>
        </main>

        {/* Bottom band */}
        <div className="sl-bottom-band" aria-hidden="true">
          <svg viewBox="0 0 1200 80" preserveAspectRatio="none" width="100%" height="100%">
            <line x1="0" y1="40" x2="1200" y2="40" stroke="rgba(200,169,106,0.25)" strokeWidth="0.5" />
            {Array.from({ length: 36 }).map((_, i) => (
              <circle key={i} cx={(i + 0.5) * (1200 / 36)} cy="40" r="1.2" fill="rgba(200,169,106,0.45)" />
            ))}
            <circle cx="600" cy="40" r="6" fill="none" stroke="rgba(200,169,106,0.55)" strokeWidth="0.7" />
            <circle cx="600" cy="40" r="14" fill="none" stroke="rgba(200,169,106,0.30)" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="sl-footer-caption">
          <Sparkles size={11} className="sl-footer-sparkle" />
          <span className="sl-footer-text">منصة الرواد - 2026</span>
        </div>
      </div>

      {/* ═══════════════════ MOBILE BOTTOM TAB BAR ═══════════════════ */}
      {showFullNav && (
        <nav className="sl-bottom-tabs" dir={isRtl ? "rtl" : "ltr"} aria-label="Mobile navigation">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sl-tab-item ${active ? "active" : ""}`}
              >
                <span className="sl-tab-icon"><Icon size={22} strokeWidth={1.6} /></span>
                <span className="sl-tab-label">{getNavLabel(item)}</span>
              </Link>
            );
          })}
          {(() => {
            const active = isActive(COMMUNITY_HREF);
            return (
              <Link href={COMMUNITY_HREF} className={`sl-tab-item ${active ? "active" : ""}`}>
                <span className="sl-tab-icon"><Globe2 size={22} strokeWidth={1.6} /></span>
                <span className="sl-tab-label">
                  {lang === "ar" ? "المجتمع" : lang === "sq" ? "Hub" : "Hub"}
                </span>
              </Link>
            );
          })()}
        </nav>
      )}

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

  @keyframes sl-fadein  { from { opacity: 0 }               to { opacity: 1 } }
  @keyframes sl-slidein { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes sl-spin    { to { transform: rotate(360deg) } }

  :root {
    --sl-bg-main:        #F6F4EE;
    --sl-bg-soft:        #FBFAF6;
    --sl-bg-card:        #FFFDF8;

    --sl-graphite:       #080B0C;
    --sl-graphite-muted: #5E5A52;
    --sl-graphite-soft:  #8A8478;

    --sl-gold:           #C8A96A;
    --sl-gold-deep:      #B89B5E;
    --sl-gold-soft:      #D8C28A;

    --sl-bdr-soft:       rgba(8,11,12,0.07);
    --sl-bdr-med:        rgba(8,11,12,0.11);
    --sl-bdr-gold:       rgba(200,169,106,0.38);

    --sl-sidebar-w:      286px;
    --sl-topbar-h:       68px;

    --sl-font-heading:   'El Messiri', 'Cairo', serif;
    --sl-font-mono:      'IBM Plex Mono', monospace;
    --sl-font:           'Cairo', 'IBM Plex Sans Arabic', sans-serif;

    --sl-ease-out:       cubic-bezier(0.22, 1, 0.36, 1);
  }

  html, body {
    font-family: var(--sl-font);
    background:
      radial-gradient(ellipse at 12% 8%,  rgba(200,169,106,0.07), transparent 30%),
      radial-gradient(ellipse at 88% 85%, rgba(122,30,30,0.04),   transparent 32%),
      var(--sl-bg-main);
    color: var(--sl-graphite);
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: rgba(200,169,106,0.20); }

  /* ══ SHELL ══ */
  .sl-shell { display: flex; min-height: 100vh; width: 100%; }

  /* ══ OVERLAY ══ */
  .sl-overlay {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(8,11,12,0.55);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    animation: sl-fadein 0.22s ease;
  }

  /* ══ SIDEBAR ══ */
  .sl-sidebar {
    position: fixed; top: 0; inset-inline-start: 0;
    width: var(--sl-sidebar-w); height: 100vh;
    z-index: 50; display: flex; flex-direction: column; overflow: hidden;
    border-inline-end: 1px solid rgba(200,169,106,0.10);
    background: linear-gradient(180deg, #0B0E10 0%, #060809 100%);
    transition: transform 0.32s var(--sl-ease-out);
    transform: translateX(0);
  }
  @media (max-width: 767px) {
    [dir="rtl"] .sl-sidebar      { transform: translateX(100%); }
    [dir="rtl"] .sl-sidebar.open { transform: translateX(0); box-shadow: -22px 0 60px rgba(8,11,12,0.42); }
    [dir="ltr"] .sl-sidebar      { transform: translateX(-100%); }
    [dir="ltr"] .sl-sidebar.open { transform: translateX(0); box-shadow: 22px 0 60px rgba(8,11,12,0.42); }
  }

  .sl-sidebar-glow {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%,   rgba(200,169,106,0.09), transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(122,30,30,0.06),   transparent 44%);
  }

  /* Logo */
  .sl-logo-block {
    position: relative; z-index: 10; flex-shrink: 0;
    width: 100%; height: 86px; overflow: hidden;
    background: #080B0C;
    border-top: 1.5px solid rgba(200,169,106,0.55);
    border-bottom: 1px solid rgba(200,169,106,0.20);
    box-shadow: 0 6px 28px rgba(200,169,106,0.07), inset 0 -1px 0 rgba(200,169,106,0.08);
  }
  .sl-logo-frame {
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background:
      linear-gradient(to right, rgba(8,11,12,0.65) 0%, transparent 26%, transparent 74%, rgba(8,11,12,0.65) 100%),
      linear-gradient(to bottom, transparent 50%, rgba(8,11,12,0.72) 100%);
  }
  .sl-logo-frame::before {
    content: ''; position: absolute; top: 7px; left: 10px;
    width: 16px; height: 16px;
    border-top: 1.5px solid rgba(200,169,106,0.75);
    border-left: 1.5px solid rgba(200,169,106,0.75);
  }
  .sl-logo-frame::after {
    content: ''; position: absolute; top: 7px; right: 10px;
    width: 16px; height: 16px;
    border-top: 1.5px solid rgba(200,169,106,0.75);
    border-right: 1.5px solid rgba(200,169,106,0.75);
  }
  .sl-close-btn {
    display: none; align-items: center; justify-content: center;
    position: absolute; top: 10px; inset-inline-end: 10px;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(8,11,12,0.55); border: none; cursor: pointer;
    color: rgba(200,169,106,0.70); transition: color 0.15s, background 0.15s;
    z-index: 2;
  }
  .sl-close-btn:hover { color: var(--sl-gold); background: rgba(8,11,12,0.80); }
  @media (max-width: 767px) { .sl-close-btn { display: flex; } }

  /* Gold rule */
  .sl-gold-rule {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 6px;
    margin: 0 20px 14px;
  }
  .sl-gold-rule--footer { margin: 0 20px 12px; }
  .sl-rule-line    { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,169,106,0.22), transparent); }
  .sl-rule-diamond { width: 4px; height: 4px; border-radius: 1px; background: rgba(200,169,106,0.50); transform: rotate(45deg); flex-shrink: 0; }
  .sl-rule-dash    { width: 10px; height: 1px; background: rgba(200,169,106,0.38); flex-shrink: 0; }

  /* Section label */
  .sl-section-label {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 0 24px 10px;
    font-family: var(--sl-font-mono); font-size: 9px; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase; color: rgba(200,169,106,0.32);
  }

  /* Nav */
  .sl-nav {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; gap: 2px;
    padding: 0 12px; flex: 1; overflow-y: auto;
  }
  .sl-nav::-webkit-scrollbar { display: none; }

  .sl-nav-sep {
    height: 1px; margin: 8px 8px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.15), transparent);
  }

  .sl-nav-item {
    position: relative; display: flex; align-items: center; gap: 11px;
    padding: 9px 11px; border-radius: 14px;
    text-decoration: none; border: 1px solid transparent;
    color: rgba(200,169,106,0.38);
    transition: all 0.18s var(--sl-ease-out); overflow: hidden;
  }
  .sl-nav-item:hover  { background: rgba(200,169,106,0.05); color: rgba(200,169,106,0.65); border-color: rgba(200,169,106,0.07); }
  .sl-nav-item.active { background: rgba(255,253,248,0.06); color: var(--sl-gold); border-color: rgba(200,169,106,0.20); box-shadow: 0 8px 24px rgba(8,11,12,0.28); }

  .sl-nav-community { border-color: rgba(200,169,106,0.06); }
  .sl-nav-community:hover { border-color: rgba(200,169,106,0.14); }

  .sl-nav-pill    { position: absolute; inset-inline-end: 0; top: 7px; bottom: 7px; width: 3px; border-radius: 2px; background: linear-gradient(180deg, var(--sl-gold-soft), var(--sl-gold-deep)); }
  .sl-nav-shimmer { position: absolute; top: 0; left: 12px; right: 12px; height: 1px; background: linear-gradient(to left, transparent, rgba(200,169,106,0.55), transparent); }

  .sl-nav-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(200,169,106,0.04); transition: background 0.16s;
  }
  .sl-nav-item:hover  .sl-nav-icon-wrap,
  .sl-nav-item.active .sl-nav-icon-wrap { background: rgba(200,169,106,0.14); }

  .sl-nav-labels     { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .sl-nav-label-main { font-size: 13px; font-weight: 700; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sl-nav-label-sub  { font-family: var(--sl-font-mono); font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45; }
  .sl-nav-dot        { width: 5px; height: 5px; border-radius: 50%; background: var(--sl-gold); opacity: 0.65; flex-shrink: 0; }

  .sl-mandala-wrap { margin-top: auto; display: flex; align-items: center; justify-content: center; padding: 20px 0 10px; opacity: 0.70; }

  /* User block */
  .sl-user-block { position: relative; z-index: 10; flex-shrink: 0; padding: 0 14px 20px; }
  .sl-user {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 16px;
    background: rgba(200,169,106,0.06); border: 1px solid rgba(200,169,106,0.16);
    transition: background 0.18s, border-color 0.18s;
  }
  .sl-user:hover { background: rgba(200,169,106,0.11); border-color: rgba(200,169,106,0.26); }

  .sl-user-clickable {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
    text-decoration: none; border-radius: 10px; transition: opacity 0.15s;
  }
  .sl-user-clickable:hover { opacity: 0.80; }

  .sl-user-av {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--sl-gold-soft), var(--sl-gold-deep));
  }
  .sl-user-initial { font-size: 16px; font-weight: 900; color: var(--sl-graphite); font-family: var(--sl-font-heading); }
  .sl-user-info    { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sl-user-name    { font-size: 12.5px; font-weight: 700; color: rgba(255,253,248,0.90); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sl-user-role    { font-family: var(--sl-font-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(200,169,106,0.45); }

  .sl-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
    background: none; border: none; cursor: pointer;
    color: rgba(200,169,106,0.40); transition: all 0.15s;
  }
  .sl-logout-btn:hover:not(:disabled) { background: rgba(200,169,106,0.10); color: rgba(200,169,106,0.80); }
  .sl-logout-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sl-spin { width: 13px; height: 13px; border: 2px solid rgba(200,169,106,0.15); border-top-color: var(--sl-gold); border-radius: 50%; animation: sl-spin 0.7s linear infinite; }

  /* ══ MAIN ══ */
  .sl-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; margin-inline-start: var(--sl-sidebar-w); }
  @media (max-width: 767px) { .sl-main { margin-inline-start: 0; } }

  /* Topbar */
  .sl-topbar {
    position: sticky; top: 0; z-index: 40;
    height: var(--sl-topbar-h); display: flex; align-items: center; gap: 14px;
    padding: 0 20px;
    background: rgba(251,250,246,0.82);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(8,11,12,0.07);
    box-shadow: 0 1px 0 rgba(8,11,12,0.04), 0 6px 24px rgba(8,11,12,0.025);
  }
  @media (min-width: 768px) { .sl-topbar { padding: 0 36px; } }

  .sl-topbar-accent {
    position: absolute; inset-x: 0; top: 0; height: 1.5px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.30) 15%, rgba(229,185,60,0.55) 50%, rgba(200,169,106,0.30) 85%, transparent);
  }

  .sl-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px;
    background: none; border: none; cursor: pointer;
    color: var(--sl-graphite-muted); transition: all 0.15s; flex-shrink: 0;
  }
  .sl-hamburger:hover { background: rgba(200,169,106,0.10); color: var(--sl-graphite); }
  @media (min-width: 768px) { .sl-hamburger { display: none; } }

  .sl-breadcrumb-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
  .sl-breadcrumb-geo  {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
    border: 1px solid var(--sl-bdr-soft); background: var(--sl-bg-card); opacity: 0.90;
  }
  @media (min-width: 640px) { .sl-breadcrumb-geo { display: flex; } }
  .sl-breadcrumb { display: flex; align-items: center; gap: 8px; }
  .sl-bc-root { font-size: 12.5px; font-weight: 500; color: var(--sl-graphite-muted); white-space: nowrap; }
  .sl-bc-sep  { color: var(--sl-graphite-muted); opacity: 0.38; flex-shrink: 0; }
  .sl-bc-cur  { font-size: 13.5px; font-weight: 700; color: var(--sl-graphite); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sl-topbar-spacer { flex: 1; }

  .sl-topbar-actions  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .sl-topbar-divider  { display: none; width: 1px; height: 20px; background: var(--sl-bdr-med); opacity: 0.65; }
  @media (min-width: 768px) { .sl-topbar-divider { display: block; } }

  .sl-bell-btn {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--sl-bg-card); border: 1px solid var(--sl-bdr-soft);
    cursor: pointer; color: var(--sl-graphite-muted); transition: all 0.18s;
  }
  .sl-bell-btn:hover { border-color: var(--sl-bdr-gold); color: var(--sl-graphite); }
  @media (min-width: 768px) { .sl-bell-btn { display: flex; } }

  .sl-topbar-user-pill {
    display: none; align-items: center; gap: 8px;
    padding: 4px 12px 4px 4px; border-radius: 999px;
    border: 1px solid var(--sl-bdr-soft); background: var(--sl-bg-card);
    transition: all 0.18s var(--sl-ease-out);
  }
  .sl-topbar-user-pill:hover { border-color: var(--sl-bdr-gold); box-shadow: 0 4px 16px rgba(8,11,12,0.06); }
  @media (min-width: 768px) { .sl-topbar-user-pill { display: flex; } }

  .sl-topbar-av {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--sl-gold-soft), var(--sl-gold-deep));
  }
  .sl-topbar-initial { font-size: 11px; font-weight: 900; color: var(--sl-graphite); font-family: var(--sl-font-heading); }
  .sl-topbar-name    { font-size: 12.5px; font-weight: 700; color: var(--sl-graphite); white-space: nowrap; padding-inline-start: 2px; }

  /* Content */
  .sl-content { position: relative; flex: 1; padding: 28px 20px; animation: sl-slidein 0.42s var(--sl-ease-out); }
  @media (min-width: 768px) { .sl-content { padding: 40px; } }
  .sl-content--hub { padding: 0 !important; }
  .sl-watermark     { position: absolute; left: 24px; top: 24px; opacity: 0.04; pointer-events: none; }
  .sl-content-inner { position: relative; z-index: 10; height: 100%; }

  /* Bottom band */
  .sl-bottom-band {
    pointer-events: none; width: 100%; height: 80px; flex-shrink: 0;
    opacity: 0.60;
    mask-image: linear-gradient(to bottom, transparent, black 55%);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 55%);
  }

  /* Footer caption */
  .sl-footer-caption { display: flex; align-items: center; justify-content: center; gap: 8px; padding-bottom: 20px; padding-top: 4px; }
  .sl-footer-sparkle { color: var(--sl-gold-deep); opacity: 0.60; }
  .sl-footer-text    { font-family: var(--sl-font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.28em; text-transform: uppercase; color: var(--sl-graphite-muted); opacity: 0.60; }

  /* ══ MOBILE BOTTOM TAB BAR ══ */
  .sl-bottom-tabs { display: none; }

  @media (max-width: 767px) {
    /* Content padding for tab bar + safe area */
    .sl-content {
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 72px);
    }
    .sl-content--hub {
      padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 72px) !important;
    }
    /* Hide decorative bottom band on mobile (tab bar replaces it) */
    .sl-bottom-band { display: none; }
    .sl-footer-caption { display: none; }

    /* Bottom tab bar */
    .sl-bottom-tabs {
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

    .sl-tab-item {
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
    .sl-tab-item.active { color: var(--sl-gold); }
    .sl-tab-item:active { opacity: 0.75; }

    .sl-tab-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px; height: 30px;
      border-radius: 10px;
      transition: background 0.15s;
    }
    .sl-tab-item.active .sl-tab-icon {
      background: rgba(200,169,106,0.12);
    }
    .sl-tab-label {
      font-size: 9.5px;
      font-weight: 700;
      font-family: 'Cairo', sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    /* Safe area for topbar on notched phones */
    .sl-topbar {
      padding-top: max(0px, env(safe-area-inset-top, 0px));
      height: calc(var(--sl-topbar-h) + max(0px, env(safe-area-inset-top, 0px)));
    }

    /* Smaller breadcrumb on mobile */
    .sl-bc-cur { max-width: 120px; font-size: 12.5px; }
    .sl-bc-root { display: none; }
    .sl-bc-sep { display: none; }
  }

  @media (max-width: 400px) {
    .sl-tab-label { font-size: 8.5px; }
    .sl-tab-icon { width: 34px; }
  }
`;
