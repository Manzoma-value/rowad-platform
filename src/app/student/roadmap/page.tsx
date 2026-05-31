/* eslint-disable react-hooks/exhaustive-deps */
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useLang, type Lang } from "@/lib/language-context";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ContentType = "TEXT" | "IMAGE" | "VIDEO";
type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
type Screen = "map" | "modules" | "lesson" | "quiz" | "result";

interface ModuleContent {
  id: string; type: ContentType; order: number;
  body?: string | null; image_url?: string | null; alt_text?: string | null;
  video_url?: string | null; video_title?: string | null;
}
interface Option { id: string; text: string; order: number; }
interface MatchingPair { id: string; left: string; right: string; order: number; }
interface Question {
  id: string; type: QuestionType; text: string;
  options: Option[]; matching_pairs: MatchingPair[]; order: number;
}
interface ModuleAttempt { score: number; total: number; }
interface ModuleData {
  id: string; title: string; description?: string | null; order: number;
  contents: ModuleContent[]; questions: Question[]; attempt: ModuleAttempt | null;
}
interface Stage { id: string; title: string; order: number; modules: ModuleData[]; }
interface Roadmap { id: string; title: string; stages: Stage[]; }
interface QuizResult { score: number; total: number; }

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const TR: Record<string, Record<string, string>> = {
  ar: {
    loading: "جارٍ تحميل خريطتك...",
    noRoadmap: "لا توجد خريطة بعد",
    noRoadmapDesc: "لا يوجد بنك أسئلة لمدرستك حتى الآن",
    learningMap: "خريطة التعلم",
    overallProgress: "التقدم الكلي",
    startJourney: "ابدأ رحلتك",
    completedLeg: "مكتملة", lockedLeg: "مقفلة", activeLeg: "متاحة",
    congratulations: "مبروك! أكملت الرحلة",
    finalGoal: "الهدف النهائي",
    stageLabel: "المرحلة",
    backToMap: "العودة للخارطة",
    textType: "📖 نص", imageType: "🖼 صورة", videoType: "▶ فيديو",
    view: "عرض", start: "ابدأ", back: "رجوع",
    noContent: "لا يوجد محتوى لهذه الوحدة",
    watchVideo: "مشاهدة الفيديو",
    startQuestions: "ابدأ الأسئلة",
    finishLesson: "إنهاء الدرس ✓",
    lessonHint: "بعد مراجعة الدرس، ابدأ الاختبار",
    alreadyAttempted: "لقد أديت هذا الاختبار من قبل",
    alreadyScore: "حصلت على", alreadyOf: "من",
    errorAnswerAll: "أجب على جميع الأسئلة أولاً",
    errorSubmit: "فشل التسليم", errorGeneric: "حدث خطأ",
    tfTrue: "صح", tfFalse: "خطأ",
    writtenPH: "اكتب إجابتك هنا...",
    writtenHint: "اكتب إجابة واضحة ومفصلة",
    matchingHint: "صل كل عنصر بما يناسبه",
    matchingSelect: "اختر...",
    matchingIncomplete: "أكمل جميع التوصيلات للمتابعة",
    badgeMcq: "اختيار من متعدد", badgeTf: "صح / خطأ",
    badgeWritten: "سؤال مقالي", badgeMatching: "توصيل",
    questionLabel: "السؤال",
    prev: "السابق", next: "التالي", submit: "تسليم",
    submitting: "جارٍ التسليم...",
    resultTitle: "أحسنت! 🎉",
    backToStage: "العودة للمرحلة",
    video: "فيديو", metaCompleted: "مكتملة", metaLocked: "مقفلة",
    contentCount: "محتوى", questionCount: "سؤال",
    stagesOf: "من", stagesCompletedLabel: "مراحل مكتملة",
    modulesOf: "من", modulesCompletedLabel: "وحدات مكتملة",
    correctOf: "من", correctLabel: "إجابة صحيحة",
  },
  sq: {
    loading: "Duke ngarkuar hartën tuaj...",
    noRoadmap: "Ende nuk ka hartë",
    noRoadmapDesc: "Ende nuk ka bankë pyetjesh për shkollën tuaj",
    learningMap: "Harta e Mësimit",
    overallProgress: "Progresi i Përgjithshëm",
    startJourney: "Fillo udhëtimin",
    completedLeg: "E plotë", lockedLeg: "E bllokuar", activeLeg: "E disponueshme",
    congratulations: "Urime! Keni përfunduar udhëtimin",
    finalGoal: "Qëllimi Final",
    stageLabel: "Faza",
    backToMap: "Kthehu te harta",
    textType: "📖 Tekst", imageType: "🖼 Imazh", videoType: "▶ Video",
    view: "Shiko", start: "Fillo", back: "Kthehu",
    noContent: "Nuk ka përmbajtje për këtë modul",
    watchVideo: "Shiko videon",
    startQuestions: "Fillo pyetjet",
    finishLesson: "Mbylle mësimin ✓",
    lessonHint: "Pas rishikimit të mësimit, fillo testimin",
    alreadyAttempted: "Ju e keni dhënë tashmë këtë test",
    alreadyScore: "Keni marrë", alreadyOf: "nga",
    errorAnswerAll: "Ju lutemi përgjigjuni të gjitha pyetjeve",
    errorSubmit: "Dërgimi dështoi", errorGeneric: "Ndodhi një gabim",
    tfTrue: "E vërtetë", tfFalse: "E gabuar",
    writtenPH: "Shkruani përgjigjen tuaj këtu...",
    writtenHint: "Shkruani një përgjigje të qartë dhe të detajuar",
    matchingHint: "Lidhni çdo element me atë që i përkon",
    matchingSelect: "Zgjidhni...",
    matchingIncomplete: "Plotësoni të gjitha lidhjet për të vazhduar",
    badgeMcq: "Zgjedhje e shumëfishtë", badgeTf: "E vërtetë / E gabuar",
    badgeWritten: "Pyetje eseje", badgeMatching: "Lidhje",
    questionLabel: "Pyetja",
    prev: "Paraprak", next: "Tjetër", submit: "Dorëzo",
    submitting: "Duke dërguar...",
    resultTitle: "Bravo! 🎉",
    backToStage: "Kthehu te faza",
    video: "Video", metaCompleted: "E plotë", metaLocked: "E bllokuar",
    contentCount: "përmbajtje", questionCount: "pyetje",
    stagesOf: "nga", stagesCompletedLabel: "faza të plota",
    modulesOf: "nga", modulesCompletedLabel: "module të plota",
    correctOf: "nga", correctLabel: "përgjigje të sakta",
  },
  en: {
    loading: "Loading your map...", noRoadmap: "No roadmap yet",
    noRoadmapDesc: "No question bank for your school yet",
    learningMap: "Learning Map", overallProgress: "Overall Progress",
    startJourney: "Start your journey",
    completedLeg: "Completed", lockedLeg: "Locked", activeLeg: "Available",
    congratulations: "Congrats! You completed the journey",
    finalGoal: "Final Goal", stageLabel: "Stage", backToMap: "Back to map",
    textType: "📖 Text", imageType: "🖼 Image", videoType: "▶ Video",
    view: "View", start: "Start", back: "Back",
    noContent: "No content for this module", watchVideo: "Watch video",
    startQuestions: "Start questions", finishLesson: "Finish lesson ✓",
    lessonHint: "After reviewing the lesson, start the quiz",
    alreadyAttempted: "You have already attempted this quiz",
    alreadyScore: "You scored", alreadyOf: "out of",
    errorAnswerAll: "Please answer all questions first",
    errorSubmit: "Submission failed", errorGeneric: "An error occurred",
    tfTrue: "True", tfFalse: "False",
    writtenPH: "Write your answer here...",
    writtenHint: "Write a clear and detailed answer",
    matchingHint: "Match each element with what it corresponds to",
    matchingSelect: "Select...", matchingIncomplete: "Complete all matches to continue",
    badgeMcq: "Multiple choice", badgeTf: "True / False",
    badgeWritten: "Essay question", badgeMatching: "Matching",
    questionLabel: "Question", prev: "Previous", next: "Next",
    submit: "Submit", submitting: "Submitting...",
    resultTitle: "Well done! 🎉",
    backToStage: "Back to stage",
    video: "Video", metaCompleted: "Completed", metaLocked: "Locked",
    contentCount: "content", questionCount: "question",
    stagesOf: "of", stagesCompletedLabel: "stages completed",
    modulesOf: "of", modulesCompletedLabel: "modules completed",
    correctOf: "out of", correctLabel: "correct answers",
  },
};

