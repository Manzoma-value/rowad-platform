"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BookOpen, Check, ChevronDown, FileQuestion, Flag, MessageSquareText, PlayCircle, RefreshCw, Send, Sparkles } from "lucide-react";

type Requirement = { id: string; type: "VIDEO" | "QUIZ" | "MESSAGE" | "READING"; title: string; description: string | null; completed: boolean; progress: number; min_length: number; quiz?: { id: string; title: string; description: string | null; passing_score: number; question_count: number; attempt: { score: number; total: number; completed_at: string | null; passed_at: string | null } | null } };
type Journey = { completed: boolean; percent: number; requirements: Requirement[] };
type Quiz = { id: string; title: string; description: string | null; passing_score: number; questions: Array<{ id: string; type: "MCQ" | "TF" | "TEXT"; text: string; options: Array<{ id: string; text: string }> }>; attempt: { answers: Array<{ question_id: string; answer: string; is_correct: boolean; grading_status: string }>; score: number; total: number } | null };

const copy = {
  ar: { title: "رحلة إتمام الورشة", sub: "اتبع الخطوات بالترتيب، وستظهر لك علامة الإتمام فور إنجاز كل المتطلبات.", done: "اكتملت الورشة", progress: "التقدم", video: "شاهد كل الفيديوهات وأجب عن أسئلتها", quiz: "الاختبار القصير", message: "شارك ما تعلمته في الإعلانات", reading: "أكمل القراءة", open: "ابدأ الخطوة", refresh: "تحديث التقدم", mark: "تمت القراءة", passed: "تم اجتياز الاختبار", pending: "بانتظار تصحيح الإجابات الكتابية", submit: "إرسال الإجابة", submitting: "جارٍ الإرسال...", correct: "إجابة صحيحة", wrong: "تحتاج مراجعة", min: (n: number) => `اكتب ${n} أحرف على الأقل في الإعلانات.` },
  en: { title: "Workshop journey", sub: "Follow the steps in order. Your completion badge appears when every requirement is done.", done: "Workshop completed", progress: "Progress", video: "Watch every video and answer its questions", quiz: "Short quiz", message: "Share what you learned in announcements", reading: "Complete the reading", open: "Start step", refresh: "Refresh progress", mark: "Mark as read", passed: "Quiz passed", pending: "Written answers are awaiting review", submit: "Submit answer", submitting: "Submitting...", correct: "Correct answer", wrong: "Needs review", min: (n: number) => `Write at least ${n} characters in announcements.` },
} as const;

