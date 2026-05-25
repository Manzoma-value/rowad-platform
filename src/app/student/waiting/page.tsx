"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    title: (name: string) => name ? `شكراً، ${name}!` : "تم التقديم بنجاح!",
    desc: "تم استلام إجاباتك بنجاح. سيقوم المسؤول بمراجعة اختبارك وتحديد المدرسة المناسبة لك في أقرب وقت.",
    step1Title: "تقديم اختبار القبول",
    step1Sub: "تم بنجاح",
    step2Title: "مراجعة المسؤول",
    step2Sub: "قيد الانتظار...",
    step3Title: "تحديد المدرسة",
    step3Sub: "قريباً",
    step4Title: "الانضمام للفصل الدراسي",
    step4Sub: "قريباً",
    note: "ستظهر هذه الصفحة حتى يتم تعيينك في مدرسة. لا حاجة لفعل أي شيء الآن.",
  },
  sq: {
    title: (name: string) => name ? `Faleminderit, ${name}!` : "Aplikimi u dërgua me sukses!",
    desc: "Përgjigjet tuaja u morën me sukses. Administratori do të rishikojë testin tuaj dhe do të caktojë shkollën e duhur sa më shpejt.",
    step1Title: "Testi i pranimit u dërgua",
    step1Sub: "Kryer me sukses",
    step2Title: "Rishikimi nga administratori",
    step2Sub: "Duke pritur...",
    step3Title: "Caktimi i shkollës",
    step3Sub: "Së shpejti",
    step4Title: "Bashkimi me klasën",
    step4Sub: "Së shpejti",
    note: "Kjo faqe do të shfaqet derisa të caktoheni në një shkollë. Nuk keni nevojë të bëni asgjë tani.",
  },
} as const;

export default function StudentWaitingPage() {
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [studentName, setStudentName] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/student")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.full_name) setStudentName(d.profile.full_name);
      });
    setTimeout(() => setVisible(true), 50);
  }, []);

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
        {/* Seal */}
        <div className="seal-wrap">
          <div className="seal-ring" />
          <div className="seal-ring2" />
          <div className="seal-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8A96A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <div className="card-text">
          <h1 className="card-title">{T.title(studentName)}</h1>
          <div className="gold-rule" />
          <p className="card-desc">{T.desc}</p>
        </div>

        <div className="steps-box">
          <div className="step">
            <div className="step-con">
              <div className="step-dot dot-done">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="step-line line-done" />
            </div>
            <div className="step-text">
              <div className="step-title">{T.step1Title}</div>
              <div className="step-sub sub-done">{T.step1Sub}</div>
            </div>
          </div>
          <div className="step">
            <div className="step-con">
              <div className="step-dot dot-active">
                <span className="dot-pulse" />
              </div>
              <div className="step-line" />
            </div>
            <div className="step-text">
              <div className="step-title">{T.step2Title}</div>
              <div className="step-sub sub-active">{T.step2Sub}</div>
            </div>
          </div>
          <div className="step">
            <div className="step-con">
              <div className="step-dot dot-empty" />
              <div className="step-line" />
            </div>
            <div className="step-text">
              <div className="step-title">{T.step3Title}</div>
              <div className="step-sub">{T.step3Sub}</div>
            </div>
          </div>
          <div className="step" style={{ paddingBottom: 0 }}>
            <div className="step-con">
              <div className="step-dot dot-empty" />
            </div>
            <div className="step-text">
              <div className="step-title">{T.step4Title}</div>
              <div className="step-sub">{T.step4Sub}</div>
            </div>
          </div>
        </div>

        <div className="note-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          {T.note}
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
          padding: 36px 30px; width: 100%; max-width: 500px;
          display: flex; flex-direction: column; align-items: center; gap: 24px;
          box-shadow: 0 4px 32px rgba(26,18,8,0.08);
        }
        .seal-wrap { position: relative; width: 88px; height: 88px; display: flex; align-items: center; justify-content: center; }
        .seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(200,169,106,0.35); animation: rp 2.4s ease infinite; }
        @keyframes rp { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.14);opacity:1} }
        .seal-ring2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px dashed rgba(200,169,106,0.25); animation: spin 8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .seal-inner { width: 66px; height: 66px; border-radius: 50%; background: var(--ink); display: flex; align-items: center; justify-content: center; }
        .card-text { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; width: 100%; }
        .card-title { font-size: 23px; font-weight: 800; color: var(--ink); }
        .gold-rule { width: 56px; height: 2px; background: var(--gold); border-radius: 99px; opacity: 0.5; }
        .card-desc { font-size: 13.5px; color: var(--muted); line-height: 1.8; max-width: 380px; }
        .steps-box { background: var(--gold-pale); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; width: 100%; }
        .step { display: flex; align-items: center; gap: 14px; padding: 9px 0; }
        .step-con { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .step-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .step-line { width: 2px; height: 18px; background: var(--border); margin: 0 auto; }
        .line-done { background: var(--gold); }
        .dot-done { background: var(--gold); color: var(--ink); }
        .dot-active { background: rgba(200,169,106,0.12); border: 2px solid var(--gold); }
        .dot-pulse { width: 11px; height: 11px; border-radius: 50%; background: var(--gold); animation: dp 1.6s ease infinite; }
        @keyframes dp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
        .dot-empty { background: var(--surface); border: 2px solid var(--border); }
        .step-text { flex: 1; }
        .step-title { font-size: 13.5px; font-weight: 700; color: var(--ink); }
        .step-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .sub-done { color: var(--gold-dark); }
        .sub-active { color: var(--gold-dark); }
        .note-bar {
          display: flex; align-items: center; gap: 9px; width: 100%;
          background: rgba(200,169,106,0.08); border: 1px solid rgba(200,169,106,0.25);
          color: var(--muted); font-size: 12.5px; padding: 11px 15px; border-radius: 10px;
        }
        .note-bar svg { flex-shrink: 0; color: var(--gold-dark); }
      `}</style>
    </div>
  );
}
