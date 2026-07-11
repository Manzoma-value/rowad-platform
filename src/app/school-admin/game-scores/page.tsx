"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

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
              {detail.history.map((h) => (
                <div key={h.id} className="gs-history-row">
                  <span className={`gs-stage-tag stage-${h.stage}`}>
                    {h.stage === "STAGE1" ? T.stage1Lbl : T.stage2Lbl}
                  </span>
                  <span className="gs-history-score">{h.score} / {h.total}</span>
                  <span className="gs-history-when">{fmtDate(h.created_at)}</span>
                </div>
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
      .gs-history-row { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(26,26,26,0.06); font-size: 13.5px; }
      .gs-history-row:last-child { border-bottom: none; }
      .gs-stage-tag { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; }
      .gs-stage-tag.stage-STAGE1 { background: rgba(20,80,140,0.10); color: #14528C; }
      .gs-stage-tag.stage-STAGE2 { background: rgba(107,30,45,0.10); color: #6B1E2D; }
      .gs-history-score { font-weight: 800; color: #32101A; font-variant-numeric: tabular-nums; }
      .gs-history-when { color: #7A7468; font-size: 12px; }
    `}</style>
  );
}
