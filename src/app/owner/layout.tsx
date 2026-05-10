"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Image from "next/image";

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

const navItems = [
  {
    href: "/owner",
    label: "لوحة التحكم",
    exact: true,
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/owner/schools",
    label: "الجهات",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/owner/intake-assessment",
    label: "اختبار القبول",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    href: "/owner/submissions",
    label: "الطلبات المقدمة",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
        <path d="M12 11v6M9 14l3 3 3-3" />
      </svg>
    ),
  },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("المالك");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name)
        setOwnerName(user.user_metadata.full_name);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const currentLabel = navItems.find((n) => isActive(n))?.label ?? "الصفحة";

  return (
    <div className="ow-shell" dir="rtl">
      {sidebarOpen && (
        <div className="ow-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`ow-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="ow-sidebar-rule" />

        <div className="ow-logo-wrap">
          <Image
            src="/ahlia.png"
            alt="بناء الأهلية"
            width={2400}
            height={250}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "auto",
              display: "block",
            }}
            priority
          />
        </div>

        <div className="ow-divider">
          <div className="ow-divider-line" />
          <div className="ow-divider-diamond" />
          <div className="ow-divider-line" />
        </div>

        <nav className="ow-nav">
          <div className="ow-nav-section-label">القوائم الرئيسية</div>
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ow-nav-item ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {active && <div className="ow-nav-active-bar" />}
                <span className="ow-nav-icon">{item.icon}</span>
                <span className="ow-nav-text">{item.label}</span>
                {active && (
                  <span className="ow-nav-chevron">
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Enhanced Mandala */}
        <div className="ow-mandala" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            {/* Outer halos */}
            <circle
              cx="100"
              cy="100"
              r="92"
              stroke="#C8A96A"
              strokeWidth="0.3"
              opacity="0.05"
            />
            <circle
              cx="100"
              cy="100"
              r="86"
              stroke="#C8A96A"
              strokeWidth="0.3"
              opacity="0.04"
            />
            {/* 8-petal flower */}
            {PETAL_CIRCLES.map((p, i) => (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r="52"
                stroke="#C8A96A"
                strokeWidth="0.5"
                opacity="0.10"
                fill="none"
              />
            ))}
            {/* Concentric rings */}
            <circle
              cx="100"
              cy="100"
              r="74"
              stroke="#C8A96A"
              strokeWidth="0.4"
              opacity="0.13"
              strokeDasharray="3 8"
            />
            <circle
              cx="100"
              cy="100"
              r="62"
              stroke="#E5B93C"
              strokeWidth="0.35"
              opacity="0.10"
            />
            <circle
              cx="100"
              cy="100"
              r="50"
              stroke="#C8A96A"
              strokeWidth="0.5"
              opacity="0.15"
              strokeDasharray="5 5"
            />
            <circle
              cx="100"
              cy="100"
              r="38"
              stroke="#C8A96A"
              strokeWidth="0.35"
              opacity="0.12"
            />
            <circle
              cx="100"
              cy="100"
              r="28"
              stroke="#E5B93C"
              strokeWidth="0.45"
              opacity="0.18"
              strokeDasharray="3 4"
            />
            <circle
              cx="100"
              cy="100"
              r="18"
              stroke="#C8A96A"
              strokeWidth="0.35"
              opacity="0.20"
            />
            <circle
              cx="100"
              cy="100"
              r="9"
              stroke="#E5B93C"
              strokeWidth="0.55"
              opacity="0.26"
            />
            {/* 12-spoke radial lines */}
            {STAR_LINES.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="#C8A96A"
                strokeWidth="0.35"
                opacity="0.13"
              />
            ))}
            {/* Inner 4-petal rosette */}
            {INNER_PETALS.map((p, i) => (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r="24"
                stroke="#C8A96A"
                strokeWidth="0.45"
                opacity="0.16"
                fill="none"
              />
            ))}
            {/* 6-pointed star */}
            <line
              x1="100"
              y1="73"
              x2="100"
              y2="127"
              stroke="#E5B93C"
              strokeWidth="0.6"
              opacity="0.20"
            />
            <line
              x1="76"
              y1="87"
              x2="124"
              y2="113"
              stroke="#E5B93C"
              strokeWidth="0.6"
              opacity="0.20"
            />
            <line
              x1="124"
              y1="87"
              x2="76"
              y2="113"
              stroke="#E5B93C"
              strokeWidth="0.6"
              opacity="0.20"
            />
            {/* Center */}
            <circle
              cx="100"
              cy="100"
              r="7"
              fill="none"
              stroke="#E5B93C"
              strokeWidth="0.7"
              opacity="0.38"
            />
            <circle
              cx="100"
              cy="100"
              r="4"
              fill="none"
              stroke="#C8A96A"
              strokeWidth="0.45"
              opacity="0.45"
            />
            <circle cx="100" cy="100" r="2" fill="#E5B93C" opacity="0.55" />
          </svg>
        </div>

        <div className="ow-foot">
          <div className="ow-divider" style={{ margin: "0 0 14px" }}>
            <div className="ow-divider-line" />
            <div className="ow-divider-diamond" />
            <div className="ow-divider-line" />
          </div>
          <div className="ow-user">
            <div className="ow-user-av">{ownerName.charAt(0)}</div>
            <div className="ow-user-info">
              <span className="ow-user-name">{ownerName}</span>
              <span className="ow-user-role">مالك النظام</span>
            </div>
            <button
              className="ow-logout-btn"
              onClick={handleLogout}
              title="تسجيل الخروج"
            >
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="ow-main">
        <header className="ow-topbar">
          <button className="ow-hamburger" onClick={() => setSidebarOpen(true)}>
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ow-breadcrumb">
            <span className="ow-bc-home">الرئيسية</span>
            <div className="ow-bc-sep">
              <svg
                width="10"
                height="10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
            <span className="ow-bc-cur">{currentLabel}</span>
          </div>
          <div className="ow-topbar-spacer" />
        </header>

        <main className="ow-content">{children}</main>

        <div className="ow-bottom-band" aria-hidden="true">
          <svg
            viewBox="0 0 1200 120"
            fill="none"
            preserveAspectRatio="xMidYMax meet"
          >
            <line
              x1="0"
              y1="60"
              x2="1200"
              y2="60"
              stroke="#C8A96A"
              strokeWidth="0.3"
              opacity="0.15"
            />
            {Array.from({ length: 30 }).map((_, i) => (
              <polygon
                key={i}
                points={`${20 + i * 40},50 ${28 + i * 40},60 ${20 + i * 40},70 ${12 + i * 40},60`}
                stroke="#C8A96A"
                strokeWidth="0.4"
                fill="none"
                opacity={i % 3 === 0 ? 0.18 : 0.07}
              />
            ))}
            <polygon
              points="600,38 616,60 600,82 584,60"
              stroke="#C8A96A"
              strokeWidth="0.6"
              fill="none"
              opacity="0.25"
            />
            <polygon
              points="600,48 608,60 600,72 592,60"
              stroke="#C8A96A"
              strokeWidth="0.5"
              fill="#C8A96A"
              fillOpacity="0.04"
              opacity="0.3"
            />
            <line
              x1="540"
              y1="60"
              x2="575"
              y2="60"
              stroke="#C8A96A"
              strokeWidth="0.4"
              opacity="0.2"
            />
            <line
              x1="625"
              y1="60"
              x2="660"
              y2="60"
              stroke="#C8A96A"
              strokeWidth="0.4"
              opacity="0.2"
            />
            <circle cx="600" cy="60" r="3" fill="#C8A96A" opacity="0.3" />
          </svg>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes pulse   { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(26,107,60,0.4) } 70% { opacity: 0.8; box-shadow: 0 0 0 5px rgba(26,107,60,0) } }

  :root {
    --gold:      #C8A96A;
    --gold2:     #E5B93C;
    --gold3:     #F0D080;
    --gold-dim:  rgba(200,169,106,0.08);
    --gold-mid:  rgba(200,169,106,0.16);
    --gold-bdr:  rgba(200,169,106,0.22);
    --black:     #0A0A0B;
    --black2:    #111115;
    --off-white: #F6F3EE;
    --cream:     #EDE9E0;
    --text:      #0B0B0C;
    --text2:     #3E3526;
    --text3:     #8A7A5A;
    --surface:   #FFFFFF;
    --surface2:  #FAF8F4;
    --surface3:  #F3EEE5;
    --border:    #E2D9CA;
    --border2:   #CEC2AD;
    --success:   #1a6b3c;
    --success-bg:rgba(26,107,60,0.07);
    --warning:   #9a6200;
    --warning-bg:rgba(154,98,0,0.07);
    --danger:    #8b1a1a;
    --danger-bg: rgba(139,26,26,0.07);
    --radius:    10px;
    --shadow-sm: 0 1px 3px rgba(11,11,12,0.05);
    --shadow:    0 4px 16px rgba(11,11,12,0.08);
    --shadow-md: 0 8px 28px rgba(11,11,12,0.10);
    --sidebar-w: 268px;
    --topbar-h:  60px;
  }

  html, body {
    background: var(--off-white);
    color: var(--text);
    font-family: 'Cairo', sans-serif;
    direction: rtl;
  }

  .ow-shell { display: flex; min-height: 100vh; background: var(--off-white); }

  /* ── Sidebar ── */
  .ow-sidebar {
    width: var(--sidebar-w);
    min-height: 100vh;
    background: var(--black);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; right: 0;
    z-index: 50;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }
  .ow-sidebar::after {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 50% -5%, rgba(200,169,106,0.07) 0%, transparent 55%),
      radial-gradient(ellipse at 140% 110%, rgba(200,169,106,0.04) 0%, transparent 50%);
    pointer-events: none; z-index: 0;
  }
  .ow-sidebar-rule {
    position: absolute;
    top: 60px; bottom: 60px; left: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(200,169,106,0.25) 30%, rgba(200,169,106,0.25) 70%, transparent);
    z-index: 2;
  }

  .ow-logo-wrap {
    padding: 0;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; position: relative; z-index: 1;
  }

  .ow-divider {
    display: flex; align-items: center; gap: 0;
    margin: 14px 18px; flex-shrink: 0; position: relative; z-index: 1;
  }
  .ow-divider-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.18), transparent);
  }
  .ow-divider-diamond {
    width: 5px; height: 5px;
    background: rgba(200,169,106,0.3);
    transform: rotate(45deg); margin: 0 8px; flex-shrink: 0;
  }

  .ow-nav {
    display: flex; flex-direction: column; gap: 1px;
    padding: 0 10px; flex: 1; position: relative; z-index: 1;
  }
  .ow-nav-section-label {
    font-size: 9px; font-weight: 700;
    color: rgba(200,169,106,0.22);
    text-transform: uppercase; letter-spacing: 2px;
    padding: 0 10px 10px;
  }
  .ow-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 8px;
    text-decoration: none; color: rgba(200,169,106,0.38);
    font-size: 13px; font-weight: 600;
    transition: all 0.18s ease; position: relative;
    border: 1px solid transparent; overflow: hidden;
  }
  .ow-nav-item:hover { background: rgba(200,169,106,0.05); color: rgba(200,169,106,0.68); }
  .ow-nav-item.active {
    background: rgba(200,169,106,0.08); color: var(--gold);
    font-weight: 700; border-color: rgba(200,169,106,0.16);
  }
  .ow-nav-active-bar {
    position: absolute; right: 0; top: 6px; bottom: 6px;
    width: 2px;
    background: linear-gradient(180deg, var(--gold2), var(--gold));
    border-radius: 2px 0 0 2px;
  }
  .ow-nav-icon {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 7px; background: rgba(200,169,106,0.04);
    flex-shrink: 0; transition: background 0.18s;
  }
  .ow-nav-item:hover .ow-nav-icon,
  .ow-nav-item.active .ow-nav-icon { background: rgba(200,169,106,0.1); }
  .ow-nav-text { flex: 1; }
  .ow-nav-chevron { color: rgba(200,169,106,0.4); display: flex; align-items: center; }

  /* Mandala */
  .ow-mandala {
    width: 160px; height: 160px;
    margin: auto auto 0;
    flex-shrink: 0; position: relative; z-index: 0;
    opacity: 0.9;
    display: flex; align-items: center; justify-content: center;
  }
  .ow-mandala svg { width: 100%; height: 100%; }

  .ow-foot {
    padding: 0 10px 16px; flex-shrink: 0; position: relative; z-index: 1;
  }
  .ow-user {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 12px; border-radius: 9px;
    background: rgba(200,169,106,0.06);
    border: 1px solid rgba(200,169,106,0.12);
  }
  .ow-user-av {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--gold2), var(--gold));
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 900; color: var(--black);
  }
  .ow-user-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .ow-user-name {
    font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.9);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ow-user-role {
    font-size: 9px; color: rgba(200,169,106,0.4);
    font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
  }
  .ow-logout-btn {
    background: none; border: none; color: rgba(200,169,106,0.28);
    cursor: pointer; padding: 5px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .ow-logout-btn:hover { color: rgba(200,169,106,0.75); background: rgba(200,169,106,0.08); }

  /* ── Main ── */
  .ow-main {
    flex: 1; margin-right: var(--sidebar-w);
    display: flex; flex-direction: column; min-height: 100vh; position: relative;
  }
  .ow-topbar {
    height: var(--topbar-h); background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 36px; gap: 16px;
    position: sticky; top: 0; z-index: 40;
    box-shadow: 0 1px 0 var(--border), 0 2px 12px rgba(11,11,12,0.04);
  }
  .ow-topbar::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.4) 20%, rgba(229,185,60,0.5) 50%, rgba(200,169,106,0.4) 80%, transparent);
  }
  .ow-hamburger {
    display: none; background: none; border: none;
    color: var(--text2); cursor: pointer; padding: 4px; border-radius: 6px;
  }
  .ow-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .ow-bc-home { color: var(--text3); font-weight: 500; }
  .ow-bc-sep  { color: var(--text3); opacity: 0.4; display: flex; align-items: center; }
  .ow-bc-cur  { color: var(--text); font-weight: 700; }
  .ow-topbar-spacer { flex: 1; }

  .ow-content {
    padding: 36px 40px; flex: 1;
    background:
      radial-gradient(ellipse at 0% 0%, rgba(200,169,106,0.035) 0%, transparent 55%),
      radial-gradient(ellipse at 100% 100%, rgba(229,185,60,0.025) 0%, transparent 55%),
      var(--off-white);
    animation: fadeIn 0.3s ease;
  }

  .ow-bottom-band {
    width: 100%; height: 120px; pointer-events: none; flex-shrink: 0; opacity: 0.7;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 40%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 40%);
  }
  .ow-bottom-band svg { width: 100%; height: 100%; display: block; }

  .ow-overlay {
    position: fixed; inset: 0; background: rgba(10,10,11,0.6);
    z-index: 49; backdrop-filter: blur(3px); animation: fadeIn 0.2s ease;
  }

  @media (max-width: 768px) {
    .ow-sidebar { transform: translateX(100%); }
    .ow-sidebar.open { transform: translateX(0); box-shadow: -12px 0 48px rgba(10,10,11,0.45); }
    .ow-main { margin-right: 0; }
    .ow-hamburger { display: flex; }
    .ow-content { padding: 20px 18px; }
    .ow-topbar { padding: 0 18px; }
  }
`;
