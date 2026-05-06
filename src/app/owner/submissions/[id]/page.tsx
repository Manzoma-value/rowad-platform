"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
interface Option {
  id: string;
  text: string;
  order: number;
}
interface Question {
  id: string;
  type: "MCQ" | "TF" | "WRITTEN";
  text: string;
  correct_answer: string | null;
  order: number;
  options: Option[];
}
interface Answer {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean | null;
  question: Question;
}
interface Attempt {
  id: string;
  review_status: "PENDING" | "REVIEWED";
  score: number | null;
  total: number | null;
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  student: {
    id: string;
    profile: { full_name: string };
    school: { name: string } | null;
  };
  assessment: { title: string; questions: Question[] };
  answers: Answer[];
  assigned_school: { id: string; name: string } | null;
  reviewer: { full_name: string } | null;
}
interface School {
  id: string;
  name: string;
}

export default function OwnerSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [writtenGrades, setWrittenGrades] = useState<Record<string, boolean>>(
    {},
  );
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [assignedSchoolId, setAssignedSchoolId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    Promise.all([
      cachedFetch<{ attempt: Attempt }>(`/api/owner/submissions/${id}`, 30_000),
      cachedFetch<{ schools: School[] }>("/api/owner/schools", 60_000),
    ])
      .then(([aData, sData]) => {
        const a: Attempt = aData.attempt;
        setAttempt(a);
        setSchools(sData.schools ?? []);
        if (a) {
          const grades: Record<string, boolean> = {};
          a.answers.forEach((ans) => {
            if (ans.question.type === "WRITTEN" && ans.is_correct !== null)
              grades[ans.id] = ans.is_correct;
          });
          setWrittenGrades(grades);
          setReviewerNotes(a.reviewer_notes ?? "");
          setAssignedSchoolId(a.assigned_school?.id ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);
  async function handleSubmitReview() {
    if (!assignedSchoolId) {
      setSubmitError("يرجى تحديد المدرسة المراد التعيين إليها.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await fetch(`/api/owner/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          written_grades: writtenGrades,
          reviewer_notes: reviewerNotes,
          assigned_school_id: assignedSchoolId,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        setSubmitError(d.error ?? "فشل إرسال المراجعة.");
        return;
      }
      invalidateCache(`/api/owner/submissions/${id}`);
      invalidateCache("/api/owner/submissions");
      invalidateCache("/api/owner/stats");
      router.push("/owner/submissions");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="sr-load">
        <div className="sr-spin" />
        جارٍ تحميل الإجابة…<style>{css}</style>
      </div>
    );
  if (!attempt)
    return (
      <div className="sr-load">
        الإجابة غير موجودة.<style>{css}</style>
      </div>
    );

  const isReviewed = attempt.review_status === "REVIEWED";
  const writtenAnswers = attempt.answers.filter(
    (a) => a.question.type === "WRITTEN",
  );
  const autoAnswers = attempt.answers.filter(
    (a) => a.question.type !== "WRITTEN",
  );
  const autoCorrect = autoAnswers.filter((a) => a.is_correct === true).length;
  const writtenCorrect = Object.values(writtenGrades).filter(Boolean).length;
  const liveScore = autoCorrect + writtenCorrect;
  const pct = attempt.answers.length
    ? Math.round((liveScore / attempt.answers.length) * 100)
    : 0;

  return (
    <div className="sr-page" dir="rtl">
      {/* Header */}
      <div className="sr-header">
        <Link href="/owner/submissions" className="sr-back">
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          العودة إلى الإجابات
        </Link>
        <div className="sr-title-row">
          <div className="sr-avatar">
            {attempt.student.profile.full_name.charAt(0)}
          </div>
          <div className="sr-title-body">
            <h1 className="sr-title">{attempt.student.profile.full_name}</h1>
            <p className="sr-sub">
              {attempt.assessment.title}
              <span className="sr-sep"> · </span>
              {new Date(attempt.submitted_at).toLocaleDateString("ar-SA", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className={`sr-chip ${isReviewed ? "done" : "pending"}`}>
            {isReviewed ? "تمت المراجعة" : "في انتظار المراجعة"}
          </div>
        </div>
      </div>

      {/* Score banner */}
      {isReviewed && attempt.score !== null && (
        <div className="sr-score-banner">
          <div className="sr-score-main">
            <span className="sr-score-big">{attempt.score}</span>
            <span className="sr-score-sep">/</span>
            <span className="sr-score-total">{attempt.total}</span>
            <div className="sr-score-pct">
              {attempt.total
                ? Math.round((attempt.score / attempt.total) * 100)
                : 0}
              %
            </div>
          </div>
          {attempt.assigned_school && (
            <div className="sr-score-meta">
              <span className="sr-score-meta-label">المدرسة المعيّنة</span>
              <span className="sr-score-meta-val school">
                {attempt.assigned_school.name}
              </span>
            </div>
          )}
          {attempt.reviewer && (
            <div className="sr-score-meta">
              <span className="sr-score-meta-label">المراجِع</span>
              <span className="sr-score-meta-val">
                {attempt.reviewer.full_name}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="sr-body">
        {/* Answers */}
        <div className="sr-answers">
          <h2 className="sr-col-title">إجابات الطالب</h2>
          {attempt.answers.length === 0 && (
            <div className="sr-no-answers">لم يتم تقديم أي إجابات.</div>
          )}
          {attempt.assessment.questions.map((q, idx) => {
            const answer = attempt.answers.find((a) => a.question_id === q.id);
            if (!answer) return null;
            const correctDisplay =
              q.type === "TF"
                ? q.correct_answer === "true"
                  ? "صح"
                  : "خطأ"
                : q.correct_answer;
            return (
              <div key={q.id} className="sr-ans-card">
                <div className="sr-ans-head">
                  <div className="sr-q-num">س{idx + 1}</div>
                  <div className={`sr-q-type type-${q.type.toLowerCase()}`}>
                    {q.type === "MCQ"
                      ? "اختيار"
                      : q.type === "TF"
                        ? "صح/خطأ"
                        : "مكتوب"}
                  </div>
                  {q.type !== "WRITTEN" && answer.is_correct !== null && (
                    <div
                      className={`sr-result ${answer.is_correct ? "correct" : "wrong"}`}
                    >
                      {answer.is_correct ? "✓ صحيح" : "✗ خطأ"}
                    </div>
                  )}
                </div>
                <p className="sr-q-text">{q.text}</p>

                {q.type === "MCQ" && (
                  <div className="sr-mcq">
                    {q.options.map((opt) => {
                      const isStudent = answer.answer === opt.text;
                      const isCorrect = q.correct_answer === opt.text;
                      return (
                        <div
                          key={opt.id}
                          className={`sr-opt ${isStudent ? "student" : ""} ${isCorrect ? "correct" : ""}`}
                        >
                          <div className="sr-opt-indicator">
                            {isCorrect && (
                              <svg
                                width="9"
                                height="9"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {isStudent && !isCorrect && (
                              <svg
                                width="9"
                                height="9"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <span>{opt.text}</span>
                          {isStudent && (
                            <span className="sr-opt-tag">إجابة الطالب</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "TF" && (
                  <div className="sr-tf">
                    <div
                      className={`sr-tf-pill student ${answer.answer === q.correct_answer ? "correct" : "wrong"}`}
                    >
                      الطالب: {answer.answer === "true" ? "صح" : "خطأ"}
                    </div>
                    <div className="sr-tf-pill correct-ans">
                      الصحيح: {correctDisplay}
                    </div>
                  </div>
                )}

                {q.type === "WRITTEN" && (
                  <div className="sr-written">
                    <div className="sr-written-label">إجابة الطالب</div>
                    <div className="sr-written-box">{answer.answer}</div>
                    {!isReviewed && (
                      <div className="sr-grade-row">
                        <span className="sr-grade-label">تقييمك:</span>
                        <button
                          className={`sr-grade-btn correct-btn ${writtenGrades[answer.id] === true ? "sel" : ""}`}
                          onClick={() =>
                            setWrittenGrades((g) => ({
                              ...g,
                              [answer.id]: true,
                            }))
                          }
                        >
                          <svg
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          صحيح
                        </button>
                        <button
                          className={`sr-grade-btn wrong-btn ${writtenGrades[answer.id] === false ? "sel" : ""}`}
                          onClick={() =>
                            setWrittenGrades((g) => ({
                              ...g,
                              [answer.id]: false,
                            }))
                          }
                        >
                          <svg
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          خطأ
                        </button>
                      </div>
                    )}
                    {isReviewed && answer.is_correct !== null && (
                      <div
                        className={`sr-result ${answer.is_correct ? "correct" : "wrong"}`}
                        style={{ width: "fit-content", marginTop: 6 }}
                      >
                        {answer.is_correct ? "✓ صحيح" : "✗ خطأ"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Review panel */}
        <div className="sr-review-col">
          {!isReviewed ? (
            <div className="sr-panel">
              <h2 className="sr-col-title">المراجعة والتعيين</h2>
              <div className="sr-score-preview">
                <div className="sr-sp-head">
                  <span className="sr-sp-label">الدرجة الحالية</span>
                  <span className="sr-sp-val">
                    {liveScore} / {attempt.answers.length}
                  </span>
                </div>
                <div className="sr-sp-track">
                  <div className="sr-sp-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="sr-sp-foot">
                  <span className="sr-sp-pct">{pct}%</span>
                  {writtenAnswers.length > 0 && (
                    <span className="sr-sp-note">
                      {Object.keys(writtenGrades).length}/
                      {writtenAnswers.length} مكتوب تم تقييمه
                    </span>
                  )}
                </div>
              </div>
              <div className="sr-field">
                <label className="sr-field-label">
                  تعيين المدرسة <span className="sr-req">*</span>
                </label>
                <select
                  className="sr-select"
                  value={assignedSchoolId}
                  onChange={(e) => setAssignedSchoolId(e.target.value)}
                >
                  <option value="">اختر المدرسة…</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sr-field">
                <label className="sr-field-label">
                  ملاحظات <span className="sr-opt-label">(اختياري)</span>
                </label>
                <textarea
                  className="sr-textarea"
                  rows={4}
                  placeholder="أضف ملاحظاتك حول أداء الطالب…"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                />
              </div>
              {submitError && <div className="sr-error">{submitError}</div>}
              <button
                className="sr-submit-btn"
                onClick={handleSubmitReview}
                disabled={submitting || !assignedSchoolId}
              >
                {submitting ? (
                  <>
                    <div className="sr-btn-spin" />
                    جارٍ الإرسال…
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    إرسال المراجعة وتعيين المدرسة
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="sr-panel done">
              <div className="sr-done-head">
                <div className="sr-done-check">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="sr-col-title" style={{ marginBottom: 0 }}>
                  اكتملت المراجعة
                </h2>
              </div>
              <div className="sr-done-rows">
                {[
                  {
                    label: "المدرسة المعيّنة",
                    val: attempt.assigned_school?.name ?? "—",
                  },
                  {
                    label: "المراجِع",
                    val: attempt.reviewer?.full_name ?? "—",
                  },
                  attempt.reviewed_at
                    ? {
                        label: "تاريخ المراجعة",
                        val: new Date(attempt.reviewed_at).toLocaleDateString(
                          "ar-SA",
                          { month: "long", day: "numeric", year: "numeric" },
                        ),
                      }
                    : null,
                ]
                  .filter(Boolean)
                  .map((row, i) => (
                    <div key={i} className="sr-done-row">
                      <span className="sr-done-label">{row!.label}</span>
                      <span className="sr-done-val">{row!.val}</span>
                    </div>
                  ))}
                {attempt.reviewer_notes && (
                  <div className="sr-done-notes-wrap">
                    <span className="sr-done-label">الملاحظات</span>
                    <div className="sr-done-notes">
                      {attempt.reviewer_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
  :root{--gold:#C8A96A;--gold2:#E5B93C;--gold-muted:rgba(200,169,106,0.1);--gold-border:rgba(200,169,106,0.2);--black:#0B0B0C;--off-white:#F5F3EE;--text:#0B0B0C;--text2:#4a3f2f;--text3:#9a8a6a;--surface:#ffffff;--surface2:#faf8f4;--surface3:#f5f0e8;--border:#e8dfd0;--border2:#d8ccb8;--success:#1a6b3c;--success-bg:rgba(26,107,60,0.08);--warning:#9a6200;--warning-bg:rgba(154,98,0,0.08);--danger:#8b1a1a;--danger-bg:rgba(139,26,26,0.08);--radius:10px;--shadow-sm:0 1px 3px rgba(11,11,12,0.06);--shadow:0 4px 12px rgba(11,11,12,0.08);--shadow-md:0 8px 24px rgba(11,11,12,0.10)}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes spin{to{transform:rotate(360deg)}}

  .sr-page{display:flex;flex-direction:column;gap:22px;font-family:'Cairo',sans-serif}
  .sr-load{display:flex;align-items:center;gap:12px;height:220px;justify-content:center;color:var(--text3);font-size:14px;font-family:'Cairo',sans-serif}
  .sr-spin{width:20px;height:20px;border:2px solid var(--gold-border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}

  .sr-header{display:flex;flex-direction:column;gap:12px;padding-bottom:20px;border-bottom:1px solid var(--border)}
  .sr-back{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text3);text-decoration:none;font-weight:600;transition:color 0.15s}
  .sr-back:hover{color:var(--gold)}
  .sr-title-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .sr-avatar{width:46px;height:46px;border-radius:12px;flex-shrink:0;background:var(--black);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:var(--gold)}
  .sr-title-body{flex:1}
  .sr-title{font-size:20px;font-weight:800;color:var(--black);letter-spacing:-0.3px}
  .sr-sub{font-size:13px;color:var(--text3);margin-top:3px}
  .sr-sep{opacity:0.4}
  .sr-chip{font-size:11.5px;font-weight:700;padding:5px 14px;border-radius:20px;border:1px solid;white-space:nowrap}
  .sr-chip.pending{background:var(--warning-bg);color:var(--warning);border-color:rgba(154,98,0,0.2)}
  .sr-chip.done{background:var(--success-bg);color:var(--success);border-color:rgba(26,107,60,0.2)}

  .sr-score-banner{background:var(--black);border-radius:var(--radius);padding:20px 24px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;border:1px solid rgba(200,169,106,0.2)}
  .sr-score-main{display:flex;align-items:baseline;gap:5px}
  .sr-score-big{font-size:44px;font-weight:900;font-family:'IBM Plex Mono',monospace;color:var(--gold);letter-spacing:-2px;line-height:1}
  .sr-score-sep{font-size:28px;color:rgba(200,169,106,0.3);font-weight:300}
  .sr-score-total{font-size:28px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:rgba(200,169,106,0.5)}
  .sr-score-pct{font-size:16px;font-weight:800;color:var(--gold2);background:rgba(229,185,60,0.1);padding:5px 12px;border-radius:7px;margin-right:8px}
  .sr-score-meta{display:flex;flex-direction:column;gap:3px;padding-right:24px;border-right:1px solid rgba(200,169,106,0.15)}
  .sr-score-meta-label{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(200,169,106,0.4);font-weight:700}
  .sr-score-meta-val{font-size:14px;font-weight:700;color:white}
  .sr-score-meta-val.school{color:var(--gold2)}

  .sr-body{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}
  @media(max-width:900px){.sr-body{grid-template-columns:1fr}}

  .sr-answers,.sr-review-col{display:flex;flex-direction:column;gap:12px}
  .sr-col-title{font-size:14px;font-weight:800;color:var(--black);margin-bottom:2px}
  .sr-no-answers{color:var(--text3);font-size:13px;text-align:center;padding:32px}

  .sr-ans-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow-sm)}
  .sr-ans-card:hover{border-color:var(--gold-border)}
  .sr-ans-head{display:flex;align-items:center;gap:8px}
  .sr-q-num{font-size:11px;font-weight:800;color:var(--gold);font-family:'IBM Plex Mono',monospace;background:var(--gold-muted);padding:3px 8px;border-radius:5px;border:1px solid var(--gold-border)}
  .sr-q-type{font-size:10px;font-weight:700;padding:2px 9px;border-radius:5px}
  .sr-q-type.type-mcq{background:var(--gold-muted);color:var(--gold)}
  .sr-q-type.type-tf{background:rgba(229,185,60,0.1);color:var(--gold2)}
  .sr-q-type.type-written{background:var(--warning-bg);color:var(--warning)}
  .sr-result{display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:5px}
  .sr-result.correct{background:var(--success-bg);color:var(--success)}
  .sr-result.wrong{background:var(--danger-bg);color:var(--danger)}
  .sr-q-text{font-size:14px;color:var(--text);line-height:1.65;font-weight:500}

  .sr-mcq{display:flex;flex-direction:column;gap:6px}
  .sr-opt{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:8px;font-size:13px;background:var(--surface2);border:1px solid var(--border);color:var(--text2)}
  .sr-opt.student{border-color:rgba(139,26,26,0.3);background:var(--danger-bg);color:var(--text)}
  .sr-opt.correct{border-color:rgba(26,107,60,0.3);background:var(--success-bg);color:var(--success);font-weight:700}
  .sr-opt.student.correct{border-color:rgba(26,107,60,0.5)}
  .sr-opt-indicator{width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sr-opt-tag{margin-right:auto;font-size:10px;color:var(--text3);font-style:italic;background:var(--surface);border:1px solid var(--border);padding:1px 7px;border-radius:4px}

  .sr-tf{display:flex;gap:9px}
  .sr-tf-pill{font-size:13px;font-weight:700;padding:6px 14px;border-radius:7px;border:1px solid}
  .sr-tf-pill.student.correct{background:var(--success-bg);color:var(--success);border-color:rgba(26,107,60,0.3)}
  .sr-tf-pill.student.wrong{background:var(--danger-bg);color:var(--danger);border-color:rgba(139,26,26,0.3)}
  .sr-tf-pill.correct-ans{background:var(--success-bg);color:var(--success);border-color:rgba(26,107,60,0.2);opacity:0.8}

  .sr-written{display:flex;flex-direction:column;gap:9px}
  .sr-written-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text3)}
  .sr-written-box{background:var(--surface2);border:1px solid var(--border);border-right:3px solid var(--gold);border-radius:8px;padding:13px 16px;font-size:13.5px;color:var(--text);line-height:1.7;white-space:pre-wrap;min-height:64px;font-weight:500}
  .sr-grade-row{display:flex;align-items:center;gap:10px}
  .sr-grade-label{font-size:12.5px;color:var(--text2);font-weight:700}
  .sr-grade-btn{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--border2);background:var(--surface3);color:var(--text2);transition:all 0.15s;font-family:'Cairo',sans-serif}
  .sr-grade-btn.correct-btn.sel{background:var(--success-bg);border-color:rgba(26,107,60,0.4);color:var(--success)}
  .sr-grade-btn.wrong-btn.sel{background:var(--danger-bg);border-color:rgba(139,26,26,0.4);color:var(--danger)}

  .sr-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:18px;position:sticky;top:76px;box-shadow:var(--shadow)}
  .sr-panel.done{border-top:3px solid var(--gold)}

  .sr-score-preview{background:var(--surface2);border:1px solid var(--gold-border);border-radius:9px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
  .sr-sp-head{display:flex;justify-content:space-between;align-items:center}
  .sr-sp-label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);font-weight:700}
  .sr-sp-val{font-size:20px;font-weight:800;font-family:'IBM Plex Mono',monospace;color:var(--gold)}
  .sr-sp-track{height:5px;background:var(--surface3);border-radius:99px;overflow:hidden}
  .sr-sp-fill{height:100%;background:var(--gold);border-radius:99px;transition:width 0.4s ease}
  .sr-sp-foot{display:flex;justify-content:space-between;align-items:center}
  .sr-sp-pct{font-size:12px;font-weight:700;color:var(--gold)}
  .sr-sp-note{font-size:11px;color:var(--text3);font-weight:500}

  .sr-field{display:flex;flex-direction:column;gap:7px}
  .sr-field-label{font-size:12px;font-weight:700;color:var(--text2)}
  .sr-req{color:var(--danger)}
  .sr-opt-label{color:var(--text3);font-weight:500;font-size:11px}
  .sr-select{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:10px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;outline:none;width:100%;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s}
  .sr-select:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-muted)}
  .sr-textarea{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:11px 13px;font-size:13px;font-family:'Cairo',sans-serif;outline:none;width:100%;resize:vertical;line-height:1.6;transition:border-color 0.15s,box-shadow 0.15s}
  .sr-textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-muted)}
  .sr-error{background:var(--danger-bg);border:1px solid rgba(139,26,26,0.2);color:var(--danger);font-size:12.5px;padding:10px 13px;border-radius:8px;font-weight:600}
  .sr-submit-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--black);color:var(--gold);padding:12px 18px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;border:1px solid rgba(200,169,106,0.3);transition:all 0.18s;font-family:'Cairo',sans-serif;width:100%}
  .sr-submit-btn:hover:not(:disabled){background:rgba(200,169,106,0.1);border-color:var(--gold)}
  .sr-submit-btn:disabled{opacity:0.4;cursor:not-allowed}
  .sr-btn-spin{width:14px;height:14px;border:2px solid rgba(200,169,106,0.3);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}

  .sr-done-head{display:flex;align-items:center;gap:12px}
  .sr-done-check{width:36px;height:36px;border-radius:9px;flex-shrink:0;background:var(--gold-muted);color:var(--gold);display:flex;align-items:center;justify-content:center;border:1px solid var(--gold-border)}
  .sr-done-rows{display:flex;flex-direction:column;gap:12px}
  .sr-done-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid var(--border)}
  .sr-done-row:last-child{border-bottom:none;padding-bottom:0}
  .sr-done-label{font-size:10.5px;text-transform:uppercase;letter-spacing:0.4px;color:var(--text3);font-weight:700}
  .sr-done-val{font-size:13.5px;font-weight:700;color:var(--black)}
  .sr-done-notes-wrap{display:flex;flex-direction:column;gap:8px}
  .sr-done-notes{font-size:13px;color:var(--text2);line-height:1.65;background:var(--surface2);border-radius:7px;padding:11px 13px;border:1px solid var(--border)}
`;
