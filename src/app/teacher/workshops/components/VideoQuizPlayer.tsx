"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import {
  formatVideoTime,
  type TeacherWorkshopVideo,
  type WorkshopVideoAnswerRecord,
} from "@/lib/workshop-videos";

const T = {
  ar: {
    question: "سؤال",
    questionOf: (index: number, total: number) => `السؤال ${index} من ${total}`,
    submit: "إرسال الإجابة",
    continue: "متابعة الفيديو",
    correct: "إجابة صحيحة",
    wrong: "إجابة غير صحيحة",
    trueLbl: "صح",
    falseLbl: "خطأ",
    score: "نتيجتك",
    answeredCount: (done: number, total: number) => `${done} من ${total} أسئلة`,
    submitting: "جارٍ الإرسال...",
    submitError: "تعذر حفظ إجابتك. حاول مرة أخرى.",
    play: "تشغيل",
    pause: "إيقاف مؤقت",
    replay: "إعادة من البداية",
    mute: "كتم الصوت",
    unmute: "تشغيل الصوت",
    fullscreen: "ملء الشاشة",
    exitFullscreen: "إنهاء ملء الشاشة",
    locked: "أجب عن السؤال للمتابعة",
    loadError: "تعذر تشغيل الفيديو.",
    noQuestions: "لا توجد أسئلة في هذا الفيديو.",
    questionsCount: (n: number) => `${n} أسئلة داخل الفيديو`,
    allDone: "أكملت كل الأسئلة",
  },
  sq: {
    question: "Pyetje",
    questionOf: (index: number, total: number) => `Pyetja ${index} nga ${total}`,
    submit: "Dërgo përgjigjen",
    continue: "Vazhdo videon",
    correct: "Përgjigje e saktë",
    wrong: "Përgjigje jo e saktë",
    trueLbl: "E saktë",
    falseLbl: "E gabuar",
    score: "Rezultati yt",
    answeredCount: (done: number, total: number) => `${done} nga ${total} pyetje`,
    submitting: "Duke dërguar...",
    submitError: "Përgjigjja nuk u ruajt. Provo përsëri.",
    play: "Luaj",
    pause: "Pauzo",
    replay: "Rifillo",
    mute: "Hiq zërin",
    unmute: "Kthe zërin",
    fullscreen: "Ekran i plotë",
    exitFullscreen: "Dil nga ekrani i plotë",
    locked: "Përgjigju pyetjes për të vazhduar",
    loadError: "Video nuk u luajt.",
    noQuestions: "Kjo video nuk ka pyetje.",
    questionsCount: (n: number) => `${n} pyetje brenda videos`,
    allDone: "I përfundove të gjitha pyetjet",
  },
} as const;

