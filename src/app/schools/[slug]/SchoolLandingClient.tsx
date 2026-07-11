"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface School {
  id: string;
  name: string;
  /** Optional Latin-script name shown when UI language is Albanian. */
  name_alt: string | null;
  slug: string;
  description: string | null;
  language: string;
  admin_name: string | null;
  student_count: number;
  teacher_count: number;
  class_count: number;
}
type Lang = "ar" | "sq";

const T = {
  ar: {
    dir: "rtl" as const,
    eyebrow: "أكاديمية الرواد · ألبانيا",
    vision: "تمكين الإنسان · بناء المستقبل",
    sub: "منصة تعليمية متكاملة تجمع بين الأخلاق والعلم والقيادة",
    students: "طالب", teachers: "معلم", classes: "فصل",
    content: "محتوى", levels: "مراحل", models: "نموذج قياس",
    loginBtn: "تسجيل الدخول", signupBtn: "إنشاء حساب",
    joinTitle: "ابدأ رحلتك معنا",
    joinSub: "كن جزءًا من جيل يصنع المستقبل",
    poweredBy: "جميع الحقوق محفوظة © منظومة - 2026",
  },
  sq: {
    dir: "ltr" as const,
    eyebrow: "Akademia Alrowad · Shqipëri",
    vision: "Fuqizimi i Njeriut · Ndërtimi i së Ardhmes",
    sub: "Platformë edukative që kombinon vlerat morale, dijen dhe lidershipin",
    students: "nxënës", teachers: "mësues", classes: "klasë",
    content: "përmbajtje", levels: "faza", models: "modele vlerësimi",
    loginBtn: "Hyrje", signupBtn: "Regjistrohu",
    joinTitle: "Filloni Udhëtimin",
    joinSub: "Bëhuni pjesë e gjeneratës që ndërton të ardhmen",
    poweredBy: "Të gjitha të drejtat e rezervuara © Manzoma - 2026",
  },
};

