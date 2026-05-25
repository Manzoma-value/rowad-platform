"use client";

import { useState, useEffect } from "react";
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
      { title: "التميز الأخلاقي", text: "بناء جيل يتمتّع برقي الأخلاق ويدرك قيمة العمل القائم على العلم" },
      { title: "رؤية 2030", text: "ترسيخ وعي الجيل بدوره ضمن مستهدفات رؤية المملكة 2030" },
      { title: "التعلم الفعّال", text: "التحول من التعلم بالتلقين إلى التعلم بالاستنباط والممارسة" },
      { title: "قادة المستقبل", text: "إعداد قادة مؤهلين يمتلكون الرؤية والكفاءة والقدرة على القيادة" },
    ],
    maqasidTitle: "المقاصد الخمسة",
    maqasid: [
      { label: "الدين" }, { label: "النفس" }, { label: "العقل" },
      { label: "النسل" }, { label: "المال" },
    ],
    programTitle: "البرنامج التأهيلي",
    programStats: [
      { n: "25", label: "محتوى متخصصًا" },
      { n: "5",  label: "مراحل متدرّجة" },
      { n: "5",  label: "مستويات قياس"  },
    ],
    measureTitle: "آلية القياس",
    measureText:
      "يُقاس كل مشارك من خلال 75 نموذج تقييم تغطي المحتويات الـ 25، بما يضمن قياس مستوى الأداء بدقة وإتاحة المقارنة بين النتائج.",
    students: "طالب", teachers: "معلم", classes: "فصل",
    loginBtn: "تسجيل الدخول", signupBtn: "إنشاء حساب",
    poweredBy: "مدعومة من",
    servicesTitle: "خدماتنا المتكاملة",
    services: [
      { name: "تدريب ودعم" }, { name: "عناصر المشروع" },
      { name: "البيئة بمكوناتها" }, { name: "المنتج النهائي" },
    ],
    ctaTitle: "ابدأ رحلتك معنا",
    ctaSub: "انضم إلى أكاديمية الرواد وكن جزءًا من جيل يصنع المستقبل",
    chip75: "نموذج قياس", chip25: "محتوى",
    badge: "بناء الأهلية",
  },
  sq: {
    dir: "ltr" as const,
    vision: "Fuqizimi i Njeriut .. Ndërtimi i së Ardhmes",
    missionTitle: "Misioni Ynë",
    missionText:
      "Ne synojmë të ndërtojmë një gjeneratë të cilësuar me vlera të larta morale, e cila kupton vlerën e punës bazuar në dije, duke u udhëhequr nga parimet islame si referencë vlerash, dhe punojmë për të transformuar mësimin nga pasiv në aktiv.",
    goalsTitle: "Katër Qëllimet Tona",
    goals: [
      { title: "Shkëlqimi Moral", text: "Ndërtimi i një gjenerate me vlera morale dhe kuptim të punës bazuar në dije" },
      { title: "Vizioni 2030", text: "Konsolidimi i rolit të gjeneratës brenda objektivave të Vizionit 2030" },
      { title: "Mësim Efektiv", text: "Transformimi nga mësimi pasiv në mësimin me zbulim dhe praktikë" },
      { title: "Liderë të Ardhshëm", text: "Përgatitja e liderëve të kualifikuar me vizion, kompetencë dhe kapacitet" },
    ],
    maqasidTitle: "Pesë Objektivat",
    maqasid: [
      { label: "Feja" }, { label: "Shpirti" }, { label: "Mendja" },
      { label: "Pasardhësit" }, { label: "Pasuria" },
    ],
    programTitle: "Programi Kualifikues",
    programStats: [
      { n: "25", label: "Përmbajtje" },
      { n: "5",  label: "Faza"       },
      { n: "5",  label: "Nivele"     },
    ],
    measureTitle: "Mekanizmi i Matjes",
    measureText:
      "Çdo pjesëmarrës matet nëpërmjet 75 modeleve vlerësimi që mbulojnë 25 përmbajtjet, duke siguruar matje të saktë dhe krahasim të rezultateve.",
    students: "nxënës", teachers: "mësues", classes: "klasë",
    loginBtn: "Hyrje", signupBtn: "Regjistrohu",
    poweredBy: "E mundësuar nga",
    servicesTitle: "Shërbime të Integruara",
    services: [
      { name: "Trajnim dhe Mbështetje" }, { name: "Elementet e Projektit" },
      { name: "Mjedisi" }, { name: "Produkti Final" },
    ],
    ctaTitle: "Filloni Udhëtimin Tuaj",
    ctaSub: "Bashkohuni me Akademinë Alrowad dhe bëhuni pjesë e gjeneratës që ndërton të ardhmen",
    chip75: "modele vlerësimi", chip25: "përmbajtje",
    badge: "Bërthamë Alrowad",
  },
};

/* ─── Pre-computed static SVG values (avoids hydration mismatch) ─── */
const MEASURE_DOTS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => ({
  cx: Math.round((120 + 88 * Math.cos((deg * Math.PI) / 180)) * 100) / 100,
  cy: Math.round((120 + 88 * Math.sin((deg * Math.PI) / 180)) * 100) / 100,
}));

