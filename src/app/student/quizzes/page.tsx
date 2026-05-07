"use client";

import { useEffect, useState, useRef } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

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
  const [result, setResult] = useState<{ score: number; total: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const visibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchQuizzes() {
    try {
      const data = await cachedFetch<{ quizzes: Quiz[] }>(
        "/api/student/quizzes",
        60_000,
      );
      setQuizzes(data.quizzes ?? []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
      visibleTimerRef.current = setTimeout(() => setVisible(true), 50);
    }
  }

  useEffect(() => {
    fetchQuizzes();
    return () => {
      if (visibleTimerRef.current) clearTimeout(visibleTimerRef.current);
    };
  }, []);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
  };
  const handleAnswer = (questionId: string, answer: string) =>
    setAnswers((p) => ({ ...p, [questionId]: answer }));

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    const unanswered = activeQuiz.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0)
      return alert(`${unanswered.length} ${tr.questionsRemaining}`);
    setSubmitting(true);
    const res = await fetch("/api/student/quizzes/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: activeQuiz.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return alert(data.error);
    setResult({ score: data.score, total: data.total });
    invalidateCache("/api/student/quizzes");
    fetchQuizzes();
  };

  const tfOptions = [
    { id: "t", text: tr.trueWord },
    { id: "f", text: tr.falseWord },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="qs-shell" dir={dir}>
        <div className="qs-loading">
          <div className="qs-spinner" />
          <span>جارٍ التحميل...</span>
        </div>
        <style>{styles}</style>
      </div>
    );

  // ── Result ────────────────────────────────────────────────────────────────
  if (result && activeQuiz) {
    const percent = Math.round((result.score / result.total) * 100);
    const passed = percent >= 50;
    const scoreColor = passed ? "#2D7A4F" : "#C0392B";
    const circumference = 251.2;
    const offset = circumference - (circumference * percent) / 100;

    return (
      <div className="qs-shell result-shell" dir={dir}>
        <div className="result-card">
          <div className="result-ring-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle
                cx="55"
                cy="55"
                r="44"
                fill="none"
                stroke="var(--border)"
                strokeWidth="8"
              />
              <circle
                cx="55"
                cy="55"
                r="44"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 55 55)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
              <text
                x="55"
                y="61"
                textAnchor="middle"
                fontSize="22"
                fontWeight="800"
                fill={scoreColor}
                fontFamily="Tajawal, sans-serif"
              >
                {percent}٪
              </text>
            </svg>
          </div>

          <div className="result-quiz-name">{activeQuiz.name}</div>
          <div className="result-score-text">
            {tr.answeredCorrectly} <strong>{result.score}</strong> {tr.outOf}{" "}
            <strong>{result.total}</strong> {tr.question}
          </div>

          <div
            className="result-verdict"
            style={{
              background: passed
                ? "rgba(45,122,79,0.08)"
                : "rgba(192,57,43,0.08)",
              borderColor: passed
                ? "rgba(45,122,79,0.25)"
                : "rgba(192,57,43,0.2)",
              color: scoreColor,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {passed ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              )}
            </svg>
            {passed ? tr.greatResult : tr.reviewAndRetry}
          </div>

          <button
            className="result-back-btn"
            onClick={() => {
              setActiveQuiz(null);
              setResult(null);
            }}
          >
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
            <div className="quiz-eyebrow">اختبار</div>
            <h1 className="quiz-title">{activeQuiz.name}</h1>
            <div className="quiz-progress-label">
              {answered} / {total} {tr.answeredOf}
            </div>
          </div>
          <button
            className="quiz-cancel-btn"
            onClick={() => setActiveQuiz(null)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {tr.cancel}
          </button>
        </div>

        {/* Progress */}
        <div className="quiz-prog-wrap">
          <div className="quiz-prog-track">
            <div
              className="quiz-prog-fill"
              style={{
                width: `${progress}%`,
                background: allDone ? "#2D7A4F" : "var(--gold-dark)",
              }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="questions-list">
          {activeQuiz.questions.map((q, qi) => {
            const isAnswered = !!answers[q.id];
            const opts =
              q.type === "TF"
                ? tfOptions
                : q.options.map((o) => ({ id: o.id, text: o.text }));
            return (
              <div
                key={q.id}
                className={`q-card ${isAnswered ? "q-card-done" : ""}`}
                style={{ animationDelay: `${qi * 55}ms` }}
              >
                <div className="q-card-top">
                  <span className="q-num">{qi + 1}</span>
                  <span className="q-type-tag">
                    {q.type === "TF" ? "صح / خطأ" : "اختيار متعدد"}
                  </span>
                </div>
                <p className="q-text">{q.text}</p>
                <div className="q-opts">
                  {opts.map((opt) => {
                    const selected = answers[q.id] === opt.text;
                    return (
                      <label
                        key={opt.id}
                        className={`q-opt-label ${selected ? "q-opt-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          className="q-radio-hidden"
                          name={q.id}
                          value={opt.text}
                          onChange={() => handleAnswer(q.id, opt.text)}
                        />
                        <span className="q-radio-ring">
                          {selected && <span className="q-radio-fill" />}
                        </span>
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
        <button
          className={`quiz-submit-btn ${allDone ? "quiz-submit-ready" : ""}`}
          onClick={handleSubmit}
          disabled={submitting || !allDone}
        >
          {submitting ? (
            <>
              <div className="btn-spin" />
              {tr.submitting}
            </>
          ) : !allDone ? (
            `${total - answered} ${tr.questionsRemaining}`
          ) : (
            <>{tr.submitQuiz} ✔</>
          )}
        </button>

        <style>{styles}</style>
      </div>
    );
  }

  // ── Quiz list ─────────────────────────────────────────────────────────────
  const doneCount = quizzes.filter((q) => q.attempts.length > 0).length;
  const overallPct =
    quizzes.length > 0 ? Math.round((doneCount / quizzes.length) * 100) : 0;

  return (
    <div
      className="qs-shell list-shell"
      dir={dir}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      {/* Header */}
      <div className="list-header">
        <div className="list-header-left">
          <div className="list-eyebrow">الاختبارات</div>
          <h1 className="list-title">{tr.quizzes}</h1>
          {quizzes.length > 0 && (
            <div className="list-subtitle">
              {doneCount} {tr.outOf} {quizzes.length} {tr.completed}
            </div>
          )}
        </div>
        {quizzes.length > 0 && (
          <div className="list-stat">
            <div className="list-stat-num">{overallPct}٪</div>
            <div className="list-stat-label">{tr.completed}</div>
          </div>
        )}
      </div>

      {/* Overall progress */}
      {quizzes.length > 0 && (
        <div className="overall-prog-wrap">
          <div className="overall-prog-info">
            <div className="overall-legend">
              <span className="legend-dot done-dot" />
              {tr.completed}
              <span
                className="legend-dot pending-dot"
                style={{ marginRight: 8 }}
              />
              {tr.notStarted}
            </div>
          </div>
          <div className="overall-prog-track">
            <div
              className="overall-prog-fill"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty */}
      {quizzes.length === 0 ? (
        <div className="empty-box">
          <div className="empty-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="empty-text">{tr.noQuizzesYet}</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz, i) => {
            const attempt = quiz.attempts[0];
            const done = !!attempt;
            const percent = done
              ? Math.round((attempt.score / attempt.total) * 100)
              : null;
            const passed = percent !== null && percent >= 50;
            const scoreColor = passed ? "#2D7A4F" : "#C0392B";

            return (
              <div
                key={quiz.id}
                className={`quiz-row ${done ? "quiz-row-done" : "quiz-row-pending"}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className="quiz-row-icon"
                  style={{
                    background: done
                      ? passed
                        ? "rgba(45,122,79,0.1)"
                        : "rgba(192,57,43,0.08)"
                      : "var(--gold-pale)",
                    border: `1px solid ${done ? (passed ? "rgba(45,122,79,0.25)" : "rgba(192,57,43,0.2)") : "var(--border)"}`,
                    color: done ? scoreColor : "var(--gold-dark)",
                  }}
                >
                  {done ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {passed ? (
                        <polyline points="20 6 9 17 4 12" />
                      ) : (
                        <>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </>
                      )}
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                </div>

                <div className="quiz-row-body">
                  <div className="quiz-row-name">{quiz.name}</div>
                  <div className="quiz-row-meta">
                    {quiz.questions.length} {tr.question}
                  </div>
                </div>

                {done ? (
                  <div className="quiz-row-score">
                    <div
                      className="quiz-score-pct"
                      style={{ color: scoreColor }}
                    >
                      {percent}٪
                    </div>
                    <div className="quiz-score-frac">
                      {attempt.score} / {attempt.total}
                    </div>
                  </div>
                ) : (
                  <button
                    className="quiz-start-btn"
                    onClick={() => startQuiz(quiz)}
                  >
                    {tr.startTest}
                    <svg
                      width="13"
                      height="13"
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
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #C8A96A; --gold-dark: #A8863E; --gold-light: #E8D09A; --gold-pale: #F5EDDA;
    --ink: #1A1208; --ink2: #3D2E10; --muted: #7A6540; --surface: #FEFCF7;
    --border: #E8D9B8; --white: #FFFFFF;
  }

  /* Shell */
  .qs-shell { min-height: 100vh; background: var(--gold-pale); font-family: 'Tajawal', sans-serif; padding: 28px 20px; }
  .list-shell, .quiz-shell { display: flex; flex-direction: column; gap: 18px; max-width: 680px; margin: 0 auto; }
  .result-shell { display: flex; align-items: center; justify-content: center; }

  /* Loading */
  .qs-loading { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 14px; padding: 80px 0; justify-content: center; }
  .qs-spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Result */
  .result-card {
    background: var(--white); border: 1px solid var(--border); border-radius: 22px;
    padding: 36px 30px; width: 100%; max-width: 420px;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    box-shadow: 0 8px 32px rgba(26,18,8,0.08);
    animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
  .result-ring-wrap { }
  .result-quiz-name { font-size: 18px; font-weight: 800; color: var(--ink); text-align: center; }
  .result-score-text { font-size: 13px; color: var(--muted); text-align: center; }
  .result-score-text strong { color: var(--ink); }
  .result-verdict {
    display: flex; align-items: center; gap: 8px; justify-content: center;
    width: 100%; padding: 11px 16px; border-radius: 11px; border: 1px solid;
    font-size: 13.5px; font-weight: 700;
  }
  .result-back-btn {
    width: 100%; padding: 12px; border-radius: 11px; border: 1.5px solid var(--border);
    background: var(--white); color: var(--ink2); font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.15s; font-family: 'Tajawal', sans-serif;
  }
  .result-back-btn:hover { border-color: var(--gold); background: var(--gold-pale); }

  /* Quiz list header */
  .list-header {
    background: var(--ink); border-radius: 18px; padding: 22px 24px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  .list-eyebrow { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 5px; }
  .list-title { font-size: 22px; font-weight: 800; color: var(--white); }
  .list-subtitle { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; }
  .list-stat { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
  .list-stat-num { font-size: 28px; font-weight: 800; color: var(--gold); line-height: 1; }
  .list-stat-label { font-size: 10.5px; color: rgba(255,255,255,0.4); margin-top: 2px; }

  /* Overall progress */
  .overall-prog-wrap { display: flex; flex-direction: column; gap: 8px; }
  .overall-prog-info { display: flex; justify-content: flex-end; }
  .overall-legend { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--muted); }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .done-dot { background: var(--gold); }
  .pending-dot { background: var(--border); }
  .overall-prog-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .overall-prog-fill { height: 100%; background: var(--gold); border-radius: 99px; transition: width 0.6s ease; }

  /* Empty */
  .empty-box {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 60px 28px; text-align: center;
    background: var(--white); border: 1px dashed var(--border); border-radius: 18px;
  }
  .empty-icon { color: var(--gold); }
  .empty-text { font-size: 13.5px; color: var(--muted); }

  /* Quiz rows */
  .quiz-grid { display: flex; flex-direction: column; gap: 10px; }
  .quiz-row {
    background: var(--white); border: 1px solid var(--border); border-radius: 14px;
    padding: 14px 16px; display: flex; align-items: center; gap: 14px;
    transition: all 0.18s; animation: fadeUp 0.3s ease both;
  }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  .quiz-row-pending:hover { border-color: var(--gold); box-shadow: 0 2px 12px rgba(26,18,8,0.06); }
  .quiz-row-icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .quiz-row-body { flex: 1; min-width: 0; }
  .quiz-row-name { font-size: 14px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quiz-row-meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .quiz-row-score { text-align: center; flex-shrink: 0; }
  .quiz-score-pct { font-size: 20px; font-weight: 800; line-height: 1; }
  .quiz-score-frac { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .quiz-start-btn {
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    background: var(--ink); color: var(--white); padding: 9px 16px; border-radius: 10px;
    border: none; font-size: 13px; font-weight: 700; cursor: pointer;
    transition: all 0.15s; font-family: 'Tajawal', sans-serif; white-space: nowrap;
  }
  .quiz-start-btn:hover { background: var(--gold); color: var(--ink); }

  /* Active quiz header */
  .quiz-header {
    background: var(--ink); border-radius: 18px; padding: 20px 24px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  .quiz-eyebrow { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 5px; }
  .quiz-title { font-size: 19px; font-weight: 800; color: var(--white); }
  .quiz-progress-label { font-size: 11.5px; color: rgba(255,255,255,0.4); margin-top: 5px; }
  .quiz-cancel-btn {
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 700;
    padding: 7px 13px; border-radius: 9px; cursor: pointer; transition: all 0.15s;
    font-family: 'Tajawal', sans-serif; margin-top: 4px;
  }
  .quiz-cancel-btn:hover { background: rgba(255,255,255,0.12); color: var(--white); }

  /* Quiz progress bar */
  .quiz-prog-wrap { }
  .quiz-prog-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .quiz-prog-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease, background 0.3s ease; }

  /* Question cards */
  .questions-list { display: flex; flex-direction: column; gap: 12px; }
  .q-card {
    background: var(--white); border: 1.5px solid var(--border); border-radius: 16px;
    padding: 18px 18px 16px; display: flex; flex-direction: column; gap: 14px;
    transition: border-color 0.2s; animation: fadeUp 0.3s ease both;
  }
  .q-card-done { border-color: var(--gold-dark); }
  .q-card-top { display: flex; align-items: center; gap: 10px; }
  .q-num {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    background: var(--gold-pale); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: var(--gold-dark);
  }
  .q-card-done .q-num { background: var(--gold); color: var(--ink); border-color: var(--gold-dark); }
  .q-type-tag {
    font-size: 10.5px; font-weight: 700; color: var(--gold-dark);
    background: rgba(168,134,62,0.1); border: 1px solid rgba(168,134,62,0.2);
    padding: 3px 10px; border-radius: 99px;
  }
  .q-text { font-size: 15px; font-weight: 700; color: var(--ink); line-height: 1.65; }
  .q-opts { display: flex; flex-direction: column; gap: 8px; }
  .q-opt-label {
    display: flex; align-items: center; gap: 11px; padding: 12px 14px;
    border-radius: 11px; border: 1.5px solid var(--border); cursor: pointer;
    background: var(--surface); transition: all 0.15s; user-select: none;
  }
  .q-opt-label:hover { border-color: var(--gold); background: var(--gold-pale); }
  .q-opt-selected { background: var(--ink) !important; border-color: var(--ink) !important; }
  .q-radio-hidden { display: none; }
  .q-radio-ring {
    width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border);
    flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: border-color 0.15s;
  }
  .q-opt-selected .q-radio-ring { border-color: rgba(255,255,255,0.5); }
  .q-radio-fill { width: 8px; height: 8px; border-radius: 50%; background: var(--white); }
  .q-opt-text { font-size: 14px; font-weight: 500; color: var(--ink2); }
  .q-opt-selected .q-opt-text { color: var(--white); font-weight: 700; }

  /* Submit */
  .quiz-submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    width: 100%; padding: 14px; border-radius: 12px; border: none;
    font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.18s;
    font-family: 'Tajawal', sans-serif;
    background: var(--border); color: var(--muted);
  }
  .quiz-submit-ready { background: var(--ink); color: var(--white); }
  .quiz-submit-ready:hover { background: var(--gold); color: var(--ink); }
  .quiz-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-spin { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: var(--white); border-radius: 50%; animation: spin 0.7s linear infinite; }
`;
