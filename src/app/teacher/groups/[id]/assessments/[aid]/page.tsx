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

export default function AssessmentPage({ params }: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = use(params);
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const AT = ASSESS_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Light polling so live updates from others arrive into "my received" panel.
  useEffect(() => {
    if (!data || data.status === "CLOSED") return;
    const i = setInterval(async () => {
      try {
        const r = await fetch(`/api/teacher/groups/${id}/assessments/${aid}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const a: AssessmentData = d?.assessment;
        if (!a) return;
        // Only swap in what the user is NOT actively editing.
        setData((prev) => prev ? { ...prev, status: a.status, my_ratings_received: a.my_ratings_received } : a);
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(i);
  }, [data?.status, id, aid]);

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
  const received = data?.my_ratings_received ?? [];
  const receivedTuples: ScoresTuple[] = received.map((r) => [r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct]);
  const avg = useMemo(() => averageTuples(receivedTuples), [received]);
  const avgDerive = avg ? derive(avg) : null;

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

      <section className="ap-section">
        <h2 className="ap-section-h">{T.sectionRate}</h2>
        <p className="ap-section-sub">{T.sectionRateSub}</p>

        <div className="ap-grid">
          {data.members.map((m) => {
            const scores = scoresByTarget[m.teacher_id] ?? [...EMPTY_SCORES];
            const state = saveState[m.teacher_id];
            const total = scores[0] + scores[1] + scores[2] + scores[3] + scores[4];
            return (
              <div key={m.teacher_id} className="ap-target">
                <header className="ap-target-head">
                  <div className="ap-target-name">
                    {m.profile.full_name}
                    {m.is_self && <span className="ap-self-tag">{T.targetSelf}</span>}
                  </div>
                  <div className={`ap-save ap-save-${state ?? "dirty"}`}>
                    {state === "saving" ? T.saving
                      : state === "err" ? T.saveErr
                      : state === "saved" ? T.saved
                      : total === 100 ? T.saved
                      : T.notSavedYet}
                  </div>
                </header>
                <RowadDistributor
                  value={scores}
                  lang={L}
                  disabled={locked}
                  onChange={(next) => onChange(m.teacher_id, next)}
                  onCommit={(next) => persist(m.teacher_id, next)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="ap-section">
        <h2 className="ap-section-h">{T.sectionMine}</h2>
        <p className="ap-section-sub">{T.tableHelp}</p>

        {received.length === 0 ? (
          <div className="ap-empty">{T.mineEmpty}</div>
        ) : (
          <div className="ap-mine">
            {avg && avgDerive && (
              <div className="ap-avg-card">
                <div className="ap-avg-head">
                  <span className="ap-avg-label">{T.averageOf(received.length)}</span>
                </div>
                <div className="ap-bars">
                  {TRAITS.map((t, i) => {
                    const v = avg[i];
                    const isCore = avgDerive.coreIdx === i && avgDerive.hasCore;
                    const isCollective = avgDerive.collectiveIdx === i;
                    return (
                      <div key={t.key} className={`ap-bar ${isCore ? "ap-core" : isCollective ? "ap-coll" : ""}`}>
                        <span className="ap-bar-name">{t[L]}</span>
                        <div className="ap-bar-track">
                          <div className="ap-bar-fill" style={{ width: `${Math.min(100, v)}%`, background: t.color }} />
                        </div>
                        <span className="ap-bar-val">{v.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="ap-avg-derived">
                  <div><strong>{AT.coreLabel}:</strong> {avgDerive.hasCore && avgDerive.coreIdx !== null ? TRAITS[avgDerive.coreIdx][L] : AT.noCore}</div>
                  <div><strong>{AT.collectiveLabel}:</strong> {TRAITS[avgDerive.collectiveIdx][L]}</div>
                  <div><strong>{AT.supportingLabel}:</strong> {avgDerive.supportingIdxs.map((i) => TRAITS[i][L]).join(L === "ar" ? "، " : ", ")}</div>
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
          </div>
        )}
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        .ap { font-family: 'Cairo', sans-serif; padding-bottom: 60px; }
        .ap-back { display: inline-block; color: #6B4F1E; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 14px; }
        .ap-back:hover { text-decoration: underline; }
        .ap-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid rgba(184,155,94,0.32); }
        .ap-eyebrow { font-size: 11.5px; font-weight: 800; color: #8B6915; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 4px; }
        .ap-title { font-size: 24px; font-weight: 900; color: #1B1810; margin: 0; line-height: 1.3; }
        .ap-locked { background: rgba(8,11,12,0.08); color: #5E5A52; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 800; }

        .ap-section { margin-top: 28px; }
        .ap-section-h { font-size: 18px; font-weight: 900; color: #1B1810; margin: 0 0 6px; }
        .ap-section-sub { font-size: 13px; color: #5E5A52; margin: 0 0 14px; line-height: 1.85; }

        .ap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px,1fr)); gap: 16px; }
        @media (max-width: 760px) { .ap-grid { grid-template-columns: 1fr; } }
        .ap-target { background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; padding: 14px; }
        .ap-target-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
        .ap-target-name { font-size: 14.5px; font-weight: 900; color: #1B1810; display: flex; align-items: center; gap: 8px; }
        .ap-self-tag { font-size: 10.5px; padding: 2px 10px; background: rgba(122,30,30,0.10); color: #7A1E1E; border-radius: 99px; font-weight: 800; }
        .ap-save { font-size: 11.5px; font-weight: 800; padding: 4px 10px; border-radius: 99px; }
        .ap-save-saved  { background: rgba(76,107,60,0.14); color: #4C6B3C; }
        .ap-save-saving { background: rgba(199,154,61,0.16); color: #8E6C36; }
        .ap-save-err    { background: rgba(163,59,46,0.12); color: #A33B2E; }
        .ap-save-dirty  { background: rgba(8,11,12,0.06); color: #6B6256; }

        .ap-empty { padding: 40px; text-align: center; color: #8A8478; font-weight: 700; background: rgba(194,160,89,0.04); border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; }

        .ap-avg-card { background: linear-gradient(165deg,#FCF6E6,#F4EBD3); border: 1.5px solid rgba(184,155,94,0.40); border-radius: 14px; padding: 18px; margin-bottom: 14px; }
        .ap-avg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ap-avg-label { font-size: 12px; font-weight: 800; color: #6B4F1E; letter-spacing: .04em; text-transform: uppercase; }
        .ap-bars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .ap-bar { display: grid; grid-template-columns: 110px 1fr 50px; align-items: center; gap: 10px; }
        @media (max-width: 540px) { .ap-bar { grid-template-columns: 90px 1fr 44px; gap: 6px; } }
        .ap-bar-name { font-size: 13px; font-weight: 700; color: #1B1810; }
        .ap-bar-track { height: 10px; background: rgba(194,160,89,0.18); border-radius: 99px; overflow: hidden; }
        .ap-bar-fill { height: 100%; border-radius: 99px; transition: width .25s; }
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