/* ─── Component ─── */
export default function SchoolLandingClient({ school }: { school: School }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(school.language === "sq" ? "sq" : "ar");
  const [scrolled, setScrolled] = useState(false);
  const T = STRINGS[lang];
  const dir = T.dir;

  /* Navbar scroll state */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.78);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Scroll-reveal via IntersectionObserver */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".lc-reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("lc-revealed");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [lang]);

  const goToLogin  = () => router.push(`/schools/${school.slug}/login`);
  const goToSignup = () => router.push(`/schools/${school.slug}/signup`);

  const statItems = [
    { n: school.student_count, l: T.students },
    { n: school.teacher_count, l: T.teachers },
    { n: school.class_count,   l: T.classes  },
  ];

  return (
    <>
      <style>{css}</style>
      <div dir={dir} className="lc-root">

        {/* ══════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════ */}
        <nav className={`lc-nav${scrolled ? " lc-nav--light" : ""}`}>
          <div className="lc-nav-brand">
            <div className="lc-nav-logo">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8"
                  stroke="#C8A96A" strokeWidth="1.5" strokeOpacity="0.9" fill="none" />
                <polygon points="14,7 21,10.5 21,17.5 14,21 7,17.5 7,10.5"
                  stroke="#E5B93C" strokeWidth="0.9" strokeOpacity="0.5" fill="none" />
                <circle cx="14" cy="14" r="3" fill="#E5B93C" fillOpacity="0.85" />
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
                  {l === "ar" ? "AR" : "SQ"}
                </button>
              ))}
            </div>
            <button className="lc-nav-ghost" onClick={goToLogin}>{T.loginBtn}</button>
            <button className="lc-nav-gold"  onClick={goToSignup}>{T.signupBtn}</button>
          </div>
        </nav>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <section className="lc-hero">
          {/* Atmospheric blobs */}
          <div className="lc-hero-dec" aria-hidden="true">
            <div className="lc-blob lc-blob-1" />
            <div className="lc-blob lc-blob-2" />
            {/* Static SVG geometry — all coords are hardcoded constants */}
            <svg className="lc-dec-svg" viewBox="0 0 1200 700"
              preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <circle cx="600" cy="350" r="160" fill="none" stroke="#C8A96A" strokeWidth="0.5" strokeOpacity="0.07"/>
              <circle cx="600" cy="350" r="260" fill="none" stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05" strokeDasharray="4 8"/>
              <circle cx="600" cy="350" r="380" fill="none" stroke="#C8A96A" strokeWidth="0.35" strokeOpacity="0.04"/>
              <circle cx="600" cy="350" r="500" fill="none" stroke="#C8A96A" strokeWidth="0.25" strokeOpacity="0.03"/>
              {/* Outer hexagon */}
              <polygon points="820,350 710,540.5 490,540.5 380,350 490,159.5 710,159.5"
                fill="none" stroke="#C8A96A" strokeWidth="0.6" strokeOpacity="0.07"/>
              {/* Inner hexagon rotated 30° */}
              <polygon points="790.5,460 600,570 409.5,460 409.5,240 600,130 790.5,240"
                fill="none" stroke="#E5B93C" strokeWidth="0.5" strokeOpacity="0.05"/>
              {/* 6 radial lines */}
              <line x1="600" y1="350" x2="1300" y2="350"  stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05"/>
              <line x1="600" y1="350" x2="950"  y2="956"  stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05"/>
              <line x1="600" y1="350" x2="250"  y2="956"  stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05"/>
              <line x1="600" y1="350" x2="-100" y2="350"  stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05"/>
              <line x1="600" y1="350" x2="250"  y2="-256" stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05"/>
              <line x1="600" y1="350" x2="950"  y2="-256" stroke="#C8A96A" strokeWidth="0.4" strokeOpacity="0.05"/>
              {/* Corner brackets */}
              <path d="M0,0 L60,0 M0,0 L0,60"
                stroke="#C8A96A" strokeWidth="1.2" strokeOpacity="0.22" fill="none"/>
              <path d="M1200,700 L1140,700 M1200,700 L1200,640"
                stroke="#C8A96A" strokeWidth="1.2" strokeOpacity="0.22" fill="none"/>
            </svg>
          </div>

          <div className="lc-hero-inner">
            {/* Badge */}
            <div className="lc-hero-badge fade-1">
              <div className="lc-badge-line" />
              <span className="lc-badge-text">{T.badge}</span>
              <div className="lc-badge-line" />
            </div>

            {/* Emblem */}
            <div className="lc-emblem scale-in">
              <div className="lc-emblem-r3" />
              <div className="lc-emblem-r2" />
              <div className="lc-emblem-core">
                <svg width="58" height="58" viewBox="0 0 80 80" fill="none">
                  <polygon points="40,6 72,22 72,58 40,74 8,58 8,22"
                    stroke="#C8A96A" strokeWidth="1.5" strokeOpacity="0.9" fill="none" />
                  <polygon points="40,16 62,27 62,53 40,64 18,53 18,27"
                    stroke="#E5B93C" strokeWidth="1" strokeOpacity="0.6" fill="none" />
                  <circle cx="40" cy="40" r="12"
                    stroke="#C8A96A" strokeWidth="1" strokeOpacity="0.7" fill="none" />
                  <circle cx="40" cy="40" r="4.5" fill="#E5B93C" fillOpacity="0.9" />
                </svg>
              </div>
            </div>

            {/* School name */}
            <h1 className="lc-hero-name fade-2">{school.name}</h1>

            {/* Divider */}
            <div className="lc-hero-div fade-2">
              <div className="lc-div-line" />
              <div className="lc-div-gem" />
              <div className="lc-div-line" />
            </div>

            {/* Vision tagline */}
            <p className="lc-hero-vision fade-3">{T.vision}</p>

            {/* Live stats strip */}
            <div className="lc-stats fade-3">
              {statItems.map(({ n, l }, i) => (
                <div key={i} className="lc-stat">
                  <span className="lc-stat-n">{n}</span>
                  <span className="lc-stat-l">{l}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="lc-hero-cta fade-4">
              <button className="lc-btn-outline" onClick={goToLogin}>{T.loginBtn}</button>
              <button className="lc-btn-gold"    onClick={goToSignup}>{T.signupBtn}</button>
            </div>
          </div>

          {/* Fade-out to first section */}
          <div className="lc-hero-fade" />
        </section>

        {/* ══════════════════════════════════════════
            MISSION
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-a">
          <div className="lc-wrap lc-text-center">
            <div className="lc-reveal">
              <p className="lc-section-tag lc-tag-dark">{T.missionTitle}</p>
              <blockquote className="lc-mission-q">
                <span className="lc-q-mark">&ldquo;</span>
                {T.missionText}
              </blockquote>
              {school.description && (
                <p className="lc-desc-pill">{school.description}</p>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            GOALS
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-b">
          <div className="lc-wrap">
            <p className="lc-section-tag lc-tag-dark lc-reveal">{T.goalsTitle}</p>
            <div className="lc-goals-grid">
              {T.goals.map((g, i) => (
                <div
                  key={i}
                  className="lc-goal-card lc-reveal"
                  style={{ transitionDelay: `${i * 0.09}s` }}
                >
                  <span className="lc-goal-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="lc-goal-icon-wrap">
                    {i === 0 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22V8"/>
                        <path d="M5 12H2a10 10 0 0020 0h-3"/>
                        <path d="M8 8a4 4 0 018 0"/>
                        <line x1="5" y1="5" x2="19" y2="5"/>
                      </svg>
                    )}
                    {i === 1 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="6"/>
                        <circle cx="12" cy="12" r="2"/>
                      </svg>
                    )}
                    {i === 2 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a7 7 0 017 7c0 3.5-2 5.5-3.5 7h-7C7 14.5 5 12.5 5 9a7 7 0 017-7z"/>
                        <line x1="9" y1="21" x2="15" y2="21"/>
                        <line x1="10" y1="17" x2="14" y2="17"/>
                      </svg>
                    )}
                    {i === 3 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    )}
                  </div>
                  <h3 className="lc-goal-title">{g.title}</h3>
                  <p className="lc-goal-text">{g.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MAQASID
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-dark">
          <div className="lc-wrap lc-text-center">
            <p className="lc-section-tag lc-tag-gold lc-reveal">{T.maqasidTitle}</p>
            <div className="lc-maqasid-row">
              {T.maqasid.map((m, i) => (
                <div
                  key={i}
                  className="lc-maqsad lc-reveal"
                  style={{ transitionDelay: `${i * 0.07}s` }}
                >
                  <div className="lc-maqsad-num">{i + 1}</div>
                  <div className="lc-maqsad-icon">
                    {i === 0 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#C8A96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
                      </svg>
                    )}
                    {i === 1 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#C8A96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                      </svg>
                    )}
                    {i === 2 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#C8A96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a7 7 0 017 7c0 3.5-2 5.5-3.5 7h-7C7 14.5 5 12.5 5 9a7 7 0 017-7z"/>
                        <line x1="9" y1="21" x2="15" y2="21"/>
                        <line x1="10" y1="17" x2="14" y2="17"/>
                      </svg>
                    )}
                    {i === 3 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#C8A96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    )}
                    {i === 4 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#C8A96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                      </svg>
                    )}
                  </div>
                  <span className="lc-maqsad-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PROGRAM STATS
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-c">
          <div className="lc-wrap lc-text-center">
            <p className="lc-section-tag lc-tag-dark lc-reveal">{T.programTitle}</p>
            <div className="lc-prog-row lc-reveal">
              {T.programStats.map(({ n, label }, i) => (
                <div key={i} className={`lc-prog-item${i > 0 ? " lc-prog-sep" : ""}`}>
                  <span className="lc-prog-n">{n}</span>
                  <div className="lc-prog-bar" />
                  <span className="lc-prog-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MEASURE
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-a">
          <div className="lc-wrap lc-measure-wrap">
            <div className="lc-measure-text lc-reveal">
              <p className="lc-section-tag lc-tag-dark">{T.measureTitle}</p>
              <p className="lc-measure-body">{T.measureText}</p>
              <div className="lc-chips">
                {[{ n: "75", l: T.chip75 }, { n: "25", l: T.chip25 }].map(({ n, l }) => (
                  <div key={n} className="lc-chip">
                    <span className="lc-chip-n">{n}</span>
                    <span className="lc-chip-l">{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lc-measure-diag lc-reveal">
              <svg viewBox="0 0 240 240" width="220" height="220" fill="none" aria-hidden="true">
                <circle cx="120" cy="120" r="108" stroke="#C8A96A" strokeWidth="0.6" strokeOpacity="0.12"/>
                <circle cx="120" cy="120" r="88" stroke="#E5B93C" strokeWidth="0.6" strokeOpacity="0.2" strokeDasharray="4 6"/>
                <circle cx="120" cy="120" r="64" stroke="#C8A96A" strokeWidth="0.8" strokeOpacity="0.28"/>
                <circle cx="120" cy="120" r="40" stroke="#E5B93C" strokeWidth="0.8" strokeOpacity="0.35" strokeDasharray="3 4"/>
                {MEASURE_DOTS.map((d, i) => (
                  <circle key={i} cx={d.cx} cy={d.cy} r="5" fill="#C8A96A" fillOpacity="0.5"/>
                ))}
                <circle cx="120" cy="120" r="17" fill="rgba(200,169,106,0.1)"/>
                <circle cx="120" cy="120" r="8.5" fill="#E5B93C" fillOpacity="0.7"/>
                <text x="120" y="124" textAnchor="middle"
                  fill="#A8863E" fontSize="9.5" fontFamily="Cairo" fontWeight="700">
                  75
                </text>
              </svg>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SERVICES
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-b">
          <div className="lc-wrap">
            <p className="lc-section-tag lc-tag-dark lc-reveal">{T.servicesTitle}</p>
            <div className="lc-svc-grid">
              {T.services.map((s, i) => (
                <div
                  key={i}
                  className="lc-svc-card lc-reveal"
                  style={{ transitionDelay: `${i * 0.08}s` }}
                >
                  <div className="lc-svc-icon-wrap">
                    {i === 0 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                    )}
                    {i === 1 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                        <rect x="9" y="3" width="6" height="4" rx="1"/>
                        <line x1="9" y1="12" x2="15" y2="12"/>
                        <line x1="9" y1="16" x2="13" y2="16"/>
                      </svg>
                    )}
                    {i === 2 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                      </svg>
                    )}
                    {i === 3 && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="6"/>
                        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                      </svg>
                    )}
                  </div>
                  <span className="lc-svc-num">{String(i + 1).padStart(2, "0")}</span>
                  <p className="lc-svc-name">{s.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA FOOTER
        ══════════════════════════════════════════ */}
        <section className="lc-section lc-bg-dark lc-cta-sec">
          <div className="lc-cta-glow" />
          <div className="lc-cta-topline" />
          <div className="lc-wrap lc-text-center lc-cta-inner">
            <div className="lc-cta-emblem lc-reveal">
              <svg width="54" height="54" viewBox="0 0 80 80" fill="none">
                <polygon points="40,6 72,22 72,58 40,74 8,58 8,22"
                  stroke="#C8A96A" strokeWidth="1.5" strokeOpacity="0.7" fill="none" />
                <polygon points="40,16 62,27 62,53 40,64 18,53 18,27"
                  stroke="#E5B93C" strokeWidth="1" strokeOpacity="0.45" fill="none" />
                <circle cx="40" cy="40" r="4.5" fill="#E5B93C" fillOpacity="0.8" />
              </svg>
            </div>
            <h2 className="lc-cta-title lc-reveal">{T.ctaTitle}</h2>
            <p className="lc-cta-sub lc-reveal">{T.ctaSub}</p>
            <div className="lc-hero-cta lc-reveal">
              <button className="lc-btn-outline" onClick={goToLogin}>{T.loginBtn}</button>
              <button className="lc-btn-gold"    onClick={goToSignup}>{T.signupBtn}</button>
            </div>
            <p className="lc-credit lc-reveal">
              {T.poweredBy} <strong>بناء الأهلية</strong>
            </p>
          </div>
        </section>

      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=El+Messiri:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

/* ── Design tokens ── */
:root {
  --gold:      #C8A96A;
  --gold2:     #E5B93C;
  --gold-dark: #A8863E;
  --ink:       #080B0C;
  --ink2:      #1A1208;
  --bg-a:      #FFFDF8;
  --bg-b:      #F6F4EE;
  --bg-c:      #FBFAF6;
  --text:      #1A1208;
  --text2:     #3D2E10;
  --text3:     #7A6540;
  --border:    #E8D9B8;
  --font:      'Cairo', sans-serif;
  --font-h:    'El Messiri', 'Cairo', serif;
}

/* ── Keyframes ── */
@keyframes fadeUp   { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
@keyframes scaleIn  { from{opacity:0;transform:scale(0.91)}      to{opacity:1;transform:scale(1)}      }
@keyframes shimmer  { 0%,100%{opacity:0.45} 50%{opacity:1}                                             }
@keyframes floatA   { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(3deg)}  }
@keyframes floatB   { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(14px)  rotate(-2deg)} }
@keyframes pulseRg  { 0%,100%{transform:scale(1);opacity:0.25}     50%{transform:scale(1.1);opacity:0.65}          }

/* Hero staggered entrances */
.fade-1  { animation: fadeUp  0.9s 0.05s both cubic-bezier(0.22,1,0.36,1); }
.fade-2  { animation: fadeUp  0.9s 0.22s both cubic-bezier(0.22,1,0.36,1); }
.fade-3  { animation: fadeUp  0.9s 0.40s both cubic-bezier(0.22,1,0.36,1); }
.fade-4  { animation: fadeUp  0.9s 0.58s both cubic-bezier(0.22,1,0.36,1); }
.scale-in{ animation: scaleIn 1.1s 0.15s both cubic-bezier(0.22,1,0.36,1); }

/* Scroll-reveal */
.lc-reveal   { opacity:0; transform:translateY(22px); transition:opacity 0.65s ease,transform 0.65s ease; }
.lc-revealed { opacity:1; transform:translateY(0);    }

/* ── Root ── */
.lc-root { font-family:var(--font); background:var(--bg-b); color:var(--text); overflow-x:hidden; }

/* ════════════════════════════════
   NAVBAR
════════════════════════════════ */
.lc-nav {
  position:fixed; top:0; left:0; right:0; z-index:200;
  height:64px; padding:0 40px;
  display:flex; align-items:center; justify-content:space-between;
  background:rgba(8,11,12,0.72);
  backdrop-filter:blur(22px); -webkit-backdrop-filter:blur(22px);
  border-bottom:1px solid rgba(200,169,106,0.08);
  transition:background 0.35s,border-color 0.35s,box-shadow 0.35s;
}
.lc-nav::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.2),transparent);
}
/* Light mode (past hero) */
.lc-nav--light {
  background:rgba(255,253,248,0.96);
  border-bottom-color:rgba(200,169,106,0.18);
  box-shadow:0 2px 22px rgba(26,18,8,0.07);
}
.lc-nav--light .lc-nav-name         { color:var(--ink2); }
.lc-nav--light .lc-nav-ghost        { color:var(--gold-dark); border-color:rgba(168,134,62,0.28); }
.lc-nav--light .lc-nav-ghost:hover  { background:rgba(200,169,106,0.08); }
.lc-nav--light .lc-lang-btn         { color:var(--text3); }
.lc-nav--light .lc-lang-btn.active  { background:rgba(200,169,106,0.14); color:var(--gold-dark); }