export default function SchoolLandingClient({ school }: { school: School }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(school.language === "sq" ? "sq" : "ar");
  const [scrolled, setScrolled] = useState(false);
  // On a tenant subdomain (rowad-albania.manzoma.sa) we use clean /login & /signup
  // paths; on the owner host's path-based view (…/schools/<slug>) we keep the
  // school-scoped paths. Detected once on mount (browser-only).
  const [onSubdomain, setOnSubdomain] = useState(false);
  const tr = T[lang];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    // If the current path is the clean root (not /schools/...), we're on a
    // tenant subdomain (the middleware rewrote it). Use clean auth paths.
    // (Effect, not a render-time initializer, to avoid SSR/client hydration mismatch.)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnSubdomain(!window.location.pathname.startsWith("/schools/"));
  }, []);

  const loginPath  = onSubdomain ? "/login"  : `/schools/${school.slug}/login`;
  const signupPath = onSubdomain ? "/signup" : `/schools/${school.slug}/signup`;
  const goLogin  = () => router.push(loginPath);
  const goSignup = () => router.push(signupPath);

  // Show the Latin-script name in non-Arabic UIs when available;
  // otherwise fall back to the canonical Arabic name.
  const displayName =
    lang !== "ar" && school.name_alt && school.name_alt.trim()
      ? school.name_alt
      : school.name;

  return (
    <>
      <style>{css}</style>
      <div dir={tr.dir} className="lp-root">

        {/* ══ NAVBAR ══ */}
        <nav className={`lp-nav${scrolled ? " lp-scrolled" : ""}`}>
          {/* School name centred */}
          <span className="lp-nav-name">{displayName}</span>

          {/* Right actions */}
          <div className="lp-nav-actions" dir="ltr">
            <div className="lp-lang-pill">
              {(["ar", "sq"] as Lang[]).map((l) => (
                <button key={l} className={`lp-lang-btn${lang === l ? " on" : ""}`} onClick={() => setLang(l)}>
                  {l === "ar" ? "AR" : "SQ"}
                </button>
              ))}
            </div>
            <button className="lp-ghost" onClick={goLogin}>{tr.loginBtn}</button>
            <button className="lp-gold"  onClick={goSignup}>{tr.signupBtn}</button>
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section className="lp-hero">
          <div className="lp-hero-overlay" />

          <div className="lp-hero-body">
            <p  className="lp-eyebrow a1">{tr.eyebrow}</p>
            <h1 className="lp-title a2">{displayName}</h1>

            <div className="lp-divider a3">
              <span className="lp-dline" />
              <span className="lp-gem"  />
              <span className="lp-dline" />
            </div>

            <p className="lp-tagline a3">{tr.vision}</p>
            <p className="lp-sub    a4">{tr.sub}</p>

<div className="lp-cta a5">
              <button className="lp-cta-outline" onClick={goLogin}>{tr.loginBtn}</button>
              <button className="lp-cta-gold"    onClick={goSignup}>{tr.signupBtn}</button>
            </div>
          </div>

          <div className="lp-scroll-pip" aria-hidden="true" />
        </section>

        {/* ══ NUMBERS STRIP ══ */}
        <div className="lp-strip">
          {[
            { n: "25", l: tr.content },
            { n: "5",  l: tr.levels  },
            { n: "75", l: tr.models  },
          ].map(({ n, l }, i) => (
            <div key={i} className="lp-num">
              <span className="lp-num-n">{n}</span>
              <span className="lp-num-l">{l}</span>
            </div>
          ))}
        </div>

        {/* ══ FOOTER CTA ══ */}
        <footer className="lp-footer">
          <div className="lp-footer-glow" />
          <h2 className="lp-footer-title">{tr.joinTitle}</h2>
          <p className="lp-footer-sub">{tr.joinSub}</p>
          <div className="lp-cta">
            <button className="lp-cta-outline" onClick={goLogin}>{tr.loginBtn}</button>
            <button className="lp-cta-gold"    onClick={goSignup}>{tr.signupBtn}</button>
          </div>
          <p className="lp-credit">{tr.poweredBy}</p>
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
  --gold:#B8A082; --gold2:#B8A082; --gold-dk:#8F765B;
  --ink:#1A1A1A;  --ink2:#0F1114;
  --font:'Cairo',sans-serif; --font-h:'El Messiri','Cairo',serif;
}

@keyframes fu{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes pip{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}

.a1{animation:fu .9s .05s both cubic-bezier(.22,1,.36,1)}
.a2{animation:fu .9s .18s both cubic-bezier(.22,1,.36,1)}
.a3{animation:fu .9s .30s both cubic-bezier(.22,1,.36,1)}
.a4{animation:fu .9s .44s both cubic-bezier(.22,1,.36,1)}
.a5{animation:fu .9s .58s both cubic-bezier(.22,1,.36,1)}

/* ── Root ── */
.lp-root{font-family:var(--font);background:var(--ink);color:#fff;overflow-x:hidden;}

/* ════════════════
   NAVBAR
════════════════ */
.lp-nav{
  position:fixed;top:0;left:0;right:0;z-index:300;
  height:74px;padding:0 36px;
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  background:rgba(26,26,26,0);
  border-bottom:1px solid transparent;
  transition:background .4s,border-color .4s,backdrop-filter .4s;
}
.lp-nav::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(184,160,130,0),transparent);
  transition:background .4s;
}
.lp-scrolled{
  background:rgba(26,26,26,0.90)!important;
  backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);
  border-bottom-color:rgba(184,160,130,0.10)!important;
}
.lp-scrolled::after{
  background:linear-gradient(90deg,transparent,rgba(184,160,130,0.18),transparent)!important;
}


/* School name (centred) */
.lp-nav-name{
  font-family:var(--font-h);font-size:15px;font-weight:600;
  color:var(--gold);white-space:nowrap;
  position:absolute;left:50%;transform:translateX(-50%);
}

