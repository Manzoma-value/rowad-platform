"use client";

import { useEffect, useMemo, useState } from "react";
import RowadDistributor from "@/components/RowadDistributor";
import { averageTuples, derive, isValid100, type AssessLang } from "@/lib/rowad-assessment";

type Trait = {
  id: string;
  maqsad: string;
  name: string;
  name_sq: string | null;
  definition: string | null;
  definition_sq: string | null;
  elements: { id: string; text: string; text_sq: string | null; order: number }[];
};

type Reading = {
  id: string;
  educator_name: string;
  is_mine: boolean;
  observed_at: string;
  updated_at: string;
  scores: { trait_id: string; score: number }[];
};

type EvalData = {
  module: {
    id: string;
    title: string;
    trait_links: { trait_id: string; guidance_ar: string | null; guidance_sq: string | null }[];
  };
  stage: { id: string; title: string };
  traits: Trait[];
  attempt: { score: number; total: number };
  assessment: {
    id: string;
    general_note: string | null;
    observed_at: string;
    trait_scores: { trait_id: string; score: number; note: string | null }[];
    snapshots: { id: string; observed_at: string; created_at: string }[];
  } | null;
  educator_readings: Reading[];
};

const COLORS: Record<string, string> = {
  DEEN: "#8F765B",
  AQL: "#655B53",
  NAFS: "#1B5E20",
  NASL: "#6B1E2D",
  MAL: "#6B1E2D",
};

const COPY = {
  ar: {
    loading: "جارٍ تجهيز قراءة السمات…",
    eyebrow: "قراءة تربوية قابلة للمراجعة",
    title: "خريطة السمات الحالية",
    intro: "وزّع 100 نقطة بالضبط بين السمات وفق ما ظهر في أفعال المستفيد. هذه خريطة نسبية تساعدنا على تحديد نقطة البداية، وليست درجة نجاح أو حكمًا نهائيًا.",
    concept: "المفهوم الذي تعلّمه المستفيد",
    building: "ما الذي نريد بناءه؟",
    linkedNone: "لم تحدد الإدارة بعد السمات التي ينشّطها هذا المفهوم؛ ما زال بإمكانك قراءة جميع سمات المرحلة.",
    steps: ["لاحظ الأفعال والأدلة", "وزّع 100 نقطة", "اكتب سياق الملاحظة", "احفظ القراءة وراجعها لاحقًا"],
    equal: "توزيع مبدئي متساوٍ",
    reset: "تصفير",
    evidence: "الأدلة والمؤشرات الظاهرة",
    evidenceSub: "سجّل موقفًا أو فعلًا يدعم قراءتك. لا تقِس حفظ تعريف السمة.",
    evidencePh: "ما الفعل الذي لاحظته؟ وفي أي سياق؟",
    general: "خلاصة الملاحظة التربوية",
    generalPh: "اكتب سياق الملاحظة وما الذي يستحق المتابعة في القراءة القادمة…",
    date: "تاريخ الملاحظة",
    current: "القراءة الناتجة الآن",
    core: "السمة الجوهرية",
    connecting: "السمة الرابطة",
    supporting: "سمات مساندة أو في طور النمو",
    under: "تحت العتبة",
    underHelp: "أكمل توزيع النقاط لتظهر السمة الجوهرية.",
    multi: "قراءات المشرفين",
    multiSub: "تتكوّن الصورة الأدق من أكثر من مشرف، مع بقاء كل قراءة مستقلة وقابلة للمراجعة.",
    noOthers: "هذه أول قراءة للمستفيد في هذا المفهوم.",
    revisions: "مراجعاتك السابقة",
    revision: "مراجعة",
    save: "حفظ القراءة التربوية",
    update: "حفظ قراءة محدثة",
    saving: "جارٍ الحفظ…",
    exact: "أكمل توزيع 100 نقطة قبل الحفظ",
    saved: "تم حفظ القراءة وتوثيقها بنجاح.",
    error: "تعذر حفظ القراءة. حاول مرة أخرى.",
    close: "إغلاق",
    points: "نقطة",
  },
  sq: {
    loading: "Po përgatitet leximi i tipareve…",
    eyebrow: "Lexim edukativ që mund të rishikohet",
    title: "Harta aktuale e tipareve",
    intro: "Shpërndaj saktësisht 100 pikë ndërmjet tipareve sipas veprimeve të dukshme të pjesëmarrësit. Kjo është një hartë relative e pikës së nisjes, jo notë suksesi dhe jo gjykim përfundimtar.",
    concept: "Koncepti që mësoi pjesëmarrësi",
    building: "Çfarë duam të ndërtojmë?",
    linkedNone: "Administrata nuk ka përcaktuar ende tiparet që aktivizon ky koncept; mund të lexosh të gjitha tiparet e fazës.",
    steps: ["Vëzhgo veprimet dhe provat", "Shpërndaj 100 pikë", "Shkruaj kontekstin", "Ruaj dhe rishikoje më vonë"],
    equal: "Shpërndarje fillestare e barabartë",
    reset: "Zero",
    evidence: "Provat dhe treguesit e dukshëm",
    evidenceSub: "Shëno një situatë ose veprim që mbështet leximin; mos mat memorizimin e përkufizimit.",
    evidencePh: "Cilin veprim vëzhgove dhe në çfarë konteksti?",
    general: "Përmbledhja e vëzhgimit edukativ",
    generalPh: "Shkruaj kontekstin dhe çfarë duhet ndjekur në leximin e ardhshëm…",
    date: "Data e vëzhgimit",
    current: "Leximi që rezulton tani",
    core: "Tipari thelbësor",
    connecting: "Tipari ndërlidhës",
    supporting: "Tipare mbështetëse ose në zhvillim",
    under: "Nën prag",
    underHelp: "Plotëso shpërndarjen e pikëve për të shfaqur tiparin thelbësor.",
    multi: "Leximet e edukatorëve",
    multiSub: "Pamja bëhet më e saktë me më shumë se një edukator, duke ruajtur çdo lexim të pavarur dhe të rishikueshëm.",
    noOthers: "Ky është leximi i parë për këtë pjesëmarrës dhe koncept.",
    revisions: "Rishikimet e tua të mëparshme",
    revision: "Rishikim",
    save: "Ruaj leximin edukativ",
    update: "Ruaj leximin e përditësuar",
    saving: "Po ruhet…",
    exact: "Plotëso shpërndarjen e 100 pikëve para ruajtjes",
    saved: "Leximi u ruajt dhe u dokumentua me sukses.",
    error: "Leximi nuk u ruajt. Provo përsëri.",
    close: "Mbyll",
    points: "pikë",
  },
} as const;

function localDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function equalDistribution(length: number) {
  if (!length) return [];
  const base = Math.floor(100 / length);
  const values = new Array(length).fill(base);
  for (let index = 0; index < 100 - base * length; index += 1) values[index] += 1;
  return values;
}

export default function TraitEvalForm({
  studentId,
  moduleId,
  lang = "sq",
  onClose,
  onSaved,
}: {
  studentId: string;
  moduleId: string;
  lang?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const L: AssessLang = lang === "ar" ? "ar" : "sq";
  const T = COPY[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const [data, setData] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<number[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState("");
  const [observedAt, setObservedAt] = useState(localDate());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/teacher/trait-assessments/${studentId}/${moduleId}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || T.error);
        return payload as EvalData;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        const byTrait = new Map(payload.assessment?.trait_scores.map((score) => [score.trait_id, score]) ?? []);
        setScores(payload.traits.map((trait) => byTrait.get(trait.id)?.score ?? 0));
        setNotes(Object.fromEntries(payload.traits.map((trait) => [trait.id, byTrait.get(trait.id)?.note ?? ""])));
        setGeneralNote(payload.assessment?.general_note ?? "");
        setObservedAt(localDate(payload.assessment?.observed_at));
      })
      .catch((reason) => active && setMessage({ kind: "error", text: reason instanceof Error ? reason.message : T.error }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [studentId, moduleId, T.error]);

  const total = scores.reduce((sum, score) => sum + score, 0);
  const valid = data ? isValid100(scores, data.traits.length) : false;
  const result = useMemo(() => derive(scores), [scores]);
  const targetIds = useMemo(() => new Set(data?.module.trait_links.map((link) => link.trait_id) ?? []), [data]);
  const consensus = useMemo(() => {
    if (!data?.educator_readings.length) return null;
    const rows = data.educator_readings.map((reading) => {
      const values = new Map(reading.scores.map((score) => [score.trait_id, score.score]));
      return data.traits.map((trait) => values.get(trait.id) ?? 0);
    });
    return averageTuples(rows);
  }, [data]);

  if (loading) return <div className="tev-loading" dir={dir}><span /><b>{T.loading}</b><style>{css}</style></div>;
  if (!data) return <div className="tev-loading" dir={dir}><b>{message?.text ?? T.error}</b><style>{css}</style></div>;

  const traitName = (trait: Trait | undefined) => trait ? (L === "sq" ? trait.name_sq || trait.name : trait.name) : "—";
  const linksByTrait = new Map(data.module.trait_links.map((link) => [link.trait_id, link]));

  async function save() {
    if (!valid) {
      setMessage({ kind: "error", text: T.exact });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teacher/trait-assessments/${studentId}/${moduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: data!.traits.map((trait, index) => ({ trait_id: trait.id, score: scores[index], note: notes[trait.id]?.trim() || undefined })),
          general_note: generalNote.trim() || undefined,
          observed_at: new Date(`${observedAt}T12:00:00`).toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || T.error);
      setMessage({ kind: "ok", text: T.saved });
      window.setTimeout(onSaved, 550);
    } catch (reason) {
      setMessage({ kind: "error", text: reason instanceof Error ? reason.message : T.error });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tev" dir={dir}>
      <header className="tev-hero">
        <button type="button" className="tev-close" onClick={onClose} aria-label={T.close}>×</button>
        <div className="tev-hero-copy">
          <small>{T.eyebrow}</small>
          <h2>{T.title}</h2>
          <p>{T.intro}</p>
          <div className="tev-path"><span>{data.stage.title}</span><i>›</i><b>{data.module.title}</b></div>
        </div>
        <div className={`tev-total ${valid ? "done" : ""}`}><strong>{total}</strong><span>/ 100</span><small>{valid ? "✓" : T.points}</small></div>
      </header>

      <div className="tev-body">
        <section className="tev-steps">
          {T.steps.map((step, index) => <div key={step}><b>{index + 1}</b><span>{step}</span></div>)}
        </section>

        <section className="tev-targets">
          <div className="tev-section-head"><div><small>{T.concept}</small><h3>{T.building}</h3></div></div>
          {targetIds.size ? (
            <div className="tev-target-grid">
              {data.traits.filter((trait) => targetIds.has(trait.id)).map((trait) => {
                const link = linksByTrait.get(trait.id);
                const guidance = L === "ar" ? link?.guidance_ar : link?.guidance_sq || link?.guidance_ar;
                return <article key={trait.id} style={{ "--trait-color": COLORS[trait.maqsad] } as React.CSSProperties}><span>✦</span><div><b>{traitName(trait)}</b>{guidance && <p>{guidance}</p>}</div></article>;
              })}
            </div>
          ) : <p className="tev-soft-note">{T.linkedNone}</p>}
        </section>

        <section className="tev-distribution">
          <div className="tev-toolbar">
            <div><small>{L === "ar" ? "الخطوة الأساسية" : "Hapi kryesor"}</small><h3>{L === "ar" ? "وزّع خريطة الحضور النسبي" : "Shpërndaj hartën e pranisë relative"}</h3></div>
            <div><button type="button" onClick={() => setScores(equalDistribution(data.traits.length))}>{T.equal}</button><button type="button" onClick={() => setScores(data.traits.map(() => 0))}>{T.reset}</button></div>
          </div>
          <RowadDistributor
            traits={data.traits.map((trait) => ({
              label: traitName(trait),
              statement: L === "sq" ? trait.definition_sq || trait.definition || "" : trait.definition || "",
              color: COLORS[trait.maqsad] || "#6B1E2D",
            }))}
            value={scores}
            onChange={setScores}
            lang={L}
            showSpectrum
            spectrumSeed={moduleId.length + studentId.length}
          />
        </section>

        <section className="tev-reading">
          <div className="tev-section-head"><div><small>{total === 100 ? "100 / 100" : `${total} / 100`}</small><h3>{T.current}</h3></div></div>
          <div className="tev-reading-grid">
            {result.hasCore && result.coreIdx !== null ? (
              <article className="core"><small>{T.core}</small><strong>{traitName(data.traits[result.coreIdx])}</strong><span>{scores[result.coreIdx]} {T.points}</span></article>
            ) : (
              <article className="under"><small>{T.under}</small><strong>{T.underHelp}</strong></article>
            )}
            <article className="connect"><small>{T.connecting}</small><strong>{traitName(data.traits[result.connectingIdx])}</strong><span>{scores[result.connectingIdx] ?? 0} {T.points}</span></article>
            <article className="support"><small>{T.supporting}</small><strong>{result.supportingIdxs.map((index) => traitName(data.traits[index])).join(L === "ar" ? "، " : ", ") || "—"}</strong></article>
          </div>
        </section>

        <section className="tev-evidence">
          <div className="tev-section-head"><div><small>{L === "ar" ? "الأفعال لا الحفظ" : "Veprimet, jo memorizimi"}</small><h3>{T.evidence}</h3><p>{T.evidenceSub}</p></div></div>
          <div className="tev-evidence-grid">
            {data.traits.map((trait, index) => (
              <label key={trait.id} style={{ "--trait-color": COLORS[trait.maqsad] } as React.CSSProperties}>
                <span><i />{traitName(trait)} <b>{scores[index] ?? 0}</b></span>
                {trait.elements.length > 0 && <small>{trait.elements.map((element) => L === "sq" ? element.text_sq || element.text : element.text).join(" • ")}</small>}
                <textarea value={notes[trait.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [trait.id]: event.target.value }))} placeholder={T.evidencePh} />
              </label>
            ))}
          </div>
        </section>

        <section className="tev-context">
          <label><span>{T.date}</span><input type="date" value={observedAt} max={localDate()} onChange={(event) => setObservedAt(event.target.value)} /></label>
          <label className="wide"><span>{T.general}</span><textarea value={generalNote} onChange={(event) => setGeneralNote(event.target.value)} placeholder={T.generalPh} /></label>
        </section>

        <section className="tev-collab">
          <div className="tev-section-head"><div><small>{data.educator_readings.length} {L === "ar" ? "قراءة" : "lexime"}</small><h3>{T.multi}</h3><p>{T.multiSub}</p></div></div>
          {data.educator_readings.length ? (
            <div className="tev-educators">
              {data.educator_readings.map((reading) => <div key={reading.id}><span>{reading.educator_name.slice(0, 1)}</span><b>{reading.educator_name}</b><small>{new Date(reading.observed_at).toLocaleDateString(L === "ar" ? "ar-SA" : "sq-AL")}</small></div>)}
              {consensus && <div className="consensus"><span>◇</span><b>{L === "ar" ? "قراءة مشتركة" : "Leximi i përbashkët"}</b><small>{traitName(data.traits[derive(consensus).hasCore ? derive(consensus).coreIdx ?? 0 : derive(consensus).connectingIdx])}</small></div>}
            </div>
          ) : <p className="tev-soft-note">{T.noOthers}</p>}
          {data.assessment?.snapshots.length ? <div className="tev-revisions"><b>{T.revisions}</b>{data.assessment.snapshots.map((snapshot, index) => <span key={snapshot.id}>{T.revision} {data.assessment!.snapshots.length - index} · {new Date(snapshot.observed_at).toLocaleDateString(L === "ar" ? "ar-SA" : "sq-AL")}</span>)}</div> : null}
        </section>

        {message && <div className={`tev-message ${message.kind}`}>{message.text}</div>}
        <footer className="tev-footer">
          <button type="button" className="secondary" onClick={onClose}>{T.close}</button>
          <div><small className={valid ? "ready" : ""}>{valid ? (L === "ar" ? "التوزيع مكتمل ويمكن حفظه" : "Shpërndarja është e plotë dhe mund të ruhet") : T.exact}</small><button type="button" className="primary" onClick={save} disabled={!valid || saving}>{saving ? T.saving : data.assessment ? T.update : T.save}</button></div>
        </footer>
      </div>
      <style>{css}</style>
    </div>
  );
}

