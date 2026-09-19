"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, BookOpen, ChartNoAxesCombined, Check, GraduationCap, Layers3, LayoutDashboard, Menu, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import styles from "./white-label.module.css";

type Lang = "ar" | "en";
const copy = {
  en: {
    brand: "Binaa Al-Ahliyyah", tagline: "Al Rowad platform", nav: ["The platform", "Your experience", "Built for you"], login: "Sign in", enter: "Enter your workspace", explore: "Explore the platform",
    eyebrow: "YOUR VISION. YOUR IDENTITY. YOUR PLATFORM.", title: "Great learning starts", accent: "with connection.", intro: "Bring your people, programs, and progress together. One beautifully connected platform, shaped around your organization.", note: "For owners, administrators, supervisors, and beneficiaries.",
    preview: "Workspace preview", platformName: "Your platform", overview: "Overview", welcome: "A clearer view of every journey.", sample: "Illustrative workspace", tabs: ["Overview", "Learning", "Community"],
    metrics: ["Role-based portals", "Distinct identity", "Connected experience"], metricValues: ["04", "Your own", "All in one"],
    previewLabels: ["People & groups", "Learning pathways", "Platform insights"], previewValues: ["Bring people together", "Give progress direction", "See the bigger picture"], activity: "A connected learning journey", activityItems: ["Welcome & placement", "Learn & participate", "Measure & grow"],
    strip: ["Platform management", "Learning & workshops", "Assessment & insights", "Community"],
    featuresLabel: "ONE PLATFORM. EVERY PERSPECTIVE.", featuresTitle: "A place for everyone.", featuresSub: "Give each person the tools they need, with a shared view of what matters.",
    roles: [
      { title: "Lead with clarity.", role: "For platform owners", body: "Bring communities, permissions, and organization-wide reports into a central view. Build the next chapter from a stronger foundation.", tags: ["Flexible spaces", "Central oversight"] },
      { title: "Make every day flow.", role: "For administrators", body: "Coordinate people, groups, applications, and workshops with the information you need close at hand.", tags: ["Platform operations", "Reviews & reports"] },
      { title: "Create room to grow.", role: "For supervisors", body: "Deliver lessons, guide groups, and understand each beneficiary’s development along the way.", tags: ["Lessons & quizzes", "Development"] },
      { title: "Own your journey.", role: "For beneficiaries", body: "Learn, participate, and connect through purposeful content, educational games, and community.", tags: ["Personal learning", "Community"] },
    ],
    journeyLabel: "FROM THE FIRST STEP TO THE NEXT MILESTONE", journeyTitle: "Less scattered.\nMore connected.", journeySub: "Keep the learning journey moving, from a warm welcome to a meaningful view of progress.", steps: [
      { title: "Welcome your people", body: "Connect registration, applications, and placement in one journey." },
      { title: "Bring learning to life", body: "Create space for lessons, workshops, groups, and participation." },
      { title: "Turn progress into perspective", body: "Use assessments and reports to guide the next step." },
    ],
    identityLabel: "BUILT AROUND YOUR IDENTITY", identityTitle: "Your identity.\nA world of possibility.", identitySub: "Make the experience feel like yours, from your organization’s name and colors to the features your community uses.", benefits: ["Your own brand and domain", "Dedicated data and permissions", "Arabic and English experiences", "Features you can tailor to your organization"],
    identityCard: "Make it your own", identitySmall: "A familiar identity. A connected experience.", identityChips: ["Your name", "Your colors", "Your community"],
    finalLabel: "YOUR NEXT CHAPTER STARTS HERE", finalTitle: "Bring your community together.", finalSub: "Step inside Al Rowad and explore a more connected way to learn, lead, and grow.", signup: "Create a beneficiary account", footer: "Built for people. Designed for progress.", back: "Back to top",
  },
  ar: {
    brand: "منصة بناء الأهلية", tagline: "(الرواد)", nav: ["المنصة", "تجربتك", "على هويتك"], login: "تسجيل الدخول", enter: "ادخل إلى مساحتك", explore: "اكتشف المنصة",
    eyebrow: "رؤيتك. هويتك. منصتك.", title: "التعلّم الملهم يبدأ", accent: "بالتواصل.", intro: "اجمع أفراد جهتك وبرامجها ورحلات نموها في مكان واحد. تجربة متكاملة تتشكّل حول احتياجاتك وتحمل هويتك.", note: "للمالك والإدارة والمشرفين والمستفيدين.",
    preview: "نظرة على المنصة", platformName: "منصتك", overview: "نظرة عامة", welcome: "رؤية أوضح لكل رحلة تعلّم.", sample: "نموذج توضيحي للواجهة", tabs: ["نظرة عامة", "التعلّم", "المجتمع"],
    metrics: ["بوابات حسب الدور", "هوية الجهة", "تجربة متكاملة"], metricValues: ["04", "بصمتك", "مكان واحد"],
    previewLabels: ["الأفراد والمجموعات", "مسارات التعلّم", "رؤى المنصة"], previewValues: ["مجتمع يلتقي وينمو", "تقدّم له اتجاه", "الصورة الكاملة أمامك"], activity: "رحلة تعلّم مترابطة", activityItems: ["ترحيب وتصنيف", "تعلّم ومشاركة", "قياس ونمو"],
    strip: ["إدارة المنصة", "التعلّم والورش", "القياس والتقارير", "المجتمع"],
    featuresLabel: "منصة واحدة. آفاق متعددة.", featuresTitle: "لكل فرد مساحته.", featuresSub: "أدوات تناسب كل دور، ورؤية مشتركة لما يصنع الفرق.",
    roles: [
      { title: "قُد برؤية واضحة.", role: "لمالك المنصة", body: "اجمع المجتمعات والصلاحيات والتقارير المؤسسية في لوحة مركزية، وابنِ المرحلة القادمة على أساس واضح.", tags: ["مساحات متعددة", "إشراف مركزي"] },
      { title: "يوم أكثر انسيابية.", role: "لإدارة المنصة", body: "نظّم الأفراد والمجموعات والطلبات والورش، واجعل المعلومات التي تحتاجها في متناولك.", tags: ["تشغيل المنصة", "مراجعات وتقارير"] },
      { title: "افتح آفاق النمو.", role: "للمشرفين", body: "قدّم الدروس ووجّه المجموعات وتابع تطوّر كل مستفيد خلال رحلته.", tags: ["دروس واختبارات", "متابعة التطوّر"] },
      { title: "اصنع رحلتك.", role: "للمستفيدين", body: "تعلّم وشارك وتواصل من خلال محتوى هادف وألعاب تعليمية ومجتمع يتعلّم معك.", tags: ["تعلّم شخصي", "مجتمع متفاعل"] },
    ],
    journeyLabel: "من الخطوة الأولى إلى الإنجاز القادم", journeyTitle: "تفاصيل أقل تشتّتًا.\nتجربة أكثر ترابطًا.", journeySub: "رحلة متواصلة تبدأ باستقبال المستفيد، وتمتد إلى فهم أعمق لتقدّمه.", steps: [
      { title: "رحّب بمجتمعك", body: "اربط التسجيل والطلبات والتصنيف في رحلة واضحة." },
      { title: "امنح التعلّم حياة", body: "مساحة للدروس والورش والمجموعات والمشاركة الفاعلة." },
      { title: "حوّل التقدّم إلى رؤية", body: "استفد من التقييمات والتقارير لتوجيه الخطوة القادمة." },
    ],
    identityLabel: "مصمّمة حول هويتك", identityTitle: "هويتك الخاصة.\nوإمكانات واسعة.", identitySub: "تجربة تشبهك، من اسم جهتك وألوانها إلى الوظائف التي يحتاجها مجتمعك.", benefits: ["علامتك ونطاقك الخاص", "بيانات وصلاحيات مستقلة", "تجربة بالعربية والإنجليزية", "وظائف تختارها لتناسب جهتك"],
    identityCard: "اجعلها على هويتك", identitySmall: "هوية مألوفة. تجربة متكاملة.", identityChips: ["اسمك", "ألوانك", "مجتمعك"],
    finalLabel: "هنا يبدأ فصلك القادم", finalTitle: "اجمع مجتمعك على رؤية واحدة.", finalSub: "اكتشف مع الرواد تجربة أكثر ترابطًا في التعلّم والقيادة والنمو.", signup: "إنشاء حساب مستفيد", footer: "للإنسان أولًا. وللنمو دائمًا.", back: "العودة للأعلى",
  },
};
const roleIcons = [Layers3, LayoutDashboard, BookOpen, GraduationCap];

