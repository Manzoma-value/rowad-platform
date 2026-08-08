"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  FileText,
  Search,
  X,
  XCircle,
} from "lucide-react";
import MandalaLoader from "@/components/MandalaLoader";

const T = {
  ar: {
    title: "نتائج الفيديو ومراجعة الإجابات",
    subtitle: "تابع المشاهدة، راجع الإجابات الكتابية، وصدّر تقريراً كاملاً.",
    teachers: "المشرفون",
    watched: "شاهدوا",
    completed: "أكملوا الأسئلة",
    pending: "بانتظار التقييم",
    all: "كل النتائج",
    pendingOnly: "تحتاج مراجعة",
    search: "ابحث باسم المشرف أو البريد...",
    export: "تصدير التقرير",
    notWatched: "لم يشاهد بعد",
    watchedLabel: "بدأ المشاهدة",
    finishedWatch: "شاهد الفيديو كاملاً",
    score: "النتيجة",
    noAttempt: "لم يُجب بعد",
    answers: "الإجابات",
    correct: "صحيحة",
    wrong: "غير صحيحة",
    written: "إجابة كتابية",
    awaiting: "بانتظار مراجعتك",
    feedback: "ملاحظات للمشرف (اختياري)",
    feedbackPh: "اكتب ملاحظة واضحة تساعد المشرف...",
    markCorrect: "اعتماد كإجابة صحيحة",
    markWrong: "اعتماد كإجابة غير صحيحة",
    saving: "جارٍ الحفظ...",
    noTeachers: "لا توجد نتائج مطابقة حتى الآن.",
    error: "تعذر تحميل النتائج.",
    gradeError: "تعذر حفظ التقييم. حاول مرة أخرى.",
    close: "إغلاق",
  },
  sq: {
    title: "Rezultatet dhe vlerësimi i përgjigjeve",
    subtitle: "Ndiq shikimin, vlerëso përgjigjet me shkrim dhe eksporto raportin.",
    teachers: "Edukator",
    watched: "E panë",
    completed: "Përfunduan pyetjet",
    pending: "Në pritje",
    all: "Të gjitha",
    pendingOnly: "Për vlerësim",
    search: "Kërko emrin ose emailin...",
    export: "Eksporto raportin",
    notWatched: "Ende pa e parë",
    watchedLabel: "E ka nisur",
    finishedWatch: "E ka parë të plotë",
    score: "Rezultati",
    noAttempt: "Ende pa përgjigje",
    answers: "Përgjigjet",
    correct: "Saktë",
    wrong: "Gabim",
    written: "Përgjigje me shkrim",
    awaiting: "Në pritje të vlerësimit",
    feedback: "Koment për edukatorin (opsional)",
    feedbackPh: "Shkruaj një koment të qartë...",
    markCorrect: "Vlerëso si të saktë",
    markWrong: "Vlerëso si të gabuar",
    saving: "Duke ruajtur...",
    noTeachers: "Nuk ka rezultate që përputhen.",
    error: "Rezultatet nuk u ngarkuan.",
    gradeError: "Vlerësimi nuk u ruajt. Provo përsëri.",
    close: "Mbyll",
  },
} as const;

type Answer = {
  id: string;
  question_id: string;
  question_text: string;
  question_type: "MCQ" | "TF" | "TEXT";
  answer: string;
  is_correct: boolean;
  grading_status: "AUTO_GRADED" | "PENDING_REVIEW" | "GRADED";
  feedback: string | null;
  grader_name: string | null;
  answered_at: string;
};

type ResultRow = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  viewed: boolean;
  watch_completed_at: string | null;
  score: number | null;
  total: number;
  quiz_completed_at: string | null;
  answers: Answer[];
};

type Summary = {
  total_teachers: number;
  viewed: number;
  completed: number;
  pending_review: number;
};

