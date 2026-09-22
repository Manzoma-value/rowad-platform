"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, CircleGauge, Compass, Globe2, Layers3, Menu, PlayCircle, Route, ShieldCheck, Sparkles, Target, Users, Workflow, X } from "lucide-react";
import styles from "./white-label.module.css";

type Lang = "ar" | "en";
const content = {
  ar: {
    nav: ["النموذج", "كيف يعمل", "القياس", "الرحلة"], login: "تسجيل الدخول", decision: "اطلب جلسة تعريفية",
    kicker: "منصة بناء الأهلية", heroTitle: "بناء الأهلية", heroAccent: "(الرواد)", heroBody: "نظام تكويني متكامل يحوّل المفاهيم إلى سلوك، والسلوك إلى أثر يمكن قراءته وتطويره.", supervisor: "دخول المشرفين", beneficiary: "دخول المستفيدين", operated: "بتشغيل منصة بناء الأهلية", proof: ["نموذج واحد", "5 مستويات", "3 طبقات قياس"],
    aboutLabel: "ما بناء الأهلية", aboutTitle: "ليس برنامجًا تدريبيًا.", aboutBody: "الأهلية بنية داخلية؛ إذا اكتملت أنتجت فعلًا صحيحًا بصورة تلقائية. لذلك يجمع النموذج بين البيئة التي تضبط وتُشغّل، والإنسان الذي تتغيّر سماته وتتجه مفاهيمه.", equationLabel: "المعادلة الحاكمة", environment: "البيئة", human: "الإنسان", eligibility: "الأهلية", origins: "الأصول + النظام", person: "السمات + المفاهيم",
    levelsLabel: "المستويات الخمسة", levelsTitle: "", levelsBody: "لا يُعبر مستوى قبل اكتمال ما تحته، فتظل الرحلة واضحة والتقدّم قابلًا للإثبات.", levels: ["الاتباع", "التفاعل", "القيادة", "التمكين", "الريادة"],
    operationLabel: "كيف يعمل البرنامج", operationTitle: "وحدة تشغيل واحدة تتكرر مع كل مفهوم.", operation: ["إدخال غير مباشر", "ربط بالسمة", "اختبار المفهوم", "فعل ظاهر", "قياس التحوّل", "إعادة ضبط المسار"],
    pathLabel: "مسار الجهة", pathTitle: "نظام واحد، مُعايَر على فئتكم.", pathBody: "يتغيّر ما يصنع ملاءمة المسار، بينما تبقى بنية النموذج ومنطق القياس ثابتين لحماية جودة النتائج وقابليتها للمقارنة.", pathItems: ["الحاجة المحرّكة", "المقصد المتصدّر", "مؤشرات القياس", "المستفيد النهائي"],
    measureLabel: "نظام القياس", measureTitle: "الأثر رقمٌ، لا رواية.", measureBody: "نظام واحد بثلاث طبقات متكاملة يصف نقطة البداية، يتابع التحوّل، ويكشف فجوة الإدراك دون أحكام نجاح أو فشل.", measures: [{ title: "بطاقة المفاهيم", body: "قراءة متدرجة من 1 إلى 6 لكل مفهوم." }, { title: "مقياس السمات", body: "قراءة مئوية توضح اتجاه التحوّل." }, { title: "مقياس الرشد", body: "يُظهر فجوة الإدراك ويوجّه الخطوة التالية." }],
    platformLabel: "المنصة", platformTitle: "التشغيل والقياس والتقرير في نظام واحد.", platformBody: "تشغيل ذاتي، واجهة ثنائية اللغة، وصلاحيات واضحة لكل دور؛ مع فصل الهوية البصرية عن نتائج القياس.", roles: ["مالك المنصة", "مدير الجهة", "حساب عرض", "المشرف", "المستفيد"],
    journeyLabel: "رحلة المستفيد", journeyTitle: "من النموذج إلى الأهلية.", journey: ["دعوة", "ترحيب", "خريطة المراحل", "دروس واختبارات", "أنشطة", "قراءة السمات", "شهادة"],
    impactLabel: "الأثر", impactTitle: "", direct: "الأثر المباشر", directBody: "كوادر الجهة التي تخوض رحلة التكوين والتشغيل.", indirect: "الأثر غير المباشر", indirectBody: "المستفيدون الذين يصل إليهم الفعل بعد تحوّل الكوادر.",
    faqLabel: "الأسئلة الشائعة", faqTitle: "إجابات قبل السؤال.", faqs: [["ما الفرق عن التدريب؟", "التدريب ينقل معرفة أو مهارة، بينما يبني هذا النموذج بنية داخلية تربط المفهوم بالسمة والفعل والقياس."], ["ما الذي يتغيّر لكل جهة؟", "الهوية والثيم واللغة والتسميات والنطاق وبوابة الوصول والمسار، مع بقاء بنية النموذج ومنطق القياس ثابتين."], ["هل تدعم المنصة لغتين؟", "نعم، في الواجهة وفي حقول المحتوى، مع تجربة متماسكة بالعربية والإنجليزية."], ["كيف تُحمى النتائج؟", "تفصل المنصة بيانات كل جهة وصلاحيات أدوارها، وتحافظ على منطق قياس موحّد وقابل للتدقيق."]],
    closingLabel: "الخطوة التالية", closingTitle: "ابدؤوا من حاجة جهتكم.", closingBody: "جلسة تعريفية قصيرة توضّح المسار الأنسب، وما يحتاجه التشغيل، وكيف سيُقرأ الأثر.", footer: "منتج من منتجات منظومة", rights: "جميع الحقوق محفوظة", back: "العودة للأعلى",
  },
  en: {
    nav: ["The model", "How it works", "Measurement", "Journey"], login: "Sign in", decision: "Request an introduction",
    kicker: "Binaa Al-Ahliyyah Platform", heroTitle: "Binaa Al-Ahliyyah", heroAccent: "(Al Rowad)", heroBody: "An integrated formation system that turns concepts into behavior, and behavior into impact that can be read and improved.", supervisor: "Supervisor access", beneficiary: "Beneficiary access", operated: "Powered by the Binaa Al-Ahliyyah platform", proof: ["One model", "5 levels", "3 measurement layers"],
    aboutLabel: "What is capability building?", aboutTitle: "More than a training program.", aboutBody: "Capability is an inner structure that produces sound action once complete. The model connects an environment that governs and operates with a person whose traits develop and concepts gain direction.", equationLabel: "The governing equation", environment: "Environment", human: "Person", eligibility: "Capability", origins: "Principles + system", person: "Traits + concepts",
    levelsLabel: "Five levels", levelsTitle: "", levelsBody: "Each level must be earned before the next opens, keeping the journey clear and progress demonstrable.", levels: ["Following", "Engagement", "Leadership", "Empowerment", "Pioneering"],
    operationLabel: "How the program works", operationTitle: "One operating unit, repeated with every concept.", operation: ["Indirect input", "Trait connection", "Concept test", "Visible action", "Transformation measure", "Path recalibration"],
    pathLabel: "Your organization’s pathway", pathTitle: "One system, calibrated to your audience.", pathBody: "The pathway adapts where relevance matters while the model and measurement logic remain stable, protecting quality and comparability.", pathItems: ["Driving need", "Leading purpose", "Measurement indicators", "Final beneficiary"],
    measureLabel: "Measurement system", measureTitle: "Impact is a number, not a narrative.", measureBody: "One system with three connected layers describes the starting point, tracks transformation, and reveals the perception gap without pass-or-fail judgments.", measures: [{ title: "Concept card", body: "A graded reading from 1 to 6 for every concept." }, { title: "Trait scale", body: "A percentage view of the direction of change." }, { title: "Maturity scale", body: "Reveals the perception gap and guides what comes next." }],
    platformLabel: "The platform", platformTitle: "Operate, measure, and report in one system.", platformBody: "Self-service operations, a bilingual experience, and clear permissions for every role, with visual identity kept separate from measurement results.", roles: ["Platform owner", "Organization admin", "View-only", "Supervisor", "Beneficiary"],
    journeyLabel: "Beneficiary journey", journeyTitle: "From the model to capability.", journey: ["Invitation", "Welcome", "Stage map", "Lessons & quizzes", "Activities", "Trait reading", "Certificate"],
    impactLabel: "Impact", impactTitle: "", direct: "Direct impact", directBody: "The organization’s people who complete the formation and operating journey.", indirect: "Indirect impact", indirectBody: "The beneficiaries reached by better action after the people’s transformation.",
    faqLabel: "Frequently asked questions", faqTitle: "Answers before you ask.", faqs: [["How is this different from training?", "Training transfers knowledge or a skill. This model builds an inner structure connecting concept, trait, action, and measurement."], ["What changes for each organization?", "Identity, theme, language, labels, domain, access gateway, and pathway adapt while the model and measurement logic stay stable."], ["Is the platform bilingual?", "Yes. Both the interface and content fields support a coherent Arabic and English experience."], ["How are results protected?", "Each organization’s data and permissions are isolated while the measurement logic remains consistent and auditable."]],
    closingLabel: "The next step", closingTitle: "Start with your organization’s need.", closingBody: "A short introduction clarifies the right pathway, operating requirements, and how impact will be read.", footer: "A Manzoma product", rights: "All rights reserved", back: "Back to top",
  },
} as const;