const getTR = (lang: Lang) => TR[lang] ?? TR["sq"];

// ─── LOCK / PROGRESS HELPERS ──────────────────────────────────────────────────

const stageLocked = (stages: Stage[], idx: number): boolean => {
  if (idx === 0) return false;
  return stages[idx - 1].modules.some((m) => m.attempt === null);
};
const stageComplete = (stage: Stage): boolean =>
  stage.modules.length > 0 && stage.modules.every((m) => m.attempt !== null);
const stageProgress = (stage: Stage): number =>
  stage.modules.length === 0
    ? 0
    : stage.modules.filter((m) => m.attempt !== null).length / stage.modules.length;
const moduleLocked = (stage: Stage, idx: number): boolean => {
  if (idx === 0) return false;
  return stage.modules[idx - 1].attempt === null;
};

// ─── YOUTUBE HELPER ───────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── LESSON VIEWER ────────────────────────────────────────────────────────────

function LessonViewer({
  module: mod, onComplete, onBack, readOnly = false, lang,
}: {
  module: ModuleData; onComplete: () => void; onBack: () => void;
  readOnly?: boolean; lang: Lang;
}) {
  const tr = getTR(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const hasQuestions = mod.questions.length > 0;
  const backPath = dir === "rtl" ? "M19 12H5M12 19l-7-7 7-7" : "M5 12h14M12 5l7 7-7 7";

  return (
    <div className="lesson-page" dir={dir}>
      <div className="lesson-topbar">
        <button className="back-button small" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d={backPath} /></svg>
          <span>{tr.back}</span>
        </button>
        <h2 className="lesson-mod-title" dir="auto">{mod.title}</h2>
        <span className="lesson-meta-pill">{mod.contents.length} {tr.contentCount}</span>
      </div>

      <div className="lesson-feed">
        {mod.contents.length === 0 && (
          <div className="lesson-empty-content"><span>{tr.noContent}</span></div>
        )}
        {mod.contents.slice().sort((a, b) => a.order - b.order).map((block, i) => {
          if (block.type === "TEXT") {
            return (
              <div key={block.id} className="content-card text-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <p className="text-block-body" dir="auto">{block.body}</p>
              </div>
            );
          }
          if (block.type === "IMAGE") {
            return (
              <div key={block.id} className="content-card image-card" style={{ animationDelay: `${i * 0.07}s` }}>
                {block.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.image_url} alt={block.alt_text ?? ""} className="lesson-image" />
                )}
                {block.alt_text && <p className="image-caption" dir="auto">{block.alt_text}</p>}
              </div>
            );
          }
          if (block.type === "VIDEO") {
            const ytId = block.video_url ? extractYouTubeId(block.video_url) : null;
            return (
              <div key={block.id} className="content-card video-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="video-header">
                  <svg viewBox="0 0 24 24" className="video-play-icon">
                    <polygon points="5,3 19,12 5,21" fill="currentColor" />
                  </svg>
                  <span dir="auto">{block.video_title ?? tr.video}</span>
                </div>
                {ytId ? (
                  <div className="video-embed-wrap">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={block.video_title ?? tr.video}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen className="video-iframe"
                    />
                  </div>
                ) : block.video_url ? (
                  <div className="video-fallback">
                    <a href={block.video_url} target="_blank" rel="noopener noreferrer" className="video-link-btn">
                      {tr.watchVideo} {dir === "rtl" ? "←" : "→"}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          }
          return null;
        })}
      </div>

      {!readOnly && (
        <div className="lesson-bottom-bar">
          <button className="lesson-start-btn" onClick={onComplete}>
            {hasQuestions ? `${tr.startQuestions} ${dir === "rtl" ? "←" : "→"}` : tr.finishLesson}
          </button>
          {hasQuestions && <p className="lesson-cta-hint">{tr.lessonHint}</p>}
        </div>
      )}
    </div>
  );
}

// ─── QUIZ PLAYER ──────────────────────────────────────────────────────────────

function QuizPlayer({ mod, onDone, lang }: {
  mod: ModuleData; onDone: (r: QuizResult) => void; lang: Lang;
}) {
  const tr = getTR(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);

  if (mod.attempt !== null) {
    return (
      <div className="already-attempted" dir={dir}>
        <div className="already-icon-wrap">
          <svg viewBox="0 0 24 24" className="already-lock-svg" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11V7a4 4 0 118 0v4"/>
          </svg>
        </div>
        <h3>{tr.alreadyAttempted}</h3>
        <p>{tr.alreadyScore} {mod.attempt.score} {tr.alreadyOf} {mod.attempt.total}</p>
      </div>
    );
  }

  const questions = mod.questions.slice().sort((a, b) => a.order - b.order);
  const q = questions[current];
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const allAnswered = questions.every((qq) => answers[qq.id] !== undefined && answers[qq.id] !== "");

  const submit = async () => {
    if (!allAnswered) { setError(tr.errorAnswerAll); return; }
    setSubmitting(true); setError("");
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
      const res = await fetch(`/api/student/roadmap/modules/${mod.id}/attempt`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tr.errorSubmit);
      onDone(data.attempt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr.errorGeneric);
      setSubmitting(false);
    }
  };

  const renderMCQ = () => {
    const opts = q.options.slice().sort((a, b) => a.order - b.order);
    return (
      <div className="options-grid">
        {opts.map((opt, i) => {
          const selected = answers[q.id] === opt.text;
          return (
            <button
              key={opt.id}
              className={`option-card ${selected ? "selected" : ""} ${selectedAnim === opt.id ? "pop" : ""}`}
              onClick={() => {
                setAnswers((p) => ({ ...p, [q.id]: opt.text }));
                setSelectedAnim(opt.id);
                setTimeout(() => setSelectedAnim(null), 300);
              }}
              style={{ animationDelay: `${i * 0.05}s` }}
              dir={dir}
            >
              <span className="option-indicator">
                {selected ? (
                  <svg viewBox="0 0 24 24" className="check-icon"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                )}
              </span>
              <span className="option-text" dir="auto">{opt.text}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTF = () => {
    const tfOpts = [{ label: tr.tfTrue, val: "true" }, { label: tr.tfFalse, val: "false" }];
    return (
      <div className="options-grid tf-grid">
        {tfOpts.map((opt, i) => {
          const selected = answers[q.id] === opt.val;
          return (
            <button
              key={opt.val}
              className={`option-card tf-card ${selected ? "selected" : ""}`}
              onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt.val }))}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="option-indicator">
                {selected ? (
                  <svg viewBox="0 0 24 24" className="check-icon"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                )}
              </span>
              <span className="option-text tf-label">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderWritten = () => (
    <div className="written-wrap" dir={dir}>
      <textarea
        className="written-textarea" dir="auto" rows={4}
        placeholder={tr.writtenPH} value={answers[q.id] ?? ""}
        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
      />
      <span className="written-hint">{tr.writtenHint}</span>
    </div>
  );

  const renderMatching = () => {
    const pairs = q.matching_pairs.slice().sort((a, b) => a.order - b.order);
    const rightValues = pairs.map((p) => p.right);
    const currentMatching: Record<string, string> = (() => {
      try { return answers[q.id] ? JSON.parse(answers[q.id]) : {}; } catch { return {}; }
    })();
    const updateMatching = (leftVal: string, rightVal: string) => {
      const updated = { ...currentMatching, [leftVal]: rightVal };
      setAnswers((p) => ({ ...p, [q.id]: JSON.stringify(updated) }));
    };
    const isComplete = pairs.every((p) => currentMatching[p.left]);
    return (
      <div className="matching-wrap" dir={dir}>
        <p className="matching-hint">{tr.matchingHint}</p>
        <div className="matching-pairs">
          {pairs.map((pair) => (
            <div key={pair.id} className="matching-row">
              <span className="matching-left" dir="auto">{pair.left}</span>
              <span className="matching-arrow">→</span>
              <select
                className={`matching-select ${currentMatching[pair.left] ? "filled" : ""}`}
                value={currentMatching[pair.left] ?? ""}
                onChange={(e) => updateMatching(pair.left, e.target.value)} dir="auto"
              >
                <option value="">{tr.matchingSelect}</option>
                {rightValues.map((rv) => <option key={rv} value={rv}>{rv}</option>)}
              </select>
            </div>
          ))}
        </div>
        {!isComplete && <p className="matching-incomplete">{tr.matchingIncomplete}</p>}
      </div>
    );
  };

  const getTypeBadge = () => {
    switch (q.type) {
      case "MCQ":     return <span className="badge-mcq">{tr.badgeMcq}</span>;
      case "TF":      return <span className="badge-tf">{tr.badgeTf}</span>;
      case "WRITTEN": return <span className="badge-written">{tr.badgeWritten}</span>;
      case "MATCHING":return <span className="badge-matching">{tr.badgeMatching}</span>;
    }
  };

  const isCurrentAnswered = (): boolean => {
    if (!answers[q.id]) return false;
    if (q.type === "MATCHING") {
      try {
        const m = JSON.parse(answers[q.id]);
        return q.matching_pairs.every((p) => m[p.left]);
      } catch { return false; }
    }
    return answers[q.id].trim().length > 0;
  };

  const backArrow = dir === "rtl"
    ? <><span>{tr.prev}</span><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></>
    : <><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg><span>{tr.prev}</span></>;
  const nextArrow = dir === "rtl"
    ? <><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg><span>{tr.next}</span></>
    : <><span>{tr.next}</span><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></>;

  return (
    <div className="quiz-container" dir={dir}>
      <div className="quiz-header">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
        <div className="quiz-progress-text">
          <span className="progress-current">{tr.questionLabel} {current + 1}</span>
          <span className="progress-divider">/</span>
          <span className="progress-total">{total}</span>
        </div>
      </div>

      <div className="question-card" key={q.id}>
        <div className="question-badge">{getTypeBadge()}</div>
        <h2 className="question-text" dir="auto">{q.text}</h2>
        {q.type === "MCQ"     && renderMCQ()}
        {q.type === "TF"      && renderTF()}
        {q.type === "WRITTEN" && renderWritten()}
        {q.type === "MATCHING"&& renderMatching()}
      </div>

      {error && (
        <div className="quiz-error">
          <svg viewBox="0 0 24 24" className="error-icon">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="quiz-navigation">
        <button className="nav-button prev" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
          {backArrow}
        </button>
        {current < total - 1 ? (
          <button className="nav-button next" onClick={() => setCurrent((c) => c + 1)} disabled={!isCurrentAnswered()}>
            {nextArrow}
          </button>
        ) : (
          <button className="nav-button submit" onClick={submit} disabled={!allAnswered || submitting}>
            {submitting ? (
              <span className="submit-loading">{tr.submitting}</span>
            ) : (
              <><span>{tr.submit}</span><span className="submit-count">{answered}/{total}</span></>
            )}
          </button>
        )}
      </div>

      <div className="question-dots">
        {questions.map((qq, i) => {
          const ans = answers[qq.id];
          const isDone = ans !== undefined && ans !== "" && (() => {
            if (qq.type === "MATCHING") {
              try { const m = JSON.parse(ans); return qq.matching_pairs.every((p) => m[p.left]); }
              catch { return false; }
            }
            return true;
          })();
          return (
            <button key={qq.id}
              className={`q-dot ${i === current ? "current" : ""} ${isDone ? "answered" : ""}`}
              onClick={() => setCurrent(i)}>
              <span className="dot-number">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────

function ResultScreen({ result, onBack, lang }: {
  result: QuizResult; onBack: () => void; lang: Lang;
}) {
  const tr = getTR(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const circleRef = useRef<SVGCircleElement>(null);
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;

  useEffect(() => {
    if (circleRef.current) {
      const circumference = 2 * Math.PI * 90;
      circleRef.current.style.strokeDashoffset = String(circumference - (pct / 100) * circumference);
    }
  }, [pct]);

  return (
    <div className="result-container" dir={dir}>
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="confetti" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: ["#E5B93C","#C8A96A","#FDF5E0","#0B0B0C"][Math.floor(Math.random() * 4)],
          }} />
        ))}
      </div>

      <div className="score-circle-container">
        <svg viewBox="0 0 200 200" className="score-circle-svg">
          <circle cx="100" cy="100" r="90" className="score-bg" />
          <circle ref={circleRef} cx="100" cy="100" r="90" className="score-fill"
            strokeDasharray={`${2 * Math.PI * 90}`} strokeDashoffset={`${2 * Math.PI * 90}`} />
        </svg>
        <div className="score-content">
          <span className="score-value">{pct}%</span>
        </div>
      </div>

      <div className="result-message">
        <h2 className="result-title">{tr.resultTitle}</h2>
        <p className="result-detail">
          {result.score} {tr.correctOf} {result.total} {tr.correctLabel}
        </p>
      </div>

      <div className="result-progress">
        <div className="result-progress-labels">
          <span className="rp-label-start">0%</span>
          <span className="rp-label-end">100%</span>
        </div>
        <div className="result-progress-bg">
          <div className="result-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="result-score-marker" style={{ left: `${pct}%` }}>
          <span className="score-marker-dot" />
          <span className="score-marker-label">{pct}%</span>
        </div>
      </div>

      <div className="result-actions">
        <button className="action-button secondary" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M3 12h18M3 12l6 6M3 12l6-6" /></svg>
          <span>{tr.backToStage}</span>
        </button>
      </div>
    </div>
  );
}

// ─── MODULES LIST ─────────────────────────────────────────────────────────────

function ModulesList({ stage, onSelect, onBack, lang }: {
  stage: Stage; onSelect: (m: ModuleData, readOnly: boolean) => void;
  onBack: () => void; lang: Lang;
}) {
  const tr = getTR(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const doneCount = stage.modules.filter((m) => m.attempt !== null).length;
  const backPath = dir === "rtl" ? "M19 12H5M12 19l-7-7 7-7" : "M5 12h14M12 5l7 7-7 7";

  const contentTypePills = (mod: ModuleData) => {
    const types = new Set(mod.contents.map((c) => c.type));
    return (
      <div className="content-type-pills">
        {types.has("TEXT")  && <span className="type-pill text-pill">{tr.textType}</span>}
        {types.has("IMAGE") && <span className="type-pill image-pill">{tr.imageType}</span>}
        {types.has("VIDEO") && <span className="type-pill video-pill">{tr.videoType}</span>}
      </div>
    );
  };

  return (
    <div className="modules-container" dir={dir}>
      <button className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24"><path d={backPath} /></svg>
        <span>{tr.backToMap}</span>
      </button>

      <div className="modules-header">
        <div className="stage-badge">
          <span className="badge-text">{tr.stageLabel} {stage.order}</span>
        </div>
        <h1 className="modules-title" dir="auto">{stage.title}</h1>
        <p className="modules-subtitle">
          {doneCount} {tr.modulesOf} {stage.modules.length} {tr.modulesCompletedLabel}
        </p>
      </div>

      <div className="modules-grid">
        {stage.modules.map((mod, idx) => {
          const locked = moduleLocked(stage, idx);
          const attempted = mod.attempt !== null;
          return (
            <div key={mod.id}
              className={`module-card ${locked ? "locked" : ""} ${attempted ? "completed" : ""}`}
              style={{ animationDelay: `${idx * 0.08}s` }}>
              {attempted && (
                <div className="module-score-badge">✓ {mod.attempt!.score}/{mod.attempt!.total}</div>
              )}
              <div className="module-status-icon">
                {attempted ? (
                  <div className="status-completed">
                    <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                ) : locked ? (
                  <div className="status-locked">
                    <svg viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="10" rx="2"/>
                      <path d="M8 11V7a4 4 0 118 0v4" fill="none" strokeWidth="2"/>
                    </svg>
                  </div>
                ) : (
                  <div className="status-available"><span>{idx + 1}</span></div>
                )}
              </div>
              <div className="module-content">
                <h3 className="module-title" dir="auto">{mod.title}</h3>
                {mod.contents.length > 0 && contentTypePills(mod)}
                <div className="module-meta">
                  <span className="meta-item">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {mod.contents.length > 0
                      ? `${mod.contents.length} ${tr.contentCount} · ${mod.questions.length} ${tr.questionCount}`
                      : `${mod.questions.length} ${tr.questionCount}`}
                  </span>
                </div>
              </div>
              {!locked && (
                <button className={`module-action ${attempted ? "view" : "start"}`}
                  onClick={() => onSelect(mod, attempted)}>
                  {attempted ? (
                    <><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>{tr.view}</span></>
                  ) : (
                    <><svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg><span>{tr.start}</span></>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ROADMAP VIEW (GAME MAP) ──────────────────────────────────────────────────

function generatePath(stageCount: number): string {
  const startY = 60, stageSpacing = 160, curveWidth = 120;
  let path = `M 200 ${startY}`;
  for (let i = 0; i < stageCount; i++) {
    const y1 = startY + i * stageSpacing + 40;
    const y2 = startY + (i + 1) * stageSpacing;
    const isLeft = i % 2 === 0;
    const cpX = isLeft ? 200 - curveWidth : 200 + curveWidth;
    path += ` Q ${cpX} ${y1 + stageSpacing / 2}, ${200 + (isLeft ? -60 : 60)} ${y2}`;
    if (i < stageCount - 1) {
      const nextIsLeft = (i + 1) % 2 === 0;
      const midY = y2 + 40;
      path += ` Q 200 ${midY}, ${200 + (nextIsLeft ? -60 : 60)} ${y2 + 80}`;
    }
  }
  path += ` L 200 ${startY + stageCount * stageSpacing + 60}`;
  return path;
}

function getNodePosition(index: number): { top: string; left?: string; right?: string } {
  const startY = 100, spacing = 160;
  const isLeft = index % 2 === 0;
  return { top: `${startY + index * spacing}px`, ...(isLeft ? { left: "10px" } : { right: "10px" }) };
}

function RoadmapView({ roadmap, onSelect, lang }: {
  roadmap: Roadmap; onSelect: (s: Stage) => void; lang: Lang;
}) {
  const tr = getTR(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const totalStages = roadmap.stages.length;
  const completedCount = roadmap.stages.filter((s) => stageComplete(s)).length;
  const overallProgress = totalStages > 0 ? (completedCount / totalStages) * 100 : 0;

  return (
    <div className="roadmap-container" dir={dir}>
      {/* ── Dark hero header ── */}
      <div className="roadmap-hero">
        <div className="roadmap-hero-stripe" />
        <div className="roadmap-hero-inner">
          <span className="roadmap-hero-eyebrow">{tr.learningMap}</span>
          <h1 className="roadmap-hero-title" dir="auto">{roadmap.title}</h1>
        </div>
      </div>

      {/* ── Progress card ── */}
      <div className="roadmap-progress-card">
        <div className="progress-info">
          <span className="progress-label">{tr.overallProgress}</span>
          <span className="progress-value">{Math.round(overallProgress)}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }} />
        </div>
        <p className="progress-detail">
          {completedCount} {tr.stagesOf} {totalStages} {tr.stagesCompletedLabel}
        </p>
      </div>

      {/* ── Game map ── */}
      <div className="game-map">
        <svg className="path-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E5B93C" />
              <stop offset="100%" stopColor="#C8A96A" />
            </linearGradient>
            <filter id="pathGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d={generatePath(totalStages)} fill="none" stroke="rgba(200,169,106,0.14)"
            strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          <path d={generatePath(totalStages)} fill="none" stroke="url(#pathGradient)"
            strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="2000" strokeDashoffset={2000 - (overallProgress / 100) * 2000}
            filter="url(#pathGlow)" />
          <path d={generatePath(totalStages)} fill="none" stroke="rgba(200,169,106,0.22)"
            strokeWidth="3" strokeLinecap="round" strokeDasharray="0 20" />
        </svg>

        <div className="map-start" style={{ top: "20px" }}>
          <div className="start-node">
            <div className="start-pulse" />
            <div className="start-circle">
              <svg viewBox="0 0 24 24" className="start-icon">
                <polygon points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8" fill="currentColor" />
              </svg>
            </div>
          </div>
          <span className="start-label">{tr.startJourney}</span>
        </div>

        {roadmap.stages.map((stage, idx) => {
          const locked = stageLocked(roadmap.stages, idx);
          const completed = stageComplete(stage);
          const progress = stageProgress(stage) * 100;
          const position = getNodePosition(idx);
          return (
            <div key={stage.id}
              className={`stage-node ${completed ? "completed" : locked ? "locked" : "active"}`}
              style={{ top: position.top, left: position.left, right: position.right }}>
              <button className="stage-button" onClick={() => !locked && onSelect(stage)} disabled={locked}>
                <div className="stage-circle">
                  {!locked && !completed && (
                    <svg className="progress-ring" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" className="ring-bg" />
                      <circle cx="50" cy="50" r="45" className="ring-fill"
                        strokeDasharray={`${progress * 2.83} 283`} />
                    </svg>
                  )}
                  <div className="circle-inner">
                    {completed ? (
                      <svg viewBox="0 0 24 24" className="stage-icon check"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : locked ? (
                      <svg viewBox="0 0 24 24" className="stage-icon lock">
                        <rect x="5" y="11" width="14" height="10" rx="2"/>
                        <path d="M8 11V7a4 4 0 118 0v4"/>
                      </svg>
                    ) : (
                      <span className="stage-number">{stage.order}</span>
                    )}
                  </div>
                  {completed && <div className="completed-glow" />}
                </div>
                <div className="stage-info">
                  <h3 className="stage-title" dir="auto">{stage.title}</h3>
                  <div className="stage-meta">
                    {completed ? <span className="meta-completed">{tr.metaCompleted}</span>
                      : locked ? <span className="meta-locked">{tr.metaLocked}</span>
                      : <span className="meta-progress">
                          {stage.modules.filter((m) => m.attempt !== null).length}/{stage.modules.length}
                        </span>}
                  </div>
                  {!locked && stage.modules.length > 0 && (
                    <div className="stage-dots">
                      {stage.modules.map((m) => (
                        <span key={m.id} className={`dot ${m.attempt !== null ? "filled" : ""}`} />
                      ))}
                    </div>
                  )}
                </div>
                {!locked && (
                  <div className="stage-arrow">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                )}
              </button>
              {completed && (
                <div className="stage-stars">
                  <span className="star s1">&#9733;</span>
                  <span className="star s2">&#9733;</span>
                  <span className="star s3">&#9733;</span>
                </div>
              )}
            </div>
          );
        })}

        <div className={`map-end ${completedCount === totalStages ? "achieved" : ""}`}
          style={{ top: `${100 + totalStages * 160}px` }}>
          <div className="end-node">
            <div className="end-glow" />
            <div className="end-circle">
              <svg viewBox="0 0 24 24" className="end-icon">
                <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
                <path d="M4 5h16v4a6 6 0 01-6 6h-4a6 6 0 01-6-6V5z"/>
                <path d="M12 15v4M8 19h8"/>
              </svg>
            </div>
          </div>
          <span className="end-label">
            {completedCount === totalStages ? tr.congratulations : tr.finalGoal}
          </span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="map-legend">
        <div className="legend-item"><span className="legend-dot completed" /><span>{tr.completedLeg}</span></div>
        <div className="legend-item"><span className="legend-dot active" /><span>{tr.activeLeg}</span></div>
        <div className="legend-item"><span className="legend-dot locked" /><span>{tr.lockedLeg}</span></div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StudentRoadmapPage() {
  const { lang } = useLang();
  const tr = getTR(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("map");
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
  const [lessonReadOnly, setLessonReadOnly] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const load = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/student/roadmap");
      const data = await res.json();
      const fresh: Roadmap | null = data.roadmap ?? null;
      setRoadmap(fresh);
      if (fresh && selectedStage) {
        const freshStage = fresh.stages.find((s) => s.id === selectedStage.id);
        if (freshStage) setSelectedStage(freshStage);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { void load(true); }, []);

  const handleStageSelect = (stage: Stage) => { setSelectedStage(stage); setScreen("modules"); };
  const handleModuleSelect = (mod: ModuleData, readOnly: boolean) => {
    setSelectedModule(mod); setLessonReadOnly(readOnly); setQuizResult(null);
    setScreen(mod.contents.length > 0 ? "lesson" : "quiz");
  };
  const handleLessonComplete = () => setScreen("quiz");
  const handleQuizDone = async (result: QuizResult) => {
    setQuizResult(result); setScreen("result"); await load();
  };
  const handleBackToModules = () => {
    if (roadmap && selectedStage) {
      const fresh = roadmap.stages.find((s) => s.id === selectedStage.id);
      if (fresh) setSelectedStage(fresh);
    }
    setScreen("modules");
  };

  if (loading) {
    return (
      <div className="loading-screen" dir={dir}>
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner-ring" /><div className="spinner-ring r2" /><div className="spinner-ring r3" />
          </div>
          <p className="loading-text">{tr.loading}</p>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="empty-screen" dir={dir}>
        <div className="empty-content">
          <div className="empty-icon-wrap">
            <svg viewBox="0 0 24 24" className="empty-icon">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <h2 className="empty-title">{tr.noRoadmap}</h2>
          <p className="empty-desc">{tr.noRoadmapDesc}</p>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <div className="game-page">
      {screen === "map" && (
        <RoadmapView roadmap={roadmap} onSelect={handleStageSelect} lang={lang} />
      )}
      {screen === "modules" && selectedStage && (
        <ModulesList stage={selectedStage} onSelect={handleModuleSelect}
          onBack={() => setScreen("map")} lang={lang} />
      )}
      {screen === "lesson" && selectedModule && (
        <LessonViewer module={selectedModule} onComplete={handleLessonComplete}
          onBack={() => setScreen("modules")} readOnly={lessonReadOnly} lang={lang} />
      )}
      {screen === "quiz" && selectedModule && (
        <div className="quiz-screen" dir={dir}>
          <div className="quiz-top-bar">
            <button className="back-button small" onClick={() => setScreen("modules")}>
              <svg viewBox="0 0 24 24">
                <path d={dir === "rtl" ? "M19 12H5M12 19l-7-7 7-7" : "M5 12h14M12 5l7 7-7 7"} />
              </svg>
              <span>{tr.back}</span>
            </button>
            <h2 className="quiz-module-title" dir="auto">{selectedModule.title}</h2>
          </div>
          <QuizPlayer mod={selectedModule} onDone={handleQuizDone} lang={lang} />
        </div>
      )}
      {screen === "result" && quizResult && (
        <ResultScreen result={quizResult} onBack={handleBackToModules} lang={lang} />
      )}
      <style>{css}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── ANIMATIONS ── */
  @keyframes fadeInUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
  @keyframes pulse { 0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(229,185,60,.4); } 50% { transform:scale(1.05); box-shadow:0 0 0 14px rgba(229,185,60,0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes confetti { 0% { transform:translateY(-100vh) rotate(0deg); opacity:1; } 100% { transform:translateY(100vh) rotate(720deg); opacity:0; } }
  @keyframes pop { 0% { transform:scale(1); } 50% { transform:scale(1.07); } 100% { transform:scale(1); } }
  @keyframes starBounce { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-6px) scale(1.2); } }
  @keyframes ringPulse { 0% { transform:scale(.95); opacity:.5; } 50% { transform:scale(1.1); opacity:.8; } 100% { transform:scale(.95); opacity:.5; } }
  @keyframes shimmer { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }

  /* ── BASE ── */
  .game-page {
    min-height: 100vh;
    background: #F6F4EE;
    font-family: 'Cairo', sans-serif;
    overflow-x: hidden;
  }

  /* ── LOADING ── */
  .loading-screen {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#F6F4EE; font-family:'Cairo',sans-serif;
  }
  .loading-content { text-align:center; animation:fadeIn .5s ease; }
  .loading-spinner { position:relative; width:80px; height:80px; margin:0 auto 24px; }
  .spinner-ring { position:absolute; width:100%; height:100%; border:4px solid transparent; border-top-color:#E5B93C; border-radius:50%; animation:spin 1s linear infinite; }
  .spinner-ring.r2 { width:60px; height:60px; top:10px; left:10px; border-top-color:#C8A96A; animation-delay:.15s; animation-direction:reverse; }
  .spinner-ring.r3 { width:40px; height:40px; top:20px; left:20px; border-top-color:rgba(200,169,106,.4); animation-delay:.3s; }
  .loading-text { font-size:18px; font-weight:800; color:#0B0B0C; letter-spacing:.2px; }

  /* ── EMPTY ── */
  .empty-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#F6F4EE; padding:24px; font-family:'Cairo',sans-serif; }
  .empty-content { text-align:center; animation:fadeInUp .6s ease; }
  .empty-icon-wrap { width:96px; height:96px; margin:0 auto 24px; background:linear-gradient(135deg,#FFFDF8,#FDF9F0); border:1.5px solid rgba(200,169,106,.2); border-radius:50%; display:flex; align-items:center; justify-content:center; animation:float 3s ease-in-out infinite; }
  .empty-icon { width:44px; height:44px; fill:none; stroke:#C8A96A; stroke-width:1.8; }
  .empty-title { font-size:26px; font-weight:900; color:#0B0B0C; margin-bottom:10px; }
  .empty-desc { font-size:15px; color:#9A8A70; font-weight:600; }

  /* ── ROADMAP CONTAINER ── */
  .roadmap-container { position:relative; max-width:500px; margin:0 auto; padding:0 0 120px; min-height:100vh; }

  /* ── ROADMAP HERO HEADER ── */
  .roadmap-hero {
    background:#0B0B0C; position:relative; overflow:hidden;
    padding:28px 28px 24px; margin-bottom:0;
    border-bottom:1px solid rgba(200,169,106,.1);
    animation:fadeInUp .5s ease;
  }
  .roadmap-hero-stripe {
    position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,transparent,#C8A96A 30%,#E5B93C 60%,transparent);
  }
  .roadmap-hero::after {
    content:''; position:absolute; bottom:-50px; right:-50px;
    width:180px; height:180px; border-radius:50%;
    background:radial-gradient(circle,rgba(200,169,106,.07),transparent 70%);
    pointer-events:none;
  }
  .roadmap-hero-inner { position:relative; z-index:1; }
  .roadmap-hero-eyebrow { display:block; font-size:10px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:rgba(200,169,106,.55); margin-bottom:8px; }
  .roadmap-hero-title { font-size:22px; font-weight:900; color:#FFFFFF; line-height:1.3; letter-spacing:-.2px; }

  /* ── PROGRESS CARD ── */
  .roadmap-progress-card {
    background:#FFFDF8; border-bottom:1px solid rgba(200,169,106,.12);
    padding:20px 28px 18px; margin-bottom:24px;
    animation:fadeInUp .5s ease .05s both;
  }
  .progress-info { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .progress-label { font-size:13px; font-weight:700; color:#6B6050; }
  .progress-value { font-size:26px; font-weight:900; color:#E5B93C; line-height:1; }
  .progress-bar-container { height:10px; background:rgba(200,169,106,.1); border-radius:100px; overflow:hidden; margin-bottom:10px; border:1px solid rgba(200,169,106,.15); }
  .progress-bar-fill { height:100%; background:linear-gradient(90deg,#C8A96A,#E5B93C); border-radius:100px; transition:width 1.1s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden; }
  .progress-bar-fill::after { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent); animation:shimmer 2.2s infinite; }
  .progress-detail { font-size:12px; color:#9A8A70; font-weight:600; }

  /* ── GAME MAP ── */
  .game-map { position:relative; margin:0 16px; }
  .path-svg { position:absolute; top:0; left:50%; transform:translateX(-50%); width:100%; max-width:400px; height:auto; z-index:1; pointer-events:none; }

  /* ── START NODE ── */
  .map-start { position:absolute; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; z-index:10; animation:fadeInUp .6s ease; }
  .start-node { position:relative; width:68px; height:68px; }
  .start-pulse { position:absolute; inset:-8px; border-radius:50%; background:rgba(229,185,60,.2); animation:pulse 2.4s ease-in-out infinite; }
  .start-circle { position:relative; width:100%; height:100%; background:linear-gradient(135deg,#E5B93C,#C8A96A); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(229,185,60,.35); }
  .start-icon { width:28px; height:28px; color:white; }
  .start-label { margin-top:12px; font-size:14px; font-weight:800; color:#0B0B0C; white-space:nowrap; }

  /* ── STAGE NODES ── */
  .stage-node { position:absolute; z-index:10; width:calc(100% - 20px); max-width:270px; animation:fadeInUp .6s ease backwards; }
  .stage-node:nth-child(2){animation-delay:.1s} .stage-node:nth-child(3){animation-delay:.2s}
  .stage-node:nth-child(4){animation-delay:.3s} .stage-node:nth-child(5){animation-delay:.4s}
  .stage-button {
    width:100%; display:flex; align-items:center; gap:14px;
    background:#FFFDF8; border:2px solid rgba(200,169,106,.18);
    border-radius:18px; padding:14px; cursor:pointer;
    transition:all .28s cubic-bezier(.4,0,.2,1);
    font-family:'Cairo',sans-serif; text-align:right;
    box-shadow:0 2px 12px rgba(0,0,0,.04);
  }
  .stage-node.active .stage-button { border-color:rgba(200,169,106,.3); box-shadow:0 6px 22px rgba(200,169,106,.12); }
  .stage-node.active .stage-button:hover { border-color:#C8A96A; transform:translateY(-3px) scale(1.015); box-shadow:0 10px 32px rgba(200,169,106,.2); }
  .stage-node.completed .stage-button { border-color:rgba(200,169,106,.4); background:linear-gradient(135deg,#FFFDF8,#FDF9F0); box-shadow:0 4px 18px rgba(200,169,106,.12); }
  .stage-node.completed .stage-button:hover { transform:translateY(-3px) scale(1.015); box-shadow:0 10px 30px rgba(200,169,106,.22); }
  .stage-node.locked .stage-button { opacity:.52; cursor:not-allowed; background:#FAFAF8; border-color:rgba(200,169,106,.1); box-shadow:none; }
  .stage-circle { position:relative; width:52px; height:52px; flex-shrink:0; }
  .circle-inner { position:relative; z-index:2; width:100%; height:100%; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#FDF9F0; border:2.5px solid rgba(200,169,106,.25); transition:all .28s ease; }
  .stage-node.completed .circle-inner { background:linear-gradient(135deg,#E5B93C,#C8A96A); border-color:#E5B93C; }
  .stage-node.locked .circle-inner { background:#F5F3EF; border-color:rgba(200,169,106,.12); }
  .stage-node.active .circle-inner { background:white; border-color:#C8A96A; }
  .completed-glow { position:absolute; inset:-4px; border-radius:50%; background:rgba(229,185,60,.22); animation:ringPulse 2s ease-in-out infinite; z-index:1; }
  .progress-ring { position:absolute; inset:-6px; transform:rotate(-90deg); z-index:3; }
  .ring-bg { fill:none; stroke:rgba(200,169,106,.14); stroke-width:5; }
  .ring-fill { fill:none; stroke:#E5B93C; stroke-width:5; stroke-linecap:round; transition:stroke-dasharray .5s ease; }
  .stage-icon { width:24px; height:24px; fill:none; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .stage-icon.check { stroke:white; }
  .stage-icon.lock { stroke:#B0A48A; fill:none; }
  .stage-number { font-size:22px; font-weight:900; color:#C8A96A; }
  .stage-info { flex:1; min-width:0; }
  .stage-title { font-size:16px; font-weight:800; color:#0B0B0C; margin-bottom:4px; line-height:1.35; }
  .stage-node.locked .stage-title { color:#9A8A70; }
  .stage-meta { font-size:13px; font-weight:700; }
  .meta-completed { color:#C8A96A; }
  .meta-locked { color:#B0A48A; }
  .meta-progress { color:#9A8A70; }
  .stage-dots { display:flex; gap:5px; margin-top:8px; flex-wrap:wrap; }
  .stage-dots .dot { width:8px; height:8px; border-radius:50%; background:rgba(200,169,106,.15); transition:all .3s ease; }
  .stage-dots .dot.filled { background:linear-gradient(135deg,#E5B93C,#C8A96A); }
  .stage-arrow { width:28px; height:28px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .stage-arrow svg { width:20px; height:20px; fill:none; stroke:rgba(200,169,106,.35); stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; transition:all .25s ease; }
  .stage-button:hover .stage-arrow svg { stroke:#C8A96A; transform:translateX(-3px); }
  .stage-stars { position:absolute; top:-10px; right:8px; display:flex; gap:2px; z-index:20; }
  .stage-stars .star { font-size:16px; color:#E5B93C; text-shadow:0 2px 6px rgba(229,185,60,.4); animation:starBounce 2.2s ease-in-out infinite; }
  .stage-stars .star.s2{animation-delay:.15s} .stage-stars .star.s3{animation-delay:.3s}

  /* ── END NODE ── */
  .map-end { position:absolute; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; z-index:10; animation:fadeInUp .6s ease .5s backwards; }
  .end-node { position:relative; width:84px; height:84px; }
  .end-glow { position:absolute; inset:-10px; border-radius:50%; background:rgba(229,185,60,.12); opacity:0; transition:opacity .4s ease; }
  .map-end.achieved .end-glow { opacity:1; animation:pulse 2.2s ease-in-out infinite; }
  .end-circle { position:relative; width:100%; height:100%; background:linear-gradient(135deg,#E5B93C,#C8A96A); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 26px rgba(229,185,60,.3); opacity:.5; transition:all .4s ease; }
  .map-end.achieved .end-circle { opacity:1; animation:float 3s ease-in-out infinite; }
  .end-icon { width:36px; height:36px; fill:none; stroke:white; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .end-label { margin-top:12px; font-size:14px; font-weight:800; color:#6B5020; text-align:center; }

  /* ── LEGEND ── */
  .map-legend { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:20px; background:#FFFDF8; border:1.5px solid rgba(200,169,106,.2); border-radius:100px; padding:12px 24px; box-shadow:0 6px 28px rgba(0,0,0,.09); z-index:100; font-family:'Cairo',sans-serif; white-space:nowrap; }
  .legend-item { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700; color:#0B0B0C; }
  .legend-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
  .legend-dot.completed { background:linear-gradient(135deg,#E5B93C,#C8A96A); }
  .legend-dot.active { background:white; border:2.5px solid #C8A96A; }
  .legend-dot.locked { background:rgba(200,169,106,.15); border:1.5px solid rgba(200,169,106,.2); }

  /* ── MODULES CONTAINER ── */
  .modules-container { max-width:600px; margin:0 auto; padding:24px 20px 80px; min-height:100vh; animation:fadeIn .4s ease; font-family:'Cairo',sans-serif; }
  .back-button { display:inline-flex; align-items:center; gap:8px; background:#FFFDF8; border:1.5px solid rgba(200,169,106,.2); border-radius:12px; padding:9px 16px; font-family:'Cairo',sans-serif; font-size:14px; font-weight:700; color:#1A1208; cursor:pointer; transition:all .2s ease; margin-bottom:24px; }
  .back-button:hover { border-color:#C8A96A; background:#FDF9F0; }
  .back-button svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .back-button.small { padding:7px 13px; font-size:13px; }
  .modules-header { text-align:center; margin-bottom:28px; }
  .stage-badge { display:inline-flex; align-items:center; background:#0B0B0C; border-radius:100px; padding:6px 18px; margin-bottom:14px; }
  .stage-badge .badge-text { font-size:12px; font-weight:800; color:#C8A96A; letter-spacing:.5px; text-transform:uppercase; }
  .modules-title { font-size:28px; font-weight:900; color:#0B0B0C; margin-bottom:6px; }
  .modules-subtitle { font-size:14px; color:#9A8A70; font-weight:600; }
  .modules-grid { display:flex; flex-direction:column; gap:14px; }

  /* ── MODULE CARD ── */
  .module-card { display:flex; align-items:center; gap:14px; background:#FFFDF8; border:1.5px solid rgba(200,169,106,.15); border-radius:18px; padding:16px; animation:fadeInUp .5s ease backwards; transition:all .28s ease; position:relative; box-shadow:0 2px 10px rgba(0,0,0,.04); }
  .module-card:hover:not(.locked) { border-color:rgba(200,169,106,.35); box-shadow:0 6px 22px rgba(200,169,106,.1); transform:translateY(-2px); }
  .module-card.completed { border-color:rgba(200,169,106,.28); background:linear-gradient(135deg,#FFFDF8,#FDF9F0); }
  .module-card.locked { opacity:.52; }
  .module-score-badge { position:absolute; top:-10px; left:12px; background:#FFFDF8; border:1.5px solid rgba(200,169,106,.35); border-radius:100px; padding:3px 11px; font-size:12px; font-weight:800; color:#A8863E; }
  .module-status-icon { flex-shrink:0; }
  .module-status-icon > div { width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .status-completed { background:linear-gradient(135deg,#E5B93C,#C8A96A); }
  .status-completed svg { width:22px; height:22px; fill:none; stroke:white; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
  .status-locked { background:rgba(200,169,106,.08); border:1.5px solid rgba(200,169,106,.15); }
  .status-locked svg { width:20px; height:20px; fill:none; stroke:#B0A48A; stroke-width:2; }
  .status-available { background:#FDF9F0; border:2.5px solid rgba(200,169,106,.3); font-size:18px; font-weight:900; color:#C8A96A; }
  .module-content { flex:1; min-width:0; }
  .module-title { font-size:16px; font-weight:800; color:#0B0B0C; margin-bottom:6px; }
  .content-type-pills { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:6px; }
  .type-pill { font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:100px; }
  .text-pill  { background:#FDF5E0; color:#8A6820; }
  .image-pill { background:#EFF6FF; color:#1e40af; }
  .video-pill { background:rgba(200,169,106,.08); color:#7A5E20; border:1px solid rgba(200,169,106,.2); }
  .module-meta { display:flex; gap:14px; flex-wrap:wrap; }
  .meta-item { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:600; color:#9A8A70; }
  .meta-item svg { width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2; }
  .module-action { display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:12px; font-family:'Cairo',sans-serif; font-size:14px; font-weight:700; cursor:pointer; transition:all .2s ease; border:none; flex-shrink:0; }
  .module-action.start { background:linear-gradient(135deg,#C8A96A,#E5B93C); color:white; box-shadow:0 3px 12px rgba(200,169,106,.3); }
  .module-action.start:hover { transform:scale(1.04); box-shadow:0 6px 18px rgba(200,169,106,.38); }
  .module-action.view { background:#FFFDF8; border:1.5px solid rgba(200,169,106,.25); color:#1A1208; }
  .module-action.view:hover { background:#FDF5E0; border-color:rgba(200,169,106,.4); }
  .module-action svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .module-action.start svg { fill:currentColor; stroke:none; }

  /* ── LESSON VIEWER ── */
  .lesson-page { max-width:680px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; font-family:'Cairo',sans-serif; }
  .lesson-topbar { display:flex; align-items:center; gap:12px; padding:14px 18px; background:#0B0B0C; border-bottom:1px solid rgba(200,169,106,.15); position:sticky; top:0; z-index:50; }
  .lesson-mod-title { flex:1; font-size:16px; font-weight:800; color:#FFFFFF; }
  .lesson-meta-pill { background:rgba(200,169,106,.15); color:#C8A96A; font-size:12px; font-weight:700; padding:4px 11px; border-radius:100px; white-space:nowrap; border:1px solid rgba(200,169,106,.2); }
  .lesson-feed { padding:22px 18px; display:flex; flex-direction:column; gap:18px; background:#F6F4EE; flex:1; }
  .lesson-empty-content { text-align:center; padding:56px 20px; color:#9A8A70; font-size:15px; font-weight:600; }
  .content-card { border-radius:18px; overflow:hidden; animation:slideUp .5s ease backwards; }

  .text-card { background:#FFFDF8; border:1px solid rgba(200,169,106,.15); border-left:4px solid #C8A96A; padding:22px 24px; box-shadow:0 3px 14px rgba(0,0,0,.05); }
  .text-block-body { font-size:16px; font-weight:500; color:#1f2937; line-height:1.9; }

  .image-card { background:#FFFDF8; border:1px solid rgba(200,169,106,.15); box-shadow:0 3px 14px rgba(0,0,0,.05); }
  .lesson-image { width:100%; max-height:420px; object-fit:contain; display:block; }
  .image-caption { padding:11px 18px; font-size:13px; color:#9A8A70; font-weight:600; text-align:center; border-top:1px solid rgba(200,169,106,.1); }

  .video-card { background:#FFFDF8; border:1px solid rgba(200,169,106,.15); box-shadow:0 3px 14px rgba(0,0,0,.05); }
  .video-header { display:flex; align-items:center; gap:12px; padding:14px 18px; background:#0B0B0C; }
  .video-play-icon { width:18px; height:18px; color:#C8A96A; flex-shrink:0; }
  .video-header span { font-size:15px; font-weight:700; color:white; flex:1; }
  .video-embed-wrap { position:relative; padding-top:56.25%; }
  .video-iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:none; }
  .video-fallback { padding:28px 20px; text-align:center; }
  .video-link-btn { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#C8A96A,#E5B93C); color:white; border-radius:12px; padding:11px 24px; font-family:'Cairo',sans-serif; font-size:15px; font-weight:700; text-decoration:none; transition:all .2s ease; }
  .video-link-btn:hover { transform:scale(1.03); box-shadow:0 6px 18px rgba(200,169,106,.35); }

  .lesson-bottom-bar { position:sticky; bottom:0; background:#FFFDF8; border-top:1.5px solid rgba(200,169,106,.15); padding:14px 18px 18px; z-index:50; margin-top:auto; }
  .lesson-start-btn { width:100%; padding:15px; background:linear-gradient(135deg,#C8A96A,#E5B93C); color:white; border:none; border-radius:14px; font-family:'Cairo',sans-serif; font-size:18px; font-weight:800; cursor:pointer; transition:all .2s ease; }
  .lesson-start-btn:hover { transform:scale(1.02); box-shadow:0 8px 22px rgba(200,169,106,.38); }
  .lesson-cta-hint { margin-top:7px; font-size:12px; color:#9A8A70; font-weight:600; text-align:center; }

  /* ── QUIZ SCREEN ── */
  .quiz-screen { max-width:600px; margin:0 auto; padding:24px 20px 80px; min-height:100vh; animation:fadeIn .4s ease; font-family:'Cairo',sans-serif; }
  .quiz-top-bar { display:flex; align-items:center; gap:14px; margin-bottom:22px; }
  .quiz-module-title { flex:1; font-size:18px; font-weight:800; color:#0B0B0C; }
  .quiz-container { animation:fadeInUp .5s ease; font-family:'Cairo',sans-serif; }
  .quiz-header { margin-bottom:26px; }
  .quiz-progress-bar { height:8px; background:rgba(200,169,106,.12); border-radius:100px; overflow:hidden; margin-bottom:10px; border:1px solid rgba(200,169,106,.15); }
  .quiz-progress-fill { height:100%; background:linear-gradient(90deg,#C8A96A,#E5B93C); border-radius:100px; transition:width .4s ease; }
  .quiz-progress-text { display:flex; justify-content:center; align-items:center; gap:8px; font-size:15px; font-weight:700; }
  .progress-current { color:#C8A96A; }
  .progress-divider { color:rgba(200,169,106,.3); }
  .progress-total { color:#9A8A70; }
  .question-card { background:#FFFDF8; border:1.5px solid rgba(200,169,106,.18); border-radius:22px; padding:26px; margin-bottom:22px; box-shadow:0 6px 28px rgba(0,0,0,.06); animation:fadeInUp .4s ease; }
  .question-badge { margin-bottom:18px; }
  .question-badge span { display:inline-block; padding:5px 14px; border-radius:100px; font-size:12px; font-weight:700; }
  .badge-mcq { background:#FDF5E0; color:#8A6820; }
  .badge-tf { background:#FDF9F0; color:#7A6030; border:1px solid rgba(200,169,106,.2); }
  .badge-written { background:#EFF6FF; color:#1e40af; }
  .badge-matching { background:#F0FDF4; color:#166534; }
  .question-text { font-size:20px; font-weight:800; color:#0B0B0C; line-height:1.65; margin-bottom:22px; }

  .options-grid { display:flex; flex-direction:column; gap:10px; }
  .tf-grid { flex-direction:row; }
  .option-card { display:flex; align-items:center; gap:12px; width:100%; padding:14px 16px; background:#FAFAF8; border:1.5px solid rgba(200,169,106,.15); border-radius:14px; font-family:'Cairo',sans-serif; cursor:pointer; transition:all .22s ease; }
  .option-card:hover { border-color:rgba(200,169,106,.35); background:#FDF9F0; }
  .option-card.selected { border-color:#C8A96A; background:linear-gradient(135deg,#FDF9F0,#FDF5E0); }
  .option-card.pop { animation:pop .3s ease; }
  .tf-card { flex:1; justify-content:center; }
  .option-indicator { width:34px; height:34px; border-radius:50%; background:white; border:1.5px solid rgba(200,169,106,.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .22s ease; }
  .option-card.selected .option-indicator { background:linear-gradient(135deg,#C8A96A,#E5B93C); border-color:#C8A96A; }
  .option-letter { font-size:13px; font-weight:800; color:#B0A48A; }
  .check-icon { width:18px; height:18px; fill:none; stroke:white; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
  .option-text { flex:1; font-size:16px; font-weight:700; color:#1A1208; }
  .tf-label { font-size:18px; }

  .written-wrap { display:flex; flex-direction:column; gap:10px; }
  .written-textarea { width:100%; padding:14px; border:1.5px solid rgba(200,169,106,.2); border-radius:14px; font-family:'Cairo',sans-serif; font-size:15px; font-weight:500; color:#1f2937; resize:vertical; outline:none; transition:border-color .2s ease; background:#FAFAF8; line-height:1.8; }
  .written-textarea:focus { border-color:#C8A96A; background:white; }
  .written-hint { font-size:12px; color:#9A8A70; font-weight:600; }

  .matching-wrap { display:flex; flex-direction:column; gap:13px; }
  .matching-hint { font-size:13px; color:#9A8A70; font-weight:600; margin-bottom:2px; }
  .matching-pairs { display:flex; flex-direction:column; gap:10px; }
  .matching-row { display:flex; align-items:center; gap:10px; background:#FAFAF8; border:1.5px solid rgba(200,169,106,.15); border-radius:12px; padding:10px 14px; }
  .matching-left { flex:1; font-size:15px; font-weight:700; color:#0B0B0C; }
  .matching-arrow { font-size:14px; color:#C8A96A; font-weight:900; flex-shrink:0; }
  .matching-select { flex:1; padding:9px 12px; border:1.5px solid rgba(200,169,106,.2); border-radius:10px; font-family:'Cairo',sans-serif; font-size:14px; font-weight:700; color:#1A1208; outline:none; cursor:pointer; background:white; transition:border-color .2s ease; }
  .matching-select:focus, .matching-select.filled { border-color:#C8A96A; background:#FDF9F0; }
  .matching-incomplete { font-size:12px; color:#9A8A70; font-weight:600; }

  .already-attempted { text-align:center; padding:56px 20px; font-family:'Cairo',sans-serif; }
  .already-icon-wrap { width:72px; height:72px; margin:0 auto 18px; background:rgba(200,169,106,.08); border:1.5px solid rgba(200,169,106,.2); border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .already-lock-svg { width:30px; height:30px; color:#C8A96A; }
  .already-attempted h3 { font-size:20px; font-weight:800; color:#0B0B0C; margin-bottom:8px; }
  .already-attempted p { font-size:15px; color:#9A8A70; font-weight:600; }

  .quiz-error { display:flex; align-items:center; justify-content:center; gap:9px; padding:13px; background:#FDFAF5; border:1.5px solid rgba(200,169,106,.25); border-radius:12px; margin-bottom:18px; font-size:14px; font-weight:700; color:#8A6820; }
  .error-icon { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; }
  .quiz-navigation { display:flex; gap:10px; margin-bottom:26px; }
  .nav-button { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:13px 18px; border-radius:13px; font-family:'Cairo',sans-serif; font-size:15px; font-weight:700; cursor:pointer; transition:all .2s ease; border:none; }
  .nav-button svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .nav-button.prev { background:#FFFDF8; color:#9A8A70; border:1.5px solid rgba(200,169,106,.2); }
  .nav-button.prev:hover:not(:disabled) { background:#FDF5E0; border-color:rgba(200,169,106,.35); color:#1A1208; }
  .nav-button.prev:disabled { opacity:.4; cursor:not-allowed; }
  .nav-button.next { background:linear-gradient(135deg,#C8A96A,#E5B93C); color:white; }
  .nav-button.next:hover:not(:disabled) { transform:scale(1.02); box-shadow:0 6px 18px rgba(200,169,106,.35); }
  .nav-button.next:disabled { opacity:.5; cursor:not-allowed; }
  .nav-button.submit { background:#0B0B0C; color:#C8A96A; }
  .nav-button.submit:hover:not(:disabled) { background:#1A1208; }
  .nav-button.submit:disabled { opacity:.5; cursor:not-allowed; }
  .submit-count { background:rgba(200,169,106,.18); padding:3px 9px; border-radius:8px; font-size:13px; }
  .question-dots { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
  .q-dot { width:34px; height:34px; border-radius:50%; background:#FAFAF8; border:1.5px solid rgba(200,169,106,.2); display:flex; align-items:center; justify-content:center; font-family:'Cairo',sans-serif; cursor:pointer; transition:all .2s ease; }
  .q-dot:hover { border-color:rgba(200,169,106,.4); }
  .q-dot.current { border-color:#C8A96A; background:#FDF5E0; }
  .q-dot.answered { background:linear-gradient(135deg,#C8A96A,#E5B93C); border-color:#C8A96A; }
  .q-dot.answered .dot-number { color:white; }
  .dot-number { font-size:13px; font-weight:800; color:#9A8A70; }
  .q-dot.current .dot-number { color:#C8A96A; }

  /* ── RESULT SCREEN ── */
  .result-container { max-width:420px; margin:0 auto; padding:46px 24px 60px; text-align:center; animation:fadeInUp .6s ease; position:relative; font-family:'Cairo',sans-serif; }
  .confetti-container { position:fixed; top:0; left:0; right:0; height:100vh; pointer-events:none; overflow:hidden; z-index:100; }
  .confetti { position:absolute; width:11px; height:11px; border-radius:2px; animation:confetti 3s ease-out forwards; }

  .score-circle-container { position:relative; width:190px; height:190px; margin:0 auto 26px; }
  .score-circle-svg { width:100%; height:100%; transform:rotate(-90deg); }
  .score-bg { fill:none; stroke:rgba(200,169,106,.12); stroke-width:14; }
  .score-fill { fill:none; stroke:#C8A96A; stroke-width:14; stroke-linecap:round; transition:stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1); }
  .score-content { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .score-value { font-size:48px; font-weight:900; color:#0B0B0C; line-height:1; }

  .result-message { margin-bottom:26px; }
  .result-title { font-size:28px; font-weight:900; color:#C8A96A; margin-bottom:8px; }
  .result-detail { font-size:16px; font-weight:600; color:#9A8A70; }

  .result-progress { position:relative; margin-bottom:44px; }
  .result-progress-labels { display:flex; justify-content:space-between; margin-bottom:6px; direction:ltr; }
  .rp-label-start, .rp-label-end { font-size:12px; font-weight:700; color:#B0A48A; }
  .result-progress-bg { height:16px; background:rgba(200,169,106,.1); border-radius:100px; overflow:hidden; direction:ltr; position:relative; border:1px solid rgba(200,169,106,.15); }
  .result-progress-fill { height:100%; border-radius:100px; background:linear-gradient(90deg,#C8A96A,#E5B93C); transition:width 1.3s cubic-bezier(.4,0,.2,1); }
  .result-score-marker { position:absolute; top:-4px; display:flex; flex-direction:column; align-items:center; gap:2px; transform:translateX(-50%); transition:left 1.3s cubic-bezier(.4,0,.2,1); pointer-events:none; }
  .score-marker-dot { width:9px; height:24px; border-radius:100px; background:#0B0B0C; }
  .score-marker-label { font-size:11px; font-weight:800; color:#0B0B0C; white-space:nowrap; margin-top:3px; }
  .result-actions { display:flex; flex-direction:column; gap:12px; }
  .action-button { display:flex; align-items:center; justify-content:center; gap:9px; width:100%; padding:15px; border-radius:14px; font-family:'Cairo',sans-serif; font-size:17px; font-weight:700; cursor:pointer; transition:all .2s ease; border:none; }
  .action-button svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .action-button.secondary { background:#FFFDF8; color:#1A1208; border:1.5px solid rgba(200,169,106,.25); }
  .action-button.secondary:hover { background:#FDF5E0; border-color:rgba(200,169,106,.4); }

  /* ── RESPONSIVE ── */
  @media (max-width:480px) {
    .roadmap-hero { padding:22px 20px 20px; }
    .roadmap-hero-title { font-size:19px; }
    .roadmap-progress-card { padding:16px 20px 16px; }
    .progress-value { font-size:22px; }
    .stage-button { padding:12px; }
    .stage-title { font-size:15px; }
    .stage-node { max-width:230px; }
    .map-legend { gap:14px; padding:10px 18px; }
    .legend-item { font-size:12px; }
    .tf-grid { flex-direction:column; }
    .modules-container,.quiz-screen { padding:18px 14px 80px; }
    .question-card { padding:20px 16px; border-radius:18px; }
    .module-card { padding:14px; gap:11px; }
    .lesson-feed { padding:18px 14px; }
    .text-card { padding:18px 16px; }
    .result-container { padding:38px 18px 50px; }
  }
  @media (max-width:360px) {
    .map-legend { gap:9px; padding:9px 14px; }
    .legend-item { font-size:11px; }
    .stage-node { max-width:210px; }
    .stage-circle { width:46px; height:46px; }
    .stage-title { font-size:14px; }
    .question-card { padding:16px 13px; }
    .nav-button { padding:12px 12px; font-size:14px; }
    .option-card { padding:12px 13px; }
  }
`;
