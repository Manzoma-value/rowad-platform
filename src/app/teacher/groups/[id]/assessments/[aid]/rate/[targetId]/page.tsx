"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import RowadDistributor, { type DistributorTrait } from "@/components/RowadDistributor";
import { seedFromString } from "@/lib/trait-spectrum";
import { pickAssessLang, isValid100, type ScoresTuple } from "@/lib/rowad-assessment";
import {
  useAssessmentData, traitLabel, traitStatement, membersSelfFirst, evenSplit,
} from "../../useAssessmentData";

const UI = {
  ar: {
    back: "← العودة لأعضاء المجموعة",
    locked: "هذا التقييم مغلق — العرض فقط.",
    targetSelf: "أنا",
    memberOf: (i: number, n: number) => `${i} من ${n}`,
    instructions: "وزّع 100 نقطة بالضبط على السمات وفق حضورها النسبي لدى هذا العضو. هذه خريطة تطويرية وليست درجة نجاح أو حكمًا نهائيًا.",
    saved: "✓ محفوظ",
    notSavedYet: "لم يُحفظ بعد — يجب أن يصل المجموع 100",
    saving: "جارٍ الحفظ…",
    saveErr: "تعذّر الحفظ",
    readyToSave: "جاهز للحفظ — اترك المؤشر أو اخرج من الرقم",
    prevMember: "السابق",
    nextMember: "التالي",
    nextUnrated: "التالي غير المُقيَّم",
    allDone: "أنجزت تقييم جميع أعضاء المجموعة 🎉",
    backToGrid: "العودة إلى قائمة الأعضاء",
    notFound: "تعذّر إيجاد هذا العضو ضمن المجموعة.",
    loadError: "تعذّر تحميل التقييم.",
    stepTitle: "وزّع النقاط",
    remaining: (n: number) => `بقي ${n} للوصول إلى 100`,
    exceeded: (n: number) => `خفّض ${n} للعودة إلى 100`,
    complete: "اكتمل التوزيع — سيتم الحفظ تلقائياً",
  },
  sq: {
    back: "← Kthehu te anëtarët e grupit",
    locked: "Ky vlerësim është i mbyllur — vetëm shikim.",
    targetSelf: "Unë",
    memberOf: (i: number, n: number) => `${i} nga ${n}`,
    instructions: "Shpërndaj saktësisht 100 pikë sipas pranisë relative të tipareve tek ky anëtar. Kjo është hartë zhvillimi, jo notë suksesi apo gjykim përfundimtar.",
    saved: "✓ U ruajt",
    notSavedYet: "Nuk u ruajt ende — shuma duhet të jetë 100",
    saving: "Po ruhet…",
    saveErr: "Ruajtja dështoi",
    readyToSave: "Gati për ruajtje — lësho rrëshqitësin ose dil nga numri",
    prevMember: "Prapa",
    nextMember: "Tjetri",
    nextUnrated: "Tjetri i pavlerësuar",
    allDone: "Vlerësove të gjithë anëtarët e grupit 🎉",
    backToGrid: "Kthehu te lista e anëtarëve",
    notFound: "Ky anëtar nuk u gjet në grup.",
    loadError: "Vlerësimi nuk u ngarkua.",
    stepTitle: "Shpërndaj pikët",
    remaining: (n: number) => `Mbeten ${n} për të arritur 100`,
    exceeded: (n: number) => `Ul ${n} për t'u kthyer në 100`,
    complete: "Shpërndarja u plotësua — ruhet automatikisht",
  },
} as const;

type SaveState = "saved" | "saving" | "err" | "dirty";

/** Owns the live scores + save state for exactly one target. Mounted with
 *  `key={targetId}` by the parent so switching targets gives it a fresh,
 *  correctly-initialized instance instead of needing an effect to reset
 *  state after the fact. */
