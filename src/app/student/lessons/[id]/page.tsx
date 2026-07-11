"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";

type QuestionType = "MCQ" | "TF" | "WRITTEN" | "MATCHING";
type ContentType = "TEXT" | "IMAGE" | "VIDEO";

interface ContentBlock {
  id: string; type: ContentType; order: number;
  body: string | null;
  image_url: string | null; alt_text: string | null;
  video_url: string | null; video_title: string | null;
}
interface QuestionBlock {
  id: string;
  type: QuestionType;
  text: string;
  order: number;
  options?: { id: string; text: string; order: number }[];
  // MATCHING-specific (left side in order, right side pre-shuffled by server)
  lefts?: { id: string; text: string }[];
  rights?: string[];
}
interface LessonFull {
  id: string;
  title: string;
  description: string | null;
  is_graded: boolean;
  teacher_name: string;
  linked_quiz: { id: string; name: string } | null;
  contents: ContentBlock[];
  questions: QuestionBlock[];
  attempt: { score: number | null; total: number | null; completed_at: string | null } | null;
}

const T = {
  ar: {
    back: "← الدروس",
    by: "بإشراف",
    graded: "مُقيَّم", practice: "تدريبي",
    contentTitle: "محتوى الدرس",
    questionsTitle: "اختبر فهمك",
    practiceHint: "وضع التدريب — يمكنك المحاولة عدة مرات والحصول على إجابات فورية.",
    gradedHint: "وضع الاختبار — لديك محاولة واحدة فقط، ستُسجَّل نتيجتك.",
    alreadyCompleted: "لقد أكملت هذا الدرس",
    yourScore: "نتيجتك",
    pickAnswer: "اختر الإجابة",
    yourAnswer: "إجابتك",
    typeAnswer: "اكتب إجابتك هنا...",
    matchPlaceholder: "اختر...",
    trueLbl: "صح", falseLbl: "خطأ",
    submit: "إرسال الإجابات",
    submitting: "جارٍ الإرسال...",
    retake: "إعادة المحاولة",
    correctTag: "إجابة صحيحة",
    incorrectTag: "إجابة خاطئة",
    answerAll: "يرجى الإجابة على جميع الأسئلة",
    linkedQuizCTA: "اختبار مرتبط بهذا الدرس",
    openQuiz: "افتح الاختبار",
    notFound: "الدرس غير موجود أو لم يُنشر بعد",
    noQuestions: "لا توجد أسئلة في هذا الدرس",
  },
  sq: {
    back: "← Mësimet",
    by: "nga",
    graded: "Me notë", practice: "Praktikë",
    contentTitle: "Përmbajtja e mësimit",
    questionsTitle: "Testo njohuritë",
    practiceHint: "Modaliteti i praktikës — mund të riprovoni dhe të shihni përgjigjet menjëherë.",
    gradedHint: "Modaliteti i testimit — keni vetëm një tentim, rezultati do të regjistrohet.",
    alreadyCompleted: "Ke përfunduar këtë mësim",
    yourScore: "Rezultati yt",
    pickAnswer: "Zgjidh përgjigjen",
    yourAnswer: "Përgjigja jote",
    typeAnswer: "Shkruani përgjigjen këtu...",
    matchPlaceholder: "Zgjidh...",
    trueLbl: "E saktë", falseLbl: "E gabuar",
    submit: "Dërgo përgjigjet",
    submitting: "Duke dërguar...",
    retake: "Riprovo",
    correctTag: "E saktë",
    incorrectTag: "E gabuar",
    answerAll: "Ju lutem përgjigjuni të gjitha pyetjeve",
    linkedQuizCTA: "Test i lidhur me këtë mësim",
    openQuiz: "Hap testin",
    notFound: "Mësimi nuk u gjet ose nuk është publikuar",
    noQuestions: "Ky mësim nuk ka pyetje",
  },
} as const;

