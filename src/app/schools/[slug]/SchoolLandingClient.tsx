"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ─── */
interface School {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  language: string;
  admin_name: string | null;
  student_count: number;
  teacher_count: number;
  class_count: number;
}

type Lang = "ar" | "sq";

const r2 = (n: number) => Math.round(n * 1000) / 1000;

/* ─── i18n ─── */
const STRINGS = {
  ar: {
    dir: "rtl" as const,
    vision: "تمكين الإنسان .. بناء المستقبل",
    missionTitle: "رسالتنا",
    missionText:
      "نسعى إلى بناء جيل رائد يتحلى برقي الأخلاق ويدرك قيمة العمل القائم على العلم، مستنيرًا بمقاصد الشريعة الإسلامية بوصفها مرجعية قيمية، ونحن نعمل على تحويل التعلم من التلقين إلى الاستنباط والممارسة وإنتاج المشاريع.",
    goalsTitle: "أهدافنا الأربعة",
    goals: [
      {
        icon: "⚖️",
        title: "التميز الأخلاقي",
        text: "بناء جيل يتمتّع برقي الأخلاق ويدرك قيمة العمل القائم على العلم",
      },
      {
        icon: "🎯",
        title: "رؤية 2030",
        text: "ترسيخ وعي الجيل بدوره ضمن مستهدفات رؤية المملكة 2030",
      },
      {
        icon: "🔬",
        title: "التعلم الفعّال",
        text: "التحول من التعلم بالتلقين إلى التعلم بالاستنباط والممارسة",
      },
      {
        icon: "👑",
        title: "قادة المستقبل",
        text: "إعداد قادة مؤهلين يمتلكون الرؤية والكفاءة والقدرة على القيادة",
      },
    ],
    maqasidTitle: "المقاصد الخمسة",
    maqasid: [
      { icon: "📖", label: "الدين" },
      { icon: "🫀", label: "النفس" },
      { icon: "🧠", label: "العقل" },
      { icon: "👨‍👩‍👦", label: "النسل" },
      { icon: "💰", label: "المال" },
    ],
    programTitle: "البرنامج التأهيلي",
    programStats: [
      { n: "25", label: "محتوى متخصصًا" },
      { n: "5", label: "مراحل متدرّجة" },
      { n: "5", label: "مستويات قياس" },
    ],
    measureTitle: "آلية القياس",
    measureText:
      "يُقاس كل مشارك من خلال 75 نموذج تقييم تغطي المحتويات الـ 25، بما يضمن قياس مستوى الأداء بدقة وإتاحة المقارنة بين النتائج.",
    students: "طالب",
    teachers: "معلم",
    classes: "فصل",
    loginBtn: "تسجيل الدخول",
    signupBtn: "إنشاء حساب",
    poweredBy: "مدعومة من",
    servicesTitle: "خدماتنا المتكاملة",
    services: [
      { icon: "🎓", name: "تدريب ودعم" },
      { icon: "📋", name: "عناصر المشروع" },
      { icon: "🌐", name: "البيئة بمكوناتها" },
      { icon: "🏆", name: "المنتج النهائي" },
    ],
    ctaTitle: "ابدأ رحلتك معنا",
    ctaSub: "انضم إلى أكاديمية الرواد وكن جزءًا من جيل يصنع المستقبل",
    chip75: "نموذج قياس",
    chip25: "محتوى",
    badge: "بناء الأهلية",
  },
  sq: {
    dir: "ltr" as const,
    vision: "Fuqizimi i Njeriut .. Ndërtimi i së Ardhmes",
    missionTitle: "Misioni Ynë",
    missionText:
      "Ne synojmë të ndërtojmë një gjeneratë të cilësuar me vlera të larta morale, e cila kupton vlerën e punës bazuar në dije, duke u udhëhequr nga parimet islame si referencë vlerash.",
    goalsTitle: "Katër Qëllimet Tona",
    goals: [
      {
        icon: "⚖️",
        title: "Shkëlqimi Moral",
        text: "Ndërtimi i një gjenerate me vlera morale dhe kuptim të punës bazuar në dije",
      },
      {
        icon: "🎯",
        title: "Vizioni 2030",
        text: "Konsolidimi i rolit të gjeneratës brenda objektivave të Vizionit 2030",
      },
      {
        icon: "🔬",
        title: "Mësim Efektiv",
        text: "Transformimi nga mësimi pasiv në mësimin me zbulim dhe praktikë",
      },
      {
        icon: "👑",
        title: "Liderë të Ardhshëm",
        text: "Përgatitja e liderëve të kualifikuar me vizion, kompetencë dhe kapacitet",
      },
    ],
    maqasidTitle: "Pesë Objektivat",
    maqasid: [
      { icon: "📖", label: "Feja" },
      { icon: "🫀", label: "Shpirti" },
      { icon: "🧠", label: "Mendja" },
      { icon: "👨‍👩‍👦", label: "Pasardhësit" },
      { icon: "💰", label: "Pasuria" },
    ],
    programTitle: "Programi Kualifikues",
    programStats: [
      { n: "25", label: "Përmbajtje" },
      { n: "5", label: "Faza" },
      { n: "5", label: "Nivele" },
    ],
    measureTitle: "Mekanizmi i Matjes",
    measureText:
      "Çdo pjesëmarrës matet nëpërmjet 75 modeleve vlerësimi që mbulojnë 25 përmbajtjet, duke siguruar matje të saktë dhe krahasim të rezultateve.",
    students: "nxënës",
    teachers: "mësues",
    classes: "klasë",
    loginBtn: "Hyrje",
    signupBtn: "Regjistrohu",
    poweredBy: "E mundësuar nga",
    servicesTitle: "Shërbime të Integruara",
    services: [
      { icon: "🎓", name: "Trajnim dhe Mbështetje" },
      { icon: "📋", name: "Elementet e Projektit" },
      { icon: "🌐", name: "Mjedisi" },
      { icon: "🏆", name: "Produkti" },
    ],
    ctaTitle: "Filloni Udhëtimin Tuaj",
    ctaSub:
      "Bashkohuni me Akademinë Alrowad dhe bëhuni pjesë e gjeneratës që ndërton të ardhmen",
    chip75: "modele vlerësimi",
    chip25: "përmbajtje",
    badge: "Bërthamë Alrowad",
  },
};