.lc-nav-brand { display:flex; align-items:center; gap:11px; }
.lc-nav-logo  {
  width:40px; height:40px; border-radius:11px; flex-shrink:0;
  background:rgba(200,169,106,0.08); border:1px solid rgba(200,169,106,0.18);
  display:flex; align-items:center; justify-content:center;
}
.lc-nav-name { font-family:var(--font-h); font-size:15px; font-weight:600; color:var(--gold); }
.lc-nav-right { display:flex; align-items:center; gap:10px; }

.lc-lang-pill {
  display:flex; background:rgba(200,169,106,0.07);
  border:1px solid rgba(200,169,106,0.14); border-radius:8px; padding:3px; gap:2px;
}
.lc-lang-btn {
  padding:4px 12px; border-radius:6px; border:none;
  background:transparent; color:rgba(200,169,106,0.38);
  font-size:11px; font-weight:700; cursor:pointer; font-family:var(--font);
  transition:all 0.15s;
}
.lc-lang-btn.active          { background:rgba(200,169,106,0.18); color:var(--gold); }
.lc-lang-btn:hover:not(.active) { color:rgba(200,169,106,0.65); }

.lc-nav-ghost {
  padding:7px 18px; border:1px solid rgba(200,169,106,0.25); border-radius:8px;
  background:transparent; color:var(--gold); font-size:13px; font-weight:700;
  cursor:pointer; font-family:var(--font); transition:all 0.18s;
}
.lc-nav-ghost:hover { border-color:rgba(200,169,106,0.5); background:rgba(200,169,106,0.06); }
.lc-nav-gold {
  padding:7px 20px; background:var(--gold); border:none; border-radius:8px;
  color:var(--ink); font-size:13px; font-weight:800;
  cursor:pointer; font-family:var(--font); transition:all 0.18s;
}
.lc-nav-gold:hover { background:var(--gold2); box-shadow:0 4px 18px rgba(200,169,106,0.3); }

