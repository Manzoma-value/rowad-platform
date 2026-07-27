"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { TeacherWorkshopVideo, WorkshopVideoAnswerRecord } from "@/lib/workshop-videos";

const T = {
  ar: {
    question: "سؤال",
    submit: "إرسال الإجابة",
    continue: "متابعة الفيديو",
    correct: "إجابة صحيحة!",
    wrong: "إجابة غير صحيحة",
    trueLbl: "صح",
    falseLbl: "خطأ",
    score: "نتيجتك",
    watched: "تمت مشاهدته",
    submitting: "جارٍ الإرسال...",
  },
  sq: {
    question: "Pyetje",
    submit: "Dërgo përgjigjen",
    continue: "Vazhdo videon",
    correct: "Përgjigje e saktë!",
    wrong: "Përgjigje jo e saktë",
    trueLbl: "E saktë",
    falseLbl: "E gabuar",
    score: "Rezultati yt",
    watched: "E parë",
    submitting: "Duke dërguar...",
  },
} as const;

const RESUME_EPSILON = 0.35;

export function VideoQuizPlayer({
  workshopId,
  video,
  lang,
}: {
  workshopId: string;
  video: TeacherWorkshopVideo;
  lang: "ar" | "sq";
}) {
  const t = T[lang];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [answered, setAnswered] = useState<Map<string, WorkshopVideoAnswerRecord>>(
    () => new Map((video.attempt?.answers ?? []).map((a) => [a.question_id, a])),
  );
  const [score, setScore] = useState(video.attempt?.score ?? 0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ is_correct: boolean } | null>(null);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(!!video.watch_completed);

  const questions = video.questions.slice().sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null;

  const nextUnanswered = useCallback((currentAnswered: Map<string, WorkshopVideoAnswerRecord>) => {
    return questions.find((q) => !currentAnswered.has(q.id)) ?? null;
  }, [questions]);

  function recordView(completed: boolean) {
    void fetch(`/api/teacher/workshops/${workshopId}/videos/${video.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }).catch(() => null);
  }

  function handlePlay() {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      recordView(false);
    }
  }

  function handleEnded() {
    if (!completedRef.current) {
      completedRef.current = true;
      recordView(true);
    }
  }

  function handleTimeUpdate() {
    const el = videoRef.current;
    if (!el || activeQuestionId) return;
    const upcoming = nextUnanswered(answered);
    if (upcoming && el.currentTime >= upcoming.timestamp_seconds) {
      el.pause();
      el.currentTime = upcoming.timestamp_seconds;
      setActiveQuestionId(upcoming.id);
      setSelected(null);
      setLastResult(null);
    }
  }

  function handleSeeking() {
    const el = videoRef.current;
    if (!el) return;
    const upcoming = nextUnanswered(answered);
    if (upcoming && el.currentTime > upcoming.timestamp_seconds + RESUME_EPSILON) {
      el.currentTime = upcoming.timestamp_seconds;
    }
  }

  async function submitAnswer() {
    if (!activeQuestion || !selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teacher/workshops/${workshopId}/videos/${video.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: activeQuestion.id, answer: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      const record: WorkshopVideoAnswerRecord = {
        question_id: activeQuestion.id,
        answer: data.submitted_answer,
        is_correct: data.is_correct,
      };
      setAnswered((cur) => new Map(cur).set(activeQuestion.id, record));
      setScore(data.attempt.score);
      setLastResult({ is_correct: data.is_correct });
    } catch {
      setLastResult(null);
    } finally {
      setSubmitting(false);
    }
  }

  function continuePlayback() {
    setActiveQuestionId(null);
    setSelected(null);
    setLastResult(null);
    videoRef.current?.play().catch(() => null);
  }

  useEffect(() => {
    // If every question is already answered from a previous session, no
    // further pausing is needed — this just guards against stale state.
    if (nextUnanswered(answered) === null) setActiveQuestionId(null);
  }, [answered, nextUnanswered]);

  return (
    <article className="vqp">
      <div className="vqp-player-wrap">
        <video
          ref={videoRef}
          src={video.url}
          controls
          controlsList="nodownload"
          preload="metadata"
          className="vqp-video"
          onPlay={handlePlay}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
        />
        {activeQuestion && (
          <div className="vqp-overlay" role="dialog" aria-modal="true">
            <div className="vqp-card">
              <div className="vqp-card-head"><HelpCircle size={16} />{t.question}</div>
              <p className="vqp-card-text">{activeQuestion.text}</p>

              {!answered.has(activeQuestion.id) ? (
                <>
                  <div className="vqp-options">
                    {activeQuestion.type === "TF" ? (
                      <>
                        <button className={`vqp-opt${selected === "true" ? " sel" : ""}`} onClick={() => setSelected("true")}>{t.trueLbl}</button>
                        <button className={`vqp-opt${selected === "false" ? " sel" : ""}`} onClick={() => setSelected("false")}>{t.falseLbl}</button>
                      </>
                    ) : (
                      activeQuestion.options.map((opt) => (
                        <button key={opt.id} className={`vqp-opt${selected === opt.text ? " sel" : ""}`} onClick={() => setSelected(opt.text)}>
                          {opt.text}
                        </button>
                      ))
                    )}
                  </div>
                  <button className="vqp-submit" onClick={() => void submitAnswer()} disabled={!selected || submitting}>
                    {submitting ? t.submitting : t.submit}
                  </button>
                </>
              ) : (
                <>
                  <div className={`vqp-result${lastResult?.is_correct === false ? " wrong" : ""}`}>
                    {(lastResult?.is_correct ?? answered.get(activeQuestion.id)?.is_correct) ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {(lastResult?.is_correct ?? answered.get(activeQuestion.id)?.is_correct) ? t.correct : t.wrong}
                  </div>
                  <button className="vqp-submit" onClick={continuePlayback}>{t.continue}</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="vqp-footer">
        <strong>{video.title}</strong>
        {video.questions.length > 0 && <span>{t.score}: {score}/{video.questions.length}</span>}
      </div>
      <style>{styles}</style>
    </article>
  );
}

const styles = `
.vqp{background:#FFFBF5;border:1px solid #E5E0D5;border-radius:14px;overflow:hidden}
.vqp-player-wrap{position:relative;background:#1A1A1A}
.vqp-video{width:100%;max-height:520px;display:block;background:#1A1A1A}
.vqp-overlay{position:absolute;inset:0;display:grid;place-items:center;padding:16px;background:rgba(107,30,45,.72);backdrop-filter:blur(3px)}
.vqp-card{width:min(420px,100%);background:#FFFBF5;border-radius:16px;padding:18px;box-shadow:0 20px 55px rgba(26,26,26,.4)}
.vqp-card-head{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:900;color:#6B1E2D;text-transform:uppercase;margin-bottom:8px}
.vqp-card-text{margin:0 0 14px;font-size:14px;line-height:1.7;color:#32101A;font-weight:800}
.vqp-options{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}
.vqp-opt{border:1.5px solid #D9C9B0;border-radius:10px;background:#fff;padding:10px 12px;font:700 12.5px 'Cairo',sans-serif;color:#32101A;cursor:pointer;text-align:start}
.vqp-opt.sel{border-color:#6B1E2D;background:rgba(107,30,45,.08);font-weight:900}
.vqp-submit{width:100%;border:0;border-radius:10px;padding:11px;background:#6B1E2D;color:#F7F3EB;font:900 12.5px 'Cairo',sans-serif;cursor:pointer}
.vqp-submit:disabled{opacity:.5;cursor:progress}
.vqp-result{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 12px;border-radius:10px;background:rgba(27,94,32,.12);color:#1B5E20;font-weight:900;font-size:13px}
.vqp-result.wrong{background:rgba(107,30,45,.1);color:#6B1E2D}
.vqp-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;font-size:11.5px;color:#655B53}
.vqp-footer strong{color:#32101A;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
