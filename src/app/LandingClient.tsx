"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Lang = "ar" | "sq";

const T = {
  ar: {
    dir: "rtl" as const,
    brand: "جيل الرواد",
    eyebrow: "برنامج التأهيل والقيادة",
    title: "جيل الرواد",
    headline: "بناء جيل القادة الواعين",
    sub: "برنامج تأهيلٍ متكامل يبني القيم والهوية والتفكير الاستراتيجي والقدرات القيادية ومهارات تنفيذ المشاريع، عبر رحلة منظمة من 5 مراحل و25 وحدة تعليمية.",
    ctaJoin: "انضم إلى البرنامج",
    ctaExplore: "اكتشف الرحلة",
    loginBtn: "تسجيل الدخول",
    signupBtn: "إنشاء حساب",
    statsLevels: "مراحل",
    statsModules: "وحدة تعليمية",
    statsAssess: "نموذج قياس",
    statsServices: "خدمات داعمة",
    dimTitle: "المحاور الخمسة",
    dimSub: "تتمحور الرحلة حول خمسة مقاصد إنسانية تُكمل بناء الشخصية والوعي والمهارة.",
    dims: [
      { name: "الدين",  tag: "القيم والأخلاق",    body: "ترسيخ الأسس القيمية والروحية وبناء البوصلة الأخلاقية للقائد." },
      { name: "النفس",  tag: "الذات والوعي",      body: "تنمية الوعي الذاتي، وإدارة الوقت، ومسار النمو الشخصي." },
      { name: "العقل",  tag: "التفكير والتخطيط",  body: "بناء التفكير الاستراتيجي والتخطيط واتخاذ القرار." },
      { name: "النسل",  tag: "المجتمع والقيادة",  body: "فهم المجتمع والمؤسسات والقيادة والمسؤولية الاجتماعية." },
      { name: "المال",  tag: "الموارد والاستثمار", body: "الاستثمار والوعي الاقتصادي والتفكير المستدام في المشاريع." },
    ],
    journeyTitle: "خمس مراحل · خمسٌ وعشرون وحدة",
    journeySub: "ينتقل المشارك تدريجياً من الوعي التأسيسي إلى القيادة والتنفيذ والإسهام المجتمعي.",
    lvl: "المرحلة",
    levels: [
      "أسس الوعي والقيم",
      "بناء الذات والمعرفة",
      "التفكير والتخطيط",
      "المجتمع والقيادة",
      "المشاريع والأثر",
    ],
    outcomesTitle: "ما ستحصده في نهاية الرحلة",
    outcomes: [
      "وعي ذاتي أعمق ووضوح في الأهداف الشخصية",
      "عادات قيادية وأدوات تفكير استراتيجي",
      "خبرة عملية في بناء مشروع ذي أثر",
      "ارتباط أعمق بالمسؤولية والإسهام المجتمعي",
      "قدرة على القياس والتقييم والتطوير الذاتي",
    ],
    finalTitle: "ابنِ نفسك. اقُد بقيمك. اصنع الأثر.",
    finalSub: "انضم إلى جيل الرواد، وكن جزءاً من حركة تبني قادة المستقبل بوعي ومسؤولية.",
    poweredBy: "منصة الرواد · 2026",
  },
  sq: {
    dir: "ltr" as const,
    brand: "Brezi i Pionierëve",
    eyebrow: "Program kualifikimi & lidershipi",
    title: "Brezi i Pionierëve",
    headline: "Ndërto Brezin e Liderëve të Vetëdijshëm",
    sub: "Një program i integruar kualifikimi që zhvillon vlerat, identitetin, mendimin strategjik dhe aftësitë e lidershipit përmes 5 nivelesh dhe 25 modulesh mësimore.",
    ctaJoin: "Bashkohu me programin",
    ctaExplore: "Eksploro udhëtimin",
    loginBtn: "Hyrje",
    signupBtn: "Regjistrohu",
    statsLevels: "nivele",
    statsModules: "module",
    statsAssess: "modele vlerësimi",
    statsServices: "shërbime",
    dimTitle: "Pesë Dimensionet",
    dimSub: "Udhëtimi ndërtohet rreth pesë dimensioneve njerëzore që plotësojnë njëri-tjetrin.",
    dims: [
      { name: "Feja",          tag: "Vlerat & etika",      body: "Forcimi i bazave etike, shpirtërore dhe morale të liderit." },
      { name: "Shpirti",       tag: "Vetëdija personale",  body: "Zhvillimi i vetëdijes, menaxhimit të kohës dhe rritjes personale." },
      { name: "Mendja",        tag: "Mendimi strategjik",  body: "Ndërtimi i mendimit strategjik, planifikimit dhe vendimmarrjes." },
      { name: "Pasardhësit",   tag: "Komuniteti & lidership", body: "Kuptimi i komunitetit, institucioneve dhe përgjegjësisë sociale." },
      { name: "Pasuria",       tag: "Burimet & investimi", body: "Investimi, ndërgjegjja ekonomike dhe mendimi i qëndrueshëm." },
    ],
    journeyTitle: "5 nivele · 25 module",
    journeySub: "Pjesëmarrësi kalon gradualisht nga ndërgjegjja bazë te lidership, zbatim dhe kontribut.",
    lvl: "Niveli",
    levels: [
      "Bazat e vetëdijes dhe vlerave",
      "Ndërtimi i vetes dhe njohurive",
      "Mendimi dhe planifikimi",
      "Komuniteti dhe lidership",
      "Projektet dhe ndikimi",
    ],
    outcomesTitle: "Çfarë fitoni në fund të udhëtimit",
    outcomes: [
      "Vetëdije më të thellë dhe qartësi në qëllimet personale",
      "Zakone lidershipi dhe mjete mendimi strategjik",
      "Përvojë praktike në ndërtimin e projekteve me ndikim",
      "Lidhje me përgjegjësinë dhe shërbimin ndaj komunitetit",
      "Aftësi për të matur, vlerësuar dhe vetë-zhvilluar",
    ],
    finalTitle: "Ndërto veten. Udhëhiq me vlera. Krijo ndikim.",
    finalSub: "Bashkohu me Brezin e Pionierëve — një lëvizje që ndërton liderët e së ardhmes.",
    poweredBy: "Platforma Alrowad · 2026",
  },
};

