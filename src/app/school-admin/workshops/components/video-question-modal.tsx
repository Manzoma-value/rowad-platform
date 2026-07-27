"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Clock3, Crosshair, Plus, Trash2, X } from "lucide-react";
import { formatVideoTime, type WorkshopVideoQuestion, type WorkshopVideoQuestionType } from "@/lib/workshop-videos";

const T = {
  ar: {
    titleAdd: "إضافة سؤال داخل الفيديو",
    titleEdit: "تعديل السؤال",
    step1: "حدد لحظة ظهور السؤال",
    step2: "نوع السؤال ونصه",
    step3: "الإجابة الصحيحة",
    scrubHelp: "شغّل الفيديو وأوقفه عند اللحظة المناسبة، ثم التقط اللحظة الحالية.",
    capture: "التقاط اللحظة الحالية",
    timestamp: "لحظة الظهور",
    minutes: "دقيقة",
    seconds: "ثانية",
    willPause: (time: string) => `سيتوقف الفيديو عند ${time} ويعرض السؤال.`,
    text: "نص السؤال",
    textPh: "اكتب سؤالاً واضحاً ومباشراً...",
    typeMCQ: "اختيار من متعدد",
    typeTF: "صح / خطأ",
    optionsHint: "اكتب الخيارات، ثم اضغط علامة الصح بجانب الإجابة الصحيحة.",
    optionN: (i: number) => `الخيار ${i + 1}`,
    addOption: "إضافة خيار",
    markCorrect: "تحديد كإجابة صحيحة",
    removeOption: "حذف الخيار",
    trueLbl: "صح",
    falseLbl: "خطأ",
    save: "حفظ التعديلات",
    add: "إضافة السؤال",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ...",
    errText: "نص السؤال مطلوب",
    errTime: "أدخل لحظة صحيحة",
    errPastEnd: "اللحظة بعد نهاية الفيديو",
    errMcqMin: "أدخل خيارين على الأقل",
    errMcqAnswer: "حدد الإجابة الصحيحة",
    errTfAnswer: "حدد الإجابة الصحيحة",
  },
  sq: {
    titleAdd: "Shto pyetje brenda videos",
    titleEdit: "Modifiko pyetjen",
    step1: "Zgjidh momentin e pyetjes",
    step2: "Lloji dhe teksti i pyetjes",
    step3: "Përgjigjja e saktë",
    scrubHelp: "Luaj videon, ndaloje në momentin e duhur dhe kap momentin aktual.",
    capture: "Kap momentin aktual",
    timestamp: "Momenti",
    minutes: "min",
    seconds: "sek",
    willPause: (time: string) => `Video do të ndalojë te ${time} dhe do të shfaqë pyetjen.`,
    text: "Teksti i pyetjes",
    textPh: "Shkruaj një pyetje të qartë...",
    typeMCQ: "Shumë opsione",
    typeTF: "E saktë / E gabuar",
    optionsHint: "Shkruaj opsionet, pastaj kliko ✓ te përgjigjja e saktë.",
    optionN: (i: number) => `Opsioni ${i + 1}`,
    addOption: "Shto opsion",
    markCorrect: "Shëno si të saktë",
    removeOption: "Fshi opsionin",
    trueLbl: "E saktë",
    falseLbl: "E gabuar",
    save: "Ruaj ndryshimet",
    add: "Shto pyetjen",
    cancel: "Anulo",
    saving: "Duke ruajtur...",
    errText: "Teksti i pyetjes është i detyrueshëm",
    errTime: "Vendos një moment të vlefshëm",
    errPastEnd: "Momenti është pas fundit të videos",
    errMcqMin: "Duhen të paktën 2 opsione",
    errMcqAnswer: "Zgjidh përgjigjen e saktë",
    errTfAnswer: "Zgjidh përgjigjen e saktë",
  },
} as const;

