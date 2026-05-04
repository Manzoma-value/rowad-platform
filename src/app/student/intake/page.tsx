"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MandalaLoader from "@/components/MandalaLoader";

interface Option {
  id: string;
  text: string;
  order: number;
}
interface Question {
  id: string;
  type: "MCQ" | "TF" | "WRITTEN";
  text: string;
  order: number;
  options: Option[];
}
interface Assessment {
  id: string;
  title: string;
  questions: Question[];
}

export default function StudentIntakePage() {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAssessment, setNoAssessment] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/intake")
      .then((r) => r.json())
      .then((d) => {
        if (d.assessment) setAssessment(d.assessment);
        else setNoAssessment(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const setAnswer = (qid: string, val: string) =>
    setAnswers((a) => ({ ...a, [qid]: val }));
  const questions = assessment?.questions ?? [];
  const current = questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const progress =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  async function handleSubmit() {
    if (!assessment) return;
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`يوجد ${unanswered.length} سؤال لم تجب عليه بعد`);
      setCurrentQ(questions.findIndex((q) => !answers[q.id]));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/student/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessment.id,
          answers: Object.entries(answers).map(([question_id, answer]) => ({
            question_id,
            answer,
          })),
        }),
      });
      const d = await r.json();
      if (d.success) router.push("/student/waiting");
      else setError(d.error ?? "حدث خطأ أثناء التقديم");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="pg-shell">
        <MandalaLoader label="جارٍ تحميل الاختبار" />
      </div>
    );

  if (noAssessment)
    return (
      <div className="pg-shell">
        <div className="empty-card">
          <div className="empty-orn">
            <div className="orn-line" />
            <div className="orn-gem" />
            <div className="orn-line" />
          </div>
          <div className="empty-icon-wrap">
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.4}
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </div>
          <h2 className="empty-title">لا يوجد اختبار متاح حالياً</h2>
          <p className="empty-sub">سيتم إخطارك عندما يكون الاختبار جاهزاً</p>
          <div className="empty-orn" style={{ marginTop: 8 }}>
            <div className="orn-line" />
            <div className="orn-gem" />
            <div className="orn-line" />
          </div>
        </div>
        <style>{css}</style>
      </div>
    );

  if (!assessment) return null;

  const typeLabel =
    current?.type === "MCQ"
      ? "اختيار من متعدد"
      : current?.type === "TF"
        ? "صح أم خطأ"
        : "إجابة مكتوبة";

  return (
    <div className="pg-shell">
      <div className="intake-wrap">
        {/* ── Header ── */}
        <div className="intake-head">
          <div className="intake-head-left">
            <div className="intake-eyebrow">
              <div className="ey-gem" />
              اختبار القبول
            </div>
            <h1 className="intake-title">{assessment.title}</h1>
          </div>
          <div className="intake-counter">
            <span className="counter-cur">{currentQ + 1}</span>
            <span className="counter-sep">/</span>
            <span className="counter-tot">{questions.length}</span>
            <div className="counter-sub">{answeredCount} مجاب</div>
          </div>
        </div>

        {/* ── Progress ── */}
        <div className="prog-wrap">
          <div className="prog-track">
            <div className="prog-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="prog-pct">{Math.round(progress)}%</span>
        </div>

        {/* ── Question dots ── */}
        <div className="q-dots">
          {questions.map((q, i) => (
            <button
              key={q.id}
              className={`q-dot ${i === currentQ ? "cur" : ""} ${answers[q.id] ? "ans" : ""}`}
              onClick={() => setCurrentQ(i)}
              title={`سؤال ${i + 1}`}
            />
          ))}
        </div>

        {/* ── Question card ── */}
        {current && (
          <div className="q-card" key={current.id}>
            {/* Card top gold rule */}
            <div className="q-card-rule" />
            <div className="q-badge">{typeLabel}</div>
            <div className="q-text">{current.text}</div>

            {current.type === "MCQ" && (
              <div className="q-opts">
                {current.options.map((opt) => (
                  <button
                    key={opt.id}
                    className={`opt-btn ${answers[current.id] === opt.text ? "sel" : ""}`}
                    onClick={() => setAnswer(current.id, opt.text)}
                  >
                    <span className="opt-circle">
                      {answers[current.id] === opt.text && (
                        <span className="opt-dot" />
                      )}
                    </span>
                    {opt.text}
                  </button>
                ))}
              </div>
            )}

            {current.type === "TF" && (
              <div className="tf-row">
                {[
                  { val: "true", label: "صحيح" },
                  { val: "false", label: "خطأ" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    className={`tf-btn ${answers[current.id] === opt.val ? "sel" : ""} tf-${opt.val}`}
                    onClick={() => setAnswer(current.id, opt.val)}
                  >
                    <span className="tf-icon">
                      {opt.val === "true" ? "✔" : "✘"}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {current.type === "WRITTEN" && (
              <textarea
                className="written-inp"
                placeholder="اكتب إجابتك هنا..."
                value={answers[current.id] ?? ""}
                onChange={(e) => setAnswer(current.id, e.target.value)}
                rows={5}
                dir="rtl"
              />
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="nav-row">
          <button
            className="nav-btn sec"
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            السابق
          </button>
          {currentQ < questions.length - 1 ? (
            <button
              className="nav-btn pri"
              onClick={() => setCurrentQ((q) => q + 1)}
            >
              التالي
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <button
              className={`nav-btn submit ${allAnswered ? "ready" : ""}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="nav-spin" />
                  <span>جارٍ التقديم...</span>
                </>
              ) : (
                "تقديم الاختبار ✔"
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="err-bar">
            <svg
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}
      </div>
      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sp{to{transform:rotate(360deg)}}

  :root{
    --gold:#C8A96A; --gold2:#E5B93C; --red:#7A1E1E;
    --black:#0B0B0C; --ow:#F5F3EE; --cream:#EDE9E0;
    --text:#0B0B0C; --text2:#3E3526; --text3:#8A7A5A;
    --sur:#FFFFFF; --bdr:#DDD5C4; --bdr2:#CEC2AC;
    --gm:rgba(200,169,106,0.09); --gm2:rgba(200,169,106,0.18); --gbdr:rgba(200,169,106,0.24);
    --rm:rgba(122,30,30,0.08); --rbdr:rgba(122,30,30,0.2);
    --success:#1a6b3c; --danger:#8b1a1a;
    --sh:0 4px 20px rgba(11,11,12,0.07);
    --shsm:0 1px 4px rgba(11,11,12,0.05);
  }

  .pg-shell{
    min-height:100vh; background:var(--ow);
    font-family:'Cairo',sans-serif; direction:rtl;
    display:flex; align-items:flex-start; justify-content:center;
    padding:40px 20px 80px;
  }

  /* ── Ornament ── */
  .orn-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gbdr),transparent)}
  .orn-gem{width:5px;height:5px;background:rgba(200,169,106,0.4);transform:rotate(45deg);margin:0 10px;flex-shrink:0}

  /* ── Empty state ── */
  .empty-card{
    width:100%;max-width:480px;
    background:var(--sur);border:1px solid var(--bdr);border-radius:16px;
    padding:44px 40px;display:flex;flex-direction:column;align-items:center;gap:16px;
    text-align:center;box-shadow:var(--sh);
    border-top:2px solid var(--gold);
    animation:fadeUp 0.4s ease both;
  }
  .empty-orn{display:flex;align-items:center;width:100%}
  .empty-icon-wrap{
    width:72px;height:72px;border-radius:50%;
    background:var(--gm);border:1px solid var(--gbdr);
    display:flex;align-items:center;justify-content:center;
    color:var(--gold);
  }
  .empty-title{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.3px}
  .empty-sub{font-size:13.5px;color:var(--text3);font-weight:500}

  /* ── Main wrap ── */
  .intake-wrap{
    width:100%;max-width:700px;
    display:flex;flex-direction:column;gap:22px;
    animation:fadeUp 0.4s ease both;
  }

  /* ── Header ── */
  .intake-head{
    display:flex;align-items:flex-start;justify-content:space-between;
    gap:16px;padding-bottom:22px;
    border-bottom:1px solid var(--bdr);
    position:relative;
  }
  .intake-head::after{
    content:'';position:absolute;bottom:-1px;right:0;
    width:60px;height:2px;
    background:linear-gradient(90deg,var(--gold),transparent);
  }
  .intake-head-left{display:flex;flex-direction:column;gap:8px}
  .intake-eyebrow{
    display:flex;align-items:center;gap:7px;
    font-size:10px;font-weight:700;color:var(--gold);
    text-transform:uppercase;letter-spacing:2px;
    font-family:'IBM Plex Mono',monospace;
  }
  .ey-gem{width:4px;height:4px;background:var(--gold);transform:rotate(45deg);flex-shrink:0}
  .intake-title{font-size:24px;font-weight:900;color:var(--text);letter-spacing:-0.5px}
  .intake-counter{
    display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;
    background:var(--gm);border:1px solid var(--gbdr);
    padding:12px 16px;border-radius:10px;
  }
  .counter-cur{font-size:28px;font-weight:900;color:var(--text);font-family:'IBM Plex Mono',monospace;line-height:1}
  .counter-sep{font-size:14px;color:var(--text3);font-family:'IBM Plex Mono',monospace;margin:0 1px}
  .counter-tot{font-size:13px;font-weight:700;color:var(--text3);font-family:'IBM Plex Mono',monospace}
  .counter-sub{font-size:10px;color:var(--text3);font-weight:600;margin-top:3px}

  /* ── Progress ── */
  .prog-wrap{display:flex;align-items:center;gap:12px}
  .prog-track{flex:1;height:6px;background:var(--cream);border-radius:99px;overflow:hidden}
  .prog-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:99px;transition:width 0.4s ease}
  .prog-pct{font-size:11px;font-weight:700;color:var(--text3);font-family:'IBM Plex Mono',monospace;min-width:32px;text-align:left}

  /* ── Dots ── */
  .q-dots{display:flex;flex-wrap:wrap;gap:5px}
  .q-dot{width:30px;height:7px;border-radius:99px;background:var(--cream);border:1px solid var(--bdr);cursor:pointer;transition:all 0.2s}
  .q-dot.ans{background:var(--gold);border-color:var(--gold)}
  .q-dot.cur{background:var(--black);border-color:var(--black);transform:scaleY(1.4)}

  /* ── Question card ── */
  .q-card{
    background:var(--sur);border:1px solid var(--bdr);border-radius:14px;
    padding:28px;display:flex;flex-direction:column;gap:20px;
    box-shadow:var(--sh);position:relative;overflow:hidden;
    animation:fadeUp 0.22s ease both;
  }
  .q-card-rule{
    position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,var(--gold),var(--gold2),transparent);
  }
  .q-badge{
    font-size:10px;font-weight:700;color:var(--gold);
    background:var(--gm);border:1px solid var(--gbdr);
    padding:3px 10px;border-radius:6px;width:fit-content;
    text-transform:uppercase;letter-spacing:1px;font-family:'IBM Plex Mono',monospace;
  }
  .q-text{font-size:18px;font-weight:700;color:var(--text);line-height:1.65}

  /* Options */
  .q-opts{display:flex;flex-direction:column;gap:10px}
  .opt-btn{
    display:flex;align-items:center;gap:13px;
    padding:13px 16px;border-radius:10px;
    background:var(--ow);border:1.5px solid var(--bdr);
    color:var(--text2);font-size:14.5px;font-weight:500;
    cursor:pointer;text-align:right;
    transition:all 0.16s;font-family:'Cairo',sans-serif;
  }
  .opt-btn:hover{border-color:var(--gold);background:var(--gm)}
  .opt-btn.sel{border-color:var(--gold);background:var(--gm2);color:var(--text);font-weight:700}
  .opt-circle{
    width:20px;height:20px;border-radius:50%;
    border:2px solid var(--bdr2);flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    transition:border-color 0.16s;
  }
  .opt-btn.sel .opt-circle{border-color:var(--gold)}
  .opt-dot{width:8px;height:8px;border-radius:50%;background:var(--gold)}

  /* TF */
  .tf-row{display:flex;gap:12px}
  .tf-btn{
    flex:1;padding:16px;border-radius:12px;
    font-size:16px;font-weight:700;cursor:pointer;
    border:1.5px solid var(--bdr);background:var(--ow);
    transition:all 0.16s;font-family:'Cairo',sans-serif;color:var(--text2);
    display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .tf-btn:hover{border-color:var(--gold);background:var(--gm)}
  .tf-btn.sel.tf-true{background:rgba(26,107,60,0.09);border-color:rgba(26,107,60,0.35);color:var(--success,#1a6b3c)}
  .tf-btn.sel.tf-false{background:var(--rm);border-color:var(--rbdr);color:var(--red)}
  .tf-icon{font-size:14px}

  /* Written */
  .written-inp{
    width:100%;padding:13px 15px;
    background:var(--ow);border:1.5px solid var(--bdr);
    border-radius:10px;color:var(--text);
    font-size:14.5px;font-family:'Cairo',sans-serif;
    line-height:1.75;resize:vertical;outline:none;
    transition:border-color 0.16s,background 0.16s;
  }
  .written-inp:focus{border-color:var(--gold);background:var(--sur);box-shadow:0 0 0 3px var(--gm)}
  .written-inp::placeholder{color:var(--text3)}

  /* Navigation */
  .nav-row{display:flex;justify-content:space-between;align-items:center;gap:12px}
  .nav-btn{
    display:flex;align-items:center;gap:7px;
    padding:12px 24px;border-radius:10px;
    font-size:14px;font-weight:700;cursor:pointer;
    transition:all 0.16s;font-family:'Cairo',sans-serif;border:none;
  }
  .nav-btn.pri{background:var(--black);color:var(--gold);border:1px solid rgba(200,169,106,0.2)}
  .nav-btn.pri:hover{background:#1a1208;border-color:var(--gold)}
  .nav-btn.sec{background:var(--sur);color:var(--text2);border:1.5px solid var(--bdr2)}
  .nav-btn.sec:hover:not(:disabled){border-color:var(--gold);color:var(--text)}
  .nav-btn.sec:disabled{opacity:0.35;cursor:not-allowed}
  .nav-btn.submit{background:var(--cream);color:var(--text3);border:1px solid var(--bdr)}
  .nav-btn.submit.ready{background:var(--black);color:var(--gold);border-color:rgba(200,169,106,0.2)}
  .nav-btn.submit.ready:hover{background:#1a1208;border-color:var(--gold)}
  .nav-btn.submit:disabled{opacity:0.5;cursor:not-allowed}
  .nav-spin{width:13px;height:13px;border:2px solid rgba(200,169,106,0.25);border-top-color:var(--gold);border-radius:50%;animation:sp 0.7s linear infinite}

  /* Error */
  .err-bar{
    display:flex;align-items:center;gap:8px;
    background:var(--rm,rgba(122,30,30,0.07));border:1px solid var(--rbdr,rgba(122,30,30,0.2));
    color:var(--red);font-size:13px;font-weight:600;
    padding:11px 14px;border-radius:9px;
  }
`;
