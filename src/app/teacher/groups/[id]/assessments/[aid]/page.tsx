"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import RowadDistributor from "@/components/RowadDistributor";
import {
  ASSESS_UI, derive, averageTuples, pickAssessLang,
  type ScoresTuple,
} from "@/lib/rowad-assessment";

type Trait = { position: number; label_ar: string; label_sq: string; statement_ar: string; statement_sq: string; color: string };
type Member = { teacher_id: string; profile: { full_name: string }; is_self: boolean };
type Given  = { target_teacher_id: string; scores: ScoresTuple; updated_at: string };
type Received = {
  rater_teacher_id: string; rater_name: string; is_self: boolean;
  scores: ScoresTuple; updated_at: string;
};
type AssessmentData = {
  id: string; title: string; status: "OPEN" | "CLOSED";
  group: { id: string; name: string; description: string | null };
  traits: Trait[];
  members: Member[];
  my_ratings_given: Given[];
  my_ratings_received: Received[];
};

const UI = {
  ar: {
    back: "← العودة للمجموعة",
    locked: "هذا التقييم مغلق — العرض فقط.",
    sectionRate: "تقييم أعضاء المجموعة",
    sectionRateSub: "وزّع 100 درجة على كل عضو (بما فيهم نفسك). يُحفظ تلقائيًا عند تحقّق المجموع 100.",
    targetSelf: "أنا",
    saved: "✓ محفوظ",
    notSavedYet: "لم يُحفظ بعد — يجب أن يصل المجموع 100",
    saving: "جارٍ الحفظ…",
    saveErr: "تعذّر الحفظ",
    sectionMine: "ما تلقّيته من تقييمات",
    mineEmpty: "لم يقم أحد بتقييمك بعد.",
    average: "المتوسط",
    averageOf: (n: number) => `متوسط ${n} تقييم${n === 1 ? "" : "ات"}`,
    raterCol: "المُقَيِّم",
    tableHelp: "كل صف يمثّل تقييم شخص لك. الصف العلوي هو متوسط الكل.",
  },
  sq: {
    back: "← Kthehu te grupi",
    locked: "Ky vlerësim është i mbyllur — vetëm shikim.",
    sectionRate: "Vlerëso anëtarët e grupit",
    sectionRateSub: "Shpërndaj 100 pikë për secilin anëtar (përfshirë veten). Ruhet automatikisht kur shuma arrin 100.",
    targetSelf: "Unë",
    saved: "✓ U ruajt",
    notSavedYet: "Nuk u ruajt ende — shuma duhet të jetë 100",
    saving: "Po ruhet…",
    saveErr: "Ruajtja dështoi",
    sectionMine: "Vlerësimet që ke marrë",
    mineEmpty: "Askush nuk të ka vlerësuar ende.",
    average: "Mesatarja",
    averageOf: (n: number) => `Mesatare e ${n} vlerësime`,
    raterCol: "Vlerësuesi",
    tableHelp: "Çdo rresht është një vlerësim që dikush ka dhënë për ty. Rreshti i parë është mesatarja.",
  },
} as const;

/** Reorder members so the "self" entry is always first (matches the
 *  methodology: the supervisor rates themselves before their colleagues). */
function membersSelfFirst<T extends { is_self: boolean }>(list: T[]): T[] {
  const self = list.find((m) => m.is_self);
  const others = list.filter((m) => !m.is_self);
  return self ? [self, ...others] : list;
}

function traitLabel(t: Trait, lang: "ar" | "sq") { return lang === "ar" ? t.label_ar : t.label_sq; }
function traitStatement(t: Trait, lang: "ar" | "sq") { return lang === "ar" ? t.statement_ar : t.statement_sq; }
function evenSplit(n: number): ScoresTuple {
  if (n <= 0) return [];
  const base = Math.floor(100 / n);
  const arr = new Array(n).fill(base);
  arr[0] += 100 - base * n;
  return arr;
}

