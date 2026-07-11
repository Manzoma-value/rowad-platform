"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    loading: "جارٍ تحميل الاختبار...",
    noAssessmentTitle: "لا يوجد اختبار تصنيف متاح حالياً",
    noAssessmentSub: "سيتم إخطارك عندما يكون الاختبار جاهزاً",
    label: "اختبار التصنيف",
    currentQuestion: "السؤال الحالي",
    answered: "مجاب",
    progress: "التقدم",
    questionOf: (cur: number, tot: number) => `السؤال ${cur} من ${tot}`,
    questionDot: (i: number) => `السؤال ${i + 1}`,
    mcq: "اختيار من متعدد",
    tf: "صح أم خطأ",
    written: "إجابة مكتوبة",
    tfTrue: "✔ صحيح",
    tfFalse: "✘ خطأ",
    writtenPH: "اكتب إجابتك هنا...",
    prev: "→ السابق",
    next: "التالي ←",
    submit: "تقديم الاختبار ✔",
    submitting: "جارٍ التقديم...",
    errUnanswered: (n: number) => `يوجد ${n} سؤال لم تجب عليه`,
    errGeneric: "حدث خطأ",
  },
  sq: {
    loading: "Duke ngarkuar testin...",
    noAssessmentTitle: "Nuk ka test vendosjeje të disponueshëm",
    noAssessmentSub: "Do të njoftoheni kur testi të jetë gati",
    label: "Testi i Vendosjes",
    currentQuestion: "Pyetja aktuale",
    answered: "i përgjigjet",
    progress: "Progresi",
    questionOf: (cur: number, tot: number) => `Pyetja ${cur} nga ${tot}`,
    questionDot: (i: number) => `Pyetja ${i + 1}`,
    mcq: "Zgjedhje e shumëfishtë",
    tf: "E vërtetë apo e gabuar",
    written: "Përgjigje me shkrim",
    tfTrue: "✔ E vërtetë",
    tfFalse: "✘ E gabuar",
    writtenPH: "Shkruani përgjigjen tuaj këtu...",
    prev: "← Mëparshëm",
    next: "Tjetër →",
    submit: "Dërgo testin ✔",
    submitting: "Duke dërguar...",
    errUnanswered: (n: number) => `Keni ${n} pyetje të papërgjigjura`,
    errGeneric: "Ndodhi një gabim",
  },
} as const;

interface Option {
  id: string;
  text: string;
  order: number;
}
interface Question {
  id: string;
  type: "MCQ" | "TF" | "WRITTEN";
  text: string;
  order: number;
  options: Option[];
}
interface Assessment {
  id: string;
  title: string;
  questions: Question[];
}
interface School {
  id: string;
  name: string;
  name_alt?: string | null;
}