/* ════════════════════════════════
   HERO
════════════════════════════════ */
.lc-hero {
  position:relative; min-height:100vh;
  display:flex; align-items:center; justify-content:center;
  background:var(--ink); overflow:hidden;
}
.lc-hero-dec { position:absolute; inset:0; pointer-events:none; }

.lc-blob {
  position:absolute; border-radius:50%;
  filter:blur(90px); pointer-events:none;
}
.lc-blob-1 {
  width:640px; height:640px;
  background:radial-gradient(circle,rgba(200,169,106,0.11) 0%,transparent 70%);
  top:-120px; right:-100px;
  animation:floatA 10s ease-in-out infinite;
}
.lc-blob-2 {
  width:500px; height:500px;
  background:radial-gradient(circle,rgba(229,185,60,0.08) 0%,transparent 70%);
  bottom:-80px; left:-80px;
  animation:floatB 13s ease-in-out infinite;
}
.lc-dec-svg { position:absolute; inset:0; width:100%; height:100%; }

.lc-hero-inner {
  position:relative; z-index:2;
  display:flex; flex-direction:column; align-items:center;
  text-align:center; padding:110px 40px 80px;
  max-width:880px; margin:0 auto;
}

/* Badge row */
.lc-hero-badge { display:flex; align-items:center; gap:14px; margin-bottom:50px; }
.lc-badge-line  { width:36px; height:1px; background:rgba(200,169,106,0.35); }
.lc-badge-text  {
  font-size:10px; letter-spacing:0.36em; color:rgba(200,169,106,0.6);
  font-weight:700; text-transform:uppercase;
}