export default function LandingClient() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ar");
  const [scrolled, setScrolled] = useState(false);
  const tr = T[lang];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "sq" || saved === "ar") setLang(saved);
  }, []);

  const goLogin  = () => router.push("/login");
  const goSignup = () => router.push("/signup");

  return (
    <>
      <style>{css}</style>
      <div dir={tr.dir} className="gl-root">

        {/* ══ NAVBAR ══ */}
        <nav className={`gl-nav${scrolled ? " gl-scrolled" : ""}`}>
          <span className="gl-brand">{tr.brand}</span>

          <div className="gl-nav-actions" dir="ltr">
            <div className="gl-lang-pill">
              {(["ar", "sq"] as Lang[]).map((l) => (
                <button key={l}
                  className={`gl-lang-btn${lang === l ? " on" : ""}`}
                  onClick={() => { setLang(l); localStorage.setItem("lang", l); }}>
                  {l === "ar" ? "AR" : "SQ"}
                </button>
              ))}
            </div>
            <button className="gl-ghost" onClick={goLogin}>{tr.loginBtn}</button>
            <button className="gl-gold"  onClick={goSignup}>{tr.signupBtn}</button>
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section className="gl-hero">
          {/* Atmospheric decoration */}
          <div className="gl-hero-atm" aria-hidden="true">
            <div className="gl-blob gl-blob-1" />
            <div className="gl-blob gl-blob-2" />
            <svg className="gl-dec-svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
              <circle cx="600" cy="350" r="180" fill="none" stroke="#C8A96A" strokeWidth="0.5" strokeOpacity="0.06"/>
              <circle cx="600" cy="350" r="300" fill="none" stroke="#C8A96A" strokeWidth="0.35" strokeOpacity="0.04" strokeDasharray="4 8"/>
              <circle cx="600" cy="350" r="430" fill="none" stroke="#C8A96A" strokeWidth="0.25" strokeOpacity="0.03"/>
              <polygon points="820,350 710,540 490,540 380,350 490,160 710,160" fill="none" stroke="#C8A96A" strokeWidth="0.5" strokeOpacity="0.06"/>
            </svg>
          </div>

          <div className="gl-hero-body">
            <p className="gl-eyebrow a1">{tr.eyebrow}</p>

            {/* SVG emblem */}
            <div className="gl-emblem a2" aria-hidden="true">
              <div className="gl-emblem-r2" />
              <div className="gl-emblem-r3" />
              <div className="gl-emblem-core">
                <svg width="52" height="52" viewBox="0 0 80 80" fill="none">
                  <polygon points="40,6 72,22 72,58 40,74 8,58 8,22" stroke="#C8A96A" strokeWidth="1.4" fill="none" opacity="0.9"/>
                  <polygon points="40,16 62,27 62,53 40,64 18,53 18,27" stroke="#E5B93C" strokeWidth="0.9" fill="none" opacity="0.6"/>
                  <circle cx="40" cy="40" r="11" stroke="#C8A96A" strokeWidth="1" fill="none" opacity="0.7"/>
                  <circle cx="40" cy="40" r="4" fill="#E5B93C" opacity="0.9"/>
                </svg>
              </div>
            </div>

            <h1 className="gl-title a2">{tr.headline}</h1>

            <div className="gl-divider a3">
              <span className="gl-dline"/><span className="gl-gem"/><span className="gl-dline"/>
            </div>

            <p className="gl-sub a3">{tr.sub}</p>

            {/* Stats */}
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
              <button className="gl-cta-gold"    onClick={goSignup}>{tr.ctaJoin}</button>
              <button className="gl-cta-outline" onClick={goLogin}>{tr.ctaExplore}</button>
            </div>
          </div>

          <div className="gl-scroll-pip" aria-hidden="true"/>
        </section>

        {/* ══ DIMENSIONS ══ */}
        <section className="gl-section gl-section-light">
          <div className="gl-wrap">
            <div className="gl-sec-head">
              <p className="gl-tag">{tr.dimTitle}</p>
              <p className="gl-tag-sub">{tr.dimSub}</p>
            </div>
            <div className="gl-dims">
              {tr.dims.map((d, i) => (
                <div key={i} className="gl-dim-card">
                  <span className="gl-dim-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="gl-dim-name">{d.name}</span>
                  <span className="gl-dim-tag">{d.tag}</span>
                  <p className="gl-dim-body">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ JOURNEY ══ */}
        <section className="gl-section gl-section-dark">
          <div className="gl-wrap">
            <div className="gl-sec-head gl-sec-head--dark">
              <p className="gl-tag gl-tag--gold">{tr.journeyTitle}</p>
              <p className="gl-tag-sub gl-tag-sub--dim">{tr.journeySub}</p>
            </div>
            <div className="gl-levels">
              {tr.levels.map((label, i) => (
                <div key={i} className="gl-level">
                  <div className="gl-level-num">{i + 1}</div>
                  <div className="gl-level-body">
                    <span className="gl-level-eyebrow">{tr.lvl} {i + 1}</span>
                    <span className="gl-level-label">{label}</span>
                  </div>
                  {i < tr.levels.length - 1 && <div className="gl-level-connector" aria-hidden="true"/>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ OUTCOMES ══ */}
        <section className="gl-section gl-section-light">
          <div className="gl-wrap gl-outcomes-wrap">
            <div className="gl-sec-head">
              <p className="gl-tag">{tr.outcomesTitle}</p>
            </div>
            <div className="gl-outcomes">
              {tr.outcomes.map((o, i) => (
                <div key={i} className="gl-outcome">
                  <span className="gl-outcome-check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8A96A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span className="gl-outcome-text">{o}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FOOTER CTA ══ */}
        <footer className="gl-footer">
          <div className="gl-footer-glow"/>
          <h2 className="gl-footer-title">{tr.finalTitle}</h2>
          <p className="gl-footer-sub">{tr.finalSub}</p>
          <div className="gl-cta">
            <button className="gl-cta-gold"    onClick={goSignup}>{tr.signupBtn}</button>
            <button className="gl-cta-outline" onClick={goLogin}>{tr.loginBtn}</button>
          </div>
          <p className="gl-credit">{tr.poweredBy}</p>
        </footer>

      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}

:root{
  --gold:#C8A96A; --gold2:#E5B93C; --gold-dk:#A8863E;
  --ink:#080B0C;  --ink2:#0F1114; --ink3:#1A1D20;
  --cream:#F6F4EE; --cream2:#FBFAF6;
  --text:#1A1208; --text2:#3D2E10; --text3:#7A6540;
  --border:#E8D9B8;
  --font:'Cairo',sans-serif; --font-h:'El Messiri','Cairo',serif;
}

@keyframes fu{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes pip{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}
@keyframes floatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
@keyframes floatB{0%,100%{transform:translateY(0)}50%{transform:translateY(14px)}}
@keyframes pulseR{0%,100%{transform:scale(1);opacity:.22}50%{transform:scale(1.08);opacity:.55}}

.a1{animation:fu .9s .05s both cubic-bezier(.22,1,.36,1)}
.a2{animation:fu .9s .18s both cubic-bezier(.22,1,.36,1)}
.a3{animation:fu .9s .30s both cubic-bezier(.22,1,.36,1)}
.a4{animation:fu .9s .44s both cubic-bezier(.22,1,.36,1)}
.a5{animation:fu .9s .58s both cubic-bezier(.22,1,.36,1)}

.gl-root{font-family:var(--font);background:var(--ink);color:#fff;overflow-x:hidden;}

/* ── NAVBAR ── */
.gl-nav{
  position:fixed;top:0;left:0;right:0;z-index:300;
  height:70px;padding:0 36px;
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  background:transparent;border-bottom:1px solid transparent;
  transition:background .4s,border-color .4s,backdrop-filter .4s;
}
.gl-scrolled{
  background:rgba(8,11,12,.90)!important;
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom-color:rgba(200,169,106,.10)!important;
}
.gl-brand{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--gold);}
.gl-nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}

.gl-lang-pill{display:flex;background:rgba(200,169,106,.07);border:1px solid rgba(200,169,106,.14);border-radius:8px;padding:3px;gap:2px;}
.gl-lang-btn{padding:4px 12px;border-radius:5px;border:none;background:transparent;color:rgba(200,169,106,.38);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all .15s;}
.gl-lang-btn.on{background:rgba(200,169,106,.18);color:var(--gold);}

.gl-ghost{padding:7px 18px;border:1px solid rgba(200,169,106,.26);border-radius:9px;background:transparent;color:var(--gold);font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all .18s;}
.gl-ghost:hover{background:rgba(200,169,106,.08);border-color:rgba(200,169,106,.5);}
.gl-gold{padding:7px 20px;background:var(--gold);border-radius:9px;border:none;color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .18s;}
.gl-gold:hover{background:var(--gold2);box-shadow:0 4px 18px rgba(200,169,106,.3);}

/* ── HERO ── */
.gl-hero{
  position:relative;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  background:var(--ink);overflow:hidden;
}
.gl-hero-atm{position:absolute;inset:0;pointer-events:none;}
.gl-blob{position:absolute;border-radius:50%;filter:blur(90px);}
.gl-blob-1{width:600px;height:600px;background:radial-gradient(circle,rgba(200,169,106,.10),transparent 70%);top:-120px;inset-inline-end:-80px;animation:floatA 11s ease-in-out infinite;}
.gl-blob-2{width:480px;height:480px;background:radial-gradient(circle,rgba(229,185,60,.07),transparent 70%);bottom:-80px;inset-inline-start:-60px;animation:floatB 14s ease-in-out infinite;}
.gl-dec-svg{position:absolute;inset:0;width:100%;height:100%;}

.gl-hero-body{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;padding:110px 32px 90px;
  max-width:820px;margin:0 auto;width:100%;
}

.gl-eyebrow{font-size:11px;letter-spacing:.34em;color:rgba(200,169,106,.58);font-weight:700;text-transform:uppercase;margin-bottom:28px;}

/* Emblem */
.gl-emblem{position:relative;width:130px;height:130px;display:flex;align-items:center;justify-content:center;margin-bottom:36px;}
.gl-emblem-r2,.gl-emblem-r3{position:absolute;border-radius:50%;border:1px solid rgba(200,169,106,.14);}
.gl-emblem-r2{inset:-10px;animation:pulseR 3.5s ease-in-out infinite;}
.gl-emblem-r3{inset:-22px;border-color:rgba(200,169,106,.07);animation:pulseR 3.5s .9s ease-in-out infinite;}
.gl-emblem-core{width:130px;height:130px;border-radius:22px;background:rgba(200,169,106,.06);border:1px solid rgba(200,169,106,.22);display:flex;align-items:center;justify-content:center;}

.gl-title{font-family:var(--font-h);font-size:clamp(32px,6.5vw,70px);font-weight:700;color:#fff;line-height:1.06;margin-bottom:20px;text-shadow:0 4px 28px rgba(0,0,0,.4);}
.gl-divider{display:flex;align-items:center;gap:10px;width:180px;margin:0 auto 22px;}
.gl-dline{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,106,.45),transparent);}
.gl-gem{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);flex-shrink:0;opacity:.8;}
.gl-sub{font-size:clamp(13px,1.8vw,16px);color:rgba(255,255,255,.45);line-height:1.95;max-width:560px;margin-bottom:44px;}

/* Stats */
.gl-stats{display:flex;border:1px solid rgba(200,169,106,.14);border-radius:18px;overflow:hidden;background:rgba(8,11,12,.5);backdrop-filter:blur(14px);margin-bottom:36px;}
.gl-stat{padding:16px 28px;display:flex;flex-direction:column;align-items:center;gap:4px;}
.gl-stat+.gl-stat{border-inline-start:1px solid rgba(200,169,106,.10);}
.gl-sn{font-size:26px;font-weight:900;color:var(--gold);line-height:1;font-family:var(--font-h);}
.gl-sl{font-size:10px;color:rgba(200,169,106,.45);font-weight:600;letter-spacing:.05em;}

/* CTA */
.gl-cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}
.gl-cta-gold{padding:13px 38px;background:var(--gold);border-radius:12px;border:none;color:var(--ink);font-size:14px;font-weight:900;cursor:pointer;font-family:var(--font);transition:all .2s;box-shadow:0 6px 28px rgba(200,169,106,.28);}
.gl-cta-gold:hover{background:var(--gold2);transform:translateY(-2px);box-shadow:0 12px 36px rgba(200,169,106,.4);}
.gl-cta-outline{padding:13px 36px;border:1.5px solid rgba(200,169,106,.35);border-radius:12px;background:rgba(8,11,12,.4);backdrop-filter:blur(8px);color:var(--gold);font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all .2s;}
.gl-cta-outline:hover{border-color:var(--gold);background:rgba(200,169,106,.10);}

.gl-scroll-pip{position:absolute;bottom:28px;left:50%;width:6px;height:6px;border-radius:50%;background:var(--gold);opacity:.45;animation:pip 1.9s ease-in-out infinite;}

/* ── SECTIONS ── */
.gl-section{padding:80px 32px;}
.gl-section-light{background:var(--cream);}
.gl-section-dark{background:var(--ink2);}
.gl-wrap{max-width:1080px;margin:0 auto;}

.gl-sec-head{text-align:center;margin-bottom:52px;}
.gl-sec-head--dark .gl-tag,.gl-sec-head--dark .gl-tag-sub{color:inherit;}
.gl-tag{font-size:11px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--gold-dk);margin-bottom:10px;display:block;}
.gl-tag--gold{color:var(--gold);}
.gl-tag-sub{font-size:15px;color:var(--text3);max-width:600px;margin:0 auto;line-height:1.75;}
.gl-tag-sub--dim{color:rgba(200,169,106,.38);}

/* Dimensions grid */
.gl-dims{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}
.gl-dim-card{
  background:#fff;border:1px solid var(--border);border-radius:18px;
  padding:28px 18px;display:flex;flex-direction:column;align-items:center;
  text-align:center;gap:8px;position:relative;overflow:hidden;
  transition:transform .22s,box-shadow .22s,border-color .22s;
}
.gl-dim-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0;transition:opacity .22s;}
.gl-dim-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(26,18,8,.10);border-color:rgba(200,169,106,.32);}
.gl-dim-card:hover::before{opacity:1;}
.gl-dim-num{font-size:10px;font-weight:900;color:rgba(200,169,106,.22);font-family:monospace;letter-spacing:.05em;}
.gl-dim-name{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text);}
.gl-dim-tag{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-dk);padding:3px 10px;background:rgba(200,169,106,.08);border-radius:6px;}
.gl-dim-body{font-size:12.5px;color:var(--text3);line-height:1.75;margin-top:4px;}

