"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Lang = "ar" | "en";

const T = {
  ar: {
    dir: "rtl" as const,
    brand: "جيل الرواد",
    eyebrow: "برنامج التأهيل والقيادة",
    headline: "بناء جيل القادة الواعين",
    sub: "برنامج تأهيلٍ متكامل يبني القيم والهوية والتفكير الاستراتيجي والقدرات القيادية ومهارات تنفيذ المشاريع، عبر رحلة منظمة من 5 مراحل و25 وحدة تعليمية.",
    ctaJoin: "انضم إلى البرنامج",
    ctaExplore: "اكتشف الرحلة",
    loginBtn: "تسجيل الدخول",
    signupBtn: "إنشاء حساب",
    navAbout: "البرنامج",
    navDims: "المحاور",
    navJourney: "الرحلة",
    navOutcomes: "النتائج",
    statsLevels: "مراحل",
    statsModules: "وحدة تعليمية",
    statsAssess: "نموذج قياس",
    statsServices: "خدمات داعمة",
    dimEyebrow: "المحاور الخمسة",
    dimTitle: "خمسة محاور · رحلة واحدة",
    dimSub: "تتمحور الرحلة حول خمسة مقاصد إنسانية تُكمل بناء الشخصية والوعي والمهارة.",
    dims: [
      { name: "الدين",  tag: "القيم والأخلاق",      body: "ترسيخ الأسس القيمية والروحية وبناء البوصلة الأخلاقية للقائد." },
      { name: "النفس",  tag: "الذات والوعي",        body: "تنمية الوعي الذاتي، وإدارة الوقت، ومسار النمو الشخصي." },
      { name: "العقل",  tag: "التفكير والتخطيط",    body: "بناء التفكير الاستراتيجي والتخطيط واتخاذ القرار." },
      { name: "النسل",  tag: "المجتمع والقيادة",    body: "فهم المجتمع والمؤسسات والقيادة والمسؤولية الاجتماعية." },
      { name: "المال",  tag: "الموارد والاستثمار",   body: "الاستثمار والوعي الاقتصادي والتفكير المستدام في المشاريع." },
    ],
    journeyEyebrow: "رحلة التأهيل",
    journeyTitle: "خمس مراحل · خمسٌ وعشرون وحدة",
    journeySub: "ينتقل المشارك تدريجياً من الوعي التأسيسي إلى القيادة والتنفيذ والإسهام المجتمعي.",
    lvl: "المرحلة",
    levels: [
      { t: "أسس الوعي والقيم",   d: "ترسيخ الأسس الأخلاقية والقيمية" },
      { t: "بناء الذات والمعرفة", d: "تنمية الوعي بالذات والمهارات الأساسية" },
      { t: "التفكير والتخطيط",    d: "اكتساب التفكير الاستراتيجي والتخطيط" },
      { t: "المجتمع والقيادة",    d: "فهم البيئة وأدوار القيادة" },
      { t: "المشاريع والأثر",      d: "تحويل التعلّم إلى مشروع قابل للقياس" },
    ],
    outcomesEyebrow: "ما ستحصده",
    outcomesTitle: "نتائج الرحلة",
    outcomes: [
      "وعي ذاتي أعمق ووضوح في الأهداف الشخصية",
      "عادات قيادية وأدوات تفكير استراتيجي",
      "خبرة عملية في بناء مشروع ذي أثر",
      "ارتباط أعمق بالمسؤولية والإسهام المجتمعي",
      "قدرة على القياس والتقييم والتطوير الذاتي",
    ],
    finalEyebrow: "ابدأ مسارك",
    finalTitle: "ابنِ نفسك. اقُد بقيمك. اصنع الأثر.",
    finalSub: "انضم إلى جيل الرواد، وكن جزءاً من حركة تبني قادة المستقبل بوعي ومسؤولية.",
    poweredBy: "جميع الحقوق محفوظة © منظومة - 2026",
  },
  en: {
    dir: "ltr" as const,
    brand: "Generation of Pioneers",
    eyebrow: "Leadership & Qualification Program",
    headline: "Building the Next Generation of Conscious Leaders",
    sub: "An integrated qualification program that develops values, identity, strategic thinking, leadership skills, and practical project execution — through a structured journey of 5 levels and 25 learning modules.",
    ctaJoin: "Join the Program",
    ctaExplore: "Explore the Journey",
    loginBtn: "Login",
    signupBtn: "Sign Up",
    navAbout: "Program",
    navDims: "Dimensions",
    navJourney: "Journey",
    navOutcomes: "Outcomes",
    statsLevels: "Levels",
    statsModules: "Modules",
    statsAssess: "Assessment Models",
    statsServices: "Support Services",
    dimEyebrow: "The Five Dimensions",
    dimTitle: "Five Dimensions · One Journey",
    dimSub: "The journey is built around five human dimensions that together complete the formation of character, awareness, and skill.",
    dims: [
      { name: "Values",    tag: "Ethics & Spirit",          body: "Strengthening the foundations of values and the leader's moral compass." },
      { name: "Self",      tag: "Identity & Awareness",     body: "Developing self-awareness, time management, and personal growth." },
      { name: "Mind",      tag: "Thinking & Planning",      body: "Building strategic thinking, planning, and decision-making." },
      { name: "Society",   tag: "Community & Leadership",   body: "Understanding community, institutions, leadership, and social responsibility." },
      { name: "Resources", tag: "Investment & Economy",     body: "Investment, economic awareness, and sustainable project thinking." },
    ],
    journeyEyebrow: "The Qualification Journey",
    journeyTitle: "Five Levels · Twenty-Five Modules",
    journeySub: "Participants progress from foundational awareness through leadership, planning, execution, and community contribution.",
    lvl: "Level",
    levels: [
      { t: "Foundations of Awareness & Values", d: "Grounding ethical and value foundations" },
      { t: "Building Self & Knowledge",         d: "Cultivating self-awareness and core skills" },
      { t: "Thinking & Planning",               d: "Acquiring strategic thinking and planning" },
      { t: "Community & Leadership",            d: "Understanding context and leadership roles" },
      { t: "Projects & Impact",                 d: "Turning learning into a measurable project" },
    ],
    outcomesEyebrow: "What You'll Gain",
    outcomesTitle: "Journey Outcomes",
    outcomes: [
      "Deeper self-awareness and clarity in personal goals",
      "Leadership habits and strategic-thinking tools",
      "Hands-on experience building an impactful project",
      "A deeper connection to responsibility and community contribution",
      "The ability to measure, evaluate, and continually self-develop",
    ],
    finalEyebrow: "Start Your Path",
    finalTitle: "Build yourself. Lead with values. Create impact.",
    finalSub: "Join the Generation of Pioneers — a movement building tomorrow's leaders with awareness and responsibility.",
    poweredBy: "All rights reserved © Manzoma - 2026",
  },
};

