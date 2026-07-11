"use client";

import { useState } from "react";
import { Icons } from "./icons";
import type { LessonQuestion, QuestionType } from "./types";
import { useLang } from "@/lib/language-context";

const T = {
  ar: {
    title: (e: boolean) => e ? "تعديل السؤال" : "إضافة سؤال",
    qText: "نص السؤال", qTextPh: "اكتب نص السؤال هنا...",
    options: "الخيارات", optionsHint: "اضغط الدائرة لتحديد الإجابة",
    optionN: (i: number) => `الخيار ${i + 1}`,
    correct: "الإجابة الصحيحة",
    trueLbl: "صح", falseLbl: "خطأ",
    modelAnswer: "الإجابة النموذجية",
    modelPh: "اكتب الإجابة النموذجية المتوقعة...",
    pairs: "أزواج المطابقة", pairsHint: "العنصر → المطابق",
    pairLeft: "العنصر", pairRight: "المطابق", addPair: "إضافة زوج",
    save: "حفظ التعديلات", add: "إضافة السؤال",
    cancel: "إلغاء", saving: "جارٍ الحفظ...",
    typeMCQ: "اختيار من متعدد", typeTF: "صح / خطأ",
    typeWritten: "إجابة مكتوبة", typeMatching: "مطابقة",
    errText: "نص السؤال مطلوب",
    errMcqMin: "يجب إدخال خيارين على الأقل",
    errMcqAnswer: "يجب تحديد الإجابة الصحيحة",
    errTfAnswer: "يجب تحديد الإجابة الصحيحة",
    errWritten: "الإجابة النموذجية مطلوبة",
    errPairsMin: "يجب إدخال زوجين على الأقل",
    errPairsIncomplete: "يجب إكمال جميع أزواج المطابقة",
  },
  sq: {
    title: (e: boolean) => e ? "Modifiko pyetjen" : "Shto pyetje",
    qText: "Teksti i pyetjes", qTextPh: "Shkruani tekstin e pyetjes...",
    options: "Opsionet", optionsHint: "Kliko rrethin për përgjigjen e saktë",
    optionN: (i: number) => `Opsioni ${i + 1}`,
    correct: "Përgjigja e saktë",
    trueLbl: "E saktë", falseLbl: "E gabuar",
    modelAnswer: "Përgjigja model",
    modelPh: "Shkruani përgjigjen e pritur...",
    pairs: "Çiftet e përputhjes", pairsHint: "Elementi → I përputhshmi",
    pairLeft: "Elementi", pairRight: "I përputhshmi", addPair: "Shto çift",
    save: "Ruaj ndryshimet", add: "Shto pyetjen",
    cancel: "Anulo", saving: "Duke ruajtur...",
    typeMCQ: "Shumë opsione", typeTF: "E saktë / E gabuar",
    typeWritten: "Përgjigje e shkruar", typeMatching: "Përputhje",
    errText: "Teksti i pyetjes është i detyrueshëm",
    errMcqMin: "Duhen të paktën 2 opsione",
    errMcqAnswer: "Duhet të zgjidhni përgjigjen e saktë",
    errTfAnswer: "Duhet të zgjidhni përgjigjen e saktë",
    errWritten: "Përgjigja model është e detyrueshme",
    errPairsMin: "Duhen të paktën 2 çifte",
    errPairsIncomplete: "Plotësoni të gjitha çiftet",
  },
} as const;

interface Props {
  lessonId: string;
  question?: LessonQuestion;
  onClose: () => void;
  onSaved: () => void;
}