/* Animated emblem */
.lc-emblem {
  position:relative; width:152px; height:152px;
  display:flex; align-items:center; justify-content:center;
  margin-bottom:46px; flex-shrink:0;
}
.lc-emblem-r2, .lc-emblem-r3 {
  position:absolute; border-radius:50%; border:1px solid rgba(200,169,106,0.14);
}
.lc-emblem-r2 { inset:-12px; animation:pulseRg 3.5s ease-in-out infinite; }
.lc-emblem-r3 { inset:-25px; border-color:rgba(200,169,106,0.07); animation:pulseRg 3.5s 0.9s ease-in-out infinite; }
.lc-emblem-core {
  width:152px; height:152px; border-radius:26px; position:relative;
  background:rgba(200,169,106,0.06); border:1px solid rgba(200,169,106,0.22);
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.lc-emblem-core::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,transparent 35%,rgba(200,169,106,0.1) 50%,transparent 65%);
  animation:shimmer 4.5s ease-in-out infinite;
}

/* School name */
.lc-hero-name {
  font-family:var(--font-h);
  font-size:clamp(38px,6.5vw,74px); font-weight:700;
  color:#fff; letter-spacing:-0.5px; line-height:1.07;
  margin-bottom:18px;
}

/* Ornamental divider */
.lc-hero-div { display:flex; align-items:center; gap:10px; width:220px; margin-bottom:22px; }
.lc-div-line  { flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(200,169,106,0.4),transparent); }
.lc-div-gem   { width:5px; height:5px; background:var(--gold); transform:rotate(45deg); flex-shrink:0; opacity:0.7; }