const operationIcons = [BookOpen, Sparkles, CircleGauge, PlayCircle, BarChart3, Route];
const measureIcons = [Layers3, BarChart3, Compass];

export default function LandingClient() {
  const [lang, setLang] = useState<Lang>("ar");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("white_label_ar_default_v1") !== "1") {
      localStorage.setItem("white_label_ar_default_v1", "1");
      localStorage.setItem("lang", "ar");
      return;
    }
    const saved = localStorage.getItem("lang");
    // Restore the visitor's existing preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "ar" || saved === "en") setLang(saved);
  }, []);
  useEffect(() => {
    const openingSeen = localStorage.getItem("binaa-opening-seen-v1");
    if (openingSeen) return;
    localStorage.setItem("binaa-opening-seen-v1", "1");
    // The opening is intentionally client-only and appears once per browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowOpening(true);
    const timer = window.setTimeout(() => setShowOpening(false), 3400);
    return () => window.clearTimeout(timer);
  }, []);
  const tr = content[lang];
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const navIds = ["model", "operation", "measurement", "journey"];
  const switchLanguage = () => { const next = lang === "ar" ? "en" : "ar"; setLang(next); localStorage.setItem("lang", next); };
  return (
    <main id="top" className={styles.root} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      {showOpening && (
        <div className={styles.opening} role="dialog" aria-modal="true" aria-label={lang === "ar" ? "افتتاح منصة بناء الأهلية" : "Opening Binaa Al-Ahliyyah"}>
          <div className={styles.openingPattern} aria-hidden="true" />
          <div className={styles.openingContent}>
            <div className={styles.openingSymbol}><Image src="/binaa-brand/bina-alahliyya-brand-kit-v2/05-Symbols/symbol-original-gold.svg" alt="" width={150} height={150} priority /></div>
            <div className={styles.openingRule} aria-hidden="true" />
            <h2>{lang === "ar" ? "بناء الأهلية (الرواد)" : "Binaa Al-Ahliyyah (Al Rowad)"}</h2>
            <span>{lang === "ar" ? "فكرةٌ تتحوّل إلى أثر" : "From concept to measurable impact"}</span>
          </div>
          <button type="button" className={styles.openingSkip} onClick={() => setShowOpening(false)}>{lang === "ar" ? "تخطي" : "Skip"}</button>
          <div className={styles.openingProgress} aria-hidden="true"><i /></div>
        </div>
      )}
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={tr.kicker}><Image src="/binaa-brand/header/wordmark.png" alt={lang === "ar" ? "بناء الأهلية" : "Binaa Al-Ahliyyah"} width={175} height={64} priority /><small>{lang === "ar" ? "الرواد" : "AL ROWAD"}</small></Link>
        <nav className={styles.desktopNav}>{navIds.map((id, i) => <a key={id} href={`#${id}`}>{tr.nav[i]}</a>)}</nav>
        <div className={styles.headerActions}><button className={styles.language} onClick={switchLanguage}>{lang === "ar" ? "EN" : "عربي"}</button><Link className={styles.headerLogin} href="/login">{tr.login}<ArrowUpRight size={16} /></Link><button className={styles.menuButton} aria-expanded={menuOpen} aria-controls="main-nav" aria-label={lang === "ar" ? "القائمة" : "Menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </header>
      {menuOpen && <nav id="main-nav" className={styles.mobileNav}>{navIds.map((id, i) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{tr.nav[i]}</a>)}</nav>}
      <section className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}>{tr.kicker}</p><h1>{tr.heroTitle}<em>{tr.heroAccent}</em></h1><p className={styles.intro}>{tr.heroBody}</p><div className={styles.actions}><Link href="/login" className={styles.primary}>{tr.supervisor}<Arrow size={18} /></Link><Link href="/login" className={styles.secondary}>{tr.beneficiary}<Arrow size={17} /></Link></div><p className={styles.heroNote}><ShieldCheck size={16} />{tr.operated}</p></div>
        <div className={styles.heroSystem}><div className={styles.systemHalo}><Image src="/binaa-brand/bina-alahliyya-brand-kit-v2/05-Symbols/symbol-original-gold.svg" alt="" width={530} height={530} /></div><div className={styles.systemCard}><span>{tr.equationLabel}</span><div className={styles.systemEquation}><div><small>{tr.environment}</small><strong>{tr.origins}</strong></div><b>+</b><div><small>{tr.human}</small><strong>{tr.person}</strong></div><b>=</b><div className={styles.result}><small>{tr.eligibility}</small><strong>{lang === "ar" ? "فعلٌ صحيح" : "Sound action"}</strong></div></div></div><div className={styles.proofRow}>{tr.proof.map((item, i) => <span key={item}><b>0{i + 1}</b>{item}</span>)}</div></div>
      </section>
      <section id="model" className={`${styles.section} ${styles.modelSection}`}><div className={styles.sectionLabel}>{tr.aboutLabel}</div><div className={styles.modelGrid}><div><h2>{tr.aboutTitle}</h2><p>{tr.aboutBody}</p></div><div className={styles.equationPanel}><span>{tr.equationLabel}</span><p>({tr.origins}) <b>+</b> ({tr.person}) <b>=</b> {tr.eligibility}</p></div></div></section>
      <section className={`${styles.section} ${styles.levelsSection}`}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{tr.levelsLabel}</p>{tr.levelsTitle && <h2>{tr.levelsTitle}</h2>}</div><p>{tr.levelsBody}</p></div><ol className={styles.levels}>{tr.levels.map((level, i) => <li key={level}><span>0{i + 1}</span><strong>{level}</strong>{i < tr.levels.length - 1 && <i />}</li>)}</ol></section>
      <section id="operation" className={styles.darkSection}><div className={styles.darkIntro}><p className={styles.eyebrow}>{tr.operationLabel}</p><h2>{tr.operationTitle}</h2></div><div className={styles.operationFlow}>{tr.operation.map((step, i) => { const Icon = operationIcons[i]; return <div key={step}><span><Icon size={20} /></span><b>0{i + 1}</b><strong>{step}</strong></div>; })}</div></section>
      <section className={`${styles.section} ${styles.pathSection}`}><div className={styles.pathCopy}><p className={styles.eyebrow}>{tr.pathLabel}</p><h2>{tr.pathTitle}</h2><p>{tr.pathBody}</p></div><div className={styles.pathList}>{tr.pathItems.map((item, i) => <div key={item}><span>0{i + 1}</span><strong>{item}</strong><Check size={17} /></div>)}</div></section>
      <section id="measurement" className={`${styles.section} ${styles.measureSection}`}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{tr.measureLabel}</p><h2>{tr.measureTitle}</h2></div><p>{tr.measureBody}</p></div><div className={styles.measureGrid}>{tr.measures.map((measure, i) => { const Icon = measureIcons[i]; return <article key={measure.title}><span><Icon size={24} /></span><small>0{i + 1}</small><h3>{measure.title}</h3><p>{measure.body}</p></article>; })}</div></section>
      <section className={styles.platformBand}><div><p className={styles.eyebrow}>{tr.platformLabel}</p><h2>{tr.platformTitle}</h2><p>{tr.platformBody}</p></div><div className={styles.roleRail}>{tr.roles.map((role, i) => <span key={role}><b>0{i + 1}</b>{role}</span>)}</div><div className={styles.platformMarks}><span><Workflow size={17} />{lang === "ar" ? "تشغيل ذاتي" : "Self-service"}</span><span><Globe2 size={17} />{lang === "ar" ? "ثنائية اللغة" : "Bilingual"}</span><span><ShieldCheck size={17} />{lang === "ar" ? "صلاحيات محكومة" : "Governed access"}</span></div></section>
      <section id="journey" className={`${styles.section} ${styles.journeySection}`}><div className={styles.journeyHeader}><p className={styles.eyebrow}>{tr.journeyLabel}</p><h2>{tr.journeyTitle}</h2></div><div className={styles.journeyTrack}>{tr.journey.map((step, i) => <div key={step}><span>{i + 1}</span><strong>{step}</strong></div>)}</div></section>
      <section className={`${styles.section} ${styles.impactSection}`}><div className={styles.impactTitle}><p className={styles.eyebrow}>{tr.impactLabel}</p>{tr.impactTitle && <h2>{tr.impactTitle}</h2>}</div><article><span><Users size={22} /></span><small>01</small><h3>{tr.direct}</h3><p>{tr.directBody}</p></article><article><span><Target size={22} /></span><small>02</small><h3>{tr.indirect}</h3><p>{tr.indirectBody}</p></article></section>
      <section className={`${styles.section} ${styles.faqSection}`}><div><p className={styles.eyebrow}>{tr.faqLabel}</p><h2>{tr.faqTitle}</h2></div><div className={styles.faqList}>{tr.faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
      <section className={styles.closing}><p className={styles.eyebrow}>{tr.closingLabel}</p><h2>{tr.closingTitle}</h2><p>{tr.closingBody}</p><div className={styles.actions}><Link href="/login" className={styles.primary}>{tr.login}<ArrowUpRight size={18} /></Link><a href="mailto:info@manzoma.sa" className={styles.secondary}>{tr.decision}<ArrowUpRight size={17} /></a></div></section>
      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}><Image src="/binaa-brand/bina-alahliyya-brand-kit-v2/05-Symbols/symbol-original-maroon.svg" alt="" width={28} height={28} />{tr.footer}</Link>
        <div className={styles.footerLogos}>
          <a href="https://manzoma.sa/" target="_blank" rel="noreferrer" aria-label="Manzoma"><Image src="/binaa-brand/partners/manzoma.png" alt="Manzoma" width={104} height={104} /></a>
          <Image src="/binaa-brand/partners/sunk-value.png" alt="Sunk Value" width={126} height={70} />
        </div>
        <span>© {new Date().getFullYear()} Manzoma · {tr.rights}</span><a href="#top">{tr.back}<ArrowUpRight size={15} /></a>
      </footer>
    </main>
  );
}
