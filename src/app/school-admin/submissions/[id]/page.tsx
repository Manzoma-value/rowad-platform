// school-admin/submissions/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
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
interface ClassItem {
  id: string;
  name: string;
}
interface Attempt {
  id: string;
  review_status: "PENDING" | "REVIEWED";
  score: number | null;
  total: number | null;
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  student: { profile: { full_name: string } };
  assessment: { title: string; questions: Question[] };
  answers: Answer[];
  assigned_class: { id: string; name: string } | null;
  reviewer: { full_name: string } | null;
}

export default function SchoolAdminSubmissionDetailPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [writtenGrades, setWrittenGrades] = useState<Record<string, boolean>>(
    {},
  );
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [assignedClassId, setAssignedClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      cachedFetch<{ attempt: Attempt }>(
        `/api/school-admin/submissions/${id}`,
        15_000,
      ),
      cachedFetch<{ classes: ClassItem[] }>(
        "/api/school-admin/classes",
        60_000,
      ),
    ])
      .then(([attemptData, classData]) => {
        const a: Attempt = attemptData.attempt;
        setAttempt(a);
        setClasses(classData.classes ?? []);
        if (a) {
          const grades: Record<string, boolean> = {};
          a.answers.forEach((ans) => {
            if (ans.question.type === "WRITTEN" && ans.is_correct !== null)
              grades[ans.id] = ans.is_correct;
          });
          setWrittenGrades(grades);
          setReviewerNotes(a.reviewer_notes ?? "");
          setAssignedClassId(a.assigned_class?.id ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    if (!assignedClassId) {
      setError(tr.pleaseChooseClass);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch(`/api/school-admin/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          written_grades: writtenGrades,
          reviewer_notes: reviewerNotes,
          assigned_class_id: assignedClassId,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        setError(d.error ?? tr.failedSubmit);
        return;
      }
      invalidateCache(`/api/school-admin/submissions/${id}`);
      invalidateCache("/api/school-admin/submissions");
      router.push("/school-admin/submissions");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="sr-loading">
        <div className="spin" />
        {tr.loading}
      </div>
    );
  if (!attempt) return <div className="sr-loading">{tr.notFound}</div>;

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

  return (
    <div className="sr-page" dir={dir}>
      <div className="sr-header">
        <Link href="/school-admin/submissions" className="back-link">
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ transform: lang === "ar" ? "none" : "rotate(180deg)" }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          {tr.backToResults}
        </Link>
        <div className="sr-title-row">
          <div className="sr-avatar">
            {attempt.student.profile.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="sr-title">{attempt.student.profile.full_name}</h1>
            <p className="sr-sub">
              {attempt.assessment.title} ·{" "}
              {new Date(attempt.submitted_at).toLocaleDateString(
                lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL",
                { month: "long", day: "numeric", year: "numeric" },
              )}
            </p>
          </div>
          <div className={`status-chip ${isReviewed ? "reviewed" : "pending"}`}>
            {isReviewed ? tr.chipReviewed : tr.chipPending}
          </div>
        </div>
      </div>

      {isReviewed && attempt.score !== null && (
        <div className="score-banner">
          <div className="score-big">
            <span className="score-n">{attempt.score}</span>
            <span className="score-sep">/</span>
            <span className="score-t">{attempt.total}</span>
          </div>
          <div>
            <div className="score-label">{tr.finalScore}</div>
            <div className="score-pct">
              {attempt.total
                ? Math.round((attempt.score / attempt.total) * 100)
                : 0}
              %
            </div>
          </div>
          {attempt.assigned_class && (
            <div className="score-class">
              <div className="score-label">{tr.assignedClass}</div>
              <div className="score-class-name">
                {attempt.assigned_class.name}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="sr-body">
        <div className="answers-col">
          <h2 className="col-title">{tr.studentAnswers}</h2>
          {attempt.assessment.questions.map((q, idx) => {
            const answer = attempt.answers.find((a) => a.question_id === q.id);
            if (!answer) return null;
            return (
              <div key={q.id} className="a-card">
                <div className="a-header">
                  <span className="q-num">{idx + 1}</span>
                  <span className={`q-type-badge t-${q.type.toLowerCase()}`}>
                    {q.type}
                  </span>
                  {q.type !== "WRITTEN" && answer.is_correct !== null && (
                    <span
                      className={`result-chip ${answer.is_correct ? "correct" : "wrong"}`}
                    >
                      {answer.is_correct ? tr.correct : tr.wrong}
                    </span>
                  )}
                </div>
                <div className="q-text">{q.text}</div>

                {q.type === "MCQ" && (
                  <div className="mcq-opts">
                    {q.options.map((opt) => {
                      const isStudent = answer.answer === opt.text;
                      const isCorrect = q.correct_answer === opt.text;
                      return (
                        <div
                          key={opt.id}
                          className={`mcq-opt ${isStudent ? "student" : ""} ${isCorrect ? "correct" : ""}`}
                        >
                          <div className="opt-ind">
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
                            <span className="student-tag">
                              {tr.studentAnswerLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "TF" && (
                  <div className="tf-row">
                    <span
                      className={`tf-pill ${answer.answer === q.correct_answer ? "correct" : "wrong"}`}
                    >
                      {tr.studentAnswerLabel}:{" "}
                      {answer.answer === "true" ? tr.trueLabel : tr.falseLabel}
                    </span>
                    <span className="tf-pill correct-ans">
                      {tr.correctAnswerLabel}{" "}
                      {q.correct_answer === "true"
                        ? tr.trueLabel
                        : tr.falseLabel}
                    </span>
                  </div>
                )}

                {q.type === "WRITTEN" && (
                  <div className="written-section">
                    <div className="written-box">{answer.answer}</div>
                    {!isReviewed && (
                      <div className="grade-row">
                        <span className="grade-label">{tr.gradingLabel}</span>
                        <button
                          className={`grade-btn g-correct ${writtenGrades[answer.id] === true ? "sel" : ""}`}
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
                          {tr.trueLabel}
                        </button>
                        <button
                          className={`grade-btn g-wrong ${writtenGrades[answer.id] === false ? "sel" : ""}`}
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
                          {tr.falseLabel}
                        </button>
                      </div>
                    )}
                    {isReviewed && answer.is_correct !== null && (
                      <span
                        className={`result-chip ${answer.is_correct ? "correct" : "wrong"}`}
                        style={{ width: "fit-content" }}
                      >
                        {answer.is_correct ? tr.correct : tr.wrong}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="review-col">
          {!isReviewed ? (
            <div className="review-panel">
              <h2 className="col-title">{tr.reviewAndAssign}</h2>
              <div className="score-preview">
                <div className="sp-label">{tr.expectedScore}</div>
                <div className="sp-val">
                  {liveScore} / {attempt.answers.length}
                </div>
                <div className="sp-bar-wrap">
                  <div
                    className="sp-bar"
                    style={{
                      width: attempt.answers.length
                        ? `${(liveScore / attempt.answers.length) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                {writtenAnswers.length > 0 && (
                  <div className="sp-note">
                    {Object.keys(writtenGrades).length}/{writtenAnswers.length}{" "}
                    {tr.writtenGradedCount}
                  </div>
                )}
              </div>

              <div className="review-field">
                <label className="review-label">
                  {tr.assignToClassRequired} <span className="req">*</span>
                </label>
                <select
                  className="review-select"
                  value={assignedClassId}
                  onChange={(e) => setAssignedClassId(e.target.value)}
                  dir={dir}
                >
                  <option value="">{tr.chooseClass}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="review-field">
                <label className="review-label">
                  {tr.notes} <span className="opt-tag">({tr.optional})</span>
                </label>
                <textarea
                  className="review-textarea"
                  placeholder={tr.notesPlaceholder}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  rows={4}
                  dir={dir}
                />
              </div>

              {error && <div className="review-error">{error}</div>}

              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={submitting || !assignedClassId}
              >
                {submitting ? (
                  <>
                    <div className="btn-spin" />
                    {tr.savingReview}
                  </>
                ) : (
                  <>{tr.confirmReview}</>
                )}
              </button>
            </div>
          ) : (
            <div className="review-panel done">
              <h2 className="col-title">{tr.reviewDone}</h2>
              <div className="done-icon">✅</div>
              <div className="done-rows">
                <div className="done-row">
                  <span className="done-label">{tr.assignedClassLabel}</span>
                  <span className="done-val">
                    {attempt.assigned_class?.name ?? "—"}
                  </span>
                </div>
                <div className="done-row">
                  <span className="done-label">{tr.reviewedBy}</span>
                  <span className="done-val">
                    {attempt.reviewer?.full_name ?? "—"}
                  </span>
                </div>
                {attempt.reviewed_at && (
                  <div className="done-row">
                    <span className="done-label">{tr.reviewDate}</span>
                    <span className="done-val">
                      {new Date(attempt.reviewed_at).toLocaleDateString(
                        lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL",
                      )}
                    </span>
                  </div>
                )}
                {attempt.reviewer_notes && (
                  <div className="done-notes">
                    <div className="done-label">{tr.notes}</div>
                    <div className="notes-text">{attempt.reviewer_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sr-page { display: flex; flex-direction: column; gap: 20px; }
        .sr-loading { display: flex; align-items: center; gap: 10px; height: 180px; justify-content: center; color: var(--text2); font-size: 14px; }
        .spin { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: sp 0.7s linear infinite; }
        @keyframes sp { to { transform: rotate(360deg); } }

        .back-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text2); text-decoration: none; font-weight: 600; }
        .back-link:hover { color: var(--accent); }
        .sr-header { display: flex; flex-direction: column; gap: 10px; }
        .sr-title-row { display: flex; align-items: center; gap: 13px; flex-wrap: wrap; }
        .sr-avatar { width: 42px; height: 42px; border-radius: 11px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; color: white; flex-shrink: 0; }
        .sr-title { font-size: 19px; font-weight: 800; color: var(--text); }
        .sr-sub { font-size: 12px; color: var(--text2); margin-top: 2px; }
        .status-chip { font-size: 11.5px; font-weight: 700; padding: 4px 11px; border-radius: 7px; margin-inline-start: auto; }
        .status-chip.pending { background: rgba(245,158,11,0.1); color: #b45309; border: 1px solid rgba(245,158,11,0.2); }
        .status-chip.reviewed { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }

        .score-banner { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .score-big { display: flex; align-items: baseline; gap: 3px; }
        .score-n { font-size: 38px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--accent); letter-spacing: -2px; }
        .score-sep { font-size: 24px; color: var(--text3); }
        .score-t { font-size: 24px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--text2); }
        .score-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text3); font-weight: 700; }
        .score-pct { font-size: 18px; font-weight: 800; color: var(--text); }
        .score-class { border-inline-start: 1px solid var(--border); padding-inline-start: 20px; }
        .score-class-name { font-size: 15px; font-weight: 700; color: var(--success); margin-top: 2px; }

        .sr-body { display: grid; grid-template-columns: 1fr 300px; gap: 18px; align-items: start; }
        @media (max-width: 860px) { .sr-body { grid-template-columns: 1fr; } }
        .answers-col, .review-col { display: flex; flex-direction: column; gap: 10px; }
        .col-title { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 2px; }

        .a-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 15px; display: flex; flex-direction: column; gap: 9px; }
        .a-header { display: flex; align-items: center; gap: 7px; }
        .q-num { font-size: 10px; font-weight: 700; color: var(--text3); background: var(--surface2); padding: 2px 7px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
        .q-type-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
        .q-type-badge.t-mcq { background: rgba(37,99,235,0.1); color: #2563eb; }
        .q-type-badge.t-tf { background: rgba(16,185,129,0.1); color: #10b981; }
        .q-type-badge.t-written { background: rgba(245,158,11,0.1); color: #b45309; }
        .result-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 5px; }
        .result-chip.correct { background: rgba(16,185,129,0.1); color: #10b981; }
        .result-chip.wrong { background: rgba(239,68,68,0.1); color: #ef4444; }
        .q-text { font-size: 13.5px; color: var(--text); line-height: 1.55; }

        .mcq-opts { display: flex; flex-direction: column; gap: 5px; }
        .mcq-opt { display: flex; align-items: center; gap: 8px; padding: 7px 11px; border-radius: 7px; font-size: 12.5px; background: var(--surface2); border: 1px solid var(--border); color: var(--text2); }
        .mcq-opt.student { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.05); color: var(--text); }
        .mcq-opt.correct { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.06); color: #10b981; }
        .mcq-opt.student.correct { border-color: rgba(16,185,129,0.45); background: rgba(16,185,129,0.1); }
        .opt-ind { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .student-tag { margin-inline-start: auto; font-size: 9.5px; color: var(--text3); font-style: italic; }

        .tf-row { display: flex; gap: 7px; }
        .tf-pill { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 7px; }
        .tf-pill.correct { background: rgba(16,185,129,0.1); color: #10b981; }
        .tf-pill.wrong { background: rgba(239,68,68,0.1); color: #ef4444; }
        .tf-pill.correct-ans { background: rgba(16,185,129,0.06); color: #10b981; border: 1px dashed rgba(16,185,129,0.3); }

        .written-section { display: flex; flex-direction: column; gap: 8px; }
        .written-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 11px 13px; font-size: 13px; color: var(--text); line-height: 1.6; min-height: 50px; white-space: pre-wrap; }
        .grade-row { display: flex; align-items: center; gap: 9px; }
        .grade-label { font-size: 12px; color: var(--text2); font-weight: 600; }
        .grade-btn { display: flex; align-items: center; gap: 5px; padding: 5px 13px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1.5px solid var(--border); background: var(--surface2); color: var(--text2); transition: all 0.15s; font-family: 'Tajawal', sans-serif; }
        .grade-btn.g-correct.sel { background: rgba(16,185,129,0.1); border-color: #10b981; color: #10b981; }
        .grade-btn.g-wrong.sel { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }

        .review-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 70px; }
        .review-panel.done { border-color: rgba(16,185,129,0.3); }

        .score-preview { background: var(--surface2); border-radius: 9px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .sp-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text3); font-weight: 700; }
        .sp-val { font-size: 20px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--accent); }
        .sp-bar-wrap { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
        .sp-bar { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.4s ease; }
        .sp-note { font-size: 11px; color: var(--text3); }

        .review-field { display: flex; flex-direction: column; gap: 6px; }
        .review-label { font-size: 12px; font-weight: 700; color: var(--text2); }
        .req { color: var(--danger); }
        .opt-tag { color: var(--text3); font-weight: 400; }
        .review-select { background: var(--surface2); border: 1.5px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 11px; font-size: 13px; font-family: 'Tajawal', sans-serif; outline: none; width: 100%; cursor: pointer; }
        .review-select:focus { border-color: var(--accent); }
        .review-textarea { background: var(--surface2); border: 1.5px solid var(--border); color: var(--text); border-radius: 8px; padding: 9px 11px; font-size: 12.5px; font-family: 'Tajawal', sans-serif; outline: none; width: 100%; resize: vertical; line-height: 1.5; }
        .review-textarea:focus { border-color: var(--accent); }
        .review-error { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); color: #dc2626; font-size: 12px; padding: 8px 11px; border-radius: 7px; }

        .submit-btn { display: flex; align-items: center; justify-content: center; gap: 7px; background: var(--accent); color: white; padding: 11px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: opacity 0.15s; font-family: 'Tajawal', sans-serif; width: 100%; }
        .submit-btn:hover:not(:disabled) { opacity: 0.87; }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-spin { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: sp 0.7s linear infinite; }

        .done-icon { font-size: 34px; text-align: center; }
        .done-rows { display: flex; flex-direction: column; gap: 9px; }
        .done-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .done-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text3); font-weight: 700; }
        .done-val { font-size: 13px; font-weight: 700; color: var(--text); }
        .done-notes { display: flex; flex-direction: column; gap: 5px; }
        .notes-text { font-size: 12.5px; color: var(--text2); line-height: 1.55; font-style: italic; background: var(--surface2); border-radius: 7px; padding: 9px; }
      `}</style>
    </div>
  );
}
