"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { WorkshopVideoQuestion, WorkshopVideoQuestionType } from "@/lib/workshop-videos";

const T = {
  ar: {
    titleAdd: "إضافة سؤال داخل الفيديو",
    titleEdit: "تعديل السؤال",
    timestamp: "لحظة الظهور (دقيقة:ثانية)",
    timestampHelp: "سيتوقف الفيديو تلقائياً عند هذه اللحظة ويعرض السؤال.",
    text: "نص السؤال",
    textPh: "اكتب نص السؤال هنا...",
    typeMCQ: "اختيار من متعدد",
    typeTF: "صح / خطأ",
    options: "الخيارات",
    optionsHint: "اضغط الدائرة لتحديد الإجابة الصحيحة",
    optionN: (i: number) => `الخيار ${i + 1}`,
    correct: "الإجابة الصحيحة",
    trueLbl: "صح",
    falseLbl: "خطأ",
    save: "حفظ",
    add: "إضافة السؤال",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ...",
    errText: "نص السؤال مطلوب",
    errTime: "أدخل لحظة صحيحة",
    errMcqMin: "أدخل خيارين على الأقل",
    errMcqAnswer: "حدد الإجابة الصحيحة",
    errTfAnswer: "حدد الإجابة الصحيحة",
  },
  sq: {
    titleAdd: "Shto pyetje brenda videos",
    titleEdit: "Modifiko pyetjen",
    timestamp: "Momenti i shfaqjes (minutë:sekondë)",
    timestampHelp: "Video ndalon automatikisht në këtë moment dhe shfaq pyetjen.",
    text: "Teksti i pyetjes",
    textPh: "Shkruani tekstin e pyetjes...",
    typeMCQ: "Shumë opsione",
    typeTF: "E saktë / E gabuar",
    options: "Opsionet",
    optionsHint: "Kliko rrethin për përgjigjen e saktë",
    optionN: (i: number) => `Opsioni ${i + 1}`,
    correct: "Përgjigja e saktë",
    trueLbl: "E saktë",
    falseLbl: "E gabuar",
    save: "Ruaj",
    add: "Shto pyetjen",
    cancel: "Anulo",
    saving: "Duke ruajtur...",
    errText: "Teksti i pyetjes është i detyrueshëm",
    errTime: "Vendos një moment të vlefshëm",
    errMcqMin: "Duhen të paktën 2 opsione",
    errMcqAnswer: "Zgjidh përgjigjen e saktë",
    errTfAnswer: "Zgjidh përgjigjen e saktë",
  },
} as const;

function secondsToParts(total: number) {
  return { m: Math.floor(total / 60), s: total % 60 };
}

