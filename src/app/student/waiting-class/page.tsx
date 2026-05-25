"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    headerLabel: "تعيين المدرسة",
    headerTitle: "تم تعيينك في مدرسة!",
    desc: (name: string) => `${name ? `مرحباً ${name}، ` : ""}تم قبولك في المدرسة بنجاح. الآن سيقوم مدير المدرسة بمراجعة نتائجك وتعيينك في الفصل الدراسي المناسب قريباً.`,
    step1Title: "اختبار القبول",
    step1Sub: "مكتمل",
    step2Title: "تعيين المدرسة",
    step2Sub: "مكتمل",
    step3Title: "تعيين الفصل الدراسي",
    step3Sub: "قيد الانتظار...",
    note: "سيتم إخطارك فور تعيينك في فصلك الدراسي. لا حاجة لفعل أي شيء الآن.",
  },
  sq: {
    headerLabel: "Caktimi i shkollës",
    headerTitle: "Jeni caktuar në një shkollë!",
    desc: (name: string) => `${name ? `Mirësevini ${name}, ` : ""}Jeni pranuar me sukses në shkollë. Tani drejtori i shkollës do të rishikojë rezultatet tuaja dhe do t'ju caktojë në klasën e duhur së shpejti.`,
    step1Title: "Testi i pranimit",
    step1Sub: "Kryer",
    step2Title: "Caktimi i shkollës",
    step2Sub: "Kryer",
    step3Title: "Caktimi i klasës",
    step3Sub: "Duke pritur...",
    note: "Do të njoftoheni menjëherë sapo të caktoheni në klasën tuaj. Nuk keni nevojë të bëni asgjë tani.",
  },
} as const;

export default function StudentWaitingClassPage() {
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/student")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.full_name) setStudentName(d.profile.full_name);
        if (d.school?.name) setSchoolName(d.school.name);
      });
    setTimeout(() => setVisible(true), 50);
  }, []);

  const checkIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <div className="shell" dir={dir}>
      <div
        className="card"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Dark header bar */}
        <div className="card-header">
          <div className="header-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="header-label">{T.headerLabel}</div>
            <div className="header-title">{T.headerTitle}</div>
            {schoolName && <div className="school-pill">{schoolName}</div>}
          </div>
        </div>

        {/* Body */}
        <div className="card-body">
          <p className="desc-text">{T.desc(studentName)}</p>

          <div className="steps-box">
            <div className="step">
              <div className="step-con">
                <div className="step-dot dot-done">{checkIcon}</div>
                <div className="step-line line-done" />
              </div>
              <div className="step-text">
                <div className="step-title">{T.step1Title}</div>
                <div className="step-sub sub-done">{T.step1Sub}</div>
              </div>
            </div>
            <div className="step">
              <div className="step-con">
                <div className="step-dot dot-done">{checkIcon}</div>
                <div className="step-line line-done" />
              </div>
              <div className="step-text">
                <div className="step-title">{T.step2Title}</div>
                <div className="step-sub sub-done">{T.step2Sub}</div>
              </div>
            </div>
            <div className="step" style={{ paddingBottom: 0 }}>
              <div className="step-con">
                <div className="step-dot dot-active">
                  <span className="dot-pulse" />
                </div>
              </div>
              <div className="step-text">
                <div className="step-title">{T.step3Title}</div>
                <div className="step-sub sub-active">{T.step3Sub}</div>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="note-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {T.note}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --gold: #C8A96A; --gold-dark: #A8863E; --gold-light: #E8D09A; --gold-pale: #F5EDDA;
          --ink: #1A1208; --ink2: #3D2E10; --muted: #7A6540; --surface: #FEFCF7; --border: #E8D9B8;
        }
        .shell {
          min-height: 100vh; background: var(--gold-pale);
          font-family: 'Cairo', sans-serif;
          display: flex; align-items: center; justify-content: center; padding: 32px 16px;
        }
        .card {
          background: #fff; border: 1px solid var(--border); border-radius: 22px;
          width: 100%; max-width: 480px; overflow: hidden;
          box-shadow: 0 4px 32px rgba(26,18,8,0.08);
        }
        .card-header {
          background: var(--ink); padding: 24px 28px;
          display: flex; align-items: center; gap: 16px;
        }
        .header-icon {
          width: 56px; height: 56px; border-radius: 14px; flex-shrink: 0;
          background: rgba(200,169,106,0.18); border: 1px solid rgba(200,169,106,0.3);
          display: flex; align-items: center; justify-content: center; color: var(--gold);
        }
        .header-label { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
        .header-title { font-size: 19px; font-weight: 800; color: #fff; }
        .school-pill {
          display: inline-flex; margin-top: 7px;
          background: rgba(200,169,106,0.15); border: 1px solid rgba(200,169,106,0.3);
          color: var(--gold-light); font-size: 12px; font-weight: 700;
          padding: 3px 12px; border-radius: 99px;
        }
        .card-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 18px; }
        .desc-text { font-size: 13.5px; color: var(--muted); line-height: 1.8; }
        .steps-box { background: var(--gold-pale); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
        .step { display: flex; align-items: center; gap: 13px; padding: 8px 0; }
        .step-con { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .step-line { width: 2px; height: 16px; background: var(--border); margin: 0 auto; }
        .line-done { background: var(--gold); }
        .dot-done { background: var(--gold); color: var(--ink); }
        .dot-active { background: rgba(200,169,106,0.12); border: 2px solid var(--gold); }
        .dot-pulse { width: 10px; height: 10px; border-radius: 50%; background: var(--gold); animation: dp 1.6s ease infinite; }
        @keyframes dp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
        .step-text { flex: 1; }
        .step-title { font-size: 13px; font-weight: 700; color: var(--ink); }
        .step-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .sub-done { color: var(--gold-dark); }
        .sub-active { color: var(--gold-dark); }
        .divider { height: 1px; background: var(--border); }
        .note-bar {
          display: flex; align-items: center; gap: 9px;
          background: rgba(200,169,106,0.08); border: 1px solid rgba(200,169,106,0.25);
          color: var(--muted); font-size: 12.5px; padding: 11px 15px; border-radius: 10px;
        }
        .note-bar svg { flex-shrink: 0; color: var(--gold-dark); }
      `}</style>
    </div>
  );
}
