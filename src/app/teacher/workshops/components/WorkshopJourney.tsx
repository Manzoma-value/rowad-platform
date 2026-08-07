"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileQuestion,
  Flag,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";

type RequirementType = "VIDEO" | "QUIZ" | "MESSAGE" | "READING";

type Requirement = {
  id: string;
  type: RequirementType;
  title: string;
  description: string | null;
  completed: boolean;
  progress: number;
  min_length: number;
  is_required: boolean;
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    question_count: number;
    attempt: { score: number; total: number; completed_at: string | null; passed_at: string | null } | null;
  };
};

type Journey = { completed: boolean; percent: number; requirements: Requirement[] };

type QuizAnswer = {
  question_id: string;
  answer: string;
  is_correct: boolean;
  grading_status: "AUTO_GRADED" | "PENDING_REVIEW" | "GRADED";
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  questions: Array<{
    id: string;
    type: "MCQ" | "TF" | "TEXT";
    text: string;
    options: Array<{ id: string; text: string }>;
  }>;
  attempt: { answers: QuizAnswer[]; score: number; total: number; passed_at?: string | null } | null;
};

type QuizCopy = {
  noQuestions: string;
  quizTitle: string;
  quizIntro: string;
  quizPassed: string;
  quizScore: string;
  question: string;
  of: string;
  submitted: string;
  true: string;
  false: string;
  writtenPlaceholder: string;
  pendingReview: string;
  accepted: string;
  needsReview: string;
  saving: string;
  submit: string;
  previous: string;
  next: string;
};

const icons = {
  VIDEO: PlayCircle,
  READING: BookOpenCheck,
  MESSAGE: MessageSquareText,
  QUIZ: FileQuestion,
} as const;

