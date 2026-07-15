"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeartHandshake, BookOpen, Compass } from "lucide-react";
import IdentityStar from "@/components/IdentityStar";

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
    identityLabel: "جيل الرواد",
    identityTitle: "هوية تُرى، وقيم تُعاش",
    identitySub: "مساحة واحدة تلتقي فيها الأخلاق والعلم والقيادة.",
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
    identityLabel: "Gjenerata e Pionierëve",
    identityTitle: "Identitet që shihet, vlera që jetohen",
    identitySub: "Një hapësirë ku takohen vlerat, dija dhe lidershipi.",
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
  // Arabic is the platform default regardless of the school's own
  // configured language — visitors can still switch via the AR/SQ toggle.
  const [lang, setLang] = useState<Lang>("ar");
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
  const arabicNameParts = lang === "ar" ? displayName.trim().match(/^(.*?)\s*(\([^)]*\))$/) : null;
  const heroName = arabicNameParts?.[1]?.trim() || displayName;
  const heroSignature = arabicNameParts?.[2]?.replace(/[()]/g, "").trim() || null;

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

        {/* ══ HERO — the artwork as a true full-bleed background ══ */}
        <section className="lp-hero">
          <Image
            src="/landingpage.png"
            alt=""
            fill
            sizes="100vw"
            className="lp-hero-bg"
            priority
          />
          <div className="lp-hero-wash" aria-hidden="true" />

          <div className="lp-hero-panel">
            <p className="lp-eyebrow a1">
              <IdentityStar size={12} strokeWidth={5} color="#8F765B" />
              {tr.eyebrow}
            </p>
            <h1 className="lp-title a2">
              <span className="lp-title-main">{heroName}</span>
              {heroSignature && (
                <span className="lp-title-signature">
                  <i aria-hidden="true" />
                  <b>{heroSignature}</b>
                  <i aria-hidden="true" />
                </span>
              )}
            </h1>

            <div className="lp-divider a3">
              <span className="lp-dline" />
              <span className="lp-gem" />
              <span className="lp-dline" />
            </div>

            <div className="lp-cta a4">
              <button className="lp-cta-outline" onClick={goLogin}>{tr.loginBtn}</button>
              <button className="lp-cta-gold" onClick={goSignup}>{tr.signupBtn}</button>
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

        {/* ══ IDENTITY BREAK ══ */}
        <section className="lp-identity-break" aria-label={tr.identityLabel}>
          <div className="lp-identity-art">
            <Image
              src="/newIdentityBG.png"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 54vw"
              className="lp-identity-art-image"
            />
          </div>
          <div className="lp-identity-copy">
            <p>{tr.identityLabel}</p>
            <h2>{tr.identityTitle}</h2>
            <span>{tr.identitySub}</span>
          </div>
        </section>

        {/* ══ FOOTER CTA ══ */}
        <footer className="lp-footer">
          <div className="lp-footer-glow" />
          <div className="lp-footer-identity" aria-hidden="true">
            <Image
              src="/newIdentityBG.png"
              alt=""
              fill
              sizes="(max-width: 760px) 420px, 620px"
              className="lp-footer-identity-image"
            />
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
@import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Readex+Pro:wght@500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}

:root{
  --gold:#B8A082; --gold-soft:#D9C9B0; --gold-dk:#8F765B;
  --burgundy:#6B1E2D; --burgundy-deep:#4A0E1C; --burgundy-darkest:#32101A; --burgundy-mid:#5B1526;
  --cream:#EFEAE0; --cream-soft:#FBF8F1; --cream-card:#FFFBF5;
  --ink:#1A1A1A; --ink-muted:#655B53; --ink-soft:#8C8274;
  --font:'IBM Plex Sans Arabic','Manrope',sans-serif;
  --font-h:'Alexandria','IBM Plex Sans Arabic','Manrope',sans-serif;
  --font-hero:'Readex Pro','IBM Plex Sans Arabic','Manrope',sans-serif;
}