.lp-nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}

.lp-lang-pill{
  display:flex;background:rgba(184,160,130,0.07);
  border:1px solid rgba(184,160,130,0.14);border-radius:8px;padding:3px;gap:2px;
}
.lp-lang-btn{
  padding:4px 12px;border-radius:6px;border:none;
  background:transparent;color:rgba(184,160,130,0.38);
  font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
  transition:all .15s;
}
.lp-lang-btn.on{background:rgba(184,160,130,0.18);color:var(--gold);}

.lp-ghost{
  padding:7px 18px;border:1px solid rgba(184,160,130,0.26);border-radius:9px;
  background:transparent;color:var(--gold);font-size:13px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all .18s;
}
.lp-ghost:hover{background:rgba(184,160,130,0.08);border-color:rgba(184,160,130,0.5);}
.lp-gold{
  padding:7px 20px;background:var(--gold);border-radius:9px;border:none;
  color:var(--ink);font-size:13px;font-weight:800;
  cursor:pointer;font-family:var(--font);transition:all .18s;
}
.lp-gold:hover{background:var(--gold2);box-shadow:0 4px 18px rgba(184,160,130,0.3);}

/* ════════════════
   HERO
════════════════ */
.lp-hero{
  position:relative;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  background:url('/landingpage.png') center/cover no-repeat;
  overflow:hidden;
}
.lp-hero-overlay{
  position:absolute;inset:0;
  background:linear-gradient(
    180deg,
    rgba(26,26,26,.60) 0%,
    rgba(26,26,26,.28) 35%,
    rgba(26,26,26,.42) 65%,
    rgba(26,26,26,.95) 100%
  );
}

.lp-hero-body{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;padding:110px 32px 90px;
  max-width:800px;margin:0 auto;width:100%;
}

.lp-eyebrow{
  font-size:11px;letter-spacing:.34em;color:rgba(184,160,130,.60);
  font-weight:700;text-transform:uppercase;margin-bottom:22px;
}
.lp-title{
  font-family:var(--font-h);
  font-size:clamp(38px,7.5vw,80px);font-weight:700;
  color:#fff;line-height:1.05;margin-bottom:22px;
  text-shadow:0 4px 32px rgba(0,0,0,.55);
}

.lp-divider{display:flex;align-items:center;gap:10px;width:180px;margin:0 auto 24px;}
.lp-dline{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,.48),transparent);}
.lp-gem{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);flex-shrink:0;opacity:.8;}

.lp-tagline{
  font-size:clamp(15px,2.2vw,20px);color:rgba(184,160,130,.85);
  font-weight:600;margin-bottom:10px;line-height:1.55;
}
.lp-sub{
  font-size:clamp(13px,1.5vw,15px);color:rgba(255,255,255,.42);
  font-weight:400;max-width:460px;line-height:1.95;margin-bottom:46px;
}


/* CTA row */
.lp-cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}
.lp-cta-outline{
  padding:13px 38px;border:1.5px solid rgba(184,160,130,.36);border-radius:12px;
  background:rgba(26,26,26,.45);backdrop-filter:blur(8px);
  color:var(--gold);font-size:14px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all .2s;
}
.lp-cta-outline:hover{border-color:var(--gold);background:rgba(184,160,130,.10);}
.lp-cta-gold{
  padding:13px 40px;background:var(--gold);border-radius:12px;border:none;
  color:var(--ink);font-size:14px;font-weight:900;
  cursor:pointer;font-family:var(--font);transition:all .2s;
  box-shadow:0 6px 28px rgba(184,160,130,.30);
}
.lp-cta-gold:hover{background:var(--gold2);transform:translateY(-2px);box-shadow:0 12px 36px rgba(184,160,130,.42);}

/* Scroll pip */
.lp-scroll-pip{
  position:absolute;bottom:28px;left:50%;
  width:6px;height:6px;border-radius:50%;background:var(--gold);
  opacity:.5;
  animation:pip 1.9s ease-in-out infinite;
}