/* Vision tagline */
.lc-hero-vision {
  font-size:clamp(14.5px,2vw,18px); color:rgba(200,169,106,0.55);
  font-weight:400; max-width:500px; line-height:2.0; margin-bottom:48px;
}

/* Stats strip */
.lc-stats {
  display:flex;
  border:1px solid rgba(200,169,106,0.14); border-radius:18px; overflow:hidden;
  background:rgba(200,169,106,0.04); margin-bottom:44px;
}
.lc-stat { padding:20px 36px; display:flex; flex-direction:column; align-items:center; gap:5px; }
.lc-stat + .lc-stat { border-inline-start:1px solid rgba(200,169,106,0.1); }
.lc-stat-n { font-size:34px; font-weight:900; color:var(--gold); line-height:1; }
.lc-stat-l  { font-size:11px; color:rgba(200,169,106,0.4); font-weight:600; letter-spacing:0.06em; }

/* Hero CTA buttons (also reused in footer CTA) */
.lc-hero-cta { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }
.lc-btn-outline {
  padding:13px 36px; border:1.5px solid rgba(200,169,106,0.35); border-radius:12px;
  background:transparent; color:var(--gold); font-size:14px; font-weight:700;
  cursor:pointer; font-family:var(--font); transition:all 0.2s;
}
.lc-btn-outline:hover { border-color:var(--gold); background:rgba(200,169,106,0.07); }
.lc-btn-gold {
  padding:13px 36px; background:var(--gold); border-radius:12px; border:none;
  color:var(--ink); font-size:14px; font-weight:900;
  cursor:pointer; font-family:var(--font); transition:all 0.2s;
  box-shadow:0 6px 24px rgba(200,169,106,0.25);
}
.lc-btn-gold:hover { background:var(--gold2); transform:translateY(-2px); box-shadow:0 10px 32px rgba(200,169,106,0.35); }

/* Hero bottom fade into first section */
.lc-hero-fade {
  position:absolute; bottom:0; left:0; right:0; height:130px;
  background:linear-gradient(transparent,var(--bg-a)); pointer-events:none;
}

/* ════════════════════════════════
   SHARED SECTION UTILITIES
════════════════════════════════ */
.lc-section { padding:100px 40px; }
.lc-bg-a    { background:var(--bg-a); }
.lc-bg-b    { background:var(--bg-b); }
.lc-bg-c    { background:var(--bg-c); }
.lc-bg-dark { background:var(--ink);  }
.lc-wrap    { max-width:1100px; margin:0 auto; }
.lc-text-center { text-align:center; }

