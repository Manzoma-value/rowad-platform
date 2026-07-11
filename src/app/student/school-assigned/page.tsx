"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    congrats: "مبروك!",
    greeting: (name: string) => name ? `أهلاً ${name}،` : "أهلاً بك!",
    sub: "تم قبولك في المنصة وتعيينك في مدرسة",
    schoolLabel: "مدرستك",
    scoreLabel: "نتيجة اختبار القبول",
    nextTitle: "الخطوة التالية: اختبار التصنيف",
    nextDesc: "ستجري الآن اختباراً قصيراً تعدّه مدرستك لتحديد الفصل المناسب لك. يشمل أسئلة اختيار متعدد وصح أم خطأ وأسئلة مكتوبة.",
    startBtn: "ابدأ اختبار التصنيف",
    starting: "جارٍ التحميل...",
    footerNote: "الاختبار إلزامي لتحديد فصلك الدراسي",
  },
  sq: {
    congrats: "Urime!",
    greeting: (name: string) => name ? `Mirë se vini, ${name}!` : "Mirë se vini!",
    sub: "Jeni pranuar në platformë dhe caktuar në një shkollë",
    schoolLabel: "Shkolla juaj",
    scoreLabel: "Rezultati i testit të pranimit",
    nextTitle: "Hapi tjetër: Testi i Vendosjes",
    nextDesc: "Tani do të bëni një test të shkurtër të përgatitur nga shkolla juaj për të përcaktuar klasën e duhur. Përfshin pyetje me zgjedhje të shumëfishtë, e vërtetë/e gabuar dhe me shkrim.",
    startBtn: "Fillo testin e vendosjes",
    starting: "Duke ngarkuar...",
    footerNote: "Testi është i detyrueshëm për të përcaktuar klasën tuaj",
  },
} as const;

interface StudentData {
  profile: { full_name: string };
  school: { name: string; name_alt?: string | null } | null;
}

interface IntakeAttempt {
  score: number | null;
  total: number | null;
}

export default function StudentSchoolAssignedPage() {
  const router = useRouter();
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attempt, setAttempt] = useState<IntakeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch("/api/student")
      .then((r) => r.json())
      .then((d) => setStudent(d))
      .catch((e) => console.log("student error:", e));

    fetch("/api/student/intake-result")
      .then((r) => r.json())
      .then((d) => setAttempt(d.attempt ?? null))
      .catch((e) => console.log("intake-result error:", e))
      .finally(() => {
        setLoading(false);
        setTimeout(() => setVisible(true), 80);
      });
  }, []);

  function handleStart() {
    setStarting(true);
    router.push("/student/placement");
  }

  const pct =
    attempt?.score != null && attempt?.total
      ? Math.round((attempt.score / attempt.total) * 100)
      : null;

  const scoreColor =
    pct === null
      ? "#B8A082"
      : pct >= 70
        ? "#2D7A4F"
        : pct >= 50
          ? "#8F765B"
          : "#6B1E2D";

  if (loading)
    return (
      <div className="shell" dir={dir}>
        <div className="spinner" />
        <style>{baseStyles}</style>
      </div>
    );

  return (
    <div className="shell" dir={dir}>
      <div
        className="card"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Dark celebration banner */}
        <div className="top-banner">
          <div className="banner-seal">
            <div className="seal-ring" />
            <div className="seal-ring2" />
            <div className="seal-core">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B8A082"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="banner-text">
            <div className="banner-eyebrow">{T.congrats}</div>
            <div className="banner-title">{T.greeting(student?.profile.full_name ?? "")}</div>
            <div className="banner-sub">{T.sub}</div>
          </div>
        </div>

        {/* School card */}
        {student?.school && (
          <div className="school-card">
            <div className="school-icon-wrap">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="school-info">
              <div className="school-label-sm">{T.schoolLabel}</div>
              <div className="school-name">{lang !== "ar" && student.school.name_alt && student.school.name_alt.trim() ? student.school.name_alt : student.school.name}</div>
            </div>
          </div>
        )}

        {/* Score */}
        {pct !== null && attempt && (
          <div
            className="score-section"
            style={{
              borderColor: `${scoreColor}33`,
              background: `${scoreColor}0D`,
            }}
          >
            <div className="score-label-top">{T.scoreLabel}</div>
            <div className="score-display">
              <span className="score-num" style={{ color: scoreColor }}>
                {attempt.score}
              </span>
              <span className="score-sep">/</span>
              <span className="score-den">{attempt.total}</span>
              <div
                className="score-pct-badge"
                style={{ color: scoreColor, background: `${scoreColor}18` }}
              >
                {pct}٪
              </div>
            </div>
            <div className="score-bar-wrap">
              <div
                className="score-bar"
                style={{ width: `${pct}%`, background: scoreColor }}
              />
            </div>
          </div>
        )}

        {/* Next step info box */}
        <div className="next-step-box">
          <div className="next-step-icon-wrap">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="next-step-body">
            <div className="next-step-title">{T.nextTitle}</div>
            <div className="next-step-desc">{T.nextDesc}</div>
          </div>
        </div>

        {/* CTA */}
        <button className="start-btn" onClick={handleStart} disabled={starting}>
          {starting ? (
            <><div className="btn-spin" />{T.starting}</>
          ) : (
            <>
              {T.startBtn}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </>
          )}
        </button>

        <div className="footer-note">{T.footerNote}</div>
      </div>

      <style>{baseStyles}</style>
      <style>{pageStyles}</style>
    </div>
  );
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=JetBrains+Mono:wght@700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #B8A082; --gold-dark: #8F765B; --gold-light: #E8D09A; --gold-pale: #F5EDDA;
    --ink: #4A0E1C; --ink2: #4A0E1C; --muted: #796A62; --surface: #FEFCF7; --border: #E8D9B8;
  }
  .shell {
    min-height: 100vh; background: var(--gold-pale);
    font-family: 'Cairo', sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 28px 16px;
  }
  .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: sp 0.7s linear infinite; }
  @keyframes sp { to { transform: rotate(360deg); } }
  .card {
    background: #fff; border: 1px solid var(--border); border-radius: 22px;
    width: 100%; max-width: 460px; overflow: hidden;
    display: flex; flex-direction: column; gap: 0;
    box-shadow: 0 8px 32px rgba(26,18,8,0.08);
  }
