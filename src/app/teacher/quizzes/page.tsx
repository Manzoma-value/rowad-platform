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
type NewQuestion = { type: "MCQ" | "TF"; text: string; options: string[]; correct_answer: string };

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
    const [qRes, tRes] = await Promise.all([fetch("/api/teacher/quizzes"), fetch("/api/teacher")]);
    setQuizzes(await qRes.json());
    const tData = await tRes.json();
    setClasses(tData.classes ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  const tfLabels = [tr.trueWord, tr.falseWord];
  const addQuestion = (type: "MCQ" | "TF") =>
    setQuestions((p) => [...p, { type, text: "", options: type === "MCQ" ? ["", "", "", ""] : tfLabels, correct_answer: "" }]);

  const updateQ = (i: number, field: string, val: string) =>
    setQuestions((p) => p.map((q, idx) => (idx === i ? { ...q, [field]: val } : q)));

  const updateOpt = (qi: number, oi: number, val: string) =>
    setQuestions((p) =>
      p.map((q, i) => {
        if (i !== qi) return q;
        const opts = [...q.options];
        opts[oi] = val;
        return { ...q, options: opts };
      })
    );

  async function handleSubmit() {
    setFormError("");
    if (!quizName.trim()) { setFormError(tr.enterQuizName); return; }
    if (!selectedClass) { setFormError(tr.chooseClassPrompt); return; }
    if (questions.length === 0) { setFormError(tr.addAtLeastOne); return; }
    for (const q of questions) {
      if (!q.text.trim()) { setFormError(tr.fillAllQuestions); return; }
      if (!q.correct_answer) { setFormError(tr.chooseCorrectForAll); return; }
      if (q.type === "MCQ" && q.options.filter((o) => o.trim()).length < 2) { setFormError(tr.addTwoOptions); return; }
    }
    setSubmitting(true);
    const res = await fetch("/api/teacher/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: quizName, classId: selectedClass, questions: questions.map((q) => ({ ...q, options: q.type === "MCQ" ? q.options.filter((o) => o.trim()) : undefined })) }),
    });
    setSubmitting(false);
    if (!res.ok) { const e = await res.json(); setFormError(e.error ?? tr.saveQuiz); return; }
    setQuizName(""); setSelectedClass(""); setQuestions([]); setCreating(false); load();
  }

  async function handleDelete(id: string) {
    if (!confirm(tr.deleteQuizConfirm)) return;
    setDeletingId(id);
    await fetch(`/api/teacher/quizzes/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  if (loading) return <MandalaLoader label={tr.loading} />;

  const totalAttempts = quizzes.reduce((a, q) => a + q.attempts.length, 0);

  return (
    <div className="tq-shell" dir={dir}>

      {/* ── Header ── */}
      <div className="tq-header">
        <div>
          <p className="tq-eyebrow">{lang === "ar" ? "اختبارات" : "Teste"}</p>
          <h1 className="tq-title">{tr.quizzes}</h1>
          <p className="tq-sub">{quizzes.length} {lang === "ar" ? "اختبار" : "teste"} · {totalAttempts} {tr.attempt}</p>
        </div>
        {!creating && (
          <button className="tq-btn-primary" onClick={() => setCreating(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {tr.newQuiz}
          </button>
        )}
      </div>

      {/* ── Create form ── */}
      {creating && (
        <div className="tq-form">
          <div className="tq-form-top">
            <h2 className="tq-form-title">{tr.createNewQuiz}</h2>
            <button className="tq-ghost-btn" onClick={() => { setCreating(false); setFormError(""); }}>{tr.cancel}</button>
          </div>

          <div className="tq-form-row">
            <div className="tq-field">
              <label className="tq-label">{tr.quizName}</label>
              <input className="tq-input" placeholder={tr.quizNamePlaceholder} value={quizName} onChange={(e) => setQuizName(e.target.value)} dir={dir}/>
            </div>
            <div className="tq-field">
              <label className="tq-label">{tr.selectClass}</label>
              <select className="tq-input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} dir={dir}>
                <option value="">{tr.chooseClassPrompt}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Questions */}
          <div className="tq-questions">
            {questions.map((q, qi) => (
              <div key={qi} className="tq-q-card">
                <div className="tq-q-head">
                  <span className="tq-q-num">{tr.question}{qi + 1}</span>
                  <span className="tq-q-type">{q.type === "MCQ" ? tr.mcqType : tr.tfType}</span>
                  <button className="tq-del-q" onClick={() => setQuestions((p) => p.filter((_, i) => i !== qi))}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <input className="tq-input" placeholder={tr.questionText} value={q.text} onChange={(e) => updateQ(qi, "text", e.target.value)} dir={dir}/>
                {q.type === "MCQ" ? (
                  <div className="tq-opts">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="tq-opt-row">
                        <button
                          className={`tq-radio ${q.correct_answer === opt && opt.trim() ? "selected" : ""}`}
                          type="button"
                          onClick={() => opt.trim() && updateQ(qi, "correct_answer", opt)}>
                          {q.correct_answer === opt && opt.trim() && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>
                        <input className="tq-input opt-inp" placeholder={`${tr.optionNumber} ${oi + 1}`} value={opt}
                          onChange={(e) => {
                            if (q.correct_answer === opt) updateQ(qi, "correct_answer", e.target.value);
                            updateOpt(qi, oi, e.target.value);
                          }} dir={dir}/>
                      </div>
                    ))}
                    <p className="tq-opt-hint">{tr.clickCircleHint}</p>
                  </div>
                ) : (
                  <div className="tq-tf-row">
                    {tfLabels.map((opt, idx) => (
                      <button key={opt} className={`tq-tf-btn ${q.correct_answer === opt ? "selected" : ""} ${idx === 0 ? "true-btn" : "false-btn"}`}
                        onClick={() => updateQ(qi, "correct_answer", opt)} type="button">
                        {idx === 0 ? `✓ ${tr.trueWord}` : `✗ ${tr.falseWord}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="tq-add-row">
            <button className="tq-add-btn" onClick={() => addQuestion("MCQ")}>{tr.addMcq}</button>
            <button className="tq-add-btn" onClick={() => addQuestion("TF")}>{tr.addTf}</button>
          </div>

          {formError && <div className="tq-error">{formError}</div>}

          <button className="tq-btn-primary full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? tr.savingQuiz : `${tr.saveQuizWithCount} (${questions.length} ${tr.question})`}
          </button>
        </div>
      )}

      {/* ── Quiz list ── */}
      {quizzes.length === 0 && !creating ? (
        <div className="tq-empty">
          <div className="tq-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3>{tr.noQuizzesTeacher}</h3>
          <p>{tr.createFirstQuiz}</p>
          <button className="tq-btn-primary" onClick={() => setCreating(true)}>{tr.createQuizBtn}</button>
        </div>
      ) : (
        <div className="tq-list">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className={`tq-quiz-card ${deletingId === quiz.id ? "deleting" : ""}`}>
              <div className="tq-quiz-top">
                <div className="tq-quiz-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div className="tq-quiz-info">
                  <div className="tq-quiz-name">{quiz.name}</div>
                  <div className="tq-quiz-meta">
                    <span className="tq-class-tag">{quiz.class.name}</span>
                    <span className="tq-dot-sep" />
                    <span>{quiz.questions.length} {tr.question}</span>
                    <span className="tq-dot-sep" />
                    <span>{quiz.attempts.length} {tr.attempt}</span>
                  </div>
                </div>
                <div className="tq-quiz-actions">
                  <button className="tq-ghost-btn" onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}>
                    {expandedQuiz === quiz.id ? tr.hideResults : tr.showResults}
                  </button>
                  <button className="tq-del-quiz-btn" onClick={() => handleDelete(quiz.id)} disabled={deletingId === quiz.id}>
                    {deletingId === quiz.id ? "..." : tr.delete}
                  </button>
                </div>
              </div>

              {expandedQuiz === quiz.id && (
                <div className="tq-results">
                  <p className="tq-results-label">{tr.studentResults}</p>
                  {quiz.attempts.length === 0 ? (
                    <div className="tq-results-empty">{tr.noAttemptsYet}</div>
                  ) : (
                    <div className="tq-results-list">
                      {quiz.attempts.map((a) => {
                        const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                        const color = pct >= 70 ? "#2D8A4A" : pct >= 50 ? "#A8863E" : "#B85C38";
                        return (
                          <div key={a.id} className="tq-result-row">
                            <div className="tq-result-av">{a.student.profile.full_name.charAt(0)}</div>
                            <div className="tq-result-name">{a.student.profile.full_name}</div>
                            <div className="tq-result-bar-bg">
                              <div className="tq-result-bar-fill" style={{ width: `${pct}%`, background: color }}/>
                            </div>
                            <div className="tq-result-score" style={{ color }}>{a.score}/{a.total}</div>
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
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

  .tq-shell{display:flex;flex-direction:column;gap:20px;font-family:'Cairo',Tajawal,sans-serif;min-height:100%;background:#F6F4EE;padding:28px 24px}

  /* Header */
  .tq-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;
    background:#0B0B0C;border-radius:20px;padding:22px 26px;
    position:relative;overflow:hidden;border:1px solid rgba(200,169,106,0.1);
    animation:fadeUp 0.42s ease both;
  }
  .tq-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent)}
  .tq-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(200,169,106,0.5);margin-bottom:5px}
  .tq-title{font-size:22px;font-weight:900;color:#C8A96A;letter-spacing:-0.3px}
  .tq-sub{font-size:12.5px;color:rgba(200,169,106,0.4);margin-top:4px}

  /* Buttons */
  .tq-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;background:#C8A96A;color:#0B0B0C;align-self:flex-start}
  .tq-btn-primary:hover:not(:disabled){background:#E5B93C;transform:translateY(-1px)}
  .tq-btn-primary:disabled{opacity:0.4;cursor:not-allowed}
  .tq-btn-primary.full{width:100%;justify-content:center;padding:13px;font-size:14px;border-radius:12px;margin-top:4px}
  .tq-ghost-btn{background:none;border:1.5px solid rgba(200,169,106,0.2);color:#9A8A70;padding:6px 12px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .tq-ghost-btn:hover{border-color:rgba(200,169,106,0.4);color:#A8863E}

  /* Form */
  .tq-form{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:16px;animation:fadeUp 0.35s ease both}
  .tq-form-top{display:flex;align-items:center;justify-content:space-between}
  .tq-form-title{font-size:16px;font-weight:800;color:#0B0B0C}
  .tq-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:600px){.tq-form-row{grid-template-columns:1fr}}
  .tq-field{display:flex;flex-direction:column;gap:5px}
  .tq-label{font-size:12px;font-weight:700;color:#3D2E10}
  .tq-input{padding:10px 13px;background:#F6F4EE;border:1.5px solid rgba(200,169,106,0.18);border-radius:9px;font-size:13px;font-family:'Cairo',Tajawal,sans-serif;color:#0B0B0C;outline:none;width:100%;transition:border-color 0.15s,box-shadow 0.15s}
  .tq-input:focus{border-color:rgba(200,169,106,0.4);background:#FFFDF8;box-shadow:0 0 0 3px rgba(200,169,106,0.07)}

  /* Questions */
  .tq-questions{display:flex;flex-direction:column;gap:10px}
  .tq-q-card{background:#F6F4EE;border:1.5px solid rgba(200,169,106,0.15);border-radius:13px;padding:15px;display:flex;flex-direction:column;gap:10px}
  .tq-q-head{display:flex;align-items:center;gap:8px}
  .tq-q-num{font-size:10.5px;font-weight:800;color:#9A8A70;background:rgba(200,169,106,0.1);border:1px solid rgba(200,169,106,0.18);padding:2px 8px;border-radius:5px}
  .tq-q-type{font-size:11px;font-weight:700;color:#A8863E;background:rgba(200,169,106,0.1);border:1px solid rgba(200,169,106,0.2);padding:2px 8px;border-radius:5px}
  .tq-del-q{margin-right:auto;background:none;border:1px solid rgba(200,169,106,0.18);color:#9A8A70;cursor:pointer;padding:4px 6px;border-radius:6px;display:flex;align-items:center;transition:all 0.14s}
  .tq-del-q:hover{border-color:rgba(184,92,56,0.3);color:#B85C38;background:rgba(184,92,56,0.06)}

  .tq-opts{display:flex;flex-direction:column;gap:6px}
  .tq-opt-row{display:flex;align-items:center;gap:8px}
  .tq-radio{width:22px;height:22px;border-radius:50%;border:2px solid rgba(200,169,106,0.25);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#2D8A4A;flex-shrink:0;transition:all 0.14s}
  .tq-radio.selected{border-color:#2D8A4A;background:rgba(45,138,74,0.1)}
  .opt-inp{flex:1}
  .tq-opt-hint{font-size:11px;color:#9A8A70}
  .tq-tf-row{display:flex;gap:10px}
  .tq-tf-btn{flex:1;padding:10px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:1.5px solid rgba(200,169,106,0.18);background:#F6F4EE;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;color:#3D2E10}
  .tq-tf-btn.selected.true-btn{background:rgba(45,138,74,0.09);border-color:rgba(45,138,74,0.3);color:#2D8A4A}
  .tq-tf-btn.selected.false-btn{background:rgba(184,92,56,0.09);border-color:rgba(184,92,56,0.28);color:#B85C38}

  .tq-add-row{display:flex;gap:8px}
  .tq-add-btn{background:none;border:1.5px dashed rgba(200,169,106,0.25);color:#9A8A70;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Cairo',Tajawal,sans-serif;transition:all 0.15s}
  .tq-add-btn:hover{border-color:rgba(200,169,106,0.45);color:#A8863E}
  .tq-error{background:rgba(184,92,56,0.07);border:1px solid rgba(184,92,56,0.2);color:#B85C38;font-size:13px;padding:11px 13px;border-radius:9px}

  /* Empty */
  .tq-empty{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:18px;padding:56px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;animation:fadeUp 0.4s ease both}
  .tq-empty-icon{color:rgba(200,169,106,0.35)}
  .tq-empty h3{font-size:16px;font-weight:800;color:#0B0B0C}
  .tq-empty p{font-size:13px;color:#9A8A70;margin-bottom:4px}

  /* Quiz list */
  .tq-list{display:flex;flex-direction:column;gap:10px}
  .tq-quiz-card{background:#FFFDF8;border:1px solid rgba(200,169,106,0.14);border-radius:16px;overflow:hidden;transition:all 0.18s;animation:fadeUp 0.3s ease both}
  .tq-quiz-card:hover{border-color:rgba(200,169,106,0.28);box-shadow:0 4px 16px rgba(8,11,12,0.06)}
  .tq-quiz-card.deleting{opacity:0;transform:scale(0.97);transition:all 0.3s ease}
  .tq-quiz-top{display:flex;align-items:center;gap:14px;padding:16px 18px}
  .tq-quiz-icon{width:40px;height:40px;border-radius:11px;flex-shrink:0;background:#0B0B0C;border:1px solid rgba(200,169,106,0.18);display:flex;align-items:center;justify-content:center;color:#C8A96A}
  .tq-quiz-info{flex:1;min-width:0}
  .tq-quiz-name{font-size:14px;font-weight:800;color:#0B0B0C}
  .tq-quiz-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:#9A8A70;margin-top:3px;flex-wrap:wrap}
  .tq-class-tag{background:rgba(200,169,106,0.1);color:#A8863E;padding:1px 9px;border-radius:99px;font-weight:700;font-size:11px;border:1px solid rgba(200,169,106,0.2)}
  .tq-dot-sep{width:3px;height:3px;border-radius:50%;background:rgba(200,169,106,0.3)}
  .tq-quiz-actions{display:flex;gap:8px;flex-shrink:0}
  .tq-del-quiz-btn{background:none;border:1.5px solid rgba(200,169,106,0.2);color:#9A8A70;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .tq-del-quiz-btn:hover:not(:disabled){border-color:rgba(184,92,56,0.3);color:#B85C38;background:rgba(184,92,56,0.06)}
  .tq-del-quiz-btn:disabled{opacity:0.4;cursor:not-allowed}

  /* Results panel */
  .tq-results{border-top:1px solid rgba(200,169,106,0.09);padding:16px 18px;display:flex;flex-direction:column;gap:10px;background:rgba(200,169,106,0.03)}
  .tq-results-label{font-size:11px;font-weight:800;color:#9A8A70;text-transform:uppercase;letter-spacing:1px}
  .tq-results-empty{font-size:13px;color:#9A8A70;text-align:center;padding:12px 0}
  .tq-results-list{display:flex;flex-direction:column;gap:9px}
  .tq-result-row{display:flex;align-items:center;gap:10px}
  .tq-result-av{width:28px;height:28px;border-radius:50%;background:#0B0B0C;border:1px solid rgba(200,169,106,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#C8A96A;flex-shrink:0}
  .tq-result-name{font-size:13px;font-weight:600;color:#3D2E10;width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tq-result-bar-bg{flex:1;height:5px;background:rgba(200,169,106,0.12);border-radius:99px;overflow:hidden}
  .tq-result-bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
  .tq-result-score{font-size:12px;font-weight:800;width:42px;text-align:start;flex-shrink:0}
`;