/* Section eyebrow tag */
.lc-section-tag {
  display:inline-block; font-size:10px; font-weight:700; letter-spacing:0.3em;
  text-transform:uppercase; color:var(--gold);
  padding-bottom:10px; border-bottom:1px solid rgba(200,169,106,0.25);
  margin-bottom:48px;
}
.lc-text-center .lc-section-tag { display:block; }
.lc-tag-dark { color:var(--gold-dark); border-bottom-color:rgba(168,134,62,0.18); }
.lc-tag-gold { color:var(--gold); }

/* ════════════════════════════════
   MISSION
════════════════════════════════ */
.lc-mission-q {
  position:relative; font-style:normal;
  font-size:clamp(16px,2.1vw,21px); color:var(--text2);
  line-height:2.1; font-weight:400;
  max-width:800px; margin:0 auto; padding:0 44px;
}
.lc-q-mark {
  position:absolute; top:-18px; left:0;
  font-size:88px; color:var(--gold); opacity:0.16;
  font-family:Georgia,serif; line-height:1; font-style:normal;
}
[dir="rtl"] .lc-q-mark { left:auto; right:0; }
.lc-desc-pill {
  display:inline-block; margin-top:32px;
  font-size:14px; color:var(--text3); line-height:1.85;
  background:rgba(200,169,106,0.06); border:1px solid rgba(200,169,106,0.14);
  border-radius:14px; padding:18px 26px; max-width:560px;
}

/* ════════════════════════════════
   GOALS
════════════════════════════════ */
.lc-goals-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }

.lc-goal-card {
  background:#fff; border:1px solid var(--border);
  border-radius:22px; padding:36px; position:relative; overflow:hidden;
  transition:transform 0.22s ease,box-shadow 0.22s ease,border-color 0.22s ease;
}
.lc-goal-card::before {
  content:''; position:absolute; inset-inline-start:0; top:0; bottom:0; width:3px;
  background:linear-gradient(180deg,var(--gold),var(--gold2));
  opacity:0; border-radius:3px 0 0 3px;
  transition:opacity 0.22s ease;
}
.lc-goal-card:hover { transform:translateY(-3px); box-shadow:0 18px 44px rgba(26,18,8,0.09); border-color:rgba(200,169,106,0.28); }
.lc-goal-card:hover::before { opacity:1; }

.lc-goal-num {
  position:absolute; top:22px; inset-inline-end:22px;
  font-size:11px; font-weight:900; color:rgba(200,169,106,0.18);
  letter-spacing:0.08em; font-family:monospace;
}
.lc-goal-icon-wrap {
  width:52px; height:52px; border-radius:14px;
  background:rgba(200,169,106,0.08); border:1px solid rgba(200,169,106,0.16);
  display:flex; align-items:center; justify-content:center;
  color:var(--gold-dark); margin-bottom:18px;
  transition:background 0.2s,border-color 0.2s;
}
.lc-goal-card:hover .lc-goal-icon-wrap { background:rgba(200,169,106,0.14); border-color:rgba(200,169,106,0.3); }
.lc-goal-title {
  font-size:17px; font-weight:800; color:var(--text); margin-bottom:10px;
  font-family:var(--font-h);
}
.lc-goal-text { font-size:14px; color:var(--text3); line-height:1.85; }

/* ════════════════════════════════
   MAQASID
════════════════════════════════ */
.lc-maqasid-row { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-top:6px; }

.lc-maqsad {
  display:flex; flex-direction:column; align-items:center; gap:12px;
  background:rgba(255,255,255,0.035); border:1px solid rgba(200,169,106,0.12);
  border-radius:20px; padding:30px 32px; min-width:128px; position:relative;
  transition:all 0.22s ease;
}
.lc-maqsad:hover {
  background:rgba(200,169,106,0.07); border-color:rgba(200,169,106,0.32);
  transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,0.25);
}
.lc-maqsad-num {
  position:absolute; top:11px; inset-inline-end:13px;
  font-size:10px; font-weight:800; color:rgba(200,169,106,0.22); font-family:monospace;
}
.lc-maqsad-icon { line-height:0; }
.lc-maqsad-label { font-size:15px; font-weight:800; color:rgba(255,255,255,0.88); font-family:var(--font-h); }