export function VideoQuestionModal({
  workshopId,
  videoId,
  question,
  lang,
  onClose,
  onSaved,
}: {
  workshopId: string;
  videoId: string;
  question?: WorkshopVideoQuestion;
  lang: "ar" | "sq";
  onClose: () => void;
  onSaved: (question: WorkshopVideoQuestion) => void;
}) {
  const t = T[lang];
  const isEdit = !!question;
  const initTime = secondsToParts(question?.timestamp_seconds ?? 0);

  const [type, setType] = useState<WorkshopVideoQuestionType>(question?.type ?? "MCQ");
  const [text, setText] = useState(question?.text ?? "");
  const [minutes, setMinutes] = useState(String(initTime.m));
  const [seconds, setSeconds] = useState(String(initTime.s));
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer ?? "");
  const [options, setOptions] = useState<string[]>(() => {
    const opts = question?.options?.map((o) => o.text) ?? ["", "", "", ""];
    while (opts.length < 4) opts.push("");
    return opts;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateOption(i: number, val: string) {
    const next = [...options];
    if (correctAnswer === options[i]) setCorrectAnswer(val);
    next[i] = val;
    setOptions(next);
  }

  function validate(): string {
    if (!text.trim()) return t.errText;
    const m = Number(minutes), s = Number(seconds);
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s > 59) return t.errTime;
    if (type === "MCQ") {
      if (options.filter((o) => o.trim()).length < 2) return t.errMcqMin;
      if (!correctAnswer) return t.errMcqAnswer;
    }
    if (type === "TF" && !correctAnswer) return t.errTfAnswer;
    return "";
  }

  async function save() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      const timestamp_seconds = Number(minutes) * 60 + Number(seconds);
      const body: Record<string, unknown> = { type, text: text.trim(), timestamp_seconds };
      if (type === "MCQ") {
        body.correct_answer = correctAnswer;
        body.options = options.filter((o) => o.trim());
      } else {
        body.correct_answer = correctAnswer;
      }
      const url = isEdit
        ? `/api/school-admin/workshops/videos/questions/${question!.id}`
        : `/api/school-admin/workshops/${workshopId}/videos/${videoId}/questions`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      const data = await res.json();
      onSaved(data.question);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vqm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vqm-modal">
        <header>
          <h3>{isEdit ? t.titleEdit : t.titleAdd}</h3>
          <button onClick={onClose} aria-label={t.cancel}><X size={18} /></button>
        </header>
        <div className="vqm-body">
          <div className="vqm-type-row">
            <button type="button" className={`vqm-type-btn${type === "MCQ" ? " active" : ""}`} onClick={() => { setType("MCQ"); setCorrectAnswer(""); }}>{t.typeMCQ}</button>
            <button type="button" className={`vqm-type-btn${type === "TF" ? " active" : ""}`} onClick={() => { setType("TF"); setCorrectAnswer(""); }}>{t.typeTF}</button>
          </div>

          <label className="vqm-field">
            <span>{t.timestamp}</span>
            <div className="vqm-time-row">
              <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <span>:</span>
              <input type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
            </div>
            <small>{t.timestampHelp}</small>
          </label>

          <label className="vqm-field">
            <span>{t.text}</span>
            <textarea dir="auto" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.textPh} />
          </label>

          {type === "MCQ" ? (
            <div className="vqm-field">
              <span>{t.options} <em>{t.optionsHint}</em></span>
              <div className="vqm-opts">
                {options.map((opt, i) => (
                  <div key={i} className={`vqm-opt-row${correctAnswer && correctAnswer === opt && opt.trim() ? " sel" : ""}`}>
                    <button type="button" className="vqm-opt-radio" onClick={() => opt.trim() && setCorrectAnswer(opt)}>
                      {correctAnswer === opt && opt.trim() ? <CheckCircle2 size={16} /> : null}
                    </button>
                    <input dir="auto" value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={t.optionN(i)} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="vqm-field">
              <span>{t.correct}</span>
              <div className="vqm-tf-row">
                <button type="button" className={`vqm-tf-btn${correctAnswer === "true" ? " true" : ""}`} onClick={() => setCorrectAnswer("true")}>{t.trueLbl}</button>
                <button type="button" className={`vqm-tf-btn${correctAnswer === "false" ? " false" : ""}`} onClick={() => setCorrectAnswer("false")}>{t.falseLbl}</button>
              </div>
            </div>
          )}

          {error && <p className="vqm-error">{error}</p>}
        </div>
        <footer>
          <button className="vqm-btn ghost" onClick={onClose}>{t.cancel}</button>
          <button className="vqm-btn primary" onClick={() => void save()} disabled={loading}>{loading ? t.saving : isEdit ? t.save : t.add}</button>
        </footer>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.vqm-overlay{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:18px;background:rgba(26,26,26,.58);backdrop-filter:blur(6px)}
.vqm-modal{width:min(560px,100%);max-height:90vh;overflow:auto;background:#FFFBF5;border:1px solid rgba(217,201,176,.4);border-radius:18px;box-shadow:0 24px 70px rgba(26,26,26,.3);font-family:'Cairo',sans-serif}
.vqm-modal>header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;background:linear-gradient(135deg,#250B12,#6B1E2D);color:#F7F3EB}
.vqm-modal>header h3{margin:0;font-size:17px}
.vqm-modal>header button{width:32px;height:32px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.vqm-body{padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.vqm-type-row{display:flex;gap:8px}
.vqm-type-btn{flex:1;border:1px solid #D9C9B0;border-radius:10px;background:#fff;color:#6B1E2D;padding:10px;font:800 12px 'Cairo',sans-serif;cursor:pointer}
.vqm-type-btn.active{background:#6B1E2D;color:#F7F3EB;border-color:#6B1E2D}
.vqm-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:900;color:#4A0E1C}
.vqm-field em{font-weight:700;font-style:normal;color:#8C8274;font-size:10px;margin-inline-start:6px}
.vqm-field input,.vqm-field textarea{border:1px solid #D9C9B0;border-radius:10px;padding:9px 11px;font:inherit;font-size:13px;color:#32101A;background:#fff}
.vqm-field textarea{resize:vertical;min-height:74px}
.vqm-field small{font-weight:700;color:#796A62;font-size:10px}
.vqm-time-row{display:flex;align-items:center;gap:6px}
.vqm-time-row input{width:70px;text-align:center}
.vqm-opts{display:flex;flex-direction:column;gap:7px}
.vqm-opt-row{display:flex;align-items:center;gap:8px}
.vqm-opt-row input{flex:1}
.vqm-opt-radio{width:26px;height:26px;flex:none;display:grid;place-items:center;border:1.5px solid #D9C9B0;border-radius:50%;background:#fff;color:#2E7D32;cursor:pointer}
.vqm-opt-row.sel .vqm-opt-radio{border-color:#2E7D32;background:rgba(46,125,50,.12)}
.vqm-tf-row{display:flex;gap:8px}
.vqm-tf-btn{flex:1;border:1px solid #D9C9B0;border-radius:10px;background:#fff;padding:10px;font:800 12px 'Cairo',sans-serif;cursor:pointer;color:#4A0E1C}
.vqm-tf-btn.true{background:rgba(46,125,50,.14);border-color:#2E7D32;color:#1B5E20}
.vqm-tf-btn.false{background:rgba(107,30,45,.12);border-color:#6B1E2D;color:#6B1E2D}
.vqm-error{margin:0;padding:9px 11px;border-radius:9px;background:rgba(107,30,45,.08);color:#6B1E2D;font-size:11px;font-weight:800}
.vqm-modal>footer{display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;border-top:1px solid rgba(184,155,94,.18)}
.vqm-btn{border:0;border-radius:10px;padding:10px 16px;font:800 12px 'Cairo',sans-serif;cursor:pointer}
.vqm-btn.primary{background:#6B1E2D;color:#F7F3EB}
.vqm-btn.primary:disabled{opacity:.55;cursor:progress}
.vqm-btn.ghost{background:#fff;border:1px solid #D9C9B0;color:#6B1E2D}
`;