export function VideoResultsModal({
  workshopId,
  videoId,
  videoTitle,
  lang,
  onClose,
}: {
  workshopId: string;
  videoId: string;
  videoTitle: string;
  lang: "ar" | "sq";
  onClose: () => void;
}) {
  const t = T[lang];
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/school-admin/workshops/${workshopId}/videos/${videoId}/results`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setRows(data.teachers ?? []);
      setSummary(data.summary ?? null);
      setError(false);
    } catch {
      setError(true);
    }
  }, [videoId, workshopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (rows ?? []).filter((row) => {
      const matchesSearch = !needle
        || row.full_name.toLocaleLowerCase().includes(needle)
        || row.email?.toLocaleLowerCase().includes(needle);
      const matchesPending = !pendingOnly
        || row.answers.some((answer) => answer.grading_status === "PENDING_REVIEW");
      return matchesSearch && matchesPending;
    });
  }, [pendingOnly, query, rows]);

  async function grade(answer: Answer, isCorrect: boolean) {
    setSaving(answer.id);
    setGradeError(null);
    try {
      const response = await fetch(
        `/api/school-admin/workshops/videos/answers/${answer.id}/grade`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_correct: isCorrect,
            feedback: feedback[answer.id] ?? answer.feedback ?? "",
          }),
        },
      );
      if (!response.ok) throw new Error("failed");
      await load();
    } catch {
      setGradeError(answer.id);
    } finally {
      setSaving(null);
    }
  }

  const reportUrl = `/api/school-admin/workshops/${workshopId}/videos/${videoId}/results?format=csv`;

  return createPortal(
    <div
      className="vrm-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="vrm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vrm-title"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <header>
          <div>
            <span><FileText size={15} />{videoTitle}</span>
            <h3 id="vrm-title">{t.title}</h3>
            <p>{t.subtitle}</p>
          </div>
          <button onClick={onClose} aria-label={t.close}><X size={19} /></button>
        </header>

        <div className="vrm-body">
          {summary && (
            <div className="vrm-summary">
              <div><strong>{summary.total_teachers}</strong><span>{t.teachers}</span></div>
              <div><strong>{summary.viewed}</strong><span>{t.watched}</span></div>
              <div><strong>{summary.completed}</strong><span>{t.completed}</span></div>
              <div className={summary.pending_review ? "attention" : ""}>
                <strong>{summary.pending_review}</strong><span>{t.pending}</span>
              </div>
            </div>
          )}

          <div className="vrm-toolbar">
            <label>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            </label>
            <div className="vrm-tabs">
              <button className={!pendingOnly ? "active" : ""} onClick={() => setPendingOnly(false)}>{t.all}</button>
              <button className={pendingOnly ? "active" : ""} onClick={() => setPendingOnly(true)}>{t.pendingOnly}</button>
            </div>
            <a href={reportUrl} className="vrm-export"><Download size={15} />{t.export}</a>
          </div>

          {error ? (
            <div className="vrm-empty">{t.error}</div>
          ) : !rows ? (
            <MandalaLoader />
          ) : filteredRows.length === 0 ? (
            <div className="vrm-empty">{t.noTeachers}</div>
          ) : (
            <div className="vrm-list">
              {filteredRows.map((row) => {
                const pendingCount = row.answers.filter((answer) => answer.grading_status === "PENDING_REVIEW").length;
                const isOpen = expanded === row.teacher_id;
                return (
                  <article key={row.teacher_id} className={`vrm-row${pendingCount ? " needs-review" : ""}`}>
                    <button
                      className="vrm-row-main"
                      disabled={!row.answers.length}
                      onClick={() => setExpanded((current) => current === row.teacher_id ? null : row.teacher_id)}
                    >
                      <div className="vrm-avatar">{row.full_name.trim().charAt(0).toUpperCase()}</div>
                      <div className="vrm-teacher">
                        <strong>{row.full_name}</strong>
                        {row.email && <small dir="ltr">{row.email}</small>}
                      </div>
                      <div className={`vrm-watch${row.viewed ? " yes" : ""}`}>
                        {row.viewed ? <Eye size={15} /> : <EyeOff size={15} />}
                        <span>{row.viewed ? (row.watch_completed_at ? t.finishedWatch : t.watchedLabel) : t.notWatched}</span>
                      </div>
                      <div className="vrm-score">
                        <small>{t.score}</small>
                        {row.score === null ? <span>{t.noAttempt}</span> : <strong>{row.score}/{row.total}</strong>}
                      </div>
                      {pendingCount > 0 && <span className="vrm-pending">{pendingCount} {t.pending}</span>}
                      <span className="vrm-chevron">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                    </button>

                    {isOpen && (
                      <div className="vrm-answers">
                        <h4>{t.answers}</h4>
                        {row.answers.map((answer) => {
                          const isPending = answer.grading_status === "PENDING_REVIEW";
                          return (
                            <section key={answer.id} className={`vrm-answer${isPending ? " pending" : answer.is_correct ? " correct" : " wrong"}`}>
                              <div className="vrm-answer-icon">
                                {isPending ? <FileText size={17} /> : answer.is_correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                              </div>
                              <div className="vrm-answer-content">
                                <div className="vrm-answer-head">
                                  <p>{answer.question_text}</p>
                                  <span>{isPending ? t.awaiting : answer.is_correct ? t.correct : t.wrong}</span>
                                </div>
                                <blockquote dir="auto">{answer.answer}</blockquote>
                                {answer.feedback && !isPending && <p className="vrm-feedback-saved">{answer.feedback}</p>}
                                {answer.question_type === "TEXT" && isPending && (
                                  <div className="vrm-grade">
                                    <label>
                                      <span>{t.feedback}</span>
                                      <textarea
                                        dir="auto"
                                        rows={2}
                                        value={feedback[answer.id] ?? ""}
                                        onChange={(event) => setFeedback((current) => ({ ...current, [answer.id]: event.target.value }))}
                                        placeholder={t.feedbackPh}
                                      />
                                    </label>
                                    <div>
                                      <button className="correct" disabled={saving === answer.id} onClick={() => void grade(answer, true)}>
                                        <CheckCircle2 size={15} />{saving === answer.id ? t.saving : t.markCorrect}
                                      </button>
                                      <button className="wrong" disabled={saving === answer.id} onClick={() => void grade(answer, false)}>
                                        <XCircle size={15} />{saving === answer.id ? t.saving : t.markWrong}
                                      </button>
                                    </div>
                                    {gradeError === answer.id && <p role="alert">{t.gradeError}</p>}
                                  </div>
                                )}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{styles}</style>
    </div>,
    document.body,
  );
}

const styles = `
.vrm-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:clamp(10px,2vw,24px);background:rgba(26,26,26,.68);backdrop-filter:blur(10px);font-family:'Cairo',sans-serif}
.vrm-modal{width:min(1120px,100%);height:min(820px,calc(100dvh - 32px));display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(217,201,176,.5);border-radius:24px;background:#F7F3EB;box-shadow:0 34px 110px rgba(26,26,26,.42)}
.vrm-modal>header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:19px 22px;background:linear-gradient(125deg,#250B12,#4A0E1C 62%,#6B1E2D);color:#F7F3EB}
.vrm-modal>header>div>span{display:flex;align-items:center;gap:7px;color:#D9C9B0;font-size:10px;font-weight:900}.vrm-modal>header h3{margin:4px 0 2px;font-size:clamp(18px,2vw,23px)}.vrm-modal>header p{margin:0;color:rgba(247,243,235,.72);font-size:11px}
.vrm-modal>header button{width:40px;height:40px;display:grid;place-items:center;flex:none;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.vrm-body{min-height:0;flex:1;overflow:auto;padding:18px 20px}
.vrm-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.vrm-summary>div{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;border:1px solid #E5E0D5;border-radius:14px;background:#fff}.vrm-summary strong{font-size:22px;color:#32101A}.vrm-summary span{font-size:10.5px;font-weight:900;color:#796A62}.vrm-summary .attention{border-color:rgba(107,30,45,.25);background:rgba(107,30,45,.06)}.vrm-summary .attention strong,.vrm-summary .attention span{color:#6B1E2D}
.vrm-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:center;margin-bottom:14px}.vrm-toolbar>label{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid #D9C9B0;border-radius:12px;background:#fff;color:#8C8274}.vrm-toolbar input{width:100%;min-width:0;border:0;outline:0;background:transparent;font:700 11.5px 'Cairo',sans-serif;color:#32101A}.vrm-tabs{display:flex;padding:3px;border:1px solid #D9C9B0;border-radius:12px;background:#fff}.vrm-tabs button{min-height:36px;border:0;border-radius:9px;background:transparent;padding:0 13px;font:800 10.5px 'Cairo',sans-serif;color:#796A62;cursor:pointer}.vrm-tabs button.active{background:#6B1E2D;color:#fff}.vrm-export{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;background:#1A1A1A;padding:0 14px;color:#F7F3EB;text-decoration:none;font-size:10.5px;font-weight:900}
.vrm-empty{display:grid;place-items:center;min-height:220px;color:#8C8274;font-size:13px;font-weight:800}.vrm-list{display:flex;flex-direction:column;gap:9px}.vrm-row{overflow:hidden;border:1px solid #E5E0D5;border-radius:15px;background:#fff}.vrm-row.needs-review{border-color:rgba(107,30,45,.26);box-shadow:0 6px 22px rgba(107,30,45,.045)}
.vrm-row-main{width:100%;display:grid;grid-template-columns:40px minmax(140px,1.3fr) minmax(130px,1fr) 90px auto 32px;gap:11px;align-items:center;border:0;background:#fff;padding:11px 13px;text-align:inherit;font-family:inherit;cursor:pointer}.vrm-row-main:disabled{cursor:default}.vrm-avatar{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#EFEAE0;color:#6B1E2D;font-size:14px;font-weight:900}.vrm-teacher{min-width:0}.vrm-teacher strong,.vrm-teacher small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vrm-teacher strong{font-size:12.5px;color:#32101A}.vrm-teacher small{font-size:9.5px;color:#796A62}.vrm-watch{display:flex;align-items:center;gap:6px;color:#8C8274;font-size:10.5px;font-weight:800}.vrm-watch.yes{color:#1B5E20}.vrm-score small,.vrm-score span{display:block;color:#8C8274;font-size:9px;font-weight:800}.vrm-score strong{color:#32101A;font-size:14px}.vrm-pending{border-radius:999px;background:rgba(107,30,45,.09);padding:5px 9px;color:#6B1E2D;font-size:9.5px;font-weight:900;white-space:nowrap}.vrm-chevron{display:grid;place-items:center;color:#6B1E2D}
.vrm-answers{display:flex;flex-direction:column;gap:8px;padding:13px;border-top:1px solid #EFE9DC;background:#FFFBF5}.vrm-answers h4{margin:0 0 2px;color:#796A62;font-size:10px;text-transform:uppercase}.vrm-answer{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:11px;border:1px solid #E5E0D5;border-radius:13px;background:#fff}.vrm-answer.pending{border-color:rgba(107,30,45,.22)}.vrm-answer-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#EFEAE0;color:#6B1E2D}.vrm-answer.correct .vrm-answer-icon{background:rgba(27,94,32,.1);color:#1B5E20}.vrm-answer-content{min-width:0}.vrm-answer-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.vrm-answer-head p{margin:0;color:#32101A;font-size:11.5px;font-weight:900;line-height:1.7}.vrm-answer-head span{flex:none;border-radius:999px;background:#EFEAE0;padding:4px 8px;color:#6B1E2D;font-size:9px;font-weight:900}.vrm-answer.correct .vrm-answer-head span{background:rgba(27,94,32,.1);color:#1B5E20}.vrm-answer blockquote{margin:8px 0 0;padding:10px 12px;border:0;border-inline-start:3px solid #B8A082;border-radius:8px;background:#F7F3EB;color:#4B4039;font-size:12px;line-height:1.8}.vrm-feedback-saved{margin:7px 0 0;color:#655B53;font-size:10.5px;font-weight:700}
.vrm-grade{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding-top:10px;border-top:1px dashed #D9C9B0}.vrm-grade label{display:flex;flex-direction:column;gap:5px;color:#655B53;font-size:9.5px;font-weight:900}.vrm-grade textarea{box-sizing:border-box;width:100%;resize:vertical;border:1px solid #D9C9B0;border-radius:10px;background:#fff;padding:9px 11px;font:700 11px 'Cairo',sans-serif;line-height:1.7;color:#32101A}.vrm-grade>div{display:flex;gap:8px}.vrm-grade button{min-height:39px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:0 13px;font:900 10px 'Cairo',sans-serif;cursor:pointer}.vrm-grade button.correct{border:0;background:#1B5E20;color:#fff}.vrm-grade button.wrong{border:1px solid #6B1E2D;background:#fff;color:#6B1E2D}.vrm-grade button:disabled{opacity:.55;cursor:wait}.vrm-grade>p{margin:0;color:#9A2E3E;font-size:10px;font-weight:800}
@media(max-width:760px){.vrm-overlay{padding:0;place-items:stretch}.vrm-modal{width:100%;height:100dvh;border:0;border-radius:0}.vrm-summary{grid-template-columns:repeat(2,1fr)}.vrm-toolbar{grid-template-columns:1fr}.vrm-row-main{grid-template-columns:38px minmax(0,1fr) 30px}.vrm-teacher{grid-column:2}.vrm-watch{grid-column:2}.vrm-score{grid-column:2}.vrm-pending{grid-column:2;justify-self:start}.vrm-chevron{grid-column:3;grid-row:1/5}.vrm-answer-head{flex-direction:column}.vrm-body{padding:14px}.vrm-grade>div{flex-direction:column}.vrm-grade button{width:100%}}
`;
