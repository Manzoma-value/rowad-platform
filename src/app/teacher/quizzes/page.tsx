"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";

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
// LIST shape — slim, just counts + class ref. Detail is fetched lazily.
type Quiz = {
  id: string;
  name: string;
  class: { id: string; name: string };
  _count: { questions: number; attempts: number };
};
// DETAIL shape — fetched only when a quiz is expanded.
type QuizDetail = {
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
  const confirm = useConfirm();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  // Lazy-loaded detail cache: only the expanded quiz's full data lives here.
  const [detail, setDetail] = useState<QuizDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quizName, setQuizName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [questions, setQuestions] = useState<NewQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    // Cached: refresh-warm. Teacher data lives 5 min; quiz list 30s
    // because counts change as students submit.
    const [qData, tData] = await Promise.all([
      cachedFetch<Quiz[]>("/api/teacher/quizzes", 30_000),
      cachedFetch<{ classes: ClassItem[] }>("/api/teacher", 300_000),
    ]);
    setQuizzes(qData ?? []);
    setClasses(tData?.classes ?? []);
    setLoading(false);
  }

  async function toggleExpand(id: string) {
    if (expandedQuiz === id) {
      setExpandedQuiz(null);
      setDetail(null);
      return;
    }
    setExpandedQuiz(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await cachedFetch<QuizDetail>(`/api/teacher/quizzes/${id}`, 30_000);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
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
    setQuizName(""); setSelectedClass(""); setQuestions([]); setCreating(false);
    invalidateCache("/api/teacher/quizzes");
    load();
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ message: tr.deleteQuizConfirm }))) return;
    setDeletingId(id);
    await fetch(`/api/teacher/quizzes/${id}`, { method: "DELETE" });
    setDeletingId(null);
    invalidateCache("/api/teacher/quizzes");
    invalidateCache(`/api/teacher/quizzes/${id}`);
    if (expandedQuiz === id) { setExpandedQuiz(null); setDetail(null); }
    load();
  }

  if (loading) return <MandalaLoader label={tr.loading} />;

  const totalAttempts = quizzes.reduce((a, q) => a + q._count.attempts, 0);

  return (
    <div className="tq-shell" dir={dir}>

      {/* ── Header ── */}
      <div className="tq-header">
        <div>
          <p className="tq-eyebrow">{lang === "ar" ? "اختبارات" : "Teste"}</p>
          <h1 className="tq-title">{tr.quizzes}</h1>
          <p className="tq-sub">{quizzes.length} {lang === "ar" ? "اختبار" : "teste"} · {totalAttempts} {tr.attempt}</p>
        </div>
        {/* Creation must start from a concept on the roadmap. */}
        <a href="/teacher/roadmap" className="tq-btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {lang === "ar" ? "أنشئ من الخريطة" : lang === "sq" ? "Krijo nga harta" : "Create from roadmap"}
        </a>
        {creating && null}
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
          <p>
            {lang === "ar"
              ? "ابدأ من الخريطة التعليمية — افتح أي مفهوم وأضف اختبارك من هناك."
              : lang === "sq"
                ? "Fillo nga harta — hap çdo koncept dhe shto kuizin tënd prej andej."
                : "Start from the roadmap — open any concept and add your quiz from there."}
          </p>
          <a className="tq-btn-primary" href="/teacher/roadmap">
            {lang === "ar" ? "افتح الخريطة" : lang === "sq" ? "Hap hartën" : "Open roadmap"}
          </a>
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
                    <span>{quiz._count.questions} {tr.question}</span>
                    <span className="tq-dot-sep" />
                    <span>{quiz._count.attempts} {tr.attempt}</span>
                  </div>
                </div>
                <div className="tq-quiz-actions">
                  <button className="tq-ghost-btn" onClick={() => toggleExpand(quiz.id)}>
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
                  {detailLoading ? (
                    <div className="tq-results-empty"><span className="tq-spin" /></div>
                  ) : !detail || detail.attempts.length === 0 ? (
                    <div className="tq-results-empty">{tr.noAttemptsYet}</div>
                  ) : (
                    <div className="tq-results-list">
                      {detail.attempts.map((a) => {
                        const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                        const color = pct >= 70 ? "#1B5E20" : pct >= 50 ? "#8F765B" : "#6B1E2D";
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

  .tq-shell{display:flex;flex-direction:column;gap:20px;font-family:'Cairo',Tajawal,sans-serif;min-height:100%;background:#EFEAE0;padding:28px 24px}

  /* Header */
  .tq-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;
    background:#1A1A1A;border-radius:20px;padding:22px 26px;
    position:relative;overflow:hidden;border:1px solid rgba(184,160,130,0.1);
    animation:fadeUp 0.42s ease both;
  }
  .tq-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#B8A082 30%,#B8A082 60%,transparent)}
  .tq-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(184,160,130,0.5);margin-bottom:5px}
  .tq-title{font-size:22px;font-weight:900;color:#B8A082;letter-spacing:-0.3px}
  .tq-sub{font-size:12.5px;color:rgba(184,160,130,0.4);margin-top:4px}

  /* Buttons */
  .tq-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;background:#B8A082;color:#1A1A1A;align-self:flex-start}
  .tq-btn-primary:hover:not(:disabled){background:#B8A082;transform:translateY(-1px)}
  .tq-btn-primary:disabled{opacity:0.4;cursor:not-allowed}
  .tq-btn-primary.full{width:100%;justify-content:center;padding:13px;font-size:14px;border-radius:12px;margin-top:4px}
  .tq-ghost-btn{background:none;border:1.5px solid rgba(184,160,130,0.2);color:#796A62;padding:6px 12px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .tq-ghost-btn:hover{border-color:rgba(184,160,130,0.4);color:#8F765B}

  /* Form */
  .tq-form{background:#FFFBF5;border:1px solid rgba(184,160,130,0.14);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:16px;animation:fadeUp 0.35s ease both}
  .tq-form-top{display:flex;align-items:center;justify-content:space-between}
  .tq-form-title{font-size:16px;font-weight:800;color:#1A1A1A}
  .tq-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:600px){.tq-form-row{grid-template-columns:1fr}}
  .tq-field{display:flex;flex-direction:column;gap:5px}
  .tq-label{font-size:12px;font-weight:700;color:#4A0E1C}
  .tq-input{padding:10px 13px;background:#EFEAE0;border:1.5px solid rgba(184,160,130,0.18);border-radius:9px;font-size:13px;font-family:'Cairo',Tajawal,sans-serif;color:#1A1A1A;outline:none;width:100%;transition:border-color 0.15s,box-shadow 0.15s}
  .tq-input:focus{border-color:rgba(184,160,130,0.4);background:#FFFBF5;box-shadow:0 0 0 3px rgba(184,160,130,0.07)}

  /* Questions */
  .tq-questions{display:flex;flex-direction:column;gap:10px}
  .tq-q-card{background:#EFEAE0;border:1.5px solid rgba(184,160,130,0.15);border-radius:13px;padding:15px;display:flex;flex-direction:column;gap:10px}
  .tq-q-head{display:flex;align-items:center;gap:8px}
  .tq-q-num{font-size:10.5px;font-weight:800;color:#796A62;background:rgba(184,160,130,0.1);border:1px solid rgba(184,160,130,0.18);padding:2px 8px;border-radius:5px}
  .tq-q-type{font-size:11px;font-weight:700;color:#8F765B;background:rgba(184,160,130,0.1);border:1px solid rgba(184,160,130,0.2);padding:2px 8px;border-radius:5px}
  .tq-del-q{margin-right:auto;background:none;border:1px solid rgba(184,160,130,0.18);color:#796A62;cursor:pointer;padding:4px 6px;border-radius:6px;display:flex;align-items:center;transition:all 0.14s}
  .tq-del-q:hover{border-color:rgba(107,30,45,0.3);color:#6B1E2D;background:rgba(107,30,45,0.06)}

  .tq-opts{display:flex;flex-direction:column;gap:6px}
  .tq-opt-row{display:flex;align-items:center;gap:8px}
  .tq-radio{width:22px;height:22px;border-radius:50%;border:2px solid rgba(184,160,130,0.25);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1B5E20;flex-shrink:0;transition:all 0.14s}
  .tq-radio.selected{border-color:#1B5E20;background:rgba(27,94,32,0.1)}
  .opt-inp{flex:1}
  .tq-opt-hint{font-size:11px;color:#796A62}
  .tq-tf-row{display:flex;gap:10px}
  .tq-tf-btn{flex:1;padding:10px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:1.5px solid rgba(184,160,130,0.18);background:#EFEAE0;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif;color:#4A0E1C}
  .tq-tf-btn.selected.true-btn{background:rgba(27,94,32,0.09);border-color:rgba(27,94,32,0.3);color:#1B5E20}
  .tq-tf-btn.selected.false-btn{background:rgba(107,30,45,0.09);border-color:rgba(107,30,45,0.28);color:#6B1E2D}

  .tq-add-row{display:flex;gap:8px}
  .tq-add-btn{background:none;border:1.5px dashed rgba(184,160,130,0.25);color:#796A62;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Cairo',Tajawal,sans-serif;transition:all 0.15s}
  .tq-add-btn:hover{border-color:rgba(184,160,130,0.45);color:#8F765B}
  .tq-error{background:rgba(107,30,45,0.07);border:1px solid rgba(107,30,45,0.2);color:#6B1E2D;font-size:13px;padding:11px 13px;border-radius:9px}

  /* Empty */
  .tq-empty{background:#FFFBF5;border:1px solid rgba(184,160,130,0.14);border-radius:18px;padding:56px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;animation:fadeUp 0.4s ease both}
  .tq-empty-icon{color:rgba(184,160,130,0.35)}
  .tq-empty h3{font-size:16px;font-weight:800;color:#1A1A1A}
  .tq-empty p{font-size:13px;color:#796A62;margin-bottom:4px}

  /* Quiz list */
  .tq-list{display:flex;flex-direction:column;gap:10px}
  .tq-quiz-card{background:#FFFBF5;border:1px solid rgba(184,160,130,0.14);border-radius:16px;overflow:hidden;transition:all 0.18s;animation:fadeUp 0.3s ease both}
  .tq-quiz-card:hover{border-color:rgba(184,160,130,0.28);box-shadow:0 4px 16px rgba(26,26,26,0.06)}
  .tq-quiz-card.deleting{opacity:0;transform:scale(0.97);transition:all 0.3s ease}
  .tq-quiz-top{display:flex;align-items:center;gap:14px;padding:16px 18px}
  .tq-quiz-icon{width:40px;height:40px;border-radius:11px;flex-shrink:0;background:#1A1A1A;border:1px solid rgba(184,160,130,0.18);display:flex;align-items:center;justify-content:center;color:#B8A082}
  .tq-quiz-info{flex:1;min-width:0}
  .tq-quiz-name{font-size:14px;font-weight:800;color:#1A1A1A}
  .tq-quiz-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:#796A62;margin-top:3px;flex-wrap:wrap}
  .tq-class-tag{background:rgba(184,160,130,0.1);color:#8F765B;padding:1px 9px;border-radius:99px;font-weight:700;font-size:11px;border:1px solid rgba(184,160,130,0.2)}
  .tq-dot-sep{width:3px;height:3px;border-radius:50%;background:rgba(184,160,130,0.3)}
  .tq-quiz-actions{display:flex;gap:8px;flex-shrink:0}
  .tq-del-quiz-btn{background:none;border:1.5px solid rgba(184,160,130,0.2);color:#796A62;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Cairo',Tajawal,sans-serif}
  .tq-del-quiz-btn:hover:not(:disabled){border-color:rgba(107,30,45,0.3);color:#6B1E2D;background:rgba(107,30,45,0.06)}
  .tq-del-quiz-btn:disabled{opacity:0.4;cursor:not-allowed}

  /* Results panel */
  .tq-results{border-top:1px solid rgba(184,160,130,0.09);padding:16px 18px;display:flex;flex-direction:column;gap:10px;background:rgba(184,160,130,0.03);animation:fadeUp 0.25s ease}
  .tq-results-label{font-size:11px;font-weight:800;color:#796A62;text-transform:uppercase;letter-spacing:1px}
  .tq-results-empty{font-size:13px;color:#796A62;text-align:center;padding:12px 0;display:flex;justify-content:center;align-items:center;gap:8px}
  .tq-spin{width:16px;height:16px;border:2px solid rgba(184,160,130,0.25);border-top-color:#B8A082;border-radius:50%;animation:sp 0.7s linear infinite;display:inline-block}
  .tq-results-list{display:flex;flex-direction:column;gap:9px}
  .tq-result-row{display:flex;align-items:center;gap:10px}
  .tq-result-av{width:28px;height:28px;border-radius:50%;background:#1A1A1A;border:1px solid rgba(184,160,130,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#B8A082;flex-shrink:0}
  .tq-result-name{font-size:13px;font-weight:600;color:#4A0E1C;width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tq-result-bar-bg{flex:1;height:5px;background:rgba(184,160,130,0.12);border-radius:99px;overflow:hidden}
  .tq-result-bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
  .tq-result-score{font-size:12px;font-weight:800;width:42px;text-align:start;flex-shrink:0}

  @media(max-width:600px){
    .tq-shell{padding:16px 14px;gap:16px}
    .tq-header{padding:18px 18px}
    .tq-title{font-size:19px}
    .tq-form{padding:18px 16px}
    .tq-input{font-size:16px}
    .tq-empty{padding:36px 20px}
    .tq-quiz-top{padding:14px 15px;gap:11px}
    .tq-quiz-actions{flex-wrap:wrap}
    .tq-result-name{width:100px}
  }
  @media(max-width:400px){
    .tq-shell{padding:14px 11px}
    .tq-header{padding:14px 15px}
    .tq-title{font-size:17px}
    .tq-form{padding:15px 13px}
    .tq-q-card{padding:13px}
    .tq-empty{padding:28px 16px}
    .tq-result-name{width:80px;font-size:12px}
  }
`;