const css = `
  .tev,.tev *{box-sizing:border-box}.tev{min-height:100%;background:#F7F3EB;color:#32101A;font-family:'Cairo',sans-serif}.tev-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 30px;overflow:hidden;background:radial-gradient(circle at 85% 0,rgba(184,160,130,.2),transparent 32%),linear-gradient(135deg,#6B1E2D,#5B1526);color:#fff}.tev-close{position:absolute;inset-block-start:12px;inset-inline-end:14px;display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(255,255,255,.08);color:#fff;font-size:23px;cursor:pointer}.tev-hero-copy{max-width:760px}.tev-hero-copy>small{color:#D9C9B0;font-size:10px;font-weight:900;letter-spacing:.1em}.tev-hero h2{margin:4px 0 6px;font-size:25px}.tev-hero p{margin:0;color:rgba(255,255,255,.72);font-size:12px;line-height:1.8}.tev-path{display:flex;align-items:center;gap:8px;margin-top:12px;color:#D9C9B0;font-size:11px}.tev-path i{opacity:.45}.tev-total{display:flex;width:112px;height:112px;flex:none;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(217,201,176,.22);border-radius:28px;background:rgba(107,30,45,.34);box-shadow:inset 0 1px rgba(255,255,255,.08)}.tev-total strong{font-size:34px;line-height:1}.tev-total span{color:#D9C9B0;font-size:11px}.tev-total small{margin-top:4px;color:#D9C9B0;font-size:9px}.tev-total.done{background:rgba(27,94,32,.32);border-color:rgba(27,94,32,.3)}
  .tev-body{display:flex;flex-direction:column;gap:18px;padding:22px 24px 30px}.tev-steps{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;border:1px solid rgba(107,30,45,.13);border-radius:16px;background:#fff}.tev-steps div{display:flex;align-items:center;gap:9px;padding:12px;border-inline-end:1px solid rgba(107,30,45,.1)}.tev-steps div:last-child{border:0}.tev-steps b{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#6B1E2D;color:#fff;font-size:10px}.tev-steps span{color:#655B53;font-size:10.5px;font-weight:800}.tev-targets,.tev-reading,.tev-evidence,.tev-collab{border:1px solid rgba(107,30,45,.13);border-radius:20px;background:#FFFBF5;padding:18px;box-shadow:0 10px 26px rgba(107,30,45,.045)}.tev-section-head small,.tev-toolbar small{color:#8F765B;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.tev-section-head h3,.tev-toolbar h3{margin:2px 0;color:#32101A;font-size:16px}.tev-section-head p{margin:3px 0 0;color:#796A62;font-size:10.5px;line-height:1.7}.tev-target-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px;margin-top:12px}.tev-target-grid article{display:flex;gap:10px;border:1px solid color-mix(in srgb,var(--trait-color) 28%,transparent);border-radius:13px;background:#fff;padding:11px}.tev-target-grid article>span{color:var(--trait-color)}.tev-target-grid b{font-size:11.5px}.tev-target-grid p{margin:3px 0 0;color:#655B53;font-size:10px;line-height:1.55}.tev-soft-note{margin:12px 0 0;border-radius:12px;background:#F7F3EB;padding:11px;color:#796A62;font-size:10.5px;line-height:1.65}.tev-distribution{border-radius:20px;background:#fff}.tev-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:4px 4px 11px}.tev-toolbar>div:last-child{display:flex;gap:6px}.tev-toolbar button{border:1px solid rgba(107,30,45,.18);border-radius:9px;background:#fff;padding:7px 9px;color:#6B1E2D;font:800 9.5px inherit;cursor:pointer}.tev-reading-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.tev-reading-grid article{display:flex;min-height:105px;flex-direction:column;justify-content:center;border-radius:15px;padding:14px}.tev-reading-grid small{font-size:9px;font-weight:900}.tev-reading-grid strong{margin-top:4px;font-size:13px;line-height:1.6}.tev-reading-grid span{margin-top:3px;font-size:10px}.tev-reading-grid .core{background:#6B1E2D;color:#fff}.tev-reading-grid .connect{background:#E5E0D5;color:#4A0E1C}.tev-reading-grid .support{background:#EFEAE0;color:#655B53}.tev-reading-grid .under{background:#EFEAE0;color:#6B1E2D}.tev-reading-grid:has(.under){grid-template-columns:1.2fr 1fr 1fr}.tev-evidence-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px}.tev-evidence-grid label{border:1px solid color-mix(in srgb,var(--trait-color) 24%,transparent);border-radius:13px;background:#fff;padding:11px}.tev-evidence-grid label>span{display:flex;align-items:center;gap:7px;color:#32101A;font-size:11.5px;font-weight:900}.tev-evidence-grid label>span i{width:8px;height:8px;border-radius:50%;background:var(--trait-color)}.tev-evidence-grid label>span b{margin-inline-start:auto;color:var(--trait-color)}.tev-evidence-grid label>small{display:block;margin-top:5px;color:#8F765B;font-size:9px;line-height:1.55}.tev-evidence-grid textarea,.tev-context textarea{width:100%;min-height:68px;margin-top:8px;resize:vertical;border:1px solid rgba(107,30,45,.16);border-radius:9px;background:#FFFBF5;padding:9px;color:#32101A;font:10.5px/1.6 inherit;outline:none}.tev-evidence-grid textarea:focus,.tev-context textarea:focus{border-color:#B8A082;box-shadow:0 0 0 3px rgba(184,160,130,.12)}.tev-context{display:grid;grid-template-columns:210px 1fr;gap:12px;border:1px solid rgba(107,30,45,.13);border-radius:18px;background:#fff;padding:16px}.tev-context label>span{display:block;margin-bottom:5px;color:#655B53;font-size:10px;font-weight:900}.tev-context input{width:100%;height:42px;border:1px solid rgba(107,30,45,.18);border-radius:10px;background:#FFFBF5;padding:0 10px;color:#32101A;font:11px inherit}.tev-context textarea{min-height:76px;margin:0}.tev-educators{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.tev-educators>div{display:grid;grid-template-columns:30px auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;border:1px solid rgba(107,30,45,.13);border-radius:12px;background:#fff;padding:8px 11px}.tev-educators>div>span{grid-row:1/3;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#6B1E2D;color:#fff;font-weight:900}.tev-educators b{font-size:10.5px}.tev-educators small{color:#8F765B;font-size:9px}.tev-educators .consensus{border-color:rgba(184,160,130,.5);background:#F7F3EB}.tev-educators .consensus>span{background:#B8A082;color:#32101A}.tev-revisions{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:12px;border-top:1px dashed rgba(107,30,45,.14);padding-top:10px}.tev-revisions b{font-size:10px}.tev-revisions span{border-radius:99px;background:#EFEAE0;padding:4px 8px;color:#655B53;font-size:9px}.tev-message{border-radius:12px;padding:10px 13px;font-size:11px;font-weight:800}.tev-message.ok{background:rgba(27,94,32,.1);color:#1B5E20}.tev-message.error{background:rgba(107,30,45,.1);color:#6B1E2D}.tev-footer{position:sticky;bottom:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(107,30,45,.14);border-radius:16px;background:rgba(255,251,245,.96);padding:11px 13px;box-shadow:0 -8px 24px rgba(107,30,45,.07);backdrop-filter:blur(12px)}.tev-footer>div{display:flex;align-items:center;gap:10px}.tev-footer small{max-width:260px;color:#8F765B;font-size:9.5px}.tev-footer small.ready{color:#1B5E20}.tev-footer button{border-radius:10px;padding:9px 14px;font:900 11px inherit;cursor:pointer}.tev-footer .secondary{border:1px solid rgba(107,30,45,.18);background:#fff;color:#6B1E2D}.tev-footer .primary{border:0;background:#6B1E2D;color:#fff;box-shadow:0 8px 18px rgba(107,30,45,.18)}.tev-footer .primary:disabled{cursor:not-allowed;opacity:.45}.tev-loading{display:flex;min-height:360px;align-items:center;justify-content:center;gap:10px;background:#F7F3EB;color:#6B1E2D;font-family:'Cairo',sans-serif}.tev-loading span{width:25px;height:25px;border:3px solid #D9C9B0;border-top-color:#6B1E2D;border-radius:50%;animation:tev-spin .7s linear infinite}@keyframes tev-spin{to{transform:rotate(360deg)}}
  @media(max-width:760px){.tev-hero{align-items:flex-start;flex-direction:column;padding:24px 18px}.tev-total{width:100%;height:auto;flex-direction:row;gap:5px;border-radius:16px;padding:12px}.tev-total strong{font-size:25px}.tev-body{padding:14px 11px 22px}.tev-steps{grid-template-columns:1fr 1fr}.tev-steps div:nth-child(2){border-inline-end:0}.tev-steps div:nth-child(-n+2){border-bottom:1px solid rgba(107,30,45,.1)}.tev-toolbar{align-items:flex-start;flex-direction:column}.tev-toolbar>div:last-child{width:100%}.tev-toolbar button{flex:1}.tev-reading-grid,.tev-reading-grid:has(.under),.tev-evidence-grid,.tev-context{grid-template-columns:1fr}.tev-footer{align-items:stretch;flex-direction:column}.tev-footer>div{align-items:stretch;flex-direction:column}.tev-footer button{width:100%}}
`;
