"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeartHandshake, BookOpen, Compass } from "lucide-react";
import IdentityStar from "@/components/IdentityStar";
import IdentityMandala from "@/components/IdentityMandala";

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
    loginBtn: "تسجيل الدخول", signupBtn: "إنشاء حساب",
    pillarsEyebrow: "ركائزنا",
    pillarsTitle: "ثلاث ركائز، رؤية واحدة",
    pillars: [
      { title: "الأخلاق", desc: "نغرس القيم والمبادئ التي تبني الإنسان قبل أن تبني المتعلم." },
      { title: "العلم", desc: "محتوى تعليمي متدرّج يوازن بين الأصالة والحداثة في كل مرحلة." },
      { title: "القيادة", desc: "نُعِدّ جيلاً قادراً على الريادة وصناعة الأثر في مجتمعه." },
    ],
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
    loginBtn: "Hyrje", signupBtn: "Regjistrohu",
    pillarsEyebrow: "Shtyllat Tona",
    pillarsTitle: "Tri shtylla, një vizion",
    pillars: [
      { title: "Vlerat morale", desc: "Mbjellim vlerat dhe parimet që ndërtojnë njeriun para se të ndërtojnë nxënësin." },
      { title: "Dija", desc: "Përmbajtje edukative e gradualizuar, që balancon autenticitetin me modernitetin." },
      { title: "Lidershipi", desc: "Përgatisim një brez të aftë të udhëheqë dhe të krijojë ndikim në komunitetin e tij." },
    ],
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

  const pillarIcons = [HeartHandshake, BookOpen, Compass];

  return (
    <>
      <style>{css}</style>
      <div dir={tr.dir} className="lp-root">

        {/* ══ NAVBAR ══ */}
        <nav className={`lp-nav${scrolled ? " lp-scrolled" : ""}`}>
          <span className="lp-nav-name">{displayName}</span>

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
          <div className="lp-hero-glow" aria-hidden="true" />
          <div className="lp-hero-grid">
            <div className="lp-hero-text">
              <p className="lp-eyebrow a1">
                <IdentityStar size={12} strokeWidth={5} color="#8F765B" />
                {tr.eyebrow}
              </p>
              <h1 className="lp-title a2">{displayName}</h1>

              <div className="lp-divider a3">
                <span className="lp-dline" />
                <span className="lp-gem" />
                <span className="lp-dline" />
              </div>

              <p className="lp-tagline a3">{tr.vision}</p>
              <p className="lp-sub a4">{tr.sub}</p>

              <div className="lp-cta a5">
                <button className="lp-cta-outline" onClick={goLogin}>{tr.loginBtn}</button>
                <button className="lp-cta-gold" onClick={goSignup}>{tr.signupBtn}</button>
              </div>
            </div>

            <div className="lp-hero-art a4">
              <div className="lp-art-frame">
                <Image src="/landingpage.png" alt={displayName} fill sizes="(max-width: 900px) 90vw, 44vw" className="lp-art-img" priority />
                <div className="lp-art-frame-glow" aria-hidden="true" />
              </div>
              <div className="lp-art-badge" aria-hidden="true">
                <IdentityMandala size={68} stroke="#B8A082" opacity={0.95} spin spinDuration={90} />
              </div>
            </div>
          </div>
        </section>

        {/* ══ PILLARS ══ */}
        <section className="lp-pillars">
          <div className="lp-pillars-head">
            <p className="lp-pillars-eyebrow">
              <IdentityStar size={11} strokeWidth={5} color="#B8A082" />
              {tr.pillarsEyebrow}
            </p>
            <h2>{tr.pillarsTitle}</h2>
          </div>
          <div className="lp-pillars-grid">
            {tr.pillars.map((p, i) => {
              const Icon = pillarIcons[i];
              return (
                <div key={p.title} className="lp-pillar">
                  <div className="lp-pillar-icon"><Icon size={22} strokeWidth={1.7} /></div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ NUMBERS STRIP ══ */}
        <div className="lp-strip">
          {[
            { n: school.student_count, l: tr.students },
            { n: school.teacher_count, l: tr.teachers },
            { n: school.class_count, l: tr.classes },
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
          <div className="lp-footer-mandala" aria-hidden="true">
            <IdentityMandala size={340} stroke="#D9C9B0" opacity={0.85} spin spinDuration={150} />
          </div>
          <div className="lp-footer-body">
            <h2 className="lp-footer-title">{tr.joinTitle}</h2>
            <p className="lp-footer-sub">{tr.joinSub}</p>
            <div className="lp-cta">
              <button className="lp-cta-outline lp-cta-outline--dark" onClick={goLogin}>{tr.loginBtn}</button>
              <button className="lp-cta-gold" onClick={goSignup}>{tr.signupBtn}</button>
            </div>
            <p className="lp-credit">{tr.poweredBy}</p>
          </div>
        </footer>

      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Noto+Kufi+Arabic:wght@500;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}

:root{
  --gold:#B8A082; --gold-soft:#D9C9B0; --gold-dk:#8F765B;
  --burgundy:#6B1E2D; --burgundy-deep:#4A0E1C; --burgundy-darkest:#32101A; --burgundy-mid:#5B1526;
  --cream:#EFEAE0; --cream-soft:#FBF8F1; --cream-card:#FFFBF5;
  --ink:#1A1A1A; --ink-muted:#655B53; --ink-soft:#8C8274;
  --font:'Cairo',sans-serif; --font-h:'Noto Kufi Arabic','Cairo',sans-serif;
}

@keyframes fu{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp-shimmer{0%,15%{background-position:0 0,-60% 0}65%,100%{background-position:0 0,160% 0}}
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}

.a1{animation:fu .9s .05s both cubic-bezier(.22,1,.36,1)}
.a2{animation:fu .9s .18s both cubic-bezier(.22,1,.36,1)}
.a3{animation:fu .9s .30s both cubic-bezier(.22,1,.36,1)}
.a4{animation:fu .9s .44s both cubic-bezier(.22,1,.36,1)}
.a5{animation:fu .9s .58s both cubic-bezier(.22,1,.36,1)}

/* ── Root ── */
.lp-root{
  font-family:var(--font);color:var(--ink);overflow-x:hidden;
  background:
    radial-gradient(ellipse at 10% 0%, rgba(184,160,130,.10), transparent 32%),
    radial-gradient(ellipse at 92% 18%, rgba(107,30,45,.06), transparent 34%),
    radial-gradient(ellipse at 15% 85%, rgba(184,160,130,.08), transparent 30%),
    var(--cream);
}

/* ════════════════
   NAVBAR
════════════════ */
.lp-nav{
  position:fixed;top:0;left:0;right:0;z-index:300;
  height:74px;padding:0 36px;
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  background:rgba(239,234,224,0);
  border-bottom:1px solid transparent;
  transition:background .4s,border-color .4s,backdrop-filter .4s;
}
.lp-scrolled{
  background:rgba(251,248,241,0.86)!important;
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  border-bottom-color:rgba(184,160,130,0.22)!important;
  box-shadow:0 6px 24px rgba(74,14,28,.05);
}

.lp-nav-name{
  font-family:var(--font-h);font-size:15px;font-weight:700;
  color:var(--burgundy);white-space:nowrap;
  position:absolute;left:50%;transform:translateX(-50%);
}

.lp-nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}

.lp-lang-pill{
  display:flex;background:rgba(184,160,130,0.10);
  border:1px solid rgba(184,160,130,0.24);border-radius:8px;padding:3px;gap:2px;
}
.lp-lang-btn{
  padding:4px 12px;border-radius:6px;border:none;
  background:transparent;color:rgba(107,30,45,0.42);
  font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
  transition:all .15s;
}
.lp-lang-btn.on{background:rgba(107,30,45,0.12);color:var(--burgundy);}

.lp-ghost{
  padding:7px 18px;border:1.5px solid rgba(107,30,45,0.26);border-radius:9px;
  background:transparent;color:var(--burgundy);font-size:13px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all .18s;
}
.lp-ghost:hover{background:rgba(107,30,45,0.06);border-color:rgba(107,30,45,0.5);}
.lp-gold{
  padding:7px 20px;background:linear-gradient(180deg,#5B1526,#32101A);border-radius:9px;border:1px solid rgba(184,160,130,.35);
  color:var(--gold-soft);font-size:13px;font-weight:800;
  cursor:pointer;font-family:var(--font);transition:all .18s;
}
.lp-gold:hover{box-shadow:0 6px 20px rgba(74,14,28,.30);transform:translateY(-1px);}

/* ════════════════
   HERO
════════════════ */
.lp-hero{
  position:relative;min-height:100vh;
  display:flex;align-items:center;
  overflow:hidden;padding:110px 36px 70px;
}
.lp-hero-glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 60% 55% at 78% 30%, rgba(184,160,130,.16), transparent 60%);
}
.lp-hero-grid{
  position:relative;z-index:2;width:100%;max-width:1180px;margin:0 auto;
  display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;
}
/* Grid items default to min-width:auto, which — combined with a flex
   child sized entirely off aspect-ratio (no intrinsic width of its own)
   — collapses the whole column to 0 in some browsers. Both rules below
   break that circularity. */
.lp-hero-grid > *{min-width:0;}

.lp-hero-text{text-align:start;}
.lp-eyebrow{
  display:inline-flex;align-items:center;gap:9px;
  font-size:11px;letter-spacing:.28em;color:var(--gold-dk);
  font-weight:800;text-transform:uppercase;margin-bottom:22px;
}
.lp-title{
  font-family:var(--font-h);
  font-size:clamp(34px,5.4vw,58px);font-weight:800;
  color:var(--ink);line-height:1.12;margin-bottom:20px;
}
.lp-divider{display:flex;align-items:center;gap:10px;width:160px;margin-bottom:22px;}
.lp-dline{flex:1;height:1px;background:linear-gradient(90deg,rgba(184,160,130,.55),transparent);}
.lp-gem{width:5px;height:5px;background:var(--burgundy);transform:rotate(45deg);flex-shrink:0;}

.lp-tagline{
  font-size:clamp(16px,2vw,20px);color:var(--burgundy);
  font-weight:700;margin-bottom:12px;line-height:1.55;font-family:var(--font-h);
}
.lp-sub{
  font-size:clamp(13.5px,1.4vw,15px);color:var(--ink-muted);
  font-weight:500;max-width:460px;line-height:1.95;margin-bottom:38px;
}

.lp-cta{display:flex;gap:12px;flex-wrap:wrap;}
.lp-hero-text .lp-cta{justify-content:flex-start;}
.lp-cta-outline{
  padding:13px 34px;border:1.5px solid rgba(107,30,45,.30);border-radius:12px;
  background:rgba(255,251,245,.6);backdrop-filter:blur(6px);
  color:var(--burgundy);font-size:14px;font-weight:800;
  cursor:pointer;font-family:var(--font);transition:all .2s;
}
.lp-cta-outline:hover{border-color:var(--burgundy);background:rgba(107,30,45,.06);}
.lp-cta-outline--dark{border-color:rgba(217,201,176,.4);background:rgba(255,255,255,.06);color:var(--gold-soft);}
.lp-cta-outline--dark:hover{border-color:var(--gold-soft);background:rgba(255,255,255,.10);}
.lp-cta-gold{
  padding:13px 38px;background:linear-gradient(180deg,#5B1526,#32101A);border-radius:12px;border:1px solid rgba(184,160,130,.4);
  color:var(--gold-soft);font-size:14px;font-weight:800;
  cursor:pointer;font-family:var(--font);transition:all .2s;
  box-shadow:0 10px 30px rgba(74,14,28,.22);
}
.lp-cta-gold:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(74,14,28,.32);}

/* Hero artwork frame */
.lp-hero-art{position:relative;width:100%;display:flex;align-items:center;justify-content:center;}
.lp-art-frame{
  position:relative;width:100%;aspect-ratio:1672/941;border-radius:26px;overflow:hidden;
  border:1.5px solid rgba(184,160,130,.4);
  box-shadow:0 30px 70px rgba(74,14,28,.16), 0 4px 0 rgba(255,255,255,.5) inset;
  animation:lp-float 7s ease-in-out infinite;
}
.lp-art-img{object-fit:cover;}
.lp-art-frame-glow{
  position:absolute;inset:0;pointer-events:none;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
  background:linear-gradient(160deg, rgba(255,255,255,.10), transparent 40%);
}
.lp-art-badge{
  position:absolute;bottom:-18px;inset-inline-start:-18px;
  width:76px;height:76px;border-radius:50%;
  background:linear-gradient(160deg,#4A0E1C,#32101A);
  border:1px solid rgba(184,160,130,.45);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 14px 32px rgba(74,14,28,.30);
}

/* ════════════════
   PILLARS
════════════════ */
.lp-pillars{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:90px 36px 30px;}
.lp-pillars-head{text-align:center;margin-bottom:40px;}
.lp-pillars-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  font-size:10.5px;letter-spacing:.26em;color:var(--gold-dk);
  font-weight:800;text-transform:uppercase;margin-bottom:12px;
}
.lp-pillars-head h2{font-family:var(--font-h);font-size:clamp(24px,3.6vw,34px);font-weight:800;color:var(--ink);}

.lp-pillars-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
.lp-pillar{
  position:relative;overflow:hidden;
  background:linear-gradient(180deg,var(--cream-card),var(--cream-soft));
  border:1px solid rgba(184,160,130,.28);border-radius:20px;padding:28px 24px;
  text-align:center;box-shadow:0 12px 30px rgba(74,14,28,.05);
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;
}
.lp-pillar:before{content:"";position:absolute;top:0;inset-inline:22px;height:2px;background:linear-gradient(90deg,transparent,#B8A082,transparent);}
.lp-pillar:hover{transform:translateY(-5px);border-color:rgba(184,160,130,.55);box-shadow:0 20px 42px rgba(74,14,28,.10);}
.lp-pillar-icon{
  width:56px;height:56px;margin:0 auto 16px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(160deg,rgba(107,30,45,.10),rgba(184,160,130,.14));
  color:var(--burgundy);border:1px solid rgba(184,160,130,.3);
}
.lp-pillar h3{font-family:var(--font-h);font-size:17px;font-weight:800;color:var(--ink);margin-bottom:8px;}
.lp-pillar p{font-size:13px;color:var(--ink-muted);line-height:1.85;}

/* ════════════════
   NUMBERS STRIP
════════════════ */
.lp-strip{
  position:relative;z-index:2;max-width:1000px;margin:60px auto 0;padding:0 36px;
  display:flex;justify-content:center;align-items:stretch;gap:16px;
}
.lp-num{
  flex:1;max-width:280px;padding:30px 24px;
  display:flex;flex-direction:column;align-items:center;gap:8px;
  background:var(--cream-card);border:1px solid rgba(184,160,130,.28);border-radius:20px;
  box-shadow:0 12px 28px rgba(74,14,28,.05);
  transition:transform .2s ease,box-shadow .2s ease;
}
.lp-num:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(74,14,28,.09);}
.lp-num-n{
  font-size:44px;font-weight:800;color:var(--burgundy);
  line-height:1;font-family:var(--font-h);
}
.lp-num-l{font-size:12.5px;color:var(--ink-soft);font-weight:700;letter-spacing:.03em;}

/* ════════════════
   FOOTER
════════════════ */
.lp-footer{
  position:relative;overflow:hidden;margin-top:90px;
  background:radial-gradient(circle at 85% -20%, rgba(184,160,130,.18), transparent 42%), radial-gradient(circle at 10% 110%, rgba(107,30,45,.5), transparent 44%), linear-gradient(150deg,#32101A 0%,#4A0E1C 55%,#5B1526 100%);
  padding:96px 24px 56px;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;
}
.lp-footer:before{content:"";position:absolute;top:0;inset-inline:0;height:2px;background:linear-gradient(90deg,transparent,rgba(217,201,176,.65) 30%,rgba(217,201,176,.65) 70%,transparent);}
.lp-footer-glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 40%,rgba(184,160,130,.10),transparent 55%);
}
.lp-footer-mandala{position:absolute;inset-inline-end:-60px;bottom:-60px;pointer-events:none;opacity:.5;}
.lp-footer-body{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;}
.lp-footer-title{
  font-family:var(--font-h);
  font-size:clamp(26px,4.4vw,42px);font-weight:800;
  color:#FFFBF5;margin-bottom:12px;
}
.lp-footer-sub{
  font-size:14.5px;color:rgba(239,234,224,.68);
  max-width:420px;line-height:1.9;margin-bottom:32px;
}
.lp-credit{
  margin-top:46px;font-size:10.5px;color:rgba(217,201,176,.42);
  letter-spacing:.16em;text-transform:uppercase;
}

/* ════════════════
   RESPONSIVE
════════════════ */
@media(max-width:980px){
  .lp-hero-grid{grid-template-columns:1fr;gap:44px;}
  .lp-hero-text{text-align:center;}
  .lp-eyebrow,.lp-divider{margin-inline:auto;}
  .lp-sub{margin-inline:auto;}
  .lp-hero-text .lp-cta{justify-content:center;}
  .lp-hero-art{order:-1;max-width:520px;margin:0 auto;}
}

@media(max-width:760px){
  .lp-nav{padding:0 14px;height:60px;gap:8px;}
  .lp-nav-name{display:none;}
  .lp-ghost{display:none;}
  .lp-gold{padding:7px 14px;font-size:12.5px;}
  .lp-lang-pill{padding:2px;}
  .lp-lang-btn{padding:4px 10px;font-size:10.5px;}

  .lp-hero{padding:88px 18px 50px;}
  .lp-title{font-size:clamp(30px,8vw,44px);}
  .lp-cta{flex-direction:column;align-items:stretch;width:100%;max-width:320px;margin-inline:auto;}
  .lp-cta-outline,.lp-cta-gold{width:100%;padding:13px 22px;font-size:13.5px;}

  .lp-pillars{padding:60px 18px 10px;}
  .lp-pillars-grid{grid-template-columns:1fr;}

  .lp-strip{flex-direction:column;padding:0 18px;margin-top:40px;}
  .lp-num{max-width:100%;padding:22px 20px;}
  .lp-num-n{font-size:36px;}

  .lp-footer{padding:70px 20px 44px;margin-top:60px;}
  .lp-footer-sub{margin-bottom:26px;}
}

@media(max-width:400px){
  .lp-nav{padding:0 10px;height:56px;}
  .lp-gold{padding:6px 12px;font-size:11.5px;}
}
`;