@keyframes fu{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}

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
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;padding:110px 24px 70px;
}
.lp-hero::after{content:"";position:absolute;z-index:1;inset-inline:0;bottom:-1px;height:150px;background:linear-gradient(180deg,transparent 0%,rgba(239,234,224,.56) 48%,var(--cream) 100%);pointer-events:none;}
.lp-hero-bg{
  object-fit:cover;object-position:center;
  z-index:0;
}
.lp-hero-wash{
  position:absolute;inset:0;z-index:1;pointer-events:none;
  background:
    radial-gradient(ellipse at 50% 48%,rgba(255,251,245,.82) 0%,rgba(255,251,245,.48) 34%,rgba(239,234,224,.08) 67%,transparent 78%),
    linear-gradient(180deg,rgba(239,234,224,.68) 0%,rgba(239,234,224,.14) 28%,rgba(239,234,224,.10) 62%,rgba(239,234,224,.56) 100%);
}

.lp-hero-panel{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  width:min(100%,680px);margin:0 auto;padding:50px 42px 46px;
}
.lp-hero-panel:before{content:"";width:72px;height:2px;margin-bottom:22px;background:linear-gradient(90deg,transparent,#B8A082,transparent);}
.lp-eyebrow{
  display:inline-flex;align-items:center;gap:9px;
  font-size:10.5px;letter-spacing:.18em;color:var(--gold-dk);
  font-weight:700;text-transform:uppercase;margin-bottom:22px;
}
.lp-title{
  width:100%;font-family:var(--font-hero);
  color:var(--ink);margin:0 0 20px;letter-spacing:0;
  text-shadow:0 2px 24px rgba(255,255,255,.6);
}
.lp-title-main{display:block;font-size:58px;font-weight:600;line-height:1.32;letter-spacing:0;}
.lp-title-signature{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px;color:var(--burgundy);font-size:18px;line-height:1.5;text-shadow:none;}
.lp-title-signature i{display:block;width:48px;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,.86));}
.lp-title-signature i:last-child{background:linear-gradient(90deg,rgba(184,160,130,.86),transparent);}
.lp-title-signature b{font-weight:600;letter-spacing:.08em;}
.lp-divider{display:flex;align-items:center;gap:10px;width:130px;margin:0 auto 24px;}
.lp-dline{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,.55),transparent);}
.lp-gem{width:5px;height:5px;background:var(--burgundy);transform:rotate(45deg);flex-shrink:0;}

.lp-cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}
.lp-cta-outline{
  padding:13px 34px;border:1.5px solid rgba(107,30,45,.30);border-radius:12px;
  background:rgba(255,251,245,.7);backdrop-filter:blur(6px);
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

/* ════════════════
   PILLARS
════════════════ */
.lp-pillars{position:relative;z-index:2;max-width:none;margin:0 auto;padding:88px max(36px,calc((100vw - 1180px)/2)) 56px;background:linear-gradient(180deg,var(--cream) 0%,var(--cream-soft) 72%,#F7F3EB 100%);}
.lp-pillars:before{content:"";position:absolute;top:0;inset-inline:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,.42),transparent);}
.lp-pillars-head{text-align:center;margin-bottom:40px;}
.lp-pillars-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  font-size:10.5px;letter-spacing:.26em;color:var(--gold-dk);
  font-weight:800;text-transform:uppercase;margin-bottom:12px;
}
.lp-pillars-head h2{font-family:var(--font-h);font-size:clamp(25px,3.6vw,36px);font-weight:700;line-height:1.5;color:var(--ink);letter-spacing:0;}