export function WorkshopJourney({ workshopId, hasAccess, lang, refreshKey = 0 }: { workshopId: string; hasAccess: boolean; lang: "ar" | "sq"; refreshKey?: number }) {
  const t = copy[lang === "ar" ? "ar" : "en"];
  const [journey, setJourney] = useState<Journey | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!hasAccess) return;
    try {
      const [journeyResponse, quizResponse] = await Promise.all([fetch(`/api/teacher/workshops/${workshopId}/journey`, { cache: "no-store" }), fetch(`/api/teacher/workshops/${workshopId}/quiz`, { cache: "no-store" })]);
      if (!journeyResponse.ok) throw new Error("failed");
      const journeyPayload = await journeyResponse.json();
      const quizPayload = await quizResponse.json();
      setJourney(journeyPayload.journey ?? null);
      setQuiz(quizPayload.quiz ?? null);
      const attempt = quizPayload.quiz?.attempt;
      if (attempt) setAnswers(Object.fromEntries(attempt.answers.map((answer: { question_id: string; answer: string }) => [answer.question_id, answer.answer])));
    } catch { setError("Could not load journey"); }
  }, [hasAccess, workshopId]);
  useEffect(() => { void load(); }, [load, refreshKey]);

  async function markReading(requirementId: string) {
    setBusy(requirementId); setError("");
    try { const r = await fetch(`/api/teacher/workshops/${workshopId}/journey`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirement_id: requirementId }) }); if (!r.ok) throw new Error(); setJourney((await r.json()).journey); } catch { setError("Could not save progress"); } finally { setBusy(null); }
  }

  async function submitAnswer(questionId: string) {
    const answer = answers[questionId]?.trim();
    if (!answer || !quiz) return;
    setBusy(questionId); setError("");
    try { const r = await fetch(`/api/teacher/workshops/${workshopId}/quiz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question_id: questionId, answer }) }); const data = await r.json(); if (!r.ok) throw new Error(); setQuiz((current) => current ? { ...current, attempt: data.attempt ? { ...data.attempt, answers: [...(current.attempt?.answers ?? []).filter((item) => item.question_id !== questionId), data.answer] } : current.attempt } : current); setJourney(data.journey); } catch { setError("Could not submit answer"); } finally { setBusy(null); }
  }

  const doneCount = useMemo(() => journey?.requirements.filter((item) => item.completed).length ?? 0, [journey]);
  if (!hasAccess || !journey) return null;
  return <section className="wj" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="wj-head"><div><span className="wj-kicker"><Sparkles size={14}/>{t.title}</span><h2>{journey.completed ? t.done : t.title}</h2><p>{t.sub}</p></div><div className={`wj-score${journey.completed ? " done" : ""}`}><strong>{journey.percent}%</strong><span>{t.progress}</span></div></div>
    <div className="wj-bar"><span style={{ width: `${journey.percent}%` }}/></div>
    <div className="wj-count"><span>{doneCount}/{journey.requirements.length} steps completed</span><button onClick={() => void load()}><RefreshCw size={14}/>{t.refresh}</button></div>
    <div className="wj-road">
      {journey.requirements.map((item, index) => {
        const expanded = open === item.id;
        const icon = item.type === "VIDEO" ? <PlayCircle size={18}/> : item.type === "QUIZ" ? <FileQuestion size={18}/> : item.type === "MESSAGE" ? <MessageSquareText size={18}/> : <BookOpen size={18}/>;
        return <article key={item.id} className={`wj-step${item.completed ? " completed" : ""}${expanded ? " expanded" : ""}`}>
          <div className="wj-line"><div className="wj-node">{item.completed ? <Check size={17}/> : icon}</div>{index < journey.requirements.length - 1 && <i/>}</div>
          <div className="wj-step-body"><button className="wj-step-button" onClick={() => setOpen(expanded ? null : item.id)}><span><b>{index + 1}</b><strong>{item.title || ({ VIDEO: t.video, QUIZ: t.quiz, MESSAGE: t.message, READING: t.reading }[item.type])}</strong></span><small>{item.completed ? t.done : `${item.progress}%` }<ChevronDown size={16}/></small></button>
            {expanded && <div className="wj-detail"><p>{item.description || ({ VIDEO: t.video, QUIZ: t.quiz, MESSAGE: t.message, READING: t.reading }[item.type])}</p>
              {item.type === "VIDEO" && !item.completed && <a href="#workshop-videos" className="wj-action">{t.open}</a>}
              {item.type === "MESSAGE" && !item.completed && <a href="#workshop-discussion" className="wj-action">{t.open}</a>}
              {item.type === "MESSAGE" && !item.completed && <small className="wj-hint">{t.min(item.min_length)}</small>}
              {item.type === "READING" && !item.completed && <button className="wj-action" onClick={() => void markReading(item.id)} disabled={busy === item.id}>{busy === item.id ? t.submitting : t.mark}</button>}
              {item.type === "QUIZ" && quiz && <QuizPanel quiz={quiz} answers={answers} setAnswers={setAnswers} busy={busy} onSubmit={submitAnswer} t={t}/>} 
            </div>}
          </div>
        </article>;
      })}
    </div>
    {journey.completed && <div className="wj-complete"><Flag size={19}/><strong>{t.done}</strong><span>✓</span></div>}
    {error && <p className="wj-error">{error}</p>}
    <style>{styles}</style>
  </section>;
}

function QuizPanel({ quiz, answers, setAnswers, busy, onSubmit, t }: { quiz: Quiz; answers: Record<string, string>; setAnswers: Dispatch<SetStateAction<Record<string, string>>>; busy: string | null; onSubmit: (id: string) => void; t: typeof copy.ar | typeof copy.en }) {
  return <div className="wj-quiz"><div className="wj-quiz-meta"><strong>{quiz.title}</strong><span>Pass: {quiz.passing_score}% · {quiz.questions.length} questions</span></div>{quiz.questions.map((question, index) => <div className="wj-question" key={question.id}><b>{index + 1}. {question.text}</b>{question.type === "TEXT" ? <textarea rows={3} value={answers[question.id] ?? ""} onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: e.target.value }))} placeholder="Write your answer..."/> : <div className="wj-options">{(question.type === "TF" ? [{ id: "true", text: "True" }, { id: "false", text: "False" }] : question.options).map((option) => <button key={option.id} className={answers[question.id] === (question.type === "TF" ? option.id : option.text) ? "selected" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.id]: question.type === "TF" ? option.id : option.text }))}>{option.text}</button>)}</div>}<button className="wj-submit" disabled={!answers[question.id]?.trim() || busy === question.id} onClick={() => onSubmit(question.id)}><Send size={13}/>{busy === question.id ? t.submitting : t.submit}</button></div>)}<small className="wj-hint">{quiz.attempt?.answers.some((answer) => answer.grading_status === "PENDING_REVIEW") ? t.pending : ""}</small></div>;
}

const styles = `.wj{margin-top:18px;padding:22px;border:1px solid rgba(107,30,45,.14);border-radius:22px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB);box-shadow:0 16px 42px rgba(107,30,45,.07);font-family:'Cairo','Tajawal',sans-serif;color:#32101A}.wj-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.wj-kicker{display:flex;align-items:center;gap:6px;color:#6B1E2D;font-size:10px;font-weight:900}.wj h2{margin:6px 0 3px;font-size:22px}.wj p{margin:0;color:#796a62;font-size:11px;line-height:1.75}.wj-score{display:grid;place-items:center;min-width:78px;height:78px;border-radius:20px;background:#32101A;color:#f7f3eb}.wj-score.done{background:#1B5E20}.wj-score strong{font-size:23px}.wj-score span{font-size:9px;color:#d9c9b0}.wj-bar{height:8px;margin:18px 0 7px;border-radius:99px;background:#E5E0D5;overflow:hidden}.wj-bar span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6B1E2D,#6b1e2d);transition:width .3s}.wj-count{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#796a62;font-size:10px}.wj-count button{display:flex;align-items:center;gap:5px;border:0;background:none;color:#6b1e2d;font:inherit;font-weight:900;cursor:pointer}.wj-road{margin-top:14px}.wj-step{display:grid;grid-template-columns:32px 1fr;gap:12px;min-height:64px}.wj-line{display:flex;flex-direction:column;align-items:center}.wj-node{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#EFEAE0;color:#6b1e2d}.wj-step.completed .wj-node{background:#1B5E20;color:#fff}.wj-line i{width:2px;flex:1;margin:4px 0;background:#D9C9B0}.wj-step.completed .wj-line i{background:#1B5E20}.wj-step-body{padding-bottom:10px}.wj-step-button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 0 8px;border:0;background:none;color:inherit;text-align:start;cursor:pointer}.wj-step-button span{display:flex;align-items:center;gap:8px}.wj-step-button b{display:grid;place-items:center;width:21px;height:21px;border-radius:7px;background:#EFEAE0;color:#6b1e2d;font-size:10px}.wj-step.completed .wj-step-button b{background:#E5E0D5;color:#1B5E20}.wj-step-button strong{font-size:12px}.wj-step-button small{display:flex;align-items:center;gap:4px;color:#796A62;font-size:10px;white-space:nowrap}.wj-detail{padding:12px 14px;margin-bottom:8px;border:1px solid #E5E0D5;border-radius:14px;background:#fff}.wj-detail>p{margin-bottom:10px}.wj-action{display:inline-flex;align-items:center;gap:5px;padding:9px 13px;border:0;border-radius:9px;background:#6b1e2d;color:#fff;font:900 10px 'Cairo',sans-serif;text-decoration:none;cursor:pointer}.wj-action:disabled{opacity:.5}.wj-hint{display:block;margin-top:8px;color:#6B1E2D;font-size:10px}.wj-complete{display:flex;align-items:center;gap:8px;margin-top:12px;padding:12px 14px;border-radius:12px;background:#E5E0D5;color:#1B5E20;font-size:12px}.wj-complete span{margin-inline-start:auto}.wj-error{margin-top:10px!important;color:#6b1e2d!important}.wj-quiz{display:grid;gap:10px}.wj-quiz-meta{display:flex;justify-content:space-between;gap:10px;align-items:center}.wj-quiz-meta strong{font-size:12px}.wj-quiz-meta span{font-size:9px;color:#6B1E2D}.wj-question{padding:10px;border:1px solid #E5E0D5;border-radius:11px;background:#FFFFFF}.wj-question>b{display:block;font-size:11px;line-height:1.7}.wj-question textarea{box-sizing:border-box;width:100%;margin-top:8px;resize:vertical;border:1px solid #d9c9b0;border-radius:8px;padding:8px;font:inherit;font-size:11px}.wj-options{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.wj-options button{padding:7px 11px;border:1px solid #d9c9b0;border-radius:8px;background:#fff;color:#32101a;font:700 10px 'Cairo',sans-serif;cursor:pointer}.wj-options button.selected{border-color:#6b1e2d;background:#EFEAE0;color:#6b1e2d}.wj-submit{display:flex;align-items:center;gap:5px;margin-top:8px;padding:7px 10px;border:0;border-radius:8px;background:#32101a;color:#fff;font:800 10px 'Cairo',sans-serif;cursor:pointer}.wj-submit:disabled{opacity:.4;cursor:not-allowed}@media(max-width:520px){.wj{padding:15px}.wj-score{min-width:64px;height:64px}.wj h2{font-size:18px}.wj-quiz-meta{align-items:flex-start;flex-direction:column}}`;