/* ─── Inline iconography ─── (stored as render fns so React doesn't
   complain about keyless JSX in a module-level array) */
const DIM_ICONS: Array<() => React.ReactNode> = [
  // Values — compass / star
  () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="16 8 13.5 13.5 8 16 10.5 10.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Self — person
  () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  ),
  // Mind — brain bulb
  () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z" />
    </svg>
  ),
  // Society — people
  () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  // Resources — growth/coin
  () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20l5-5 4 4 9-9" /><polyline points="14 10 21 10 21 17" />
    </svg>
  ),
];

const OUTCOME_ICONS: Array<() => React.ReactNode> = [
  // Self-awareness — eye
  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  // Leadership — flag
  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4M4 4l10 4-10 4M4 12V4"/></svg>,
  // Projects — rocket
  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19c2-1 2-3 0-5M19 19c-2-1-2-3 0-5"/><path d="M12 2c4 3 6 7 6 11l-6 4-6-4c0-4 2-8 6-11z"/><circle cx="12" cy="10" r="2"/></svg>,
  // Community — heart
  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  // Measurement — chart
  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="20" x2="21" y2="20"/><polyline points="3 16 8 11 12 14 18 7 21 9"/></svg>,
];

export default function LandingClient() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ar");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tr = T[lang];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    // Only restore if it's a supported lang for this page (ar/en).
    // sq from other pages falls back to ar (Arabic remains the default).
    if (saved === "en" || saved === "ar") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(saved);
    }
  }, []);

  const changeLang = (l: Lang) => { setLang(l); localStorage.setItem("lang", l); setMobileOpen(false); };
  const goLogin    = () => router.push("/login");
  const goSignup   = () => router.push("/signup");

  return (
    <>
      <style>{css}</style>
      <div dir={tr.dir} className="gl-root">

        {/* ── NAVBAR ── */}
        <nav className={`gl-nav${scrolled ? " gl-scrolled" : ""}`}>
          <a href="#top" className="gl-brand-wrap" aria-label={tr.brand}>
            <span className="gl-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                <circle cx="16" cy="16" r="9"  stroke="currentColor" strokeWidth="1" opacity="0.6"/>
                <circle cx="16" cy="16" r="4"  stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
              </svg>
            </span>
            <span className="gl-brand">{tr.brand}</span>
          </a>

          {/* Section anchors (desktop) */}
          <div className="gl-nav-links">
            <a href="#dimensions" className="gl-nav-link">{tr.navDims}</a>
            <a href="#journey"    className="gl-nav-link">{tr.navJourney}</a>
            <a href="#outcomes"   className="gl-nav-link">{tr.navOutcomes}</a>
          </div>

          <div className="gl-nav-actions" dir="ltr">
            <div className="gl-lang-pill">
              {(["ar", "en"] as Lang[]).map((l) => (
                <button key={l} className={`gl-lang-btn${lang === l ? " on" : ""}`} onClick={() => changeLang(l)}>
                  {l === "ar" ? "AR" : "EN"}
                </button>
              ))}
            </div>
            <button className="gl-ghost"  onClick={goLogin}>{tr.loginBtn}</button>
            <button className="gl-solid"  onClick={goSignup}>{tr.signupBtn}</button>
            <button
              className="gl-burger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="menu"
              aria-expanded={mobileOpen}
            ><span /><span /><span /></button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="gl-mobile-menu" dir={tr.dir}>
            <a href="#dimensions" onClick={() => setMobileOpen(false)}>{tr.navDims}</a>
            <a href="#journey"    onClick={() => setMobileOpen(false)}>{tr.navJourney}</a>
            <a href="#outcomes"   onClick={() => setMobileOpen(false)}>{tr.navOutcomes}</a>
            <div className="gl-mobile-cta">
              <button className="gl-ghost" onClick={() => { setMobileOpen(false); goLogin(); }}>{tr.loginBtn}</button>
              <button className="gl-solid" onClick={() => { setMobileOpen(false); goSignup(); }}>{tr.signupBtn}</button>
            </div>
          </div>
        )}

        {/* ── HERO ── */}
        <section id="top" className="gl-hero">
          {/* Decorative floating elements */}
          <div className="gl-deco gl-deco-1" aria-hidden="true">
            <svg viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="90" stroke="#A8863E" strokeWidth="0.5" opacity="0.18"/>
              <circle cx="100" cy="100" r="70" stroke="#A8863E" strokeWidth="0.4" opacity="0.14" strokeDasharray="3 5"/>
              <circle cx="100" cy="100" r="50" stroke="#A8863E" strokeWidth="0.5" opacity="0.18"/>
              <circle cx="100" cy="100" r="30" stroke="#A8863E" strokeWidth="0.4" opacity="0.22"/>
            </svg>
          </div>
          <div className="gl-deco gl-deco-2" aria-hidden="true">
            <svg viewBox="0 0 160 160" fill="none">
              <polygon points="80 10 92 60 142 60 102 92 116 142 80 110 44 142 58 92 18 60 68 60" stroke="#E5B93C" strokeWidth="0.6" opacity="0.18" fill="none"/>
            </svg>
          </div>

          <div className="gl-hero-body">
            <p className="gl-eyebrow a1">{tr.eyebrow}</p>
            <h1 className="gl-title a2">{tr.headline}</h1>

            <div className="gl-divider a3">
              <span className="gl-dline"/><span className="gl-gem"/><span className="gl-dline"/>
            </div>

            <p className="gl-sub a3">{tr.sub}</p>

            <div className="gl-stats a4">
              {[
                { n: "5",  l: tr.statsLevels   },
                { n: "25", l: tr.statsModules  },
                { n: "75", l: tr.statsAssess   },
                { n: "4",  l: tr.statsServices },
              ].map(({ n, l }, i) => (
                <div key={i} className="gl-stat">
                  <span className="gl-sn">{n}</span>
                  <span className="gl-sl">{l}</span>
                </div>
              ))}
            </div>

            <div className="gl-cta a5">
              <button className="gl-cta-solid"   onClick={goSignup}>
                {tr.ctaJoin}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: tr.dir === "rtl" ? "scaleX(-1)" : undefined }}>
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <a className="gl-cta-outline" href="#dimensions">{tr.ctaExplore}</a>
            </div>
          </div>

          <div className="gl-scroll-pip" aria-hidden="true"/>
        </section>

        {/* ── DIMENSIONS ── */}
        <section id="dimensions" className="gl-section gl-sec-cream">
          <div className="gl-section-deco" aria-hidden="true" />
          <div className="gl-wrap">
            <div className="gl-sec-head">
              <p className="gl-tag">{tr.dimEyebrow}</p>
              <h2 className="gl-sec-title">{tr.dimTitle}</h2>
              <p className="gl-tag-sub">{tr.dimSub}</p>
            </div>
            <div className="gl-dims">
              {tr.dims.map((d, i) => (
                <article key={i} className={`gl-dim-card gl-dim-${["gold","teal","purple","rose","bronze"][i]}`} style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="gl-dim-corner" aria-hidden="true" />
                  <span className="gl-dim-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="gl-dim-icon">{DIM_ICONS[i]()}</div>
                  <h3 className="gl-dim-name">{d.name}</h3>
                  <span className="gl-dim-tag">{d.tag}</span>
                  <p className="gl-dim-body">{d.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── JOURNEY ── */}
        <section id="journey" className="gl-section gl-sec-dark">
          <div className="gl-wrap gl-journey-wrap">
            <div className="gl-sec-head gl-sec-head--light">
              <p className="gl-tag gl-tag--light">{tr.journeyEyebrow}</p>
              <h2 className="gl-sec-title gl-sec-title--light">{tr.journeyTitle}</h2>
              <p className="gl-tag-sub gl-tag-sub--light">{tr.journeySub}</p>
            </div>
            <ol className="gl-levels">
              {tr.levels.map((lvl, i) => (
                <li key={i} className="gl-level" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="gl-level-marker">
                    <span className="gl-level-num">{String(i + 1).padStart(2, "0")}</span>
                    {i < tr.levels.length - 1 && <span className="gl-level-line" aria-hidden="true"/>}
                  </div>
                  <div className="gl-level-content">
                    <span className="gl-level-eye">{tr.lvl} {String(i + 1).padStart(2, "0")}</span>
                    <h3 className="gl-level-title">{lvl.t}</h3>
                    <p className="gl-level-desc">{lvl.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── OUTCOMES ── */}
        <section id="outcomes" className="gl-section gl-sec-cream">
          <div className="gl-wrap">
            <div className="gl-sec-head">
              <p className="gl-tag">{tr.outcomesEyebrow}</p>
              <h2 className="gl-sec-title">{tr.outcomesTitle}</h2>
            </div>
            <div className="gl-outcomes">
              {tr.outcomes.map((o, i) => (
                <div key={i} className="gl-outcome" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="gl-check" aria-hidden="true">{OUTCOME_ICONS[i]()}</span>
                  <span className="gl-outcome-text">{o}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <footer className="gl-footer">
          <div className="gl-footer-top-line" aria-hidden="true"/>
          <div className="gl-footer-deco" aria-hidden="true">
            <svg viewBox="0 0 400 400" fill="none">
              <circle cx="200" cy="200" r="180" stroke="#C8A96A" strokeWidth="0.5" opacity="0.18"/>
              <circle cx="200" cy="200" r="140" stroke="#C8A96A" strokeWidth="0.4" opacity="0.14" strokeDasharray="3 4"/>
              <circle cx="200" cy="200" r="100" stroke="#E5B93C" strokeWidth="0.5" opacity="0.18"/>
              <circle cx="200" cy="200" r="60"  stroke="#C8A96A" strokeWidth="0.6" opacity="0.22"/>
              <circle cx="200" cy="200" r="30"  stroke="#E5B93C" strokeWidth="0.5" opacity="0.30"/>
            </svg>
          </div>
          <p className="gl-tag gl-tag--gold">{tr.finalEyebrow}</p>
          <h2 className="gl-footer-title">{tr.finalTitle}</h2>
          <p className="gl-footer-sub">{tr.finalSub}</p>
          <div className="gl-cta">
            <button className="gl-cta-solid"   onClick={goSignup}>
              {tr.signupBtn}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: tr.dir === "rtl" ? "scaleX(-1)" : undefined }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button className="gl-cta-outline" onClick={goLogin}>{tr.loginBtn}</button>
          </div>
          <p className="gl-credit">{tr.poweredBy}</p>
        </footer>

      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   CSS — refined & richer
══════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}

:root{
  --gold:#C8A96A; --gold2:#E5B93C; --gold-dk:#A8863E; --gold-soft:#E0C788;
  --ink:#080B0E;  --ink2:#15110A;  --ink3:#2A1F12;
  --bg-a:#FFFDF8; --bg-b:#F5F1E6; --bg-c:#FBFAF6;
  --text:#1A1208; --text2:#3D2E10; --text3:#7A6540;
  --border:#E8D9B8; --border2:#F0E8D4;
  --font:'Cairo','Inter',sans-serif;
  --font-h:'El Messiri','Cairo',serif;
  --font-en:'Inter','Cairo',sans-serif;
  --ease:cubic-bezier(.22,1,.36,1);
}
[dir="ltr"]{ --font:var(--font-en); }

@keyframes fu      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes fuSlow  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes pip     { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(7px)} }
@keyframes spin    { to{transform:rotate(360deg)} }
@keyframes float1  { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-12px,-18px) rotate(8deg)} }
@keyframes float2  { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(14px,-14px) rotate(-6deg)} }
@keyframes glowPulse{0%,100%{opacity:.5}50%{opacity:.9}}

.a1{animation:fu .9s .05s both var(--ease)}
.a2{animation:fu .9s .18s both var(--ease)}
.a3{animation:fu .9s .30s both var(--ease)}
.a4{animation:fu .9s .44s both var(--ease)}
.a5{animation:fu .9s .58s both var(--ease)}

.gl-root{font-family:var(--font);background:var(--bg-b);color:var(--text);overflow-x:hidden;}

/* ════════════ NAVBAR ════════════ */
.gl-nav{
  position:fixed;top:0;left:0;right:0;z-index:300;
  height:72px;padding:0 36px;
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  background:rgba(255,253,248,0);
  border-bottom:1px solid transparent;
  transition:background .35s,border-color .35s,backdrop-filter .35s,box-shadow .35s;
}
.gl-scrolled{
  background:rgba(255,253,248,.94)!important;
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom-color:rgba(168,134,62,.20)!important;
  box-shadow:0 2px 24px rgba(26,18,8,.08)!important;
}

.gl-brand-wrap{display:flex;align-items:center;gap:9px;text-decoration:none;color:inherit;}
.gl-brand-mark{
  width:34px;height:34px;color:var(--gold-dk);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  background:linear-gradient(135deg,rgba(168,134,62,.12),rgba(229,185,60,.05));
  border:1px solid rgba(168,134,62,.22);border-radius:10px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5);
}
.gl-brand{
  font-family:var(--font-h);font-size:17.5px;font-weight:700;letter-spacing:-.2px;
  color:var(--ink2);white-space:nowrap;
}

.gl-nav-links{display:flex;align-items:center;gap:4px;flex:1;justify-content:center;}
.gl-nav-link{
  padding:8px 14px;border-radius:8px;
  font-size:13px;font-weight:600;color:var(--text3);
  text-decoration:none;transition:all .18s;white-space:nowrap;
}
.gl-nav-link:hover{color:var(--ink2);background:rgba(168,134,62,.07);}

.gl-nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}

.gl-lang-pill{display:flex;background:rgba(168,134,62,.08);border:1px solid rgba(168,134,62,.18);border-radius:8px;padding:3px;gap:2px;}
.gl-lang-btn{padding:4px 12px;border-radius:5px;border:none;background:transparent;color:rgba(168,134,62,.55);font-size:11px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .15s;letter-spacing:.04em;}
.gl-lang-btn.on{background:rgba(168,134,62,.20);color:var(--gold-dk);}

.gl-ghost{
  padding:8px 18px;border:1px solid rgba(168,134,62,.32);border-radius:9px;
  background:transparent;color:var(--gold-dk);font-size:13px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all .18s;
}
.gl-ghost:hover{background:rgba(168,134,62,.08);border-color:rgba(168,134,62,.6);}
.gl-solid{
  padding:8px 20px;background:var(--ink2);border-radius:9px;border:none;
  color:var(--gold);font-size:13px;font-weight:800;
  cursor:pointer;font-family:var(--font);transition:all .22s;
  display:inline-flex;align-items:center;gap:6px;
}
.gl-solid:hover{background:#2a1e08;box-shadow:0 6px 22px rgba(26,18,8,.22);transform:translateY(-1px);}

/* Mobile burger */
.gl-burger{
  display:none;flex-direction:column;justify-content:center;gap:4px;
  width:38px;height:38px;border-radius:9px;
  border:1px solid rgba(168,134,62,.22);background:transparent;cursor:pointer;
  padding:0 9px;
}
.gl-burger span{display:block;height:1.5px;background:var(--gold-dk);border-radius:2px;transition:transform .25s;}

.gl-mobile-menu{
  position:fixed;top:72px;left:0;right:0;z-index:280;
  background:rgba(255,253,248,.97);backdrop-filter:blur(24px);
  border-bottom:1px solid rgba(168,134,62,.18);
  padding:14px 22px 18px;
  display:none;flex-direction:column;gap:4px;
  animation:fuSlow .22s both var(--ease);
  box-shadow:0 6px 22px rgba(26,18,8,.08);
}
.gl-mobile-menu a{
  padding:11px 14px;border-radius:10px;
  font-size:14px;color:var(--ink2);text-decoration:none;font-weight:700;
  transition:background .15s;
}
.gl-mobile-menu a:hover{background:rgba(168,134,62,.08);}
.gl-mobile-cta{display:flex;gap:10px;margin-top:8px;}
.gl-mobile-cta button{flex:1;padding:11px 16px;font-size:13px;}

/* ════════════ HERO ════════════ */
.gl-hero{
  position:relative;min-height:92vh;
  display:flex;align-items:center;justify-content:center;
  background:url('/generallanding.png') center/cover no-repeat,linear-gradient(180deg,#F5EFE0 0%,#EDE4CC 100%);
  overflow:hidden;
}
.gl-hero::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(160deg,
    rgba(255,253,248,.62) 0%,
    rgba(255,253,248,.32) 45%,
    rgba(255,253,248,.62) 100%);
  pointer-events:none;
}

.gl-deco{position:absolute;pointer-events:none;z-index:1;opacity:.6;}
.gl-deco-1{top:10%;inset-inline-start:-80px;width:280px;height:280px;animation:float1 18s ease-in-out infinite;}
.gl-deco-2{bottom:14%;inset-inline-end:-40px;width:200px;height:200px;animation:float2 22s ease-in-out infinite;}

.gl-hero-body{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;padding:118px 32px 74px;
  max-width:860px;margin:0 auto;width:100%;
}

.gl-eyebrow{
  font-size:11px;letter-spacing:.34em;color:var(--gold-dk);
  font-weight:800;text-transform:uppercase;margin-bottom:22px;
  background:rgba(255,253,248,.72);backdrop-filter:blur(6px);
  padding:6px 16px;border-radius:100px;
  border:1px solid rgba(168,134,62,.22);
  display:inline-block;
  box-shadow:0 2px 12px rgba(168,134,62,.10);
}
.gl-title{
  font-family:var(--font-h);
  font-size:clamp(36px,7vw,82px);font-weight:700;
  color:var(--ink2);line-height:1.06;margin-bottom:22px;letter-spacing:-.5px;
  text-shadow:0 2px 30px rgba(255,253,248,.4);
}

.gl-divider{display:flex;align-items:center;gap:10px;width:200px;margin:0 auto 22px;}
.gl-dline{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(168,134,62,.55),transparent);}
.gl-gem{width:6px;height:6px;background:var(--gold-dk);transform:rotate(45deg);flex-shrink:0;opacity:.95;box-shadow:0 0 10px rgba(168,134,62,.5);}

.gl-sub{
  font-size:clamp(14.5px,1.85vw,17px);color:var(--text2);
  line-height:1.95;max-width:600px;margin-bottom:46px;
  font-weight:500;
}

/* Stats strip */
.gl-stats{
  display:flex;
  border:1px solid rgba(168,134,62,.24);border-radius:18px;overflow:hidden;
  background:rgba(255,253,248,.82);backdrop-filter:blur(14px);
  margin-bottom:40px;
  box-shadow:0 6px 30px rgba(26,18,8,.08),inset 0 1px 0 rgba(255,255,255,.6);
}
.gl-stat{padding:18px 32px;display:flex;flex-direction:column;align-items:center;gap:5px;transition:background .2s;}
.gl-stat:hover{background:rgba(168,134,62,.05);}
.gl-stat+.gl-stat{border-inline-start:1px solid rgba(168,134,62,.18);}
.gl-sn{
  font-size:28px;font-weight:900;line-height:1;font-family:var(--font-h);
  background:linear-gradient(135deg,var(--gold-dk) 0%,var(--gold2) 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.gl-sl{font-size:10.5px;color:var(--text3);font-weight:700;letter-spacing:.08em;text-transform:uppercase;}

/* CTA buttons */
.gl-cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}
.gl-cta-solid{
  padding:14px 38px;background:var(--ink2);border-radius:12px;border:none;
  color:var(--gold);font-size:14px;font-weight:900;
  cursor:pointer;font-family:var(--font);transition:all .24s;
  box-shadow:0 6px 28px rgba(26,18,8,.22),inset 0 1px 0 rgba(229,185,60,.15);
  display:inline-flex;align-items:center;gap:8px;letter-spacing:.02em;
}
.gl-cta-solid:hover{background:#2a1e08;transform:translateY(-2px);box-shadow:0 14px 38px rgba(26,18,8,.32);}
.gl-cta-outline{
  padding:14px 36px;border:1.5px solid rgba(168,134,62,.42);border-radius:12px;
  background:rgba(255,253,248,.7);backdrop-filter:blur(10px);
  color:var(--gold-dk);font-size:14px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all .22s;
  text-decoration:none;display:inline-flex;align-items:center;justify-content:center;
}
.gl-cta-outline:hover{border-color:var(--gold-dk);background:rgba(168,134,62,.10);transform:translateY(-1px);}

.gl-scroll-pip{
  position:absolute;bottom:30px;left:50%;
  width:8px;height:8px;border-radius:50%;background:var(--gold-dk);
  opacity:.55;animation:pip 1.9s ease-in-out infinite;
  box-shadow:0 0 12px rgba(168,134,62,.5);
}

/* ════════════ SECTIONS ════════════ */
.gl-section{padding:96px 32px;position:relative;overflow:hidden;}
.gl-sec-cream{
  background:
    radial-gradient(ellipse at 10% 0%, rgba(168,134,62,.08), transparent 50%),
    radial-gradient(ellipse at 90% 100%, rgba(229,185,60,.05), transparent 55%),
    var(--bg-a);
}
.gl-sec-dark{
  background:linear-gradient(180deg,#15110A 0%,#0B0908 100%);
  color:#F5EFE0;
}
.gl-wrap{max-width:1120px;margin:0 auto;position:relative;z-index:2;}

.gl-section-deco{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:680px;height:680px;
  max-width:100vw;max-height:100vw;
  background:radial-gradient(circle,rgba(168,134,62,.05),transparent 70%);
  pointer-events:none;animation:glowPulse 6s ease-in-out infinite;
}

.gl-sec-head{text-align:center;margin-bottom:60px;}
.gl-tag{font-size:11px;font-weight:800;letter-spacing:.30em;text-transform:uppercase;color:var(--gold-dk);margin-bottom:14px;display:block;}
.gl-tag--light{color:var(--gold-soft);opacity:.85;}
.gl-tag--gold{color:var(--gold);opacity:.85;}
.gl-sec-title{
  font-family:var(--font-h);
  font-size:clamp(26px,4.6vw,46px);font-weight:700;
  color:var(--ink2);line-height:1.18;letter-spacing:-.3px;margin-bottom:16px;
}
.gl-sec-title--light{color:#fff;}
.gl-tag-sub{font-size:15px;color:var(--text3);max-width:620px;margin:0 auto;line-height:1.85;}
.gl-tag-sub--light{color:rgba(245,239,224,.55);}

/* ════════════ DIMENSIONS ════════════ */
.gl-dims{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}

.gl-dim-card{
  position:relative;
  background:var(--bg-a);border:1px solid var(--border);border-radius:20px;
  padding:28px 18px 26px;display:flex;flex-direction:column;align-items:flex-start;
  gap:10px;overflow:hidden;
  box-shadow:0 2px 12px rgba(26,18,8,.05);
  transition:all .3s var(--ease);
  animation:fuSlow .7s both var(--ease);
}
.gl-dim-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:var(--accent);
  opacity:0;transition:opacity .3s;
}
.gl-dim-card:hover{transform:translateY(-6px);box-shadow:0 22px 50px rgba(26,18,8,.10);border-color:var(--accent);}
.gl-dim-card:hover::before{opacity:.9;}

.gl-dim-corner{
  position:absolute;bottom:-50px;inset-inline-end:-50px;
  width:140px;height:140px;border-radius:50%;
  background:var(--accent-bg);opacity:.5;
  transition:opacity .3s,transform .4s var(--ease);
  pointer-events:none;
}
.gl-dim-card:hover .gl-dim-corner{transform:scale(1.15);opacity:.7;}

.gl-dim-num{
  font-family:var(--font-h);font-size:34px;font-weight:900;
  color:var(--accent);opacity:.55;letter-spacing:-1px;line-height:1;
}
.gl-dim-icon{
  width:54px;height:54px;border-radius:14px;flex-shrink:0;
  background:var(--accent-bg);border:1px solid var(--accent-border);color:var(--accent);
  display:flex;align-items:center;justify-content:center;
  position:relative;z-index:1;
}
.gl-dim-icon svg{width:24px;height:24px;}
.gl-dim-name{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--ink2);letter-spacing:-.3px;line-height:1.2;}
.gl-dim-tag{font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);padding:4px 11px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:6px;}
.gl-dim-body{font-size:13px;color:var(--text3);line-height:1.75;position:relative;z-index:1;}

/* Per-dimension accent palette */
.gl-dim-gold   { --accent:#B89B5E; --accent-bg:rgba(184,155,94,0.10);  --accent-border:rgba(184,155,94,0.26); }
.gl-dim-teal   { --accent:#2E8B7D; --accent-bg:rgba(46,139,125,0.10);  --accent-border:rgba(46,139,125,0.26); }
.gl-dim-purple { --accent:#6D3FB3; --accent-bg:rgba(109,63,179,0.10);  --accent-border:rgba(109,63,179,0.26); }
.gl-dim-rose   { --accent:#B8456C; --accent-bg:rgba(184,69,108,0.10);  --accent-border:rgba(184,69,108,0.26); }
.gl-dim-bronze { --accent:#A87237; --accent-bg:rgba(168,114,55,0.10);  --accent-border:rgba(168,114,55,0.26); }

/* ════════════ JOURNEY ════════════ */
.gl-journey-wrap .gl-sec-head{text-align:center;}
.gl-levels{
  list-style:none;padding:0;margin:0 auto;max-width:760px;
  display:flex;flex-direction:column;gap:0;
}
.gl-level{
  display:flex;align-items:flex-start;gap:22px;
  padding:14px 0;position:relative;
  animation:fuSlow .7s both var(--ease);
}
.gl-level-marker{position:relative;flex-shrink:0;display:flex;flex-direction:column;align-items:center;}
.gl-level-num{
  width:54px;height:54px;border-radius:50%;
  background:linear-gradient(135deg,var(--gold-soft) 0%,var(--gold) 50%,var(--gold-dk) 100%);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-h);font-size:16px;font-weight:800;color:var(--ink2);
  letter-spacing:-.5px;
  box-shadow:0 6px 22px rgba(200,169,106,.35),inset 0 1px 0 rgba(255,255,255,.3);
  border:2px solid rgba(255,255,255,.08);
  position:relative;z-index:2;
}
.gl-level-line{
  width:2px;flex:1;min-height:30px;
  background:linear-gradient(180deg,rgba(200,169,106,.45),rgba(200,169,106,.1));
  margin-top:6px;
}
.gl-level-content{
  flex:1;padding:6px 22px 32px;
  background:linear-gradient(180deg,rgba(255,253,248,.05),rgba(255,253,248,.01));
  border:1px solid rgba(200,169,106,.16);border-radius:14px;
  transition:all .25s var(--ease);
  margin-bottom:4px;
}
.gl-level-content:hover{border-color:rgba(200,169,106,.36);background:linear-gradient(180deg,rgba(200,169,106,.08),rgba(255,253,248,.01));transform:translateX(0);}
.gl-level-eye{display:block;font-size:10.5px;font-weight:800;letter-spacing:.18em;color:var(--gold);text-transform:uppercase;margin:6px 0 4px;opacity:.85;}
.gl-level-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:#FFF;letter-spacing:-.2px;margin-bottom:4px;}
.gl-level-desc{font-size:13.5px;color:rgba(245,239,224,.55);line-height:1.7;}

/* ════════════ OUTCOMES ════════════ */
.gl-outcomes{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:880px;margin:0 auto;}
.gl-outcome{
  display:flex;align-items:flex-start;gap:14px;
  background:var(--bg-a);border:1px solid var(--border);
  border-radius:16px;padding:20px 22px;
  transition:all .25s var(--ease);
  animation:fuSlow .6s both var(--ease);
}
.gl-outcome:hover{box-shadow:0 14px 32px rgba(26,18,8,.08);border-color:rgba(200,169,106,.4);transform:translateY(-2px);}
.gl-check{
  width:38px;height:38px;border-radius:11px;flex-shrink:0;
  background:linear-gradient(135deg,var(--gold-soft),var(--gold-dk));
  color:var(--ink2);display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 14px rgba(200,169,106,.32);
}
.gl-check svg{width:18px;height:18px;}
.gl-outcome-text{font-size:14.5px;color:var(--text2);line-height:1.7;font-weight:500;padding-top:7px;}

/* ════════════ FOOTER ════════════ */
.gl-footer{
  position:relative;overflow:hidden;
  background:linear-gradient(180deg,#15110A 0%,#080604 100%);
  padding:110px 24px 70px;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;
}
.gl-footer-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(229,185,60,.40),transparent);}
.gl-footer::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 30%,rgba(200,169,106,.12),transparent 55%);
}
.gl-footer-deco{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:560px;height:560px;max-width:130vw;max-height:130vw;
  pointer-events:none;opacity:.65;
  animation:spin 200s linear infinite;
}
.gl-footer-title{
  font-family:var(--font-h);
  font-size:clamp(28px,5.2vw,56px);font-weight:700;
  color:#fff;margin-bottom:14px;position:relative;letter-spacing:-.4px;line-height:1.2;
}
.gl-footer-sub{
  font-size:15.5px;color:rgba(245,239,224,.42);
  max-width:500px;line-height:1.95;margin-bottom:38px;position:relative;
}
.gl-footer .gl-cta-solid{background:linear-gradient(135deg,var(--gold-soft),var(--gold-dk));color:var(--ink2);box-shadow:0 8px 30px rgba(200,169,106,.35);}
.gl-footer .gl-cta-solid:hover{filter:brightness(1.08);box-shadow:0 12px 36px rgba(200,169,106,.45);}
.gl-footer .gl-cta-outline{border-color:rgba(200,169,106,.36);color:var(--gold-soft);background:transparent;}
.gl-footer .gl-cta-outline:hover{background:rgba(200,169,106,.10);border-color:var(--gold);color:var(--gold);}
.gl-credit{margin-top:60px;font-size:11px;color:rgba(200,169,106,.25);letter-spacing:.22em;text-transform:uppercase;position:relative;}

/* ════════════ RESPONSIVE ════════════ */
@media(max-width:1000px){
  .gl-nav-links{display:none;}
  .gl-dims{grid-template-columns:repeat(3,1fr);}
  .gl-dims > *:nth-child(4),
  .gl-dims > *:nth-child(5){grid-column:span 1;}
}
@media(max-width:720px){
  .gl-nav{padding:0 16px;height:64px;gap:8px;}
  .gl-brand{font-size:15px;}
  .gl-ghost{display:none;}
  .gl-lang-pill{display:none;}
  .gl-burger{display:flex;}
  .gl-mobile-menu{display:flex;top:64px;}

  .gl-deco{display:none;}
  .gl-dims{grid-template-columns:1fr 1fr;}
  .gl-outcomes{grid-template-columns:1fr;}
  .gl-stats{flex-wrap:wrap;}
  .gl-stat{padding:13px 18px;flex:1 1 calc(50% - 1px);min-width:46%;}
  .gl-stat+.gl-stat{border-inline-start:none;}
  .gl-stat:nth-child(3),.gl-stat:nth-child(4){border-top:1px solid rgba(168,134,62,.16);}
  .gl-stat:nth-child(even){border-inline-start:1px solid rgba(168,134,62,.16);}
  .gl-sn{font-size:23px;}

  .gl-hero{min-height:88vh;}
  .gl-hero-body{padding:88px 20px 62px;}
  .gl-section{padding:64px 20px;}
  .gl-sec-head{margin-bottom:42px;}
  .gl-cta{flex-direction:column;align-items:stretch;width:100%;max-width:300px;margin:0 auto;}
  .gl-cta-solid,.gl-cta-outline{width:100%;padding:13px 22px;}

  .gl-level-content{padding:14px 18px;}
  .gl-level-num{width:44px;height:44px;font-size:14px;}

  .gl-footer{padding:78px 22px 56px;}
  .gl-footer-deco{width:360px;height:360px;}
}
@media(max-width:420px){
  .gl-dims{grid-template-columns:1fr;}
  .gl-stat{padding:11px 14px;}
  .gl-sn{font-size:21px;}
  .gl-title{font-size:36px;}
}

@media(prefers-reduced-motion:reduce){
  .gl-deco,.gl-footer-deco,.gl-section-deco{animation:none!important;}
}
`;