/* ─── Pre-compute static SVG values to avoid hydration mismatch ─── */
const GEO_LINES = [0, 60, 120, 180, 240, 300].map((a) => ({
  x2: r2(600 + 700 * Math.cos((a * Math.PI) / 180)),
  y2: r2(350 + 700 * Math.sin((a * Math.PI) / 180)),
}));

const MEASURE_DOTS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => ({
  cx: r2(120 + 88 * Math.cos((deg * Math.PI) / 180)),
  cy: r2(120 + 88 * Math.sin((deg * Math.PI) / 180)),
}));

export default function SchoolLandingClient({ school }: { school: School }) {
  const router = useRouter();
  const initialLang: Lang = school.language === "sq" ? "sq" : "ar";
  const [lang, setLang] = useState<Lang>(initialLang);
  const T = STRINGS[lang];

  const goToLogin = () => router.push(`/schools/${school.slug}/login`);
  const goToSignup = () => router.push(`/schools/${school.slug}/signup`);

  const statItems = [
    { n: school.student_count, l: T.students },
    { n: school.teacher_count, l: T.teachers },
    { n: school.class_count, l: T.classes },
  ];

  return (
    <>
      <style>{css}</style>
      <div dir={T.dir} className="lc-root">
        {/* ══ NAVBAR ══ */}
        <nav className="lc-nav">
          <div className="lc-nav-brand">
            <div className="lc-nav-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <polygon
                  points="14,2 26,8 26,20 14,26 2,20 2,8"
                  fill="none"
                  stroke="#C8A96A"
                  strokeWidth="1.2"
                  strokeOpacity="0.8"
                />
                <polygon
                  points="14,7 21,10.5 21,17.5 14,21 7,17.5 7,10.5"
                  fill="none"
                  stroke="#E5B93C"
                  strokeWidth="0.8"
                  strokeOpacity="0.5"
                />
                <circle
                  cx="14"
                  cy="14"
                  r="3.5"
                  fill="#E5B93C"
                  fillOpacity="0.7"
                />
              </svg>
            </div>
            <span className="lc-nav-name">{school.name}</span>
          </div>
          <div className="lc-nav-right">
            <div className="lc-lang-pill" dir="ltr">
              {(["ar", "sq"] as Lang[]).map((l) => (
                <button
                  key={l}
                  className={`lc-lang-btn${lang === l ? " active" : ""}`}
                  onClick={() => setLang(l)}
                >
                  {l === "ar" ? "🇸🇦 AR" : "🇦🇱 SQ"}
                </button>
              ))}
            </div>
            <button className="lc-btn-ghost" onClick={goToLogin}>
              {T.loginBtn}
            </button>
            <button className="lc-btn-gold" onClick={goToSignup}>
              {T.signupBtn}
            </button>
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section className="lc-hero">
          {/* Static SVG background — values pre-computed to avoid hydration mismatch */}
          <svg
            className="lc-hero-bg"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 1200 700"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="lc-rg1" cx="65%" cy="25%">
                <stop offset="0%" stopColor="#C8A96A" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="lc-rg2" cx="20%" cy="85%">
                <stop offset="0%" stopColor="#E5B93C" stopOpacity="0.07" />
                <stop offset="100%" stopColor="#E5B93C" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1200" height="700" fill="url(#lc-rg1)" />
            <rect width="1200" height="700" fill="url(#lc-rg2)" />
            {GEO_LINES.map((l, i) => (
              <line
                key={i}
                x1={600}
                y1={350}
                x2={l.x2}
                y2={l.y2}
                stroke="#C8A96A"
                strokeWidth="0.5"
                strokeOpacity="0.08"
              />
            ))}
            <circle
              cx="600"
              cy="350"
              r="160"
              fill="none"
              stroke="#C8A96A"
              strokeWidth="0.5"
              strokeOpacity="0.08"
            />
            <circle
              cx="600"
              cy="350"
              r="260"
              fill="none"
              stroke="#C8A96A"
              strokeWidth="0.4"
              strokeOpacity="0.06"
              strokeDasharray="4 8"
            />
            <circle
              cx="600"
              cy="350"
              r="380"
              fill="none"
              stroke="#C8A96A"
              strokeWidth="0.3"
              strokeOpacity="0.04"
            />
            <circle
              cx="600"
              cy="350"
              r="500"
              fill="none"
              stroke="#C8A96A"
              strokeWidth="0.25"
              strokeOpacity="0.03"
            />
            <polygon
              points="600,330 618,344 600,358 582,344"
              fill="#C8A96A"
              fillOpacity="0.18"
            />
            <path
              d="M0,0 L60,0 M0,0 L0,60"
              stroke="#C8A96A"
              strokeWidth="1"
              strokeOpacity="0.18"
              fill="none"
            />
            <path
              d="M1200,700 L1140,700 M1200,700 L1200,640"
              stroke="#C8A96A"
              strokeWidth="1"
              strokeOpacity="0.18"
              fill="none"
            />
          </svg>

          <div className="lc-hero-topline" />

          <div className="lc-hero-inner">
            <div className="lc-hero-badge fade-1">
              <span className="lc-badge-line" />
              <span className="lc-badge-text">{T.badge}</span>
              <span className="lc-badge-line" />
            </div>

            <div className="lc-hero-emblem scale-in">
              <div className="lc-emblem-ring lc-emblem-ring-3" />
              <div className="lc-emblem-ring lc-emblem-ring-2" />
              <div className="lc-emblem-ring lc-emblem-ring-1" />
              <div className="lc-emblem-core">
                <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
                  <polygon
                    points="40,6 72,22 72,58 40,74 8,58 8,22"
                    fill="none"
                    stroke="#C8A96A"
                    strokeWidth="1.5"
                    strokeOpacity="0.9"
                  />
                  <polygon
                    points="40,16 62,27 62,53 40,64 18,53 18,27"
                    fill="none"
                    stroke="#E5B93C"
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="12"
                    fill="none"
                    stroke="#C8A96A"
                    strokeWidth="1"
                    strokeOpacity="0.8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="5"
                    fill="#E5B93C"
                    fillOpacity="0.9"
                  />
                </svg>
              </div>
            </div>

            <h1 className="lc-hero-name fade-2">{school.name}</h1>

            <div className="lc-hero-divider fade-2">
              <div className="lc-divider-line" />
              <div className="lc-divider-diamond" />
              <div className="lc-divider-line" />
            </div>

            <p className="lc-hero-vision fade-3">{T.vision}</p>

            <div className="lc-hero-stats fade-3">
              {statItems.map(({ n, l }, i) => (
                <div key={i} className="lc-stat-item">
                  <span className="lc-stat-n">{n}</span>
                  <span className="lc-stat-l">{l}</span>
                </div>
              ))}
            </div>

            <div className="lc-hero-cta fade-4">
              <button className="lc-cta-outline" onClick={goToLogin}>
                {T.loginBtn}
              </button>
              <button className="lc-cta-gold" onClick={goToSignup}>
                {T.signupBtn}
              </button>
            </div>
          </div>

          <div className="lc-hero-fade" />
        </section>

        {/* ══ MISSION ══ */}
        <section className="lc-section lc-section-light">
          <div className="lc-section-inner lc-text-center">
            <div className="lc-section-label dark">{T.missionTitle}</div>
            <p className="lc-mission-text">{T.missionText}</p>
            {school.description && (
              <p className="lc-school-desc">{school.description}</p>
            )}
          </div>
        </section>

        {/* ══ GOALS ══ */}
        <section className="lc-section lc-section-dark lc-section-dots">
          <div className="lc-section-inner">
            <div className="lc-section-label">{T.goalsTitle}</div>
            <div className="lc-goals-grid">
              {T.goals.map((g, i) => (
                <div key={i} className="lc-goal-card">
                  <div className="lc-goal-num">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="lc-goal-icon">{g.icon}</div>
                  <h3 className="lc-goal-title">{g.title}</h3>
                  <p className="lc-goal-text">{g.text}</p>
                  <div className="lc-goal-line" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ MAQASID ══ */}
        <section className="lc-section lc-section-teal">
          <div className="lc-section-inner lc-text-center">
            <div className="lc-section-label">{T.maqasidTitle}</div>
            <div className="lc-maqasid-row">
              {T.maqasid.map((m, i) => (
                <div key={i} className="lc-maqsad-card">
                  <div className="lc-maqsad-num">{i + 1}</div>
                  <div className="lc-maqsad-icon">{m.icon}</div>
                  <span className="lc-maqsad-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ PROGRAM ══ */}
        <section className="lc-section lc-section-cream">
          <div className="lc-section-inner lc-text-center">
            <div className="lc-section-label dark">{T.programTitle}</div>
            <div className="lc-program-row">
              {T.programStats.map(({ n, label }, i) => (
                <div
                  key={i}
                  className={`lc-prog-item${i < 2 ? " bordered" : ""}`}
                >
                  <span className="lc-prog-n">{n}</span>
                  <div className="lc-prog-bar" />
                  <span className="lc-prog-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ MEASURE ══ */}
        <section className="lc-section lc-section-black">
          <div className="lc-section-inner lc-measure-layout">
            <div className="lc-measure-text">
              <div className="lc-section-label">{T.measureTitle}</div>
              <p className="lc-measure-body">{T.measureText}</p>
              <div className="lc-chips">
                {[
                  { n: "75", l: T.chip75 },
                  { n: "25", l: T.chip25 },
                ].map(({ n, l }) => (
                  <div key={n} className="lc-chip">
                    <span className="lc-chip-n">{n}</span>
                    <span className="lc-chip-l">{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lc-measure-diagram">
              <svg
                viewBox="0 0 240 240"
                width="220"
                height="220"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  stroke="#C8A96A"
                  strokeWidth="0.5"
                  strokeOpacity="0.12"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="88"
                  stroke="#E5B93C"
                  strokeWidth="0.6"
                  strokeOpacity="0.22"
                  strokeDasharray="4 6"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="64"
                  stroke="#C8A96A"
                  strokeWidth="0.8"
                  strokeOpacity="0.28"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="40"
                  stroke="#E5B93C"
                  strokeWidth="0.8"
                  strokeOpacity="0.38"
                  strokeDasharray="3 4"
                />
                {MEASURE_DOTS.map((d, i) => (
                  <circle
                    key={i}
                    cx={d.cx}
                    cy={d.cy}
                    r="5.5"
                    fill="#C8A96A"
                    fillOpacity="0.45"
                  />
                ))}
                <circle
                  cx="120"
                  cy="120"
                  r="18"
                  fill="rgba(200,169,106,0.12)"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="9"
                  fill="#E5B93C"
                  fillOpacity="0.65"
                />
                <text
                  x="120"
                  y="125"
                  textAnchor="middle"
                  fill="#C8A96A"
                  fontSize="10"
                  fontFamily="Cairo"
                  fontWeight="700"
                  fillOpacity="0.9"
                >
                  75
                </text>
              </svg>
            </div>
          </div>
        </section>

        {/* ══ SERVICES ══ */}
        <section className="lc-section lc-section-light">
          <div className="lc-section-inner">
            <div className="lc-section-label dark">{T.servicesTitle}</div>
            <div className="lc-services-grid">
              {T.services.map((s, i) => (
                <div key={i} className="lc-service-card">
                  <div className="lc-service-icon">{s.icon}</div>
                  <div className="lc-service-num">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <p className="lc-service-name">{s.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CTA FOOTER ══ */}
        <section className="lc-section lc-section-cta">
          <div className="lc-cta-glow" />
          <div className="lc-cta-topline" />
          <div className="lc-section-inner lc-text-center lc-cta-inner">
            <svg
              width="56"
              height="56"
              viewBox="0 0 80 80"
              fill="none"
              className="lc-cta-icon"
            >
              <polygon
                points="40,6 72,22 72,58 40,74 8,58 8,22"
                fill="none"
                stroke="#C8A96A"
                strokeWidth="1.5"
                strokeOpacity="0.7"
              />
              <polygon
                points="40,16 62,27 62,53 40,64 18,53 18,27"
                fill="none"
                stroke="#E5B93C"
                strokeWidth="1"
                strokeOpacity="0.45"
              />
              <circle cx="40" cy="40" r="5" fill="#E5B93C" fillOpacity="0.8" />
            </svg>
            <h2 className="lc-cta-title">{T.ctaTitle}</h2>
            <p className="lc-cta-sub">{T.ctaSub}</p>
            <div className="lc-hero-cta">
              <button className="lc-cta-outline" onClick={goToLogin}>
                {T.loginBtn}
              </button>
              <button className="lc-cta-gold" onClick={goToSignup}>
                {T.signupBtn}
              </button>
            </div>
            <div className="lc-footer-credit">
              {T.poweredBy} <span>بناء الأهلية</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ══ CSS ══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}

@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
@keyframes shimmer{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes spinSlow{to{transform:rotate(360deg)}}

.fade-1{animation:fadeUp 0.8s 0.05s both cubic-bezier(0.22,1,0.36,1)}
.fade-2{animation:fadeUp 0.8s 0.2s both cubic-bezier(0.22,1,0.36,1)}
.fade-3{animation:fadeUp 0.8s 0.38s both cubic-bezier(0.22,1,0.36,1)}
.fade-4{animation:fadeUp 0.8s 0.55s both cubic-bezier(0.22,1,0.36,1)}
.scale-in{animation:scaleIn 1s 0.12s both cubic-bezier(0.22,1,0.36,1)}

:root{
  --gold:#C8A96A;--gold2:#E5B93C;
  --black:#070809;--dark:#0D0F11;--teal:#0F2422;
  --cream:#EDE8DF;--off-white:#F6F3EE;
  --text:#16120C;--text2:#42392A;--text3:#8A7A5A;
  --border:#DDD5C4;
  --font:'Cairo',sans-serif;
  --font-h:'El Messiri','Cairo',serif;
}

.lc-root{font-family:var(--font);color:white;overflow-x:hidden;background:var(--black)}

/* ── NAVBAR ── */
.lc-nav{
  position:sticky;top:0;z-index:100;
  height:66px;padding:0 40px;
  display:flex;align-items:center;justify-content:space-between;
  background:rgba(7,8,9,0.88);
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom:1px solid rgba(200,169,106,0.1);
}
.lc-nav::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.25),transparent);
}
.lc-nav-brand{display:flex;align-items:center;gap:12px}
.lc-nav-logo{
  width:42px;height:42px;border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(200,169,106,0.08);
  border:1px solid rgba(200,169,106,0.2);
}
.lc-nav-name{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--gold)}
.lc-nav-right{display:flex;align-items:center;gap:10px}

.lc-lang-pill{
  display:flex;background:rgba(200,169,106,0.06);
  border:1px solid rgba(200,169,106,0.14);border-radius:8px;padding:3px;gap:2px;
}
.lc-lang-btn{
  padding:5px 12px;border-radius:6px;border:none;
  background:transparent;color:rgba(200,169,106,0.35);
  font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
  transition:all 0.15s;
}
.lc-lang-btn.active{background:rgba(200,169,106,0.18);color:var(--gold)}
.lc-lang-btn:hover:not(.active){color:rgba(200,169,106,0.6)}

.lc-btn-ghost{
  padding:8px 20px;border:1px solid rgba(200,169,106,0.22);border-radius:8px;
  background:transparent;color:var(--gold);font-size:13px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all 0.18s;
}
.lc-btn-ghost:hover{border-color:rgba(200,169,106,0.5);background:rgba(200,169,106,0.06)}
.lc-btn-gold{
  padding:8px 22px;background:var(--gold);border:none;border-radius:8px;
  color:var(--black);font-size:13px;font-weight:800;cursor:pointer;font-family:var(--font);
  transition:all 0.18s;
}
.lc-btn-gold:hover{background:var(--gold2);box-shadow:0 4px 20px rgba(200,169,106,0.3)}

/* ── HERO ── */
.lc-hero{
  position:relative;min-height:96vh;
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;background:var(--black);
}
.lc-hero-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.lc-hero-topline{
  position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);
}
.lc-hero-inner{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;padding:80px 40px 60px;max-width:840px;margin:0 auto;
  gap:0;
}
.lc-hero-badge{
  display:flex;align-items:center;gap:14px;margin-bottom:44px;
}
.lc-badge-line{width:36px;height:1px;background:rgba(200,169,106,0.4)}
.lc-badge-text{
  font-size:10px;letter-spacing:0.35em;
  color:rgba(200,169,106,0.6);font-weight:700;text-transform:uppercase;
}

/* Emblem */
.lc-hero-emblem{position:relative;width:180px;height:180px;margin-bottom:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.lc-emblem-ring{position:absolute;inset:0;border-radius:50%;border:1px solid rgba(200,169,106,0.1)}
.lc-emblem-ring-1{inset:-10px}
.lc-emblem-ring-2{inset:-22px;border-color:rgba(200,169,106,0.06)}
.lc-emblem-ring-3{inset:-36px;border-color:rgba(200,169,106,0.04)}
.lc-emblem-core{
  width:180px;height:180px;border-radius:28px;
  background:rgba(200,169,106,0.06);
  border:1px solid rgba(200,169,106,0.18);
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
}
.lc-emblem-core::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,transparent 35%,rgba(200,169,106,0.09) 50%,transparent 65%);
  animation:shimmer 4s infinite ease-in-out;
}

.lc-hero-name{
  font-family:var(--font-h);
  font-size:clamp(40px,7vw,76px);font-weight:700;
  color:white;letter-spacing:-1px;line-height:1.05;
  margin-bottom:20px;
}
.lc-hero-divider{
  display:flex;align-items:center;gap:10px;
  width:240px;margin-bottom:24px;
}
.lc-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,106,0.4),transparent)}
.lc-divider-diamond{width:6px;height:6px;background:var(--gold);transform:rotate(45deg);flex-shrink:0;opacity:0.7}
.lc-hero-vision{
  font-size:clamp(15px,2.2vw,19px);color:rgba(200,169,106,0.6);
  font-weight:400;max-width:520px;line-height:1.9;margin-bottom:48px;
}

/* Stats */
.lc-hero-stats{
  display:flex;gap:0;
  border:1px solid rgba(200,169,106,0.14);border-radius:18px;
  overflow:hidden;background:rgba(200,169,106,0.04);
  margin-bottom:44px;
}
.lc-stat-item{
  padding:20px 40px;
  display:flex;flex-direction:column;align-items:center;gap:5px;
}
.lc-stat-item+.lc-stat-item{border-left:1px solid rgba(200,169,106,0.1)}
[dir="rtl"] .lc-stat-item+.lc-stat-item{border-left:none;border-right:1px solid rgba(200,169,106,0.1)}
.lc-stat-n{font-size:36px;font-weight:900;color:var(--gold);line-height:1}
.lc-stat-l{font-size:11px;color:rgba(200,169,106,0.4);font-weight:600;letter-spacing:0.06em}

/* CTA buttons */
.lc-hero-cta{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.lc-cta-outline{
  padding:14px 38px;border:1.5px solid rgba(200,169,106,0.35);border-radius:12px;
  background:transparent;color:var(--gold);font-size:14px;font-weight:700;
  cursor:pointer;font-family:var(--font);transition:all 0.2s;
}
.lc-cta-outline:hover{border-color:var(--gold);background:rgba(200,169,106,0.06)}
.lc-cta-gold{
  padding:14px 38px;background:var(--gold);border-radius:12px;border:none;
  color:var(--black);font-size:14px;font-weight:900;cursor:pointer;
  font-family:var(--font);transition:all 0.2s;
  box-shadow:0 6px 28px rgba(200,169,106,0.25);
}
.lc-cta-gold:hover{background:var(--gold2);box-shadow:0 8px 36px rgba(200,169,106,0.35);transform:translateY(-1px)}

.lc-hero-fade{
  position:absolute;bottom:0;left:0;right:0;height:100px;
  background:linear-gradient(transparent,var(--black));pointer-events:none;
}

/* ── SECTIONS ── */
.lc-section{padding:100px 40px}
.lc-section-light{background:var(--off-white)}
.lc-section-dark{background:var(--dark)}
.lc-section-teal{background:var(--teal)}
.lc-section-cream{background:var(--cream)}
.lc-section-black{background:var(--black)}
.lc-section-cta{background:var(--dark);position:relative;overflow:hidden;text-align:center}
.lc-section-dots{
  background-image:radial-gradient(rgba(200,169,106,0.04) 1px,transparent 1px);
  background-size:30px 30px;
}
.lc-section-inner{max-width:1100px;margin:0 auto}
.lc-text-center{text-align:center}

.lc-section-label{
  display:inline-block;
  font-size:10px;font-weight:700;letter-spacing:0.28em;
  text-transform:uppercase;color:var(--gold);
  margin-bottom:44px;
  padding-bottom:12px;
  border-bottom:1px solid rgba(200,169,106,0.2);
}
.lc-section-label.dark{color:rgba(120,90,40,0.75)}
.lc-text-center .lc-section-label{display:block}

/* ── MISSION ── */
.lc-mission-text{
  font-size:18px;color:var(--text2);line-height:2.1;
  font-weight:400;max-width:780px;margin:0 auto;
}
.lc-school-desc{
  font-size:14px;color:var(--text3);line-height:1.85;
  max-width:560px;margin:28px auto 0;
  padding:18px 24px;border:1px solid var(--border);border-radius:14px;
  background:rgba(200,169,106,0.04);
}

/* ── GOALS ── */
.lc-goals-grid{
  display:grid;grid-template-columns:repeat(2,1fr);gap:18px;
}
.lc-goal-card{
  background:rgba(255,255,255,0.028);
  border:1px solid rgba(200,169,106,0.1);border-radius:20px;
  padding:36px;position:relative;overflow:hidden;
  transition:border-color 0.2s,transform 0.2s;
}
.lc-goal-card:hover{border-color:rgba(200,169,106,0.22);transform:translateY(-2px)}
.lc-goal-num{
  position:absolute;top:22px;left:22px;
  font-size:11px;font-weight:800;color:rgba(200,169,106,0.18);
  letter-spacing:0.1em;font-family:monospace;
}
[dir="rtl"] .lc-goal-num{left:auto;right:22px}
.lc-goal-icon{font-size:28px;margin-bottom:14px}
.lc-goal-title{font-size:16px;font-weight:800;color:var(--gold);margin-bottom:10px;font-family:var(--font-h)}
.lc-goal-text{font-size:14px;color:rgba(255,255,255,0.55);line-height:1.8}
.lc-goal-line{
  position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.15),transparent);
}

/* ── MAQASID ── */
.lc-maqasid-row{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.lc-maqsad-card{
  display:flex;flex-direction:column;align-items:center;gap:12px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(200,169,106,0.15);border-radius:20px;
  padding:32px 36px;min-width:130px;
  transition:border-color 0.2s,background 0.2s,transform 0.2s;
  position:relative;
}
.lc-maqsad-card:hover{
  border-color:rgba(200,169,106,0.35);
  background:rgba(255,255,255,0.09);
  transform:translateY(-3px);
}
.lc-maqsad-num{
  position:absolute;top:12px;right:14px;
  font-size:10px;font-weight:800;color:rgba(200,169,106,0.25);
  font-family:monospace;
}
[dir="rtl"] .lc-maqsad-num{right:auto;left:14px}
.lc-maqsad-icon{font-size:28px}
.lc-maqsad-label{font-size:15px;font-weight:800;color:rgba(255,255,255,0.88);font-family:var(--font-h)}

/* ── PROGRAM ── */
.lc-program-row{
  display:flex;border-radius:22px;overflow:hidden;
  border:1px solid var(--border);background:white;
  max-width:680px;margin:0 auto;
  box-shadow:0 12px 40px rgba(11,11,12,0.08);
}
.lc-prog-item{
  flex:1;padding:52px 24px;
  display:flex;flex-direction:column;align-items:center;gap:10px;
}
.lc-prog-item.bordered{border-left:1px solid var(--border)}
[dir="rtl"] .lc-prog-item.bordered{border-left:none;border-right:1px solid var(--border)}
.lc-prog-n{font-size:64px;font-weight:900;color:var(--teal);line-height:1;font-family:var(--font-h)}
.lc-prog-bar{width:40px;height:2.5px;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:2px}
.lc-prog-label{font-size:14px;color:var(--text3);font-weight:600}

/* ── MEASURE ── */
.lc-measure-layout{display:flex;gap:80px;align-items:center}
.lc-measure-text{flex:1;min-width:0}
.lc-measure-body{font-size:16px;color:rgba(255,255,255,0.55);line-height:2.1;margin-bottom:36px}
.lc-chips{display:flex;gap:14px}
.lc-chip{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  background:rgba(200,169,106,0.08);
  border:1px solid rgba(200,169,106,0.18);border-radius:16px;
  padding:20px 28px;min-width:110px;
}
.lc-chip-n{font-size:38px;font-weight:900;color:var(--gold);line-height:1;font-family:var(--font-h)}
.lc-chip-l{font-size:11px;color:rgba(200,169,106,0.5);font-weight:600;text-align:center}
.lc-measure-diagram{flex-shrink:0}

/* ── SERVICES ── */
.lc-services-grid{
  display:grid;grid-template-columns:repeat(4,1fr);gap:18px;
  margin-top:8px;
}
.lc-service-card{
  background:white;border:1px solid var(--border);border-radius:20px;
  padding:38px 22px;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:14px;
  box-shadow:0 2px 14px rgba(11,11,12,0.05);
  transition:transform 0.2s,box-shadow 0.2s,border-color 0.2s;
  position:relative;overflow:hidden;
}
.lc-service-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.3),transparent);
  opacity:0;transition:opacity 0.2s;
}
.lc-service-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(11,11,12,0.1);border-color:rgba(200,169,106,0.3)}
.lc-service-card:hover::before{opacity:1}
.lc-service-icon{
  width:64px;height:64px;border-radius:18px;
  background:linear-gradient(135deg,rgba(200,169,106,0.1),rgba(229,185,60,0.06));
  border:1px solid rgba(200,169,106,0.18);
  display:flex;align-items:center;justify-content:center;font-size:28px;
}
.lc-service-num{
  width:28px;height:28px;border-radius:50%;
  background:var(--teal);color:var(--gold);
  font-size:12px;font-weight:900;
  display:flex;align-items:center;justify-content:center;
}
.lc-service-name{font-size:14px;font-weight:700;color:var(--text);line-height:1.5}

/* ── CTA ── */
.lc-cta-glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 60%,rgba(200,169,106,0.07) 0%,transparent 65%);
}
.lc-cta-topline{
  position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.3),transparent);
}
.lc-cta-inner{position:relative;z-index:1;max-width:680px}
.lc-cta-icon{margin-bottom:24px;opacity:0.7}
.lc-cta-title{
  font-family:var(--font-h);
  font-size:clamp(28px,5vw,50px);font-weight:700;
  color:var(--gold);margin-bottom:14px;line-height:1.2;
}
.lc-cta-sub{
  font-size:16px;color:rgba(200,169,106,0.45);
  margin-bottom:44px;line-height:1.85;
}
.lc-footer-credit{
  margin-top:44px;padding-top:28px;
  border-top:1px solid rgba(200,169,106,0.08);
  font-size:11px;color:rgba(200,169,106,0.2);font-weight:500;
}
.lc-footer-credit span{color:rgba(200,169,106,0.5);font-weight:700}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .lc-goals-grid{grid-template-columns:1fr}
  .lc-services-grid{grid-template-columns:repeat(2,1fr)}
  .lc-measure-layout{flex-direction:column;gap:36px}
  .lc-measure-diagram{display:none}
  .lc-section{padding:72px 24px}
  .lc-nav{padding:0 20px}
  .lc-hero-inner{padding:60px 24px 48px}
  .lc-stat-item{padding:16px 28px}
}
@media(max-width:600px){
  .lc-services-grid{grid-template-columns:1fr 1fr}
  .lc-program-row{flex-direction:column;max-width:300px}
  .lc-prog-item.bordered{border-left:none;border-right:none;border-top:1px solid var(--border)}
  [dir="rtl"] .lc-prog-item.bordered{border-right:none;border-top:1px solid var(--border)}
  .lc-maqasid-row{gap:10px}
  .lc-maqsad-card{padding:22px 20px;min-width:100px}
  .lc-hero-stats{flex-direction:column;border-radius:14px}
  .lc-stat-item+.lc-stat-item{border-left:none;border-right:none;border-top:1px solid rgba(200,169,106,0.1)}
  [dir="rtl"] .lc-stat-item+.lc-stat-item{border-right:none;border-top:1px solid rgba(200,169,106,0.1)}
  .lc-hero-cta{flex-direction:column;align-items:center}
  .lc-cta-outline,.lc-cta-gold{width:100%;max-width:280px}
  .lc-nav-right .lc-btn-ghost,.lc-nav-right .lc-btn-gold{display:none}
}
`;