function ytId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function StudentLessonViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { lang } = useLang();
  const t = T[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Answers: question_id → string answer
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // For MATCHING: question_id → { [left_id]: right_text }
  const [matches, setMatches] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // After submission: question_id → is_correct (for visual feedback)
  const [results, setResults] = useState<Record<string, boolean> | null>(null);
  const [scoreSummary, setScoreSummary] = useState<{ score: number; total: number } | null>(null);

  const loadLesson = () => {
    setLoading(true);
    setError("");
    fetch(`/api/student/lessons/${id}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setError(d.error ?? "Error"); return; }
        setLesson(d.lesson);
        // If they've completed, show their previous score
        if (d.lesson.attempt?.completed_at && d.lesson.is_graded) {
          setScoreSummary({
            score: d.lesson.attempt.score ?? 0,
            total: d.lesson.attempt.total ?? d.lesson.questions.length,
          });
        }
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadLesson(); }, [id]);

  const setMatch = (qid: string, leftId: string, rightText: string) => {
    setMatches((prev) => ({
      ...prev,
      [qid]: { ...(prev[qid] ?? {}), [leftId]: rightText },
    }));
  };

  const submit = async () => {
    if (!lesson) return;

    // Build the payload
    const payload: { question_id: string; answer: string }[] = [];
    for (const q of lesson.questions) {
      if (q.type === "MATCHING") {
        const m = matches[q.id] ?? {};
        const allPicked = q.lefts?.every((l) => m[l.id]?.trim());
        if (!allPicked) { setSubmitError(t.answerAll); return; }
        payload.push({ question_id: q.id, answer: JSON.stringify(m) });
      } else {
        const ans = answers[q.id];
        if (!ans?.trim()) { setSubmitError(t.answerAll); return; }
        payload.push({ question_id: q.id, answer: ans });
      }
    }
    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/student/lessons/${id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Error");
        return;
      }
      const r: Record<string, boolean> = {};
      (data.results as { question_id: string; is_correct: boolean }[])
        .forEach(({ question_id, is_correct }) => { r[question_id] = is_correct; });
      setResults(r);
      setScoreSummary({
        score: data.attempt.score,
        total: data.attempt.total,
      });
      // Scroll to score
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers({});
    setMatches({});
    setResults(null);
    setScoreSummary(null);
    loadLesson(); // reload to reshuffle matching rights
  };

  // ────────── RENDER ──────────
  if (loading) {
    return (
      <div className="slv-page" dir={dir}>
        <style>{css}</style>
        <div className="slv-loading"><div className="slv-spinner" /></div>
      </div>
    );
  }
  if (error || !lesson) {
    return (
      <div className="slv-page" dir={dir}>
        <style>{css}</style>
        <div className="slv-empty">
          <h2>{t.notFound}</h2>
          <Link href="/student/lessons" className="slv-back-btn">{t.back}</Link>
        </div>
      </div>
    );
  }

  const renderText = (body: string) => {
    // Lightweight inline formatting: **bold**, __highlight__
    const parts = body.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
    return (
      <p className="slv-text-body">
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return <strong key={i}>{p.slice(2, -2)}</strong>;
          }
          if (p.startsWith("__") && p.endsWith("__")) {
            return <mark key={i} className="slv-highlight">{p.slice(2, -2)}</mark>;
          }
          return <span key={i}>{p}</span>;
        })}
      </p>
    );
  };

  const isCompleted = !!lesson.attempt?.completed_at && lesson.is_graded && !results;
  const hasQuestions = lesson.questions.length > 0;

  return (
    <div className="slv-page" dir={dir}>
      <style>{css}</style>

      <Link href="/student/lessons" className="slv-back-link">{t.back}</Link>

      {/* ─── Lesson header ─── */}
      <header className="slv-header">
        <div className="slv-header-chips">
          <span className={`slv-chip slv-chip--${lesson.is_graded ? "gold" : "purple"}`}>
            {lesson.is_graded ? "★ " : "↻ "}{lesson.is_graded ? t.graded : t.practice}
          </span>
          {scoreSummary && (
            <span className="slv-chip slv-chip--green">
              ✓ {scoreSummary.score}/{scoreSummary.total}
            </span>
          )}
        </div>
        <h1 className="slv-title">{lesson.title}</h1>
        {lesson.description && <p className="slv-desc">{lesson.description}</p>}
        <p className="slv-byline">{t.by} <strong>{lesson.teacher_name}</strong></p>
      </header>

      {/* ─── Content blocks ─── */}
      {lesson.contents.length > 0 && (
        <section className="slv-section">
          <div className="slv-section-hd">
            <div className="slv-section-icon">📖</div>
            <h2 className="slv-section-title">{t.contentTitle}</h2>
          </div>
          <div className="slv-content">
            {lesson.contents.map((block) => (
              <div key={block.id} className={`slv-block slv-block--${block.type.toLowerCase()}`}>
                {block.type === "TEXT" && block.body && renderText(block.body)}
                {block.type === "IMAGE" && block.image_url && (
                  <figure className="slv-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.image_url} alt={block.alt_text ?? ""} className="slv-image" />
                    {block.alt_text && <figcaption className="slv-image-caption">{block.alt_text}</figcaption>}
                  </figure>
                )}
                {block.type === "VIDEO" && (() => {
                  const y = ytId(block.video_url);
                  if (!y) return null;
                  return (
                    <div className="slv-video-wrap">
                      <div className="slv-video-frame">
                        <iframe
                          src={`https://www.youtube.com/embed/${y}`}
                          title={block.video_title ?? "Video"}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {block.video_title && <div className="slv-video-title">{block.video_title}</div>}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Questions ─── */}
      {hasQuestions && (
        <section className="slv-section">
          <div className="slv-section-hd">
            <div className="slv-section-icon">📝</div>
            <h2 className="slv-section-title">{t.questionsTitle}</h2>
          </div>

          <div className={`slv-mode-hint slv-mode-hint--${lesson.is_graded ? "graded" : "practice"}`}>
            {lesson.is_graded ? t.gradedHint : t.practiceHint}
          </div>

          {isCompleted ? (
            <div className="slv-completed">
              <div className="slv-completed-emoji">🎉</div>
              <h3>{t.alreadyCompleted}</h3>
              <p className="slv-completed-score">
                {t.yourScore}: <strong>{lesson.attempt!.score} / {lesson.attempt!.total}</strong>
              </p>
            </div>
          ) : (
            <div className="slv-questions">
              {lesson.questions.map((q, idx) => {
                const result = results?.[q.id];
                const status = results == null ? "" : result ? "correct" : "incorrect";
                return (
                  <div key={q.id} className={`slv-q slv-q--${status}`}>
                    <div className="slv-q-head">
                      <span className="slv-q-num">{idx + 1}</span>
                      <p className="slv-q-text" dir="auto">{q.text}</p>
                      {results && (
                        <span className={`slv-q-badge slv-q-badge--${result ? "ok" : "no"}`}>
                          {result ? `✓ ${t.correctTag}` : `✗ ${t.incorrectTag}`}
                        </span>
                      )}
                    </div>

                    {/* MCQ */}
                    {q.type === "MCQ" && q.options && (
                      <div className="slv-q-body">
                        <p className="slv-q-label">{t.pickAnswer}</p>
                        <div className="slv-mcq-list">
                          {q.options.map((opt) => {
                            const selected = answers[q.id] === opt.text;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                className={`slv-mcq-opt${selected ? " selected" : ""}`}
                                onClick={() => !results && setAnswers((a) => ({ ...a, [q.id]: opt.text }))}
                                disabled={!!results}
                              >
                                <span className={`slv-mcq-radio${selected ? " on" : ""}`}>
                                  {selected ? "●" : ""}
                                </span>
                                <span className="slv-mcq-text">{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TF */}
                    {q.type === "TF" && (
                      <div className="slv-q-body">
                        <div className="slv-tf-row">
                          {[
                            { val: "true", label: t.trueLbl, icon: "✓" },
                            { val: "false", label: t.falseLbl, icon: "✗" },
                          ].map(({ val, label, icon }) => {
                            const selected = answers[q.id] === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                className={`slv-tf-btn slv-tf-btn--${val}${selected ? " on" : ""}`}
                                onClick={() => !results && setAnswers((a) => ({ ...a, [q.id]: val }))}
                                disabled={!!results}
                              >
                                <span className="slv-tf-icon">{icon}</span> {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* WRITTEN */}
                    {q.type === "WRITTEN" && (
                      <div className="slv-q-body">
                        <p className="slv-q-label">{t.yourAnswer}</p>
                        <input
                          className="slv-text-input"
                          type="text"
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          placeholder={t.typeAnswer}
                          dir="auto"
                          disabled={!!results}
                        />
                      </div>
                    )}

                    {/* MATCHING */}
                    {q.type === "MATCHING" && q.lefts && q.rights && (
                      <div className="slv-q-body">
                        <div className="slv-match-list">
                          {q.lefts.map((l) => (
                            <div key={l.id} className="slv-match-row">
                              <span className="slv-match-left" dir="auto">{l.text}</span>
                              <span className="slv-match-arrow">→</span>
                              <select
                                className="slv-match-select"
                                value={matches[q.id]?.[l.id] ?? ""}
                                onChange={(e) => setMatch(q.id, l.id, e.target.value)}
                                disabled={!!results}
                              >
                                <option value="">{t.matchPlaceholder}</option>
                                {q.rights!.map((r, i) => (
                                  <option key={i} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {submitError && <div className="slv-error">{submitError}</div>}

              <div className="slv-submit-row">
                {!results ? (
                  <button className="slv-submit-btn" onClick={submit} disabled={submitting}>
                    {submitting ? <><span className="slv-btn-spin" />{t.submitting}</> : t.submit}
                  </button>
                ) : !lesson.is_graded ? (
                  <button className="slv-submit-btn slv-submit-btn--retake" onClick={retake}>
                    ↻ {t.retake}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── Score banner (after submit) ─── */}
      {scoreSummary && results && (
        <div className="slv-score-banner">
          <div className="slv-score-emoji">
            {scoreSummary.score === scoreSummary.total ? "🏆" :
             scoreSummary.score / scoreSummary.total >= 0.7 ? "🎉" : "💪"}
          </div>
          <div>
            <p className="slv-score-label">{t.yourScore}</p>
            <p className="slv-score-value">
              <strong>{scoreSummary.score}</strong>
              <span> / {scoreSummary.total}</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Linked quiz CTA ─── */}
      {lesson.linked_quiz && (
        <Link href={`/student/quizzes/${lesson.linked_quiz.id}`} className="slv-quiz-cta">
          <div className="slv-quiz-icon">📋</div>
          <div className="slv-quiz-text">
            <p className="slv-quiz-label">{t.linkedQuizCTA}</p>
            <p className="slv-quiz-name">{lesson.linked_quiz.name}</p>
          </div>
          <span className="slv-quiz-arrow">→</span>
        </Link>
      )}

      {!hasQuestions && lesson.contents.length === 0 && (
        <div className="slv-empty">
          <p>{t.noQuestions}</p>
        </div>
      )}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes slv-spin{to{transform:rotate(360deg)}}
@keyframes slv-fadeup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slv-pulse{0%,100%{opacity:1}50%{opacity:0.6}}

:root{
  --gold:#B8A082; --gold-deep:#B8A082; --gold-soft:#D9C9B0;
  --gold-pale:rgba(184,160,130,0.06);
  --gold-border:rgba(184,160,130,0.22);
  --black:#1A1A1A;
  --text:#1A1A1A; --text2:#6B1E2D; --text3:#8F765B;
  --bg:#EFEAE0; --surface:#FFFFFF; --surface2:#FFFBF5;
  --border:rgba(26,26,26,0.07);
  --green:#1B5E20; --green-l:rgba(27,94,32,0.08); --green-b:rgba(27,94,32,0.3);
  --red:#6B1E2D; --red-l:rgba(107,30,45,0.07); --red-b:rgba(107,30,45,0.3);
  --purple:#796A62; --purple-l:rgba(121,106,98,0.07);
  --font:'Cairo',sans-serif;
}

.slv-page{font-family:var(--font); display:flex; flex-direction:column; gap:24px; color:var(--text); max-width:780px; margin:0 auto}
.slv-loading{display:flex;justify-content:center;padding:80px 0}
.slv-spinner{width:36px;height:36px;border:3px solid rgba(184,160,130,0.15);border-top-color:var(--gold);border-radius:50%;animation:slv-spin .7s linear infinite}

.slv-back-link{
  font-size:13px; font-weight:700; color:var(--text3); text-decoration:none;
  transition:color .15s; align-self:flex-start;
}
.slv-back-link:hover{color:var(--gold-deep)}

/* Header */
.slv-header{
  background:linear-gradient(180deg, var(--surface), var(--surface2));
  border:1px solid var(--border); border-radius:20px;
  padding:24px 26px; position:relative; overflow:hidden;
  animation:slv-fadeup .35s ease both;
}
.slv-header::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg, transparent, var(--gold) 30%, var(--gold-deep) 70%, transparent);
}
.slv-header-chips{display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px}
.slv-chip{
  display:inline-flex; align-items:center; gap:4px;
  font-size:10.5px; font-weight:800; padding:4px 10px; border-radius:100px;
  letter-spacing:.02em;
}
.slv-chip--gold{background:var(--gold-pale); color:#8F765B; border:1px solid var(--gold-border)}
.slv-chip--purple{background:var(--purple-l); color:var(--purple); border:1px solid rgba(121,106,98,0.18)}
.slv-chip--green{background:var(--green-l); color:var(--green); border:1px solid var(--green-b)}
.slv-title{font-size:24px;font-weight:900;color:var(--black);letter-spacing:-0.3px;line-height:1.3}
.slv-desc{font-size:14px;color:var(--text2);line-height:1.65;margin-top:8px}
.slv-byline{font-size:12px;color:var(--text3);margin-top:10px}
.slv-byline strong{color:var(--text2); font-weight:700}

/* Sections */
.slv-section{animation:slv-fadeup .35s .05s ease both}
.slv-section-hd{display:flex; align-items:center; gap:10px; margin-bottom:14px}
.slv-section-icon{font-size:18px}
.slv-section-title{font-size:17px; font-weight:800; color:var(--black)}

/* Content blocks */
.slv-content{display:flex; flex-direction:column; gap:16px}
.slv-block{animation:slv-fadeup .35s ease both}
.slv-text-body{
  font-size:15px; line-height:1.85; color:var(--text);
  background:var(--surface); border:1px solid var(--border); border-radius:14px;
  padding:18px 22px; white-space:pre-wrap;
}
.slv-text-body strong{color:var(--black); font-weight:800}
.slv-highlight{background:linear-gradient(180deg, transparent 60%, rgba(184,160,130,0.35) 60%); padding:0 2px}

.slv-image-wrap{
  background:var(--surface); border:1px solid var(--border); border-radius:14px;
  overflow:hidden; box-shadow:0 2px 8px rgba(26,26,26,0.04);
}
.slv-image{width:100%; height:auto; display:block; max-height:520px; object-fit:contain; background:#F7F3EB}
.slv-image-caption{font-size:12px; color:var(--text3); padding:10px 16px; text-align:center; border-top:1px solid var(--border); font-style:italic}

.slv-video-wrap{
  background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden;
}
.slv-video-frame{position:relative; padding-top:56.25%; background:#1A1A1A}
.slv-video-frame iframe{position:absolute; inset:0; width:100%; height:100%; border:0}
.slv-video-title{font-size:13px; font-weight:700; color:var(--text2); padding:10px 16px; border-top:1px solid var(--border)}

/* Mode hint */
.slv-mode-hint{
  font-size:12.5px; padding:11px 14px; border-radius:10px;
  margin-bottom:14px; font-weight:500; line-height:1.55;
  display:flex; align-items:center; gap:8px;
}
.slv-mode-hint--graded{background:var(--gold-pale); color:#6B1E2D; border:1px solid var(--gold-border)}
.slv-mode-hint--practice{background:var(--purple-l); color:var(--purple); border:1px solid rgba(121,106,98,0.18)}

/* Completed banner */
.slv-completed{
  background:var(--green-l); border:1px solid var(--green-b); border-radius:16px;
  padding:30px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px;
}
.slv-completed-emoji{font-size:40px}
.slv-completed h3{font-size:16px; font-weight:800; color:var(--green); margin-top:4px}
.slv-completed-score{font-size:14px; color:var(--text2); font-weight:500}
.slv-completed-score strong{color:var(--green); font-weight:900; font-size:18px}

/* Questions */
.slv-questions{display:flex; flex-direction:column; gap:14px}
.slv-q{
  background:var(--surface); border:1.5px solid var(--border); border-radius:14px;
  padding:18px 20px; transition:all .22s cubic-bezier(0.22,1,0.36,1);
}
.slv-q--correct{border-color:var(--green-b); background:linear-gradient(180deg, var(--green-l), var(--surface))}
.slv-q--incorrect{border-color:var(--red-b); background:linear-gradient(180deg, var(--red-l), var(--surface))}

.slv-q-head{display:flex; align-items:flex-start; gap:10px; margin-bottom:14px}
.slv-q-num{
  width:28px; height:28px; border-radius:8px; flex-shrink:0;
  background:var(--black); color:var(--gold);
  font-size:13px; font-weight:900;
  display:flex; align-items:center; justify-content:center;
}
.slv-q-text{flex:1; font-size:14.5px; font-weight:600; color:var(--text); line-height:1.6}
.slv-q-badge{
  font-size:11px; font-weight:800; padding:4px 10px; border-radius:100px;
  white-space:nowrap; align-self:flex-start;
}
.slv-q-badge--ok{background:var(--green); color:#fff}
.slv-q-badge--no{background:var(--red); color:#fff}

.slv-q-body{padding-inline-start:38px}
.slv-q-label{font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px}

/* MCQ */
.slv-mcq-list{display:flex; flex-direction:column; gap:8px}
.slv-mcq-opt{
  display:flex; align-items:center; gap:11px;
  background:var(--surface2); border:1.5px solid var(--border); border-radius:10px;
  padding:11px 14px; cursor:pointer; transition:all .18s;
  font-family:var(--font); width:100%; text-align:start;
}
.slv-mcq-opt:hover:not(:disabled){border-color:var(--gold-border); background:var(--gold-pale)}
.slv-mcq-opt.selected{border-color:var(--gold); background:var(--gold-pale); box-shadow:0 2px 8px rgba(184,160,130,0.15)}
.slv-mcq-opt:disabled{opacity:0.85; cursor:default}
.slv-mcq-radio{
  width:22px; height:22px; border-radius:50%; border:2px solid #D9C9B0;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  color:transparent; transition:all .18s;
}
.slv-mcq-radio.on{border-color:var(--gold); background:var(--gold); color:#fff; font-size:10px}
.slv-mcq-text{font-size:14px; color:var(--text); flex:1; line-height:1.5}

/* TF */
.slv-tf-row{display:flex; gap:10px}
.slv-tf-btn{
  flex:1; padding:14px; border:2px solid var(--border); border-radius:12px;
  font-size:14px; font-weight:700; cursor:pointer; background:var(--surface);
  font-family:var(--font); transition:all .2s;
  display:flex; align-items:center; justify-content:center; gap:8px;
  color:var(--text3);
}
.slv-tf-btn:hover:not(:disabled){border-color:var(--gold-border)}
.slv-tf-btn--true.on{background:var(--green-l); color:var(--green); border-color:var(--green)}
.slv-tf-btn--false.on{background:var(--red-l); color:var(--red); border-color:var(--red)}
.slv-tf-btn:disabled{opacity:0.85; cursor:default}
.slv-tf-icon{font-weight:900}

/* WRITTEN */
.slv-text-input{
  width:100%; border:1.5px solid var(--border); border-radius:10px;
  padding:12px 14px; font-size:15px; font-family:var(--font);
  color:var(--text); outline:none; background:var(--surface2);
  transition:all .2s;
}
.slv-text-input:focus{border-color:var(--gold); box-shadow:0 0 0 3px var(--gold-pale); background:var(--surface)}
.slv-text-input:disabled{opacity:0.85}

/* MATCHING */
.slv-match-list{display:flex; flex-direction:column; gap:8px}
.slv-match-row{
  display:flex; align-items:center; gap:10px;
  background:var(--surface2); border:1px solid var(--border); border-radius:10px;
  padding:10px 14px;
}
.slv-match-left{flex:1; font-size:14px; font-weight:600; color:var(--text)}
.slv-match-arrow{color:var(--gold-deep); font-weight:800; flex-shrink:0}
.slv-match-select{
  flex:1.2; border:1.5px solid var(--border); border-radius:8px;
  padding:8px 12px; font-size:13.5px; font-family:var(--font);
  color:var(--text); background:var(--surface); outline:none;
  transition:all .2s; cursor:pointer;
}
.slv-match-select:focus{border-color:var(--gold)}
.slv-match-select:disabled{opacity:0.85; cursor:default}

/* Error + submit */
.slv-error{
  background:var(--red-l); border:1px solid var(--red-b); color:var(--red);
  font-size:13px; padding:11px 14px; border-radius:10px; font-weight:600;
  margin-top:6px;
}
.slv-submit-row{display:flex; justify-content:center; padding-top:8px}
.slv-submit-btn{
  background:linear-gradient(135deg, var(--gold), var(--gold-deep));
  color:var(--black); border:none; border-radius:12px;
  padding:14px 36px; font-size:14px; font-weight:800;
  cursor:pointer; font-family:var(--font);
  display:inline-flex; align-items:center; gap:8px;
  transition:all .22s; box-shadow:0 2px 10px rgba(184,160,130,0.3);
}
.slv-submit-btn:hover:not(:disabled){transform:translateY(-2px); box-shadow:0 6px 20px rgba(184,160,130,0.4)}
.slv-submit-btn:disabled{opacity:0.7; cursor:not-allowed}
.slv-submit-btn--retake{
  background:linear-gradient(135deg, var(--purple), #655B53); color:#fff;
}
.slv-btn-spin{width:14px; height:14px; border:2px solid rgba(26,26,26,0.2); border-top-color:var(--black); border-radius:50%; animation:slv-spin .6s linear infinite; display:inline-block}

/* Score banner */
.slv-score-banner{
  background:linear-gradient(135deg, var(--gold), var(--gold-deep));
  color:var(--black); border-radius:18px;
  padding:22px 26px; display:flex; align-items:center; gap:18px;
  box-shadow:0 8px 28px rgba(184,160,130,0.35);
  animation:slv-fadeup .4s ease both;
}
.slv-score-emoji{font-size:42px}
.slv-score-label{font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; opacity:0.75}
.slv-score-value{font-size:34px; font-weight:900; line-height:1; margin-top:4px; font-family:var(--font)}
.slv-score-value span{font-size:20px; opacity:0.7; font-weight:700}

/* Linked quiz CTA */
.slv-quiz-cta{
  display:flex; align-items:center; gap:14px;
  background:var(--black); color:#fff;
  border-radius:16px; padding:18px 22px;
  text-decoration:none; transition:all .22s;
  box-shadow:0 4px 18px rgba(26,26,26,0.12);
  border:1px solid rgba(184,160,130,0.2);
}
.slv-quiz-cta:hover{transform:translateY(-2px); box-shadow:0 8px 28px rgba(26,26,26,0.18); border-color:var(--gold)}
.slv-quiz-icon{
  font-size:22px;
  width:46px; height:46px; border-radius:12px;
  background:rgba(184,160,130,0.15); border:1px solid rgba(184,160,130,0.3);
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.slv-quiz-text{flex:1}
.slv-quiz-label{font-size:10.5px; color:var(--gold); font-weight:700; letter-spacing:.1em; text-transform:uppercase}
.slv-quiz-name{font-size:15px; font-weight:800; margin-top:4px}
.slv-quiz-arrow{font-size:22px; color:var(--gold); font-weight:900}

.slv-empty{padding:60px 20px; text-align:center; color:var(--text3); font-size:14px}
.slv-back-btn{display:inline-block; margin-top:14px; padding:10px 20px; background:var(--black); color:var(--gold); border-radius:10px; text-decoration:none; font-weight:700; font-size:13px}

@media (max-width:500px){
  .slv-page{gap:18px}
  .slv-header{padding:20px}
  .slv-title{font-size:21px}
  .slv-q{padding:14px 16px}
  .slv-q-body{padding-inline-start:0; margin-top:8px}
  .slv-tf-btn{padding:12px}
  .slv-match-row{flex-wrap:wrap; gap:6px}
  .slv-match-left{flex-basis:100%}
  .slv-score-banner{padding:18px 20px}
  .slv-score-value{font-size:28px}
}
`;
