"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import { Check, MapPin, X } from "lucide-react";
import { COLUMN_LABELS, COLUMN_ORDER } from "@/lib/rowad";

type ModelAnswer = {
  concept_id: string;
  name_ar: string;
  name_sq: string | null;
  selected_maqsad: keyof typeof COLUMN_LABELS;
  selected_level: number;
  correct_maqsad: keyof typeof COLUMN_LABELS;
  correct_level: number;
  is_correct: boolean;
};

type Row = {
  profile_id: string;
  full_name: string;
  email: string | null;
  role: "TEACHER" | "STUDENT" | "SCHOOL_ADMIN" | "OWNER" | string;
  plays: number;
  last_played_at: string | null;
  best_stage1: number | null;
  best_stage2: number | null;
  total: number;
};
type HistoryEntry = {
  id: string;
  stage: "STAGE1" | "STAGE2";
  score: number;
  total: number;
  answers: ModelAnswer[] | null;
  created_at: string;
};

const UI = {
  ar: {
    title: "النموذج التعليمي — نتائج اللعب",
    sub: "نتائج بطاقة النموذج التعليمي (Card Game 1 و Card Game 2) لكل المعلمين والطلاب في المدرسة. تظهر أعلى نتيجة لكل لاعب وعدد محاولاته.",
    filterAll: "الكل",
    filterTeachers: "المعلمون فقط",
    filterStudents: "الطلاب فقط",
    search: "بحث بالاسم أو البريد",
    empty: "لم يلعب أحد بعد.",
    nameCol: "الاسم",
    roleCol: "الدور",
    bestStage1: "أعلى نتيجة — البطاقة الأولى",
    bestStage2: "أعلى نتيجة — البطاقة الثانية",
    plays: "عدد المحاولات",
    lastPlayed: "آخر محاولة",
    open: "عرض السجل",
    roleTEACHER: "معلم",
    roleSTUDENT: "طالب",
    backToList: "← العودة",
    historyTitle: (n: string) => `سجل محاولات: ${n}`,
    noHistory: "لا توجد محاولات.",
    when: "متى",
    stage: "البطاقة",
    score: "النتيجة",
    stage1Lbl: "الأولى",
    stage2Lbl: "الثانية",
    answers: "تفاصيل الإجابات",
    correct: "إجابة صحيحة",
    wrong: "إجابة خاطئة",
    selected: "إجابة المشارك",
    expected: "الإجابة الصحيحة",
    level: "المستوى",
    exactModel: "النموذج الذي رتّبه المشارك",
    exactModelSub: "كل بطاقة تظهر في الخانة التي اختارها المشارك فعليًا.",
    correctCount: "صحيحة",
    wrongCount: "خاطئة",
    expectedAt: "مكانها الصحيح",
    emptyCell: "خانة فارغة",
    legacy: "هذه المحاولة قديمة وتم تسجيل الدرجة فقط قبل إضافة تفاصيل الإجابات.",
  },
  sq: {
    title: "Modeli Edukativ — Rezultatet e lojës",
    sub: "Rezultatet e Card Game 1 dhe Card Game 2 për të gjithë mësuesit dhe nxënësit në shkollë. Shfaqet rezultati më i lartë i secilit lojtar dhe numri i provimeve.",
    filterAll: "Të gjithë",
    filterTeachers: "Vetëm mësuesit",
    filterStudents: "Vetëm nxënësit",
    search: "Kërko sipas emrit ose email-it",
    empty: "Askush nuk ka luajtur ende.",
    nameCol: "Emri",
    roleCol: "Roli",
    bestStage1: "Rezultati më i lartë — Karta e parë",
    bestStage2: "Rezultati më i lartë — Karta e dytë",
    plays: "Numri i provimeve",
    lastPlayed: "Loja e fundit",
    open: "Shih historikun",
    roleTEACHER: "Mësues",
    roleSTUDENT: "Nxënës",
    backToList: "← Kthehu",
    historyTitle: (n: string) => `Historiku i lojës: ${n}`,
    noHistory: "Asnjë lojë.",
    when: "Kur",
    stage: "Karta",
    score: "Rezultati",
    stage1Lbl: "1",
    stage2Lbl: "2",
    answers: "Detajet e përgjigjeve",
    correct: "Përgjigje e saktë",
    wrong: "Përgjigje e gabuar",
    selected: "Përgjigjja e pjesëmarrësit",
    expected: "Përgjigjja e saktë",
    level: "Niveli",
    exactModel: "Modeli i plotësuar nga pjesëmarrësi",
    exactModelSub: "Çdo kartë shfaqet pikërisht në qelizën që zgjodhi pjesëmarrësi.",
    correctCount: "Saktë",
    wrongCount: "Gabim",
    expectedAt: "Vendi i saktë",
    emptyCell: "Qelizë bosh",
    legacy: "Kjo përpjekje është e vjetër dhe ka ruajtur vetëm rezultatin.",
  },
} as const;