export default function StudentPlacementPage() {
  const router = useRouter();
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAssessment, setNoAssessment] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/placement")
      .then((r) => r.json())
      .then((d) => {
        if (d.assessment) {
          setAssessment(d.assessment);
          setSchool(d.school ?? null);
        } else setNoAssessment(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const setAnswer = (qid: string, val: string) =>
    setAnswers((a) => ({ ...a, [qid]: val }));
  const questions = assessment?.questions ?? [];
  const current = questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const progress =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  async function handleSubmit() {
    if (!assessment) return;
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(T.errUnanswered(unanswered.length));
      setCurrentQ(questions.findIndex((q) => !answers[q.id]));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/student/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessment.id,
          answers: Object.entries(answers).map(([question_id, answer]) => ({
            question_id,
            answer,
          })),
        }),
      });
      const d = await r.json();
      if (d.success) router.push("/student/waiting-class");
      else setError(d.error ?? T.errGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <Shell dir={dir}>
        <Spinner label={T.loading} />
      </Shell>
    );

  if (noAssessment)
    return (
      <Shell dir={dir}>
        <div className="p-empty">
          <div className="p-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2>{T.noAssessmentTitle}</h2>
          <p>{T.noAssessmentSub}</p>
        </div>
        <style>{styles}</style>
      </Shell>
    );

  if (!assessment) return null;

  return (
    <Shell dir={dir}>
      <div className="p-wrap">
        {/* Header */}
        <div className="p-header">
          <div className="p-header-left">
            {school && (
              <div className="school-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                {lang !== "ar" && school.name_alt && school.name_alt.trim() ? school.name_alt : school.name}
              </div>
            )}
            <div className="p-label">{T.label}</div>
            <h1 className="p-title">{assessment.title}</h1>
          </div>
          <div className="p-header-right">
            <div className="q-counter">
              {currentQ + 1}
              <span className="q-counter-total">/{questions.length}</span>
            </div>
            <div className="q-counter-label">{T.currentQuestion}</div>
            <div className="answered-badge">{answeredCount} {T.answered}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="prog-section">
          <div className="prog-info">
            <span>{T.progress}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="prog-track">
            <div className="prog-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="q-dots">
            {questions.map((q, i) => (
              <button
                key={q.id}
                className={`q-dot ${i === currentQ ? "current" : ""} ${answers[q.id] ? "answered" : ""}`}
                onClick={() => setCurrentQ(i)}
                title={T.questionDot(i)}
              />
            ))}
          </div>
        </div>

        {/* Question card */}
        {current && (
          <div className="q-card" key={current.id}>
            <div className="q-card-top">
              <div className="q-type-pill">
                {current.type === "MCQ" ? T.mcq : current.type === "TF" ? T.tf : T.written}
              </div>
              <div className="q-num-label">
                {T.questionOf(currentQ + 1, questions.length)}
              </div>
            </div>
            <div className="q-card-body">
              <div className="q-text">{current.text}</div>

              {current.type === "MCQ" && (
                <div className="q-options">
                  {current.options.map((opt) => (
                    <button
                      key={opt.id}
                      className={`q-opt ${answers[current.id] === opt.text ? "selected" : ""}`}
                      onClick={() => setAnswer(current.id, opt.text)}
                    >
                      <span className="opt-radio">
                        {answers[current.id] === opt.text && (
                          <span className="opt-fill" />
                        )}
                      </span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}

              {current.type === "TF" && (
                <div className="tf-row">
                  {[
                    { val: "true", label: T.tfTrue },
                    { val: "false", label: T.tfFalse },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      className={`tf-btn ${answers[current.id] === opt.val ? `sel-${opt.val}` : ""}`}
                      onClick={() => setAnswer(current.id, opt.val)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {current.type === "WRITTEN" && (
                <textarea
                  className="written-inp"
                  placeholder={T.writtenPH}
                  value={answers[current.id] ?? ""}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  rows={5}
                  dir={dir}
                />
              )}
            </div>
          </div>
        )}

        <div className="nav-row">
          <button
            className="nav-btn nav-prev"
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
          >
            {T.prev}
          </button>
          {currentQ < questions.length - 1 ? (
            <button className="nav-btn nav-next" onClick={() => setCurrentQ((q) => q + 1)}>
              {T.next}
            </button>
          ) : (
            <button
              className={`nav-btn nav-submit ${allAnswered ? "ready" : ""}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? T.submitting : T.submit}
            </button>
          )}
        </div>

        {error && <div className="p-error">{error}</div>}
      </div>
      <style>{styles}</style>
    </Shell>
  );
}

function Shell({ children, dir = "rtl" }: { children: React.ReactNode; dir?: string }) {
  return (
    <div className="p-shell" dir={dir}>
      {children}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --gold: #B8A082; --gold-dark: #8F765B; --gold-light: #E8D09A; --gold-pale: #F5EDDA;
          --ink: #4A0E1C; --ink2: #4A0E1C; --muted: #796A62; --surface: #FEFCF7;
          --border: #E8D9B8; --success: #2D7A4F; --danger: #6B1E2D;
        }
        .p-shell {
          min-height: 100vh; background: var(--gold-pale);
          font-family: 'Cairo', sans-serif;
          display: flex; align-items: flex-start; justify-content: center; padding: 32px 16px;
        }
      `}</style>
    </div>
  );
}

function Spinner({ label = "..." }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#796A62", fontSize: 14, padding: "80px 0" }}>
      <div style={{ width: 20, height: 20, border: "2px solid #E8D9B8", borderTopColor: "#B8A082", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = `
  .p-wrap { width: 100%; max-width: 680px; display: flex; flex-direction: column; gap: 18px; }

  .p-header {
    background: var(--ink); border-radius: 18px; padding: 22px 26px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  .p-header-left {}
  .school-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(184,160,130,0.18); border: 1px solid rgba(184,160,130,0.35);
    color: var(--gold-light); font-size: 11.5px; font-weight: 700;
    padding: 4px 12px; border-radius: 99px; margin-bottom: 10px;
  }
  .p-label { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 5px; }
  .p-title { font-size: 20px; font-weight: 800; color: #fff; }
  .p-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
  .q-counter { font-size: 30px; font-weight: 800; color: var(--gold); line-height: 1; }
  .q-counter-total { font-size: 16px; color: rgba(184,160,130,0.5); }
  .q-counter-label { font-size: 10.5px; color: rgba(255,255,255,0.45); }
  .answered-badge { font-size: 11.5px; color: var(--gold-light); background: rgba(184,160,130,0.15); border-radius: 99px; padding: 3px 10px; }

  .prog-section { background: rgba(184,160,130,0.1); border: 1px solid var(--border); border-radius: 14px; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
  .prog-info { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); font-weight: 600; }
  .prog-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .prog-fill { height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); border-radius: 99px; transition: width 0.4s ease; }
  .q-dots { display: flex; flex-wrap: wrap; gap: 5px; }
  .q-dot { width: 32px; height: 7px; border-radius: 99px; background: var(--border); border: none; cursor: pointer; transition: all 0.18s; }
  .q-dot.answered { background: var(--gold); }
  .q-dot.current { background: var(--ink); transform: scaleY(1.4); }

  .q-card { background: #fff; border: 1px solid var(--border); border-radius: 18px; overflow: hidden; box-shadow: 0 2px 16px rgba(26,18,8,0.06); animation: fadeUp 0.22s ease both; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
  .q-card-top { background: var(--gold-pale); border-bottom: 1px solid var(--border); padding: 13px 22px; display: flex; align-items: center; justify-content: space-between; }
  .q-type-pill { font-size: 10.5px; font-weight: 700; color: var(--gold-dark); background: rgba(168,134,62,0.12); border: 1px solid rgba(168,134,62,0.25); padding: 4px 12px; border-radius: 99px; }
  .q-num-label { font-size: 11px; color: var(--muted); font-weight: 600; }
  .q-card-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
  .q-text { font-size: 17px; font-weight: 700; color: var(--ink); line-height: 1.65; }

  .q-options { display: flex; flex-direction: column; gap: 9px; }
  .q-opt {
    display: flex; align-items: center; gap: 12px; padding: 13px 15px;
    border-radius: 11px; background: var(--surface); border: 1.5px solid var(--border);
    color: var(--ink2); font-size: 14.5px; font-weight: 500; cursor: pointer;
    text-align: right; transition: all 0.15s; font-family: 'Cairo', sans-serif; width: 100%;
  }
  .q-opt:hover { border-color: var(--gold); background: var(--gold-pale); }
  .q-opt.selected { border-color: var(--gold-dark); background: rgba(184,160,130,0.1); color: var(--ink); font-weight: 700; }
  .opt-radio { width: 19px; height: 19px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: border-color 0.15s; }
  .q-opt.selected .opt-radio { border-color: var(--gold-dark); }
  .opt-fill { width: 9px; height: 9px; border-radius: 50%; background: var(--gold-dark); }

  .tf-row { display: flex; gap: 10px; }
  .tf-btn {
    flex: 1; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 700;
    cursor: pointer; border: 1.5px solid var(--border); background: var(--surface);
    transition: all 0.15s; font-family: 'Tajawal', sans-serif; color: var(--ink2);
  }
  .tf-btn:hover { border-color: var(--gold); }
  .tf-btn.sel-true { background: rgba(45,122,79,0.08); border-color: #2D7A4F; color: #1A4D30; }
  .tf-btn.sel-false { background: rgba(192,57,43,0.08); border-color: #6B1E2D; color: #7B1A12; }

  .written-inp {
    width: 100%; padding: 13px 15px; background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 11px; color: var(--ink); font-size: 14px; font-family: 'Tajawal', sans-serif;
    line-height: 1.7; resize: vertical; outline: none; transition: border-color 0.15s;
  }
  .written-inp:focus { border-color: var(--gold-dark); background: #fff; }

  .nav-row { display: flex; justify-content: space-between; gap: 10px; }
  .nav-btn { padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; font-family: 'Tajawal', sans-serif; }
  .nav-prev { background: #fff; color: var(--ink2); border: 1.5px solid var(--border); }
  .nav-prev:hover:not(:disabled) { border-color: var(--gold); }
  .nav-prev:disabled { opacity: 0.35; cursor: not-allowed; }
  .nav-next { background: var(--ink); color: #fff; }
  .nav-next:hover { background: var(--ink2); }
  .nav-submit { background: var(--border); color: var(--muted); }
  .nav-submit.ready { background: var(--gold); color: var(--ink); font-weight: 800; }
  .nav-submit.ready:hover { background: var(--gold-dark); color: #fff; }
  .nav-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .p-error { background: rgba(192,57,43,0.07); border: 1px solid rgba(192,57,43,0.2); color: var(--danger); font-size: 13px; padding: 10px 14px; border-radius: 10px; text-align: center; }

  .p-empty {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 70px 28px; text-align: center; background: #fff;
    border-radius: 18px; border: 1px solid var(--border); max-width: 480px;
  }
  .p-empty-icon { color: var(--gold); }
  .p-empty h2 { font-size: 17px; font-weight: 800; color: var(--ink); }
  .p-empty p { font-size: 13px; color: var(--muted); }

  /* ─── Mobile ─── */
  @media (max-width: 600px) {
    .p-empty { padding: 48px 22px; border-radius: 16px; }
    .p-empty h2 { font-size: 16px; }
  }
`;
