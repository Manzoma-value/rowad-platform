"use client";

import { useState } from "react";
import { Icons } from "./icons";
import type { Question, QuestionType } from "./types";

interface Props {
  moduleId: string;
  question?: Question;
  onClose: () => void;
  onSaved: () => void;
}

export function QuestionModal({ moduleId, question, onClose, onSaved }: Props) {
  const isEdit = !!question;

  const initOptions = (): string[] => {
    if (!question?.options?.length) return ["", "", "", ""];
    const opts = question.options.map((o) => o.text);
    while (opts.length < 4) opts.push("");
    return opts;
  };

  const initPairs = (): { left: string; right: string }[] => {
    if (!question?.matching_pairs?.length)
      return [
        { left: "", right: "" },
        { left: "", right: "" },
      ];
    return question.matching_pairs.map((p) => ({
      left: p.left,
      right: p.right,
    }));
  };

  const [type, setType] = useState<QuestionType>(question?.type ?? "MCQ");
  const [text, setText] = useState(question?.text ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(
    question?.correct_answer ?? "",
  );
  const [options, setOptions] = useState<string[]>(initOptions);
  const [pairs, setPairs] =
    useState<{ left: string; right: string }[]>(initPairs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
    if (correctAnswer === options[i]) setCorrectAnswer(val);
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
    if (!text.trim()) return "نص السؤال مطلوب";
    if (type === "MCQ") {
      if (options.filter((o) => o.trim()).length < 2)
        return "يجب إدخال خيارين على الأقل";
      if (!correctAnswer) return "يجب تحديد الإجابة الصحيحة";
    }
    if (type === "TF" && !correctAnswer) return "يجب تحديد الإجابة الصحيحة";
    if (type === "WRITTEN" && !correctAnswer.trim())
      return "الإجابة النموذجية مطلوبة";
    if (type === "MATCHING") {
      if (pairs.length < 2) return "يجب إدخال زوجين على الأقل";
      if (pairs.some((p) => !p.left.trim() || !p.right.trim()))
        return "يجب إكمال جميع أزواج المطابقة";
    }
    return "";
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
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
        ? `/api/school-admin/roadmap/questions/${question!.id}`
        : `/api/school-admin/roadmap/modules/${moduleId}/questions`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  // Icons are pre-rendered JSX — use {Icons.x} not <Icons.x />
  const typeButtons: {
    value: QuestionType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "MCQ", label: "اختيار من متعدد", icon: Icons.modules },
    { value: "TF", label: "صح / خطأ", icon: Icons.check },
    { value: "WRITTEN", label: "إجابة مكتوبة", icon: Icons.text },
    { value: "MATCHING", label: "مطابقة", icon: Icons.arrow },
  ];

  return (
    <div
      className="rb-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rb-modal wide">
        {/* Header */}
        <div className="rb-modal-hd">
          <span
            className="rb-modal-icon"
            style={{ color: type === "MATCHING" ? "#4A2080" : "var(--gold)" }}
          >
            {Icons.questions}
          </span>
          <span className="rb-modal-title">
            {isEdit ? "تعديل السؤال" : "إضافة سؤال"}
          </span>
          <button className="rb-icon-btn" onClick={onClose}>
            {Icons.close}
          </button>
        </div>

        {/* Body */}
        <div className="rb-modal-body">
          {/* Type selector */}
          <div className="rb-type-row">
            {typeButtons.map((btn) => (
              <button
                key={btn.value}
                className={`rb-type-btn${type === btn.value ? " active" : ""}`}
                onClick={() => {
                  setType(btn.value);
                  setCorrectAnswer("");
                }}
              >
                <span className="rb-type-btn-icon">{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Question text */}
          <div className="rb-field">
            <label className="rb-label">نص السؤال</label>
            <textarea
              className="rb-textarea"
              dir="rtl"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب نص السؤال هنا..."
            />
          </div>

          {/* MCQ */}
          {type === "MCQ" && (
            <div className="rb-field">
              <label className="rb-label">
                الخيارات
                <span className="rb-label-hint">
                  اضغط الدائرة لتحديد الإجابة
                </span>
              </label>
              <div className="rb-opts">
                {options.map((opt, i) => (
                  <div
                    key={i}
                    className={`rb-opt-row${correctAnswer && correctAnswer === opt && opt.trim() ? " sel" : ""}`}
                  >
                    <button
                      className="rb-opt-radio"
                      onClick={() => opt.trim() && setCorrectAnswer(opt)}
                      type="button"
                    >
                      {correctAnswer === opt && opt.trim() ? "●" : "○"}
                    </button>
                    <input
                      className="rb-input"
                      dir="rtl"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`الخيار ${i + 1}`}
                    />
                    <span className="rb-opt-num">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TF */}
          {type === "TF" && (
            <div className="rb-field">
              <label className="rb-label">الإجابة الصحيحة</label>
              <div className="rb-tf-row">
                <button
                  className={`rb-tf-btn${correctAnswer === "true" ? " true" : ""}`}
                  onClick={() => setCorrectAnswer("true")}
                >
                  {Icons.check} صح
                </button>
                <button
                  className={`rb-tf-btn${correctAnswer === "false" ? " false" : ""}`}
                  onClick={() => setCorrectAnswer("false")}
                >
                  {Icons.x} خطأ
                </button>
              </div>
            </div>
          )}

          {/* WRITTEN */}
          {type === "WRITTEN" && (
            <div className="rb-field">
              <label className="rb-label">الإجابة النموذجية</label>
              <textarea
                className="rb-textarea"
                dir="rtl"
                rows={2}
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="اكتب الإجابة النموذجية المتوقعة..."
              />
            </div>
          )}

          {/* MATCHING */}
          {type === "MATCHING" && (
            <div className="rb-field">
              <label className="rb-label">
                أزواج المطابقة
                <span className="rb-label-hint">العنصر → المطابق</span>
              </label>
              <div className="rb-pairs">
                {pairs.map((pair, i) => (
                  <div key={i} className="rb-pair-row">
                    <input
                      className="rb-input"
                      dir="rtl"
                      value={pair.right}
                      onChange={(e) => updatePair(i, "right", e.target.value)}
                      placeholder="المطابق"
                    />
                    <span className="rb-pair-arrow">{Icons.arrow}</span>
                    <input
                      className="rb-input"
                      dir="rtl"
                      value={pair.left}
                      onChange={(e) => updatePair(i, "left", e.target.value)}
                      placeholder="العنصر"
                    />
                    {pairs.length > 2 && (
                      <button
                        className="rb-icon-btn danger"
                        onClick={() => removePair(i)}
                        type="button"
                      >
                        {Icons.trash}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="rb-btn-secondary sm"
                onClick={addPair}
                type="button"
              >
                {Icons.plus} إضافة زوج
              </button>
            </div>
          )}

          {error && <div className="rb-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="rb-modal-ft">
          <button className="rb-btn-primary" onClick={save} disabled={loading}>
            {loading
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة السؤال"}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
