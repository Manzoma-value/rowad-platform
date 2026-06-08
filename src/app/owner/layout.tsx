"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { cachedFetch } from "@/lib/api-cache";
import Image from "next/image";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  FileStack,
  Menu,
  LogOut,
  Sparkles,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Inline SVG components (replaces @/components/Mandala)
   keeping them self-contained so the file is drop-in ready
───────────────────────────────────────────── */

const r2 = (n: number) => Math.round(n * 1000) / 1000;

const STAR_LINES = Array.from({ length: 12 }, (_, i) => {
  const a1 = (i * 30 * Math.PI) / 180;
  const a2 = ((i * 30 + 15) * Math.PI) / 180;
  return {
    x1: r2(100 + 80 * Math.sin(a1)),
    y1: r2(100 - 80 * Math.cos(a1)),
    x2: r2(100 + 40 * Math.sin(a2)),
    y2: r2(100 - 40 * Math.cos(a2)),
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

function Mandala({
  size = 160,
  stroke = "rgba(200,169,106,0.32)",
  className = "",
}: {
  size?: number;
  stroke?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
    >
      <circle
        cx="100"
        cy="100"
        r="92"
        stroke={stroke}
        strokeWidth="0.4"
        opacity="0.55"
      />
      <circle
        cx="100"
        cy="100"
        r="80"
        stroke={stroke}
        strokeWidth="0.35"
        opacity="0.45"
      />
      {PETAL_CIRCLES.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r="52"
          stroke={stroke}
          strokeWidth="0.55"
          opacity="0.45"
          fill="none"
        />
      ))}
      <circle
        cx="100"
        cy="100"
        r="70"
        stroke={stroke}
        strokeWidth="0.45"
        opacity="0.55"
        strokeDasharray="2 7"
      />
      <circle
        cx="100"
        cy="100"
        r="58"
        stroke={stroke}
        strokeWidth="0.4"
        opacity="0.40"
      />
      <circle
        cx="100"
        cy="100"
        r="46"
        stroke={stroke}
        strokeWidth="0.45"
        opacity="0.55"
        strokeDasharray="4 5"
      />
      <circle
        cx="100"
        cy="100"
        r="34"
        stroke={stroke}
        strokeWidth="0.35"
        opacity="0.45"
      />
      <circle
        cx="100"
        cy="100"
        r="24"
        stroke={stroke}
        strokeWidth="0.45"
        opacity="0.60"
        strokeDasharray="3 4"
      />
      <circle
        cx="100"
        cy="100"
        r="14"
        stroke={stroke}
        strokeWidth="0.35"
        opacity="0.55"
      />
      <circle
        cx="100"
        cy="100"
        r="7"
        stroke={stroke}
        strokeWidth="0.55"
        opacity="0.70"
      />
      {STAR_LINES.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={stroke}
          strokeWidth="0.40"
          opacity="0.50"
        />
      ))}
      {INNER_PETALS.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r="24"
          stroke={stroke}
          strokeWidth="0.40"
          opacity="0.50"
          fill="none"
        />
      ))}
      <line
        x1="100"
        y1="68"
        x2="100"
        y2="132"
        stroke={stroke}
        strokeWidth="0.55"
        opacity="0.60"
      />
      <line
        x1="72"
        y1="84"
        x2="128"
        y2="116"
        stroke={stroke}
        strokeWidth="0.55"
        opacity="0.60"
      />
      <line
        x1="128"
        y1="84"
        x2="72"
        y2="116"
        stroke={stroke}
        strokeWidth="0.55"
        opacity="0.60"
      />
      <circle
        cx="100"
        cy="100"
        r="5"
        fill="none"
        stroke={stroke}
        strokeWidth="0.70"
        opacity="0.80"
      />
      <circle
        cx="100"
        cy="100"
        r="2.5"
        fill="none"
        stroke={stroke}
        strokeWidth="0.50"
        opacity="0.85"
      />
      <circle cx="100" cy="100" r="1.2" fill={stroke} opacity="0.90" />
    </svg>
  );
}