export default function AssessmentPage({ params }: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = use(params);
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const AT = ASSESS_UI[L];
  const UX = {
    readyToSave: L === "ar" ? "جاهز للحفظ - اترك المؤشر أو اخرج من الرقم" : "Gati per ruajtje - lesho rreshqitesin ose dil nga numri",
    progressTitle: L === "ar" ? "تقدمك في التقييم" : "Progresi yt",
    completed: L === "ar" ? "مكتمل" : "Te plota",
    pending: L === "ar" ? "متبقي" : "Te mbetura",
    receivedCount: L === "ar" ? "تقييمات وصلتك" : "Vleresime te marra",
    coreNow: L === "ar" ? "القراءة الحالية" : "Leximi aktual",
    noCoreYet: L === "ar" ? "لا توجد قراءة بعد" : "Ende pa lexim",
    prev:      L === "ar" ? "السابق" : "Prapa",
    next:      L === "ar" ? "التالي" : "Tjetri",
    memberOf:  (i: number, n: number) => L === "ar" ? `${i} من ${n}` : `${i} nga ${n}`,
  };
  const dir = L === "ar" ? "rtl" : "ltr";

  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  // One-target-at-a-time carousel — self first.
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scoresByTarget, setScoresByTarget] = useState<Record<string, ScoresTuple>>({});
  const [saveState, setSaveState] = useState<Record<string, "saved" | "saving" | "err" | "dirty">>({});
  const lastSaved = useRef<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/teacher/groups/${id}/assessments/${aid}`, { cache: "no-store" });
      if (!r.ok) { setData(null); return; }
      const d = await r.json();
      const a: AssessmentData = d?.assessment;
      setData(a);
      const emptyScores = evenSplit(a.traits.length);
      const map: Record<string, ScoresTuple> = {};
      const sav: Record<string, "saved"> = {};
      for (const m of a.members) {
        const g = a.my_ratings_given.find((x) => x.target_teacher_id === m.teacher_id);
        if (g) {
          map[m.teacher_id] = g.scores;
          lastSaved.current[m.teacher_id] = g.scores.join(",");
          sav[m.teacher_id] = "saved";
        } else {
          map[m.teacher_id] = [...emptyScores];
        }
      }
      setScoresByTarget(map);
      setSaveState(sav);
    } finally { setLoading(false); }
  }, [id, aid]);

  useEffect(() => { reload(); }, [reload]);

  function onChange(targetId: string, next: ScoresTuple) {
    setScoresByTarget((prev) => ({ ...prev, [targetId]: next }));
    setSaveState((prev) => ({ ...prev, [targetId]: "dirty" }));
  }

  const persist = useCallback(async (targetId: string, next: ScoresTuple) => {
    const sig = next.join(",");
    if (lastSaved.current[targetId] === sig) return;
    setSaveState((prev) => ({ ...prev, [targetId]: "saving" }));
    try {
      const r = await fetch(`/api/teacher/groups/${id}/assessments/${aid}/ratings/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: next }),
      });
      if (!r.ok) { setSaveState((prev) => ({ ...prev, [targetId]: "err" })); return; }
      lastSaved.current[targetId] = sig;
      setSaveState((prev) => ({ ...prev, [targetId]: "saved" }));
    } catch {
      setSaveState((prev) => ({ ...prev, [targetId]: "err" }));
    }
  }, [id, aid]);

  const traits = useMemo(() => data?.traits ?? [], [data?.traits]);
  const distributorTraits = useMemo(
    () => traits.map((t) => ({ label: traitLabel(t, L), statement: traitStatement(t, L), color: t.color })),
    [traits, L],
  );

  // ── My received panel: compute average across all rows, then derive.
  const received = useMemo(() => data?.my_ratings_received ?? [], [data?.my_ratings_received]);
  const avg = useMemo(() => averageTuples(received.map((r) => r.scores)), [received]);
  const avgDerive = avg ? derive(avg) : null;
  const completedCount = useMemo(() => {
    if (!data) return 0;
    return data.members.filter((m) => saveState[m.teacher_id] === "saved").length;
  }, [data, saveState]);
  const memberCount = data?.members.length ?? 0;
  const completionPct = memberCount > 0 ? Math.round((completedCount / memberCount) * 100) : 0;

  if (loading) return <MandalaLoader />;
  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6B1E2D", fontWeight: 800, fontFamily: "'Cairo',sans-serif" }} dir={dir}>
        {L === "ar" ? "تعذّر تحميل التقييم." : "Vlerësimi nuk u ngarkua."}
      </div>
    );
  }

  const locked = data.status === "CLOSED";

  return (
    <div className="ap" dir={dir}>
      <Link href={`/teacher/groups/${id}`} className="ap-back">{T.back}</Link>

      <header className="ap-head">
        <div className="ap-head-text">
          <p className="ap-eyebrow">{data.group.name}</p>
          <h1 className="ap-title">{data.title}</h1>
        </div>
        {locked && <div className="ap-locked">{T.locked}</div>}
      </header>

      <section className="ap-overview" aria-label={UX.progressTitle}>
        <div className="ap-progress-card ap-progress-main">
          <div>
            <span className="ap-card-kicker">{UX.progressTitle}</span>
            <strong>{completionPct}%</strong>
          </div>
          <div className="ap-progress-track">
            <span style={{ width: `${completionPct}%` }} />
          </div>
        </div>
        <div className="ap-progress-card">
          <span className="ap-card-kicker">{UX.completed}</span>
          <strong>{completedCount}</strong>
          <small>/ {memberCount}</small>
        </div>
        <div className="ap-progress-card">
          <span className="ap-card-kicker">{UX.pending}</span>
          <strong>{Math.max(0, memberCount - completedCount)}</strong>
          <small>/ {memberCount}</small>
        </div>
        <div className="ap-progress-card">
          <span className="ap-card-kicker">{UX.receivedCount}</span>
          <strong>{received.length}</strong>
          <small>{avg && avgDerive ? UX.coreNow : UX.noCoreYet}</small>
        </div>
      </section>

      {/* ── Focused carousel — one target at a time, self ("انا") first. ── */}
      {(() => {
        const orderedMembers = membersSelfFirst(data.members);
        const safeIdx = Math.min(Math.max(0, currentIdx), Math.max(0, orderedMembers.length - 1));
        const current = orderedMembers[safeIdx];
        if (!current) return null;
        const scores = scoresByTarget[current.teacher_id] ?? evenSplit(traits.length);
        const state = saveState[current.teacher_id];
        const total = scores.reduce((a, b) => a + b, 0);
        const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
        const goNext = () => setCurrentIdx((i) => Math.min(orderedMembers.length - 1, i + 1));
        return (
          <section className="ap-section ap-carousel-section">
            <h2 className="ap-section-h">{T.sectionRate}</h2>
            <p className="ap-section-sub">{T.sectionRateSub}</p>

            <div className="ap-carousel-nav">
              <button className="ap-cbtn" onClick={goPrev} disabled={safeIdx === 0} aria-label={UX.prev}>‹</button>
              <div className="ap-cur-card">
                <div className="ap-cur-name">
                  {current.profile.full_name}
                  {current.is_self && <span className="ap-self-tag">{T.targetSelf}</span>}
                </div>
                <div className="ap-cur-sub">{UX.memberOf(safeIdx + 1, orderedMembers.length)}</div>
                <div className={`ap-save ap-save-${state ?? "dirty"}`}>
                  {state === "saving" ? T.saving
                    : state === "err" ? T.saveErr
                    : state === "saved" ? T.saved
                    : total === 100 ? UX.readyToSave
                    : T.notSavedYet}
                </div>
              </div>
              <button className="ap-cbtn" onClick={goNext} disabled={safeIdx === orderedMembers.length - 1} aria-label={UX.next}>›</button>
            </div>

            {/* Dots to jump between members — compact, one row */}
            <div className="ap-dots">
              {orderedMembers.map((m, i) => (
                <button
                  key={m.teacher_id}
                  className={`ap-dot ${i === safeIdx ? "on" : ""} ${saveState[m.teacher_id] === "saved" ? "done" : ""} ${m.is_self ? "self" : ""}`}
                  onClick={() => setCurrentIdx(i)}
                  title={m.profile.full_name}
                  aria-label={m.profile.full_name}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Full-width focus view so completing the current evaluation stays visible. */}
            <div className="ap-focus">
              <div className="ap-focus-main">
                <RowadDistributor
                  traits={distributorTraits}
                  value={scores}
                  lang={L}
                  disabled={locked}
                  onChange={(next) => onChange(current.teacher_id, next)}
                  onCommit={(next) => persist(current.teacher_id, next)}
                />
              </div>
            </div>
          </section>
        );
      })()}

      {/* Per-rater breakdown — kept below the carousel for anyone who wants
          to see each rater's individual scores. Aggregate lives here too,
          below the active scoring flow so it never blocks completion. */}
      {received.length > 0 && (
        <section className="ap-section">
          <h2 className="ap-section-h">{T.sectionMine}</h2>
          <p className="ap-section-sub">{T.tableHelp}</p>
          {avg && avgDerive && (
            <div className="ap-avg-card">
              <div className="ap-avg-head">
                <span className="ap-avg-label">{T.average}</span>
                <strong>{T.averageOf(received.length)}</strong>
              </div>
              <div className="ap-result-hero">
                <div className="ap-result-chip ap-result-core">
                  <span>{AT.coreLabel}</span>
                  <strong>{avgDerive.hasCore && avgDerive.coreIdx !== null ? traitLabel(traits[avgDerive.coreIdx], L) : AT.noCore}</strong>
                </div>
                <div className="ap-result-chip ap-result-coll">
                  <span>{AT.collectiveLabel}</span>
                  <strong>{traitLabel(traits[avgDerive.collectiveIdx], L)} · {avg[avgDerive.collectiveIdx].toFixed(1)}</strong>
                </div>
              </div>
              <div className="ap-bars ap-bars-compact">
                {traits.map((t, i) => {
                  const v = avg[i];
                  const isCore = avgDerive.coreIdx === i && avgDerive.hasCore;
                  const isCollective = avgDerive.collectiveIdx === i;
                  return (
                    <div key={i} className={`ap-bar ${isCore ? "ap-core" : isCollective ? "ap-coll" : ""}`}>
                      <span className="ap-bar-name">{traitLabel(t, L)}</span>
                      <div className="ap-bar-track">
                        <span className="ap-bar-fill" style={{ width: `${Math.min(100, v)}%`, background: t.color }} />
                      </div>
                      <span className="ap-bar-val">{v.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="ap-avg-derived">
                <span><strong>{AT.supportingLabel}:</strong> {avgDerive.supportingIdxs.map((i) => traitLabel(traits[i], L)).join(L === "ar" ? "، " : ", ")}</span>
              </div>
            </div>
          )}
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>{T.raterCol}</th>
                  {traits.map((t, i) => <th key={i}>{traitLabel(t, L)}</th>)}
                </tr>
              </thead>
              <tbody>
                {received.map((r) => {
                  const d = derive(r.scores);
                  return (
                    <tr key={r.rater_teacher_id}>
                      <td className="ap-rater-cell">
                        {r.is_self ? <span className="ap-self-row">{AT.selfBy(r.rater_name)}</span> : r.rater_name}
                      </td>
                      {r.scores.map((v, i) => {
                        const isCore = d.coreIdx === i && d.hasCore;
                        const isCollective = d.collectiveIdx === i;
                        const cls = isCore ? "ap-cell-core" : isCollective ? "ap-cell-coll" : "";
                        return <td key={i} className={cls}>{v}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        .ap { font-family: 'Cairo', sans-serif; padding-bottom: 60px; }
        .ap-back { display: inline-block; color: #6B1E2D; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 14px; }
        .ap-back:hover { text-decoration: underline; }
        .ap-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid rgba(107,30,45,0.32); }
        .ap-eyebrow { font-size: 11.5px; font-weight: 800; color: #8F765B; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 4px; }
        .ap-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0; line-height: 1.3; }
        .ap-locked { background: rgba(26,26,26,0.08); color: #655B53; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 800; }

        .ap-overview { display: grid; grid-template-columns: 1.35fr repeat(3, minmax(130px, .65fr)); gap: 12px; margin: 0 0 22px; }
        @media (max-width: 900px) { .ap-overview { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 560px) { .ap-overview { grid-template-columns: 1fr; } }
        .ap-progress-card {
          min-height: 104px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;
          padding: 16px; border-radius: 16px; background: linear-gradient(150deg,#FFFBF5,#EFEAE0);
          border: 1px solid rgba(107,30,45,0.34); box-shadow: 0 14px 30px rgba(107,30,45,0.07);
        }
        .ap-progress-main { background: linear-gradient(135deg,#32101A,#6B1E2D); color: #E5E0D5; border-color: rgba(184,160,130,0.24); }
        .ap-card-kicker { display: block; font-size: 11px; font-weight: 900; color: #8F765B; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 4px; }
        .ap-progress-main .ap-card-kicker { color: rgba(229,224,213,.72); }
        .ap-progress-card strong { font-size: 34px; line-height: 1; font-weight: 900; color: #32101A; }
        .ap-progress-main strong { color: #B8A082; }
        .ap-progress-card small { color: #655B53; font-size: 12px; font-weight: 800; }
        .ap-progress-main small { color: rgba(229,224,213,.72); }
        .ap-progress-track { height: 10px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.12); }
        .ap-progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#B8A082,#E5E0D5); transition: width .35s ease; }

        .ap-section { margin-top: 28px; }
        .ap-section-h { font-size: 18px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .ap-section-sub { font-size: 13px; color: #655B53; margin: 0 0 14px; line-height: 1.85; }

        /* ─── Focused carousel (one target at a time) ─── */
        .ap-carousel-section { margin-top: 16px; }
        .ap-carousel-nav {
          display: grid; grid-template-columns: 56px 1fr 56px; align-items: center; gap: 10px;
          margin: 8px 0 10px;
        }
        .ap-cbtn {
          height: 56px; border-radius: 14px;
          background: #FFFBF5; border: 1.5px solid rgba(107,30,45,0.40);
          color: #6B1E2D; font-size: 28px; font-weight: 900; cursor: pointer;
          transition: all .15s;
        }
        .ap-cbtn:hover:not(:disabled) { background: #F7F3EB; transform: scale(1.03); }
        .ap-cbtn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ap-cur-card {
          background: linear-gradient(165deg,#FFFBF5,#F7F3EB);
          border: 1.5px solid rgba(107,30,45,0.40);
          border-radius: 14px; padding: 10px 16px;
          display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px;
        }
        .ap-cur-name { font-size: 17px; font-weight: 900; color: #32101A; display: flex; align-items: center; gap: 8px; }
        .ap-cur-sub { font-size: 11.5px; color: #8F765B; font-weight: 700; grid-column: 1; }
        .ap-cur-card .ap-save { grid-column: 2; grid-row: 1 / span 2; align-self: center; }

        .ap-dots { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; justify-content: center; }
        .ap-dot {
          min-width: 30px; height: 30px; padding: 0 8px; border-radius: 8px;
          background: #FFF; border: 1.5px solid rgba(107,30,45,0.32);
          color: #6B1E2D; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 800; cursor: pointer;
          transition: all .15s;
        }
        .ap-dot:hover { border-color: #B8A082; }
        .ap-dot.on { background: #1A1A1A; color: #B8A082; border-color: transparent; transform: scale(1.05); }
        .ap-dot.done { background: rgba(27,94,32,0.14); color: #1B5E20; border-color: rgba(27,94,32,0.32); }
        .ap-dot.done.on { background: #1B5E20; color: #FFFBF5; }
        .ap-dot.self { border-color: rgba(107,30,45,0.35); color: #6B1E2D; }
        .ap-dot.self.on { background: #6B1E2D; color: #FFFBF5; }

        .ap-focus { display: block; }
        .ap-focus-main { min-width: 0; }

        .ap-empty { padding: 40px; text-align: center; color: #8C8274; font-weight: 700; background: rgba(107,30,45,0.04); border: 1px dashed rgba(107,30,45,0.32); border-radius: 12px; }

        .ap-avg-card { background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1.5px solid rgba(107,30,45,0.40); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
        .ap-avg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ap-avg-head strong { color: #32101A; font-size: 13px; font-weight: 900; }
        .ap-avg-label { font-size: 12px; font-weight: 800; color: #6B1E2D; letter-spacing: .04em; text-transform: uppercase; }
        .ap-result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        @media (max-width: 620px) { .ap-result-hero { grid-template-columns: 1fr; } }
        .ap-result-chip { border-radius: 14px; padding: 14px; background: #FFFBF5; border: 1.5px solid rgba(107,30,45,.30); }
        .ap-result-chip span { display: block; font-size: 10.5px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 5px; }
        .ap-result-chip strong { display: block; font-size: 18px; font-weight: 900; color: #32101A; line-height: 1.4; }
        .ap-result-core { border-color: rgba(107,30,45,.34); background: linear-gradient(160deg,rgba(107,30,45,.08),#FFFBF5); }
        .ap-result-core span { color: #6B1E2D; }
        .ap-result-coll { border-color: rgba(107,30,45,.46); background: linear-gradient(160deg,rgba(107,30,45,.16),#FFFBF5); }
        .ap-result-coll span { color: #8F765B; }
        .ap-bars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .ap-bars-compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
        @media (max-width: 760px) { .ap-bars-compact { grid-template-columns: 1fr; } }
        .ap-bar { display: grid; grid-template-columns: 110px 1fr 50px; align-items: center; gap: 10px; }
        @media (max-width: 540px) { .ap-bar { grid-template-columns: 90px 1fr 44px; gap: 6px; } }
        .ap-bar-name { font-size: 13px; font-weight: 700; color: #32101A; }
        .ap-bar-track { height: 10px; background: rgba(107,30,45,0.18); border-radius: 99px; overflow: hidden; }
        .ap-bar-fill { display: block; height: 100%; border-radius: 99px; transition: width .25s; }
        .ap-bar-val { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 13px; font-weight: 800; text-align: center; color: #32101A; }
        .ap-core .ap-bar-name { color: #6B1E2D; font-weight: 900; }
        .ap-coll .ap-bar-name { color: #8F765B; font-weight: 900; }

        .ap-avg-derived { display: flex; flex-direction: column; gap: 4px; padding-top: 10px; border-top: 1px dashed rgba(107,30,45,0.32); font-size: 12.5px; color: #4A0E1C; line-height: 1.8; }
        .ap-avg-derived strong { color: #6B1E2D; font-weight: 800; }

        .ap-table-wrap { overflow-x: auto; border: 1px solid rgba(26,26,26,0.08); border-radius: 12px; background: #FFFBF5; }
        .ap-table { width: 100%; border-collapse: collapse; min-width: 560px; }
        .ap-table th { background: rgba(107,30,45,0.10); color: #6B1E2D; font-size: 11px; font-weight: 800; padding: 10px 8px; text-align: center; letter-spacing: .04em; text-transform: uppercase; border-bottom: 1px solid rgba(107,30,45,0.32); }
        .ap-table th:first-child { text-align: start; padding-inline-start: 14px; min-width: 160px; }
        .ap-table td { padding: 11px 8px; font-size: 13px; text-align: center; border-bottom: 1px solid rgba(26,26,26,0.06); font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; }
        .ap-table tr:last-child td { border-bottom: none; }
        .ap-rater-cell { font-family: 'Cairo', sans-serif !important; font-weight: 800 !important; text-align: start !important; padding-inline-start: 14px !important; color: #32101A; }
        .ap-self-row { color: #6B1E2D; }
        .ap-cell-core { background: rgba(107,30,45,0.08); color: #6B1E2D; }
        .ap-cell-coll { background: rgba(107,30,45,0.14); color: #8F765B; }
      `}</style>
    </div>
  );
}
