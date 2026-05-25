"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    bannerTitle: "تم تعيينك في فصلك الدراسي!",
    bannerSub: (name: string) => `أهلاً وسهلاً، ${name}`,
    classLabel: "فصلك الدراسي",
    teacherLabel: "معلمك",
    classmatesLabel: "زملاؤك في الفصل",
    classmatesCount: (n: number) => `${n} طالب`,
    scoreLabel: "نتيجة اختبار التصنيف",
    goBtn: "انتقل إلى الفصل الآن",
    footerNote: "يمكنك الآن رؤية إعلانات فصلك وأداء الاختبارات",
  },
  sq: {
    bannerTitle: "Jeni caktuar në klasën tuaj!",
    bannerSub: (name: string) => `Mirë se vini, ${name}`,
    classLabel: "Klasa juaj",
    teacherLabel: "Mësuesi juaj",
    classmatesLabel: "Shokët e klasës",
    classmatesCount: (n: number) => `${n} nxënës`,
    scoreLabel: "Rezultati i testit të vendosjes",
    goBtn: "Shko te klasa tani",
    footerNote: "Tani mund të shikoni njoftime dhe të bëni teste",
  },
} as const;

interface StudentData {
  profile: { full_name: string };
  school: { name: string } | null;
  class: {
    id: string;
    name: string;
    teacher: { profile: { full_name: string } } | null;
    students: { id: string }[];
  } | null;
  onboarding_status: string;
}
interface PlacementAttempt {
  score: number | null;
  total: number | null;
}

export default function StudentWelcomePage() {
  const router = useRouter();
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attempt, setAttempt] = useState<PlacementAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/student").then((r) => r.json()),
      fetch("/api/student/placement-result").then((r) => r.json()),
    ]).then(([studentData, attemptData]) => {
      setStudent(studentData);
      setAttempt(attemptData.attempt ?? null);
      setLoading(false);
      setTimeout(() => setVisible(true), 80);
    });
  }, []);

  const pct =
    attempt?.score != null && attempt?.total
      ? Math.round((attempt.score / attempt.total) * 100)
      : null;

  const scoreColor =
    pct === null
      ? "#C8A96A"
      : pct >= 70
        ? "#2D7A4F"
        : pct >= 50
          ? "#A8863E"
          : "#C0392B";

  const scoreBg =
    pct === null
      ? "rgba(200,169,106,0.1)"
      : pct >= 70
        ? "rgba(45,122,79,0.08)"
        : pct >= 50
          ? "rgba(168,134,62,0.08)"
          : "rgba(192,57,43,0.08)";

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
          transition: "opacity 0.55s ease, transform 0.55s ease",
        }}
      >
        {/* Celebration banner */}
        <div className="top-banner">
          <div className="banner-stars">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="banner-title">{T.bannerTitle}</div>
          <div className="banner-sub">{T.bannerSub(student?.profile.full_name ?? "")}</div>
        </div>

        {/* Class highlight */}
        <div className="class-card">
          <div className="class-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <div className="class-label">{T.classLabel}</div>
          <div className="class-name">{student?.class?.name ?? "—"}</div>
          {student?.school && (
            <div className="class-school">{student.school.name}</div>
          )}
        </div>

        {/* Info rows */}
        {student?.class?.teacher && (
          <div className="info-row">
            <div className="info-icon">
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
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="info-body">
              <div className="info-label">{T.teacherLabel}</div>
              <div className="info-value">
                {student.class.teacher.profile.full_name}
              </div>
            </div>
          </div>
        )}

        {student?.class && (
          <div className="info-row">
            <div className="info-icon">
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
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="info-body">
              <div className="info-label">{T.classmatesLabel}</div>
              <div className="info-value">{T.classmatesCount(student.class.students.length)}</div>
            </div>
          </div>
        )}

        {/* Score */}
        {pct !== null && attempt && (
          <div
            className="score-section"
            style={{ background: scoreBg, borderColor: `${scoreColor}33` }}
          >
            <div className="score-header">
              <span className="score-label">{T.scoreLabel}</span>
              <span
                className="score-pct"
                style={{ color: scoreColor, background: `${scoreColor}18` }}
              >
                {pct}٪
              </span>
            </div>
            <div className="score-nums">
              <span className="score-num" style={{ color: scoreColor }}>
                {attempt.score}
              </span>
              <span className="score-sep">/</span>
              <span className="score-den">{attempt.total}</span>
            </div>
            <div className="score-track">
              <div
                className="score-fill"
                style={{ width: `${pct}%`, background: scoreColor }}
              />
            </div>
          </div>
        )}

        <button className="go-btn" onClick={() => router.push("/student")}>
          {T.goBtn}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="footer-note">{T.footerNote}</div>
      </div>

      <style>{baseStyles}</style>
      <style>{`
        .top-banner {
          background: var(--ink); border-radius: 16px; padding: 22px 20px;
          text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .banner-stars { display: flex; align-items: center; gap: 6px; color: var(--gold); }
        .banner-title { font-size: 20px; font-weight: 800; color: #fff; }
        .banner-sub { font-size: 13.5px; color: rgba(255,255,255,0.6); }

        .class-card {
          display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center;
          padding: 22px 20px; background: var(--gold-pale); border-radius: 16px; border: 1px solid var(--border);
        }
        .class-icon { color: var(--gold-dark); }
        .class-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .class-name { font-size: 30px; font-weight: 800; color: var(--ink); letter-spacing: -0.5px; }
        .class-school { font-size: 13px; color: var(--gold-dark); font-weight: 600; }

        .info-row {
          display: flex; align-items: center; gap: 14px;
          background: var(--surface); border-radius: 12px; padding: 14px 16px; border: 1px solid var(--border);
        }
        .info-icon { color: var(--gold-dark); flex-shrink: 0; }
        .info-label { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-size: 15px; font-weight: 700; color: var(--ink); margin-top: 2px; }

        .score-section { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 12px; border: 1px solid; }
        .score-header { display: flex; align-items: center; justify-content: space-between; }
        .score-label { font-size: 12px; font-weight: 700; color: var(--muted); }
        .score-pct { font-size: 12px; font-weight: 800; padding: 3px 11px; border-radius: 99px; }
        .score-nums { display: flex; align-items: baseline; gap: 4px; }
        .score-num { font-size: 34px; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px; }
        .score-sep { font-size: 22px; color: var(--border); }
        .score-den { font-size: 22px; font-weight: 700; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
        .score-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
        .score-fill { height: 100%; border-radius: 99px; transition: width 1.2s ease; }

        .go-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: var(--ink); color: #fff; padding: 14px 20px; border-radius: 12px;
          border: none; font-size: 15px; font-weight: 800; cursor: pointer;
          transition: all 0.2s; font-family: 'Cairo', sans-serif; width: 100%;
        }
        .go-btn:hover { background: var(--gold); color: var(--ink); transform: translateY(-1px); }
        .footer-note { text-align: center; font-size: 12px; color: var(--muted); }
      `}</style>
    </div>
  );
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #C8A96A; --gold-dark: #A8863E; --gold-light: #E8D09A; --gold-pale: #F5EDDA;
    --ink: #1A1208; --ink2: #3D2E10; --muted: #7A6540; --surface: #FEFCF7; --border: #E8D9B8;
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
    padding: 28px 26px; width: 100%; max-width: 460px;
    display: flex; flex-direction: column; gap: 16px;
    box-shadow: 0 8px 32px rgba(26,18,8,0.08);
  }
`;
