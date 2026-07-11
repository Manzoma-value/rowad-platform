"use client";

import { useState, useEffect } from "react";

type Lang = "ar" | "sq" | "en";

const T = {
  ar: {
    title: "الجهة معطّلة",
    message: "تم تعطيل هذه الجهة من قِبل إدارة المنصة.",
    sub: "لا يمكن الوصول إلى المحتوى أو تسجيل الدخول حاليًا. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.",
    contact: "التواصل مع الإدارة",
    footer: "جميع الحقوق محفوظة © منظومة - 2026",
  },
  sq: {
    title: "Institucioni është çaktivizuar",
    message: "Ky institucion është çaktivizuar nga administrata e platformës.",
    sub: "Përmbajta dhe hyrja nuk janë të disponueshme aktualisht. Nëse mendoni se kjo është gabim, ju lutem kontaktoni administratën.",
    contact: "Kontaktoni administratën",
    footer: "Të gjitha të drejtat e rezervuara © Manzoma - 2026",
  },
  en: {
    title: "School Deactivated",
    message: "This school has been deactivated by the platform administration.",
    sub: "Content and login are currently unavailable. If you believe this is an error, please contact the administration.",
    contact: "Contact administration",
    footer: "All rights reserved © Manzoma - 2026",
  },
};

export default function SchoolDeactivatedClient({
  schoolName,
  schoolNameAlt,
  schoolLang,
}: {
  schoolName: string;
  schoolNameAlt: string | null;
  schoolLang: string;
}) {
  const [lang, setLang] = useState<Lang>(
    schoolLang === "sq" ? "sq" : schoolLang === "en" ? "en" : "ar",
  );
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const displayName =
    lang !== "ar" && schoolNameAlt && schoolNameAlt.trim()
      ? schoolNameAlt
      : schoolName;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const altLang: Lang = lang === "ar" ? (schoolLang === "sq" ? "sq" : "en") : "ar";

  return (
    <div className="sd-shell" dir={dir}>
      <div className={`sd-card ${mounted ? "sd-card--in" : ""}`}>
        {/* Language toggle */}
        <div className="sd-lang-row">
          <button
            className={`sd-lang-btn ${lang === altLang ? "" : "sd-lang-btn--on"}`}
            onClick={() => setLang(lang === "ar" ? altLang : "ar")}
          >
            {lang === "ar" ? altLang.toUpperCase() : "AR"}
          </button>
        </div>

        {/* Icon */}
        <div className="sd-icon-wrap">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
        </div>

        <h1 className="sd-title">{t.title}</h1>
        <div className="sd-school-name">{displayName}</div>

        <div className="sd-rule">
          <div className="sd-rule-line" />
          <div className="sd-rule-diamond" />
          <div className="sd-rule-line" />
        </div>

        <p className="sd-message">{t.message}</p>
        <p className="sd-sub">{t.sub}</p>
      </div>

      <div className="sd-footer">{t.footer}</div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes sd-fade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .sd-shell {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 24px;
          font-family: 'Cairo', sans-serif;
          background:
            radial-gradient(ellipse at 50% 20%, rgba(139,26,26,0.08), transparent 60%),
            radial-gradient(ellipse at 50% 80%, rgba(184,160,130,0.06), transparent 50%),
            #1A1A1A;
          color: #FFFBF5;
        }

        .sd-card {
          max-width: 520px; width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(139,26,26,0.25);
          border-radius: 24px;
          padding: 40px 36px;
          text-align: center;
          opacity: 0; transform: translateY(20px);
          transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sd-card--in { opacity: 1; transform: translateY(0); }

        .sd-lang-row {
          display: flex; justify-content: flex-end; margin-bottom: 20px;
        }
        .sd-lang-btn {
          background: rgba(184,160,130,0.10); border: 1px solid rgba(184,160,130,0.25);
          color: rgba(184,160,130,0.7); border-radius: 8px;
          padding: 5px 14px; font-size: 11px; font-weight: 800;
          letter-spacing: 0.08em; cursor: pointer;
          font-family: 'Cairo', sans-serif; transition: all 0.18s;
        }
        .sd-lang-btn:hover { background: rgba(184,160,130,0.18); color: #B8A082; }

        .sd-icon-wrap {
          width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(139,26,26,0.12); border: 1px solid rgba(139,26,26,0.30);
          color: #c04040;
        }

        .sd-title {
          font-size: 24px; font-weight: 900; color: #e8d8b8;
          letter-spacing: -0.5px; margin-bottom: 8px;
        }

        .sd-school-name {
          font-size: 15px; font-weight: 700; color: rgba(184,160,130,0.70);
          margin-bottom: 16px;
        }

        .sd-rule {
          display: flex; align-items: center; gap: 8px;
          margin: 0 auto 20px; max-width: 200px;
        }
        .sd-rule-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(139,26,26,0.35), transparent); }
        .sd-rule-diamond { width: 5px; height: 5px; background: rgba(139,26,26,0.6); transform: rotate(45deg); flex-shrink: 0; }

        .sd-message {
          font-size: 14px; font-weight: 700; color: rgba(255,253,248,0.85);
          line-height: 1.7; margin-bottom: 12px;
        }
        .sd-sub {
          font-size: 12.5px; color: rgba(255,253,248,0.45);
          line-height: 1.7;
        }

        .sd-footer {
          margin-top: 32px;
          font-size: 10px; font-weight: 500; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(184,160,130,0.3);
        }

        @media (max-width: 480px) {
          .sd-card { padding: 28px 20px; border-radius: 18px; }
          .sd-title { font-size: 20px; }
          .sd-message { font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
