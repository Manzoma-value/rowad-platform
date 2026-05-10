/* eslint-disable react-hooks/exhaustive-deps */
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ContentType = "TEXT" | "IMAGE" | "VIDEO";
type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
type Screen = "map" | "modules" | "lesson" | "quiz" | "result";

interface ModuleContent {
  id: string;
  type: ContentType;
  order: number;
  body?: string | null;
  image_url?: string | null;
  alt_text?: string | null;
  video_url?: string | null;
  video_title?: string | null;
}

interface Option {
  id: string;
  text: string;
  order: number;
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
  order: number;
}

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: Option[];
  matching_pairs: MatchingPair[];
  order: number;
}

interface ModuleAttempt {
  score: number;
  total: number;
  passed: boolean;
}

interface ModuleData {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  contents: ModuleContent[];
  questions: Question[];
  attempt: ModuleAttempt | null;
}

interface Stage {
  id: string;
  title: string;
  order: number;
  modules: ModuleData[];
}

interface Roadmap {
  id: string;
  title: string;
  stages: Stage[];
}

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
}

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
    : stage.modules.filter((m) => m.attempt !== null).length /
      stage.modules.length;

const moduleLocked = (stage: Stage, idx: number): boolean => {
  if (idx === 0) return false;
  return stage.modules[idx - 1].attempt === null;
};

// ─── LESSON VIEWER ────────────────────────────────────────────────────────────

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