function RatingPanel({
  id, aid, targetId, traits, initialScores, hadExisting, lang, locked, spectrumSeed, onSaveInfo,
}: {
  id: string; aid: string; targetId: string;
  traits: DistributorTrait[]; initialScores: ScoresTuple; hadExisting: boolean;
  lang: "ar" | "sq"; locked: boolean; spectrumSeed: number;
  onSaveInfo: (state: SaveState, total: number) => void;
}) {
  const [scores, setScores] = useState<ScoresTuple>(initialScores);
  const lastSaved = useRef<string>(hadExisting ? initialScores.join(",") : "");

  const persist = useCallback(async (next: ScoresTuple) => {
    const sig = next.join(",");
    if (lastSaved.current === sig) return;
    onSaveInfo("saving", next.reduce((a, b) => a + b, 0));
    try {
      const r = await fetch(`/api/teacher/groups/${id}/assessments/${aid}/ratings/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: next }),
      });
      if (!r.ok) { onSaveInfo("err", next.reduce((a, b) => a + b, 0)); return; }
      lastSaved.current = sig;
      onSaveInfo("saved", next.reduce((a, b) => a + b, 0));
    } catch {
      onSaveInfo("err", next.reduce((a, b) => a + b, 0));
    }
  }, [id, aid, targetId, onSaveInfo]);

  return (
    <RowadDistributor
      traits={traits}
      value={scores}
      lang={lang}
      disabled={locked}
      onChange={(next) => {
        setScores(next);
        onSaveInfo("dirty", next.reduce((a, b) => a + b, 0));
      }}
      onCommit={(next) => { if (isValid100(next, traits.length)) void persist(next); }}
      showSpectrum
      hideReadout
      spectrumSeed={spectrumSeed}
    />
  );
}

export default function RateMemberPage({ params }: { params: Promise<{ id: string; aid: string; targetId: string }> }) {
  const { id, aid, targetId } = use(params);
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const router = useRouter();

  const { data, loading, notFound } = useAssessmentData(id, aid);

  const [saveInfo, setSaveInfo] = useState<{ targetId: string; state: SaveState; total: number }>({ targetId: "", state: "dirty", total: 0 });
  const onSaveInfo = useCallback((state: SaveState, total: number) => setSaveInfo({ targetId, state, total }), [targetId]);

  const traits = useMemo(() => data?.traits ?? [], [data?.traits]);
  const distributorTraits = useMemo(
    () => traits.map((t) => ({ label: traitLabel(t, L), statement: traitStatement(t, L), color: t.color })),
    [traits, L],
  );
  const orderedMembers = useMemo(() => data ? membersSelfFirst(data.members) : [], [data]);
  const target = orderedMembers.find((m) => m.teacher_id === targetId);
  const targetIdx = orderedMembers.findIndex((m) => m.teacher_id === targetId);

  const givenByTarget = useMemo(() => {
    const map: Record<string, ScoresTuple> = {};
    for (const g of data?.my_ratings_given ?? []) map[g.target_teacher_id] = g.scores;
    return map;
  }, [data?.my_ratings_given]);

  const existing = givenByTarget[targetId];
  const initialScores = useMemo(
    () => existing ?? evenSplit(traits.length),
    [existing, traits.length],
  );

  const locked = data?.status === "CLOSED";

  const nextUnratedIdx = useMemo(() => {
    if (!data) return -1;
    for (let step = 1; step <= orderedMembers.length; step++) {
      const idx = (targetIdx + step) % orderedMembers.length;
      const m = orderedMembers[idx];
      if (!givenByTarget[m.teacher_id]) return idx;
    }
    return -1;
  }, [data, orderedMembers, targetIdx, givenByTarget]);

  function goTo(idx: number) {
    const m = orderedMembers[idx];
    if (m) router.push(`/teacher/groups/${id}/assessments/${aid}/rate/${m.teacher_id}`);
  }

  if (loading) return <MandalaLoader />;
  if (notFound || !data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6B1E2D", fontWeight: 800, fontFamily: "'Cairo',sans-serif" }} dir={dir}>
        {T.loadError}
      </div>
    );
  }
  if (!target) {
    return (
      <div className="rt" dir={dir}>
        <Link href={`/teacher/groups/${id}/assessments/${aid}`} className="rt-back">{T.back}</Link>
        <div className="rt-notfound">{T.notFound}</div>
        <style>{styles}</style>
      </div>
    );
  }

  const initialTotal = initialScores.reduce((sum, score) => sum + score, 0);
  const { state: saveState, total } = saveInfo.targetId === targetId
    ? saveInfo
    : { state: existing ? "saved" as const : "dirty" as const, total: initialTotal };

  return (
    <div className="rt" dir={dir}>
      <Link href={`/teacher/groups/${id}/assessments/${aid}`} className="rt-back">{T.back}</Link>

      <header className="rt-head">
        <div className="rt-target">
          <div className="rt-avatar">{target.profile.full_name.trim().charAt(0).toUpperCase()}</div>
          <div>
            <div className="rt-name">
              {target.profile.full_name}
              {target.is_self && <span className="rt-self-tag">{T.targetSelf}</span>}
            </div>
            <div className="rt-sub">{T.memberOf(targetIdx + 1, orderedMembers.length)}</div>
          </div>
        </div>
        <div className="rt-head-right">
          {locked && <div className="rt-locked">{T.locked}</div>}
          <div className={`rt-save rt-save-${saveState}`}>
            {saveState === "saving" ? T.saving
              : saveState === "err" ? T.saveErr
              : saveState === "saved" ? <><CheckCircle2 size={14} />{T.saved}</>
              : total === 100 ? T.readyToSave
              : T.notSavedYet}
          </div>
        </div>
      </header>

      <p className="rt-instructions">{T.instructions}</p>

      <section className={`rt-total-guide ${total === 100 ? "done" : total > 100 ? "over" : "under"}`} aria-live="polite">
        <div className="rt-total-copy">
          <span>{T.stepTitle}</span>
          <strong>{total === 100 ? T.complete : total > 100 ? T.exceeded(total - 100) : T.remaining(100 - total)}</strong>
        </div>
        <div className="rt-total-number"><b>{total}</b><span>/ 100</span></div>
        <div className="rt-total-track"><i style={{ width: `${Math.min(100, total)}%` }} /></div>
      </section>

      <div className="rt-nav">
        <button className="rt-nav-btn" onClick={() => goTo(targetIdx - 1)} disabled={targetIdx <= 0}>
          <ChevronLeft size={16} className="rt-nav-icon" /><span>{T.prevMember}</span>
        </button>
        <div className="rt-dots">
          {orderedMembers.map((m, i) => (
            <button
              key={m.teacher_id}
              className={`rt-dot ${i === targetIdx ? "on" : ""} ${givenByTarget[m.teacher_id] ? "done" : ""} ${m.is_self ? "self" : ""}`}
              onClick={() => goTo(i)}
              title={m.profile.full_name}
              aria-label={m.profile.full_name}
            />
          ))}
        </div>
        <button className="rt-nav-btn" onClick={() => goTo(targetIdx + 1)} disabled={targetIdx >= orderedMembers.length - 1}>
          <span>{T.nextMember}</span><ChevronRight size={16} className="rt-nav-icon" />
        </button>
      </div>

      <RatingPanel
        key={targetId}
        id={id} aid={aid} targetId={targetId}
        traits={distributorTraits}
        initialScores={initialScores}
        hadExisting={!!existing}
        lang={L}
        locked={locked}
        spectrumSeed={seedFromString(`${aid}:${targetId}`)}
        onSaveInfo={onSaveInfo}
      />

      <div className="rt-footer">
        {nextUnratedIdx >= 0 ? (
          <button className="rt-next-btn" onClick={() => goTo(nextUnratedIdx)}>
            <SkipForward size={16} />{T.nextUnrated}
          </button>
        ) : (
          <div className="rt-alldone">{T.allDone}</div>
        )}
        <Link href={`/teacher/groups/${id}/assessments/${aid}`} className="rt-grid-link">{T.backToGrid}</Link>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
.rt { font-family: 'Cairo', sans-serif; max-width: 1120px; margin: 0 auto; padding: 8px 0 60px; }
.rt-back { display: inline-block; color: #6B1E2D; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 16px; }
.rt-back:hover { text-decoration: underline; }
.rt-notfound { padding: 60px; text-align: center; color: #6B1E2D; font-weight: 800; background: rgba(107,30,45,.05); border: 1px dashed rgba(107,30,45,.3); border-radius: 16px; }

.rt-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 8px; padding: 16px; border-radius: 18px; background: linear-gradient(135deg,#32101A,#6B1E2D); box-shadow: 0 16px 36px rgba(107,30,45,.16); }
.rt-target { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rt-avatar { flex: none; width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: rgba(217,201,176,.18); border: 1px solid rgba(217,201,176,.3); color: #F7F3EB; font-size: 19px; font-weight: 900; }
.rt-name { display: flex; align-items: center; gap: 8px; color: #F7F3EB; font-size: 18px; font-weight: 900; }
.rt-self-tag { padding: 2px 9px; border-radius: 999px; background: rgba(217,201,176,.22); color: #D9C9B0; font-size: 10px; font-weight: 900; }
.rt-sub { margin-top: 2px; color: #D9C9B0; font-size: 11.5px; font-weight: 700; }
.rt-head-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rt-locked { background: rgba(255,255,255,.1); color: #D9C9B0; padding: 6px 12px; border-radius: 99px; font-size: 11px; font-weight: 800; }
.rt-save { padding: 8px 14px; border-radius: 99px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.rt-save-saved { background: rgba(27,94,32,.28); color: #F7F3EB; }
.rt-save-saving { background: rgba(217,201,176,.2); color: #F7F3EB; }
.rt-save-err { background: rgba(107,30,45,.4); color: #F7F3EB; }
.rt-save-dirty { background: rgba(217,201,176,.16); color: #D9C9B0; }

.rt-instructions { margin: 14px 0 10px; color: #655B53; font-size: 13px; line-height: 1.85; }
.rt-total-guide { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px 18px; align-items:center; margin-bottom:16px; padding:14px 16px; border:1px solid rgba(107,30,45,.16); border-radius:16px; background:#FFFBF5; }
.rt-total-copy{display:flex;flex-direction:column;gap:2px}.rt-total-copy span{color:#8F765B;font-size:10px;font-weight:900;letter-spacing:.06em}.rt-total-copy strong{color:#655B53;font-size:12px}.rt-total-number{display:flex;align-items:baseline;gap:4px}.rt-total-number b{color:#8F765B;font:900 28px ui-monospace,Consolas,monospace}.rt-total-number span{color:#796A62;font-size:10px;font-weight:900}.rt-total-track{grid-column:1/-1;height:8px;overflow:hidden;border-radius:999px;background:#D9C9B0}.rt-total-track i{display:block;height:100%;border-radius:inherit;background:#8F765B;transition:width .2s}.rt-total-guide.done{border-color:rgba(27,94,32,.2);background:rgba(27,94,32,.05)}.rt-total-guide.done .rt-total-copy strong,.rt-total-guide.done .rt-total-number b{color:#1B5E20}.rt-total-guide.done .rt-total-track i{background:#1B5E20}.rt-total-guide.over{border-color:rgba(107,30,45,.3);background:rgba(107,30,45,.05)}.rt-total-guide.over .rt-total-copy strong,.rt-total-guide.over .rt-total-number b{color:#6B1E2D}.rt-total-guide.over .rt-total-track i{background:#6B1E2D}

.rt-nav { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; margin-bottom: 16px; }
.rt-nav-btn { display: flex; align-items: center; gap: 6px; height: 42px; padding: 0 14px; border: 1.5px solid rgba(107,30,45,.28); border-radius: 12px; background: #FFFBF5; color: #6B1E2D; font: 800 12px 'Cairo',sans-serif; cursor: pointer; transition: .15s; white-space: nowrap; }
.rt-nav-btn:hover:not(:disabled) { background: #F7F3EB; border-color: #B8A082; }
.rt-nav-btn:disabled { opacity: .35; cursor: not-allowed; }
.rt[dir="rtl"] .rt-nav-icon { transform: scaleX(-1); }
.rt-dots { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; max-height: 42px; overflow-y: auto; padding: 2px; }
.rt-dot { width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid rgba(107,30,45,.28); background: #FFF; cursor: pointer; padding: 0; transition: .15s; }
.rt-dot:hover { border-color: #B8A082; transform: scale(1.2); }
.rt-dot.on { background: #32101A; border-color: #32101A; transform: scale(1.3); }
.rt-dot.done { background: rgba(27,94,32,.5); border-color: rgba(27,94,32,.5); }
.rt-dot.done.on { background: #1B5E20; border-color: #1B5E20; }
.rt-dot.self { border-color: #6B1E2D; }

.rt-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px; border-top: 1px dashed rgba(107,30,45,.28); }
.rt-next-btn { display: flex; align-items: center; gap: 8px; border: 0; border-radius: 13px; padding: 13px 20px; background: #6B1E2D; color: #fff; font: 800 13px 'Cairo',sans-serif; cursor: pointer; transition: background .15s; }
.rt-next-btn:hover { background: #4A0E1C; }
.rt-alldone { padding: 10px 16px; border-radius: 13px; background: rgba(27,94,32,.1); color: #1B5E20; font-size: 13px; font-weight: 800; }
.rt-grid-link { color: #8F765B; font-size: 12.5px; font-weight: 800; text-decoration: none; }
.rt-grid-link:hover { text-decoration: underline; color: #6B1E2D; }

@media (max-width: 620px) {
  .rt-head { flex-direction: column; align-items: flex-start; }
  .rt-nav-btn span { display: none; }
  .rt-footer { flex-direction: column; align-items: stretch; }
  .rt-next-btn { justify-content: center; }
}
`;
