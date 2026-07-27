"use client";

import { useRef, useState } from "react";
import { Check, Crosshair, Plus, Trash2, X } from "lucide-react";
import { formatVideoTime, type WorkshopVideoQuestion, type WorkshopVideoQuestionType } from "@/lib/workshop-videos";

const T = {
  ar: {
    titleAdd: "إضافة سؤال داخل الفيديو",
    titleEdit: "تعديل السؤال",
    step1: "١ — حدد لحظة ظهور السؤال",
    step2: "٢ — نوع السؤال ونصه",
    step3: "٣ — الإجابة الصحيحة",
    scrubHelp: "شغّل الفيديو وأوقفه عند اللحظة المناسبة ثم اضغط «التقاط اللحظة الحالية».",
    capture: "التقاط اللحظة الحالية",
    timestamp: "لحظة الظهور",
    minutes: "دقيقة",
    seconds: "ثانية",
    willPause: (time: string) => `سيتوقف الفيديو عند ${time} ويعرض السؤال.`,
    text: "نص السؤال",
    textPh: "اكتب نص السؤال هنا...",
    typeMCQ: "اختيار من متعدد",
    typeTF: "صح / خطأ",
    options: "الخيارات",
    optionsHint: "اكتب الخيارات ثم اضغط ✓ بجانب الإجابة الصحيحة",
    optionN: (i: number) => `الخيار ${i + 1}`,
    addOption: "إضافة خيار",
    markCorrect: "تحديد كإجابة صحيحة",
    removeOption: "حذف الخيار",
    correct: "الإجابة الصحيحة",
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
    step1: "1 — Zgjidh momentin e pyetjes",
    step2: "2 — Lloji dhe teksti i pyetjes",
    step3: "3 — Përgjigja e saktë",
    scrubHelp: "Luaj videon, ndaloje në momentin e duhur dhe kliko «Kap momentin aktual».",
    capture: "Kap momentin aktual",
    timestamp: "Momenti",
    minutes: "min",
    seconds: "sek",
    willPause: (time: string) => `Video do të ndalojë te ${time} dhe do të shfaqë pyetjen.`,
    text: "Teksti i pyetjes",
    textPh: "Shkruani tekstin e pyetjes...",
    typeMCQ: "Shumë opsione",
    typeTF: "E saktë / E gabuar",
    options: "Opsionet",
    optionsHint: "Shkruaj opsionet, pastaj kliko ✓ te përgjigja e saktë",
    optionN: (i: number) => `Opsioni ${i + 1}`,
    addOption: "Shto opsion",
    markCorrect: "Shëno si të saktë",
    removeOption: "Fshi opsionin",
    correct: "Përgjigja e saktë",
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
  // Tracked by INDEX, never by option text — matching on text meant clicking
  // the marker before typing silently did nothing, and editing an option's
  // text could quietly detach the correct answer.
  const [correctIndex, setCorrectIndex] = useState<number>(() => {
    if (!question || question.type !== "MCQ") return -1;
    const index = question.options.findIndex((option) => option.text === question.correct_answer);
    return index;
  });
  const [tfAnswer, setTfAnswer] = useState<string>(question?.type === "TF" ? question.correct_answer : "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const timestampSeconds = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

  function captureCurrentTime() {
    const element = previewRef.current;
    if (!element) return;
    const total = Math.floor(element.currentTime);
    setMinutes(String(Math.floor(total / 60)));
    setSeconds(String(total % 60));
    setError("");
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));
  }

  function addOption() {
    setOptions((current) => (current.length >= 8 ? current : [...current, ""]));
  }

  function removeOption(index: number) {
    setOptions((current) => {
      if (current.length <= 2) return current;
      return current.filter((_, i) => i !== index);
    });
    setCorrectIndex((current) => {
      if (current === index) return -1;
      return current > index ? current - 1 : current;
    });
  }

  function validate(): string {
    if (!text.trim()) return t.errText;
    const m = Number(minutes);
    const s = Number(seconds);
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s > 59) return t.errTime;
    if (videoDuration && timestampSeconds > videoDuration) return t.errPastEnd;
    if (type === "MCQ") {
      const filled = options.filter((option) => option.trim());
      if (filled.length < 2) return t.errMcqMin;
      if (correctIndex < 0 || !options[correctIndex]?.trim()) return t.errMcqAnswer;
    }
    if (type === "TF" && !tfAnswer) return t.errTfAnswer;
    return "";
  }

  async function save() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = { type, text: text.trim(), timestamp_seconds: timestampSeconds };
      if (type === "MCQ") {
        // Send only non-empty options, and resolve the correct answer to the
        // text at the selected index within that same filtered list.
        const filled = options.map((option) => option.trim()).filter(Boolean);
        const correctText = options[correctIndex]?.trim() ?? "";
        body.options = filled;
        body.correct_answer = correctText;
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

  return (
    <div className="vqm-overlay" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}>
      <div className="vqm-modal" role="dialog" aria-modal="true">
        <header>
          <h3>{isEdit ? t.titleEdit : t.titleAdd}</h3>
          <button onClick={onClose} disabled={loading} aria-label={t.cancel}><X size={18} /></button>
        </header>

        <div className="vqm-body">
          <section className="vqm-step">
            <span className="vqm-step-label">{t.step1}</span>
            {/* Never render <video src=""> — an empty src makes the browser
                re-request the current page instead of a media file. */}
            {videoUrl ? (
              <video ref={previewRef} src={videoUrl} controls playsInline preload="metadata" className="vqm-preview" />
            ) : null}
            {videoUrl && <p className="vqm-hint">{t.scrubHelp}</p>}
            <div className="vqm-time-row">
              {videoUrl && (
                <button type="button" className="vqm-capture" onClick={captureCurrentTime}>
                  <Crosshair size={14} />{t.capture}
                </button>
              )}
              <label>
                <input type="number" min={0} inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
                <span>{t.minutes}</span>
              </label>
              <label>
                <input type="number" min={0} max={59} inputMode="numeric" value={seconds} onChange={(event) => setSeconds(event.target.value)} />
                <span>{t.seconds}</span>
              </label>
            </div>
            <p className="vqm-will-pause">{t.willPause(formatVideoTime(timestampSeconds))}</p>
          </section>

          <section className="vqm-step">
            <span className="vqm-step-label">{t.step2}</span>
            <div className="vqm-type-row">
              <button type="button" className={`vqm-type-btn${type === "MCQ" ? " active" : ""}`} onClick={() => setType("MCQ")}>{t.typeMCQ}</button>
              <button type="button" className={`vqm-type-btn${type === "TF" ? " active" : ""}`} onClick={() => setType("TF")}>{t.typeTF}</button>
            </div>
            <textarea dir="auto" rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.textPh} aria-label={t.text} />
          </section>

          <section className="vqm-step">
            <span className="vqm-step-label">{t.step3}</span>
            {type === "MCQ" ? (
              <>
                <p className="vqm-hint">{t.optionsHint}</p>
                <div className="vqm-opts">
                  {options.map((option, index) => (
                    <div key={index} className={`vqm-opt-row${correctIndex === index ? " sel" : ""}`}>
                      <button
                        type="button"
                        className="vqm-opt-mark"
                        onClick={() => setCorrectIndex(index)}
                        aria-label={t.markCorrect}
                        title={t.markCorrect}
                      >
                        <Check size={15} />
                      </button>
                      <input
                        dir="auto"
                        value={option}
                        onChange={(event) => updateOption(index, event.target.value)}
                        placeholder={t.optionN(index)}
                      />
                      {options.length > 2 && (
                        <button type="button" className="vqm-opt-remove" onClick={() => removeOption(index)} aria-label={t.removeOption} title={t.removeOption}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 8 && (
                  <button type="button" className="vqm-add-opt" onClick={addOption}><Plus size={14} />{t.addOption}</button>
                )}
              </>
            ) : (
              <div className="vqm-tf-row">
                <button type="button" className={`vqm-tf-btn${tfAnswer === "true" ? " true" : ""}`} onClick={() => setTfAnswer("true")}>{t.trueLbl}</button>
                <button type="button" className={`vqm-tf-btn${tfAnswer === "false" ? " false" : ""}`} onClick={() => setTfAnswer("false")}>{t.falseLbl}</button>
              </div>
            )}
          </section>

          {error && <p className="vqm-error" role="alert">{error}</p>}
        </div>

        <footer>
          <button className="vqm-btn ghost" onClick={onClose} disabled={loading}>{t.cancel}</button>
          <button className="vqm-btn primary" onClick={() => void save()} disabled={loading}>
            {loading ? t.saving : isEdit ? t.save : t.add}
          </button>
        </footer>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.vqm-overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(26,26,26,.6);backdrop-filter:blur(6px);font-family:'Cairo',sans-serif}
.vqm-modal{width:min(620px,100%);max-height:92vh;display:flex;flex-direction:column;background:#FFFBF5;border:1px solid rgba(217,201,176,.45);border-radius:20px;box-shadow:0 26px 74px rgba(26,26,26,.34);overflow:hidden}
.vqm-modal>header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex:none;padding:16px 20px;background:linear-gradient(135deg,#250B12,#6B1E2D);color:#F7F3EB}
.vqm-modal>header h3{margin:0;font-size:16px}
.vqm-modal>header button{width:32px;height:32px;flex:none;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.08);color:#FFFFFF;cursor:pointer}
.vqm-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:18px}

.vqm-step{display:flex;flex-direction:column;gap:9px}
.vqm-step-label{font-size:11px;font-weight:900;color:#6B1E2D;letter-spacing:.2px}
.vqm-hint{margin:0;font-size:11px;font-weight:700;color:#796A62;line-height:1.7}
.vqm-preview{width:100%;max-height:230px;border-radius:12px;background:#1A1A1A;object-fit:contain}
.vqm-will-pause{margin:0;padding:8px 11px;border-radius:9px;background:rgba(184,160,130,.16);color:#4A0E1C;font-size:11px;font-weight:800}

.vqm-time-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px}
.vqm-capture{display:inline-flex;align-items:center;gap:6px;min-height:42px;border:1px solid #6B1E2D;border-radius:10px;background:rgba(107,30,45,.07);color:#6B1E2D;padding:0 13px;font:900 11.5px 'Cairo',sans-serif;cursor:pointer}
.vqm-capture:hover{background:#6B1E2D;color:#F7F3EB}
.vqm-time-row label{display:flex;flex-direction:column;gap:3px;font-size:10px;font-weight:800;color:#796A62}
.vqm-time-row input{width:74px;min-height:42px;border:1px solid #D9C9B0;border-radius:10px;background:#FFFFFF;padding:0 10px;font:800 14px 'Cairo',sans-serif;color:#32101A;text-align:center}

.vqm-type-row{display:flex;gap:8px}
.vqm-type-btn{flex:1;min-height:44px;border:1px solid #D9C9B0;border-radius:11px;background:#FFFFFF;color:#6B1E2D;font:800 12.5px 'Cairo',sans-serif;cursor:pointer}
.vqm-type-btn.active{background:#6B1E2D;color:#F7F3EB;border-color:#6B1E2D}
.vqm-body textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:82px;border:1px solid #D9C9B0;border-radius:11px;background:#FFFFFF;padding:11px 12px;font:inherit;font-size:13.5px;line-height:1.7;color:#32101A}
.vqm-body textarea:focus,.vqm-time-row input:focus,.vqm-opt-row input:focus{outline:none;border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}

.vqm-opts{display:flex;flex-direction:column;gap:8px}
.vqm-opt-row{display:flex;align-items:center;gap:8px}
.vqm-opt-row input{flex:1;min-width:0;min-height:46px;border:1.5px solid #D9C9B0;border-radius:11px;background:#FFFFFF;padding:0 12px;font:inherit;font-size:13.5px;color:#32101A}
.vqm-opt-mark{width:40px;height:46px;flex:none;display:grid;place-items:center;border:1.5px solid #D9C9B0;border-radius:11px;background:#FFFFFF;color:#D9C9B0;cursor:pointer;transition:all .12s}
.vqm-opt-mark:hover{border-color:#1B5E20;color:#1B5E20}
.vqm-opt-row.sel .vqm-opt-mark{background:#1B5E20;border-color:#1B5E20;color:#FFFFFF}
.vqm-opt-row.sel input{border-color:#1B5E20;background:rgba(27,94,32,.05)}
.vqm-opt-remove{width:36px;height:46px;flex:none;display:grid;place-items:center;border:1px solid #E5E0D5;border-radius:10px;background:#FFFFFF;color:#6B1E2D;cursor:pointer}
.vqm-add-opt{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:38px;border:1px dashed rgba(107,30,45,.35);border-radius:10px;background:none;color:#6B1E2D;padding:0 13px;font:800 11.5px 'Cairo',sans-serif;cursor:pointer}

.vqm-tf-row{display:flex;gap:8px}
.vqm-tf-btn{flex:1;min-height:50px;border:1.5px solid #D9C9B0;border-radius:11px;background:#FFFFFF;color:#4A0E1C;font:800 13px 'Cairo',sans-serif;cursor:pointer}
.vqm-tf-btn.true{background:rgba(27,94,32,.13);border-color:#1B5E20;color:#1B5E20}
.vqm-tf-btn.false{background:rgba(107,30,45,.1);border-color:#6B1E2D;color:#6B1E2D}

.vqm-error{margin:0;padding:10px 12px;border-radius:10px;background:rgba(107,30,45,.09);border:1px solid rgba(107,30,45,.18);color:#6B1E2D;font-size:11.5px;font-weight:800}
.vqm-modal>footer{display:flex;justify-content:flex-end;gap:8px;flex:none;padding:14px 20px;border-top:1px solid rgba(184,155,94,.2);background:#FFFBF5}
.vqm-btn{min-height:44px;border:0;border-radius:11px;padding:0 20px;font:900 12.5px 'Cairo',sans-serif;cursor:pointer}
.vqm-btn.primary{background:#6B1E2D;color:#F7F3EB}
.vqm-btn.primary:disabled{opacity:.55;cursor:progress}
.vqm-btn.ghost{background:#FFFFFF;border:1px solid #D9C9B0;color:#6B1E2D}

@media(max-width:560px){
  .vqm-overlay{padding:0;align-items:stretch}
  .vqm-modal{width:100%;max-height:100vh;border-radius:0;border:0}
  .vqm-body{padding:14px 15px;gap:16px}
  .vqm-preview{max-height:180px}
  .vqm-capture{width:100%;justify-content:center}
  .vqm-time-row label{flex:1}
  .vqm-time-row input{width:100%;box-sizing:border-box}
  .vqm-modal>footer{padding:12px 15px}
  .vqm-btn{flex:1;padding:0 12px}
}
`;
