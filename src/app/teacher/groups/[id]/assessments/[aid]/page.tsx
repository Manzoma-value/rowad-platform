"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import RowadDistributor from "@/components/RowadDistributor";
import {
  TRAITS, ASSESS_UI, derive, averageTuples, pickAssessLang,
  type ScoresTuple,
} from "@/lib/rowad-assessment";

type Member = { teacher_id: string; profile: { full_name: string }; is_self: boolean };
type Given  = { target_teacher_id: string; s_lineage: number; s_atonement: number; s_awareness: number; s_zeal: number; s_distinct: number; updated_at: string };
type Received = {
  rater_teacher_id: string; rater_name: string; is_self: boolean;
  s_lineage: number; s_atonement: number; s_awareness: number; s_zeal: number; s_distinct: number;
  updated_at: string;
};
type AssessmentData = {
  id: string; title: string; status: "OPEN" | "CLOSED";
  group: { id: string; name: string; description: string | null };
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

const EMPTY_SCORES: ScoresTuple = [20, 20, 20, 20, 20];

/** Reorder members so the "self" entry is always first (matches the
 *  methodology: the supervisor rates themselves before their colleagues). */
function membersSelfFirst<T extends { is_self: boolean }>(list: T[]): T[] {
  const self = list.find((m) => m.is_self);
  const others = list.filter((m) => !m.is_self);
  return self ? [self, ...others] : list;
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
      // Seed sliders from existing ratings, default to [20,20,20,20,20]
      const map: Record<string, ScoresTuple> = {};
      const sav: Record<string, "saved"> = {};
      for (const m of a.members) {
        const g = a.my_ratings_given.find((x) => x.target_teacher_id === m.teacher_id);
        if (g) {
          const t: ScoresTuple = [g.s_lineage, g.s_atonement, g.s_awareness, g.s_zeal, g.s_distinct];
          map[m.teacher_id] = t;
          lastSaved.current[m.teacher_id] = t.join(",");
          sav[m.teacher_id] = "saved";
        } else {
          map[m.teacher_id] = [...EMPTY_SCORES];
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
        body: JSON.stringify({
          s_lineage:   next[0],
          s_atonement: next[1],
          s_awareness: next[2],
          s_zeal:      next[3],
          s_distinct:  next[4],
        }),
      });
      if (!r.ok) { setSaveState((prev) => ({ ...prev, [targetId]: "err" })); return; }
      lastSaved.current[targetId] = sig;
      setSaveState((prev) => ({ ...prev, [targetId]: "saved" }));
    } catch {
      setSaveState((prev) => ({ ...prev, [targetId]: "err" }));
    }
  }, [id, aid]);

  // ── My received panel: compute average across all rows, then derive.
  const received = useMemo(() => data?.my_ratings_received ?? [], [data?.my_ratings_received]);
  const avg = useMemo(
    () => averageTuples(received.map((r) => [r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct])),
    [received],
  );
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
      <div style={{ padding: 40, textAlign: "center", color: "#7A1E1E", fontWeight: 800, fontFamily: "'Cairo',sans-serif" }} dir={dir}>
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
        const scores = scoresByTarget[current.teacher_id] ?? [...EMPTY_SCORES];
        const state = saveState[current.teacher_id];
        const total = scores[0] + scores[1] + scores[2] + scores[3] + scores[4];
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
                  <strong>{avgDerive.hasCore && avgDerive.coreIdx !== null ? TRAITS[avgDerive.coreIdx][L] : AT.noCore}</strong>
                </div>
                <div className="ap-result-chip ap-result-coll">
                  <span>{AT.collectiveLabel}</span>
                  <strong>{TRAITS[avgDerive.collectiveIdx][L]} · {avg[avgDerive.collectiveIdx].toFixed(1)}</strong>
                </div>
              </div>
              <div className="ap-bars ap-bars-compact">
                {TRAITS.map((t, i) => {
                  const v = avg[i];
                  const isCore = avgDerive.coreIdx === i && avgDerive.hasCore;
                  const isCollective = avgDerive.collectiveIdx === i;
                  return (
                    <div key={t.key} className={`ap-bar ${isCore ? "ap-core" : isCollective ? "ap-coll" : ""}`}>
                      <span className="ap-bar-name">{t[L]}</span>
                      <div className="ap-bar-track">
                        <span className="ap-bar-fill" style={{ width: `${Math.min(100, v)}%`, background: t.color }} />
                      </div>
                      <span className="ap-bar-val">{v.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="ap-avg-derived">
                <span><strong>{AT.supportingLabel}:</strong> {avgDerive.supportingIdxs.map((i) => TRAITS[i][L]).join(L === "ar" ? "، " : ", ")}</span>
              </div>
            </div>
          )}
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>{T.raterCol}</th>
                  {TRAITS.map((t) => <th key={t.key}>{t[L]}</th>)}
                </tr>
              </thead>
              <tbody>
                {received.map((r) => {
                  const tuple: ScoresTuple = [r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct];
                  const d = derive(tuple);
                  return (
                    <tr key={r.rater_teacher_id}>
                      <td className="ap-rater-cell">
                        {r.is_self ? <span className="ap-self-row">{AT.selfBy(r.rater_name)}</span> : r.rater_name}
                      </td>
                      {tuple.map((v, i) => {
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
        .ap-back { display: inline-block; color: #6B4F1E; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 14px; }
        .ap-back:hover { text-decoration: underline; }
        .ap-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid rgba(184,155,94,0.32); }
        .ap-eyebrow { font-size: 11.5px; font-weight: 800; color: #8B6915; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 4px; }
        .ap-title { font-size: 24px; font-weight: 900; color: #1B1810; margin: 0; line-height: 1.3; }
        .ap-locked { background: rgba(8,11,12,0.08); color: #5E5A52; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 800; }

        .ap-overview { display: grid; grid-template-columns: 1.35fr repeat(3, minmax(130px, .65fr)); gap: 12px; margin: 0 0 22px; }
        @media (max-width: 900px) { .ap-overview { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 560px) { .ap-overview { grid-template-columns: 1fr; } }
        .ap-progress-card {
          min-height: 104px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;
          padding: 16px; border-radius: 16px; background: linear-gradient(150deg,#FFFDF8,#F7EFD9);
          border: 1px solid rgba(184,155,94,0.34); box-shadow: 0 14px 30px rgba(91,64,18,0.07);
        }
        .ap-progress-main { background: linear-gradient(135deg,#11151A,#2D2414); color: #F8E8B8; border-color: rgba(229,185,60,0.24); }
        .ap-card-kicker { display: block; font-size: 11px; font-weight: 900; color: #8B6915; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 4px; }
        .ap-progress-main .ap-card-kicker { color: rgba(248,232,184,.72); }
        .ap-progress-card strong { font-size: 34px; line-height: 1; font-weight: 900; color: #1B1810; }
        .ap-progress-main strong { color: #E5B93C; }
        .ap-progress-card small { color: #6B6256; font-size: 12px; font-weight: 800; }
        .ap-progress-main small { color: rgba(248,232,184,.72); }
        .ap-progress-track { height: 10px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.12); }
        .ap-progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#E5B93C,#FFF2B9); transition: width .35s ease; }

        .ap-section { margin-top: 28px; }
        .ap-section-h { font-size: 18px; font-weight: 900; color: #1B1810; margin: 0 0 6px; }
        .ap-section-sub { font-size: 13px; color: #5E5A52; margin: 0 0 14px; line-height: 1.85; }

        /* ─── Focused carousel (one target at a time) ─── */
        .ap-carousel-section { margin-top: 16px; }
        .ap-carousel-nav {
          display: grid; grid-template-columns: 56px 1fr 56px; align-items: center; gap: 10px;
          margin: 8px 0 10px;
        }
        .ap-cbtn {
          height: 56px; border-radius: 14px;
          background: #FFFDF8; border: 1.5px solid rgba(184,155,94,0.40);
          color: #6B4F1E; font-size: 28px; font-weight: 900; cursor: pointer;
          transition: all .15s;
        }
        .ap-cbtn:hover:not(:disabled) { background: #FBF4E0; transform: scale(1.03); }
        .ap-cbtn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ap-cur-card {
          background: linear-gradient(165deg,#FCF6E6,#F4EBD3);
          border: 1.5px solid rgba(184,155,94,0.40);
          border-radius: 14px; padding: 10px 16px;
          display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px;
        }
        .ap-cur-name { font-size: 17px; font-weight: 900; color: #1B1810; display: flex; align-items: center; gap: 8px; }
        .ap-cur-sub { font-size: 11.5px; color: #8B6915; font-weight: 700; grid-column: 1; }
        .ap-cur-card .ap-save { grid-column: 2; grid-row: 1 / span 2; align-self: center; }

        .ap-dots { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; justify-content: center; }
        .ap-dot {
          min-width: 30px; height: 30px; padding: 0 8px; border-radius: 8px;
          background: #FFF; border: 1.5px solid rgba(184,155,94,0.32);
          color: #6B4F1E; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 800; cursor: pointer;
          transition: all .15s;
        }
        .ap-dot:hover { border-color: #B89B5E; }
        .ap-dot.on { background: #0B0B0C; color: #E5B93C; border-color: transparent; transform: scale(1.05); }
        .ap-dot.done { background: rgba(76,107,60,0.14); color: #4C6B3C; border-color: rgba(76,107,60,0.32); }
        .ap-dot.done.on { background: #4C6B3C; color: #FFFDF8; }
        .ap-dot.self { border-color: rgba(122,30,30,0.35); color: #7A1E1E; }
        .ap-dot.self.on { background: #7A1E1E; color: #FFFDF8; }

        .ap-focus { display: block; }
        .ap-focus-main { min-width: 0; }

        .ap-focus-side {
          background: #FFFDF8; border: 1px solid rgba(184,155,94,0.28); border-radius: 14px;
          padding: 14px;
          display: flex; flex-direction: column; gap: 10px;
          align-self: start; position: sticky; top: 12px;
        }
        .ap-side-h { font-size: 13px; font-weight: 900; color: #1B1810; margin: 0; letter-spacing: .02em; }
        .ap-side-empty { padding: 22px; text-align: center; color: #8A8478; font-weight: 700; font-size: 12px; background: rgba(194,160,89,0.04); border: 1px dashed rgba(184,155,94,0.32); border-radius: 10px; }
        .ap-side-hero { display: grid; grid-template-columns: 1fr; gap: 6px; }
        .ap-side-chip { background: #FFF; border: 1.5px solid rgba(184,155,94,0.28); border-radius: 10px; padding: 8px 12px; }
        .ap-side-chip span { display: block; font-size: 9.5px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: #6B4F1E; margin-bottom: 3px; }
        .ap-side-chip strong { display: block; font-size: 14px; font-weight: 900; color: #1B1810; }
        .ap-side-core { border-color: rgba(122,30,30,0.35); background: linear-gradient(160deg,rgba(122,30,30,0.08),#FFF); }
        .ap-side-core span { color: #7A1E1E; }
        .ap-side-coll { border-color: rgba(199,154,61,0.46); background: linear-gradient(160deg,rgba(199,154,61,0.14),#FFF); }
        .ap-side-coll span { color: #8E6C36; }
        .ap-side-bars { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; border-top: 1px dashed rgba(184,155,94,0.32); }
        .ap-side-bar { display: grid; grid-template-columns: 78px 1fr 34px; align-items: center; gap: 6px; }
        .ap-side-bar-n { font-size: 11px; font-weight: 700; color: #2E2210; }
        .ap-side-bar.core .ap-side-bar-n { color: #7A1E1E; font-weight: 900; }
        .ap-side-bar.coll .ap-side-bar-n { color: #8E6C36; font-weight: 900; }
        .ap-side-bar-track { height: 6px; background: rgba(194,160,89,0.18); border-radius: 99px; overflow: hidden; }
        .ap-side-bar-fill { height: 100%; border-radius: 99px; transition: width .25s; }
        .ap-side-bar-v { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; font-weight: 800; color: #1B1810; text-align: center; }
        .ap-side-count { font-size: 11px; color: #8B6915; font-weight: 700; text-align: center; padding-top: 4px; border-top: 1px dashed rgba(184,155,94,0.32); }

        /* legacy grid — retained for print/backup only */
        .ap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px,1fr)); gap: 16px; }
        @media (max-width: 760px) { .ap-grid { grid-template-columns: 1fr; } }
        .ap-target { background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; padding: 14px; }
        .ap-target-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; position: sticky; top: 0; z-index: 2; background: rgba(255,253,248,.92); backdrop-filter: blur(8px); padding: 2px 0 8px; }
        .ap-target-name { font-size: 14.5px; font-weight: 900; color: #1B1810; display: flex; align-items: center; gap: 8px; }
        .ap-target-step { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; background: #0B0B0C; color: #E5B93C; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 900; }
        .ap-self-tag { font-size: 10.5px; padding: 2px 10px; background: rgba(122,30,30,0.10); color: #7A1E1E; border-radius: 99px; font-weight: 800; }
        .ap-save { font-size: 11.5px; font-weight: 800; padding: 4px 10px; border-radius: 99px; }
        .ap-save-saved  { background: rgba(76,107,60,0.14); color: #4C6B3C; }
        .ap-save-saving { background: rgba(199,154,61,0.16); color: #8E6C36; }
        .ap-save-err    { background: rgba(163,59,46,0.12); color: #A33B2E; }
        .ap-save-dirty  { background: rgba(8,11,12,0.06); color: #6B6256; }

        .ap-empty { padding: 40px; text-align: center; color: #8A8478; font-weight: 700; background: rgba(194,160,89,0.04); border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; }

        .ap-avg-card { background: linear-gradient(165deg,#FCF6E6,#F4EBD3); border: 1.5px solid rgba(184,155,94,0.40); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
        .ap-avg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ap-avg-head strong { color: #1B1810; font-size: 13px; font-weight: 900; }
        .ap-avg-label { font-size: 12px; font-weight: 800; color: #6B4F1E; letter-spacing: .04em; text-transform: uppercase; }
        .ap-result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        @media (max-width: 620px) { .ap-result-hero { grid-template-columns: 1fr; } }
        .ap-result-chip { border-radius: 14px; padding: 14px; background: #FFFDF8; border: 1.5px solid rgba(184,155,94,.30); }
        .ap-result-chip span { display: block; font-size: 10.5px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 5px; }
        .ap-result-chip strong { display: block; font-size: 18px; font-weight: 900; color: #1B1810; line-height: 1.4; }
        .ap-result-core { border-color: rgba(122,30,30,.34); background: linear-gradient(160deg,rgba(122,30,30,.08),#FFFDF8); }
        .ap-result-core span { color: #7A1E1E; }
        .ap-result-coll { border-color: rgba(199,154,61,.46); background: linear-gradient(160deg,rgba(199,154,61,.16),#FFFDF8); }
        .ap-result-coll span { color: #8E6C36; }
        .ap-bars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .ap-bars-compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
        @media (max-width: 760px) { .ap-bars-compact { grid-template-columns: 1fr; } }
        .ap-bar { display: grid; grid-template-columns: 110px 1fr 50px; align-items: center; gap: 10px; }
        @media (max-width: 540px) { .ap-bar { grid-template-columns: 90px 1fr 44px; gap: 6px; } }
        .ap-bar-name { font-size: 13px; font-weight: 700; color: #1B1810; }
        .ap-bar-track { height: 10px; background: rgba(194,160,89,0.18); border-radius: 99px; overflow: hidden; }
        .ap-bar-fill { display: block; height: 100%; border-radius: 99px; transition: width .25s; }
        .ap-bar-val { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 13px; font-weight: 800; text-align: center; color: #1B1810; }
        .ap-core .ap-bar-name { color: #7A1E1E; font-weight: 900; }
        .ap-coll .ap-bar-name { color: #8E6C36; font-weight: 900; }

        .ap-avg-derived { display: flex; flex-direction: column; gap: 4px; padding-top: 10px; border-top: 1px dashed rgba(184,155,94,0.32); font-size: 12.5px; color: #2E2210; line-height: 1.8; }
        .ap-avg-derived strong { color: #6B4F1E; font-weight: 800; }

        .ap-table-wrap { overflow-x: auto; border: 1px solid rgba(8,11,12,0.08); border-radius: 12px; background: #FFFDF8; }
        .ap-table { width: 100%; border-collapse: collapse; min-width: 560px; }
        .ap-table th { background: rgba(194,160,89,0.10); color: #6B4F1E; font-size: 11px; font-weight: 800; padding: 10px 8px; text-align: center; letter-spacing: .04em; text-transform: uppercase; border-bottom: 1px solid rgba(184,155,94,0.32); }
        .ap-table th:first-child { text-align: start; padding-inline-start: 14px; min-width: 160px; }
        .ap-table td { padding: 11px 8px; font-size: 13px; text-align: center; border-bottom: 1px solid rgba(8,11,12,0.06); font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; }
        .ap-table tr:last-child td { border-bottom: none; }
        .ap-rater-cell { font-family: 'Cairo', sans-serif !important; font-weight: 800 !important; text-align: start !important; padding-inline-start: 14px !important; color: #1B1810; }
        .ap-self-row { color: #7A1E1E; }
        .ap-cell-core { background: rgba(122,30,30,0.08); color: #7A1E1E; }
        .ap-cell-coll { background: rgba(199,154,61,0.14); color: #8E6C36; }
      `}</style>
    </div>
  );
}