// How far past a pending question we tolerate before snapping back.
const GATE_TOLERANCE = 0.25;

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
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const questions = [...video.questions].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  const [answered, setAnswered] = useState<Map<string, WorkshopVideoAnswerRecord>>(
    () => new Map((video.attempt?.answers ?? []).map((a) => [a.question_id, a])),
  );
  const [score, setScore] = useState(video.attempt?.score ?? 0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [revealed, setRevealed] = useState<WorkshopVideoAnswerRecord | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration_seconds ?? 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Mirrors of state the rAF/interval watchdog reads, so it never runs against
  // a stale closure.
  const answeredRef = useRef(answered);
  const activeRef = useRef<string | null>(null);
  answeredRef.current = answered;
  activeRef.current = activeQuestionId;

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null;
  const activeIndex = activeQuestion ? questions.findIndex((q) => q.id === activeQuestion.id) + 1 : 0;

  /** Timestamp of the first still-unanswered question — playback may not pass it. */
  const gateTime = useCallback(() => {
    const pending = questions.find((q) => !answeredRef.current.has(q.id));
    return pending ? pending.timestamp_seconds : Infinity;
  }, [questions]);

  const openQuestion = useCallback((questionId: string) => {
    const element = videoRef.current;
    if (element && !element.paused) element.pause();
    setActiveQuestionId(questionId);
    setSelected(null);
    setRevealed(null);
    setSubmitError("");
  }, []);

  /** Single source of truth for the gate; called from timeupdate AND a timer. */
  const enforceGate = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    setCurrentTime(element.currentTime);

    if (activeRef.current) {
      // A question is open — nothing may play behind the overlay, and the
      // playhead stays pinned to the question so that scrubbing underneath it
      // can't be used to skip the rest of the video.
      if (!element.paused) element.pause();
      const open = questions.find((q) => q.id === activeRef.current);
      if (open && Math.abs(element.currentTime - open.timestamp_seconds) > GATE_TOLERANCE) {
        element.currentTime = open.timestamp_seconds;
        setCurrentTime(open.timestamp_seconds);
      }
      return;
    }
    const pending = questions.find((q) => !answeredRef.current.has(q.id));
    if (!pending) return;
    if (element.currentTime >= pending.timestamp_seconds - 0.05) {
      element.pause();
      if (element.currentTime > pending.timestamp_seconds + GATE_TOLERANCE) {
        element.currentTime = pending.timestamp_seconds;
      }
      openQuestion(pending.id);
    }
  }, [questions, openQuestion]);

  // `timeupdate` fires only ~4x/sec and is throttled further on mobile and in
  // background tabs, so a timer backs it up while playing.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(enforceGate, 150);
    return () => window.clearInterval(timer);
  }, [playing, enforceGate]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const viewReportedRef = useRef(false);
  const completedRef = useRef(!!video.watch_completed);

  function recordView(completed: boolean) {
    void fetch(`/api/teacher/workshops/${workshopId}/videos/${video.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }).catch(() => null);
  }

  function togglePlay() {
    const element = videoRef.current;
    if (!element || activeQuestionId) return;
    if (element.paused) {
      // Starting exactly on a gate would immediately re-pause; nudge past it.
      void element.play().catch(() => null);
    } else {
      element.pause();
    }
  }

  function seekTo(seconds: number) {
    const element = videoRef.current;
    if (!element || activeQuestionId) return;
    const limit = gateTime();
    element.currentTime = Math.min(seconds, limit === Infinity ? seconds : limit);
    setCurrentTime(element.currentTime);
  }

  function replay() {
    const element = videoRef.current;
    if (!element || activeQuestionId) return;
    element.currentTime = 0;
    setCurrentTime(0);
    void element.play().catch(() => null);
  }

  function toggleMute() {
    const element = videoRef.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  }

  async function toggleFullscreen() {
    // Fullscreen the WRAPPER, not the <video> — fullscreening the media element
    // itself hands over to the platform player and our question overlay would
    // no longer be visible.
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => null);
    } else {
      await wrapperRef.current?.requestFullscreen().catch(() => null);
    }
  }

  async function submitAnswer() {
    if (!activeQuestion || !selected || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(`/api/teacher/workshops/${workshopId}/videos/${video.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: activeQuestion.id, answer: selected }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "failed");
      const record: WorkshopVideoAnswerRecord = {
        question_id: activeQuestion.id,
        answer: payload.submitted_answer,
        is_correct: payload.is_correct,
      };
      setAnswered((current) => new Map(current).set(activeQuestion.id, record));
      setScore(payload.attempt.score);
      setRevealed(record);
    } catch {
      setSubmitError(t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  function continuePlayback() {
    setActiveQuestionId(null);
    activeRef.current = null;
    setSelected(null);
    setRevealed(null);
    const element = videoRef.current;
    if (!element) return;
    // Step just past this question so the gate check doesn't re-trigger on it.
    element.currentTime = Math.min(element.currentTime + 0.3, duration || element.duration || element.currentTime + 0.3);
    void element.play().catch(() => null);
  }

  const answeredCount = questions.filter((q) => answered.has(q.id)).length;
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <article className="vqp">
      <div className={`vqp-stage${isFullscreen ? " fullscreen" : ""}`} ref={wrapperRef}>
        <video
          ref={videoRef}
          src={video.url}
          // playsInline is essential: without it iOS Safari takes the video into
          // its own fullscreen player, where this overlay cannot render at all
          // and the quiz simply never appears.
          playsInline
          preload="metadata"
          className="vqp-video"
          onClick={togglePlay}
          onPlay={() => { setPlaying(true); if (!viewReportedRef.current) { viewReportedRef.current = true; recordView(false); } }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={enforceGate}
          onSeeking={enforceGate}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            if (Number.isFinite(element.duration) && element.duration > 0) setDuration(element.duration);
          }}
          onEnded={() => {
            setPlaying(false);
            if (!completedRef.current) { completedRef.current = true; recordView(true); }
          }}
          onError={() => setLoadFailed(true)}
        />

        {loadFailed && (
          <div className="vqp-fallback"><p>{t.loadError}</p></div>
        )}

        {!playing && !activeQuestion && !loadFailed && (
          <button className="vqp-bigplay" onClick={togglePlay} aria-label={t.play}>
            <Play size={30} />
          </button>
        )}

        {activeQuestion && (
          <div className="vqp-overlay" role="dialog" aria-modal="true" aria-label={t.question}>
            <div className="vqp-card">
              <div className="vqp-card-head">
                <HelpCircle size={15} />
                <span>{t.questionOf(activeIndex, questions.length)}</span>
              </div>
              <p className="vqp-card-text">{activeQuestion.text}</p>

              {!revealed ? (
                <>
                  <div className="vqp-options">
                    {activeQuestion.type === "TF" ? (
                      <>
                        <button type="button" className={`vqp-opt${selected === "true" ? " sel" : ""}`} onClick={() => setSelected("true")}>{t.trueLbl}</button>
                        <button type="button" className={`vqp-opt${selected === "false" ? " sel" : ""}`} onClick={() => setSelected("false")}>{t.falseLbl}</button>
                      </>
                    ) : (
                      activeQuestion.options.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={`vqp-opt${selected === option.text ? " sel" : ""}`}
                          onClick={() => setSelected(option.text)}
                        >
                          {option.text}
                        </button>
                      ))
                    )}
                  </div>
                  {submitError && <p className="vqp-error" role="alert">{submitError}</p>}
                  <button className="vqp-cta" onClick={() => void submitAnswer()} disabled={!selected || submitting}>
                    {submitting ? t.submitting : t.submit}
                  </button>
                </>
              ) : (
                <>
                  <div className={`vqp-result${revealed.is_correct ? "" : " wrong"}`}>
                    {revealed.is_correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                    <span>{revealed.is_correct ? t.correct : t.wrong}</span>
                  </div>
                  <button className="vqp-cta" onClick={continuePlayback}>{t.continue}</button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="vqp-controls">
          <button onClick={togglePlay} disabled={!!activeQuestion} aria-label={playing ? t.pause : t.play} title={playing ? t.pause : t.play}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button onClick={replay} disabled={!!activeQuestion} aria-label={t.replay} title={t.replay}>
            <RotateCcw size={16} />
          </button>
          <span className="vqp-time">{formatVideoTime(currentTime)} / {formatVideoTime(duration)}</span>

          <div className="vqp-track">
            <div className="vqp-track-fill" style={{ width: `${progressPercent}%` }} />
            {duration > 0 && questions.map((question) => (
              <span
                key={question.id}
                className={`vqp-marker${answered.has(question.id) ? " done" : ""}`}
                style={{ insetInlineStart: `${Math.min(100, (question.timestamp_seconds / duration) * 100)}%` }}
                title={formatVideoTime(question.timestamp_seconds)}
              />
            ))}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              disabled={!!activeQuestion}
              aria-label={t.play}
              onChange={(event) => seekTo(Number(event.target.value))}
            />
          </div>

          <button onClick={toggleMute} aria-label={muted ? t.unmute : t.mute} title={muted ? t.unmute : t.mute}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen} title={isFullscreen ? t.exitFullscreen : t.fullscreen}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="vqp-meta">
        <strong>{video.title}</strong>
        <div className="vqp-meta-tags">
          {questions.length > 0 ? (
            <>
              <span className="vqp-tag">{t.questionsCount(questions.length)}</span>
              <span className={`vqp-tag${answeredCount === questions.length ? " done" : ""}`}>
                {answeredCount === questions.length ? t.allDone : t.answeredCount(answeredCount, questions.length)}
              </span>
              <span className="vqp-tag score">{t.score}: {score}/{questions.length}</span>
            </>
          ) : (
            <span className="vqp-tag">{t.noQuestions}</span>
          )}
        </div>
      </div>
      <style>{styles}</style>
    </article>
  );
}

const styles = `
.vqp{background:#FFFBF5;border:1px solid #E5E0D5;border-radius:16px;overflow:hidden;font-family:'Cairo','Tajawal',sans-serif}
.vqp-stage{position:relative;background:#1A1A1A;line-height:0}
.vqp-stage.fullscreen{display:flex;flex-direction:column;justify-content:center;height:100vh;background:#1A1A1A}
.vqp-video{width:100%;max-height:min(62vh,560px);display:block;background:#1A1A1A;object-fit:contain;cursor:pointer}
.vqp-stage.fullscreen .vqp-video{max-height:calc(100vh - 58px);flex:1}
.vqp-fallback{position:absolute;inset:0;display:grid;place-items:center;background:rgba(26,26,26,.86);color:#F7F3EB;font-size:13px;font-weight:800;line-height:1.7;padding:20px;text-align:center}
.vqp-bigplay{position:absolute;inset:0;margin:auto;width:66px;height:66px;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(107,30,45,.92);color:#F7F3EB;cursor:pointer;box-shadow:0 8px 30px rgba(26,26,26,.45)}
.vqp-bigplay:hover{background:#6B1E2D}

/* ── Question overlay ── */
.vqp-overlay{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(26,26,26,.82);backdrop-filter:blur(4px);overflow-y:auto;line-height:normal}
.vqp-card{width:min(460px,100%);max-height:100%;overflow-y:auto;background:#FFFBF5;border-radius:16px;padding:18px;box-shadow:0 22px 60px rgba(26,26,26,.5)}
.vqp-card-head{display:flex;align-items:center;gap:6px;margin-bottom:9px;color:#6B1E2D;font-size:10.5px;font-weight:900}
.vqp-card-text{margin:0 0 14px;font-size:15px;font-weight:800;line-height:1.75;color:#32101A}
.vqp-options{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.vqp-opt{min-height:46px;display:flex;align-items:center;border:1.5px solid #D9C9B0;border-radius:11px;background:#FFFFFF;padding:11px 14px;font:700 13.5px 'Cairo',sans-serif;color:#32101A;cursor:pointer;text-align:start;transition:border-color .12s,background .12s}
.vqp-opt:hover{border-color:#8F765B}
.vqp-opt.sel{border-color:#6B1E2D;border-width:2px;background:rgba(107,30,45,.08);font-weight:900}
.vqp-cta{width:100%;min-height:46px;border:0;border-radius:11px;background:#6B1E2D;color:#F7F3EB;font:900 13.5px 'Cairo',sans-serif;cursor:pointer}
.vqp-cta:disabled{opacity:.45;cursor:not-allowed}
.vqp-result{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:11px 13px;border-radius:11px;background:rgba(27,94,32,.13);color:#1B5E20;font-weight:900;font-size:13px}
.vqp-result.wrong{background:rgba(107,30,45,.1);color:#6B1E2D}
.vqp-error{margin:0 0 10px;padding:9px 11px;border-radius:9px;background:rgba(107,30,45,.09);color:#6B1E2D;font-size:11.5px;font-weight:800}

/* ── Custom controls (native controls are intentionally NOT used: they would
      let a viewer resume or scrub past an unanswered question) ── */
.vqp-controls{position:relative;z-index:2;display:flex;align-items:center;gap:8px;padding:9px 11px;background:#1A1A1A;line-height:normal}
.vqp-controls button{width:34px;height:34px;flex:none;display:grid;place-items:center;border:0;border-radius:9px;background:rgba(255,255,255,.09);color:#F7F3EB;cursor:pointer}
.vqp-controls button:hover:not(:disabled){background:rgba(255,255,255,.18)}
.vqp-controls button:disabled{opacity:.35;cursor:not-allowed}
.vqp-time{flex:none;font:800 11px ui-monospace,Consolas,monospace;color:#D9C9B0;direction:ltr}
.vqp-track{position:relative;flex:1;height:34px;display:flex;align-items:center;min-width:60px}
.vqp-track:before{content:'';position:absolute;inset-inline:0;height:5px;border-radius:999px;background:rgba(255,255,255,.2)}
.vqp-track-fill{position:absolute;inset-inline-start:0;height:5px;border-radius:999px;background:#B8A082;pointer-events:none}
.vqp-marker{position:absolute;width:3px;height:13px;border-radius:2px;background:#F7F3EB;transform:translateX(-1px);pointer-events:none;box-shadow:0 0 0 1px rgba(26,26,26,.5)}
.vqp-marker.done{background:#1B5E20}
.vqp-track input[type=range]{position:absolute;inset-inline:0;width:100%;height:34px;margin:0;background:transparent;appearance:none;-webkit-appearance:none;cursor:pointer}
.vqp-track input[type=range]:disabled{cursor:not-allowed}
.vqp-track input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#F7F3EB;border:2px solid #6B1E2D;cursor:pointer}
.vqp-track input[type=range]::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#F7F3EB;border:2px solid #6B1E2D;cursor:pointer}
.vqp-track input[type=range]::-webkit-slider-runnable-track{background:transparent}

/* ── Footer meta ── */
.vqp-meta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:11px 14px}
.vqp-meta strong{font-size:13px;color:#32101A;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vqp-meta-tags{display:flex;flex-wrap:wrap;gap:6px}
.vqp-tag{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;background:#EFEAE0;color:#655B53;font-size:10px;font-weight:800}
.vqp-tag.done{background:rgba(27,94,32,.13);color:#1B5E20}
.vqp-tag.score{background:rgba(107,30,45,.09);color:#6B1E2D}

@media(max-width:560px){
  .vqp-video{max-height:56vh}
  .vqp-overlay{padding:10px}
  .vqp-card{padding:15px;border-radius:14px}
  .vqp-card-text{font-size:14px}
  .vqp-opt{min-height:48px;font-size:13px;padding:11px 12px}
  .vqp-cta{min-height:48px}
  .vqp-controls{flex-wrap:wrap;gap:6px;padding:8px}
  .vqp-track{order:10;flex-basis:100%;min-width:100%}
  .vqp-time{margin-inline-start:auto}
  .vqp-meta{padding:10px 12px}
  .vqp-meta strong{flex-basis:100%}
}
`;