export default function GameScoresPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "TEACHER" | "STUDENT">("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<{ profile: Row | null; history: HistoryEntry[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/school-admin/game-scores", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d?.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(s: string | null | undefined) {
    if (!s) return "—";
    try { return new Date(s).toLocaleString(L === "ar" ? "ar-u-nu-latn" : "sq"); } catch { return s; }
  }

  function roleLabel(r: string) {
    return r === "TEACHER" ? T.roleTEACHER : r === "STUDENT" ? T.roleSTUDENT : r;
  }

  const visible = rows.filter((r) => {
    if (filter !== "all" && r.role !== filter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const hay = `${r.full_name} ${r.email ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  async function openDetail(row: Row) {
    setDetailLoading(true);
    setDetail({ profile: row, history: [] });
    try {
      const r = await fetch(`/api/school-admin/game-scores?detail=${row.profile_id}`, { cache: "no-store" });
      const d = await r.json();
      setDetail({ profile: row, history: d?.history ?? [] });
    } catch {
      setDetail({ profile: row, history: [] });
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <MandalaLoader />;

  if (detail) {
    return (
      <div className="gs-page" dir={dir}>
        <button className="gs-back" onClick={() => setDetail(null)}>{T.backToList}</button>
        <h1 className="gs-title">{T.historyTitle(detail.profile?.full_name ?? "")}</h1>
        {detailLoading ? <MandalaLoader />
          : detail.history.length === 0 ? <div className="gs-empty">{T.noHistory}</div>
          : (
            <div className="gs-history-list">
              {detail.history.map((h, attemptIndex) => (
                <details key={h.id} className="gs-attempt" open={attemptIndex === 0}>
                  <summary className="gs-history-row">
                    <span className={`gs-stage-tag stage-${h.stage}`}>
                      {h.stage === "STAGE1" ? T.stage1Lbl : T.stage2Lbl}
                    </span>
                    <span className="gs-history-score">{h.score} / {h.total}</span>
                    <span className="gs-history-when">{fmtDate(h.created_at)}</span>
                    <strong className="gs-answer-link">{T.answers}</strong>
                  </summary>
                  <div className="gs-answer-panel">
                    {!Array.isArray(h.answers) || h.answers.length === 0 ? (
                      <div className="gs-legacy">{T.legacy}</div>
                    ) : (
                      <SubmissionBoard
                        answers={h.answers}
                        lang={L}
                        score={h.score}
                        total={h.total}
                        labels={{
                          title: T.exactModel,
                          sub: T.exactModelSub,
                          correct: T.correctCount,
                          wrong: T.wrongCount,
                          expectedAt: T.expectedAt,
                          level: T.level,
                          emptyCell: T.emptyCell,
                        }}
                      />
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        <Styles />
      </div>
    );
  }

  return (
    <div className="gs-page" dir={dir}>
      <header className="gs-hero">
        <h1 className="gs-title">{T.title}</h1>
        <p className="gs-sub">{T.sub}</p>
      </header>

      <div className="gs-toolbar">
        <input
          className="gs-search"
          placeholder={T.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="gs-filters">
          {(["all", "TEACHER", "STUDENT"] as const).map((opt) => (
            <button
              key={opt}
              className={`gs-toggle${filter === opt ? " active" : ""}`}
              onClick={() => setFilter(opt)}
            >
              {opt === "all" ? T.filterAll : opt === "TEACHER" ? T.filterTeachers : T.filterStudents}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="gs-empty">{T.empty}</div>
      ) : (
        <div className="gs-table-wrap">
          <table className="gs-table">
            <thead>
              <tr>
                <th>{T.nameCol}</th>
                <th>{T.roleCol}</th>
                <th>{T.bestStage1}</th>
                <th>{T.bestStage2}</th>
                <th>{T.plays}</th>
                <th>{T.lastPlayed}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.profile_id}>
                  <td>
                    <div className="gs-name">{r.full_name}</div>
                    {r.email && <div className="gs-email">{r.email}</div>}
                  </td>
                  <td><span className={`gs-role gs-role--${r.role}`}>{roleLabel(r.role)}</span></td>
                  <td><Score n={r.best_stage1} total={r.total} /></td>
                  <td><Score n={r.best_stage2} total={r.total} /></td>
                  <td className="gs-num">{r.plays}</td>
                  <td>{fmtDate(r.last_played_at)}</td>
                  <td><button className="gs-open" onClick={() => openDetail(r)}>{T.open}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Styles />
    </div>
  );
}

function Score({ n, total }: { n: number | null; total: number }) {
  if (n == null) return <span className="gs-dash">—</span>;
  const pct = total === 0 ? 0 : Math.round((n / total) * 100);
  const tone = pct >= 80 ? "great" : pct >= 50 ? "ok" : "low";
  return (
    <span className={`gs-score gs-score--${tone}`}>
      {n} / {total}
    </span>
  );
}

function SubmissionBoard({
  answers,
  lang,
  score,
  total,
  labels,
}: {
  answers: ModelAnswer[];
  lang: "ar" | "sq";
  score: number;
  total: number;
  labels: {
    title: string;
    sub: string;
    correct: string;
    wrong: string;
    expectedAt: string;
    level: string;
    emptyCell: string;
  };
}) {
  const byCell = new Map(
    answers.map((answer) => [`${answer.selected_level}:${answer.selected_maqsad}`, answer]),
  );
  const correct = answers.filter((answer) => answer.is_correct).length;
  const wrong = answers.length - correct;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <section className="gs-model-review">
      <header className="gs-model-head">
        <div>
          <span className="gs-model-kicker">5 × 5</span>
          <h2>{labels.title}</h2>
          <p>{labels.sub}</p>
        </div>
        <div className="gs-model-score" aria-label={`${score} / ${total}`}>
          <strong>{score}<small>/{total}</small></strong>
          <span>{pct}%</span>
        </div>
      </header>

      <div className="gs-model-legend">
        <span className="correct"><Check size={14} strokeWidth={2.5} />{correct} {labels.correct}</span>
        <span className="wrong"><X size={14} strokeWidth={2.5} />{wrong} {labels.wrong}</span>
      </div>

      <div className="gs-model-scroll">
        <table className="gs-model-table">
          <thead>
            <tr>
              <th className="gs-model-corner">{labels.level}</th>
              {COLUMN_ORDER.map((maqsad) => (
                <th key={maqsad} scope="col">
                  <span>{COLUMN_LABELS[maqsad][lang]}</span>
                  <small>{maqsad}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((level) => (
              <tr key={level}>
                <th scope="row" className="gs-model-level">
                  <strong>{level}</strong>
                  <span>{labels.level}</span>
                </th>
                {COLUMN_ORDER.map((maqsad) => {
                  const answer = byCell.get(`${level}:${maqsad}`);
                  if (!answer) {
                    return <td key={maqsad}><div className="gs-model-empty">{labels.emptyCell}</div></td>;
                  }
                  const conceptName = lang === "sq" && answer.name_sq ? answer.name_sq : answer.name_ar;
                  const expectedColumn = COLUMN_LABELS[answer.correct_maqsad]?.[lang] ?? answer.correct_maqsad;
                  return (
                    <td key={maqsad} className={answer.is_correct ? "is-correct" : "is-wrong"}>
                      <article className="gs-model-card">
                        <span className="gs-model-card-state" aria-label={answer.is_correct ? labels.correct : labels.wrong}>
                          {answer.is_correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                        </span>
                        <h3>{conceptName}</h3>
                        {!answer.is_correct && (
                          <div className="gs-model-expected">
                            <MapPin size={12} strokeWidth={2.2} />
                            <span><small>{labels.expectedAt}</small>{expectedColumn} · {labels.level} {answer.correct_level}</span>
                          </div>
                        )}
                      </article>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
      .gs-page { font-family: 'Cairo', sans-serif; }
      .gs-hero { margin-bottom: 18px; }
      .gs-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
      .gs-sub { font-size: 13.5px; color: #655B53; max-width: 740px; line-height: 1.85; margin: 0; }
      .gs-back { background: none; border: none; color: #6B1E2D; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; margin-bottom: 10px; padding: 0; }
      .gs-toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; padding: 14px; }
      .gs-search { width: 100%; padding: 10px 14px; font-size: 14px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px; background: #FFF; font-family: inherit; outline: none; }
      .gs-search:focus { border-color: #B8A082; }
      .gs-filters { display: flex; gap: 8px; flex-wrap: wrap; }
      .gs-toggle { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #6B1E2D; padding: 7px 14px; border-radius: 99px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
      .gs-toggle.active { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border-color: transparent; }
      .gs-empty { padding: 60px 20px; text-align: center; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; color: #8C8274; font-weight: 700; }
      .gs-table-wrap { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; overflow: auto; }
      .gs-table { width: 100%; border-collapse: collapse; min-width: 700px; }
      .gs-table th { text-align: start; padding: 12px 14px; font-size: 11.5px; color: #6B1E2D; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(194,160,89,0.22); background: rgba(194,160,89,0.06); }
      .gs-table td { padding: 14px; font-size: 13.5px; color: #4A0E1C; border-bottom: 1px solid rgba(26,26,26,0.06); vertical-align: middle; }
      .gs-name { font-weight: 800; color: #32101A; }
      .gs-email { font-size: 11.5px; color: #7A7468; margin-top: 2px; }
      .gs-role { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; letter-spacing: 0.02em; }
      .gs-role--TEACHER { background: rgba(20,80,140,0.10); color: #14528C; }
      .gs-role--STUDENT { background: rgba(107,30,45,0.10); color: #6B1E2D; }
      .gs-num { font-weight: 800; color: #6B1E2D; }
      .gs-score { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
      .gs-score--great { background: rgba(45,138,74,0.14); color: #1B5E20; }
      .gs-score--ok    { background: rgba(194,160,89,0.18); color: #6B1E2D; }
      .gs-score--low   { background: rgba(139,26,26,0.10); color: #6B1E2D; }
      .gs-dash { color: #BFB6A8; }
      .gs-open { background: linear-gradient(180deg,#D8B96A,#B8A082); color: #4A0E1C; border: none; padding: 6px 14px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
      .gs-history-list { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; overflow: hidden; }
      .gs-attempt { border-bottom:1px solid rgba(26,26,26,.07); }
      .gs-attempt:last-child { border-bottom:none; }
      .gs-history-row { display: grid; grid-template-columns: auto minmax(80px,1fr) auto auto; gap: 14px; align-items: center; padding: 14px 16px; font-size: 13.5px; cursor:pointer; list-style:none; }
      .gs-history-row::-webkit-details-marker { display:none; }
      .gs-answer-link { color:#6B1E2D; font-size:11.5px; border-bottom:1px solid rgba(107,30,45,.28); }
      .gs-stage-tag { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; }
      .gs-stage-tag.stage-STAGE1 { background: rgba(20,80,140,0.10); color: #14528C; }
      .gs-stage-tag.stage-STAGE2 { background: rgba(107,30,45,0.10); color: #6B1E2D; }
      .gs-history-score { font-weight: 800; color: #32101A; font-variant-numeric: tabular-nums; }
      .gs-history-when { color: #7A7468; font-size: 12px; }
      .gs-answer-panel { padding:0 16px 18px; background:linear-gradient(180deg,rgba(247,243,235,.5),rgba(239,234,224,.45)); }
      .gs-model-review { padding-top:14px; }
      .gs-model-head { display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:20px 22px;background:linear-gradient(120deg,#32101A,#4A0E1C 66%,#5B1526);border:1px solid rgba(184,160,130,.42);border-radius:8px 8px 0 0;color:#FFFBF5; }
      .gs-model-kicker { display:block;color:#B8A082;font-size:10px;font-weight:900;letter-spacing:.2em; }
      .gs-model-head h2 { margin:5px 0 3px;font-size:18px;line-height:1.5; }
      .gs-model-head p { margin:0;color:rgba(239,234,224,.72);font-size:11.5px; }
      .gs-model-score { display:flex;align-items:baseline;gap:9px;flex-shrink:0;padding-inline-start:20px;border-inline-start:1px solid rgba(217,201,176,.28);font-variant-numeric:tabular-nums; }
      .gs-model-score strong { font-size:31px;line-height:1;color:#FFFBF5; }.gs-model-score strong small{font-size:14px;color:#B8A082}.gs-model-score>span{font-size:11px;font-weight:900;color:#D9C9B0}
      .gs-model-legend { display:flex;align-items:center;gap:10px;padding:10px 12px;background:#EFEAE0;border-inline:1px solid rgba(184,160,130,.30); }
      .gs-model-legend span { display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:5px;font-size:10.5px;font-weight:900; }.gs-model-legend .correct{color:#1B5E20;background:rgba(27,94,32,.10)}.gs-model-legend .wrong{color:#6B1E2D;background:rgba(107,30,45,.09)}
      .gs-model-scroll { overflow-x:auto;border:1px solid rgba(184,160,130,.30);border-top:0;background:#E5E0D5; }
      .gs-model-table { width:100%;min-width:960px;border-collapse:separate;border-spacing:1px;table-layout:fixed;background:rgba(184,160,130,.34); }
      .gs-model-table th,.gs-model-table td { padding:0;background:#FFFBF5; }
      .gs-model-table thead th { height:62px;padding:8px;text-align:center;background:#EFEAE0;color:#4A0E1C; }
      .gs-model-table thead th span { display:block;font-size:13px;font-weight:900; }.gs-model-table thead th small{display:block;margin-top:2px;color:#8F765B;font-size:8px;letter-spacing:.1em}
      .gs-model-table .gs-model-corner { width:82px;color:#8F765B;font-size:10px;letter-spacing:.08em; }
      .gs-model-level { width:82px;text-align:center;background:#EFEAE0!important; }.gs-model-level strong{display:grid;place-items:center;width:30px;height:30px;margin:0 auto 3px;border-radius:6px;background:#4A0E1C;color:#D9C9B0;font-size:13px}.gs-model-level span{display:block;color:#8F765B;font-size:8.5px;font-weight:800}
      .gs-model-table td { height:124px;vertical-align:stretch; }
      .gs-model-card { position:relative;height:100%;min-height:124px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px 10px 10px;text-align:center;border-top:3px solid transparent;background:#FFFBF5; }
      .gs-model-card-state { position:absolute;top:7px;inset-inline-end:7px;width:23px;height:23px;display:grid;place-items:center;border-radius:50%; }
      td.is-correct .gs-model-card { border-top-color:#1B5E20;background:linear-gradient(180deg,rgba(27,94,32,.06),#FFFBF5 44%); }.is-correct .gs-model-card-state{color:#FFFFFF;background:#1B5E20;box-shadow:0 3px 9px rgba(27,94,32,.22)}
      td.is-wrong .gs-model-card { border-top-color:#6B1E2D;background:linear-gradient(180deg,rgba(107,30,45,.07),#FFFBF5 44%); }.is-wrong .gs-model-card-state{color:#FFFFFF;background:#6B1E2D;box-shadow:0 3px 9px rgba(107,30,45,.22)}
      .gs-model-card h3 { margin:10px 0 0;color:#32101A;font-size:11.5px;line-height:1.55;overflow-wrap:anywhere; }
      .gs-model-expected { width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:6px;background:rgba(107,30,45,.07);color:#6B1E2D;border:1px solid rgba(107,30,45,.12);border-radius:5px;font-size:9px;font-weight:800;line-height:1.45; }.gs-model-expected span{min-width:0}.gs-model-expected small{display:block;color:#8F765B;font-size:7.5px;font-weight:800}
      .gs-model-empty { height:124px;display:grid;place-items:center;color:#8C8274;font-size:9px;background:#F7F3EB; }
      .gs-legacy { margin-top:12px; padding:14px; border-radius:12px; background:rgba(184,160,130,.12); color:#655B53; font-size:12px; font-weight:700; text-align:center; }
      @media(max-width:760px){ .gs-history-row{grid-template-columns:auto 1fr auto}.gs-answer-link{grid-column:2 / -1}.gs-answer-panel{padding-inline:8px}.gs-model-head{align-items:flex-start;padding:16px;flex-direction:column}.gs-model-score{padding-inline-start:0;border-inline-start:0}.gs-model-table{min-width:820px}.gs-model-table td,.gs-model-card,.gs-model-empty{height:112px;min-height:112px} }
    `}</style>
  );
}