export default function LandingClient() {
  const [lang, setLang] = useState<Lang>("ar");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    // Restore the existing language preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "ar" || saved === "en") setLang(saved);
  }, []);
  const tr = copy[lang];
  const links = ["platform", "experience", "identity"];
  const Arrow = lang === "ar" ? ArrowRight : ArrowUpRight;
  return (
    <main id="top" className={styles.root} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={tr.brand}><img className={styles.brandLockup} src="/binaa-brand/landing/lockup-horizontal.png" alt={tr.brand} /></Link>
        <nav className={styles.desktopNav} aria-label={lang === "ar" ? "القائمة الرئيسية" : "Main navigation"}>{links.map((id, i) => <a key={id} href={`#${id}`}>{tr.nav[i]}</a>)}</nav>
        <div className={styles.headerActions}>
          <button className={styles.language} onClick={() => { const next = lang === "ar" ? "en" : "ar"; setLang(next); localStorage.setItem("lang", next); }} aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}>{lang === "ar" ? "EN" : "عربي"}</button>
          <Link className={styles.headerLogin} href="/login">{tr.login}<ArrowUpRight size={16} /></Link>
          <button className={styles.menuButton} aria-expanded={menuOpen} aria-controls="white-label-nav" aria-label={lang === "ar" ? "القائمة" : "Menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </header>
      {menuOpen && <nav id="white-label-nav" className={styles.mobileNav}>{links.map((id, i) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{tr.nav[i]}</a>)}</nav>}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{tr.eyebrow}</p>
          <h1>{tr.title}<em>{tr.accent}</em></h1>
          <p className={styles.intro}>{tr.intro}</p>
          <div className={styles.actions}><Link href="/login" className={styles.primary}>{tr.enter}<Arrow size={19} /></Link><a href="#platform" className={styles.secondary}>{tr.explore}<ArrowRight size={17} /></a></div>
          <p className={styles.heroNote}><ShieldCheck size={16} />{tr.note}</p>
        </div>
        <div className={styles.previewScene}>
          <img className={styles.heroArtwork} src="/binaa-brand/landing/hero-artwork.png" alt="" aria-hidden="true" />
          <div className={styles.preview}>
            <div className={styles.previewTop}><span><Layers3 size={18} />{tr.platformName}</span><span className={styles.previewBadge}>{tr.preview}</span></div>
            <div className={styles.previewBody}>
              <div className={styles.previewTabs}>{tr.tabs.map((tab, i) => <span className={i === 0 ? styles.selectedTab : ""} key={tab}>{tab}</span>)}</div>
              <div className={styles.previewHeading}><div><small>{tr.overview}</small><h2>{tr.welcome}</h2></div><span className={styles.miniMark}><Sparkles size={23} /></span></div>
              <div className={styles.previewCards}>{[Users, BookOpen, ChartNoAxesCombined].map((Icon, i) => <div key={i}><Icon size={20} /><small>{tr.previewLabels[i]}</small><strong>{tr.previewValues[i]}</strong></div>)}</div>
              <div className={styles.pathway}><div className={styles.pathwayTitle}><strong>{tr.activity}</strong><ArrowUpRight size={18} /></div>{tr.activityItems.map((item, i) => <div className={styles.pathwayRow} key={item}><span>{String(i + 1).padStart(2, "0")}</span><p>{item}</p><Check size={15} /></div>)}</div>
            </div>
          </div>
          <div className={styles.floatingNote}><ShieldCheck size={22} /><div><strong>{lang === "ar" ? "مساحة خاصة بجهتك" : "A space that’s yours"}</strong><span>{lang === "ar" ? "هوية مستقلة · مجتمع مترابط" : "Your identity · Connected community"}</span></div></div>
          <p className={styles.previewCaption}>{tr.sample}</p>
        </div>
      </section>

      <div className={styles.capabilityStrip}>{tr.strip.map((label, i) => <span key={label}><span className={styles.stripDot} />{label}<small>0{i + 1}</small></span>)}</div>

      <section id="platform" className={styles.section}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{tr.featuresLabel}</p><h2>{tr.featuresTitle}</h2></div><p>{tr.featuresSub}</p></div>
        <div className={styles.roleGrid}>{tr.roles.map((role, i) => { const Icon = roleIcons[i]; return <article className={styles.roleCard} key={role.role}><div className={styles.roleTop}><span className={styles.roleIcon}><Icon size={25} /></span><span className={styles.roleNumber}>0{i + 1}</span></div><p className={styles.roleLabel}>{role.role}</p><h3>{role.title}</h3><p className={styles.roleBody}>{role.body}</p><div className={styles.tags}>{role.tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>; })}</div>
      </section>

      <section id="experience" className={styles.journey}>
        <div><p className={styles.eyebrow}>{tr.journeyLabel}</p><h2>{tr.journeyTitle}</h2><p className={styles.journeyIntro}>{tr.journeySub}</p><Link href="/login" className={styles.lightLink}>{tr.enter}<ArrowUpRight size={20} /></Link></div>
        <ol className={styles.steps}>{tr.steps.map((step, i) => <li key={step.title}><span>0{i + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
      </section>

      <section id="identity" className={`${styles.section} ${styles.identity}`}>
        <div className={styles.identityVisual}><div className={styles.identityCard}><div className={styles.identityCardTop}><Layers3 size={24} /><span>ROWAD / {lang === "ar" ? "مساحتك" : "YOUR SPACE"}</span></div><div className={styles.identitySymbol}><GraduationCap size={48} strokeWidth={1.2} /></div><h3>{tr.identityCard}</h3><p>{tr.identitySmall}</p><div className={styles.swatches} aria-hidden="true"><i /><i /><i /><i /></div><div className={styles.identityChips}>{tr.identityChips.map(text => <span key={text}>{text}</span>)}</div></div></div>
        <div><p className={styles.eyebrow}>{tr.identityLabel}</p><h2>{tr.identityTitle}</h2><p className={styles.identityIntro}>{tr.identitySub}</p><ul className={styles.benefits}>{tr.benefits.map(item => <li key={item}><Check size={17} />{item}</li>)}</ul></div>
      </section>

      <section className={styles.closing}><p className={styles.eyebrow}>{tr.finalLabel}</p><h2>{tr.finalTitle}</h2><p>{tr.finalSub}</p><div className={styles.actions}><Link href="/login" className={styles.primary}>{tr.enter}<ArrowUpRight size={19} /></Link><Link href="/signup" className={styles.secondary}>{tr.signup}</Link></div></section>
      <footer className={styles.footer}><Link href="/" className={styles.footerBrand}><img src="/binaa-brand/bina-alahliyya-brand-kit-v2/05-Symbols/symbol-original-maroon.svg" alt="" />{tr.brand}</Link><p>{tr.footer}</p><span>© {new Date().getFullYear()} Manzoma</span><a href="#top">{tr.back}<ArrowUpRight size={15} /></a></footer>
    </main>
  );
}
