"use client";

import { useEffect, useState, useRef } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import StudentConceptBanner from "@/components/StudentConceptBanner";

type Option = { id: string; text: string; order: number };
type Question = {
  id: string;
  type: "MCQ" | "TF";
  text: string;
  order: number;
  options: Option[];
};
type Attempt = { score: number; total: number };
type Quiz = {
  id: string;
  name: string;
  questions: Question[];
  attempts: Attempt[];
};

export default function StudentQuizzesPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchQuizzes() {
    try {
      const data = await cachedFetch<{ quizzes: Quiz[] }>("/api/student/quizzes", 60_000);
      setQuizzes(data.quizzes ?? []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
      timerRef.current = setTimeout(() => setVisible(true), 50);
    }
  }

  useEffect(() => {
    fetchQuizzes();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const startQuiz = (quiz: Quiz) => { setActiveQuiz(quiz); setAnswers({}); setResult(null); };
  const handleAnswer = (qId: string, val: string) => setAnswers((p) => ({ ...p, [qId]: val }));

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    const unanswered = activeQuiz.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) return alert(`${unanswered.length} ${tr.questionsRemaining}`);
    setSubmitting(true);
    const res = await fetch("/api/student/quizzes/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: activeQuiz.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return alert(data.error);
    setResult({ score: data.score, total: data.total });
    invalidateCache("/api/student/quizzes");
    fetchQuizzes();
  };

  const tfOptions = [{ id: "t", text: tr.trueWord }, { id: "f", text: tr.falseWord }];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="qs-shell" dir={dir}>
        <div className="qs-loading">
          <div className="qs-spinner" />
          <span>{lang === "ar" ? "جارٍ التحميل..." : "Duke ngarkuar..."}</span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (result && activeQuiz) {
    const pct = Math.round((result.score / result.total) * 100);
    const passed = pct >= 50;
    const ringColor = passed ? "#1B5E20" : "#B8A082";
    const circ = 251.2;
    const offset = circ - (circ * pct) / 100;

    return (
      <div className="qs-shell result-shell" dir={dir}>
        <div className="result-card">
          <svg width="110" height="110" viewBox="0 0 110 110" className="result-ring">
            <circle cx="55" cy="55" r="40" fill="none" stroke="rgba(184,160,130,0.12)" strokeWidth="8"/>
            <circle cx="55" cy="55" r="40" fill="none" stroke={ringColor} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset 1s ease" }}/>
            <text x="55" y="62" textAnchor="middle" fontSize="21" fontWeight="800"
              fill={ringColor} fontFamily="Cairo,Tajawal,sans-serif">{pct}٪</text>
          </svg>

          <div className="result-quiz-name">{activeQuiz.name}</div>
          <p className="result-score-text">
            {tr.answeredCorrectly} <strong>{result.score}</strong> {tr.outOf} <strong>{result.total}</strong> {tr.question}
          </p>

          <div className="result-verdict" style={{ background: passed ? "rgba(45,138,74,0.08)" : "rgba(184,160,130,0.1)", borderColor: passed ? "rgba(45,138,74,0.25)" : "rgba(184,160,130,0.25)", color: passed ? "#1B5E20" : "#8F765B" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {passed ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
            </svg>
            {passed ? tr.greatResult : tr.reviewAndRetry}
          </div>

          <button className="result-back" onClick={() => { setActiveQuiz(null); setResult(null); }}>
            {tr.backToQuizzes}
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ── Active quiz ───────────────────────────────────────────────────────────
  if (activeQuiz) {
    const answered = Object.keys(answers).length;
    const total = activeQuiz.questions.length;
    const progress = (answered / total) * 100;
    const allDone = answered === total;

    return (
      <div className="qs-shell quiz-shell" dir={dir}>
        {/* Header */}
        <div className="quiz-header">
          <div className="quiz-header-left">
            <p className="quiz-eyebrow">{lang === "ar" ? "اختبار" : "Test"}</p>
            <h1 className="quiz-title">{activeQuiz.name}</h1>
            <p className="quiz-progress-label">{answered} / {total} {tr.answeredOf}</p>
          </div>
          <button className="quiz-cancel" onClick={() => setActiveQuiz(null)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            {tr.cancel}
          </button>
        </div>

        {/* Progress bar */}
        <div className="quiz-prog-track">
          <div className="quiz-prog-fill" style={{ width: `${progress}%`, background: allDone ? "#1B5E20" : "#B8A082" }}/>
        </div>

        {/* Questions */}
        <div className="q-list">
          {activeQuiz.questions.map((q, qi) => {
            const isAnswered = !!answers[q.id];
            const opts = q.type === "TF" ? tfOptions : q.options.map((o) => ({ id: o.id, text: o.text }));
            return (
              <div key={q.id} className={`q-card ${isAnswered ? "done" : ""}`} style={{ animationDelay: `${qi * 50}ms` }}>
                <div className="q-top">
                  <span className="q-num">{qi + 1}</span>
                  <span className="q-type">{q.type === "TF" ? (lang === "ar" ? "صح / خطأ" : "V / F") : (lang === "ar" ? "اختيار متعدد" : "Shumë zgjedhje")}</span>
                </div>
                <p className="q-text">{q.text}</p>
                <div className="q-opts">
                  {opts.map((opt) => {
                    const sel = answers[q.id] === opt.text;
                    return (
                      <label key={opt.id} className={`q-opt ${sel ? "selected" : ""}`}>
                        <input type="radio" className="q-radio-hidden" name={q.id} value={opt.text} onChange={() => handleAnswer(q.id, opt.text)}/>
                        <span className="q-ring">{sel && <span className="q-ring-fill"/>}</span>
                        <span className="q-opt-text">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <button className={`quiz-submit ${allDone ? "ready" : ""}`} onClick={handleSubmit} disabled={submitting || !allDone}>
          {submitting ? (
            <><div className="btn-spin"/> {tr.submitting}</>
          ) : !allDone ? (
            `${total - answered} ${tr.questionsRemaining}`
          ) : (
            <>{tr.submitQuiz} ✓</>
          )}
        </button>

        <style>{styles}</style>
      </div>
    );
  }

  // ── Quiz list ─────────────────────────────────────────────────────────────
  const doneCount = quizzes.filter((q) => q.attempts.length > 0).length;
  const overallPct = quizzes.length > 0 ? Math.round((doneCount / quizzes.length) * 100) : 0;

  return (
    <div className="qs-shell list-shell" dir={dir} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.4s ease, transform 0.4s ease" }}>
      <StudentConceptBanner />

      {/* Header */}
      <div className="list-header">
        <div>
          <p className="list-eyebrow">{lang === "ar" ? "الاختبارات" : "Testet"}</p>
          <h1 className="list-title">{tr.quizzes}</h1>
          {quizzes.length > 0 && <p className="list-sub">{doneCount} {tr.outOf} {quizzes.length} {tr.completed}</p>}
        </div>
        {quizzes.length > 0 && (
          <div className="list-stat">
            <span className="list-stat-num">{overallPct}٪</span>
            <span className="list-stat-label">{tr.completed}</span>
          </div>
        )}
      </div>

      {/* Overall progress */}
      {quizzes.length > 0 && (
        <div className="overall-wrap">
          <div className="overall-legend">
            <span className="leg-dot gold"/>{tr.completed}
            <span className="leg-dot muted" style={{ marginRight: 8 }}/>{tr.notStarted}
          </div>
          <div className="overall-track">
            <div className="overall-fill" style={{ width: `${overallPct}%` }}/>
          </div>
        </div>
      )}

      {/* Empty */}
      {quizzes.length === 0 ? (
        <div className="qs-empty">
          <div className="qs-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p>{tr.noQuizzesYet}</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz, i) => {
            const attempt = quiz.attempts[0];
            const done = !!attempt;
            const pct = done ? Math.round((attempt.score / attempt.total) * 100) : null;
            const passed = pct !== null && pct >= 50;
            const scoreColor = passed ? "#1B5E20" : "#B85C38";

            return (
              <div key={quiz.id} className={`quiz-row ${done ? "quiz-done" : "quiz-pending"}`} style={{ animationDelay: `${i * 48}ms` }}>
                <div className="quiz-row-icon" style={{
                  background: done ? (passed ? "rgba(45,138,74,0.09)" : "rgba(184,92,56,0.08)") : "rgba(184,160,130,0.1)",
                  border: `1px solid ${done ? (passed ? "rgba(45,138,74,0.22)" : "rgba(184,92,56,0.2)") : "rgba(184,160,130,0.2)"}`,
                  color: done ? scoreColor : "#8F765B",
                }}>
                  {done ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      {passed ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  )}
                </div>

                <div className="quiz-row-body">
                  <div className="quiz-row-name">{quiz.name}</div>
                  <div className="quiz-row-meta">{quiz.questions.length} {tr.question}</div>
                </div>

                {done ? (
                  <div className="quiz-score">
                    <div className="quiz-score-pct" style={{ color: scoreColor }}>{pct}٪</div>
                    <div className="quiz-score-frac">{attempt.score} / {attempt.total}</div>
                  </div>
                ) : (
                  <button className="quiz-start" onClick={() => startQuiz(quiz)}>
                    {tr.startTest}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes popIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}

  .qs-shell{min-height:100%;background:#EFEAE0;font-family:'Cairo',Tajawal,sans-serif;padding:28px 20px}
  .list-shell,.quiz-shell{display:flex;flex-direction:column;gap:16px;max-width:680px;margin:0 auto}
  .result-shell{display:flex;align-items:center;justify-content:center}

  /* Loading */
  .qs-loading{display:flex;align-items:center;gap:12px;color:#796A62;font-size:14px;padding:80px;justify-content:center}
  .qs-spinner{width:20px;height:20px;border:2px solid rgba(184,160,130,0.2);border-top-color:#B8A082;border-radius:50%;animation:spin 0.7s linear infinite}

  /* Result */
  .result-card{
    background:#FFFBF5;border:1px solid rgba(184,160,130,0.18);border-radius:24px;
    padding:38px 32px;width:100%;max-width:420px;
    display:flex;flex-direction:column;align-items:center;gap:16px;
    box-shadow:0 12px 40px rgba(26,26,26,0.09);
    animation:popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  .result-ring{overflow:visible}
  .result-quiz-name{font-size:18px;font-weight:800;color:#1A1A1A;text-align:center}
  .result-score-text{font-size:13px;color:#796A62;text-align:center}
  .result-score-text strong{color:#1A1A1A}
  .result-verdict{display:flex;align-items:center;gap:8px;justify-content:center;width:100%;padding:11px 16px;border-radius:12px;border:1px solid;font-size:13.5px;font-weight:700}
  .result-back{width:100%;padding:13px;border-radius:12px;border:1.5px solid rgba(184,160,130,0.2);background:#FFFBF5;color:#4A0E1C;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .result-back:hover{border-color:rgba(184,160,130,0.4);background:rgba(184,160,130,0.06)}

  /* List header */
  .list-header{background:#1A1A1A;border-radius:20px;padding:22px 26px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;overflow:hidden;border:1px solid rgba(184,160,130,0.1)}
  .list-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#B8A082 30%,#B8A082 60%,transparent)}
  .list-eyebrow{font-size:10px;font-weight:700;color:rgba(184,160,130,0.5);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px}
  .list-title{font-size:22px;font-weight:900;color:#FFFFFF}
  .list-sub{font-size:12px;color:rgba(255,255,255,0.38);margin-top:4px}
  .list-stat{display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0}
  .list-stat-num{font-size:30px;font-weight:900;color:#B8A082;line-height:1}
  .list-stat-label{font-size:10.5px;color:rgba(255,255,255,0.38);margin-top:2px}

  /* Overall progress */
  .overall-wrap{display:flex;flex-direction:column;gap:8px}
  .overall-legend{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#796A62}
  .leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block}
  .leg-dot.gold{background:#B8A082}
  .leg-dot.muted{background:rgba(184,160,130,0.2)}
  .overall-track{height:5px;background:rgba(184,160,130,0.15);border-radius:99px;overflow:hidden}
  .overall-fill{height:100%;background:linear-gradient(90deg,#B8A082,#B8A082);border-radius:99px;transition:width 0.6s ease}

  /* Empty */
  .qs-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 28px;text-align:center;background:#FFFBF5;border:1px dashed rgba(184,160,130,0.2);border-radius:18px}
  .qs-empty-icon{color:rgba(184,160,130,0.4)}
  .qs-empty p{font-size:13.5px;color:#796A62}

  /* Quiz rows */
  .quiz-grid{display:flex;flex-direction:column;gap:10px}
  .quiz-row{background:#FFFBF5;border:1px solid rgba(184,160,130,0.14);border-radius:15px;padding:14px 16px;display:flex;align-items:center;gap:13px;transition:all 0.18s;animation:fadeUp 0.3s ease both}
  .quiz-pending:hover{border-color:rgba(184,160,130,0.35);box-shadow:0 4px 16px rgba(26,26,26,0.06)}
  .quiz-row-icon{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .quiz-row-body{flex:1;min-width:0}
  .quiz-row-name{font-size:14px;font-weight:700;color:#1A1A1A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .quiz-row-meta{font-size:11.5px;color:#796A62;margin-top:2px}
  .quiz-score{text-align:center;flex-shrink:0}
  .quiz-score-pct{font-size:20px;font-weight:800;line-height:1}
  .quiz-score-frac{font-size:11px;color:#796A62;margin-top:2px}
  .quiz-start{display:flex;align-items:center;gap:6px;flex-shrink:0;background:#1A1A1A;color:#FFFFFF;padding:9px 16px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;white-space:nowrap}
  .quiz-start:hover{background:#B8A082;color:#1A1A1A}

  /* Active quiz header */
  .quiz-header{background:#1A1A1A;border-radius:20px;padding:20px 26px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;overflow:hidden;border:1px solid rgba(184,160,130,0.1)}
  .quiz-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#B8A082 30%,#B8A082 60%,transparent)}
  .quiz-eyebrow{font-size:10px;font-weight:700;color:rgba(184,160,130,0.5);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px}
  .quiz-title{font-size:19px;font-weight:800;color:#FFFFFF}
  .quiz-progress-label{font-size:11.5px;color:rgba(255,255,255,0.38);margin-top:4px}
  .quiz-cancel{display:flex;align-items:center;gap:6px;flex-shrink:0;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.55);font-size:12px;font-weight:700;padding:7px 13px;border-radius:9px;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;margin-top:3px}
  .quiz-cancel:hover{background:rgba(255,255,255,0.12);color:#FFFFFF}

  /* Progress bar */
  .quiz-prog-track{height:5px;background:rgba(184,160,130,0.15);border-radius:99px;overflow:hidden}
  .quiz-prog-fill{height:100%;border-radius:99px;transition:width 0.4s ease,background 0.3s ease}

  /* Question cards */
  .q-list{display:flex;flex-direction:column;gap:12px}
  .q-card{background:#FFFBF5;border:1.5px solid rgba(184,160,130,0.14);border-radius:17px;padding:18px;display:flex;flex-direction:column;gap:14px;transition:border-color 0.2s;animation:fadeUp 0.3s ease both}
  .q-card.done{border-color:rgba(184,160,130,0.35)}
  .q-top{display:flex;align-items:center;gap:10px}
  .q-num{width:26px;height:26px;border-radius:50%;flex-shrink:0;background:rgba(184,160,130,0.1);border:1px solid rgba(184,160,130,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#8F765B}
  .q-card.done .q-num{background:#B8A082;color:#1A1A1A;border-color:#8F765B}
  .q-type{font-size:10.5px;font-weight:700;color:#8F765B;background:rgba(184,160,130,0.1);border:1px solid rgba(184,160,130,0.2);padding:3px 10px;border-radius:99px}
  .q-text{font-size:15px;font-weight:700;color:#1A1A1A;line-height:1.65}
  .q-opts{display:flex;flex-direction:column;gap:8px}
  .q-opt{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:11px;border:1.5px solid rgba(184,160,130,0.14);cursor:pointer;background:#FEFCF8;transition:all 0.15s;user-select:none}
  .q-opt:hover{border-color:rgba(184,160,130,0.3);background:rgba(184,160,130,0.05)}
  .q-opt.selected{background:#1A1A1A;border-color:#1A1A1A}
  .q-radio-hidden{display:none}
  .q-ring{width:18px;height:18px;border-radius:50%;border:2px solid rgba(184,160,130,0.25);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color 0.15s}
  .q-opt.selected .q-ring{border-color:rgba(255,255,255,0.4)}
  .q-ring-fill{width:8px;height:8px;border-radius:50%;background:#FFFFFF}
  .q-opt-text{font-size:14px;font-weight:500;color:#4A0E1C}
  .q-opt.selected .q-opt-text{color:#FFFFFF;font-weight:700}

  /* Submit */
  .quiz-submit{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:14px;border-radius:13px;border:none;font-size:15px;font-weight:800;cursor:pointer;transition:all 0.18s;font-family:'Cairo',Tajawal,sans-serif;background:rgba(184,160,130,0.15);color:#796A62}
  .quiz-submit.ready{background:#1A1A1A;color:#FFFFFF}
  .quiz-submit.ready:hover{background:#B8A082;color:#1A1A1A}
  .quiz-submit:disabled{opacity:0.5;cursor:not-allowed}
  .btn-spin{width:15px;height:15px;border:2px solid rgba(255,255,255,0.25);border-top-color:#FFFFFF;border-radius:50%;animation:spin 0.7s linear infinite}

  /* ── Mobile ── */
  @media(max-width:600px){
    .qs-shell{padding:18px 14px}
    .list-shell,.quiz-shell{gap:13px}
    .list-header,.quiz-header{padding:18px 18px}
    .list-title{font-size:19px}
    .list-stat-num{font-size:25px}
    .quiz-title{font-size:17px}
    .q-card{padding:15px;border-radius:14px}
    .q-text{font-size:14.5px}
    .q-opt{padding:13px 13px}
    .q-opt-text{font-size:14px}
    .quiz-row{padding:12px 13px;gap:11px}
    .quiz-row-icon{width:40px;height:40px}
    .quiz-score-pct{font-size:18px}
    .result-card{padding:30px 22px;border-radius:20px}
    /* tap targets ≥44px high */
    .quiz-start{padding:11px 15px}
    .quiz-submit{padding:15px}
    .result-back{padding:14px}
  }
  @media(max-width:380px){
    .qs-shell{padding:14px 11px}
    .list-header,.quiz-header{padding:15px 14px;border-radius:16px}
    .list-title{font-size:17px}
    .list-eyebrow,.quiz-eyebrow{letter-spacing:1.5px}
    .quiz-cancel{padding:7px 10px}
    .quiz-row-name{font-size:13.5px}
    .q-card{padding:13px}
  }
`;
