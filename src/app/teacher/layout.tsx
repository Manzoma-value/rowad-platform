/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";
import LangToggle from "@/lib/LangToggle";
import { t } from "@/lib/translations";
import Image from "next/image";
import { cachedFetch } from "@/lib/api-cache";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  Globe2,
  Menu,
  LogOut,
  Bell,
  ChevronLeft,
  Sparkles,
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
  key: "dashboard" | "myClasses" | "quizzes" | "reports";
  sublabel: string;
  exact?: boolean;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/teacher",          key: "dashboard", sublabel: "Dashboard", exact: true,  icon: LayoutDashboard },
  { href: "/teacher/classes",  key: "myClasses", sublabel: "Classes",   exact: false, icon: Users },
  { href: "/teacher/quizzes",  key: "quizzes",   sublabel: "Quizzes",   exact: false, icon: ClipboardList },
  { href: "/teacher/reports",  key: "reports",   sublabel: "Reports",   exact: false, icon: BarChart3 },
];

const COMMUNITY_HREF = "/teacher/hub";

/* ─── Layout ─── */
export default function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const tr = t[lang];
  const isRtl = lang === "ar";

  const [name, setName] = useState("");
  const [initials, setInitials] = useState("م");
  const [schoolName, setSchoolName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [schoolLang, setSchoolLang] = useState("ar");
  const schoolSlugRef = useRef<string>("");

  useEffect(() => {
    cachedFetch<any>("/api/teacher", 300_000)
      .then((d) => {
        if (d?.school?.slug) schoolSlugRef.current = d.school.slug;
        if (d?.school?.name) setSchoolName(d.school.name);
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
          setSchoolLang(d.school.language ?? "ar");
          if (d.school.language && d.school.language !== "ar") setShowToggle(true);
        }
      })
      .catch(() => {});

    fetch("/api/profile")
      .then((r) => r.json())
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

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const currentLabel = (() => {
    if (isActive(COMMUNITY_HREF))
      return lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community";
    const found = navItems.find((item) => isActive(item.href, item.exact));
    return found ? tr[found.key] : (lang === "ar" ? "الصفحة" : "Faqja");
  })();

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
          <div className="tl-logo-icon">
            <GeoMark size={26} color="var(--tl-gold)" />
          </div>
          <div className="tl-logo-text">
            <Image
              src="/ahlia.png"
              alt="بناء الأهلية"
              width={140}
              height={32}
              style={{ objectFit: "contain", width: "auto", height: 28, display: "block" }}
              priority
            />
          </div>
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
          {navItems.map((item) => {
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
                  <span className="tl-nav-label-main">{tr[item.key]}</span>
                  <span className="tl-nav-label-sub">{item.sublabel}</span>
                </span>
                {active && <span className="tl-nav-dot" />}
              </Link>
            );
          })}

          {/* Community — visually separated */}
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
              <span className="tl-bc-root">{lang === "ar" ? "الرئيسية" : "Kryesore"}</span>
              <ChevronLeft size={13} strokeWidth={1.8} className="tl-bc-sep" />
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
              <span className="tl-topbar-name">{name || schoolName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="tl-content">
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
          <span className="tl-footer-text">منصة الرواد - 2026</span>
        </div>
      </div>

      {/* ═══════════════════ MOBILE BOTTOM TAB BAR ═══════════════════ */}
      <nav className="tl-bottom-tabs" dir={isRtl ? "rtl" : "ltr"} aria-label="Mobile navigation">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`tl-tab-item ${active ? "active" : ""}`}
            >
              <span className="tl-tab-icon"><Icon size={22} strokeWidth={1.6} /></span>
              <span className="tl-tab-label">{tr[item.key]}</span>
            </Link>
          );
        })}
        {(() => {
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
    border-inline-end: 1px solid rgba(200,169,106,0.10);
    background: linear-gradient(180deg, #0B0E10 0%, #060809 100%);
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
      radial-gradient(ellipse at 50% 0%,   rgba(200,169,106,0.09), transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(122,30,30,0.06),   transparent 44%);
  }

  /* Logo */
  .tl-logo-block {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 10px;
    padding: 22px 18px 18px;
  }
  .tl-logo-icon {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    border: 1px solid rgba(200,169,106,0.30);
    background: linear-gradient(135deg, rgba(200,169,106,0.18), rgba(200,169,106,0.04));
  }
  .tl-logo-text { flex: 1; min-width: 0; }
  .tl-close-btn {
    display: none; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    background: none; border: none; cursor: pointer;
    color: rgba(200,169,106,0.35); transition: color 0.15s;
  }
  .tl-close-btn:hover { color: var(--tl-gold); }
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
    font-family: var(--tl-font-mono); font-size: 9px; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase; color: rgba(200,169,106,0.32);
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
    padding: 9px 11px; border-radius: 14px;
    text-decoration: none; border: 1px solid transparent;
    color: rgba(200,169,106,0.38);
    transition: all 0.18s var(--tl-ease-out); overflow: hidden;
  }
  .tl-nav-item:hover  { background: rgba(200,169,106,0.05); color: rgba(200,169,106,0.65); border-color: rgba(200,169,106,0.07); }
  .tl-nav-item.active { background: rgba(255,253,248,0.06); color: var(--tl-gold); border-color: rgba(200,169,106,0.20); box-shadow: 0 8px 24px rgba(8,11,12,0.28); }

  .tl-nav-community { border-color: rgba(200,169,106,0.06); }
  .tl-nav-community:hover { border-color: rgba(200,169,106,0.14); }

  .tl-nav-pill    { position: absolute; inset-inline-end: 0; top: 7px; bottom: 7px; width: 3px; border-radius: 2px; background: linear-gradient(180deg, var(--tl-gold-soft), var(--tl-gold-deep)); }
  .tl-nav-shimmer { position: absolute; top: 0; left: 12px; right: 12px; height: 1px; background: linear-gradient(to left, transparent, rgba(200,169,106,0.55), transparent); }

  .tl-nav-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(200,169,106,0.04); transition: background 0.16s;
  }
  .tl-nav-item:hover  .tl-nav-icon-wrap,
  .tl-nav-item.active .tl-nav-icon-wrap { background: rgba(200,169,106,0.14); }

  .tl-nav-labels     { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .tl-nav-label-main { font-size: 13px; font-weight: 700; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-nav-label-sub  { font-family: var(--tl-font-mono); font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45; }
  .tl-nav-dot        { width: 5px; height: 5px; border-radius: 50%; background: var(--tl-gold); opacity: 0.65; flex-shrink: 0; }

  .tl-mandala-wrap { margin-top: auto; display: flex; align-items: center; justify-content: center; padding: 20px 0 10px; opacity: 0.70; }

  /* User block */
  .tl-user-block { position: relative; z-index: 10; flex-shrink: 0; padding: 0 14px 20px; }
  .tl-user {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 16px;
    background: rgba(200,169,106,0.06); border: 1px solid rgba(200,169,106,0.16);
    transition: background 0.18s, border-color 0.18s;
  }
  .tl-user:hover { background: rgba(200,169,106,0.11); border-color: rgba(200,169,106,0.26); }

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
  .tl-user-name    { font-size: 12.5px; font-weight: 700; color: rgba(255,253,248,0.90); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-user-role    { font-family: var(--tl-font-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(200,169,106,0.45); }

  .tl-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
    background: none; border: none; cursor: pointer;
    color: rgba(200,169,106,0.40); transition: all 0.15s;
  }
  .tl-logout-btn:hover:not(:disabled) { background: rgba(200,169,106,0.10); color: rgba(200,169,106,0.80); }
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
  .tl-topbar-name    { font-size: 12.5px; font-weight: 700; color: var(--tl-graphite); white-space: nowrap; padding-inline-start: 2px; }

  /* Content */
  .tl-content { position: relative; flex: 1; padding: 28px 20px; animation: tl-slidein 0.42s var(--tl-ease-out); }
  @media (min-width: 768px) { .tl-content { padding: 40px; } }
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
