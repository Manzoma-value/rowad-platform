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
  Eye,
  EyeOff,
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

export function WorkshopJourney({ workshopId, hasAccess, lang, refreshKey = 0, embedded = false }: { workshopId: string; hasAccess: boolean; lang: "ar" | "sq"; refreshKey?: number; embedded?: boolean }) {
  const isAr = lang === "ar";
  const [journey, setJourney] = useState<Journey | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [panelHidden, setPanelHidden] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

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
    hideJourney: "إخفاء لوحة الرحلة",
    showJourney: "إظهار لوحة الرحلة",
    hiddenTitle: "رحلة الورشة مخفية",
    hiddenSub: "يمكنك مواصلة محتوى الورشة أو إظهار الخريطة في أي وقت.",
    nextUp: "الخطوة التالية",
    showGuide: "شرح أنواع المتطلبات",
    hideGuide: "إخفاء الشرح",
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
    eyebrow: "Rrugëtimi i përfundimit të forumit",
    title: "Hapat e tu drejt përfundimit",
    sub: "Përfundoji hapat me radhë. Çdo kartë tregon qartë detyrën dhe mënyrën si llogaritet e përfunduar.",
    completeTitle: "Shkëlqyeshëm! E përfundove forumin",
    completeSub: "Të gjitha kërkesat e detyrueshme janë plotësuar dhe përfundimi është regjistruar.",
    progress: "Përparimi",
    doneSteps: "Hapa të përfunduar",
    currentStep: "Hapi aktual",
    refresh: "Rifresko përparimin",
    guideTitle: "Si funksionon çdo kërkesë?",
    guideSub: "Njihu me katër llojet para se të fillosh.",
    required: "E detyrueshme",
    optional: "Opsionale",
    completed: "Përfunduar",
    active: "Fillo tani",
    locked: "Përfundo fillimisht hapin e mëparshëm",
    step: "Hapi",
    whatToDo: "Çfarë duhet të bësh",
    completionRule: "Kur llogaritet i përfunduar?",
    videoRule: "Pasi t'i shikosh të gjitha videot deri në fund dhe t'u përgjigjesh pyetjeve brenda tyre.",
    readingRule: "Pasi ta lexosh materialin dhe të zgjedhësh “E përfundova leximin”.",
    messageRule: (min: number) => `Pasi të publikosh në diskutim një reflektim me të paktën ${min} karaktere.`,
    quizRule: (score: number) => `Pasi t'u përgjigjesh të gjitha pyetjeve dhe të arrish të paktën ${score}%. Përgjigjet me shkrim shqyrtohen nga administrata.`,
    openVideos: "Shko te videot",
    openDiscussion: "Ndaj çfarë mësove",
    markRead: "E lexova dhe e përfundova",
    saving: "Duke ruajtur...",
    showDetails: "Shfaq hollësitë",
    hideDetails: "Fshih hollësitë",
    hideJourney: "Fshih panelin e rrugëtimit",
    showJourney: "Shfaq panelin e rrugëtimit",
    hiddenTitle: "Rrugëtimi është fshehur",
    hiddenSub: "Vazhdo me përmbajtjen ose rihape hartën kur të duash.",
    nextUp: "Hapi i ardhshëm",
    showGuide: "Shpjego llojet e kërkesave",
    hideGuide: "Fshih shpjegimin",
    quizTitle: "Testi i forumit",
    quizIntro: "Përgjigju një pyetjeje në çdo hap dhe ndiq përparimin më poshtë.",
    question: "Pyetja",
    of: "nga",
    true: "E vërtetë",
    false: "E gabuar",
    writtenPlaceholder: "Shkruaj një përgjigje të qartë dhe shpjego çfarë mësove...",
    submit: "Ruaj dhe vazhdo",
    submitted: "Përgjigje të ruajtura",
    pendingReview: "U dërgua — në pritje të shqyrtimit",
    accepted: "Përgjigje e saktë",
    needsReview: "Përgjigjja u ruajt",
    previous: "E mëparshmja",
    next: "Pyetja tjetër",
    quizPassed: "Testi u kalua",
    quizScore: "Rezultati aktual",
    noQuestions: "Administrata nuk ka shtuar ende pyetje.",
    loadError: "Rrugëtimi nuk u ngarkua. Rifresko faqen.",
    typeNames: { VIDEO: "Shiko videot", READING: "Lexo përmbajtjen", MESSAGE: "Ndaj reflektimin", QUIZ: "Testi i forumit" },
    typeShort: { VIDEO: "Shiko deri në fund dhe përgjigju", READING: "Lexo dhe konfirmo përfundimin", MESSAGE: "Shkruaj reflektimin në diskutim", QUIZ: "Përgjigju dhe arrij rezultatin kalues" },
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

  useEffect(() => {
    if (embedded) return;
    try {
      setPanelHidden(window.localStorage.getItem(`workshop-journey-hidden:${workshopId}`) === "true");
    } catch {
      setPanelHidden(false);
    }
  }, [embedded, workshopId]);

  const required = journey?.requirements.filter((requirement) => requirement.is_required) ?? [];
  const doneCount = required.filter((requirement) => requirement.completed).length;
  const currentIndex = journey?.requirements.findIndex((requirement) => requirement.is_required && !requirement.completed) ?? -1;
  const nextRequirement = currentIndex >= 0 ? journey?.requirements[currentIndex] : null;

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
      window.dispatchEvent(new Event("workshop-attendance-recorded"));
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

  function togglePanel() {
    setPanelHidden((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(`workshop-journey-hidden:${workshopId}`, String(next));
      } catch {
        // The control still works for this visit when storage is unavailable.
      }
      return next;
    });
  }

  if (!hasAccess) return null;
  if (loading && !journey) return <section className="supervisor-journey supervisor-journey--loading"><RefreshCw className="spin" size={22}/><span>{copy.title}</span><style>{styles}</style></section>;
  if (!journey) return null;

  if (panelHidden && !embedded) {
    return (
      <section id="workshop-journey" className="supervisor-journey supervisor-journey--collapsed" dir={isAr ? "rtl" : "ltr"}>
        <span className="supervisor-journey__collapsed-icon"><Sparkles size={20}/></span>
        <div className="supervisor-journey__collapsed-copy">
          <span>{copy.hiddenTitle}</span>
          <strong>{nextRequirement ? `${copy.nextUp}: ${nextRequirement.title}` : copy.completeTitle}</strong>
          <small>{copy.hiddenSub}</small>
        </div>
        <div className="supervisor-journey__collapsed-progress" aria-label={`${copy.progress} ${journey.percent}%`}>
          <span><b>{journey.percent}%</b><small>{copy.progress}</small></span>
          <i><b style={{ width: `${journey.percent}%` }}/></i>
        </div>
        <button type="button" onClick={togglePanel}><Eye size={16}/>{copy.showJourney}</button>
        <style>{styles}</style>
      </section>
    );
  }

  return (
    <section id="workshop-journey" className={`supervisor-journey${journey.completed ? " is-complete" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="supervisor-journey__topline">
        <span><Sparkles size={15}/>{copy.eyebrow}</span>
        {!embedded && <button type="button" onClick={togglePanel}><EyeOff size={15}/>{copy.hideJourney}</button>}
      </div>
      <header className="supervisor-journey__hero">
        <div className="supervisor-journey__intro">
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

      <button type="button" className="requirement-guide-toggle" onClick={() => setGuideOpen((current) => !current)} aria-expanded={guideOpen}><ListChecks size={16}/><span>{guideOpen ? copy.hideGuide : copy.showGuide}</span><ChevronDown size={15}/></button>
      {guideOpen && <div className="requirement-guide">
        <header><div><ListChecks size={19}/></div><span><strong>{copy.guideTitle}</strong><small>{copy.guideSub}</small></span></header>
        <div>{typeGuide.map((type) => { const Icon = icons[type]; return <article key={type}><span><Icon size={19}/></span><div><strong>{copy.typeNames[type]}</strong><small>{copy.typeShort[type]}</small></div></article>; })}</div>
      </div>}

      <nav className="supervisor-journey__stepper" aria-label={copy.title}>
        {journey.requirements.map((requirement, index) => {
          const Icon = icons[requirement.type];
          const locked = currentIndex >= 0 && index > currentIndex && requirement.is_required;
          return <button type="button" key={requirement.id} className={`${requirement.completed ? "completed" : ""}${index === currentIndex ? " current" : ""}${locked ? " locked" : ""}`} onClick={() => setExpandedId(requirement.id)}>
            <span>{requirement.completed ? <Check size={15}/> : locked ? <LockKeyhole size={14}/> : <Icon size={15}/>}</span>
            <small>{copy.step} {index + 1}</small>
            <strong>{copy.typeNames[requirement.type]}</strong>
          </button>;
        })}
      </nav>

      <div className="supervisor-roadmap">
        {journey.requirements.map((requirement, index) => {
          const Icon = icons[requirement.type];
          const locked = currentIndex >= 0 && index > currentIndex && requirement.is_required;
          const active = !requirement.completed && !locked && index === currentIndex;
          const expanded = expandedId === requirement.id;
          const rule = requirement.type === "VIDEO" ? copy.videoRule : requirement.type === "READING" ? copy.readingRule : requirement.type === "MESSAGE" ? copy.messageRule(requirement.min_length) : copy.quizRule(requirement.quiz?.passing_score ?? quiz?.passing_score ?? 70);
          return <article id={`journey-step-${requirement.id}`} key={requirement.id} className={`supervisor-step supervisor-step--${requirement.type.toLowerCase()}${requirement.completed ? " completed" : ""}${active ? " active" : ""}${locked ? " locked" : ""}${expanded ? " expanded" : ""}`}>
            <div className="supervisor-step__card">
              <header>
                <span className="supervisor-step__number">{requirement.completed ? <Check size={17}/> : <Icon size={17}/>}</span>
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
.supervisor-journey{scroll-margin-top:18px}.supervisor-journey__topline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(184,160,130,.24)}.supervisor-journey__topline>span{display:flex;align-items:center;gap:7px;color:#6B1E2D;font-size:10px;font-weight:900}.supervisor-journey__topline>button,.supervisor-journey--collapsed>button{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #D9C9B0;border-radius:10px;background:#fff;padding:8px 10px;color:#6B1E2D;font-size:9px;font-weight:900;cursor:pointer}.supervisor-journey__hero{align-items:center}.supervisor-journey__hero h2{margin-top:0;font-size:clamp(22px,2.6vw,30px)}.supervisor-journey__progress-ring{width:92px;height:92px}.supervisor-journey__progress-ring:before{width:72px;height:72px}.supervisor-journey__progress-ring strong{font-size:19px}.supervisor-journey__summary{margin-top:14px}.supervisor-journey__summary>div{min-height:52px}.supervisor-journey__progress{height:7px}.requirement-guide-toggle{display:flex;align-items:center;gap:7px;margin-top:14px;border:0;background:transparent;padding:5px 0;color:#6B1E2D;font-size:9.5px;font-weight:900;cursor:pointer}.requirement-guide-toggle svg:last-child{margin-inline-start:auto;transition:transform .18s}.requirement-guide-toggle[aria-expanded=true] svg:last-child{transform:rotate(180deg)}.requirement-guide{margin-top:8px}.supervisor-journey__stepper{position:relative;display:grid;grid-template-columns:repeat(4,minmax(125px,1fr));gap:8px;margin-top:16px;overflow-x:auto;padding:2px}.supervisor-journey__stepper button{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr);grid-template-rows:auto auto;gap:1px 8px;align-items:center;min-width:125px;border:1px solid #E5E0D5;border-radius:13px;background:#fff;padding:9px;text-align:start;color:#32101A;cursor:pointer}.supervisor-journey__stepper button>span{grid-row:1/3;width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#EFEAE0;color:#6B1E2D}.supervisor-journey__stepper button small{color:#8C8274;font-size:7.5px;font-weight:900}.supervisor-journey__stepper button strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}.supervisor-journey__stepper button.current{border-color:#6B1E2D;background:#F7F3EB;box-shadow:0 0 0 3px rgba(107,30,45,.07)}.supervisor-journey__stepper button.current>span{background:#6B1E2D;color:#fff}.supervisor-journey__stepper button.completed{border-color:rgba(27,94,32,.2)}.supervisor-journey__stepper button.completed>span{background:#1B5E20;color:#fff}.supervisor-journey__stepper button.locked{opacity:.58}.supervisor-roadmap{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.supervisor-step{display:block;min-height:0}.supervisor-step.expanded{grid-column:1/-1}.supervisor-step__card{height:100%;margin:0;padding:14px;border-radius:15px}.supervisor-step__card>header{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center}.supervisor-step__number{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#EFEAE0;color:#6B1E2D}.supervisor-step.active .supervisor-step__number{background:#6B1E2D;color:#fff}.supervisor-step.completed .supervisor-step__number{background:#1B5E20;color:#fff}.supervisor-step__description{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical}.supervisor-step.expanded .supervisor-step__description{display:block}.supervisor-journey--collapsed{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(150px,220px) auto;align-items:center;gap:13px;margin:18px 0;padding:13px 15px;border-radius:16px}.supervisor-journey__collapsed-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#32101A;color:#D9C9B0}.supervisor-journey__collapsed-copy{min-width:0;display:flex;flex-direction:column}.supervisor-journey__collapsed-copy>span{color:#6B1E2D;font-size:8px;font-weight:900}.supervisor-journey__collapsed-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.supervisor-journey__collapsed-copy small{color:#796A62;font-size:8px}.supervisor-journey__collapsed-progress>span{display:flex;align-items:center;justify-content:space-between;gap:8px}.supervisor-journey__collapsed-progress b{font-size:11px}.supervisor-journey__collapsed-progress small{color:#796A62;font-size:8px;font-weight:800}.supervisor-journey__collapsed-progress>i{display:block;height:5px;margin-top:5px;overflow:hidden;border-radius:999px;background:#E5E0D5}.supervisor-journey__collapsed-progress>i>b{display:block;height:100%;border-radius:inherit;background:#6B1E2D}
@media(max-width:950px){.requirement-guide>div{grid-template-columns:1fr 1fr}}
@media(max-width:680px){.supervisor-journey{padding:15px;border-radius:20px}.supervisor-journey__hero{align-items:flex-start}.supervisor-journey__progress-ring{width:78px;height:78px}.supervisor-journey__progress-ring:before{width:60px;height:60px}.supervisor-journey__progress-ring strong{font-size:16px}.supervisor-journey__summary{grid-template-columns:1fr 1fr}.supervisor-journey__summary>button{grid-column:1/-1;min-height:40px}.requirement-guide>div{grid-template-columns:1fr}.supervisor-journey__stepper{grid-template-columns:repeat(4,145px)}.supervisor-roadmap{grid-template-columns:1fr}.supervisor-step.expanded{grid-column:auto}.supervisor-step__card{padding:12px}.supervisor-step__card>header{grid-template-columns:36px minmax(0,1fr);align-items:start}.supervisor-step__status{grid-column:1/-1;width:100%;justify-content:space-between;margin-top:7px}.supervisor-step__details{grid-template-columns:1fr}.supervisor-step__action a,.supervisor-step__action button{width:100%}.supervisor-quiz>header{flex-direction:column}.supervisor-quiz>header>div:last-child{width:100%;display:flex;justify-content:space-between}.supervisor-quiz__options{grid-template-columns:1fr}.supervisor-quiz__question{margin-inline:9px;padding:11px}.supervisor-quiz__timeline{padding-inline:9px}.supervisor-quiz>footer{padding-inline:9px}.supervisor-journey--collapsed{grid-template-columns:42px minmax(0,1fr) auto}.supervisor-journey__collapsed-progress{grid-column:2/4}.supervisor-journey--collapsed>button{grid-column:1/-1}}
@media(max-width:430px){.supervisor-journey__topline{align-items:flex-start}.supervisor-journey__topline>button{font-size:0}.supervisor-journey__topline>button svg{width:17px;height:17px}.supervisor-journey__hero{display:grid;grid-template-columns:minmax(0,1fr) 68px;gap:10px}.supervisor-journey__progress-ring{width:68px;height:68px}.supervisor-journey__progress-ring:before{width:52px;height:52px}.supervisor-journey__progress-ring strong{font-size:14px}.supervisor-journey__progress-ring span{display:none}.supervisor-journey__hero h2{font-size:19px}.supervisor-journey__hero p{font-size:9.5px}.supervisor-journey__summary{grid-template-columns:1fr}.supervisor-step__heading h3{font-size:13px}.supervisor-step__details{margin-inline:-2px}.supervisor-quiz{margin-inline:-3px}.supervisor-quiz>footer button{padding:7px}.supervisor-journey__celebration{grid-template-columns:42px minmax(0,1fr)}.supervisor-journey__celebration>svg{display:none}.supervisor-journey--collapsed{grid-template-columns:38px minmax(0,1fr);padding:12px}.supervisor-journey__collapsed-icon{width:38px;height:38px}.supervisor-journey__collapsed-progress{grid-column:1/-1}.supervisor-journey--collapsed>button{grid-column:1/-1;width:100%}}
`;