export function VideoQuestionModal({
  workshopId,
  videoId,
  videoUrl,
  videoDuration,
  question,
  lang,
  onClose,
  onSaved,
}: {
  workshopId: string;
  videoId: string;
  videoUrl: string;
  videoDuration: number | null;
  question?: WorkshopVideoQuestion;
  lang: "ar" | "sq";
  onClose: () => void;
  onSaved: (question: WorkshopVideoQuestion) => void;
}) {
  const t = T[lang];
  const isEdit = !!question;
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [type, setType] = useState<WorkshopVideoQuestionType>(question?.type ?? "MCQ");
  const [text, setText] = useState(question?.text ?? "");
  const [minutes, setMinutes] = useState(String(Math.floor((question?.timestamp_seconds ?? 0) / 60)));
  const [seconds, setSeconds] = useState(String((question?.timestamp_seconds ?? 0) % 60));
  const [options, setOptions] = useState<string[]>(() => {
    const existing = question?.options?.map((option) => option.text) ?? [];
    const seeded = existing.length ? [...existing] : ["", ""];
    while (seeded.length < 2) seeded.push("");
    return seeded;
  });
  const [correctIndex, setCorrectIndex] = useState<number>(() => {
    if (!question || question.type !== "MCQ") return -1;
    return question.options.findIndex((option) => option.text === question.correct_answer);
  });
  const [tfAnswer, setTfAnswer] = useState<string>(question?.type === "TF" ? question.correct_answer : "");
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timestampSeconds = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [loading, onClose]);

  function captureCurrentTime() {
    const element = previewRef.current;
    if (!element) return;
    const total = Math.floor(element.currentTime);
    setMinutes(String(Math.floor(total / 60)));
    setSeconds(String(total % 60));
    setError("");
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
  }

  function addOption() {
    setOptions((current) => current.length >= 8 ? current : [...current, ""]);
  }

  function removeOption(index: number) {
    setOptions((current) => current.length <= 2 ? current : current.filter((_, optionIndex) => optionIndex !== index));
    setCorrectIndex((current) => current === index ? -1 : current > index ? current - 1 : current);
  }

  function validate(): string {
    if (!text.trim()) return t.errText;
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);
    if (!Number.isFinite(parsedMinutes) || !Number.isFinite(parsedSeconds) || parsedMinutes < 0 || parsedSeconds < 0 || parsedSeconds > 59) return t.errTime;
    if (videoDuration && timestampSeconds > videoDuration) return t.errPastEnd;
    if (type === "MCQ") {
      if (options.filter((option) => option.trim()).length < 2) return t.errMcqMin;
      if (correctIndex < 0 || !options[correctIndex]?.trim()) return t.errMcqAnswer;
    }
    if (type === "TF" && !tfAnswer) return t.errTfAnswer;
    return "";
  }

  async function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = { type, text: text.trim(), timestamp_seconds: timestampSeconds };
      if (type === "MCQ") {
        body.options = options.map((option) => option.trim()).filter(Boolean);
        body.correct_answer = options[correctIndex]?.trim() ?? "";
      } else {
        body.correct_answer = tfAnswer;
      }
      const url = isEdit
        ? `/api/school-admin/workshops/videos/questions/${question!.id}`
        : `/api/school-admin/workshops/${workshopId}/videos/${videoId}/questions`;
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Save failed");
      onSaved(payload.question);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="vqm-overlay" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}>
      <div className="vqm-modal" role="dialog" aria-modal="true" aria-labelledby="vqm-title" dir={lang === "ar" ? "rtl" : "ltr"}>
        <header>
          <div>
            <span className="vqm-kicker"><Clock3 size={14} />{t.timestamp}: {formatVideoTime(timestampSeconds)}</span>
            <h3 id="vqm-title">{isEdit ? t.titleEdit : t.titleAdd}</h3>
          </div>
          <button onClick={onClose} disabled={loading} aria-label={t.cancel}><X size={19} /></button>
        </header>

        <div className="vqm-body">
          <aside className="vqm-timing">
            <div className="vqm-step-heading"><b>1</b><span>{t.step1}</span></div>
            {videoUrl ? (
              <div className="vqm-preview-shell">
                <video
                  ref={previewRef}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="vqm-preview"
                  onLoadedMetadata={(event) => {
                    event.currentTarget.currentTime = Math.min(timestampSeconds, event.currentTarget.duration || timestampSeconds);
                  }}
                />
              </div>
            ) : null}
            {videoUrl && <p className="vqm-hint">{t.scrubHelp}</p>}
            {videoUrl && (
              <button type="button" className="vqm-capture" onClick={captureCurrentTime}>
                <Crosshair size={16} />{t.capture}
              </button>
            )}
            <div className="vqm-time-row">
              <label><span>{t.minutes}</span><input type="number" min={0} inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
              <span className="vqm-time-separator">:</span>
              <label><span>{t.seconds}</span><input type="number" min={0} max={59} inputMode="numeric" value={seconds} onChange={(event) => setSeconds(event.target.value)} /></label>
            </div>
            <p className="vqm-will-pause"><Clock3 size={15} />{t.willPause(formatVideoTime(timestampSeconds))}</p>
          </aside>

          <main className="vqm-editor">
            <section className="vqm-step">
              <div className="vqm-step-heading"><b>2</b><span>{t.step2}</span></div>
              <div className="vqm-type-row">
                <button type="button" className={`vqm-type-btn${type === "MCQ" ? " active" : ""}`} onClick={() => setType("MCQ")}>{t.typeMCQ}</button>
                <button type="button" className={`vqm-type-btn${type === "TF" ? " active" : ""}`} onClick={() => setType("TF")}>{t.typeTF}</button>
              </div>
              <label className="vqm-question-field">
                <span>{t.text}</span>
                <textarea autoFocus dir="auto" rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.textPh} />
              </label>
            </section>

            <section className="vqm-step">
              <div className="vqm-step-heading"><b>3</b><span>{t.step3}</span></div>
              {type === "MCQ" ? (
                <>
                  <p className="vqm-hint">{t.optionsHint}</p>
                  <div className="vqm-opts">
                    {options.map((option, index) => (
                      <div key={index} className={`vqm-opt-row${correctIndex === index ? " sel" : ""}`}>
                        <button type="button" className="vqm-opt-mark" onClick={() => setCorrectIndex(index)} aria-label={t.markCorrect} title={t.markCorrect}>
                          <Check size={17} />
                        </button>
                        <input dir="auto" value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={t.optionN(index)} />
                        {options.length > 2 && (
                          <button type="button" className="vqm-opt-remove" onClick={() => removeOption(index)} aria-label={t.removeOption} title={t.removeOption}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {options.length < 8 && <button type="button" className="vqm-add-opt" onClick={addOption}><Plus size={15} />{t.addOption}</button>}
                </>
              ) : (
                <div className="vqm-tf-row">
                  <button type="button" className={`vqm-tf-btn${tfAnswer === "true" ? " true" : ""}`} onClick={() => setTfAnswer("true")}><Check size={17}/>{t.trueLbl}</button>
                  <button type="button" className={`vqm-tf-btn${tfAnswer === "false" ? " false" : ""}`} onClick={() => setTfAnswer("false")}><X size={17}/>{t.falseLbl}</button>
                </div>
              )}
            </section>
            {error && <p className="vqm-error" role="alert">{error}</p>}
          </main>
        </div>

        <footer>
          <button className="vqm-btn ghost" onClick={onClose} disabled={loading}>{t.cancel}</button>
          <button className="vqm-btn primary" onClick={() => void save()} disabled={loading}>{loading ? t.saving : isEdit ? t.save : t.add}</button>
        </footer>
      </div>
      <style>{styles}</style>
    </div>,
    document.body,
  );
}

const styles = `
.vqm-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:clamp(12px,2vw,24px);background:rgba(26,26,26,.68);backdrop-filter:blur(10px);font-family:'Cairo',sans-serif}
.vqm-modal{width:min(1120px,100%);height:min(760px,calc(100dvh - 40px));display:flex;flex-direction:column;background:#FFFBF5;border:1px solid rgba(217,201,176,.5);border-radius:24px;box-shadow:0 34px 110px rgba(26,26,26,.42);overflow:hidden}
.vqm-modal>header{display:flex;justify-content:space-between;align-items:center;gap:18px;flex:none;padding:18px 22px;background:linear-gradient(125deg,#250B12,#4A0E1C 62%,#6B1E2D);color:#F7F3EB}
.vqm-modal>header h3{margin:3px 0 0;font-size:clamp(17px,2vw,22px);line-height:1.35}
.vqm-kicker{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:10px;font-weight:900}
.vqm-modal>header button{width:40px;height:40px;flex:none;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(255,255,255,.08);color:#FFFFFF;cursor:pointer}
.vqm-modal>header button:hover{background:rgba(255,255,255,.16)}
.vqm-body{min-height:0;flex:1;display:grid;grid-template-columns:minmax(340px,.88fr) minmax(440px,1.12fr);overflow-y:auto;background:#EFEAE0}
.vqm-timing,.vqm-editor{min-width:0;padding:22px}
.vqm-timing{position:sticky;top:0;align-self:start;border-inline-end:1px solid rgba(107,30,45,.12);background:#EFEAE0}
.vqm-editor{display:flex;flex-direction:column;gap:18px;background:#FFFBF5}
.vqm-step{display:flex;flex-direction:column;gap:11px;padding:18px;border:1px solid rgba(107,30,45,.11);border-radius:16px;background:#FFFFFF;box-shadow:0 8px 24px rgba(50,16,26,.035)}
.vqm-step-heading{display:flex;align-items:center;gap:9px;color:#4A0E1C;font-size:12px;font-weight:900}
.vqm-step-heading b{width:27px;height:27px;display:grid;place-items:center;flex:none;border-radius:9px;background:#6B1E2D;color:#F7F3EB;font-size:12px}
.vqm-hint{margin:0;font-size:11.5px;font-weight:700;color:#655B53;line-height:1.75}
.vqm-preview-shell{margin-top:14px;padding:7px;border-radius:16px;background:#1A1A1A;box-shadow:0 16px 36px rgba(26,26,26,.18)}
.vqm-preview{width:100%;max-height:300px;display:block;border-radius:11px;background:#1A1A1A;object-fit:contain}
.vqm-will-pause{display:flex;align-items:flex-start;gap:7px;margin:14px 0 0;padding:11px 12px;border:1px solid rgba(107,30,45,.1);border-radius:11px;background:#FFFBF5;color:#4A0E1C;font-size:11.5px;font-weight:800;line-height:1.7}
.vqm-will-pause svg{flex:none;margin-top:2px;color:#6B1E2D}
.vqm-capture{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:46px;margin-top:12px;border:1px solid #6B1E2D;border-radius:12px;background:#6B1E2D;color:#F7F3EB;padding:0 14px;font:900 12px 'Cairo',sans-serif;cursor:pointer}
.vqm-capture:hover{background:#4A0E1C}
.vqm-time-row{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:14px}
.vqm-time-row label{flex:1;display:flex;flex-direction:column;gap:5px;font-size:10px;font-weight:900;color:#655B53}
.vqm-time-row input{box-sizing:border-box;width:100%;min-height:48px;border:1px solid #D9C9B0;border-radius:12px;background:#FFFFFF;padding:0 10px;font:900 17px ui-monospace,Consolas,monospace;color:#32101A;text-align:center;direction:ltr}
.vqm-time-separator{padding-bottom:10px;color:#6B1E2D;font-size:22px;font-weight:900}
.vqm-type-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vqm-type-btn{min-height:48px;border:1px solid #D9C9B0;border-radius:12px;background:#FFFFFF;color:#6B1E2D;font:800 12.5px 'Cairo',sans-serif;cursor:pointer}
.vqm-type-btn.active{background:#6B1E2D;color:#F7F3EB;border-color:#6B1E2D;box-shadow:0 7px 18px rgba(107,30,45,.17)}
.vqm-question-field{display:flex;flex-direction:column;gap:6px;color:#655B53;font-size:10.5px;font-weight:900}
.vqm-body textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:108px;border:1px solid #D9C9B0;border-radius:12px;background:#FFFFFF;padding:12px 14px;font:inherit;font-size:14px;line-height:1.8;color:#32101A}
.vqm-body textarea:focus,.vqm-time-row input:focus,.vqm-opt-row input:focus{outline:none;border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}
.vqm-opts{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.vqm-opt-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:7px}
.vqm-opt-row input{box-sizing:border-box;width:100%;min-width:0;min-height:48px;border:1.5px solid #D9C9B0;border-radius:12px;background:#FFFFFF;padding:0 12px;font:inherit;font-size:13.5px;color:#32101A}
.vqm-opt-mark{width:44px;height:48px;display:grid;place-items:center;border:1.5px solid #D9C9B0;border-radius:12px;background:#FFFFFF;color:#8C8274;cursor:pointer;transition:all .12s}
.vqm-opt-mark:hover{border-color:#1B5E20;color:#1B5E20}
.vqm-opt-row.sel .vqm-opt-mark{background:#1B5E20;border-color:#1B5E20;color:#FFFFFF}
.vqm-opt-row.sel input{border-color:#1B5E20;background:rgba(27,94,32,.05)}
.vqm-opt-remove{width:38px;height:48px;display:grid;place-items:center;border:1px solid #E5E0D5;border-radius:11px;background:#FFFFFF;color:#6B1E2D;cursor:pointer}
.vqm-add-opt{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:42px;border:1px dashed rgba(107,30,45,.38);border-radius:11px;background:#FFFBF5;color:#6B1E2D;padding:0 14px;font:800 11.5px 'Cairo',sans-serif;cursor:pointer}
.vqm-tf-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.vqm-tf-btn{min-height:58px;display:flex;align-items:center;justify-content:center;gap:7px;border:1.5px solid #D9C9B0;border-radius:12px;background:#FFFFFF;color:#4A0E1C;font:800 13px 'Cairo',sans-serif;cursor:pointer}
.vqm-tf-btn.true{background:rgba(27,94,32,.13);border-color:#1B5E20;color:#1B5E20}
.vqm-tf-btn.false{background:rgba(107,30,45,.1);border-color:#6B1E2D;color:#6B1E2D}
.vqm-error{margin:0;padding:11px 13px;border-radius:11px;background:rgba(107,30,45,.09);border:1px solid rgba(107,30,45,.18);color:#6B1E2D;font-size:11.5px;font-weight:800}
.vqm-modal>footer{display:flex;justify-content:flex-end;gap:9px;flex:none;padding:14px 22px;border-top:1px solid rgba(184,155,94,.25);background:#FFFBF5}
.vqm-btn{min-height:46px;border:0;border-radius:12px;padding:0 24px;font:900 12.5px 'Cairo',sans-serif;cursor:pointer}
.vqm-btn.primary{min-width:180px;background:#6B1E2D;color:#F7F3EB;box-shadow:0 8px 20px rgba(107,30,45,.16)}
.vqm-btn.primary:disabled{opacity:.55;cursor:progress}
.vqm-btn.ghost{background:#FFFFFF;border:1px solid #D9C9B0;color:#6B1E2D}
@media(max-width:900px){
  .vqm-modal{width:min(720px,100%);height:min(900px,calc(100dvh - 24px))}
  .vqm-body{display:block;overflow-y:auto}
  .vqm-timing,.vqm-editor{padding:18px}
  .vqm-timing{position:static}
  .vqm-timing{border-inline-end:0;border-bottom:1px solid rgba(107,30,45,.12)}
  .vqm-preview{max-height:260px}
}
@media(max-width:600px){
  .vqm-overlay{padding:0;align-items:stretch}
  .vqm-modal{width:100%;height:100dvh;max-height:none;border-radius:0;border:0}
  .vqm-modal>header{padding:14px 15px}
  .vqm-timing,.vqm-editor{padding:14px}
  .vqm-step{padding:14px}
  .vqm-preview{max-height:190px}
  .vqm-opts{grid-template-columns:1fr}
  .vqm-modal>footer{padding:12px 15px}
  .vqm-btn{flex:1;padding:0 12px}
  .vqm-btn.primary{min-width:0}
}
`;