/* ════════════════
   NUMBERS STRIP
════════════════ */
.lp-strip{
  display:flex;justify-content:center;align-items:stretch;
  background:var(--ink2);
  border-top:1px solid rgba(184,160,130,.07);
  border-bottom:1px solid rgba(184,160,130,.07);
}
.lp-num{
  flex:1;max-width:280px;padding:44px 24px;
  display:flex;flex-direction:column;align-items:center;gap:8px;
  border-inline-end:1px solid rgba(184,160,130,.07);
  transition:background .22s;
}
.lp-num:last-child{border-inline-end:none;}
.lp-num:hover{background:rgba(184,160,130,.04);}
.lp-num-n{
  font-size:54px;font-weight:900;color:var(--gold);
  line-height:1;font-family:var(--font-h);letter-spacing:-1px;
}
.lp-num-l{font-size:13px;color:rgba(255,255,255,.32);font-weight:600;letter-spacing:.04em;}

/* ════════════════
   FOOTER
════════════════ */
.lp-footer{
  position:relative;overflow:hidden;
  background:#060809;
  padding:90px 24px 64px;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;
  border-top:1px solid rgba(184,160,130,.06);
}
.lp-footer-glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 60%,rgba(184,160,130,.08),transparent 55%);
}
.lp-footer-title{
  font-family:var(--font-h);
  font-size:clamp(28px,5vw,50px);font-weight:700;
  color:var(--gold);margin-bottom:12px;position:relative;
}
.lp-footer-sub{
  font-size:15px;color:rgba(255,255,255,.32);
  max-width:420px;line-height:1.9;margin-bottom:36px;position:relative;
}
.lp-credit{
  margin-top:52px;font-size:11px;color:rgba(184,160,130,.18);
  letter-spacing:.18em;text-transform:uppercase;position:relative;
}

/* ════════════════
   RESPONSIVE
════════════════ */
@media(max-width:760px){
  .lp-nav{padding:0 14px;height:60px;gap:8px;}
  .lp-nav-name{display:none;}
  .lp-ghost{display:none;}
  .lp-gold{padding:7px 14px;font-size:12.5px;}
  .lp-lang-pill{padding:2px;}
  .lp-lang-btn{padding:4px 10px;font-size:10.5px;}

  .lp-hero-body{padding:90px 20px 76px;}
  .lp-eyebrow{font-size:10px;letter-spacing:.26em;margin-bottom:18px;}
  .lp-title{font-size:clamp(34px,9vw,52px);margin-bottom:18px;}
  .lp-divider{width:140px;margin:0 auto 20px;}
  .lp-tagline{font-size:15px;margin-bottom:8px;}
  .lp-sub{font-size:13px;line-height:1.85;margin-bottom:34px;max-width:380px;}

.lp-cta{flex-direction:column;align-items:stretch;width:100%;max-width:300px;margin:0 auto;}
  .lp-cta-outline,.lp-cta-gold{width:100%;padding:13px 22px;font-size:13.5px;}

  .lp-strip{flex-direction:column;}
  .lp-num{
    max-width:100%;border-inline-end:none;
    border-bottom:1px solid rgba(184,160,130,.07);padding:28px 24px;
  }
  .lp-num:last-child{border-bottom:none;}
  .lp-num-n{font-size:44px;}
  .lp-num-l{font-size:12px;}

  .lp-footer{padding:68px 20px 52px;}
  .lp-footer-title{font-size:clamp(26px,7vw,40px);}
  .lp-footer-sub{font-size:13.5px;margin-bottom:28px;}
  .lp-credit{margin-top:42px;font-size:10.5px;}
}

@media(max-width:400px){
  .lp-nav{padding:0 10px;height:56px;}
  .lp-gold{padding:6px 12px;font-size:11.5px;}
  .lp-hero-body{padding:84px 14px 68px;}
.lp-num-n{font-size:38px;}
}
`;
