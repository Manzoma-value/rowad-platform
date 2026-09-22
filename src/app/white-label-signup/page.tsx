"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./white-label-signup.module.css";

type Lang = "ar" | "en";

const copy = {
  en: {
    dir: "ltr" as const,
    brandAlt: "Binaa Al-Ahliyyah (Al Rowad)",
    navLabel: "Private access",
    eyebrow: "A CURATED PLATFORM EXPERIENCE",
    heroTitle: "Your place is prepared before you arrive.",
    heroBody: "Every account enters through a verified invitation, keeping the experience focused, private, and entirely separate from other Rowad environments.",
    signal: "Independent identity · Isolated data · Approved access",
    cardEyebrow: "JOIN THE PLATFORM",
    cardTitle: "Registration starts with an invitation.",
    cardBody: "Public sign-up is intentionally closed. Approved administrators, supervisors, and beneficiaries receive a dedicated invitation from the platform team.",
    adminTitle: "Administrator access",
    adminBody: "Use the credentials issued specifically for this platform.",
    memberTitle: "Supervisor or beneficiary",
    memberBody: "Open your official invitation link to create your account securely.",
    notice: "An account from another Rowad environment cannot be used here.",
    login: "I already have approved access",
    home: "Return to the platform",
    footer: "A private experience by Manzoma",
  },
  ar: {
    dir: "rtl" as const,
    brandAlt: "منصة بناء الأهلية (الرواد)",
    navLabel: "دخول خاص",
    eyebrow: "تجربة منصة منتقاة بعناية",
    heroTitle: "مكانك يُجهّز قبل وصولك.",
    heroBody: "يدخل كل حساب عبر دعوة موثقة، لتبقى التجربة مركّزة وخاصة ومستقلة تمامًا عن بقية بيئات الرواد.",
    signal: "هوية مستقلة · بيانات معزولة · دخول معتمد",
    cardEyebrow: "الانضمام إلى المنصة",
    cardTitle: "التسجيل يبدأ بدعوة.",
    cardBody: "التسجيل العام مغلق عمدًا. يحصل المديرون والمشرفون والمستفيدون المعتمدون على دعوة مخصصة من فريق المنصة.",
    adminTitle: "دخول المدير",
    adminBody: "استخدم بيانات الدخول الصادرة خصيصًا لهذه المنصة.",
    memberTitle: "مشرف أو مستفيد",
    memberBody: "افتح رابط الدعوة الرسمي لإنشاء حسابك بأمان.",
    notice: "لا يمكن استخدام حساب تابع لأي بيئة أخرى من الرواد هنا.",
    login: "لدي دخول معتمد بالفعل",
    home: "العودة إلى المنصة",
    footer: "تجربة خاصة من منظومة",
  },
};

export default function WhiteLabelSignupPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const text = copy[lang];

  useEffect(() => {
    if (localStorage.getItem("white_label_ar_default_v1") !== "1") {
      localStorage.setItem("white_label_ar_default_v1", "1");
      localStorage.setItem("lang", "ar");
      return;
    }
    const saved = localStorage.getItem("lang");
    if (saved === "ar" || saved === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(saved);
    }
  }, []);

  function chooseLanguage(next: Lang) {
    setLang(next);
    localStorage.setItem("lang", next);
    localStorage.setItem("language_preference_v2", "1");
  }

  return (
    <main className={styles.page} dir={text.dir}>
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.wordmarkLink} aria-label={text.home}>
          <Image
            src="/binaa-brand/header/wordmark.png"
            alt={text.brandAlt}
            width={280}
            height={103}
            className={styles.wordmark}
            priority
          />
        </Link>

        <div className={styles.headerActions}>
          <span className={styles.privateLabel}><ShieldCheck size={14} />{text.navLabel}</span>
          <div className={styles.langToggle} dir="ltr" aria-label="Language">
            <button type="button" className={lang === "en" ? styles.activeLang : ""} onClick={() => chooseLanguage("en")}>EN</button>
            <button type="button" className={lang === "ar" ? styles.activeLang : ""} onClick={() => chooseLanguage("ar")}>عربي</button>
          </div>
        </div>
      </header>

      <section className={styles.stage}>
        <div className={styles.hero}>
          <div className={styles.heroPattern} aria-hidden="true" />
          <div className={styles.orbit} aria-hidden="true">
            <Image
              src="/binaa-brand/bina-alahliyya-brand-kit-v2/05-Symbols/symbol-original-gold.svg"
              alt=""
              width={116}
              height={116}
            />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles size={15} />{text.eyebrow}</p>
            <h1>{text.heroTitle}</h1>
            <p className={styles.heroBody}>{text.heroBody}</p>
            <div className={styles.signal}><span />{text.signal}</div>
          </div>
          <span className={styles.index}>01 / ACCESS</span>
        </div>

        <div className={styles.accessPanel}>
          <div className={styles.panelGlow} aria-hidden="true" />
          <div className={styles.panelContent}>
            <p className={styles.cardEyebrow}>{text.cardEyebrow}</p>
            <h2>{text.cardTitle}</h2>
            <p className={styles.cardBody}>{text.cardBody}</p>

            <div className={styles.accessGrid}>
              <article className={styles.accessCard}>
                <span className={styles.iconBox}><KeyRound size={20} /></span>
                <div>
                  <h3>{text.adminTitle}</h3>
                  <p>{text.adminBody}</p>
                </div>
                <span className={styles.cardNumber}>01</span>
              </article>
              <article className={styles.accessCard}>
                <span className={styles.iconBox}><UserRoundCheck size={20} /></span>
                <div>
                  <h3>{text.memberTitle}</h3>
                  <p>{text.memberBody}</p>
                </div>
                <span className={styles.cardNumber}>02</span>
              </article>
            </div>

            <div className={styles.notice}><ShieldCheck size={17} /><span>{text.notice}</span></div>

            <div className={styles.actions}>
              <Link href="/login" className={styles.primaryAction}>
                <span>{text.login}</span><ArrowRight size={18} className={styles.arrow} />
              </Link>
              <Link href="/" className={styles.secondaryAction}>{text.home}</Link>
            </div>
          </div>
          <p className={styles.panelFooter}>{text.footer}</p>
        </div>
      </section>
    </main>
  );
}