.lp-pillars-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
.lp-pillar{
  position:relative;overflow:hidden;
  background:linear-gradient(180deg,rgba(255,251,245,.96),rgba(251,248,241,.84));
  border:1px solid rgba(184,160,130,.28);border-radius:18px;padding:30px 24px;min-height:218px;
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
.lp-pillar h3{font-family:var(--font-h);font-size:17px;font-weight:700;line-height:1.6;color:var(--ink);margin-bottom:8px;letter-spacing:0;}
.lp-pillar p{font-size:13.5px;color:var(--ink-muted);line-height:2;}

/* ════════════════
   IDENTITY BREAK
════════════════ */
.lp-identity-break{
  position:relative;z-index:2;min-height:470px;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);align-items:center;gap:28px;
  padding:24px max(36px,calc((100vw - 1180px)/2)) 150px;background:linear-gradient(180deg,#F7F3EB 0%,#EFEAE0 66%,#E5E0D5 100%);
}
.lp-identity-break:after{content:"";position:absolute;z-index:3;inset-inline:0;bottom:0;height:150px;background:linear-gradient(180deg,rgba(50,16,26,0),rgba(50,16,26,.16) 42%,#32101A 100%);pointer-events:none;}
.lp-identity-art{position:relative;min-height:330px;max-width:540px;width:100%;margin-inline:auto;}
.lp-identity-art-image{object-fit:contain;object-position:center;opacity:.92;filter:saturate(.96) contrast(1.04);}
.lp-identity-copy{position:relative;max-width:380px;padding:28px 30px;border-inline-start:2px solid rgba(107,30,45,.28);}
.lp-identity-copy:before{content:"";position:absolute;inset-inline-start:-7px;top:32px;width:12px;height:12px;background:var(--burgundy);transform:rotate(45deg);box-shadow:0 0 0 6px var(--cream-soft);}
.lp-identity-copy p{color:var(--gold-dk);font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;margin-bottom:14px;}
.lp-identity-copy h2{font-family:var(--font-h);font-size:clamp(25px,3vw,39px);font-weight:700;line-height:1.55;color:var(--ink);margin-bottom:12px;letter-spacing:0;}
.lp-identity-copy span{display:block;color:var(--ink-muted);font-size:14.5px;line-height:2;}

/* ════════════════
   FOOTER
════════════════ */
.lp-footer{
  position:relative;overflow:hidden;margin-top:0;
  background:radial-gradient(circle at 85% 0%, rgba(184,160,130,.16), transparent 40%),radial-gradient(circle at 12% 108%, rgba(107,30,45,.46), transparent 46%),linear-gradient(150deg,#32101A 0%,#4A0E1C 55%,#5B1526 100%);
  padding:82px 24px 56px;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;
}
.lp-footer:before{content:"";position:absolute;top:0;inset-inline:0;height:1px;background:linear-gradient(90deg,transparent,rgba(217,201,176,.42) 30%,rgba(217,201,176,.42) 70%,transparent);}
.lp-footer-glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 40%,rgba(184,160,130,.10),transparent 55%);
}
.lp-footer-identity{position:absolute;width:min(48vw,610px);aspect-ratio:1;inset-inline-start:-110px;top:50%;transform:translateY(-50%);pointer-events:none;opacity:.34;}
.lp-footer-identity-image{object-fit:contain;filter:saturate(.88) brightness(.9) contrast(1.05);}
.lp-footer-body{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;}
.lp-footer-title{
  font-family:var(--font-h);
  font-size:clamp(27px,4.4vw,44px);font-weight:700;line-height:1.5;
  color:#FFFBF5;margin-bottom:12px;letter-spacing:0;
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
  .lp-hero-panel{padding:42px 32px;}
  .lp-title-main{font-size:50px;}
}

@media(max-width:760px){
  .lp-nav{padding:0 14px;height:60px;gap:8px;}
  .lp-nav-name{display:none;}
  .lp-ghost{display:none;}
  .lp-gold{padding:7px 14px;font-size:12.5px;}
  .lp-lang-pill{padding:2px;}
  .lp-lang-btn{padding:4px 10px;font-size:10.5px;}

  .lp-hero{padding:88px 18px 50px;}
  .lp-hero-panel{padding:32px 18px;}
  .lp-title-main{font-size:40px;line-height:1.4;}
  .lp-title-signature{font-size:15px;margin-top:5px;}.lp-title-signature i{width:34px;}
  .lp-cta{flex-direction:column;align-items:stretch;width:100%;max-width:320px;margin-inline:auto;}
  .lp-cta-outline,.lp-cta-gold{width:100%;padding:13px 22px;font-size:13.5px;}

  .lp-pillars{padding:60px 18px 10px;}
  .lp-pillars-grid{grid-template-columns:1fr;}

  .lp-identity-break{grid-template-columns:1fr;min-height:0;padding:10px 18px 130px;gap:0;}
  .lp-identity-art{min-height:290px;order:0;}
  .lp-identity-copy{order:1;max-width:440px;margin:0 auto;padding:16px 22px 16px 24px;border-inline-start:0;border-top:1px solid rgba(107,30,45,.22);}
  .lp-identity-copy:before{top:-7px;inset-inline-start:50%;margin-inline-start:-6px;}

  .lp-footer{padding:68px 20px 44px;margin-top:0;}
  .lp-footer-identity{width:430px;inset-inline-start:-190px;opacity:.24;}
  .lp-footer-sub{margin-bottom:26px;}
}

@media(max-width:400px){
  .lp-nav{padding:0 10px;height:56px;}
  .lp-gold{padding:6px 12px;font-size:11.5px;}
  .lp-title-main{font-size:34px;}
}
`;