export function WorkshopJourney({ workshopId, hasAccess, lang, refreshKey = 0 }: { workshopId: string; hasAccess: boolean; lang: "ar" | "sq"; refreshKey?: number }) {
  const isAr = lang === "ar";
  const [journey, setJourney] = useState<Journey | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const copy = isAr ? {
    eyebrow: "رحلة إتمام الورشة",
    title: "خطواتك نحو إتمام الورشة",
    sub: "أنجز الخطوات بالترتيب. كل بطاقة تشرح المطلوب منك وكيف يتم احتسابها مكتملة.",
    completeTitle: "أحسنت! أتممت الورشة بنجاح",
    completeSub: "أنجزت جميع المتطلبات الإلزامية. أصبحت رحلة هذه الورشة مكتملة في سجلك.",
    progress: "نسبة الإنجاز",
    doneSteps: "خطوات مكتملة",
    currentStep: "خطوتك الحالية",
    refresh: "تحديث الإنجاز",
    guideTitle: "كيف تُنجز كل نوع من المتطلبات؟",
    guideSub: "تعرف على الرموز الأربعة قبل أن تبدأ.",
    required: "إلزامي",
    optional: "اختياري",
    completed: "تم الإنجاز",
    active: "ابدأ الآن",
    locked: "أكمل الخطوة السابقة أولًا",
    step: "الخطوة",
    whatToDo: "المطلوب منك",
    completionRule: "متى تُحتسب مكتملة؟",
    videoRule: "بعد مشاهدة جميع الفيديوهات للنهاية والإجابة عن كل الأسئلة الموجودة داخلها.",
    readingRule: "بعد قراءة المادة المطلوبة ثم الضغط على زر «تمت القراءة».",
    messageRule: (min: number) => `بعد كتابة مشاركة تعليمية في نقاش الورشة لا تقل عن ${min} حرفًا.`,
    quizRule: (score: number) => `بعد الإجابة عن كل الأسئلة وتحقيق ${score}% على الأقل. الإجابات الكتابية تحتاج مراجعة الإدارة.`,
    openVideos: "اذهب إلى فيديوهات الورشة",
    openDiscussion: "اكتب ما تعلمته الآن",
    markRead: "قرأت المحتوى وأتممت الخطوة",
    saving: "جارٍ حفظ الإنجاز...",
    showDetails: "عرض التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    quizTitle: "اختبار الورشة",
    quizIntro: "أجب عن سؤال واحد في كل مرة. يمكنك متابعة تقدمك من المؤشر أدناه.",
    question: "السؤال",
    of: "من",
    true: "صح",
    false: "خطأ",
    writtenPlaceholder: "اكتب إجابتك بوضوح، واذكر الفكرة التي تعلمتها...",
    submit: "حفظ الإجابة والمتابعة",
    submitted: "تم حفظ الإجابة",
    pendingReview: "تم الإرسال — بانتظار مراجعة الإدارة",
    accepted: "إجابة صحيحة",
    needsReview: "تم حفظ الإجابة",
    previous: "السابق",
    next: "السؤال التالي",
    quizPassed: "تم اجتياز الاختبار",
    quizScore: "نتيجتك الحالية",
    noQuestions: "لم تُضف الإدارة أسئلة للاختبار بعد.",
    loadError: "تعذر تحميل رحلة الورشة. حاول تحديث الصفحة.",
    typeNames: { VIDEO: "مشاهدة الفيديوهات", READING: "قراءة المحتوى", MESSAGE: "مشاركة ما تعلمت", QUIZ: "اختبار الورشة" },
    typeShort: {
      VIDEO: "شاهد للنهاية وأجب أثناء الفيديو",
      READING: "اقرأ المادة ثم أكد الإتمام",
      MESSAGE: "اكتب انعكاسك في نقاش الورشة",
      QUIZ: "أجب وحقق درجة النجاح المطلوبة",
    },
  } : {
    eyebrow: "Workshop completion journey",
    title: "Your path to workshop completion",
    sub: "Complete the steps in order. Every card explains the action and its completion rule.",
    completeTitle: "Well done! You completed the workshop", completeSub: "Every required step is complete and the workshop is now recorded in your journey.",
    progress: "Overall progress", doneSteps: "Steps completed", currentStep: "Current step", refresh: "Refresh progress", guideTitle: "How does each requirement work?", guideSub: "Learn the four symbols before you begin.", required: "Required", optional: "Optional", completed: "Completed", active: "Start now", locked: "Complete the previous step first", step: "Step", whatToDo: "What to do", completionRule: "When is it complete?",
    videoRule: "After watching every video to the end and answering all embedded questions.", readingRule: "After reading the assigned content and selecting “Mark as read”.", messageRule: (min: number) => `After posting a learning reflection of at least ${min} characters in the workshop discussion.`, quizRule: (score: number) => `After answering every question and scoring at least ${score}%. Written answers require admin review.`,
    openVideos: "Go to workshop videos", openDiscussion: "Share what you learned", markRead: "I finished the reading", saving: "Saving progress...", showDetails: "Show details", hideDetails: "Hide details",
    quizTitle: "Workshop quiz", quizIntro: "Answer one question at a time and follow your progress below.", question: "Question", of: "of", true: "True", false: "False", writtenPlaceholder: "Write a clear response and explain what you learned...", submit: "Save answer and continue", submitted: "Answer saved", pendingReview: "Submitted — awaiting admin review", accepted: "Correct answer", needsReview: "Answer saved", previous: "Previous", next: "Next question", quizPassed: "Quiz passed", quizScore: "Current score", noQuestions: "The admin has not added quiz questions yet.", loadError: "The workshop journey could not be loaded. Refresh the page.",
    typeNames: { VIDEO: "Watch videos", READING: "Read content", MESSAGE: "Share your learning", QUIZ: "Workshop quiz" },
    typeShort: { VIDEO: "Watch to the end and answer in-video questions", READING: "Read the material and confirm completion", MESSAGE: "Post your reflection in the workshop discussion", QUIZ: "Answer all questions and reach the passing score" },
  };

  const load = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const [journeyResponse, quizResponse] = await Promise.all([
        fetch(`/api/teacher/workshops/${workshopId}/journey`, { cache: "no-store" }),
        fetch(`/api/teacher/workshops/${workshopId}/quiz`, { cache: "no-store" }),
      ]);
      if (!journeyResponse.ok) throw new Error("load_failed");
      const [journeyPayload, quizPayload] = await Promise.all([journeyResponse.json(), quizResponse.json()]);
      const nextJourney = journeyPayload.journey as Journey;
      const nextQuiz = (quizPayload.quiz ?? null) as Quiz | null;
      setJourney(nextJourney);
      setQuiz(nextQuiz);
      if (nextQuiz?.attempt) {
        const saved = Object.fromEntries(nextQuiz.attempt.answers.map((answer) => [answer.question_id, answer.answer]));
        setAnswers(saved);
        const firstUnanswered = nextQuiz.questions.findIndex((question) => !saved[question.id]);
        setQuizIndex(firstUnanswered >= 0 ? firstUnanswered : Math.max(0, nextQuiz.questions.length - 1));
      }
      const firstIncomplete = nextJourney.requirements.find((requirement) => requirement.is_required && !requirement.completed);
      setExpandedId((current) => current ?? firstIncomplete?.id ?? nextJourney.requirements[0]?.id ?? null);
      setError("");
    } catch {
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [hasAccess, workshopId, copy.loadError]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("workshop-journey-refresh", refresh);
    return () => window.removeEventListener("workshop-journey-refresh", refresh);
  }, [load]);

  const required = journey?.requirements.filter((requirement) => requirement.is_required) ?? [];
  const doneCount = required.filter((requirement) => requirement.completed).length;
  const currentIndex = journey?.requirements.findIndex((requirement) => requirement.is_required && !requirement.completed) ?? -1;

  const typeGuide = useMemo(() => (Object.keys(icons) as RequirementType[]), []);

  async function markReading(requirementId: string) {
    setBusy(requirementId);
    setError("");
    try {
      const response = await fetch(`/api/teacher/workshops/${workshopId}/journey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement_id: requirementId }),
      });
      if (!response.ok) throw new Error("save_failed");
      const payload = await response.json();
      setJourney(payload.journey);
      const next = payload.journey.requirements.find((requirement: Requirement) => requirement.is_required && !requirement.completed);
      setExpandedId(next?.id ?? null);
    } catch {
      setError(copy.loadError);
    } finally {
      setBusy(null);
    }
  }

  async function submitAnswer(questionId: string) {
    const answer = answers[questionId]?.trim();
    if (!answer || !quiz) return;
    setBusy(questionId);
    setError("");
    try {
      const response = await fetch(`/api/teacher/workshops/${workshopId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, answer }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error("submit_failed");
      setQuiz((current) => current ? {
        ...current,
        attempt: payload.attempt ? {
          ...payload.attempt,
          answers: [...(current.attempt?.answers ?? []).filter((item) => item.question_id !== questionId), payload.answer],
        } : current.attempt,
      } : current);
      setJourney(payload.journey);
    } catch {
      setError(copy.loadError);
    } finally {
      setBusy(null);
    }
  }

  if (!hasAccess) return null;
  if (loading && !journey) return <section className="supervisor-journey supervisor-journey--loading"><RefreshCw className="spin" size={22}/><span>{copy.title}</span><style>{styles}</style></section>;
  if (!journey) return null;

  return (
    <section className={`supervisor-journey${journey.completed ? " is-complete" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <header className="supervisor-journey__hero">
        <div className="supervisor-journey__intro">
          <span className="supervisor-journey__eyebrow"><Sparkles size={15}/>{copy.eyebrow}</span>
          <h2>{journey.completed ? copy.completeTitle : copy.title}</h2>
          <p>{journey.completed ? copy.completeSub : copy.sub}</p>
        </div>
        <div className="supervisor-journey__progress-ring" style={{ "--journey-progress": `${journey.percent * 3.6}deg` } as CSSProperties}>
          <div><strong>{journey.percent}%</strong><span>{copy.progress}</span></div>
        </div>
      </header>

      <div className="supervisor-journey__summary">
        <div><span><CheckCircle2 size={16}/>{copy.doneSteps}</span><strong>{doneCount}<small>/ {required.length}</small></strong></div>
        <div><span><Flag size={16}/>{copy.currentStep}</span><strong>{currentIndex >= 0 ? currentIndex + 1 : required.length}</strong></div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={15}/>{copy.refresh}</button>
      </div>

      <div className="supervisor-journey__progress"><span style={{ width: `${journey.percent}%` }}/></div>

      <div className="requirement-guide">
        <header><div><ListChecks size={19}/></div><span><strong>{copy.guideTitle}</strong><small>{copy.guideSub}</small></span></header>
        <div>{typeGuide.map((type) => { const Icon = icons[type]; return <article key={type}><span><Icon size={19}/></span><div><strong>{copy.typeNames[type]}</strong><small>{copy.typeShort[type]}</small></div></article>; })}</div>
      </div>

      <div className="supervisor-roadmap">
        {journey.requirements.map((requirement, index) => {
          const Icon = icons[requirement.type];
          const locked = currentIndex >= 0 && index > currentIndex && requirement.is_required;
          const active = !requirement.completed && !locked && index === currentIndex;
          const expanded = expandedId === requirement.id;
          const rule = requirement.type === "VIDEO" ? copy.videoRule : requirement.type === "READING" ? copy.readingRule : requirement.type === "MESSAGE" ? copy.messageRule(requirement.min_length) : copy.quizRule(requirement.quiz?.passing_score ?? quiz?.passing_score ?? 70);
          return <article key={requirement.id} className={`supervisor-step supervisor-step--${requirement.type.toLowerCase()}${requirement.completed ? " completed" : ""}${active ? " active" : ""}${locked ? " locked" : ""}`}>
            <div className="supervisor-step__rail"><span>{requirement.completed ? <Check size={19}/> : locked ? <LockKeyhole size={16}/> : <Icon size={19}/>}</span>{index < journey.requirements.length - 1 && <i/>}</div>
            <div className="supervisor-step__card">
              <header>
                <div className="supervisor-step__heading"><span>{copy.step} {index + 1} · {copy.typeNames[requirement.type]}</span><h3>{requirement.title}</h3></div>
                <div className="supervisor-step__status"><span className={requirement.completed ? "done" : active ? "active" : locked ? "locked" : "optional"}>{requirement.completed ? copy.completed : active ? copy.active : locked ? copy.locked : copy.optional}</span><strong>{requirement.progress}%</strong></div>
              </header>
              <div className="supervisor-step__mini-progress"><span style={{ width: `${requirement.progress}%` }}/></div>
              <p className="supervisor-step__description">{requirement.description}</p>
              <button type="button" className="supervisor-step__details-toggle" onClick={() => setExpandedId(expanded ? null : requirement.id)}><ChevronDown size={15}/>{expanded ? copy.hideDetails : copy.showDetails}</button>

              {expanded && <div className="supervisor-step__details">
                <div><span><Circle size={14}/>{copy.whatToDo}</span><p>{requirement.description || copy.typeShort[requirement.type]}</p></div>
                <div><span><CheckCircle2 size={14}/>{copy.completionRule}</span><p>{rule}</p></div>
                {!locked && !requirement.completed && <div className="supervisor-step__action">
                  {requirement.type === "VIDEO" && <a href="#workshop-videos"><PlayCircle size={16}/>{copy.openVideos}</a>}
                  {requirement.type === "MESSAGE" && <a href="#workshop-discussion"><MessageSquareText size={16}/>{copy.openDiscussion}</a>}
                  {requirement.type === "READING" && <button type="button" onClick={() => void markReading(requirement.id)} disabled={busy === requirement.id}><BookOpenCheck size={16}/>{busy === requirement.id ? copy.saving : copy.markRead}</button>}
                </div>}
                {locked && <div className="supervisor-step__locked"><LockKeyhole size={16}/><span>{copy.locked}</span></div>}
                {requirement.type === "QUIZ" && !locked && quiz && <QuizWorkspace quiz={quiz} isAr={isAr} copy={copy} answers={answers} setAnswers={setAnswers} quizIndex={quizIndex} setQuizIndex={setQuizIndex} busy={busy} submitAnswer={submitAnswer}/>}
              </div>}
            </div>
          </article>;
        })}
      </div>

      {journey.completed && <div className="supervisor-journey__celebration"><span><Trophy size={26}/></span><div><strong>{copy.completeTitle}</strong><p>{copy.completeSub}</p></div><Award size={30}/></div>}
      {error && <p className="supervisor-journey__error" role="alert">{error}</p>}
      <style>{styles}</style>
    </section>
  );
}

function QuizWorkspace({ quiz, isAr, copy, answers, setAnswers, quizIndex, setQuizIndex, busy, submitAnswer }: {
  quiz: Quiz;
  isAr: boolean;
  copy: QuizCopy;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  quizIndex: number;
  setQuizIndex: Dispatch<SetStateAction<number>>;
  busy: string | null;
  submitAnswer: (questionId: string) => Promise<void>;
}) {
  if (quiz.questions.length === 0) return <div className="supervisor-quiz supervisor-quiz--empty"><FileQuestion size={24}/><span>{copy.noQuestions}</span></div>;
  const question = quiz.questions[Math.min(quizIndex, quiz.questions.length - 1)];
  const answerRecord = quiz.attempt?.answers.find((answer) => answer.question_id === question.id);
  const answeredCount = quiz.attempt?.answers.length ?? 0;
  const passed = !!quiz.attempt?.passed_at;

  return <div className="supervisor-quiz">
    <header><div><span><FileQuestion size={15}/>{copy.quizTitle}</span><h4>{quiz.title}</h4><p>{quiz.description || copy.quizIntro}</p></div><div className={passed ? "passed" : ""}><strong>{quiz.attempt?.score ?? 0}/{quiz.questions.length}</strong><span>{passed ? copy.quizPassed : copy.quizScore}</span></div></header>
    <div className="supervisor-quiz__timeline">{quiz.questions.map((item, index) => <button type="button" key={item.id} className={`${index === quizIndex ? "current" : ""}${quiz.attempt?.answers.some((answer) => answer.question_id === item.id) ? " answered" : ""}`} onClick={() => setQuizIndex(index)} aria-label={`${copy.question} ${index + 1}`}>{quiz.attempt?.answers.some((answer) => answer.question_id === item.id) ? <Check size={11}/> : index + 1}</button>)}</div>
    <div className="supervisor-quiz__question">
      <div className="supervisor-quiz__question-meta"><span>{copy.question} {quizIndex + 1} {copy.of} {quiz.questions.length}</span><small>{answeredCount}/{quiz.questions.length} {copy.submitted}</small></div>
      <h5>{question.text}</h5>
      {question.type === "TEXT" ? <textarea rows={5} maxLength={4000} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={copy.writtenPlaceholder}/> : <div className="supervisor-quiz__options">{(question.type === "TF" ? [{ id: "true", text: copy.true, value: "true" }, { id: "false", text: copy.false, value: "false" }] : question.options.map((option) => ({ ...option, value: option.text }))).map((option, index) => <button type="button" key={option.id} className={answers[question.id] === option.value ? "selected" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}><span>{question.type === "TF" ? option.value === "true" ? <Check size={15}/> : "×" : String.fromCharCode(65 + index)}</span><strong>{option.text}</strong>{answers[question.id] === option.value && <CheckCircle2 size={17}/>}</button>)}</div>}
      {answerRecord && <div className={`supervisor-quiz__result ${answerRecord.grading_status === "PENDING_REVIEW" ? "pending" : answerRecord.is_correct ? "correct" : "saved"}`}><CheckCircle2 size={15}/><span>{answerRecord.grading_status === "PENDING_REVIEW" ? copy.pendingReview : answerRecord.is_correct ? copy.accepted : copy.needsReview}</span></div>}
      <button type="button" className="supervisor-quiz__submit" disabled={!answers[question.id]?.trim() || busy === question.id} onClick={() => void submitAnswer(question.id)}><Send size={15}/>{busy === question.id ? copy.saving : copy.submit}</button>
    </div>
    <footer><button type="button" onClick={() => setQuizIndex((index) => Math.max(0, index - 1))} disabled={quizIndex === 0}>{isAr ? <ArrowRight size={15}/> : <ArrowLeft size={15}/>} {copy.previous}</button><span>{quizIndex + 1} / {quiz.questions.length}</span><button type="button" onClick={() => setQuizIndex((index) => Math.min(quiz.questions.length - 1, index + 1))} disabled={quizIndex === quiz.questions.length - 1}>{copy.next} {isAr ? <ArrowLeft size={15}/> : <ArrowRight size={15}/>}</button></footer>
  </div>;
}

const styles = `
.supervisor-journey{margin:20px 0;padding:clamp(18px,2.8vw,30px);border:1px solid rgba(107,30,45,.14);border-radius:28px;background:linear-gradient(145deg,#FFFBF5,#F7F3EB);box-shadow:0 20px 55px rgba(107,30,45,.09);font-family:'Cairo','Tajawal',sans-serif;color:#32101A}.supervisor-journey *{box-sizing:border-box}.supervisor-journey button,.supervisor-journey textarea{font-family:inherit}.supervisor-journey button,.supervisor-journey a{transition:transform .16s ease,box-shadow .16s ease,background .16s ease}.supervisor-journey button:hover:not(:disabled),.supervisor-journey a:hover{transform:translateY(-1px)}.supervisor-journey button:focus-visible,.supervisor-journey a:focus-visible,.supervisor-journey textarea:focus-visible{outline:3px solid rgba(107,30,45,.15);outline-offset:2px}
.supervisor-journey--loading{min-height:150px;display:flex;align-items:center;justify-content:center;gap:9px;color:#6B1E2D;font-size:11px;font-weight:900}.spin{animation:journey-spin .8s linear infinite}@keyframes journey-spin{to{transform:rotate(360deg)}}
.supervisor-journey__hero{display:flex;align-items:center;justify-content:space-between;gap:24px}.supervisor-journey__intro{max-width:760px}.supervisor-journey__eyebrow{display:flex;align-items:center;gap:7px;color:#6B1E2D;font-size:10.5px;font-weight:900}.supervisor-journey__hero h2{margin:8px 0 5px;font-size:clamp(24px,3vw,34px);line-height:1.35}.supervisor-journey__hero p{margin:0;color:#796A62;font-size:12px;line-height:1.85}.supervisor-journey__progress-ring{--journey-progress:0deg;width:112px;height:112px;display:grid;place-items:center;flex:none;border-radius:50%;background:conic-gradient(#6B1E2D var(--journey-progress),#E5E0D5 0);box-shadow:0 10px 28px rgba(107,30,45,.12)}.supervisor-journey__progress-ring:before{content:'';grid-area:1/1;width:88px;height:88px;border-radius:50%;background:#FFFBF5}.supervisor-journey__progress-ring>div{grid-area:1/1;position:relative;display:grid;place-items:center}.supervisor-journey__progress-ring strong{font-size:24px}.supervisor-journey__progress-ring span{color:#796A62;font-size:8.5px;font-weight:800}
.supervisor-journey__summary{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:18px}.supervisor-journey__summary>div{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:58px;padding:10px 13px;border:1px solid #E5E0D5;border-radius:14px;background:rgba(255,255,255,.72)}.supervisor-journey__summary>div>span{display:flex;align-items:center;gap:6px;color:#796A62;font-size:9.5px;font-weight:800}.supervisor-journey__summary svg{color:#6B1E2D}.supervisor-journey__summary strong{font-size:20px}.supervisor-journey__summary small{color:#8C8274;font-size:9px}.supervisor-journey__summary>button{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #D9C9B0;border-radius:14px;background:#fff;color:#6B1E2D;padding:0 14px;font-size:9.5px;font-weight:900;cursor:pointer}.supervisor-journey__progress{height:9px;margin-top:10px;border-radius:999px;background:#E5E0D5;overflow:hidden}.supervisor-journey__progress span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#4A0E1C,#6B1E2D);transition:width .3s ease}
.requirement-guide{margin-top:20px;padding:15px;border:1px solid #D9C9B0;border-radius:18px;background:#fff}.requirement-guide>header{display:flex;align-items:center;gap:9px;margin-bottom:12px}.requirement-guide>header>div{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#32101A;color:#fff}.requirement-guide>header strong,.requirement-guide>header small{display:block}.requirement-guide>header strong{font-size:11px}.requirement-guide>header small{margin-top:2px;color:#796A62;font-size:8.5px}.requirement-guide>div{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.requirement-guide article{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:8px;padding:9px;border:1px solid #E5E0D5;border-radius:12px;background:#FFFBF5}.requirement-guide article>span{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#EFEAE0;color:#6B1E2D}.requirement-guide article strong,.requirement-guide article small{display:block}.requirement-guide article strong{font-size:9.5px}.requirement-guide article small{margin-top:2px;color:#796A62;font-size:7.8px;line-height:1.5}
.supervisor-roadmap{margin-top:22px}.supervisor-step{display:grid;grid-template-columns:42px minmax(0,1fr);gap:13px;min-height:130px}.supervisor-step__rail{display:flex;flex-direction:column;align-items:center}.supervisor-step__rail>span{width:42px;height:42px;display:grid;place-items:center;flex:none;border:2px solid #D9C9B0;border-radius:50%;background:#FFFBF5;color:#6B1E2D;box-shadow:0 5px 14px rgba(107,30,45,.08)}.supervisor-step.active .supervisor-step__rail>span{border-color:#6B1E2D;background:#6B1E2D;color:#fff;box-shadow:0 0 0 6px rgba(107,30,45,.08)}.supervisor-step.completed .supervisor-step__rail>span{border-color:#1B5E20;background:#1B5E20;color:#fff}.supervisor-step.locked .supervisor-step__rail>span{color:#8C8274;background:#EFEAE0}.supervisor-step__rail i{width:2px;flex:1;margin:6px 0;background:#D9C9B0}.supervisor-step.completed .supervisor-step__rail i{background:#1B5E20}.supervisor-step__card{min-width:0;margin-bottom:12px;padding:16px;border:1px solid #E5E0D5;border-radius:18px;background:#fff}.supervisor-step.active .supervisor-step__card{border-color:rgba(107,30,45,.35);box-shadow:0 14px 36px rgba(107,30,45,.09)}.supervisor-step.completed .supervisor-step__card{border-color:rgba(27,94,32,.18);background:rgba(255,255,255,.82)}.supervisor-step.locked .supervisor-step__card{opacity:.72;background:#F7F3EB}.supervisor-step__card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.supervisor-step__heading>span{display:block;color:#6B1E2D;font-size:8.5px;font-weight:900}.supervisor-step__heading h3{margin:4px 0 0;font-size:15px}.supervisor-step__status{display:flex;align-items:center;gap:7px}.supervisor-step__status>span{padding:4px 8px;border-radius:999px;background:#EFEAE0;color:#796A62;font-size:8px;font-weight:900;white-space:nowrap}.supervisor-step__status>span.done{background:rgba(27,94,32,.1);color:#1B5E20}.supervisor-step__status>span.active{background:rgba(107,30,45,.08);color:#6B1E2D}.supervisor-step__status strong{min-width:38px;color:#6B1E2D;font-size:13px;text-align:end}.supervisor-step__mini-progress{height:5px;margin:10px 0;border-radius:999px;background:#EFEAE0;overflow:hidden}.supervisor-step__mini-progress span{display:block;height:100%;border-radius:999px;background:#6B1E2D}.supervisor-step.completed .supervisor-step__mini-progress span{background:#1B5E20}.supervisor-step__description{margin:0;color:#655B53;font-size:10.5px;line-height:1.8}.supervisor-step__details-toggle{display:flex;align-items:center;gap:5px;margin-top:9px;padding:0;border:0;background:none;color:#6B1E2D;font-size:9px;font-weight:900;cursor:pointer}.supervisor-step__details{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px;padding-top:11px;border-top:1px solid #EFEAE0}.supervisor-step__details>div:not(.supervisor-step__action):not(.supervisor-step__locked):not(.supervisor-quiz){padding:10px;border-radius:11px;background:#FFFBF5}.supervisor-step__details>div>span{display:flex;align-items:center;gap:5px;color:#6B1E2D;font-size:8.5px;font-weight:900}.supervisor-step__details>div>p{margin:4px 0 0;color:#655B53;font-size:9.5px;line-height:1.75}.supervisor-step__action,.supervisor-step__locked{grid-column:1/-1}.supervisor-step__action a,.supervisor-step__action button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;border:0;border-radius:11px;background:linear-gradient(135deg,#4A0E1C,#6B1E2D);color:#fff;padding:0 15px;font-size:10px;font-weight:900;text-decoration:none;cursor:pointer;box-shadow:0 8px 18px rgba(107,30,45,.14)}.supervisor-step__locked{display:flex;align-items:center;gap:7px;padding:10px 12px;border-radius:10px;background:#EFEAE0;color:#796A62;font-size:9px;font-weight:900}
.supervisor-quiz{grid-column:1/-1;margin-top:2px;border:1px solid #D9C9B0;border-radius:16px;overflow:hidden;background:#F7F3EB}.supervisor-quiz--empty{display:flex;align-items:center;justify-content:center;gap:8px;min-height:100px;color:#796A62;font-size:10px}.supervisor-quiz>header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:15px;background:linear-gradient(135deg,#32101A,#4A0E1C);color:#fff}.supervisor-quiz>header>div:first-child{max-width:650px}.supervisor-quiz>header>div:first-child>span{display:flex;align-items:center;gap:5px;color:#D9C9B0;font-size:8.5px;font-weight:900}.supervisor-quiz>header h4{margin:4px 0 2px;font-size:15px}.supervisor-quiz>header p{margin:0;color:rgba(255,255,255,.7);font-size:9px;line-height:1.7}.supervisor-quiz>header>div:last-child{display:grid;place-items:center;min-width:74px;padding:8px;border:1px solid rgba(255,255,255,.17);border-radius:12px;background:rgba(255,255,255,.08)}.supervisor-quiz>header>div:last-child.passed{background:rgba(27,94,32,.3)}.supervisor-quiz>header>div:last-child strong{font-size:16px}.supervisor-quiz>header>div:last-child span{font-size:7.5px;color:#D9C9B0}.supervisor-quiz__timeline{display:flex;gap:5px;padding:12px 14px 6px;overflow-x:auto}.supervisor-quiz__timeline button{width:28px;height:28px;display:grid;place-items:center;flex:none;border:1px solid #D9C9B0;border-radius:9px;background:#fff;color:#796A62;font-size:8.5px;font-weight:900;cursor:pointer}.supervisor-quiz__timeline button.answered{border-color:rgba(27,94,32,.28);background:rgba(27,94,32,.08);color:#1B5E20}.supervisor-quiz__timeline button.current{border-color:#6B1E2D;background:#6B1E2D;color:#fff;box-shadow:0 0 0 3px rgba(107,30,45,.08)}.supervisor-quiz__question{margin:6px 14px 12px;padding:14px;border:1px solid #E5E0D5;border-radius:13px;background:#fff}.supervisor-quiz__question-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#6B1E2D;font-size:8.5px;font-weight:900}.supervisor-quiz__question-meta small{color:#796A62;font-size:8px}.supervisor-quiz__question h5{margin:9px 0 12px;font-size:13px;line-height:1.75}.supervisor-quiz__question>textarea{width:100%;min-height:130px;resize:vertical;border:1px solid #D9C9B0;border-radius:11px;background:#FFFBF5;padding:11px;color:#32101A;font-size:10.5px;line-height:1.8}.supervisor-quiz__options{display:grid;grid-template-columns:1fr 1fr;gap:7px}.supervisor-quiz__options button{min-height:48px;display:grid;grid-template-columns:30px minmax(0,1fr) 18px;align-items:center;gap:7px;border:1px solid #D9C9B0;border-radius:11px;background:#FFFBF5;color:#32101A;padding:8px;text-align:start;cursor:pointer}.supervisor-quiz__options button>span{width:29px;height:29px;display:grid;place-items:center;border-radius:8px;background:#EFEAE0;color:#6B1E2D;font-size:9px;font-weight:900}.supervisor-quiz__options button>strong{font-size:10px}.supervisor-quiz__options button.selected{border-color:#6B1E2D;background:rgba(107,30,45,.055);box-shadow:0 0 0 2px rgba(107,30,45,.06)}.supervisor-quiz__options button.selected>span{background:#6B1E2D;color:#fff}.supervisor-quiz__options button>svg{color:#6B1E2D}.supervisor-quiz__result{display:flex;align-items:center;gap:6px;margin-top:9px;padding:9px 10px;border-radius:9px;background:#EFEAE0;color:#6B1E2D;font-size:9px;font-weight:900}.supervisor-quiz__result.correct{background:rgba(27,94,32,.09);color:#1B5E20}.supervisor-quiz__submit{display:flex;align-items:center;justify-content:center;gap:6px;min-height:42px;margin-top:10px;border:0;border-radius:10px;background:#6B1E2D;color:#fff;padding:0 14px;font-size:9.5px;font-weight:900;cursor:pointer}.supervisor-quiz__submit:disabled{opacity:.42;cursor:not-allowed}.supervisor-quiz>footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px 12px}.supervisor-quiz>footer button{display:flex;align-items:center;gap:5px;border:1px solid #D9C9B0;border-radius:9px;background:#fff;color:#6B1E2D;padding:7px 10px;font-size:8.5px;font-weight:900;cursor:pointer}.supervisor-quiz>footer button:disabled{opacity:.35;cursor:not-allowed}.supervisor-quiz>footer span{color:#796A62;font-size:8.5px;font-weight:900}
.supervisor-journey__celebration{display:grid;grid-template-columns:48px minmax(0,1fr) 42px;align-items:center;gap:12px;margin-top:18px;padding:15px;border:1px solid rgba(27,94,32,.2);border-radius:16px;background:rgba(27,94,32,.07);color:#1B5E20}.supervisor-journey__celebration>span{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:#1B5E20;color:#fff}.supervisor-journey__celebration strong{font-size:12px}.supervisor-journey__celebration p{margin:3px 0 0;font-size:9.5px;line-height:1.7}.supervisor-journey__error{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:rgba(107,30,45,.08);color:#6B1E2D;font-size:9.5px;font-weight:900}
@media(max-width:950px){.requirement-guide>div{grid-template-columns:1fr 1fr}}
@media(max-width:680px){.supervisor-journey{padding:15px;border-radius:20px}.supervisor-journey__hero{align-items:flex-start}.supervisor-journey__progress-ring{width:88px;height:88px}.supervisor-journey__progress-ring:before{width:68px;height:68px}.supervisor-journey__progress-ring strong{font-size:18px}.supervisor-journey__summary{grid-template-columns:1fr 1fr}.supervisor-journey__summary>button{grid-column:1/-1;min-height:42px}.requirement-guide>div{grid-template-columns:1fr}.supervisor-step{grid-template-columns:32px minmax(0,1fr);gap:8px}.supervisor-step__rail>span{width:32px;height:32px}.supervisor-step__card{padding:12px;border-radius:15px}.supervisor-step__card>header{align-items:flex-start;flex-direction:column}.supervisor-step__status{width:100%;justify-content:space-between}.supervisor-step__details{grid-template-columns:1fr}.supervisor-step__action a,.supervisor-step__action button{width:100%}.supervisor-quiz>header{flex-direction:column}.supervisor-quiz>header>div:last-child{width:100%;display:flex;justify-content:space-between}.supervisor-quiz__options{grid-template-columns:1fr}.supervisor-quiz__question{margin-inline:9px;padding:11px}.supervisor-quiz__timeline{padding-inline:9px}.supervisor-quiz>footer{padding-inline:9px}}
@media(max-width:430px){.supervisor-journey__hero{display:grid;grid-template-columns:minmax(0,1fr) 74px;gap:10px}.supervisor-journey__progress-ring{width:74px;height:74px}.supervisor-journey__progress-ring:before{width:58px;height:58px}.supervisor-journey__progress-ring strong{font-size:15px}.supervisor-journey__progress-ring span{display:none}.supervisor-journey__hero h2{font-size:20px}.supervisor-journey__hero p{font-size:10px}.supervisor-journey__summary{grid-template-columns:1fr}.supervisor-step__heading h3{font-size:13px}.supervisor-step__details{margin-inline:-2px}.supervisor-quiz{margin-inline:-3px}.supervisor-quiz>footer button{padding:7px}.supervisor-journey__celebration{grid-template-columns:42px minmax(0,1fr)}.supervisor-journey__celebration>svg{display:none}}
`;
