"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

type Option = { id: string; text: string; order: number };
type Question = {
  id: string;
  type: "MCQ" | "TF";
  text: string;
  correct_answer: string;
  order: number;
  options: Option[];
};
type Attempt = {
  id: string;
  score: number;
  total: number;
  student: { profile: { full_name: string } };
};
type Quiz = {
  id: string;
  name: string;
  class: { id: string; name: string };
  questions: Question[];
  attempts: Attempt[];
};
type ClassItem = { id: string; name: string };
type NewQuestion = {
  type: "MCQ" | "TF";
  text: string;
  options: string[];
  correct_answer: string;
};

export default function TeacherQuizzesPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quizName, setQuizName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [questions, setQuestions] = useState<NewQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const [qRes, tRes] = await Promise.all([
      fetch("/api/teacher/quizzes"),
      fetch("/api/teacher"),
    ]);
    setQuizzes(await qRes.json());
    const tData = await tRes.json();
    setClasses(tData.classes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TF option labels are language-aware
  const tfLabels = [tr.trueWord, tr.falseWord];

  const addQuestion = (type: "MCQ" | "TF") =>
    setQuestions((p) => [
      ...p,
      {
        type,
        text: "",
        options: type === "MCQ" ? ["", "", "", ""] : tfLabels,
        correct_answer: "",
      },
    ]);

  const updateQ = (i: number, field: string, val: string) =>
    setQuestions((p) =>
      p.map((q, idx) => (idx === i ? { ...q, [field]: val } : q)),
    );

  const updateOpt = (qi: number, oi: number, val: string) =>
    setQuestions((p) =>
      p.map((q, i) => {
        if (i !== qi) return q;
        const opts = [...q.options];
        opts[oi] = val;
        return { ...q, options: opts };
      }),
    );

  async function handleSubmit() {
    setFormError("");
    if (!quizName.trim()) {
      setFormError(tr.enterQuizName);
      return;
    }
    if (!selectedClass) {
      setFormError(tr.chooseClassPrompt);
      return;
    }
    if (questions.length === 0) {
      setFormError(tr.addAtLeastOne);
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        setFormError(tr.fillAllQuestions);
        return;
      }
      if (!q.correct_answer) {
        setFormError(tr.chooseCorrectForAll);
        return;
      }
      if (q.type === "MCQ" && q.options.filter((o) => o.trim()).length < 2) {
        setFormError(tr.addTwoOptions);
        return;
      }
    }
    setSubmitting(true);
    const res = await fetch("/api/teacher/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: quizName,
        classId: selectedClass,
        questions: questions.map((q) => ({
          ...q,
          options:
            q.type === "MCQ" ? q.options.filter((o) => o.trim()) : undefined,
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const e = await res.json();
      setFormError(e.error ?? tr.saveQuiz);
      return;
    }
    setQuizName("");
    setSelectedClass("");
    setQuestions([]);
    setCreating(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(tr.deleteQuizConfirm)) return;
    setDeletingId(id);
    await fetch(`/api/teacher/quizzes/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  if (loading) return <MandalaLoader label={tr.loading} />;

  return (
    <div className="tq-shell" dir={dir}>
      <div className="tq-header">
        <div>
          <h1 className="tq-title">{tr.quizzes}</h1>
          <p className="tq-sub">
            {quizzes.length} {tr.attempt} ·{" "}
            {quizzes.reduce((a, q) => a + q.attempts.length, 0)} {tr.attempt}
          </p>
        </div>
        {!creating && (
          <button className="tq-btn primary" onClick={() => setCreating(true)}>
            + {tr.newQuiz}
          </button>
        )}
      </div>

      {creating && (
        <div className="tq-form">
          <div className="tq-form-header">
            <h2 className="tq-form-title">{tr.createNewQuiz}</h2>
            <button
              className="tq-ghost-btn"
              onClick={() => {
                setCreating(false);
                setFormError("");
              }}
            >
              {tr.cancel}
            </button>
          </div>
          <div className="tq-form-row">
            <div className="tq-field">
              <label className="tq-label">{tr.quizName}</label>
              <input
                className="tq-input"
                placeholder={tr.quizNamePlaceholder}
                value={quizName}
                onChange={(e) => setQuizName(e.target.value)}
                dir={dir}
              />
            </div>
            <div className="tq-field">
              <label className="tq-label">{tr.selectClass}</label>
              <select
                className="tq-input"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                dir={dir}
              >
                <option value="">{tr.chooseClassPrompt}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tq-questions">
            {questions.map((q, qi) => (
              <div key={qi} className="tq-q-card">
                <div className="tq-q-header">
                  <div className="tq-q-num">
                    {tr.question}
                    {qi + 1}
                  </div>
                  <span className="tq-q-type-badge">
                    {q.type === "MCQ" ? tr.mcqType : tr.tfType}
                  </span>
                  <button
                    className="tq-del-q-btn"
                    onClick={() =>
                      setQuestions((p) => p.filter((_, i) => i !== qi))
                    }
                  >
                    ✕
                  </button>
                </div>
                <input
                  className="tq-input"
                  placeholder={tr.questionText}
                  value={q.text}
                  onChange={(e) => updateQ(qi, "text", e.target.value)}
                  dir={dir}
                />
                {q.type === "MCQ" ? (
                  <div className="tq-opts">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="tq-opt-row">
                        <button
                          className={`tq-radio ${
                            q.correct_answer === opt && opt.trim()
                              ? "selected"
                              : ""
                          }`}
                          type="button"
                          onClick={() =>
                            opt.trim() && updateQ(qi, "correct_answer", opt)
                          }
                        >
                          {q.correct_answer === opt && opt.trim() && "✓"}
                        </button>
                        <input
                          className="tq-input opt-inp"
                          placeholder={`${tr.optionNumber} ${oi + 1}`}
                          value={opt}
                          onChange={(e) => {
                            if (q.correct_answer === opt)
                              updateQ(qi, "correct_answer", e.target.value);
                            updateOpt(qi, oi, e.target.value);
                          }}
                          dir={dir}
                        />
                      </div>
                    ))}
                    <div className="tq-opt-hint">{tr.clickCircleHint}</div>
                  </div>
                ) : (
                  <div className="tq-tf-row">
                    {tfLabels.map((opt, idx) => (
                      <button
                        key={opt}
                        className={`tq-tf-btn ${
                          q.correct_answer === opt ? "selected" : ""
                        } ${idx === 0 ? "true" : "false"}`}
                        onClick={() => updateQ(qi, "correct_answer", opt)}
                        type="button"
                      >
                        {idx === 0 ? `✓ ${tr.trueWord}` : `✗ ${tr.falseWord}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="tq-add-q-row">
            <button className="tq-add-q-btn" onClick={() => addQuestion("MCQ")}>
              {tr.addMcq}
            </button>
            <button className="tq-add-q-btn" onClick={() => addQuestion("TF")}>
              {tr.addTf}
            </button>
          </div>

          {formError && <div className="tq-error">{formError}</div>}

          <button
            className="tq-btn primary full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? tr.savingQuiz
              : `${tr.saveQuizWithCount} (${questions.length} ${tr.question})`}
          </button>
        </div>
      )}

      {quizzes.length === 0 && !creating ? (
        <div className="tq-empty">
          <div style={{ fontSize: 40 }}>📝</div>
          <h3>{tr.noQuizzesTeacher}</h3>
          <p>{tr.createFirstQuiz}</p>
          <button className="tq-btn primary" onClick={() => setCreating(true)}>
            {tr.createQuizBtn}
          </button>
        </div>
      ) : (
        <div className="tq-list">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className={`tq-quiz-card ${
                deletingId === quiz.id ? "deleting" : ""
              }`}
            >
              <div className="tq-quiz-top">
                <div style={{ fontSize: 24 }}>📋</div>
                <div className="tq-quiz-info">
                  <div className="tq-quiz-name">{quiz.name}</div>
                  <div className="tq-quiz-meta">
                    <span className="tq-tag">{quiz.class.name}</span>
                    <span className="tq-dot" />
                    <span>
                      {quiz.questions.length} {tr.question}
                    </span>
                    <span className="tq-dot" />
                    <span>
                      {quiz.attempts.length} {tr.attempt}
                    </span>
                  </div>
                </div>
                <div className="tq-quiz-actions">
                  <button
                    className="tq-ghost-btn"
                    onClick={() =>
                      setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)
                    }
                  >
                    {expandedQuiz === quiz.id ? tr.hideResults : tr.showResults}
                  </button>
                  <button
                    className="tq-del-btn"
                    onClick={() => handleDelete(quiz.id)}
                    disabled={deletingId === quiz.id}
                  >
                    {deletingId === quiz.id ? "..." : tr.delete}
                  </button>
                </div>
              </div>

              {expandedQuiz === quiz.id && (
                <div className="tq-results">
                  <div className="tq-results-header">{tr.studentResults}</div>
                  {quiz.attempts.length === 0 ? (
                    <div className="tq-results-empty">{tr.noAttemptsYet}</div>
                  ) : (
                    <div className="tq-results-list">
                      {quiz.attempts.map((a) => {
                        const pct =
                          a.total > 0
                            ? Math.round((a.score / a.total) * 100)
                            : 0;
                        return (
                          <div key={a.id} className="tq-result-row">
                            <div className="tq-result-avatar">
                              {a.student.profile.full_name.charAt(0)}
                            </div>
                            <div className="tq-result-name">
                              {a.student.profile.full_name}
                            </div>
                            <div className="tq-result-bar-wrap">
                              <div
                                className="tq-result-bar"
                                style={{
                                  width: `${pct}%`,
                                  background:
                                    pct >= 70
                                      ? "#10b981"
                                      : pct >= 50
                                        ? "#f59e0b"
                                        : "#ef4444",
                                }}
                              />
                            </div>
                            <div
                              className={`tq-result-score ${
                                pct >= 70 ? "good" : pct >= 50 ? "mid" : "low"
                              }`}
                            >
                              {a.score}/{a.total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes sp{to{transform:rotate(360deg)}}
  .tq-shell{display:flex;flex-direction:column;gap:20px;font-family:Tajawal,sans-serif}
  .tq-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .tq-title{font-size:21px;font-weight:800;color:#111827}
  .tq-sub{font-size:13px;color:#6b7280;margin-top:2px}
  .tq-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .tq-btn.primary{background:#111827;color:white}
  .tq-btn.primary:hover:not(:disabled){background:#1f2937}
  .tq-btn.primary:disabled{opacity:0.4;cursor:not-allowed}
  .tq-btn.full{width:100%;justify-content:center;padding:12px;font-size:14px}
  .tq-ghost-btn{background:none;border:1.5px solid #e5e7eb;color:#6b7280;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .tq-ghost-btn:hover{border-color:#9ca3af;color:#374151}
  .tq-form{background:#f7f8fa;border:1.5px solid #e5e7eb;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:16px}
  .tq-form-header{display:flex;align-items:center;justify-content:space-between}
  .tq-form-title{font-size:16px;font-weight:800;color:#111827}
  .tq-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tq-field{display:flex;flex-direction:column;gap:5px}
  .tq-label{font-size:12px;font-weight:700;color:#374151}
  .tq-input{padding:9px 12px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:Tajawal,sans-serif;color:#111827;outline:none;width:100%;transition:border-color 0.15s}
  .tq-input:focus{border-color:#2563eb}
  .tq-questions{display:flex;flex-direction:column;gap:10px}
  .tq-q-card{background:white;border:1.5px solid #e5e7eb;border-radius:12px;padding:15px;display:flex;flex-direction:column;gap:10px}
  .tq-q-header{display:flex;align-items:center;gap:8px}
  .tq-q-num{font-size:10.5px;font-weight:700;color:#9ca3af;background:#f1f3f6;padding:2px 7px;border-radius:4px}
  .tq-q-type-badge{font-size:11px;font-weight:700;color:#2563eb;background:rgba(37,99,235,0.08);padding:2px 8px;border-radius:5px}
  .tq-del-q-btn{margin-right:auto;background:none;border:none;color:#9ca3af;cursor:pointer;padding:4px;border-radius:4px;font-size:13px}
  .tq-del-q-btn:hover{color:#ef4444}
  .tq-opts{display:flex;flex-direction:column;gap:6px}
  .tq-opt-row{display:flex;align-items:center;gap:8px}
  .tq-radio{width:20px;height:20px;border-radius:50%;border:2px solid #d1d5db;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#10b981;flex-shrink:0;font-size:11px;font-weight:700}
  .tq-radio.selected{border-color:#10b981;background:rgba(16,185,129,0.08)}
  .opt-inp{flex:1}
  .tq-opt-hint{font-size:11px;color:#9ca3af}
  .tq-tf-row{display:flex;gap:10px}
  .tq-tf-btn{flex:1;padding:10px;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;border:1.5px solid #e5e7eb;background:#f7f8fa;transition:all 0.15s;font-family:Tajawal,sans-serif;color:#374151}
  .tq-tf-btn.selected.true{background:rgba(16,185,129,0.1);border-color:#10b981;color:#065f46}
  .tq-tf-btn.selected.false{background:rgba(239,68,68,0.1);border-color:#ef4444;color:#991b1b}
  .tq-add-q-row{display:flex;gap:8px}
  .tq-add-q-btn{background:none;border:1.5px dashed #d1d5db;color:#6b7280;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:Tajawal,sans-serif;transition:all 0.15s}
  .tq-add-q-btn:hover{border-color:#2563eb;color:#2563eb}
  .tq-error{background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);color:#dc2626;font-size:13px;padding:10px 12px;border-radius:8px}
  .tq-empty{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:52px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
  .tq-empty h3{font-size:16px;font-weight:800;color:#111827}
  .tq-empty p{font-size:13px;color:#6b7280;margin-bottom:4px}
  .tq-list{display:flex;flex-direction:column;gap:10px}
  .tq-quiz-card{background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;transition:border-color 0.15s}
  .tq-quiz-card:hover{border-color:#d1d5db}
  .tq-quiz-card.deleting{opacity:0;transform:scale(0.97);transition:all 0.3s ease}
  .tq-quiz-top{display:flex;align-items:center;gap:14px;padding:16px 18px}
  .tq-quiz-info{flex:1;min-width:0}
  .tq-quiz-name{font-size:14px;font-weight:800;color:#111827}
  .tq-quiz-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;margin-top:3px;flex-wrap:wrap}
  .tq-tag{background:rgba(37,99,235,0.08);color:#2563eb;padding:1px 8px;border-radius:99px;font-weight:600;font-size:11px}
  .tq-dot{width:3px;height:3px;border-radius:50%;background:#d1d5db}
  .tq-quiz-actions{display:flex;gap:8px;flex-shrink:0}
  .tq-del-btn{background:none;border:1.5px solid #fecaca;color:#ef4444;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .tq-del-btn:hover:not(:disabled){background:#fef2f2}
  .tq-del-btn:disabled{opacity:0.4;cursor:not-allowed}
  .tq-results{border-top:1px solid #f1f3f6;padding:16px 18px;display:flex;flex-direction:column;gap:10px;background:#fafafa}
  .tq-results-header{font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px}
  .tq-results-empty{font-size:13px;color:#9ca3af;text-align:center;padding:12px 0}
  .tq-results-list{display:flex;flex-direction:column;gap:8px}
  .tq-result-row{display:flex;align-items:center;gap:10px}
  .tq-result-avatar{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0}
  .tq-result-name{font-size:13px;font-weight:600;color:#374151;width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tq-result-bar-wrap{flex:1;height:5px;background:#e5e7eb;border-radius:99px;overflow:hidden}
  .tq-result-bar{height:100%;border-radius:99px;transition:width 0.5s ease}
  .tq-result-score{font-size:12px;font-weight:800;width:40px;text-align:left;flex-shrink:0}
  .tq-result-score.good{color:#10b981}
  .tq-result-score.mid{color:#f59e0b}
  .tq-result-score.low{color:#ef4444}
`;
