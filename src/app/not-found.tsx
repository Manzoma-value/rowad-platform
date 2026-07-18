"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Lang = "ar" | "sq";

const T = {
  ar: {
    dir: "rtl" as const,
    eyebrow: "صفحة غير موجودة",
    code: "404",
    title: "لم نجد هذه الصفحة",
    sub: "الرابط الذي تحاول الوصول إليه غير موجود، أو ربما تم نقله أو حذفه.",
    home: "العودة إلى الرئيسية",
    login: "تسجيل الدخول",
    rights: "جميع الحقوق محفوظة © منظومة - 2026",
  },
  sq: {
    dir: "ltr" as const,
    eyebrow: "Faqja nuk u gjet",
    code: "404",
    title: "Nuk e gjetëm këtë faqe",
    sub: "Linku që po kërkoni nuk ekziston, ose mund të jetë lëvizur ose fshirë.",
    home: "Kthehu te kryesorja",
    login: "Hyrje",
    rights: "Të gjitha të drejtat e rezervuara © Manzoma - 2026",
  },
};

export default function NotFound() {
  const [lang, setLang] = useState<Lang>("sq");
  const tr = T[lang];

  useEffect(() => {
    // localStorage is browser-only, so we must read it after mount.
    try {
      const saved = localStorage.getItem("lang") as Lang | null;
      const hasChosenLanguage = localStorage.getItem("language_preference_v2") === "1";
      if (hasChosenLanguage && (saved === "sq" || saved === "ar")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLang(saved);
      }
    } catch {
      /* SSR-safe */
    }
  }, []);

  return (
    <div className="nf-root" dir={tr.dir}>
      <style>{css}</style>

      {/* Soft ambient glow */}
      <div className="nf-glow" aria-hidden="true" />

      {/* Decorative mandala in the background */}
      <svg
        className="nf-mandala"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="200" cy="200" r="180" stroke="#B8A082" strokeWidth="0.6" opacity="0.10" />
        <circle cx="200" cy="200" r="150" stroke="#B8A082" strokeWidth="0.4" opacity="0.14" strokeDasharray="2 6" />
        <circle cx="200" cy="200" r="120" stroke="#B8A082" strokeWidth="0.6" opacity="0.18" />
        <circle cx="200" cy="200" r="90"  stroke="#B8A082" strokeWidth="0.5" opacity="0.16" strokeDasharray="4 4" />
        <circle cx="200" cy="200" r="60"  stroke="#B8A082" strokeWidth="0.7" opacity="0.22" />
        <circle cx="200" cy="200" r="30"  stroke="#B8A082" strokeWidth="0.6" opacity="0.24" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 200 + 35 * Math.sin(a);
          const y1 = 200 - 35 * Math.cos(a);
          const x2 = 200 + 175 * Math.sin(a);
          const y2 = 200 - 175 * Math.cos(a);
          return (
            <line
              key={i}
              x1={x1.toFixed(2)} y1={y1.toFixed(2)}
              x2={x2.toFixed(2)} y2={y2.toFixed(2)}
              stroke="#B8A082" strokeWidth="0.35" opacity="0.12"
            />
          );
        })}
      </svg>

      {/* Language toggle (top corner) */}
      <div className="nf-lang">
        {(["ar", "sq"] as Lang[]).map((l) => (
          <button
            key={l}
            className={`nf-lang-btn${lang === l ? " nf-lang-btn--on" : ""}`}
            onClick={() => { setLang(l); try { localStorage.setItem("lang", l); } catch {} }}
          >
            {l === "ar" ? "AR" : "SQ"}
          </button>
        ))}
      </div>

      <main className="nf-card">
        <p className="nf-eyebrow">{tr.eyebrow}</p>
        <h1 className="nf-code" aria-hidden="true">{tr.code}</h1>

        <div className="nf-rule">
          <span className="nf-rule-line" />
          <span className="nf-rule-gem" />
          <span className="nf-rule-line" />
        </div>

        <h2 className="nf-title">{tr.title}</h2>
        <p className="nf-sub">{tr.sub}</p>

        <div className="nf-cta">
          <Link href="/" className="nf-cta-gold">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9" /><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
            </svg>
            {tr.home}
          </Link>
          <Link href="/login" className="nf-cta-outline">{tr.login}</Link>
        </div>
      </main>

      <p className="nf-rights">{tr.rights}</p>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&display=swap');
  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes nf-fade   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes nf-spin   { to { transform: rotate(360deg); } }
  @keyframes nf-glow   { 0%,100% { opacity: 0.4; } 50% { opacity: 0.85; } }
  @keyframes nf-mand   { to { transform: translate(-50%, -50%) rotate(360deg); } }

  .nf-root {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at 20% 10%, rgba(184,160,130,0.10), transparent 50%),
      radial-gradient(ellipse at 80% 90%, rgba(184,160,130,0.08), transparent 55%),
      linear-gradient(180deg, #050708 0%, #1A1A1A 50%, #060809 100%);
    color: #fff;
    font-family: 'Cairo', sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 22px 60px;
  }

  .nf-glow {
    position: absolute;
    top: 50%; left: 50%;
    width: 720px; height: 720px;
    max-width: 100vw; max-height: 100vw;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(184,160,130,0.12), transparent 70%);
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: nf-glow 5s ease-in-out infinite;
    z-index: 0;
  }
  .nf-mandala {
    position: absolute;
    top: 50%; left: 50%;
    width: 640px; height: 640px;
    max-width: 130vw; max-height: 130vw;
    transform: translate(-50%, -50%);
    pointer-events: none; z-index: 0;
    animation: nf-mand 120s linear infinite;
    opacity: 0.55;
  }

  /* Language toggle */
  .nf-lang {
    position: absolute; top: 20px; inset-inline-end: 22px;
    z-index: 2;
    display: flex; gap: 2px;
    background: rgba(184,160,130,0.07);
    border: 1px solid rgba(184,160,130,0.16);
    border-radius: 9px; padding: 3px;
  }
  .nf-lang-btn {
    padding: 5px 12px; border-radius: 7px; border: none;
    background: transparent; color: rgba(184,160,130,0.45);
    font-size: 11px; font-weight: 800; cursor: pointer;
    font-family: 'Cairo', sans-serif;
    transition: all 0.15s;
  }
  .nf-lang-btn--on { background: rgba(184,160,130,0.20); color: #B8A082; }

  /* Card */
  .nf-card {
    position: relative;
    z-index: 1;
    max-width: 580px;
    width: 100%;
    background: rgba(26,26,26,0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(184,160,130,0.18);
    border-radius: 24px;
    padding: 48px 36px 40px;
    text-align: center;
    box-shadow:
      0 20px 60px rgba(0,0,0,0.45),
      inset 0 1px 0 rgba(255,255,255,0.04);
    animation: nf-fade 0.6s cubic-bezier(0.22,1,0.36,1) both;
    overflow: hidden;
  }
  .nf-card::before {
    content: ''; position: absolute; top: 0; left: 18%; right: 18%; height: 2px;
    background: linear-gradient(90deg, transparent, #B8A082 30%, #B8A082 60%, transparent);
    border-radius: 0 0 2px 2px;
  }

  .nf-eyebrow {
    font-size: 11px; letter-spacing: 0.32em;
    color: rgba(184,160,130,0.7);
    font-weight: 800; text-transform: uppercase;
    margin-bottom: 10px;
  }
  .nf-code {
    font-family: 'El Messiri', 'Cairo', serif;
    font-size: clamp(96px, 22vw, 168px);
    font-weight: 700;
    background: linear-gradient(180deg, #B8A082 0%, #B8A082 50%, #8A7860 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1;
    letter-spacing: -4px;
    text-shadow: 0 4px 30px rgba(184,160,130,0.18);
    user-select: none;
  }

  .nf-rule { display: flex; align-items: center; gap: 10px; width: 180px; margin: 18px auto 22px; }
  .nf-rule-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(184,160,130,0.48), transparent); }
  .nf-rule-gem { width: 6px; height: 6px; background: #B8A082; transform: rotate(45deg); opacity: 0.9; flex-shrink: 0; }

  .nf-title {
    font-family: 'El Messiri', 'Cairo', serif;
    font-size: clamp(22px, 3.6vw, 30px);
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
    letter-spacing: -0.3px;
  }
  .nf-sub {
    font-size: clamp(13.5px, 1.6vw, 15px);
    color: rgba(255,255,255,0.55);
    line-height: 1.85;
    max-width: 420px;
    margin: 0 auto 32px;
  }

  /* CTAs */
  .nf-cta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .nf-cta-gold, .nf-cta-outline {
    text-decoration: none; cursor: pointer;
    font-family: 'Cairo', sans-serif;
    transition: all 0.22s cubic-bezier(0.22,1,0.36,1);
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  }
  .nf-cta-gold {
    padding: 13px 30px; border-radius: 12px;
    background: linear-gradient(135deg, #B8A082, #B8A082);
    color: #1A1A1A;
    font-size: 14px; font-weight: 900;
    border: none;
    box-shadow: 0 4px 18px rgba(184,160,130,0.32);
  }
  .nf-cta-gold:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(184,160,130,0.42); }
  .nf-cta-outline {
    padding: 13px 26px; border-radius: 12px;
    background: rgba(26,26,26,0.4);
    border: 1px solid rgba(184,160,130,0.32);
    color: #B8A082; font-size: 14px; font-weight: 700;
  }
  .nf-cta-outline:hover { border-color: #B8A082; background: rgba(184,160,130,0.10); }

  /* Footer rights */
  .nf-rights {
    position: relative; z-index: 1;
    margin-top: 36px;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(184,160,130,0.30);
    text-align: center;
  }

  @media (max-width: 480px) {
    .nf-card { padding: 40px 24px 32px; border-radius: 20px; }
    .nf-cta { flex-direction: column; align-items: stretch; max-width: 280px; margin: 0 auto; }
    .nf-cta-gold, .nf-cta-outline { width: 100%; padding: 12px 22px; }
    .nf-lang { top: 14px; inset-inline-end: 14px; }
  }
`;