/* ════════════════════════════════
   PROGRAM
════════════════════════════════ */
.lc-prog-row {
  display:flex; justify-content:center; align-items:stretch;
  max-width:700px; margin:0 auto;
  border:1px solid var(--border); border-radius:24px; overflow:hidden;
  background:#fff; box-shadow:0 8px 44px rgba(26,18,8,0.07);
}
.lc-prog-item { flex:1; padding:56px 28px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.lc-prog-sep  { border-inline-start:1px solid var(--border); }
.lc-prog-n    {
  font-size:72px; font-weight:900; color:var(--ink2);
  line-height:1; font-family:var(--font-h); letter-spacing:-2px;
}
.lc-prog-bar   { width:44px; height:3px; background:linear-gradient(90deg,var(--gold),var(--gold2)); border-radius:3px; }
.lc-prog-label { font-size:14px; color:var(--text3); font-weight:600; }

/* ════════════════════════════════
   MEASURE
════════════════════════════════ */
.lc-measure-wrap { display:flex; gap:80px; align-items:center; }
.lc-measure-text { flex:1; min-width:0; }
.lc-measure-body { font-size:16px; color:var(--text2); line-height:2.1; margin-bottom:32px; }
.lc-chips        { display:flex; gap:14px; }
.lc-chip {
  display:flex; flex-direction:column; align-items:center; gap:6px;
  background:rgba(200,169,106,0.07); border:1px solid rgba(200,169,106,0.2);
  border-radius:16px; padding:20px 28px; min-width:110px;
}
.lc-chip-n { font-size:40px; font-weight:900; color:var(--gold-dark); line-height:1; font-family:var(--font-h); }
.lc-chip-l { font-size:11px; color:var(--text3); font-weight:600; text-align:center; }
.lc-measure-diag { flex-shrink:0; }

/* ════════════════════════════════
   SERVICES
════════════════════════════════ */
.lc-svc-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }

.lc-svc-card {
  background:#fff; border:1px solid var(--border); border-radius:20px;
  padding:36px 22px; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  position:relative; overflow:hidden;
  box-shadow:0 2px 12px rgba(26,18,8,0.04);
  transition:transform 0.22s ease,box-shadow 0.22s ease,border-color 0.22s ease;
}
.lc-svc-card::after {
  content:''; position:absolute; top:0; left:0; right:0; height:2.5px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);
  opacity:0; transition:opacity 0.22s ease;
}
.lc-svc-card:hover { transform:translateY(-4px); box-shadow:0 20px 48px rgba(26,18,8,0.1); border-color:rgba(200,169,106,0.28); }
.lc-svc-card:hover::after { opacity:1; }
.lc-svc-icon-wrap {
  width:60px; height:60px; border-radius:16px;
  background:rgba(200,169,106,0.08); border:1px solid rgba(200,169,106,0.18);
  display:flex; align-items:center; justify-content:center;
  color:var(--gold-dark); transition:all 0.2s;
}
.lc-svc-card:hover .lc-svc-icon-wrap { background:rgba(200,169,106,0.14); border-color:rgba(200,169,106,0.3); }
.lc-svc-num  { font-size:11px; font-weight:900; color:rgba(200,169,106,0.32); font-family:monospace; letter-spacing:0.05em; }
.lc-svc-name { font-size:14px; font-weight:700; color:var(--text); line-height:1.5; }

/* ════════════════════════════════
   CTA SECTION
════════════════════════════════ */
.lc-cta-sec  { position:relative; overflow:hidden; text-align:center; }
.lc-cta-glow {
  position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse at 50% 55%,rgba(200,169,106,0.09) 0%,transparent 60%);
}
.lc-cta-topline {
  position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,169,106,0.28),transparent);
}
.lc-cta-inner  { position:relative; z-index:1; max-width:700px; }
.lc-cta-emblem { margin-bottom:22px; opacity:0.8; }
.lc-cta-title  {
  font-family:var(--font-h);
  font-size:clamp(28px,5vw,52px); font-weight:700;
  color:var(--gold); margin-bottom:14px; line-height:1.18;
}
.lc-cta-sub {
  font-size:16px; color:rgba(200,169,106,0.45);
  line-height:1.9; max-width:520px; margin:0 auto 44px;
}
.lc-credit {
  margin-top:48px; padding-top:24px;
  border-top:1px solid rgba(200,169,106,0.08);
  font-size:11px; color:rgba(200,169,106,0.2); font-weight:500;
}
.lc-credit strong { color:rgba(200,169,106,0.45); font-weight:700; }

/* ════════════════════════════════
   RESPONSIVE
════════════════════════════════ */
@media(max-width:900px){
  .lc-goals-grid    { grid-template-columns:1fr; }
  .lc-svc-grid      { grid-template-columns:repeat(2,1fr); }
  .lc-measure-wrap  { flex-direction:column; gap:40px; }
  .lc-measure-diag  { display:none; }
  .lc-section       { padding:72px 24px; }
  .lc-nav           { padding:0 20px; }
  .lc-hero-inner    { padding:90px 24px 60px; }
  .lc-stat          { padding:16px 22px; }
}
@media(max-width:600px){
  .lc-svc-grid               { grid-template-columns:1fr 1fr; }
  .lc-prog-row               { flex-direction:column; max-width:300px; }
  .lc-prog-sep               { border-inline-start:none; border-top:1px solid var(--border); }
  .lc-maqasid-row            { gap:9px; }
  .lc-maqsad                 { padding:20px 18px; min-width:100px; }
  .lc-stats                  { flex-direction:column; }
  .lc-stat + .lc-stat        { border-inline-start:none; border-top:1px solid rgba(200,169,106,0.1); }
  .lc-hero-cta               { flex-direction:column; align-items:center; }
  .lc-btn-outline,.lc-btn-gold { width:100%; max-width:280px; }
  .lc-nav-right .lc-nav-ghost,
  .lc-nav-right .lc-nav-gold  { display:none; }
  .lc-mission-q              { padding:0 18px; }
  .lc-chips                  { flex-direction:column; }
}
`;