export function QuestionModal({ lessonId, question, onClose, onSaved }: Props) {
  const { lang } = useLang();
  const t = T[lang === "sq" ? "sq" : "ar"];
  const isEdit = !!question;

  const initOptions = (): string[] => {
    if (!question?.options?.length) return ["", "", "", ""];
    const opts = question.options.map((o) => o.text);
    while (opts.length < 4) opts.push("");
    return opts;
  };
  const initPairs = (): { left: string; right: string }[] => {
    if (!question?.matching_pairs?.length)
      return [{ left: "", right: "" }, { left: "", right: "" }];
    return question.matching_pairs.map((p) => ({ left: p.left, right: p.right }));
  };

  const [type, setType] = useState<QuestionType>(question?.type ?? "MCQ");
  const [text, setText] = useState(question?.text ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer ?? "");
  const [options, setOptions] = useState<string[]>(initOptions);
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>(initPairs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    if (correctAnswer === options[i]) setCorrectAnswer(val);
    next[i] = val;
    setOptions(next);
  };
  const updatePair = (i: number, side: "left" | "right", val: string) => {
    const next = [...pairs];
    next[i] = { ...next[i], [side]: val };
    setPairs(next);
  };
  const addPair = () => setPairs([...pairs, { left: "", right: "" }]);
  const removePair = (i: number) => {
    if (pairs.length <= 2) return;
    setPairs(pairs.filter((_, idx) => idx !== i));
  };

  const validate = (): string => {
    if (!text.trim()) return t.errText;
    if (type === "MCQ") {
      if (options.filter((o) => o.trim()).length < 2) return t.errMcqMin;
      if (!correctAnswer) return t.errMcqAnswer;
    }
    if (type === "TF" && !correctAnswer) return t.errTfAnswer;
    if (type === "WRITTEN" && !correctAnswer.trim()) return t.errWritten;
    if (type === "MATCHING") {
      if (pairs.length < 2) return t.errPairsMin;
      if (pairs.some((p) => !p.left.trim() || !p.right.trim())) return t.errPairsIncomplete;
    }
    return "";
  };

  const save = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = { type, text: text.trim() };
      if (type === "MCQ") {
        body.correct_answer = correctAnswer;
        body.options = options.filter((o) => o.trim());
      } else if (type === "TF") {
        body.correct_answer = correctAnswer;
      } else if (type === "WRITTEN") {
        body.correct_answer = correctAnswer.trim();
      } else if (type === "MATCHING") {
        body.correct_answer = null;
        body.pairs = pairs;
      }
      const url = isEdit
        ? `/api/teacher/lessons/questions/${question!.id}`
        : `/api/teacher/lessons/${lessonId}/questions`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  };

  const typeButtons: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
    { value: "MCQ", label: t.typeMCQ, icon: Icons.modules },
    { value: "TF", label: t.typeTF, icon: Icons.check },
    { value: "WRITTEN", label: t.typeWritten, icon: Icons.text },
    { value: "MATCHING", label: t.typeMatching, icon: Icons.arrow },
  ];

  return (
    <div className="lb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb-modal wide">
        <div className="lb-modal-hd">
          <div className="lb-modal-icon" style={{ color: type === "MATCHING" ? "#655B53" : "var(--gold)" }}>
            {Icons.questions}
          </div>
          <div className="lb-modal-hd-text">
            <h3 className="lb-modal-title">{t.title(isEdit)}</h3>
          </div>
          <button className="lb-close-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <div className="lb-modal-body">
          <div className="lb-type-row">
            {typeButtons.map((btn) => (
              <button
                key={btn.value}
                className={`lb-type-btn${type === btn.value ? " active" : ""}`}
                onClick={() => { setType(btn.value); setCorrectAnswer(""); }}
                type="button"
              >
                <span className="lb-type-btn-icon">{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
          <div className="lb-field">
            <label className="lb-label">{t.qText}</label>
            <textarea className="lb-textarea" dir="auto" rows={3}
              value={text} onChange={(e) => setText(e.target.value)} placeholder={t.qTextPh} />
          </div>
          {type === "MCQ" && (
            <div className="lb-field">
              <label className="lb-label">
                {t.options} <span className="lb-label-hint">{t.optionsHint}</span>
              </label>
              <div className="lb-opts">
                {options.map((opt, i) => (
                  <div key={i} className={`lb-opt-row${correctAnswer && correctAnswer === opt && opt.trim() ? " sel" : ""}`}>
                    <button className="lb-opt-radio" onClick={() => opt.trim() && setCorrectAnswer(opt)} type="button">
                      {correctAnswer === opt && opt.trim() ? "●" : ""}
                    </button>
                    <input className="lb-input" dir="auto" value={opt}
                      onChange={(e) => updateOption(i, e.target.value)} placeholder={t.optionN(i)} />
                    <span className="lb-opt-num">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {type === "TF" && (
            <div className="lb-field">
              <label className="lb-label">{t.correct}</label>
              <div className="lb-tf-row">
                <button className={`lb-tf-btn${correctAnswer === "true" ? " true" : ""}`}
                  onClick={() => setCorrectAnswer("true")} type="button">
                  {Icons.check} {t.trueLbl}
                </button>
                <button className={`lb-tf-btn${correctAnswer === "false" ? " false" : ""}`}
                  onClick={() => setCorrectAnswer("false")} type="button">
                  {Icons.x} {t.falseLbl}
                </button>
              </div>
            </div>
          )}
          {type === "WRITTEN" && (
            <div className="lb-field">
              <label className="lb-label">{t.modelAnswer}</label>
              <textarea className="lb-textarea" dir="auto" rows={2}
                value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder={t.modelPh} />
            </div>
          )}
          {type === "MATCHING" && (
            <div className="lb-field">
              <label className="lb-label">
                {t.pairs} <span className="lb-label-hint">{t.pairsHint}</span>
              </label>
              <div className="lb-pairs">
                {pairs.map((pair, i) => (
                  <div key={i} className="lb-pair-row">
                    <input className="lb-input" dir="auto" value={pair.left}
                      onChange={(e) => updatePair(i, "left", e.target.value)} placeholder={t.pairLeft} />
                    <span className="lb-pair-arrow">{Icons.arrow}</span>
                    <input className="lb-input" dir="auto" value={pair.right}
                      onChange={(e) => updatePair(i, "right", e.target.value)} placeholder={t.pairRight} />
                    {pairs.length > 2 && (
                      <button className="lb-icon-btn danger" onClick={() => removePair(i)} type="button">
                        {Icons.trash}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button className="lb-add-pill" onClick={addPair} type="button" style={{ alignSelf: "flex-start" }}>
                {Icons.plus} {t.addPair}
              </button>
            </div>
          )}
          {error && <div className="lb-error">{Icons.x}{error}</div>}
        </div>
        <div className="lb-modal-ft">
          <button className="lb-btn-primary" onClick={save} disabled={loading}>
            {loading ? <><span className="lb-btn-spinner" />{t.saving}</>
              : isEdit ? <>{Icons.check}{t.save}</> : <>{Icons.plus}{t.add}</>}
          </button>
          <button className="lb-btn-ghost" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
