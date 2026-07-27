"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff, X, XCircle } from "lucide-react";
import MandalaLoader from "@/components/MandalaLoader";

const T = {
  ar: {
    title: "نتائج الفيديو",
    teacher: "المعلم",
    watched: "شاهد الفيديو",
    notWatched: "لم يشاهد بعد",
    finishedWatch: "شاهده كاملاً",
    score: "النتيجة",
    noAttempt: "لم يُجب بعد",
    answers: "الإجابات",
    correct: "صحيحة",
    wrong: "خاطئة",
    noTeachers: "لا يوجد معلمون مرتبطون بهذه الورشة بعد.",
    error: "تعذر تحميل النتائج.",
    close: "إغلاق",
  },
  sq: {
    title: "Rezultatet e videos",
    teacher: "Mësuesi",
    watched: "E ka parë",
    notWatched: "Ende pa e parë",
    finishedWatch: "E ka parë deri në fund",
    score: "Rezultati",
    noAttempt: "Ende pa u përgjigjur",
    answers: "Përgjigjet",
    correct: "Saktë",
    wrong: "Gabim",
    noTeachers: "Nuk ka mësues të lidhur me këtë forum ende.",
    error: "Rezultatet nuk u ngarkuan.",
    close: "Mbyll",
  },
} as const;

type ResultRow = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  viewed: boolean;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  watch_completed_at: string | null;
  score: number | null;
  total: number;
  quiz_completed_at: string | null;
  answers: { question_id: string; question_text: string; answer: string; is_correct: boolean; answered_at: string }[];
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
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/school-admin/workshops/${workshopId}/videos/${videoId}/results`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setRows(data.teachers ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [workshopId, videoId]);

  return (
    <div className="vrm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vrm-modal">
        <header>
          <div><h3>{t.title}</h3><p>{videoTitle}</p></div>
          <button onClick={onClose} aria-label={t.close}><X size={18} /></button>
        </header>
        <div className="vrm-body">
          {error ? (
            <div className="vrm-empty">{t.error}</div>
          ) : !rows ? (
            <MandalaLoader />
          ) : rows.length === 0 ? (
            <div className="vrm-empty">{t.noTeachers}</div>
          ) : (
            <div className="vrm-list">
              {rows.map((row) => (
                <article key={row.teacher_id} className="vrm-row">
                  <div className="vrm-row-main">
                    <div className="vrm-teacher">
                      <strong>{row.full_name}</strong>
                      {row.email && <small dir="ltr">{row.email}</small>}
                    </div>
                    <div className={`vrm-watch${row.viewed ? " yes" : ""}`}>
                      {row.viewed ? <Eye size={14} /> : <EyeOff size={14} />}
                      {row.viewed ? (row.watch_completed_at ? t.finishedWatch : t.watched) : t.notWatched}
                    </div>
                    <div className="vrm-score">
                      {row.score === null ? t.noAttempt : <strong>{row.score}/{row.total}</strong>}
                    </div>
                    <button
                      className="vrm-toggle"
                      disabled={row.answers.length === 0}
                      onClick={() => setExpanded((cur) => cur === row.teacher_id ? null : row.teacher_id)}
                    >
                      {expanded === row.teacher_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {expanded === row.teacher_id && row.answers.length > 0 && (
                    <div className="vrm-answers">
                      <span>{t.answers}</span>
                      {row.answers.map((answer) => (
                        <div key={answer.question_id} className={`vrm-answer${answer.is_correct ? " correct" : " wrong"}`}>
                          {answer.is_correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <div>
                            <p className="vrm-q">{answer.question_text}</p>
                            <p className="vrm-a">{answer.answer} <em>({answer.is_correct ? t.correct : t.wrong})</em></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.vrm-overlay{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:18px;background:rgba(26,26,26,.58);backdrop-filter:blur(6px)}
.vrm-modal{width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;background:#FFFBF5;border:1px solid rgba(217,201,176,.4);border-radius:18px;box-shadow:0 24px 70px rgba(26,26,26,.3);font-family:'Cairo',sans-serif;overflow:hidden}
.vrm-modal>header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:18px 20px;background:linear-gradient(135deg,#250B12,#6B1E2D);color:#F7F3EB;border-radius:18px 18px 0 0}
.vrm-modal>header h3{margin:0 0 3px;font-size:17px}
.vrm-modal>header p{margin:0;font-size:11px;color:rgba(247,243,235,.75)}
.vrm-modal>header button{width:32px;height:32px;flex:none;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.vrm-body{padding:16px 20px;overflow:auto}
.vrm-empty{padding:40px 10px;text-align:center;color:#8C8274;font-weight:800}
.vrm-list{display:flex;flex-direction:column;gap:8px}
.vrm-row{border:1px solid #E5E0D5;border-radius:12px;background:#fff;overflow:hidden}
.vrm-row-main{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 90px 34px;gap:10px;align-items:center;padding:11px 13px}
.vrm-teacher strong,.vrm-teacher small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vrm-teacher strong{font-size:12.5px;color:#32101A}
.vrm-teacher small{font-size:10px;color:#796A62}
.vrm-watch{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:#8C8274}
.vrm-watch.yes{color:#1B5E20}
.vrm-score strong{font-size:13px;color:#32101A}
.vrm-score{font-size:11px;color:#8C8274}
.vrm-toggle{width:30px;height:30px;display:grid;place-items:center;border:1px solid #D9C9B0;border-radius:8px;background:#F7F3EB;color:#6B1E2D;cursor:pointer}
.vrm-toggle:disabled{opacity:.35;cursor:default}
.vrm-answers{display:flex;flex-direction:column;gap:6px;padding:0 13px 13px;border-top:1px solid #EFE9DC;margin-top:2px;padding-top:10px}
.vrm-answers>span{font-size:10px;font-weight:900;color:#8C8274;text-transform:uppercase}
.vrm-answer{display:grid;grid-template-columns:16px 1fr;gap:8px;align-items:start;padding:8px 9px;border-radius:9px;background:#F7F3EB}
.vrm-answer.correct{color:#1B5E20}
.vrm-answer.wrong{color:#6B1E2D}
.vrm-answer svg{margin-top:2px}
.vrm-q{margin:0;font-size:11.5px;color:#32101A}
.vrm-a{margin:2px 0 0;font-size:11px}
.vrm-a em{font-style:normal;font-weight:800}
@media(max-width:640px){
  .vrm-overlay{padding:0;place-items:stretch}
  .vrm-modal{width:100%;max-height:100vh;border-radius:0;border:0}
  .vrm-modal>header{border-radius:0}
  .vrm-body{padding:14px 15px}
  .vrm-row-main{grid-template-columns:minmax(0,1fr) 34px;grid-template-rows:auto auto auto;row-gap:6px}
  .vrm-teacher{grid-column:1;grid-row:1}
  .vrm-watch{grid-column:1;grid-row:2}
  .vrm-score{grid-column:1;grid-row:3}
  .vrm-toggle{grid-column:2;grid-row:1/4;align-self:center}
}
`;
