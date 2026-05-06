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

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("م");
  const [schoolName, setSchoolName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [schoolLang, setSchoolLang] = useState("ar");
  const schoolSlugRef = useRef<string>("");
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const tr = t[lang];
  const isRtl = lang === "ar";

  const navItems = [
    {
      href: "/school-admin",
      label: lang === "ar" ? "الرئيسية" : "Kryesore",
      icon: "⊞",
      exact: true,
    },
    {
      href: "/school-admin/students",
      label: tr.students,
      icon: "◈",
      exact: false,
    },
    {
      href: "/school-admin/teachers",
      label: tr.teachers,
      icon: "◉",
      exact: false,
    },
    {
      href: "/school-admin/classes",
      label: tr.classes,
      icon: "◫",
      exact: false,
    },
    {
      href: "/school-admin/placement-assessment",
      label: tr.placementAssessment,
      icon: "◪",
      exact: false,
    },
    {
      href: "/school-admin/submissions",
      label: tr.submissions,
      icon: "◧",
      exact: false,
    },
    {
      href: "/school-admin/roadmap",
      label: lang === "ar" ? "بنك الأسئلة" : "Banka e Pyetjeve",
      icon: "◆",
      exact: false,
    },
  ];

  useEffect(() => {
    cachedFetch("/api/school-admin/stats", 60_000)
      .then((d: any) => {
        if (d?.school) {
          setSchoolName(d.school.name ?? "");
          if (d.school?.slug) {
            schoolSlugRef.current = d.school.slug;
          } else if (d.school?.id) {
            fetch(`/api/owner/schools/${d.school.id}`)
              .then((r) => r.json())
              .then((sd) => {
                if (sd.school?.slug) schoolSlugRef.current = sd.school.slug;
              })
              .catch(() => {});
          }
          if (d.school.language) {
            const savedLang = localStorage.getItem("lang");
            if (!savedLang) setLang(d.school.language as "ar" | "sq" | "en");
            setSchoolLang(d.school.language ?? "ar");
            if (d.school.language && d.school.language !== "ar")
              setShowToggle(true);
          }
        }
        if (d?.adminName) {
          setName(d.adminName);
          setInitials(
            d.adminName
              .split(" ")
              .map((w: string) => w[0])
              .slice(0, 2)
              .join(""),
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    const slug = schoolSlugRef.current;
    window.location.href = slug ? `/schools/${slug}` : "/login";
  }

  return (
    <div className="sa-root" dir={isRtl ? "rtl" : "ltr"}>
      {/* Mobile topbar */}
      <header className="sa-mobile-bar">
        <button className="sa-hamburger" onClick={() => setSidebarOpen(true)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="sa-mobile-title">{schoolName || tr.platform}</span>
        <div className="sa-mobile-avatar">{initials}</div>
      </header>

      {sidebarOpen && (
        <div className="sa-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="sa-body">
        <aside className={`sa-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sa-edge-rule" />

          <div className="sa-brand">
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
            <button
              className="sa-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="sa-ornament-rule">
            <div className="sa-rule-line" />
            <div className="sa-rule-diamond" />
            <div className="sa-rule-line" />
          </div>

          <div className="sa-profile">
            <div className="sa-profile-av">{initials}</div>
            <div className="sa-profile-info">
              <div className="sa-profile-name">
                {name || (lang === "ar" ? "المدير" : "Drejtori")}
              </div>
              <div className="sa-profile-role">
                {lang === "ar" ? "مدير المدرسة" : "Drejtori i Shkollës"}
              </div>
            </div>
          </div>

          {showToggle && (
            <div style={{ padding: "0 14px 12px" }}>
              <LangToggle dark secondaryLang={schoolLang} />
            </div>
          )}

          <nav className="sa-nav">
            <div className="sa-nav-section">
              {lang === "ar" ? "القوائم الرئيسية" : "Menuja Kryesore"}
            </div>
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sa-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {isActive && <div className="sa-nav-indicator" />}
                  <span className="sa-nav-icon-wrap">
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </span>
                  <span className="sa-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Enhanced Mandala */}
          <div className="sa-mandala" aria-hidden="true">
            <svg viewBox="0 0 200 200" fill="none">
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

          <div className="sa-footer">
            <div className="sa-ornament-rule" style={{ marginBottom: 12 }}>
              <div className="sa-rule-line" />
              <div className="sa-rule-diamond" />
              <div className="sa-rule-line" />
            </div>
            <button
              className="sa-logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <div className="sa-spin" />
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              {loggingOut ? "..." : tr.logout}
            </button>
          </div>
        </aside>

        <main className="sa-main">
          {children}
          <div className="ow-bottom-band" aria-hidden="true">
            <svg
              viewBox="0 0 1200 160"
              fill="none"
              preserveAspectRatio="xMidYMax meet"
            >
              <line
                x1="0"
                y1="80"
                x2="1200"
                y2="80"
                stroke="#C8A96A"
                strokeWidth="0.3"
                opacity="0.12"
              />
              {Array.from({ length: 30 }).map((_, i) => {
                const x = 20 + i * 40;
                return (
                  <polygon
                    key={i}
                    points={`${x},68 ${x + 8},80 ${x},92 ${x - 8},80`}
                    stroke="#C8A96A"
                    strokeWidth="0.4"
                    fill="none"
                    opacity={i % 3 === 0 ? 0.2 : 0.07}
                  />
                );
              })}
              <polygon
                points="600,52 620,80 600,108 580,80"
                stroke="#C8A96A"
                strokeWidth="0.7"
                fill="none"
                opacity="0.28"
              />
              <polygon
                points="600,64 612,80 600,96 588,80"
                stroke="#C8A96A"
                strokeWidth="0.5"
                fill="rgba(200,169,106,0.04)"
                opacity="0.3"
              />
              <line
                x1="520"
                y1="80"
                x2="572"
                y2="80"
                stroke="#C8A96A"
                strokeWidth="0.4"
                opacity="0.2"
              />
              <line
                x1="628"
                y1="80"
                x2="680"
                y2="80"
                stroke="#C8A96A"
                strokeWidth="0.4"
                opacity="0.2"
              />
              <circle cx="600" cy="80" r="3.5" fill="#C8A96A" opacity="0.35" />
              <circle
                cx="600"
                cy="80"
                r="7"
                stroke="#C8A96A"
                strokeWidth="0.4"
                fill="none"
                opacity="0.18"
              />
              <polygon
                points="300,70 308,80 300,90 292,80"
                stroke="#C8A96A"
                strokeWidth="0.5"
                fill="none"
                opacity="0.2"
              />
              <circle cx="300" cy="80" r="2" fill="#C8A96A" opacity="0.25" />
              <polygon
                points="900,70 908,80 900,90 892,80"
                stroke="#C8A96A"
                strokeWidth="0.5"
                fill="none"
                opacity="0.2"
              />
              <circle cx="900" cy="80" r="2" fill="#C8A96A" opacity="0.25" />
            </svg>
          </div>
        </main>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes sp { to { transform: rotate(360deg); } }

  :root {
    --gold:        #C8A96A;
    --gold-bright: #E5B93C;
    --gold-pale:   rgba(200,169,106,0.07);
    --gold-border: rgba(200,169,106,0.16);
    --black:       #0B0B0C;
    --off-white:   #F5F3EE;
    --text:        #0B0B0C;
    --text2:       #3D3526;
    --text3:       #8A7B60;
    --surface:     #FFFFFF;
    --border:      #E4DDD0;
    --font:        'Cairo', sans-serif;
    --sidebar-w:   264px;
    --topbar-h:    54px;
  }

  .sa-root { min-height: 100vh; background: var(--off-white); font-family: var(--font); }
  .sa-body { display: flex; min-height: 100vh; }

  .sa-sidebar {
    width: var(--sidebar-w); flex-shrink: 0;
    background: var(--black);
    display: flex; flex-direction: column;
    min-height: 100vh; position: sticky; top: 0;
    height: 100vh; overflow-y: auto; overflow-x: hidden; z-index: 30;
  }
  .sa-sidebar::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 180px;
    background: radial-gradient(ellipse at 50% -20%, rgba(200,169,106,0.07) 0%, transparent 65%);
    pointer-events: none;
  }
  .sa-edge-rule {
    position: absolute; top: 70px; bottom: 70px; left: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(200,169,106,0.2) 30%, rgba(200,169,106,0.2) 70%, transparent);
    z-index: 2;
  }
  .sa-brand {
    padding: 0;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; position: relative; z-index: 1;
  }
  .sa-close-btn {
    display: none; background: none; border: none;
    color: rgba(200,169,106,0.3); cursor: pointer;
    padding: 4px; border-radius: 5px; flex-shrink: 0; transition: color 0.15s;
  }
  .sa-close-btn:hover { color: var(--gold); }

  .sa-ornament-rule {
    display: flex; align-items: center; gap: 8px;
    margin: 2px 18px 14px; flex-shrink: 0; position: relative; z-index: 1;
  }
  .sa-rule-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.18), transparent);
  }
  .sa-rule-diamond {
    width: 4px; height: 4px; background: rgba(200,169,106,0.28);
    transform: rotate(45deg); flex-shrink: 0;
  }

  .sa-profile {
    display: flex; align-items: center; gap: 10px;
    margin: 0 14px 14px; padding: 11px 13px;
    background: rgba(200,169,106,0.05);
    border: 1px solid rgba(200,169,106,0.1);
    border-radius: 8px; flex-shrink: 0; position: relative; z-index: 1;
  }
  .sa-profile-av {
    width: 34px; height: 34px; border-radius: 7px;
    background: var(--gold);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 900; color: var(--black); flex-shrink: 0;
  }
  .sa-profile-info { display: flex; flex-direction: column; gap: 1px; overflow: hidden; min-width: 0; }
  .sa-profile-name {
    font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.88);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sa-profile-role {
    font-size: 9px; color: rgba(200,169,106,0.38);
    font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;
  }

  .sa-nav {
    display: flex; flex-direction: column; gap: 1px;
    padding: 0 12px; flex: 1; position: relative; z-index: 1;
  }
  .sa-nav-section {
    font-size: 8.5px; font-weight: 700;
    color: rgba(200,169,106,0.2);
    text-transform: uppercase; letter-spacing: 2.5px; padding: 0 10px 10px;
  }
  .sa-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 6px;
    text-decoration: none; color: rgba(200,169,106,0.32);
    font-size: 13px; font-weight: 500;
    transition: all 0.15s ease; position: relative;
  }
  .sa-nav-item:hover { background: rgba(200,169,106,0.05); color: rgba(200,169,106,0.65); }
  .sa-nav-item.active { background: rgba(200,169,106,0.07); color: var(--gold); font-weight: 700; }
  .sa-nav-indicator {
    position: absolute; right: 0; top: 8px; bottom: 8px;
    width: 2px; background: var(--gold); border-radius: 2px 0 0 2px; opacity: 0.75;
  }
  .sa-nav-icon-wrap {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px; background: rgba(200,169,106,0.04);
    border: 1px solid transparent; flex-shrink: 0; transition: all 0.15s;
  }
  .sa-nav-item.active .sa-nav-icon-wrap {
    background: rgba(200,169,106,0.09); border-color: rgba(200,169,106,0.13);
  }
  .sa-nav-label { flex: 1; }

  /* Mandala */
  .sa-mandala {
    width: 160px; height: 160px;
    margin: auto auto 0;
    flex-shrink: 0; position: relative; z-index: 1;
    opacity: 0.9;
    display: flex; align-items: center; justify-content: center;
  }
  .sa-mandala svg { width: 100%; height: 100%; }

  .sa-footer { padding: 0 12px 20px; flex-shrink: 0; position: relative; z-index: 1; }
  .sa-logout {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 12px; border-radius: 6px;
    color: rgba(200,169,106,0.3); background: none; border: none;
    font-size: 12.5px; font-weight: 600; font-family: var(--font);
    cursor: pointer; transition: all 0.15s; width: 100%; letter-spacing: 0.2px;
  }
  .sa-logout:hover:not(:disabled) { background: rgba(200,169,106,0.05); color: rgba(200,169,106,0.65); }
  .sa-logout:disabled { opacity: 0.4; cursor: not-allowed; }
  .sa-spin {
    width: 13px; height: 13px;
    border: 2px solid rgba(200,169,106,0.15); border-top-color: var(--gold);
    border-radius: 50%; animation: sp 0.7s linear infinite; flex-shrink: 0;
  }

  .sa-main { flex: 1; min-width: 0; overflow-x: hidden; padding: 32px 40px; }

  /* Mobile */
  .sa-mobile-bar {
    display: none; align-items: center; justify-content: space-between;
    padding: 0 20px; height: var(--topbar-h);
    background: var(--black); position: sticky; top: 0; z-index: 40;
    border-bottom: 1px solid rgba(200,169,106,0.12);
  }
  .sa-mobile-bar::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1.5px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.5) 50%, transparent);
  }
  .sa-hamburger {
    background: rgba(200,169,106,0.07);
    border: 1px solid rgba(200,169,106,0.14); border-radius: 6px;
    color: var(--gold); width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .sa-mobile-title { font-size: 13.5px; font-weight: 800; color: var(--gold); letter-spacing: -0.1px; }
  .sa-mobile-avatar {
    width: 30px; height: 30px; border-radius: 6px; background: var(--gold);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 900; color: var(--black);
  }
  .sa-backdrop {
    position: fixed; inset: 0; background: rgba(11,11,12,0.55);
    z-index: 29; backdrop-filter: blur(2px); animation: fadeIn 0.2s ease;
  }

  @media (max-width: 768px) {
    .sa-mobile-bar { display: flex; }
    .sa-sidebar {
      position: fixed; right: 0; top: 0; bottom: 0;
      transform: translateX(100%);
      transition: transform 0.26s cubic-bezier(0.4,0,0.2,1); height: 100%;
    }
    .sa-sidebar.open { transform: translateX(0); box-shadow: -12px 0 50px rgba(11,11,12,0.45); }
    .sa-close-btn { display: flex; }
    .sa-body { flex-direction: column; }
    .sa-main { min-height: calc(100vh - var(--topbar-h)); padding: 18px 16px; }
  }
    .ow-bottom-band {
  width: 100%;
  height: 160px;
  pointer-events: none;
  flex-shrink: 0;
  opacity: 0.8;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 35%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 35%);
}
.ow-bottom-band svg { width: 100%; height: 100%; display: block; }
`;