function GeoMark({
  size = 22,
  color = "var(--gold)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <circle
        cx="11"
        cy="11"
        r="9.5"
        stroke={color}
        strokeWidth="0.7"
        opacity="0.65"
      />
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke={color}
        strokeWidth="0.6"
        opacity="0.55"
      />
      <circle
        cx="11"
        cy="11"
        r="3.2"
        stroke={color}
        strokeWidth="0.55"
        opacity="0.65"
      />
      <line
        x1="11"
        y1="1"
        x2="11"
        y2="21"
        stroke={color}
        strokeWidth="0.45"
        opacity="0.40"
      />
      <line
        x1="1"
        y1="11"
        x2="21"
        y2="11"
        stroke={color}
        strokeWidth="0.45"
        opacity="0.40"
      />
      <line
        x1="3.7"
        y1="3.7"
        x2="18.3"
        y2="18.3"
        stroke={color}
        strokeWidth="0.35"
        opacity="0.28"
      />
      <line
        x1="18.3"
        y1="3.7"
        x2="3.7"
        y2="18.3"
        stroke={color}
        strokeWidth="0.35"
        opacity="0.28"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Nav items
───────────────────────────────────────────── */
interface NavItem {
  href: string;
  label: string;
  sublabel: string;
  exact?: boolean;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    href: "/owner",
    label: "لوحة التحكم",
    sublabel: "Overview",
    exact: true,
    icon: LayoutDashboard,
  },
  {
    href: "/owner/schools",
    label: "الجهات",
    sublabel: "Entities",
    icon: Building2,
  },
  {
    href: "/owner/intake-assessment",
    label: "اختبار القبول",
    sublabel: "Assessment",
    icon: ClipboardCheck,
  },
  {
    href: "/owner/submissions",
    label: "الطلبات المقدمة",
    sublabel: "Submissions",
    icon: FileStack,
  },
  {
    href: "/owner/admins",
    label: "المدراء والدعوات",
    sublabel: "Admins & Invites",
    icon: ShieldCheck,
  },
];

/* ─────────────────────────────────────────────
   Layout component
───────────────────────────────────────────── */
export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [ownerName, setOwnerName] = useState("المالك");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    cachedFetch<{ profile?: { full_name?: string; avatar_url?: string } }>(
      "/api/profile",
      600_000, // 10 min — owner profile rarely changes during a session
    )
      .then((d) => {
        if (d?.profile?.full_name) setOwnerName(d.profile.full_name);
        if (d?.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const current = navItems.find(isActive);
  const initial = ownerName.charAt(0);

  return (
    <div className="ow-shell" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="ow-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={`ow-sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Atmospheric glow */}
        <div className="ow-sidebar-glow" aria-hidden="true" />

        {/* ── Logo block ── */}
        <div className="ow-logo-block">
          <div className="ow-logo-icon">
            <GeoMark size={26} color="var(--gold)" />
          </div>
          <div className="ow-logo-text">
            <span className="ow-logo-name">بناء الأهلية</span>
            <span className="ow-logo-sub">Institutional Suite</span>
          </div>
        </div>

        {/* ── Gold rule ── */}
        <div className="ow-gold-rule" aria-hidden="true">
          <div className="ow-rule-line" />
          <div className="ow-rule-diamond" />
          <div className="ow-rule-dash" />
          <div className="ow-rule-diamond" />
          <div className="ow-rule-line" />
        </div>

        {/* ── Section label ── */}
        <div className="ow-section-label">القوائم الرئيسية · Main</div>

        {/* ── Navigation ── */}
        <nav className="ow-nav">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ow-nav-item ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {active && (
                  <>
                    <span className="ow-nav-pill" />
                    <span className="ow-nav-shimmer" />
                  </>
                )}

                <span className="ow-nav-icon-wrap">
                  <Icon size={17} strokeWidth={1.6} />
                </span>

                <span className="ow-nav-labels">
                  <span className="ow-nav-label-ar">{item.label}</span>
                  <span className="ow-nav-label-en">{item.sublabel}</span>
                </span>

                {active && <span className="ow-nav-dot" />}
              </Link>
            );
          })}

          {/* Mandala watermark inside nav scroll area */}
          <div className="ow-mandala-wrap" aria-hidden="true">
            <Mandala size={172} stroke="rgba(200,169,106,0.32)" />
          </div>
        </nav>

        {/* ── Footer rule ── */}
        <div className="ow-gold-rule ow-gold-rule--footer" aria-hidden="true">
          <div className="ow-rule-line" />
          <div className="ow-rule-diamond" />
          <div className="ow-rule-line" />
        </div>

        {/* ── User block ── */}
        <div className="ow-user-block">
          <Link
            href="/owner/profile"
            className="ow-user"
            style={{ textDecoration: "none" }}
          >
            <div className="ow-user-av">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={ownerName}
                  width={40}
                  height={40}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
              ) : (
                <span className="ow-user-initial">{initial}</span>
              )}
            </div>
            <div className="ow-user-info">
              <span className="ow-user-name">{ownerName}</span>
              <span className="ow-user-role">مالك النظام</span>
            </div>
            <button
              className="ow-logout-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
              }}
              title="تسجيل الخروج"
              type="button"
            >
              <LogOut size={15} strokeWidth={1.7} />
            </button>
          </Link>
        </div>
      </aside>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <div className="ow-main">
        {/* ── Topbar ── */}
        <header className="ow-topbar">
          {/* Gold top accent line */}
          <div className="ow-topbar-accent" aria-hidden="true" />

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="ow-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={20} strokeWidth={1.7} />
          </button>

          {/* Breadcrumb */}
          <div className="ow-breadcrumb-wrap">
            <div className="ow-breadcrumb-geo">
              <GeoMark size={18} color="var(--gold-deep)" />
            </div>
            <div className="ow-breadcrumb">
              <span className="ow-bc-cur">{current?.label ?? "الصفحة"}</span>
            </div>
          </div>

          <div className="ow-topbar-spacer" />

          {/* Right-side actions */}
          <div className="ow-topbar-actions">
            <div className="ow-topbar-divider" />

            {/* User pill */}
            <Link href="/owner/profile" className="ow-topbar-user-pill">
              <div className="ow-topbar-av">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={ownerName}
                    width={28}
                    height={28}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <span className="ow-topbar-initial">{initial}</span>
                )}
              </div>
              <span className="ow-topbar-name">{ownerName}</span>
            </Link>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="ow-content">
          {/* Corner watermark */}
          <div className="ow-watermark" aria-hidden="true">
            <Mandala size={260} stroke="var(--graphite)" />
          </div>
          <div className="ow-content-inner">{children}</div>
        </main>

        {/* ── Bottom band ── */}
        <div className="ow-bottom-band" aria-hidden="true">
          <svg
            viewBox="0 0 1200 80"
            preserveAspectRatio="none"
            width="100%"
            height="100%"
          >
            <line
              x1="0"
              y1="40"
              x2="1200"
              y2="40"
              stroke="rgba(200,169,106,0.25)"
              strokeWidth="0.5"
            />
            {Array.from({ length: 36 }).map((_, i) => (
              <circle
                key={i}
                cx={(i + 0.5) * (1200 / 36)}
                cy="40"
                r="1.2"
                fill="rgba(200,169,106,0.45)"
              />
            ))}
            <circle
              cx="600"
              cy="40"
              r="6"
              fill="none"
              stroke="rgba(200,169,106,0.55)"
              strokeWidth="0.7"
            />
            <circle
              cx="600"
              cy="40"
              r="14"
              fill="none"
              stroke="rgba(200,169,106,0.30)"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* ── Footer caption ── */}
        <div className="ow-footer-caption">
          <Sparkles size={11} className="ow-footer-sparkle" />
          <span className="ow-footer-text">جميع الحقوق محفوظة © منظومة - 2026</span>
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

  /* ── Keyframes ── */
  @keyframes ow-fadein  { from { opacity: 0 }               to { opacity: 1 } }
  @keyframes ow-slidein { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes ow-pulse   { 0%, 100% { opacity: 1 } 55% { opacity: 0.30 } }

  /* ── Design tokens ── */
  :root {
    --bg-main:      #F6F4EE;
    --bg-soft:      #FBFAF6;
    --bg-card:      #FFFDF8;
    --bg-muted:     #EFEAE1;

    --graphite:     #080B0C;
    --graphite-s:   #1A1D21;
    --graphite-muted: #5E5A52;
    --graphite-soft:  #8A8478;

    --gold:         #C8A96A;
    --gold-deep:    #B89B5E;
    --gold-soft:    #D8C28A;
    --gold-pale:    #EFE2BD;

    --burgundy:     #7A1E1E;

    --bdr-soft:     rgba(8,11,12,0.07);
    --bdr-med:      rgba(8,11,12,0.11);
    --bdr-gold:     rgba(200,169,106,0.38);

    --sidebar-w:    286px;
    --topbar-h:     68px;

    --font-heading: 'El Messiri', 'Cairo', serif;
    --font-mono:    'IBM Plex Mono', monospace;

    --ease-out:     cubic-bezier(0.22, 1, 0.36, 1);
  }

  html, body {
    direction: rtl;
    font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
    background:
      radial-gradient(ellipse at 12% 8%,  rgba(200,169,106,0.07), transparent 30%),
      radial-gradient(ellipse at 88% 85%, rgba(122,30,30,0.04),   transparent 32%),
      var(--bg-main);
    color: var(--graphite);
    -webkit-font-smoothing: antialiased;
  }

  ::selection { background: rgba(200,169,106,0.20); }

  /* ══ SHELL ══ */
  .ow-shell { display: flex; min-height: 100vh; width: 100%; }

  /* ══ OVERLAY ══ */
  .ow-overlay {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(8,11,12,0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: ow-fadein 0.22s ease;
  }

  /* ══ SIDEBAR ══ */
  .ow-sidebar {
    position: fixed; top: 0; right: 0;
    width: var(--sidebar-w); height: 100vh;
    z-index: 50;
    display: flex; flex-direction: column; overflow: hidden;
    border-left: 1px solid rgba(200,169,106,0.14);
    background: linear-gradient(180deg, #1E2329 0%, #181C21 50%, #11151A 100%);
    transition: transform 0.32s var(--ease-out);
    transform: translateX(0);
  }
  @media (max-width: 767px) {
    .ow-sidebar            { transform: translateX(100%); }
    .ow-sidebar.open       { transform: translateX(0); box-shadow: -22px 0 60px rgba(8,11,12,0.42); }
  }

  /* Atmospheric glow */
  .ow-sidebar-glow {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%,   rgba(200,169,106,0.12), transparent 55%),
      radial-gradient(ellipse at 50% 100%, rgba(122,30,30,0.04),   transparent 44%);
  }

  /* ── Logo block ── */
  .ow-logo-block {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 12px;
    padding: 28px 24px 20px;
  }
  .ow-logo-icon {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
    border: 1px solid rgba(200,169,106,0.30);
    background: linear-gradient(135deg, rgba(200,169,106,0.18), rgba(200,169,106,0.04));
  }
  .ow-logo-text {
    display: flex; flex-direction: column; gap: 2px; min-width: 0;
  }
  .ow-logo-name {
    font-family: var(--font-heading);
    font-size: 15px; font-weight: 700; letter-spacing: -0.01em;
    color: #FFFDF8; white-space: nowrap;
  }
  .ow-logo-sub {
    font-family: var(--font-mono);
    font-size: 9px; font-weight: 500;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(200,169,106,0.55);
  }

  /* ── Gold rule ── */
  .ow-gold-rule {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 6px;
    margin: 0 24px 16px;
  }
  .ow-gold-rule--footer { margin: 0 24px 16px; }
  .ow-rule-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.22), transparent);
  }
  .ow-rule-diamond {
    width: 4px; height: 4px; border-radius: 1px;
    background: rgba(200,169,106,0.50);
    transform: rotate(45deg); flex-shrink: 0;
  }
  .ow-rule-dash {
    width: 10px; height: 1px;
    background: rgba(200,169,106,0.38);
    flex-shrink: 0;
  }

  /* ── Section label ── */
  .ow-section-label {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 0 28px 12px;
    font-family: var(--font-mono);
    font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.24em; text-transform: uppercase;
    color: rgba(232, 220, 188, 0.45);
  }

  /* ── Nav ── */
  .ow-nav {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; gap: 3px;
    padding: 0 14px;
    flex: 1; overflow-y: auto;
  }
  .ow-nav::-webkit-scrollbar { display: none; }

  .ow-nav-item {
    position: relative;
    display: flex; align-items: center; gap: 12px;
    padding: 11px 13px;
    border-radius: 16px;
    text-decoration: none;
    border: 1px solid transparent;
    color: rgba(232, 220, 188, 0.72);
    transition: all 0.2s var(--ease-out);
    overflow: hidden;
  }
  .ow-nav-item:hover {
    background: rgba(232, 220, 188, 0.06);
    color: rgba(255, 248, 230, 0.95);
    border-color: rgba(200,169,106,0.16);
  }
  .ow-nav-item.active {
    background: linear-gradient(180deg, rgba(200,169,106,0.20), rgba(200,169,106,0.10));
    color: #F5E5BC;
    border-color: rgba(200,169,106,0.42);
    box-shadow:
      0 4px 14px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }

  /* Active right bar */
  .ow-nav-pill {
    position: absolute; right: 0; top: 8px; bottom: 8px;
    width: 3px; border-radius: 2px 0 0 2px;
    background: linear-gradient(180deg, var(--gold-soft), var(--gold-deep));
  }
  /* Active shimmer top line */
  .ow-nav-shimmer {
    position: absolute; top: 0; left: 14px; right: 14px; height: 1px;
    background: linear-gradient(to left, transparent, rgba(200,169,106,0.55), transparent);
  }

  /* Icon container */
  .ow-nav-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
    background: rgba(232, 220, 188, 0.06);
    border: 1px solid rgba(200,169,106,0.06);
    transition: all 0.18s;
  }
  .ow-nav-item:hover  .ow-nav-icon-wrap {
    background: rgba(232, 220, 188, 0.12);
    border-color: rgba(200,169,106,0.18);
  }
  .ow-nav-item.active .ow-nav-icon-wrap {
    background: linear-gradient(135deg, rgba(229,185,60,0.22), rgba(200,169,106,0.14));
    border-color: rgba(200,169,106,0.40);
  }

  /* Label group */
  .ow-nav-labels {
    flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;
  }
  .ow-nav-label-ar {
    font-size: 13.5px; font-weight: 700; line-height: 1.25;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ow-nav-label-en {
    font-family: var(--font-mono);
    font-size: 9.5px; font-weight: 500;
    letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.60;
  }

  /* Active dot */
  .ow-nav-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--gold);
    box-shadow: 0 0 8px rgba(200,169,106,0.7);
    flex-shrink: 0;
  }

  /* Mandala inside nav */
  .ow-mandala-wrap {
    margin-top: auto;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 0 12px;
    opacity: 0.70;
  }

  /* ── User block ── */
  .ow-user-block {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 0 14px 20px;
  }

  .ow-user {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: 16px;
    background: rgba(232,220,188,0.05);
    border: 1px solid rgba(200,169,106,0.20);
    cursor: pointer;
    transition: all 0.2s;
  }
  .ow-user:hover {
    background: rgba(232,220,188,0.10);
    border-color: rgba(200,169,106,0.35);
  }

  .ow-user-av {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--gold-soft), var(--gold-deep));
    font-family: var(--font-heading);
  }
  .ow-user-initial {
    font-size: 16px; font-weight: 900; color: var(--graphite);
    font-family: var(--font-heading);
  }

  .ow-user-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .ow-user-name {
    font-size: 13px; font-weight: 700; color: rgba(255,250,235,0.95);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ow-user-role {
    font-family: var(--font-mono);
    font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: rgba(200,169,106,0.70);
  }

  .ow-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: rgba(232,220,188,0.04);
    border: 1px solid rgba(200,169,106,0.10);
    cursor: pointer;
    color: rgba(232,220,188,0.65);
    transition: all 0.18s;
  }
  .ow-logout-btn:hover {
    background: rgba(200,169,106,0.15);
    color: var(--gold);
    border-color: rgba(200,169,106,0.32);
  }

  /* ══ MAIN ══ */
  .ow-main {
    flex: 1;
    display: flex; flex-direction: column; min-height: 100vh;
    margin-right: var(--sidebar-w);
  }
  @media (max-width: 767px) { .ow-main { margin-right: 0; } }

  /* ══ TOPBAR ══ */
  .ow-topbar {
    position: sticky; top: 0; z-index: 40;
    height: var(--topbar-h);
    display: flex; align-items: center; gap: 16px;
    padding: 0 20px;
    background: rgba(251,250,246,0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(8,11,12,0.07);
    box-shadow: 0 1px 0 rgba(8,11,12,0.04), 0 6px 24px rgba(8,11,12,0.025);
  }
  @media (min-width: 768px) { .ow-topbar { padding: 0 36px; } }

  /* Gold top accent line */
  .ow-topbar-accent {
    position: absolute; inset-x: 0; top: 0; height: 1.5px; pointer-events: none;
    background: linear-gradient(
      90deg, transparent,
      rgba(200,169,106,0.30) 15%,
      rgba(229,185,60,0.55) 50%,
      rgba(200,169,106,0.30) 85%,
      transparent
    );
  }

  /* Hamburger */
  .ow-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px;
    background: none; border: none; cursor: pointer;
    color: var(--graphite-muted);
    transition: all 0.15s; flex-shrink: 0;
  }
  .ow-hamburger:hover { background: rgba(200,169,106,0.10); color: var(--graphite); }
  @media (min-width: 768px) { .ow-hamburger { display: none; } }

  /* Breadcrumb */
  .ow-breadcrumb-wrap {
    display: flex; align-items: center; gap: 10px; flex: 1;
  }
  .ow-breadcrumb-geo {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
    border: 1px solid var(--bdr-soft);
    background: var(--bg-card); opacity: 0.90;
  }
  @media (min-width: 640px) { .ow-breadcrumb-geo { display: flex; } }

  .ow-breadcrumb {
    display: flex; align-items: center; gap: 8px;
  }
  .ow-bc-root {
    font-size: 12.5px; font-weight: 500;
    color: var(--graphite-muted);
  }
  .ow-bc-sep-icon {
    color: var(--graphite-muted); opacity: 0.38; flex-shrink: 0;
  }
  .ow-bc-cur {
    font-size: 13.5px; font-weight: 700; color: var(--graphite);
  }

  .ow-topbar-spacer { flex: 1; }

  /* Right actions */
  .ow-topbar-actions {
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }

  .ow-status {
    display: none; align-items: center; gap: 6px;
  }
  @media (min-width: 768px) { .ow-status { display: flex; } }
  .ow-status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(42,112,88,0.90);
    box-shadow: 0 0 0 3px rgba(42,112,88,0.18);
    animation: ow-pulse 2.8s ease-in-out infinite;
  }
  .ow-status-text {
    font-size: 11.5px; font-weight: 600; color: var(--graphite-muted);
  }

  .ow-topbar-divider {
    display: none; width: 1px; height: 20px;
    background: var(--bdr-med); opacity: 0.65;
  }
  @media (min-width: 768px) { .ow-topbar-divider { display: block; } }

  /* Bell button */
  .ow-bell-btn {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--bg-card); border: 1px solid var(--bdr-soft);
    cursor: pointer; color: var(--graphite-muted);
    transition: all 0.18s;
  }
  .ow-bell-btn:hover { border-color: var(--bdr-gold); color: var(--graphite); }
  @media (min-width: 768px) { .ow-bell-btn { display: flex; } }

  /* User pill */
  .ow-topbar-user-pill {
    display: none; align-items: center; gap: 8px;
    padding: 4px 12px 4px 4px;
    border-radius: 999px;
    border: 1px solid var(--bdr-soft);
    background: var(--bg-card);
    text-decoration: none;
    transition: all 0.18s var(--ease-out);
  }
  .ow-topbar-user-pill:hover {
    border-color: var(--bdr-gold);
    box-shadow: 0 4px 16px rgba(8,11,12,0.06);
  }
  @media (min-width: 768px) { .ow-topbar-user-pill { display: flex; } }

  .ow-topbar-av {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, var(--gold-soft), var(--gold-deep));
  }
  .ow-topbar-initial {
    font-size: 11px; font-weight: 900; color: var(--graphite);
    font-family: var(--font-heading);
  }
  .ow-topbar-name {
    font-size: 12.5px; font-weight: 700; color: var(--graphite);
    white-space: nowrap; padding-inline-start: 2px;
  }

  /* ══ CONTENT ══ */
  .ow-content {
    position: relative; flex: 1;
    padding: 28px 20px;
    animation: ow-slidein 0.42s var(--ease-out);
  }
  @media (min-width: 768px) { .ow-content { padding: 40px; } }

  /* Watermark */
  .ow-watermark {
    position: absolute; left: 24px; top: 24px;
    opacity: 0.04; pointer-events: none;
  }

  .ow-content-inner { position: relative; z-index: 10; }

  /* ══ BOTTOM BAND ══ */
  .ow-bottom-band {
    pointer-events: none; width: 100%; height: 80px; flex-shrink: 0;
    opacity: 0.60;
    mask-image: linear-gradient(to bottom, transparent, black 55%);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 55%);
  }

  /* ══ FOOTER CAPTION ══ */
  .ow-footer-caption {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding-bottom: 20px; padding-top: 4px;
  }
  .ow-footer-sparkle { color: var(--gold-deep); opacity: 0.60; }
  .ow-footer-text {
    font-family: var(--font-mono);
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.28em; text-transform: uppercase;
    color: var(--graphite-muted); opacity: 0.60;
  }
`;