function LessonViewer({
  module: mod,
  onComplete,
  onBack,
  readOnly = false,
}: {
  module: ModuleData;
  onComplete: () => void;
  onBack: () => void;
  readOnly?: boolean;
}) {
  const hasQuestions = mod.questions.length > 0;

  return (
    <div className="lesson-page">
      {/* Top bar */}
      <div className="lesson-topbar">
        <button className="back-button small" onClick={onBack}>
          <svg viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>رجوع</span>
        </button>
        <h2 className="lesson-mod-title" dir="rtl">
          {mod.title}
        </h2>
        <span className="lesson-meta-pill">{mod.contents.length} محتوى</span>
      </div>

      {/* Content feed */}
      <div className="lesson-feed">
        {mod.contents.length === 0 && (
          <div className="lesson-empty-content">
            <span>لا يوجد محتوى لهذه الوحدة</span>
          </div>
        )}

        {mod.contents
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block, i) => {
            if (block.type === "TEXT") {
              return (
                <div
                  key={block.id}
                  className="content-card text-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <p className="text-block-body" dir="rtl">
                    {block.body}
                  </p>
                </div>
              );
            }

            if (block.type === "IMAGE") {
              return (
                <div
                  key={block.id}
                  className="content-card image-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  {block.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={block.image_url}
                      alt={block.alt_text ?? "صورة الدرس"}
                      className="lesson-image"
                    />
                  )}
                  {block.alt_text && (
                    <p className="image-caption" dir="rtl">
                      {block.alt_text}
                    </p>
                  )}
                </div>
              );
            }

            if (block.type === "VIDEO") {
              const ytId = block.video_url
                ? extractYouTubeId(block.video_url)
                : null;
              return (
                <div
                  key={block.id}
                  className="content-card video-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="video-header">
                    <svg viewBox="0 0 24 24" className="video-play-icon">
                      <polygon points="5,3 19,12 5,21" fill="currentColor" />
                    </svg>
                    <span dir="rtl">{block.video_title ?? "فيديو"}</span>
                  </div>
                  {ytId ? (
                    <div className="video-embed-wrap">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={block.video_title ?? "فيديو"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="video-iframe"
                      />
                    </div>
                  ) : block.video_url ? (
                    <div className="video-fallback">
                      <a
                        href={block.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="video-link-btn"
                      >
                        مشاهدة الفيديو ←
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            }

            return null;
          })}
      </div>

      {/* Sticky bottom CTA */}
      {!readOnly && (
        <div className="lesson-bottom-bar">
          <button className="lesson-start-btn" onClick={onComplete}>
            {hasQuestions ? "ابدأ الأسئلة ←" : "إنهاء الدرس ✓"}
          </button>
          {hasQuestions && (
            <p className="lesson-cta-hint">بعد مراجعة الدرس، ابدأ الاختبار</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── QUIZ PLAYER ──────────────────────────────────────────────────────────────

function QuizPlayer({
  mod,
  onDone,
}: {
  mod: ModuleData;
  onDone: (r: QuizResult) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);

  // Safety: already attempted
  if (mod.attempt !== null) {
    return (
      <div className="already-attempted">
        <div className="already-icon">🔒</div>
        <h3>لقد أديت هذا الاختبار من قبل</h3>
        <p>
          حصلت على {mod.attempt.score} من {mod.attempt.total}
        </p>
      </div>
    );
  }

  const questions = mod.questions.slice().sort((a, b) => a.order - b.order);
  const q = questions[current];
  const total = questions.length;
  const answered = Object.keys(answers).length;

  const allAnswered = questions.every(
    (qq) => answers[qq.id] !== undefined && answers[qq.id] !== "",
  );

  const submit = async () => {
    if (!allAnswered) {
      setError("أجب على جميع الأسئلة أولاً");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));
      const res = await fetch(
        `/api/student/roadmap/modules/${mod.id}/attempt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل التسليم");
      onDone(data.attempt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
      setSubmitting(false);
    }
  };

  // ── MCQ ──
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
            >
              <span className="option-indicator">
                {selected ? (
                  <svg viewBox="0 0 24 24" className="check-icon">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                )}
              </span>
              <span className="option-text" dir="rtl">
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // ── TF ──
  const renderTF = () => {
    const tfOpts = [
      { label: "صح", val: "true" },
      { label: "خطأ", val: "false" },
    ];
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
                  <svg viewBox="0 0 24 24" className="check-icon">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                )}
              </span>
              <span className="option-text tf-label" dir="rtl">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // ── WRITTEN ──
  const renderWritten = () => (
    <div className="written-wrap">
      <textarea
        className="written-textarea"
        dir="rtl"
        rows={4}
        placeholder="اكتب إجابتك هنا..."
        value={answers[q.id] ?? ""}
        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
      />
      <span className="written-hint">اكتب إجابة واضحة ومفصلة</span>
    </div>
  );

  // ── MATCHING ──
  const renderMatching = () => {
    const pairs = q.matching_pairs.slice().sort((a, b) => a.order - b.order);
    const rightValues = pairs.map((p) => p.right);

    const currentMatching: Record<string, string> = (() => {
      try {
        return answers[q.id] ? JSON.parse(answers[q.id]) : {};
      } catch {
        return {};
      }
    })();

    const updateMatching = (leftVal: string, rightVal: string) => {
      const updated = { ...currentMatching, [leftVal]: rightVal };
      setAnswers((p) => ({ ...p, [q.id]: JSON.stringify(updated) }));
    };

    const isComplete = pairs.every((p) => currentMatching[p.left]);

    return (
      <div className="matching-wrap">
        <p className="matching-hint" dir="rtl">
          صل كل عنصر في العمود الأيمن بما يناسبه
        </p>
        <div className="matching-pairs">
          {pairs.map((pair) => (
            <div key={pair.id} className="matching-row">
              <select
                className={`matching-select ${currentMatching[pair.left] ? "filled" : ""}`}
                value={currentMatching[pair.left] ?? ""}
                onChange={(e) => updateMatching(pair.left, e.target.value)}
                dir="rtl"
              >
                <option value="">اختر...</option>
                {rightValues.map((rv) => (
                  <option key={rv} value={rv}>
                    {rv}
                  </option>
                ))}
              </select>
              <span className="matching-arrow">→</span>
              <span className="matching-left" dir="rtl">
                {pair.left}
              </span>
            </div>
          ))}
        </div>
        {!isComplete && (
          <p className="matching-incomplete" dir="rtl">
            أكمل جميع التوصيلات للمتابعة
          </p>
        )}
      </div>
    );
  };

  const getTypeBadge = () => {
    switch (q.type) {
      case "MCQ":
        return <span className="badge-mcq">اختيار من متعدد</span>;
      case "TF":
        return <span className="badge-tf">صح / خطأ</span>;
      case "WRITTEN":
        return <span className="badge-written">سؤال مقالي</span>;
      case "MATCHING":
        return <span className="badge-matching">توصيل</span>;
    }
  };

  const isCurrentAnswered = (): boolean => {
    if (!answers[q.id]) return false;
    if (q.type === "MATCHING") {
      try {
        const m = JSON.parse(answers[q.id]);
        return q.matching_pairs.every((p) => m[p.left]);
      } catch {
        return false;
      }
    }
    return answers[q.id].trim().length > 0;
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
        <div className="quiz-progress-text">
          <span className="progress-current">السؤال {current + 1}</span>
          <span className="progress-divider">/</span>
          <span className="progress-total">{total}</span>
        </div>
      </div>

      <div className="question-card" key={q.id}>
        <div className="question-badge">{getTypeBadge()}</div>
        <h2 className="question-text" dir="rtl">
          {q.text}
        </h2>

        {q.type === "MCQ" && renderMCQ()}
        {q.type === "TF" && renderTF()}
        {q.type === "WRITTEN" && renderWritten()}
        {q.type === "MATCHING" && renderMatching()}
      </div>

      {error && (
        <div className="quiz-error">
          <svg viewBox="0 0 24 24" className="error-icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="quiz-navigation">
        <button
          className="nav-button prev"
          onClick={() => setCurrent((c) => c - 1)}
          disabled={current === 0}
        >
          <span>السابق</span>
          <svg viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {current < total - 1 ? (
          <button
            className="nav-button next"
            onClick={() => setCurrent((c) => c + 1)}
            disabled={!isCurrentAnswered()}
          >
            <svg viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>التالي</span>
          </button>
        ) : (
          <button
            className="nav-button submit"
            onClick={submit}
            disabled={!allAnswered || submitting}
          >
            {submitting ? (
              <span className="submit-loading">جارٍ التسليم...</span>
            ) : (
              <>
                <span>تسليم</span>
                <span className="submit-count">
                  {answered}/{total}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="question-dots">
        {questions.map((qq, i) => {
          const ans = answers[qq.id];
          const isDone =
            ans !== undefined &&
            ans !== "" &&
            (() => {
              if (qq.type === "MATCHING") {
                try {
                  const m = JSON.parse(ans);
                  return qq.matching_pairs.every((p) => m[p.left]);
                } catch {
                  return false;
                }
              }
              return true;
            })();
          return (
            <button
              key={qq.id}
              className={`q-dot ${i === current ? "current" : ""} ${isDone ? "answered" : ""}`}
              onClick={() => setCurrent(i)}
            >
              <span className="dot-number">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────

function ResultScreen({
  result,
  onBack,
}: {
  result: QuizResult;
  onBack: () => void;
}) {
  const circleRef = useRef<SVGCircleElement>(null);

  // pct = actual percentage (0-100) based on correct/total
  const pct =
    result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;

  const passed = true;

  useEffect(() => {
    if (circleRef.current) {
      const circumference = 2 * Math.PI * 90;
      // strokeDashoffset: full circumference = 0%, 0 = 100%
      const offset = circumference - (pct / 100) * circumference;
      circleRef.current.style.strokeDashoffset = String(offset);
    }
  }, [pct]);

  return (
    <div className="result-container">
      {passed && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#E5B93C", "#C8A96A", "#FDF5E0", "#0B0B0C"][
                  Math.floor(Math.random() * 4)
                ],
              }}
            />
          ))}
        </div>
      )}

      <div className={`score-circle-container ${passed ? "passed" : "failed"}`}>
        <svg viewBox="0 0 200 200" className="score-circle-svg">
          <circle cx="100" cy="100" r="90" className="score-bg" />
          <circle
            ref={circleRef}
            cx="100"
            cy="100"
            r="90"
            className="score-fill"
            strokeDasharray={`${2 * Math.PI * 90}`}
            strokeDashoffset={`${2 * Math.PI * 90}`}
          />
        </svg>
        <div className="score-content">
          <span className="score-value">{pct}%</span>
        </div>
      </div>

      <div className="result-message">
        <div className={`result-status-banner ${passed ? "passed" : "failed"}`}>
          {passed ? "✓ ناجح" : "✗ لم تجتز"}
        </div>
        <h2 className={`result-title ${passed ? "passed" : "failed"}`}>
          {passed ? "أحسنت! نجحت 🎉" : "حاول في الوحدة التالية"}
        </h2>
        <p className="result-detail">
          {result.score} من {result.total} إجابة صحيحة
        </p>
      </div>

      <div className="result-progress">
        <div className="result-progress-labels">
          <span className="rp-label-start">0%</span>
          <span className="rp-label-end">100%</span>
        </div>
        <div className="result-progress-bg">
          <div
            className={`result-progress-fill ${passed ? "passed" : "failed"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="result-threshold">
          <span className="threshold-line" />
        </div>
        <div className="result-score-marker" style={{ left: `${pct}%` }}>
          <span className="score-marker-dot" />
          <span className="score-marker-label">{pct}%</span>
        </div>
      </div>

      {!passed && (
        <p className="result-encourage" dir="rtl">
          لا تقلق، استمر في التعلم وستتحسن في الوحدات القادمة 💪
        </p>
      )}

      <div className="result-actions">
        <button className="action-button secondary" onClick={onBack}>
          <svg viewBox="0 0 24 24">
            <path d="M3 12h18M3 12l6 6M3 12l6-6" />
          </svg>
          <span>العودة للمرحلة</span>
        </button>
      </div>
    </div>
  );
}

// ─── MODULES LIST ─────────────────────────────────────────────────────────────

function ModulesList({
  stage,
  onSelect,
  onBack,
}: {
  stage: Stage;
  onSelect: (m: ModuleData, readOnly: boolean) => void;
  onBack: () => void;
}) {
  const contentTypePills = (mod: ModuleData) => {
    const types = new Set(mod.contents.map((c) => c.type));
    return (
      <div className="content-type-pills">
        {types.has("TEXT") && (
          <span className="type-pill text-pill">📖 نص</span>
        )}
        {types.has("IMAGE") && (
          <span className="type-pill image-pill">🖼 صورة</span>
        )}
        {types.has("VIDEO") && (
          <span className="type-pill video-pill">▶ فيديو</span>
        )}
      </div>
    );
  };

  return (
    <div className="modules-container">
      <button className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>العودة للخارطة</span>
      </button>

      <div className="modules-header">
        <div className="stage-badge">
          <span className="badge-text">المرحلة {stage.order}</span>
        </div>
        <h1 className="modules-title" dir="rtl">
          {stage.title}
        </h1>
        <p className="modules-subtitle" dir="rtl">
          {stage.modules.filter((m) => m.attempt !== null).length} من{" "}
          {stage.modules.length} وحدات مكتملة
        </p>
      </div>

      <div className="modules-grid">
        {stage.modules.map((mod, idx) => {
          const locked = moduleLocked(stage, idx);
          const attempted = mod.attempt !== null;

          return (
            <div
              key={mod.id}
              className={`module-card ${locked ? "locked" : ""} ${attempted ? "completed" : ""}`}
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              {/* Score badge */}
              {attempted && (
                <div className="module-score-badge pass">
                  ✓ {mod.attempt!.score}/{mod.attempt!.total}
                </div>
              )}

              <div className="module-status-icon">
                {attempted ? (
                  <div className="status-completed">
                    <svg viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                ) : locked ? (
                  <div className="status-locked">
                    <svg viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path
                        d="M8 11V7a4 4 0 118 0v4"
                        fill="none"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="status-available">
                    <span>{idx + 1}</span>
                  </div>
                )}
              </div>

              <div className="module-content">
                <h3 className="module-title" dir="rtl">
                  {mod.title}
                </h3>
                {mod.contents.length > 0 && contentTypePills(mod)}
                <div className="module-meta">
                  <span className="meta-item">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {mod.contents.length > 0
                      ? `${mod.contents.length} محتوى · ${mod.questions.length} سؤال`
                      : `${mod.questions.length} سؤال`}
                  </span>
                </div>
              </div>

              {!locked && (
                <button
                  className={`module-action ${attempted ? "view" : "start"}`}
                  onClick={() => onSelect(mod, attempted)}
                >
                  {attempted ? (
                    <>
                      <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>عرض</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                      <span>ابدأ</span>
                    </>
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
  const startY = 60;
  const stageSpacing = 160;
  const curveWidth = 120;
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
  const finalY = startY + stageCount * stageSpacing + 60;
  path += ` L 200 ${finalY}`;
  return path;
}

function getNodePosition(index: number): {
  top: string;
  left?: string;
  right?: string;
} {
  const startY = 100;
  const spacing = 160;
  const isLeft = index % 2 === 0;
  return {
    top: `${startY + index * spacing}px`,
    ...(isLeft ? { left: "10px" } : { right: "10px" }),
  };
}

function RoadmapView({
  roadmap,
  onSelect,
}: {
  roadmap: Roadmap;
  onSelect: (s: Stage) => void;
}) {
  const totalStages = roadmap.stages.length;
  const completedCount = roadmap.stages.filter((s) => stageComplete(s)).length;
  const overallProgress =
    totalStages > 0 ? (completedCount / totalStages) * 100 : 0;

  return (
    <div className="roadmap-container">
      <div className="roadmap-header">
        <div className="header-badge">
          <span className="badge-label">خريطة التعلم</span>
        </div>
        <h1 className="roadmap-title" dir="rtl">
          {roadmap.title}
        </h1>
        <div className="overall-progress">
          <div className="progress-info">
            <span className="progress-label">التقدم الكلي</span>
            <span className="progress-value">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="progress-detail">
            {completedCount} من {totalStages} مراحل مكتملة
          </p>
        </div>
      </div>

      <div className="game-map">
        <svg
          className="path-svg"
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E5B93C" />
              <stop offset="100%" stopColor="#C8A96A" />
            </linearGradient>
            <filter id="pathGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={generatePath(totalStages)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={generatePath(totalStages)}
            fill="none"
            stroke="url(#pathGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2000"
            strokeDashoffset={2000 - (overallProgress / 100) * 2000}
            filter="url(#pathGlow)"
          />
          <path
            d={generatePath(totalStages)}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="0 20"
          />
        </svg>

        <div className="map-start" style={{ top: "20px" }}>
          <div className="start-node">
            <div className="start-pulse" />
            <div className="start-circle">
              <svg viewBox="0 0 24 24" className="start-icon">
                <polygon
                  points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
          <span className="start-label">ابدأ رحلتك</span>
        </div>

        {roadmap.stages.map((stage, idx) => {
          const locked = stageLocked(roadmap.stages, idx);
          const completed = stageComplete(stage);
          const progress = stageProgress(stage) * 100;
          const position = getNodePosition(idx);

          return (
            <div
              key={stage.id}
              className={`stage-node ${completed ? "completed" : locked ? "locked" : "active"}`}
              style={{
                top: position.top,
                left: position.left,
                right: position.right,
              }}
            >
              <button
                className="stage-button"
                onClick={() => !locked && onSelect(stage)}
                disabled={locked}
              >
                <div className="stage-circle">
                  {!locked && !completed && (
                    <svg className="progress-ring" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" className="ring-bg" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        className="ring-fill"
                        strokeDasharray={`${progress * 2.83} 283`}
                      />
                    </svg>
                  )}
                  <div className="circle-inner">
                    {completed ? (
                      <svg viewBox="0 0 24 24" className="stage-icon check">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : locked ? (
                      <svg viewBox="0 0 24 24" className="stage-icon lock">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 118 0v4" />
                      </svg>
                    ) : (
                      <span className="stage-number">{stage.order}</span>
                    )}
                  </div>
                  {completed && <div className="completed-glow" />}
                </div>

                <div className="stage-info">
                  <h3 className="stage-title" dir="rtl">
                    {stage.title}
                  </h3>
                  <div className="stage-meta">
                    {completed ? (
                      <span className="meta-completed">مكتملة</span>
                    ) : locked ? (
                      <span className="meta-locked">مقفلة</span>
                    ) : (
                      <span className="meta-progress">
                        {stage.modules.filter((m) => m.attempt !== null).length}
                        /{stage.modules.length}
                      </span>
                    )}
                  </div>
                  {!locked && stage.modules.length > 0 && (
                    <div className="stage-dots">
                      {stage.modules.map((m) => (
                        <span
                          key={m.id}
                          className={`dot ${m.attempt !== null ? "filled" : ""}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {!locked && (
                  <div className="stage-arrow">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
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

        <div
          className={`map-end ${completedCount === totalStages ? "achieved" : ""}`}
          style={{ top: `${100 + totalStages * 160}px` }}
        >
          <div className="end-node">
            <div className="end-glow" />
            <div className="end-circle">
              <svg viewBox="0 0 24 24" className="end-icon">
                <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
                <path d="M4 5h16v4a6 6 0 01-6 6h-4a6 6 0 01-6-6V5z" />
                <path d="M12 15v4M8 19h8" />
              </svg>
            </div>
          </div>
          <span className="end-label">
            {completedCount === totalStages
              ? "مبروك! أكملت الرحلة"
              : "الهدف النهائي"}
          </span>
        </div>
      </div>

      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot completed" />
          <span>مكتملة</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot active" />
          <span>متاحة</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot locked" />
          <span>مقفلة</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StudentRoadmapPage() {
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
      // Sync selected stage if present
      if (fresh && selectedStage) {
        const freshStage = fresh.stages.find((s) => s.id === selectedStage.id);
        if (freshStage) setSelectedStage(freshStage);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const handleStageSelect = (stage: Stage) => {
    setSelectedStage(stage);
    setScreen("modules");
  };

  const handleModuleSelect = (mod: ModuleData, readOnly: boolean) => {
    setSelectedModule(mod);
    setLessonReadOnly(readOnly);
    setQuizResult(null);
    if (mod.contents.length > 0) {
      setScreen("lesson");
    } else {
      setScreen("quiz");
    }
  };

  const handleLessonComplete = () => {
    setScreen("quiz");
  };

  const handleQuizDone = async (result: QuizResult) => {
    setQuizResult(result);
    setScreen("result");
    await load();
  };

  const handleBackToModules = () => {
    // Refresh the selected stage from fresh roadmap
    if (roadmap && selectedStage) {
      const fresh = roadmap.stages.find((s) => s.id === selectedStage.id);
      if (fresh) setSelectedStage(fresh);
    }
    setScreen("modules");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner-ring" />
            <div className="spinner-ring r2" />
            <div className="spinner-ring r3" />
          </div>
          <p className="loading-text">جارٍ تحميل خريطتك...</p>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="empty-screen">
        <div className="empty-content">
          <div className="empty-icon-wrap">
            <svg viewBox="0 0 24 24" className="empty-icon">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="empty-title">لا توجد خريطة بعد</h2>
          <p className="empty-desc">لا يوجد بنك أسئلة لمدرستك حتى الآن</p>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <div className="game-page">
      {screen === "map" && (
        <RoadmapView roadmap={roadmap} onSelect={handleStageSelect} />
      )}

      {screen === "modules" && selectedStage && (
        <ModulesList
          stage={selectedStage}
          onSelect={handleModuleSelect}
          onBack={() => setScreen("map")}
        />
      )}

      {screen === "lesson" && selectedModule && (
        <LessonViewer
          module={selectedModule}
          onComplete={handleLessonComplete}
          onBack={() => setScreen("modules")}
          readOnly={lessonReadOnly}
        />
      )}

      {screen === "quiz" && selectedModule && (
        <div className="quiz-screen">
          <div className="quiz-top-bar">
            <button
              className="back-button small"
              onClick={() => setScreen("modules")}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>رجوع</span>
            </button>
            <h2 className="quiz-module-title" dir="rtl">
              {selectedModule.title}
            </h2>
          </div>
          <QuizPlayer mod={selectedModule} onDone={handleQuizDone} />
        </div>
      )}

      {screen === "result" && quizResult && (
        <ResultScreen result={quizResult} onBack={handleBackToModules} />
      )}

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── ANIMATIONS ── */
  @keyframes fadeInUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
  @keyframes pulse { 0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(229,185,60,.4); } 50% { transform:scale(1.05); box-shadow:0 0 0 15px rgba(229,185,60,0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes confetti { 0% { transform:translateY(-100vh) rotate(0deg); opacity:1; } 100% { transform:translateY(100vh) rotate(720deg); opacity:0; } }
  @keyframes pop { 0% { transform:scale(1); } 50% { transform:scale(1.08); } 100% { transform:scale(1); } }
  @keyframes starBounce { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-6px) scale(1.2); } }
  @keyframes ringPulse { 0% { transform:scale(.95); opacity:.5; } 50% { transform:scale(1.1); opacity:.8; } 100% { transform:scale(.95); opacity:.5; } }
  @keyframes shimmer { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

  /* ── BASE ── */
  .game-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #FEFDFB 0%, #FDF9F0 30%, #FCF7EB 70%, #FDF9F0 100%);
    font-family: 'Tajawal', sans-serif;
    overflow-x: hidden;
  }

  /* ── LOADING ── */
  .loading-screen {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(180deg,#FEFDFB 0%,#FDF9F0 100%);
  }
  .loading-content { text-align:center; animation:fadeIn .5s ease; }
  .loading-spinner { position:relative; width:80px; height:80px; margin:0 auto 24px; }
  .spinner-ring { position:absolute; width:100%; height:100%; border:4px solid transparent; border-top-color:#E5B93C; border-radius:50%; animation:spin 1s linear infinite; }
  .spinner-ring.r2 { width:60px; height:60px; top:10px; left:10px; border-top-color:#C8A96A; animation-delay:.15s; animation-direction:reverse; }
  .spinner-ring.r3 { width:40px; height:40px; top:20px; left:20px; border-top-color:#7A1E1E; animation-delay:.3s; }
  .loading-text { font-size:20px; font-weight:800; color:#0B0B0C; }

  /* ── EMPTY ── */
  .empty-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#FEFDFB 0%,#FDF9F0 100%); padding:24px; }
  .empty-content { text-align:center; animation:fadeInUp .6s ease; }
  .empty-icon-wrap { width:100px; height:100px; margin:0 auto 24px; background:linear-gradient(135deg,#FDF5E0,#FDF9F0); border-radius:50%; display:flex; align-items:center; justify-content:center; animation:float 3s ease-in-out infinite; }
  .empty-icon { width:48px; height:48px; fill:none; stroke:#E5B93C; stroke-width:2; }
  .empty-title { font-size:28px; font-weight:900; color:#0B0B0C; margin-bottom:12px; }
  .empty-desc { font-size:18px; color:#6b7280; font-weight:600; }

  /* ── ROADMAP CONTAINER ── */
  .roadmap-container { position:relative; max-width:500px; margin:0 auto; padding:32px 16px 100px; min-height:100vh; }

  /* ── ROADMAP HEADER ── */
  .roadmap-header { text-align:center; margin-bottom:40px; animation:fadeInUp .6s ease; }
  .header-badge { display:inline-flex; align-items:center; gap:8px; background:white; border:2px solid #E5D5A8; border-radius:100px; padding:10px 24px; margin-bottom:20px; box-shadow:0 4px 20px rgba(229,185,60,.15); }
  .badge-label { font-size:16px; font-weight:800; color:#0B0B0C; }
  .roadmap-title { font-size:38px; font-weight:900; color:#0B0B0C; margin-bottom:28px; line-height:1.2; }
  .overall-progress { background:white; border:2px solid #E5D5A8; border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(229,185,60,.1); }
  .progress-info { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
  .progress-label { font-size:16px; font-weight:700; color:#0B0B0C; }
  .progress-value { font-size:28px; font-weight:900; color:#E5B93C; }
  .progress-bar-container { height:14px; background:#FDF9F0; border-radius:100px; overflow:hidden; margin-bottom:14px; border:1px solid #E5D5A8; }
  .progress-bar-fill { height:100%; background:linear-gradient(90deg,#E5B93C,#C8A96A); border-radius:100px; transition:width 1s ease-out; position:relative; }
  .progress-bar-fill::after { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent); animation:shimmer 2s infinite; }
  .progress-detail { font-size:15px; color:#6b7280; font-weight:600; }

  /* ── GAME MAP ── */
  .game-map { position:relative; margin-top:20px; }
  .path-svg { position:absolute; top:0; left:50%; transform:translateX(-50%); width:100%; max-width:400px; height:auto; z-index:1; pointer-events:none; }

  /* ── START NODE ── */
  .map-start { position:absolute; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; z-index:10; animation:fadeInUp .6s ease; }
  .start-node { position:relative; width:72px; height:72px; }
  .start-pulse { position:absolute; inset:-8px; border-radius:50%; background:rgba(229,185,60,.25); animation:pulse 2s ease-in-out infinite; }
  .start-circle { position:relative; width:100%; height:100%; background:linear-gradient(135deg,#E5B93C,#C8A96A); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(229,185,60,.4); }
  .start-icon { width:32px; height:32px; color:white; }
  .start-label { margin-top:14px; font-size:18px; font-weight:800; color:#0B0B0C; }

  /* ── STAGE NODES ── */
  .stage-node { position:absolute; z-index:10; width:calc(100% - 20px); max-width:280px; animation:fadeInUp .6s ease backwards; }
  .stage-node:nth-child(2){animation-delay:.1s} .stage-node:nth-child(3){animation-delay:.2s} .stage-node:nth-child(4){animation-delay:.3s} .stage-node:nth-child(5){animation-delay:.4s}
  .stage-button { width:100%; display:flex; align-items:center; gap:16px; background:white; border:3px solid #e5e7eb; border-radius:20px; padding:16px; cursor:pointer; transition:all .3s cubic-bezier(.4,0,.2,1); font-family:'Tajawal',sans-serif; text-align:right; }
  .stage-node.active .stage-button { border-color:#E5D5A8; box-shadow:0 8px 28px rgba(229,185,60,.15); }
  .stage-node.active .stage-button:hover { border-color:#E5B93C; transform:translateY(-4px) scale(1.02); box-shadow:0 12px 36px rgba(229,185,60,.25); }
  .stage-node.completed .stage-button { border-color:#E5B93C; background:linear-gradient(135deg,#FDF9F0,#FDF5E0); box-shadow:0 6px 24px rgba(229,185,60,.15); }
  .stage-node.completed .stage-button:hover { transform:translateY(-4px) scale(1.02); box-shadow:0 12px 36px rgba(229,185,60,.25); }
  .stage-node.locked .stage-button { opacity:.55; cursor:not-allowed; background:#fafafa; border-color:#e5e7eb; }
  .stage-circle { position:relative; width:56px; height:56px; flex-shrink:0; }
  .circle-inner { position:relative; z-index:2; width:100%; height:100%; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#FDF9F0; border:3px solid #E5D5A8; transition:all .3s ease; }
  .stage-node.completed .circle-inner { background:linear-gradient(135deg,#E5B93C,#C8A96A); border-color:#E5B93C; }
  .stage-node.locked .circle-inner { background:#f3f4f6; border-color:#e5e7eb; }
  .stage-node.active .circle-inner { background:white; border-color:#E5B93C; }
  .completed-glow { position:absolute; inset:-4px; border-radius:50%; background:rgba(229,185,60,.25); animation:ringPulse 2s ease-in-out infinite; z-index:1; }
  .progress-ring { position:absolute; inset:-6px; transform:rotate(-90deg); z-index:3; }
  .ring-bg { fill:none; stroke:#e5e7eb; stroke-width:5; }
  .ring-fill { fill:none; stroke:#E5B93C; stroke-width:5; stroke-linecap:round; transition:stroke-dasharray .5s ease; }
  .stage-icon { width:26px; height:26px; fill:none; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .stage-icon.check { stroke:white; }
  .stage-icon.lock { stroke:#9ca3af; fill:none; }
  .stage-number { font-size:24px; font-weight:900; color:#E5B93C; }
  .stage-info { flex:1; min-width:0; }
  .stage-title { font-size:20px; font-weight:800; color:#0B0B0C; margin-bottom:6px; line-height:1.3; }
  .stage-node.locked .stage-title { color:#6b7280; }
  .stage-meta { font-size:15px; font-weight:700; }
  .meta-completed { color:#E5B93C; } .meta-locked { color:#9ca3af; } .meta-progress { color:#6b7280; }
  .stage-dots { display:flex; gap:6px; margin-top:10px; justify-content:flex-end; }
  .stage-dots .dot { width:10px; height:10px; border-radius:50%; background:#e5e7eb; transition:all .3s ease; }
  .stage-dots .dot.filled { background:linear-gradient(135deg,#E5B93C,#C8A96A); }
  .stage-arrow { width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .stage-arrow svg { width:24px; height:24px; fill:none; stroke:#d1d5db; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; transition:all .3s ease; }
  .stage-button:hover .stage-arrow svg { stroke:#E5B93C; transform:translateX(-4px); }
  .stage-stars { position:absolute; top:-12px; right:8px; display:flex; gap:2px; z-index:20; }
  .stage-stars .star { font-size:18px; color:#fbbf24; text-shadow:0 2px 4px rgba(251,191,36,.4); animation:starBounce 2s ease-in-out infinite; }
  .stage-stars .star.s2{animation-delay:.15s} .stage-stars .star.s3{animation-delay:.3s}

  /* ── END NODE ── */
  .map-end { position:absolute; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; z-index:10; animation:fadeInUp .6s ease .5s backwards; }
  .end-node { position:relative; width:88px; height:88px; }
  .end-glow { position:absolute; inset:-10px; border-radius:50%; background:rgba(251,191,36,.15); opacity:0; transition:opacity .4s ease; }
  .map-end.achieved .end-glow { opacity:1; animation:pulse 2s ease-in-out infinite; }
  .end-circle { position:relative; width:100%; height:100%; background:linear-gradient(135deg,#fbbf24,#f59e0b); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 28px rgba(245,158,11,.35); opacity:.5; transition:all .4s ease; }
  .map-end.achieved .end-circle { opacity:1; animation:float 3s ease-in-out infinite; }
  .end-icon { width:40px; height:40px; fill:none; stroke:white; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .end-label { margin-top:14px; font-size:18px; font-weight:800; color:#92400e; text-align:center; }

  /* ── LEGEND ── */
  .map-legend { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); display:flex; gap:24px; background:white; border:2px solid #E5D5A8; border-radius:100px; padding:14px 28px; box-shadow:0 8px 32px rgba(229,185,60,.15); z-index:100; }
  .legend-item { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:700; color:#0B0B0C; }
  .legend-dot { width:14px; height:14px; border-radius:50%; }
  .legend-dot.completed { background:linear-gradient(135deg,#E5B93C,#C8A96A); }
  .legend-dot.active { background:white; border:3px solid #E5B93C; }
  .legend-dot.locked { background:#e5e7eb; }

  /* ── MODULES CONTAINER ── */
  .modules-container { max-width:600px; margin:0 auto; padding:24px 20px 80px; min-height:100vh; animation:fadeIn .4s ease; }
  .back-button { display:inline-flex; align-items:center; gap:8px; background:white; border:2px solid #e5e7eb; border-radius:12px; padding:10px 18px; font-family:'Tajawal',sans-serif; font-size:15px; font-weight:700; color:#374151; cursor:pointer; transition:all .2s ease; margin-bottom:24px; }
  .back-button:hover { border-color:#E5B93C; color:#0B0B0C; }
  .back-button svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .back-button.small { padding:8px 14px; font-size:14px; }
  .modules-header { text-align:center; margin-bottom:32px; }
  .stage-badge { display:inline-flex; align-items:center; background:linear-gradient(135deg,#FDF5E0,#FDF9F0); border-radius:100px; padding:8px 20px; margin-bottom:16px; }
  .stage-badge .badge-text { font-size:14px; font-weight:800; color:#0B0B0C; }
  .modules-title { font-size:32px; font-weight:900; color:#0B0B0C; margin-bottom:8px; }
  .modules-subtitle { font-size:16px; color:#6b7280; font-weight:600; }
  .modules-grid { display:flex; flex-direction:column; gap:16px; }

  /* ── MODULE CARD ── */
  .module-card { display:flex; align-items:center; gap:16px; background:white; border:2px solid #e5e7eb; border-radius:20px; padding:18px; animation:fadeInUp .5s ease backwards; transition:all .3s ease; position:relative; }
  .module-card:hover:not(.locked) { border-color:#E5D5A8; box-shadow:0 8px 24px rgba(229,185,60,.12); }
  .module-card.completed { border-color:#E5D5A8; background:linear-gradient(135deg,#FEFDFB,#FDF9F0); }
  .module-card.locked { opacity:.55; }
  .module-score-badge { position:absolute; top:-10px; left:12px; background:white; border:2px solid; border-radius:100px; padding:3px 12px; font-size:13px; font-weight:800; }
  .module-score-badge.pass { border-color:#E5B93C; color:#9a7000; }
  .module-score-badge.fail { border-color:#7A1E1E; color:#7A1E1E; }
  .module-status-icon { flex-shrink:0; }
  .module-status-icon > div { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .status-completed { background:linear-gradient(135deg,#E5B93C,#C8A96A); }
  .status-completed svg { width:24px; height:24px; fill:none; stroke:white; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
  .status-locked { background:#f3f4f6; }
  .status-locked svg { width:22px; height:22px; fill:none; stroke:#9ca3af; stroke-width:2; }
  .status-available { background:#FDF9F0; border:3px solid #E5D5A8; font-size:20px; font-weight:900; color:#E5B93C; }
  .module-content { flex:1; min-width:0; text-align:right; }
  .module-title { font-size:18px; font-weight:800; color:#0B0B0C; margin-bottom:6px; }
  .content-type-pills { display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap; margin-bottom:6px; }
  .type-pill { font-size:12px; font-weight:700; padding:3px 10px; border-radius:100px; }
  .text-pill { background:#FDF5E0; color:#92400e; }
  .image-pill { background:#EFF6FF; color:#1e40af; }
  .video-pill { background:#FDF2F8; color:#86198f; }
  .module-meta { display:flex; gap:16px; justify-content:flex-end; flex-wrap:wrap; }
  .meta-item { display:flex; align-items:center; gap:5px; font-size:14px; font-weight:600; color:#6b7280; }
  .meta-item svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; }
  .module-action { display:flex; align-items:center; gap:8px; padding:10px 18px; border-radius:12px; font-family:'Tajawal',sans-serif; font-size:15px; font-weight:700; cursor:pointer; transition:all .2s ease; border:none; }
  .module-action.start { background:linear-gradient(135deg,#E5B93C,#C8A96A); color:white; }
  .module-action.start:hover { transform:scale(1.05); box-shadow:0 6px 20px rgba(229,185,60,.35); }
  .module-action.view { background:#FDF9F0; border:2px solid #E5D5A8; color:#0B0B0C; }
  .module-action.view:hover { background:#FDF5E0; }
  .module-action svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .module-action.start svg { fill:currentColor; stroke:none; }

  /* ── LESSON VIEWER ── */
.lesson-page { max-width:680px; margin:0 auto; padding:0; min-height:100vh; display:flex; flex-direction:column; }
  .lesson-topbar { display:flex; align-items:center; gap:12px; padding:16px 20px; background:white; border-bottom:2px solid #E5D5A8; position:sticky; top:0; z-index:50; }
  .lesson-mod-title { flex:1; font-size:18px; font-weight:800; color:#0B0B0C; text-align:right; }
  .lesson-meta-pill { background:#FDF5E0; color:#92400e; font-size:13px; font-weight:700; padding:5px 12px; border-radius:100px; white-space:nowrap; }
  .lesson-feed { padding:24px 20px; display:flex; flex-direction:column; gap:20px; }
  .lesson-empty-content { text-align:center; padding:60px 20px; color:#9ca3af; font-size:16px; font-weight:600; }
  .content-card { border-radius:20px; overflow:hidden; animation:slideUp .5s ease backwards; }

  /* TEXT block */
  .text-card { background:white; border-right:4px solid #C8A96A; border-top:1px solid #E8D9B8; border-bottom:1px solid #E8D9B8; border-left:1px solid #E8D9B8; padding:24px 28px; box-shadow:0 4px 16px rgba(229,185,60,.08); }
  .text-block-body { font-size:17px; font-weight:500; color:#1f2937; line-height:1.9; }

  /* IMAGE block */
  .image-card { background:white; border:1px solid #E8D9B8; box-shadow:0 4px 16px rgba(229,185,60,.08); }
  .lesson-image { width:100%; max-height:420px; object-fit:contain; display:block; }
  .image-caption { padding:12px 20px; font-size:14px; color:#6b7280; font-weight:600; text-align:center; border-top:1px solid #f3f4f6; }

  /* VIDEO block */
  .video-card { background:white; border:1px solid #E8D9B8; box-shadow:0 4px 16px rgba(229,185,60,.08); }
  .video-header { display:flex; align-items:center; gap:12px; padding:16px 20px; background:#0B0B0C; }
  .video-play-icon { width:20px; height:20px; color:white; flex-shrink:0; }
  .video-header span { font-size:16px; font-weight:700; color:white; flex:1; text-align:right; }
  .video-embed-wrap { position:relative; padding-top:56.25%; }
  .video-iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:none; }
  .video-fallback { padding:32px 20px; text-align:center; }
  .video-link-btn { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#E5B93C,#C8A96A); color:white; border-radius:12px; padding:12px 28px; font-family:'Tajawal',sans-serif; font-size:16px; font-weight:700; text-decoration:none; transition:all .2s ease; }
  .video-link-btn:hover { transform:scale(1.03); box-shadow:0 6px 20px rgba(229,185,60,.35); }

  /* Bottom CTA */
.lesson-bottom-bar {
  position:sticky; bottom:0;
  background:white; border-top:2px solid #E5D5A8;
  padding:16px 20px 20px; z-index:50;
  margin-top:auto;
}  .lesson-start-btn { width:100%; padding:16px; background:linear-gradient(135deg,#E5B93C,#C8A96A); color:white; border:none; border-radius:16px; font-family:'Tajawal',sans-serif; font-size:20px; font-weight:800; cursor:pointer; transition:all .2s ease; }
  .lesson-start-btn:hover { transform:scale(1.02); box-shadow:0 8px 24px rgba(229,185,60,.4); }
  .lesson-cta-hint { margin-top:8px; font-size:13px; color:#9ca3af; font-weight:600; text-align:center; }

  /* ── QUIZ SCREEN ── */
  .quiz-screen { max-width:600px; margin:0 auto; padding:24px 20px 80px; min-height:100vh; animation:fadeIn .4s ease; }
  .quiz-top-bar { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
  .quiz-module-title { flex:1; font-size:20px; font-weight:800; color:#0B0B0C; text-align:right; }
  .quiz-container { animation:fadeInUp .5s ease; }
  .quiz-header { margin-bottom:28px; }
  .quiz-progress-bar { height:10px; background:#e5e7eb; border-radius:100px; overflow:hidden; margin-bottom:12px; }
  .quiz-progress-fill { height:100%; background:linear-gradient(90deg,#E5B93C,#C8A96A); border-radius:100px; transition:width .4s ease; }
  .quiz-progress-text { display:flex; justify-content:center; align-items:center; gap:8px; font-size:16px; font-weight:700; }
  .progress-current { color:#E5B93C; } .progress-divider { color:#d1d5db; } .progress-total { color:#9ca3af; }
  .question-card { background:white; border:2px solid #E5D5A8; border-radius:24px; padding:28px; margin-bottom:24px; box-shadow:0 8px 32px rgba(229,185,60,.1); animation:fadeInUp .4s ease; }
  .question-badge { margin-bottom:20px; }
  .question-badge span { display:inline-block; padding:6px 16px; border-radius:100px; font-size:13px; font-weight:700; }
  .badge-mcq { background:#FDF5E0; color:#0B0B0C; }
  .badge-tf { background:#FBEAEA; color:#7A1E1E; }
  .badge-written { background:#EFF6FF; color:#1e40af; }
  .badge-matching { background:#F0FDF4; color:#166534; }
  .question-text { font-size:22px; font-weight:800; color:#0B0B0C; line-height:1.6; margin-bottom:24px; }

  /* MCQ / TF options */
  .options-grid { display:flex; flex-direction:column; gap:12px; }
  .tf-grid { flex-direction:row; }
  .option-card { display:flex; align-items:center; gap:14px; width:100%; padding:16px 18px; background:#fafafa; border:2px solid #e5e7eb; border-radius:16px; font-family:'Tajawal',sans-serif; cursor:pointer; transition:all .25s ease; text-align:right; }
  .option-card:hover { border-color:#E5D5A8; background:#FDF9F0; }
  .option-card.selected { border-color:#E5B93C; background:linear-gradient(135deg,#FDF9F0,#FDF5E0); }
  .option-card.pop { animation:pop .3s ease; }
  .tf-card { flex:1; justify-content:center; }
  .option-indicator { width:36px; height:36px; border-radius:50%; background:white; border:2px solid #d1d5db; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .25s ease; }
  .option-card.selected .option-indicator { background:linear-gradient(135deg,#E5B93C,#C8A96A); border-color:#E5B93C; }
  .option-letter { font-size:15px; font-weight:800; color:#9ca3af; }
  .check-icon { width:20px; height:20px; fill:none; stroke:white; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
  .option-text { flex:1; font-size:17px; font-weight:700; color:#374151; }
  .tf-label { font-size:20px; }

  /* WRITTEN */
  .written-wrap { display:flex; flex-direction:column; gap:10px; }
  .written-textarea { width:100%; padding:16px; border:2px solid #e5e7eb; border-radius:16px; font-family:'Tajawal',sans-serif; font-size:16px; font-weight:500; color:#1f2937; resize:vertical; outline:none; transition:border-color .2s ease; background:#fafafa; line-height:1.7; }
  .written-textarea:focus { border-color:#E5B93C; background:white; }
  .written-hint { font-size:13px; color:#9ca3af; font-weight:600; text-align:right; }

  /* MATCHING */
  .matching-wrap { display:flex; flex-direction:column; gap:14px; }
  .matching-hint { font-size:14px; color:#6b7280; font-weight:600; margin-bottom:4px; text-align:right; }
  .matching-pairs { display:flex; flex-direction:column; gap:12px; }
  .matching-row { display:flex; align-items:center; gap:10px; background:#fafafa; border:2px solid #e5e7eb; border-radius:14px; padding:12px 16px; direction:rtl; }
  .matching-left { flex:1; font-size:16px; font-weight:700; color:#0B0B0C; }
  .matching-arrow { font-size:16px; color:#C8A96A; font-weight:900; flex-shrink:0; }
  .matching-select { flex:1; padding:10px 14px; border:2px solid #e5e7eb; border-radius:10px; font-family:'Tajawal',sans-serif; font-size:15px; font-weight:700; color:#374151; outline:none; cursor:pointer; background:white; transition:border-color .2s ease; direction:rtl; }
  .matching-select:focus, .matching-select.filled { border-color:#E5B93C; background:#FDF9F0; color:#0B0B0C; }
  .matching-incomplete { font-size:13px; color:#9ca3af; font-weight:600; text-align:right; }

  /* Already attempted */
  .already-attempted { text-align:center; padding:60px 20px; }
  .already-icon { font-size:48px; margin-bottom:16px; }
  .already-attempted h3 { font-size:22px; font-weight:800; color:#0B0B0C; margin-bottom:8px; }
  .already-attempted p { font-size:16px; color:#6b7280; font-weight:600; }

  /* Nav */
  .quiz-error { display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#fef2f2; border:2px solid #fecaca; border-radius:12px; margin-bottom:20px; font-size:15px; font-weight:700; color:#dc2626; }
  .error-icon { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2; }
  .quiz-navigation { display:flex; gap:12px; margin-bottom:28px; }
  .nav-button { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 20px; border-radius:14px; font-family:'Tajawal',sans-serif; font-size:16px; font-weight:700; cursor:pointer; transition:all .2s ease; border:none; }
  .nav-button svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .nav-button.prev { background:#f3f4f6; color:#6b7280; }
  .nav-button.prev:hover:not(:disabled) { background:#e5e7eb; }
  .nav-button.prev:disabled { opacity:.4; cursor:not-allowed; }
  .nav-button.next { background:linear-gradient(135deg,#E5B93C,#C8A96A); color:white; }
  .nav-button.next:hover:not(:disabled) { transform:scale(1.02); box-shadow:0 6px 20px rgba(229,185,60,.35); }
  .nav-button.next:disabled { opacity:.5; cursor:not-allowed; }
  .nav-button.submit { background:linear-gradient(135deg,#E5B93C,#C8A96A); color:white; }
  .nav-button.submit:disabled { opacity:.5; cursor:not-allowed; }
  .submit-count { background:rgba(255,255,255,.2); padding:4px 10px; border-radius:8px; font-size:14px; }
  .question-dots { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
  .q-dot { width:36px; height:36px; border-radius:50%; background:#f3f4f6; border:2px solid #e5e7eb; display:flex; align-items:center; justify-content:center; font-family:'Tajawal',sans-serif; cursor:pointer; transition:all .2s ease; }
  .q-dot:hover { border-color:#E5D5A8; }
  .q-dot.current { border-color:#E5B93C; background:#FDF5E0; }
  .q-dot.answered { background:linear-gradient(135deg,#E5B93C,#C8A96A); border-color:#E5B93C; }
  .q-dot.answered .dot-number { color:white; }
  .dot-number { font-size:14px; font-weight:800; color:#6b7280; }
  .q-dot.current .dot-number { color:#E5B93C; }

  /* ── RESULT SCREEN ── */
  .result-container { max-width:420px; margin:0 auto; padding:48px 24px 60px; text-align:center; animation:fadeInUp .6s ease; position:relative; }
  .confetti-container { position:fixed; top:0; left:0; right:0; height:100vh; pointer-events:none; overflow:hidden; z-index:100; }
  .confetti { position:absolute; width:12px; height:12px; border-radius:2px; animation:confetti 3s ease-out forwards; }
  
  .score-circle-container { position:relative; width:200px; height:200px; margin:0 auto 28px; }
  .score-circle-svg { width:100%; height:100%; transform:rotate(-90deg); }
  .score-bg { fill:none; stroke:#e5e7eb; stroke-width:14; }
  .score-fill { fill:none; stroke:#E5B93C; stroke-width:14; stroke-linecap:round; transition:stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1); }
  .score-circle-container.failed .score-fill { stroke:#7A1E1E; }
  .score-content { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
  .score-value { font-size:52px; font-weight:900; color:#0B0B0C; line-height:1; }
  .score-circle-container.failed .score-value { color:#7A1E1E; }
  .score-label-small { font-size:13px; font-weight:700; color:#9ca3af; }

  .result-status-banner { display:inline-flex; align-items:center; justify-content:center; padding:6px 20px; border-radius:100px; font-size:15px; font-weight:800; margin-bottom:14px; }
  .result-status-banner.passed { background:#FDF5E0; color:#92400e; border:2px solid #E5B93C; }
  .result-status-banner.failed { background:#fef2f2; color:#7A1E1E; border:2px solid #fca5a5; }

  .result-message { margin-bottom:28px; }
  .result-title { font-size:30px; font-weight:900; margin-bottom:10px; }
  .result-title.passed { color:#E5B93C; } .result-title.failed { color:#7A1E1E; }
  .result-detail { font-size:17px; font-weight:600; color:#6b7280; }

  /* Progress bar - force LTR so fill always goes left→right regardless of page direction */
  .result-progress { position:relative; margin-bottom:48px; }
  .result-progress-labels { display:flex; justify-content:space-between; margin-bottom:6px; direction:ltr; }
  .rp-label-start, .rp-label-end { font-size:12px; font-weight:700; color:#9ca3af; }
  .result-progress-bg { height:18px; background:#e5e7eb; border-radius:100px; overflow:hidden; direction:ltr; position:relative; }
  .result-progress-fill { height:100%; border-radius:100px; transition:width 1.2s cubic-bezier(.4,0,.2,1); }
  .result-progress-fill.passed { background:linear-gradient(90deg,#E5B93C,#C8A96A); }
  .result-progress-fill.failed { background:linear-gradient(90deg,#7A1E1E,#9B3B3B); }

  /* Score marker dot at actual score position */
  .result-score-marker { position:absolute; top:-4px; display:flex; flex-direction:column; align-items:center; gap:2px; transform:translateX(-50%); transition:left 1.2s cubic-bezier(.4,0,.2,1); pointer-events:none; }
  .score-marker-dot { width:10px; height:26px; border-radius:100px; background:#0B0B0C; }
  .score-marker-label { font-size:11px; font-weight:800; color:#0B0B0C; white-space:nowrap; margin-top:4px; }

  .result-encourage { font-size:15px; font-weight:600; color:#6b7280; margin-bottom:28px; line-height:1.7; background:#FDF9F0; border:1px solid #E5D5A8; border-radius:16px; padding:16px 20px; text-align:right; }
  .result-actions { display:flex; flex-direction:column; gap:14px; }
  .action-button { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:16px; border-radius:16px; font-family:'Tajawal',sans-serif; font-size:18px; font-weight:700; cursor:pointer; transition:all .2s ease; border:none; }
  .action-button svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .action-button.secondary { background:#f3f4f6; color:#374151; border:2px solid #e5e7eb; }
  .action-button.secondary:hover { background:#e5e7eb; border-color:#d1d5db; }

  /* ── RESPONSIVE ── */
  @media (max-width:480px) {
    .roadmap-title { font-size:30px; }
    .stage-button { padding:14px; }
    .stage-title { font-size:17px; }
    .stage-node { max-width:240px; }
    .map-legend { gap:16px; padding:12px 20px; }
    .legend-item { font-size:13px; }
    .lesson-bottom-bar { left:0; right:0; }
    .tf-grid { flex-direction:column; }
  }
`;
