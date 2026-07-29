"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import { Check, Clock3, MapPin, Trophy, Users, X } from "lucide-react";
import { COLUMN_LABELS, COLUMN_ORDER } from "@/lib/rowad";

type MiniGameKind = "MEMORY" | "HUNTER" | "SPEED" | "COLLECTOR" | "WORDRAIN";

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

type ModelRow = {
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
type MiniRow = {
  profile_id: string;
  full_name: string;
  email: string | null;
  role: string;
  plays: number;
  last_played_at: string | null;
  by_game: Partial<Record<MiniGameKind, { plays: number; best_score: number }>>;
};
type OverviewGame = { key: string; plays: number; unique_players: number };
type Overview = { total_plays: number; unique_players: number; games: OverviewGame[] };
type InProgressRow = {
  profile_id: string;
  full_name: string;
  email: string | null;
  role: string;
  stage: "STAGE1" | "STAGE2";
  placed_count: number;
  total: number;
  updated_at: string;
};

type ModelHistoryEntry = {
  id: string;
  stage: "STAGE1" | "STAGE2";
  score: number;
  total: number;
  answers: ModelAnswer[] | null;
  created_at: string;
};
type MiniHistoryEntry = {
  id: string;
  game: MiniGameKind;
  score: number;
  won: boolean;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const GAME_LABELS: Record<string, { ar: string; sq: string; emoji: string }> = {
  MODEL_STAGE1: { ar: "النموذج — البطاقة الأولى", sq: "Modeli — Karta e parë", emoji: "🎴" },
  MODEL_STAGE2: { ar: "النموذج — البطاقة الثانية", sq: "Modeli — Karta e dytë", emoji: "🎴" },
  MEMORY: { ar: "تحدي الذاكرة", sq: "Sfida e Kujtesës", emoji: "🧠" },
  HUNTER: { ar: "صائد المقاصد", sq: "Gjuetari i Qëllimeve", emoji: "🎯" },
  SPEED: { ar: "تحدي السرعة", sq: "Sfida e Shpejtësisë", emoji: "⚡" },
  COLLECTOR: { ar: "جامع المقاصد", sq: "Mbledhësi i Qëllimeve", emoji: "🧭" },
  WORDRAIN: { ar: "مطر الكلمات", sq: "Shiu i Fjalëve", emoji: "🌧️" },
};

const UI = {
  ar: {
    title: "أدوات التعلم — الاستخدام والتفاعل",
    sub: "نظرة شاملة على أدوات التعلم في المنصة: بطاقات النموذج التعليمي وخمسة أنشطة تدريبية. تابع مستوى الاستخدام والمشاركة.",
    totalPlays: "إجمالي المحاولات",
    uniquePlayers: "عدد المشاركين",
    mostPlayed: "الأكثر استخداماً",
    rankTitle: "أدوات التعلم حسب الاستخدام",
    players: (n: number) => `${n} مشارك`,
    plays: (n: number) => `${n} مرة`,
    noPlaysYet: "لا توجد بيانات استخدام بعد.",
    inProgressSection: "قيد التقدم الآن",
    inProgressSectionSub: "معلمون وطلاب بدأوا بطاقة النموذج ولم يرسلوها بعد — يُحفظ تقدمهم تلقائياً حتى يعودوا لإكماله.",
    inProgressEmpty: "لا يوجد أحد في منتصف النشاط الآن.",
    placedOf: (n: number, total: number) => `${n} من ${total} بطاقة`,
    lastActive: "آخر نشاط",
    modelSection: "النموذج التعليمي (بطاقات)",
    modelSectionSub: "نتائج بطاقتي النموذج التعليمي الأولى والثانية.",
    miniSection: "الأنشطة التدريبية الخمسة",
    miniSectionSub: "لا تُقيَّم هذه الأنشطة؛ الهدف متابعة الاستخدام وعدد المحاولات والأداة المفضلة.",
    filterAll: "الكل",
    filterTeachers: "المعلمون فقط",
    filterStudents: "الطلاب فقط",
    search: "بحث بالاسم أو البريد",
    empty: "لا توجد محاولات بعد.",
    nameCol: "الاسم",
    roleCol: "الدور",
    bestStage1: "أعلى نتيجة — البطاقة الأولى",
    bestStage2: "أعلى نتيجة — البطاقة الثانية",
    playsCol: "عدد المحاولات",
    lastPlayed: "آخر محاولة",
    gamesCol: "أدوات التعلم المستخدمة",
    open: "عرض السجل",
    roleTEACHER: "معلم",
    roleSTUDENT: "طالب",
    backToList: "← العودة",
    historyTitle: (n: string) => `سجل محاولات: ${n}`,
    noHistory: "لا توجد محاولات.",
    modelHistoryTitle: "محاولات النموذج التعليمي",
    miniHistoryTitle: "محاولات الأنشطة التدريبية",
    when: "متى",
    stage: "البطاقة",
    score: "النتيجة",
    stage1Lbl: "الأولى",
    stage2Lbl: "الثانية",
    answers: "تفاصيل الإجابات",
    correct: "إجابة صحيحة",
    wrong: "إجابة خاطئة",
    level: "المستوى",
    exactModel: "النموذج الذي رتّبه المشارك",
    exactModelSub: "كل بطاقة تظهر في الخانة التي اختارها المشارك فعليًا.",
    correctCount: "صحيحة",
    wrongCount: "خاطئة",
    expectedAt: "مكانها الصحيح",
    emptyCell: "خانة فارغة",
    legacy: "هذه المحاولة قديمة وتم تسجيل الدرجة فقط قبل إضافة تفاصيل الإجابات.",
    won: "فاز",
    lost: "لم يفز",
    completed: "أكمل الجولة",
  },
  sq: {
    title: "Mjetet mësimore — përdorimi dhe angazhimi",
    sub: "Pamje e plotë e mjeteve mësimore: kartat e Modelit Edukativ dhe pesë aktivitete ushtrimi. Ndiq përdorimin dhe pjesëmarrjen.",
    totalPlays: "Përpjekje gjithsej",
    uniquePlayers: "Numri i pjesëmarrësve",
    mostPlayed: "Më e përdorura",
    rankTitle: "Mjetet sipas përdorimit",
    players: (n: number) => `${n} pjesëmarrës`,
    plays: (n: number) => `${n} herë`,
    noPlaysYet: "Nuk ka të dhëna ende.",
    inProgressSection: "Në vazhdim tani",
    inProgressSectionSub: "Mësues dhe nxënës që kanë filluar kartën e modelit dhe s'e kanë dërguar ende — progresi i tyre ruhet automatikisht derisa të kthehen ta përfundojnë.",
    inProgressEmpty: "Askush nuk është në mes të aktivitetit tani.",
    placedOf: (n: number, total: number) => `${n} nga ${total} karta`,
    lastActive: "Aktiviteti i fundit",
    modelSection: "Modeli Edukativ (karta)",
    modelSectionSub: "Rezultatet e kartës së parë dhe të dytë të modelit.",
    miniSection: "Pesë aktivitete ushtrimi",
    miniSectionSub: "Këto aktivitete nuk vlerësohen; ndiqet vetëm përdorimi, numri i përpjekjeve dhe mjeti i preferuar.",
    filterAll: "Të gjithë",
    filterTeachers: "Vetëm mësuesit",
    filterStudents: "Vetëm nxënësit",
    search: "Kërko sipas emrit ose email-it",
    empty: "Ende nuk ka përpjekje.",
    nameCol: "Emri",
    roleCol: "Roli",
    bestStage1: "Rezultati më i lartë — Karta e parë",
    bestStage2: "Rezultati më i lartë — Karta e dytë",
    playsCol: "Numri i provimeve",
    lastPlayed: "Përpjekja e fundit",
    gamesCol: "Mjetet e përdorura",
    open: "Shih historikun",
    roleTEACHER: "Mësues",
    roleSTUDENT: "Nxënës",
    backToList: "← Kthehu",
    historyTitle: (n: string) => `Historiku i aktivitetit: ${n}`,
    noHistory: "Asnjë përpjekje.",
    modelHistoryTitle: "Përpjekjet e Modelit Edukativ",
    miniHistoryTitle: "Përpjekjet e aktiviteteve të ushtrimit",
    when: "Kur",
    stage: "Karta",
    score: "Rezultati",
    stage1Lbl: "1",
    stage2Lbl: "2",
    answers: "Detajet e përgjigjeve",
    correct: "Përgjigje e saktë",
    wrong: "Përgjigje e gabuar",
    level: "Niveli",
    exactModel: "Modeli i plotësuar nga pjesëmarrësi",
    exactModelSub: "Çdo kartë shfaqet pikërisht në qelizën që zgjodhi pjesëmarrësi.",
    correctCount: "Saktë",
    wrongCount: "Gabim",
    expectedAt: "Vendi i saktë",
    emptyCell: "Qelizë bosh",
    legacy: "Kjo përpjekje është e vjetër dhe ka ruajtur vetëm rezultatin.",
    won: "Fitoi",
    lost: "Nuk fitoi",
    completed: "Përfundoi raundin",
  },
} as const;

export default function GameScoresPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [overview, setOverview] = useState<Overview | null>(null);
  const [modelRows, setModelRows] = useState<ModelRow[]>([]);
  const [miniRows, setMiniRows] = useState<MiniRow[]>([]);
  const [inProgressRows, setInProgressRows] = useState<InProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "TEACHER" | "STUDENT">("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<{
    row: { profile_id: string; full_name: string };
    modelHistory: ModelHistoryEntry[];
    miniHistory: MiniHistoryEntry[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/school-admin/game-scores", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setOverview(d?.overview ?? null);
        setModelRows(d?.modelRows ?? []);
        setMiniRows(d?.miniRows ?? []);
        setInProgressRows(d?.inProgressRows ?? []);
      })
      .catch(() => { setOverview(null); setModelRows([]); setMiniRows([]); setInProgressRows([]); })
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(s: string | null | undefined) {
    if (!s) return "—";
    try { return new Date(s).toLocaleString(L === "ar" ? "ar-u-nu-latn" : "sq"); } catch { return s; }
  }
  function roleLabel(r: string) {
    return r === "TEACHER" ? T.roleTEACHER : r === "STUDENT" ? T.roleSTUDENT : r;
  }
  function gameLabel(key: string) {
    const entry = GAME_LABELS[key];
    if (!entry) return key;
    return `${entry.emoji} ${L === "ar" ? entry.ar : entry.sq}`;
  }

  const visibleModel = useMemo(() => modelRows.filter((r) => {
    if (filter !== "all" && r.role !== filter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!`${r.full_name} ${r.email ?? ""}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [modelRows, filter, q]);

  const visibleMini = useMemo(() => miniRows.filter((r) => {
    if (filter !== "all" && r.role !== filter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!`${r.full_name} ${r.email ?? ""}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [miniRows, filter, q]);

  const visibleInProgress = useMemo(() => inProgressRows.filter((r) => {
    if (filter !== "all" && r.role !== filter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!`${r.full_name} ${r.email ?? ""}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [inProgressRows, filter, q]);

  const maxGamePlays = overview?.games.reduce((m, g) => Math.max(m, g.plays), 0) || 1;
  const topGame = overview?.games.find((g) => g.plays > 0);

  async function openDetail(profileId: string, fullName: string) {
    setDetailLoading(true);
    setDetail({ row: { profile_id: profileId, full_name: fullName }, modelHistory: [], miniHistory: [] });
    try {
      const r = await fetch(`/api/school-admin/game-scores?detail=${profileId}`, { cache: "no-store" });
      const d = await r.json();
      setDetail({
        row: { profile_id: profileId, full_name: fullName },
        modelHistory: d?.modelHistory ?? [],
        miniHistory: d?.miniHistory ?? [],
      });
    } catch {
      setDetail({ row: { profile_id: profileId, full_name: fullName }, modelHistory: [], miniHistory: [] });
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <MandalaLoader />;

  if (detail) {
    return (
      <div className="gs-page" dir={dir}>
        <button className="gs-back" onClick={() => setDetail(null)}>{T.backToList}</button>
        <h1 className="gs-title">{T.historyTitle(detail.row.full_name)}</h1>

        {detailLoading ? <MandalaLoader /> : (
          <>
            {detail.miniHistory.length > 0 && (
              <section className="gs-mini-history">
                <h2 className="gs-subtitle">{T.miniHistoryTitle}</h2>
                <div className="gs-mini-list">
                  {detail.miniHistory.map((h) => (
                    <div key={h.id} className={`gs-mini-entry${h.won ? " won" : ""}`}>
                      <span className="gs-mini-entry-game">{gameLabel(h.game)}</span>
                      <span className="gs-mini-entry-score">{h.score}</span>
                      <span className={`gs-mini-entry-result${h.won ? " won" : ""}`}>
                        {h.won ? T.won : h.game === "SPEED" ? T.completed : T.lost}
                      </span>
                      {h.meta && Object.keys(h.meta).length > 0 && (
                        <span className="gs-mini-entry-meta">
                          {Object.entries(h.meta).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </span>
                      )}
                      <time className="gs-mini-entry-when">{fmtDate(h.created_at)}</time>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="gs-model-history-section">
              {(detail.modelHistory.length > 0 || detail.miniHistory.length > 0) && (
                <h2 className="gs-subtitle">{T.modelHistoryTitle}</h2>
              )}
              {detail.modelHistory.length === 0 && detail.miniHistory.length === 0 ? (
                <div className="gs-empty">{T.noHistory}</div>
              ) : detail.modelHistory.length === 0 ? null : (
                <div className="gs-history-list">
                  {detail.modelHistory.map((h, attemptIndex) => (
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
            </section>
          </>
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

      {/* ── Overview: totals + which game is most played ── */}
      <section className="gs-overview">
        <div className="gs-overview-cards">
          <div className="gs-overview-card">
            <Trophy size={18} />
            <strong>{overview?.total_plays ?? 0}</strong>
            <span>{T.totalPlays}</span>
          </div>
          <div className="gs-overview-card">
            <Users size={18} />
            <strong>{overview?.unique_players ?? 0}</strong>
            <span>{T.uniquePlayers}</span>
          </div>
          <div className="gs-overview-card highlight">
            <span className="gs-overview-emoji">{topGame ? GAME_LABELS[topGame.key]?.emoji ?? "🎮" : "🎮"}</span>
            <strong className="gs-overview-toplabel">{topGame ? gameLabel(topGame.key) : "—"}</strong>
            <span>{T.mostPlayed}</span>
          </div>
        </div>

        <div className="gs-rank-card">
          <h2 className="gs-rank-title">{T.rankTitle}</h2>
          {!overview || overview.games.every((g) => g.plays === 0) ? (
            <div className="gs-empty">{T.noPlaysYet}</div>
          ) : (
            <div className="gs-rank-list">
              {overview.games.map((g) => (
                <div key={g.key} className="gs-rank-row">
                  <span className="gs-rank-label">{gameLabel(g.key)}</span>
                  <div className="gs-rank-bar-bg">
                    <div className="gs-rank-bar-fill" style={{ width: `${g.plays === 0 ? 0 : Math.max(4, (g.plays / maxGamePlays) * 100)}%` }} />
                  </div>
                  <span className="gs-rank-count">{T.plays(g.plays)}</span>
                  <span className="gs-rank-players">{T.players(g.unique_players)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Shared toolbar for all tables below ── */}
      <div className="gs-toolbar">
        <input className="gs-search" placeholder={T.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="gs-filters">
          {(["all", "TEACHER", "STUDENT"] as const).map((opt) => (
            <button key={opt} className={`gs-toggle${filter === opt ? " active" : ""}`} onClick={() => setFilter(opt)}>
              {opt === "all" ? T.filterAll : opt === "TEACHER" ? T.filterTeachers : T.filterStudents}
            </button>
          ))}
        </div>
      </div>

      {/* ── In progress right now: autosaved, unsubmitted card-game boards ── */}
      <section className="gs-section">
        <h2 className="gs-section-title">{T.inProgressSection}</h2>
        <p className="gs-section-sub">{T.inProgressSectionSub}</p>
        {visibleInProgress.length === 0 ? (
          <div className="gs-empty">{T.inProgressEmpty}</div>
        ) : (
          <div className="gs-inprogress-list">
            {visibleInProgress.map((r) => (
              <div key={`${r.profile_id}:${r.stage}`} className="gs-inprogress-row">
                <div className="gs-inprogress-who">
                  <div className="gs-name">{r.full_name}</div>
                  {r.email && <div className="gs-email">{r.email}</div>}
                </div>
                <span className={`gs-role gs-role--${r.role}`}>{roleLabel(r.role)}</span>
                <span className={`gs-stage-tag stage-${r.stage}`}>{r.stage === "STAGE1" ? T.stage1Lbl : T.stage2Lbl}</span>
                <div className="gs-inprogress-bar-wrap">
                  <div className="gs-inprogress-bar-bg">
                    <div className="gs-inprogress-bar-fill" style={{ width: `${(r.placed_count / r.total) * 100}%` }} />
                  </div>
                  <span>{T.placedOf(r.placed_count, r.total)}</span>
                </div>
                <span className="gs-inprogress-when"><Clock3 size={12} />{T.lastActive}: {fmtDate(r.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Model roll-up ── */}
      <section className="gs-section">
        <h2 className="gs-section-title">{T.modelSection}</h2>
        <p className="gs-section-sub">{T.modelSectionSub}</p>
        {visibleModel.length === 0 ? (
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
                  <th>{T.playsCol}</th>
                  <th>{T.lastPlayed}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleModel.map((r) => (
                  <tr key={r.profile_id}>
                    <td><div className="gs-name">{r.full_name}</div>{r.email && <div className="gs-email">{r.email}</div>}</td>
                    <td><span className={`gs-role gs-role--${r.role}`}>{roleLabel(r.role)}</span></td>
                    <td><Score n={r.best_stage1} total={r.total} /></td>
                    <td><Score n={r.best_stage2} total={r.total} /></td>
                    <td className="gs-num">{r.plays}</td>
                    <td>{fmtDate(r.last_played_at)}</td>
                    <td><button className="gs-open" onClick={() => openDetail(r.profile_id, r.full_name)}>{T.open}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Mini-games roll-up ── */}
      <section className="gs-section">
        <h2 className="gs-section-title">{T.miniSection}</h2>
        <p className="gs-section-sub">{T.miniSectionSub}</p>
        {visibleMini.length === 0 ? (
          <div className="gs-empty">{T.empty}</div>
        ) : (
          <div className="gs-table-wrap">
            <table className="gs-table">
              <thead>
                <tr>
                  <th>{T.nameCol}</th>
                  <th>{T.roleCol}</th>
                  <th>{T.gamesCol}</th>
                  <th>{T.playsCol}</th>
                  <th>{T.lastPlayed}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleMini.map((r) => (
                  <tr key={r.profile_id}>
                    <td><div className="gs-name">{r.full_name}</div>{r.email && <div className="gs-email">{r.email}</div>}</td>
                    <td><span className={`gs-role gs-role--${r.role}`}>{roleLabel(r.role)}</span></td>
                    <td>
                      <div className="gs-mini-chips">
                        {(Object.keys(r.by_game) as MiniGameKind[]).map((game) => (
                          <span key={game} className="gs-mini-chip" title={gameLabel(game)}>
                            {GAME_LABELS[game]?.emoji}{r.by_game[game]!.plays}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="gs-num">{r.plays}</td>
                    <td>{fmtDate(r.last_played_at)}</td>
                    <td><button className="gs-open" onClick={() => openDetail(r.profile_id, r.full_name)}>{T.open}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Styles />
    </div>
  );
}

function Score({ n, total }: { n: number | null; total: number }) {
  if (n == null) return <span className="gs-dash">—</span>;
  const pct = total === 0 ? 0 : Math.round((n / total) * 100);
  const tone = pct >= 80 ? "great" : pct >= 50 ? "ok" : "low";
  return <span className={`gs-score gs-score--${tone}`}>{n} / {total}</span>;
}

function SubmissionBoard({
  answers, lang, score, total, labels,
}: {
  answers: ModelAnswer[];
  lang: "ar" | "sq";
  score: number;
  total: number;
  labels: {
    title: string; sub: string; correct: string; wrong: string;
    expectedAt: string; level: string; emptyCell: string;
  };
}) {
  const byCell = new Map(answers.map((answer) => [`${answer.selected_level}:${answer.selected_maqsad}`, answer]));
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
      .gs-subtitle { font-size: 15px; font-weight: 900; color: #32101A; margin: 18px 0 10px; }
      .gs-back { background: none; border: none; color: #6B1E2D; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; margin-bottom: 10px; padding: 0; }

      /* Overview */
      .gs-overview { margin-bottom: 18px; display: flex; flex-direction: column; gap: 12px; }
      .gs-overview-cards { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
      .gs-overview-card { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
        background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; padding: 16px 10px; color: #6B1E2D; }
      .gs-overview-card strong { font-size: 24px; font-weight: 900; color: #32101A; }
      .gs-overview-card span { font-size: 11px; font-weight: 700; color: #796A62; }
      .gs-overview-card.highlight { background: linear-gradient(160deg,#FFFBF5,#F7F3EB); border-color: rgba(184,160,130,0.5); }
      .gs-overview-emoji { font-size: 24px; line-height: 1; }
      .gs-overview-toplabel { font-size: 13px !important; line-height: 1.3; }
      .gs-rank-card { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; padding: 16px; }
      .gs-rank-title { margin: 0 0 12px; font-size: 13px; font-weight: 900; color: #32101A; text-transform: uppercase; letter-spacing: .04em; }
      .gs-rank-list { display: flex; flex-direction: column; gap: 9px; }
      .gs-rank-row { display: grid; grid-template-columns: minmax(120px,180px) 1fr auto auto; gap: 10px; align-items: center; font-size: 12.5px; }
      .gs-rank-label { font-weight: 800; color: #4A0E1C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gs-rank-bar-bg { height: 8px; border-radius: 99px; background: rgba(184,160,130,0.14); overflow: hidden; }
      .gs-rank-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#B8A082,#6B1E2D); transition: width .5s ease; }
      .gs-rank-count { font-weight: 900; color: #6B1E2D; white-space: nowrap; }
      .gs-rank-players { color: #8C8274; font-size: 11px; white-space: nowrap; }
      @media(max-width:640px){ .gs-overview-cards{grid-template-columns:1fr 1fr} .gs-overview-cards .highlight{grid-column:1/-1}
        .gs-rank-row{grid-template-columns:1fr auto;grid-template-rows:auto auto;row-gap:4px}
        .gs-rank-bar-bg{grid-column:1/-1}.gs-rank-players{grid-column:2}.gs-rank-count{grid-column:1} }

      .gs-toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; padding: 14px; }
      .gs-search { width: 100%; padding: 10px 14px; font-size: 14px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px; background: #FFF; font-family: inherit; outline: none; }
      .gs-search:focus { border-color: #B8A082; }
      .gs-filters { display: flex; gap: 8px; flex-wrap: wrap; }
      .gs-toggle { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #6B1E2D; padding: 7px 14px; border-radius: 99px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
      .gs-toggle.active { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border-color: transparent; }

      .gs-section { margin-bottom: 22px; }
      .gs-section-title { font-size: 16px; font-weight: 900; color: #32101A; margin: 0 0 3px; }
      .gs-section-sub { font-size: 12px; color: #796A62; margin: 0 0 12px; line-height: 1.7; }

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

      .gs-mini-chips { display: flex; flex-wrap: wrap; gap: 5px; }
      .gs-mini-chip { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 99px; background: rgba(184,160,130,0.14); color: #6B1E2D; font-size: 11px; font-weight: 800; white-space: nowrap; }

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

      .gs-inprogress-list { display: flex; flex-direction: column; gap: 8px; }
      .gs-inprogress-row { display: grid; grid-template-columns: minmax(140px,1fr) auto auto minmax(140px,220px) auto; gap: 12px; align-items: center;
        background: #FFFBF5; border: 1px solid rgba(184,160,130,0.28); border-radius: 12px; padding: 12px 14px; }
      .gs-inprogress-who { min-width: 0; }
      .gs-inprogress-bar-wrap { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .gs-inprogress-bar-bg { height: 6px; border-radius: 99px; background: rgba(184,160,130,0.16); overflow: hidden; }
      .gs-inprogress-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#B8A082,#6B1E2D); transition: width .4s ease; }
      .gs-inprogress-bar-wrap span { font-size: 10.5px; font-weight: 800; color: #6B1E2D; }
      .gs-inprogress-when { display: inline-flex; align-items: center; gap: 4px; color: #8C8274; font-size: 11px; white-space: nowrap; }
      @media(max-width:760px){ .gs-inprogress-row{grid-template-columns:1fr auto;row-gap:6px} .gs-inprogress-bar-wrap{grid-column:1/-1}.gs-inprogress-when{grid-column:1/-1} }

      .gs-mini-history { margin-bottom: 20px; }
      .gs-mini-list { display: flex; flex-direction: column; gap: 8px; }
      .gs-mini-entry { display: grid; grid-template-columns: minmax(140px,1fr) auto auto 1fr auto; gap: 10px; align-items: center;
        background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 12px; padding: 11px 14px; font-size: 12.5px; }
      .gs-mini-entry-game { font-weight: 800; color: #32101A; }
      .gs-mini-entry-score { font-weight: 900; color: #6B1E2D; font-variant-numeric: tabular-nums; }
      .gs-mini-entry-result { padding: 2px 9px; border-radius: 99px; background: rgba(26,26,26,0.06); color: #655B53; font-size: 10.5px; font-weight: 800; white-space: nowrap; }
      .gs-mini-entry-result.won { background: rgba(27,94,32,0.13); color: #1B5E20; }
      .gs-mini-entry-meta { color: #796A62; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gs-mini-entry-when { color: #8C8274; font-size: 11px; white-space: nowrap; }
      @media(max-width:640px){ .gs-mini-entry{grid-template-columns:1fr auto;row-gap:5px} .gs-mini-entry-meta{grid-column:1/-1}.gs-mini-entry-when{grid-column:1/-1} }

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