/* Journey levels */
.gl-levels{display:flex;flex-direction:column;gap:0;max-width:680px;margin:0 auto;position:relative;}
.gl-level{display:flex;align-items:flex-start;gap:18px;position:relative;}
.gl-level-num{width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(200,169,106,.35);background:rgba(200,169,106,.08);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:var(--gold);flex-shrink:0;z-index:1;}
.gl-level-body{flex:1;padding:10px 0 28px;}
.gl-level-eyebrow{display:block;font-size:10px;font-weight:700;letter-spacing:.18em;color:rgba(200,169,106,.38);text-transform:uppercase;margin-bottom:4px;}
.gl-level-label{font-size:15px;font-weight:700;color:rgba(255,255,255,.85);}
.gl-level-connector{position:absolute;inset-inline-start:21px;top:44px;width:1.5px;height:calc(100% - 44px);background:linear-gradient(to bottom,rgba(200,169,106,.25),transparent);}

/* Outcomes */
.gl-outcomes{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:780px;margin:0 auto;}
.gl-outcome{display:flex;align-items:flex-start;gap:12px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px 20px;}
.gl-outcome-check{width:28px;height:28px;border-radius:8px;background:rgba(200,169,106,.10);border:1px solid rgba(200,169,106,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.gl-outcome-text{font-size:14px;color:var(--text2);line-height:1.7;font-weight:500;}

/* Footer */
.gl-footer{position:relative;overflow:hidden;background:#060809;padding:90px 24px 64px;display:flex;flex-direction:column;align-items:center;text-align:center;border-top:1px solid rgba(200,169,106,.06);}
.gl-footer-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 60%,rgba(200,169,106,.08),transparent 55%);}
.gl-footer-title{font-family:var(--font-h);font-size:clamp(24px,4.5vw,46px);font-weight:700;color:var(--gold);margin-bottom:12px;position:relative;}
.gl-footer-sub{font-size:15px;color:rgba(255,255,255,.32);max-width:440px;line-height:1.9;margin-bottom:36px;position:relative;}
.gl-credit{margin-top:52px;font-size:11px;color:rgba(200,169,106,.18);letter-spacing:.18em;text-transform:uppercase;position:relative;}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .gl-dims{grid-template-columns:repeat(3,1fr);}
  .gl-outcomes{grid-template-columns:1fr;}
}
@media(max-width:680px){
  .gl-nav{padding:0 16px;height:62px;}
  .gl-ghost{display:none;}
  .gl-dims{grid-template-columns:repeat(2,1fr);}
  .gl-stats{flex-wrap:wrap;}
  .gl-stat{padding:12px 16px;}
  .gl-sn{font-size:22px;}
  .gl-hero-body{padding:88px 20px 72px;}
  .gl-section{padding:60px 20px;}
  .gl-cta{flex-direction:column;align-items:center;}
  .gl-cta-gold,.gl-cta-outline{width:100%;max-width:280px;}
}
@media(max-width:420px){
  .gl-dims{grid-template-columns:1fr;}
}
`;