`;

const pageStyles = `
  /* Banner */
  .top-banner {
    background: var(--ink); padding: 28px 28px 26px;
    display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
  }
  .banner-seal { position: relative; width: 82px; height: 82px; display: flex; align-items: center; justify-content: center; }
  .seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(184,160,130,0.3); animation: rp 2.4s ease infinite; }
  @keyframes rp { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.14);opacity:1} }
  .seal-ring2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px dashed rgba(184,160,130,0.2); animation: spin 8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .seal-core { width: 62px; height: 62px; border-radius: 50%; background: rgba(184,160,130,0.12); border: 1.5px solid rgba(184,160,130,0.35); display: flex; align-items: center; justify-content: center; }
  .banner-text { display: flex; flex-direction: column; gap: 5px; }
  .banner-eyebrow { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1.5px; text-transform: uppercase; background: rgba(184,160,130,0.15); border: 1px solid rgba(184,160,130,0.25); border-radius: 99px; padding: 3px 14px; width: fit-content; margin: 0 auto; }
  .banner-title { font-size: 22px; font-weight: 800; color: #fff; }
  .banner-sub { font-size: 13px; color: rgba(255,255,255,0.55); }

  /* Card body padding wrapper */
  .school-card, .score-section, .next-step-box, .start-btn, .footer-note { margin: 0 24px; }
  .school-card { margin-top: 22px; }
  .footer-note { margin-bottom: 22px; }

  /* School */
  .school-card {
    display: flex; align-items: center; gap: 14px;
    background: var(--gold-pale); border: 1px solid var(--border);
    border-radius: 14px; padding: 15px 18px; margin-bottom: 0;
  }
  .school-icon-wrap {
    width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
    background: rgba(184,160,130,0.15); border: 1px solid rgba(184,160,130,0.3);
    display: flex; align-items: center; justify-content: center; color: var(--gold-dark);
  }
  .school-info { display: flex; flex-direction: column; gap: 3px; }
  .school-label-sm { font-size: 10px; font-weight: 700; color: var(--gold-dark); text-transform: uppercase; letter-spacing: 0.8px; }
  .school-name { font-size: 17px; font-weight: 800; color: var(--ink); }

  /* Score */
  .score-section {
    display: flex; flex-direction: column; gap: 9px; margin-top: 14px;
    border-radius: 12px; border: 1px solid; padding: 15px 18px;
  }
  .score-label-top { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
  .score-display { display: flex; align-items: baseline; gap: 4px; justify-content: center; }
  .score-num { font-size: 38px; font-weight: 800; letter-spacing: -1.5px; font-family: 'JetBrains Mono', monospace; }
  .score-sep { font-size: 24px; color: var(--border); }
  .score-den { font-size: 24px; font-weight: 700; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
  .score-pct-badge { font-size: 12.5px; font-weight: 800; padding: 3px 11px; border-radius: 99px; margin-right: 8px; align-self: center; }
  .score-bar-wrap { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .score-bar { height: 100%; border-radius: 99px; transition: width 1.1s ease; }

  /* Next step */
  .next-step-box {
    display: flex; align-items: flex-start; gap: 14px; margin-top: 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 15px 16px;
  }
  .next-step-icon-wrap {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    background: var(--gold-pale); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center; color: var(--gold-dark);
  }
  .next-step-body { display: flex; flex-direction: column; gap: 5px; }
  .next-step-title { font-size: 13.5px; font-weight: 800; color: var(--ink); }
  .next-step-desc { font-size: 12.5px; color: var(--muted); line-height: 1.7; }

  /* CTA */
  .start-btn {
    display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 18px;
    background: var(--ink); color: #fff; padding: 14px; border-radius: 12px;
    border: none; font-size: 15px; font-weight: 800; cursor: pointer;
    transition: all 0.2s; font-family: 'Cairo', sans-serif; width: calc(100% - 48px);
  }
  .start-btn:hover:not(:disabled) { background: var(--gold); color: var(--ink); }
  .start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-spin { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: sp 0.7s linear infinite; }

  /* Footer */
  .footer-note { text-align: center; font-size: 12px; color: var(--muted); margin-top: 10px; }

  /* Spacer between sections when no score */
  .school-card + .next-step-box { margin-top: 14px; }

  /* ─── Mobile ─── */
  @media (max-width: 500px) {
    .shell { padding: 16px 12px; }
    .card { padding: 22px 18px; border-radius: 18px; gap: 14px; }
    .footer-note { font-size: 11.5px; }
    .start-btn { padding: 12px 16px; font-size: 14px; }
  }
`;
