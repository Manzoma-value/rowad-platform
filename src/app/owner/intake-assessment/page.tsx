"use client";
export const dynamic = "force-dynamic";
import MandalaLoader from "@/components/MandalaLoader";
import { SortableList } from "@/components/SortableList";
import { useEffect, useState } from "react";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

interface AssessmentOption {
  id: string;
  text: string;
  order: number;
}
interface AssessmentQuestion {
  id: string;
  type: "MCQ" | "TF" | "WRITTEN";
  text: string;
  correct_answer: string | null;
  order: number;
  options: AssessmentOption[];
}
interface Assessment {
  id: string;
  title: string;
  is_active: boolean;
  questions: AssessmentQuestion[];
}
type QuestionType = "MCQ" | "TF" | "WRITTEN";
type ModalMode = "add" | "edit";

const TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: "اختيار من متعدد",
  TF: "صح أو خطأ",
  WRITTEN: "إجابة مكتوبة",
};
const EMPTY_FORM = {
  type: "MCQ" as QuestionType,
  text: "",
  correct_answer: "",
  options: [{ text: "" }, { text: "" }],
};

export default function OwnerIntakeAssessmentPage() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("اختبار القبول في المنصة");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    loadAssessment();
  }, []);

  async function loadAssessment() {
    setLoading(true);
    const d = await cachedFetch<{ assessment: Assessment | null }>(
      "/api/owner/intake-assessment",
      120_000,
    );
    setAssessment(d.assessment ?? null);
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    const r = await fetch("/api/owner/intake-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const d = await r.json();
    if (d.assessment) {
      invalidateCache("/api/owner/intake-assessment");
      setAssessment({ ...d.assessment, questions: [] });
    }
    setCreating(false);
  }

  async function handleTitleSave() {
    if (!assessment) return;
    await fetch(`/api/owner/intake-assessment/${assessment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft }),
    });
    invalidateCache("/api/owner/intake-assessment");
    setAssessment((a) => (a ? { ...a, title: titleDraft } : a));
    setEditingTitle(false);
  }

  async function handleToggleActive() {
    if (!assessment) return;
    await fetch(`/api/owner/intake-assessment/${assessment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !assessment.is_active }),
    });
    invalidateCache("/api/owner/intake-assessment");
    setAssessment((a) => (a ? { ...a, is_active: !a.is_active } : a));
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setModalMode("add");
    setEditingQId(null);
    setModalOpen(true);
  }

  function openEdit(q: AssessmentQuestion) {
    setForm({
      type: q.type,
      text: q.text,
      correct_answer: q.correct_answer ?? "",
      options:
        q.options.length > 0
          ? q.options.map((o) => ({ text: o.text }))
          : [{ text: "" }, { text: "" }],
    });
    setModalMode("edit");
    setEditingQId(q.id);
    setModalOpen(true);
  }

  async function handleSaveQuestion() {
    if (!assessment) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        type: form.type,
        text: form.text,
        correct_answer: form.correct_answer || null,
        options:
          form.type === "MCQ" ? form.options.filter((o) => o.text.trim()) : [],
      };
      if (form.type === "TF") {
        body.options = [];
        body.correct_answer = form.correct_answer;
      }
      if (modalMode === "add") {
        const r = await fetch(
          `/api/owner/intake-assessment/${assessment.id}/questions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const d = await r.json();
        if (d.question)
          setAssessment((a) =>
            a ? { ...a, questions: [...a.questions, d.question] } : a,
          );
        invalidateCache("/api/owner/intake-assessment");
      } else if (editingQId) {
        const r = await fetch(
          `/api/owner/intake-assessment/${assessment.id}/questions/${editingQId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const d = await r.json();
        if (d.question)
          setAssessment((a) =>
            a
              ? {
                  ...a,
                  questions: a.questions.map((q) =>
                    q.id === editingQId ? d.question : q,
                  ),
                }
              : a,
          );
        invalidateCache("/api/owner/intake-assessment");
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(qid: string) {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
    setDeleting(qid);
    await fetch(
      `/api/owner/intake-assessment/${assessment?.id}/questions/${qid}`,
      { method: "DELETE" },
    );
    setAssessment((a) =>
      a ? { ...a, questions: a.questions.filter((q) => q.id !== qid) } : a,
    );
    invalidateCache("/api/owner/intake-assessment");
    setDeleting(null);
  }

  async function handleReorder(next: AssessmentQuestion[]) {
    if (!assessment) return;
    setAssessment((a) => (a ? { ...a, questions: next } : a));
    invalidateCache("/api/owner/intake-assessment");
    await fetch(
      `/api/owner/intake-assessment/${assessment.id}/questions/reorder`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((q) => q.id) }),
      },
    );
  }

  const addOption = () =>
    setForm((f) => ({ ...f, options: [...f.options, { text: "" }] }));
  const removeOption = (i: number) =>
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, idx) => idx !== i),
    }));
  const updateOption = (i: number, text: string) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => (idx === i ? { text } : o)),
    }));

  if (loading) return <MandalaLoader label="جارٍ تحميل الاختبار" />;

  if (!assessment)
    return (
      <div className="ia-page" dir="rtl">
        <div className="ia-page-header">
          <div className="ia-eyebrow">اختبار القبول</div>
          <h1 className="ia-page-title">إنشاء اختبار القبول</h1>
        </div>
        <div className="ia-create-card">
          <div className="ia-create-icon">
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </div>
          <h2 className="ia-create-title">إنشاء اختبار القبول</h2>
          <p className="ia-create-desc">
            سيتم إجراء هذا الاختبار لجميع الطلاب الجدد قبل تعيينهم في الجهة
            المناسبة.
          </p>
          <div className="ia-field">
            <label className="ia-field-label">عنوان الاختبار</label>
            <input
              className="ia-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="أدخل عنوان الاختبار"
            />
          </div>
          <button
            className="ia-btn-primary"
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
          >
            {creating ? "جارٍ الإنشاء..." : "إنشاء الاختبار"}
          </button>
        </div>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="ia-page" dir="rtl">
      <div className="ia-page-header">
        <div className="ia-title-area">
          <div className="ia-eyebrow">اختبار القبول</div>
          {editingTitle ? (
            <div className="ia-title-edit">
              <input
                className="ia-input ia-title-input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
              />
              <button className="ia-btn-primary sm" onClick={handleTitleSave}>
                حفظ
              </button>
              <button
                className="ia-btn-ghost sm"
                onClick={() => setEditingTitle(false)}
              >
                إلغاء
              </button>
            </div>
          ) : (
            <div className="ia-title-display">
              <h1 className="ia-page-title">{assessment.title}</h1>
              <button
                className="ia-icon-btn"
                onClick={() => {
                  setTitleDraft(assessment.title);
                  setEditingTitle(true);
                }}
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}
          <div className="ia-meta">
            <div
              className={`ia-active-badge ${assessment.is_active ? "active" : "inactive"}`}
            >
              <div className="ia-active-dot" />
              {assessment.is_active ? "نشط" : "غير نشط"}
            </div>
            <button className="ia-btn-ghost sm" onClick={handleToggleActive}>
              {assessment.is_active ? "إيقاف التفعيل" : "تفعيل"}
            </button>
            <span className="ia-count">{assessment.questions.length} سؤال</span>
          </div>
        </div>
        <button className="ia-btn-primary" onClick={openAdd}>
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          إضافة سؤال
        </button>
      </div>

      <div className="ia-q-list">
        {assessment.questions.length === 0 && (
          <div className="ia-q-empty">
            <svg
              width="38"
              height="38"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              style={{ color: "var(--gold-border)", marginBottom: 8 }}
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            <p>لا توجد أسئلة بعد. أضف سؤالك الأول باستخدام الزر أعلاه.</p>
          </div>
        )}
        {assessment.questions.length > 0 && (
          <SortableList
            items={assessment.questions}
            onReorder={handleReorder}
            gap={10}
            renderItem={(q, { index: idx, dragHandleProps }) => (
              <div className="ia-q-card">
                <div className="ia-q-head">
                  {/* Drag handle */}
                  <div className="ia-drag-handle" {...dragHandleProps}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="9" cy="5" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="5" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="9" cy="19" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="19" r="1.2" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <div className="ia-q-num">س{idx + 1}</div>
                  <div className={`ia-q-type type-${q.type.toLowerCase()}`}>
                    {TYPE_LABELS[q.type]}
                  </div>
                  <div className="ia-q-actions">
                    <button className="ia-icon-btn" onClick={() => openEdit(q)}>
                      <svg
                        width="13"
                        height="13"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="ia-icon-btn danger"
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={deleting === q.id}
                    >
                      <svg
                        width="13"
                        height="13"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="ia-q-text">{q.text}</p>
                {q.type === "MCQ" && q.options.length > 0 && (
                  <div className="ia-q-options">
                    {q.options.map((o) => (
                      <div
                        key={o.id}
                        className={`ia-q-opt ${o.text === q.correct_answer ? "correct" : ""}`}
                      >
                        {o.text === q.correct_answer && (
                          <svg
                            width="10"
                            height="10"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {o.text}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === "TF" && (
                  <div className="ia-q-tf">
                    الإجابة الصحيحة:{" "}
                    <strong>
                      {q.correct_answer === "true" ? "صح ✓" : "خطأ ✗"}
                    </strong>
                  </div>
                )}
                {q.type === "WRITTEN" && (
                  <div className="ia-q-written-note">
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    يتم تصحيح هذا السؤال يدوياً من قِبل المالك
                  </div>
                )}
              </div>
            )}
          />
        )}
      </div>

      {assessment.questions.length > 0 && (
        <button className="ia-add-more-btn" onClick={openAdd}>
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          إضافة سؤال آخر
        </button>
      )}

      {modalOpen && (
        <div
          className="ia-overlay"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="ia-modal" dir="rtl">
            <div className="ia-modal-head">
              <h2 className="ia-modal-title">
                {modalMode === "add" ? "إضافة سؤال جديد" : "تعديل السؤال"}
              </h2>
              <button
                className="ia-icon-btn"
                onClick={() => setModalOpen(false)}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="ia-field">
              <label className="ia-field-label">نوع السؤال</label>
              <div className="ia-type-row">
                {(["MCQ", "TF", "WRITTEN"] as QuestionType[]).map((t) => (
                  <button
                    key={t}
                    className={`ia-type-btn ${form.type === t ? "active" : ""}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        type: t,
                        correct_answer: "",
                        options:
                          t === "MCQ" ? [{ text: "" }, { text: "" }] : [],
                      }))
                    }
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="ia-field">
              <label className="ia-field-label">نص السؤال</label>
              <textarea
                className="ia-textarea"
                rows={3}
                placeholder="اكتب السؤال هنا..."
                value={form.text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
              />
            </div>

            {form.type === "MCQ" && (
              <div className="ia-field">
                <label className="ia-field-label">
                  الخيارات{" "}
                  <span className="ia-field-hint">
                    (اضغط الدائرة لتحديد الإجابة الصحيحة)
                  </span>
                </label>
                <div className="ia-options">
                  {form.options.map((o, i) => (
                    <div key={i} className="ia-opt-row">
                      <button
                        className={`ia-radio ${form.correct_answer === o.text && o.text ? "sel" : ""}`}
                        onClick={() =>
                          o.text &&
                          setForm((f) => ({ ...f, correct_answer: o.text }))
                        }
                        type="button"
                      >
                        {form.correct_answer === o.text && o.text && (
                          <svg
                            width="9"
                            height="9"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <input
                        className="ia-input"
                        placeholder={`الخيار ${i + 1}`}
                        value={o.text}
                        onChange={(e) => updateOption(i, e.target.value)}
                      />
                      {form.options.length > 2 && (
                        <button
                          className="ia-icon-btn danger sm"
                          onClick={() => removeOption(i)}
                        >
                          <svg
                            width="11"
                            height="11"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button className="ia-add-opt-btn" onClick={addOption}>
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      إضافة خيار
                    </button>
                  )}
                </div>
              </div>
            )}

            {form.type === "TF" && (
              <div className="ia-field">
                <label className="ia-field-label">الإجابة الصحيحة</label>
                <div className="ia-tf-row">
                  {[
                    { val: "true", label: "✓ صح" },
                    { val: "false", label: "✗ خطأ" },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      className={`ia-tf-btn ${form.correct_answer === val ? "sel" : ""}`}
                      onClick={() =>
                        setForm((f) => ({ ...f, correct_answer: val }))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.type === "WRITTEN" && (
              <div className="ia-written-note">
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                الأسئلة المكتوبة يتم تصحيحها يدوياً منك عند مراجعة الإجابات.
              </div>
            )}

            <div className="ia-modal-actions">
              <button
                className="ia-btn-ghost"
                onClick={() => setModalOpen(false)}
              >
                إلغاء
              </button>
              <button
                className="ia-btn-primary"
                onClick={handleSaveQuestion}
                disabled={saving || !form.text.trim()}
              >
                {saving
                  ? "جارٍ الحفظ..."
                  : modalMode === "add"
                    ? "إضافة السؤال"
                    : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{css}</style>
    </div>
  );
}

const css = `
  :root{--gold:#C8A96A;--gold2:#E5B93C;--gold-muted:rgba(200,169,106,0.1);--gold-border:rgba(200,169,106,0.2);--black:#0B0B0C;--off-white:#F5F3EE;--text:#0B0B0C;--text2:#4a3f2f;--text3:#9a8a6a;--surface:#ffffff;--surface2:#faf8f4;--surface3:#f5f0e8;--border:#e8dfd0;--border2:#d8ccb8;--success:#1a6b3c;--success-bg:rgba(26,107,60,0.08);--warning:#9a6200;--warning-bg:rgba(154,98,0,0.08);--danger:#8b1a1a;--danger-bg:rgba(139,26,26,0.08);--radius:10px;--shadow-sm:0 1px 3px rgba(11,11,12,0.06);--shadow:0 4px 12px rgba(11,11,12,0.08);--shadow-md:0 8px 24px rgba(11,11,12,0.10)}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  .ia-page{display:flex;flex-direction:column;gap:22px;font-family:'Cairo',sans-serif}
  .ia-eyebrow{font-size:10.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px}
  .ia-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:20px;border-bottom:1px solid var(--border)}
  .ia-title-area{display:flex;flex-direction:column;gap:10px}
  .ia-title-display{display:flex;align-items:center;gap:10px}
  .ia-title-edit{display:flex;align-items:center;gap:8px}
  .ia-page-title{font-size:22px;font-weight:900;color:var(--black);letter-spacing:-0.4px}
  .ia-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ia-count{font-size:12px;color:var(--text3);font-weight:600;font-family:'IBM Plex Mono',monospace}
  .ia-active-badge{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid}
  .ia-active-badge.active{background:rgba(26,107,60,0.08);color:var(--success);border-color:rgba(26,107,60,0.2)}
  .ia-active-badge.inactive{background:var(--danger-bg);color:var(--danger);border-color:rgba(139,26,26,0.2)}
  .ia-active-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
  .ia-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid rgba(200,169,106,0.3);background:var(--black);color:var(--gold);transition:all 0.18s;font-family:'Cairo',sans-serif;white-space:nowrap}
  .ia-btn-primary:hover:not(:disabled){background:rgba(200,169,106,0.1);border-color:var(--gold)}
  .ia-btn-primary:disabled{opacity:0.4;cursor:not-allowed}
  .ia-btn-primary.sm{padding:6px 13px;font-size:12px}
  .ia-btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--border2);background:none;color:var(--text2);transition:all 0.15s;font-family:'Cairo',sans-serif}
  .ia-btn-ghost:hover{border-color:var(--gold);color:var(--gold)}
  .ia-btn-ghost.sm{padding:6px 13px;font-size:12px}
  .ia-icon-btn{background:none;border:1px solid var(--border);color:var(--text3);width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;flex-shrink:0}
  .ia-icon-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-muted)}
  .ia-icon-btn.danger:hover{border-color:var(--danger);color:var(--danger);background:var(--danger-bg)}
  .ia-icon-btn:disabled{opacity:0.4;cursor:not-allowed}
  .ia-icon-btn.sm{width:24px;height:24px}
  .ia-create-card{background:var(--surface);border:1px dashed var(--gold-border);border-radius:12px;padding:48px 36px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;max-width:520px;margin:0 auto;box-shadow:var(--shadow-sm)}
  .ia-create-icon{width:68px;height:68px;border-radius:16px;background:var(--gold-muted);color:var(--gold);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center}
  .ia-create-title{font-size:20px;font-weight:800;color:var(--black)}
  .ia-create-desc{font-size:13px;color:var(--text3);line-height:1.7;max-width:380px}
  .ia-field{display:flex;flex-direction:column;gap:8px}
  .ia-field-label{font-size:11.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px}
  .ia-field-hint{font-size:10.5px;color:var(--text3);font-weight:400;text-transform:none;letter-spacing:0}
  .ia-input{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:10px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;outline:none;width:100%;transition:border-color 0.15s,box-shadow 0.15s}
  .ia-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-muted)}
  .ia-title-input{font-size:15px;font-weight:700}
  .ia-textarea{background:var(--surface);border:1px solid var(--border2);color:var(--text);border-radius:8px;padding:11px 13px;font-size:13.5px;font-family:'Cairo',sans-serif;outline:none;width:100%;resize:vertical;line-height:1.6;transition:border-color 0.15s,box-shadow 0.15s}
  .ia-textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-muted)}
  .ia-q-list{display:flex;flex-direction:column;gap:10px}
  .ia-q-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--text3);padding:48px;background:var(--surface);border:1px dashed var(--gold-border);border-radius:10px;font-size:13.5px;line-height:1.6}
  .ia-q-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow-sm);transition:border-color 0.15s}
  .ia-q-card:hover{border-color:var(--gold-border)}
  .ia-drag-handle{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;color:var(--text3);flex-shrink:0;transition:all 0.15s}
  .ia-drag-handle:hover{color:var(--gold);background:var(--gold-muted)}
  .ia-q-head{display:flex;align-items:center;gap:10px}
  .ia-q-num{font-size:11px;font-weight:800;color:var(--gold);font-family:'IBM Plex Mono',monospace;background:var(--gold-muted);padding:3px 9px;border-radius:5px;border:1px solid var(--gold-border)}
  .ia-q-type{font-size:11px;font-weight:700;padding:3px 10px;border-radius:5px}
  .ia-q-type.type-mcq{background:var(--gold-muted);color:var(--gold)}
  .ia-q-type.type-tf{background:rgba(229,185,60,0.1);color:var(--gold2)}
  .ia-q-type.type-written{background:var(--warning-bg);color:var(--warning)}
  .ia-q-actions{margin-right:auto;display:flex;gap:6px}
  .ia-q-text{font-size:14px;color:var(--text);line-height:1.65;font-weight:500}
  .ia-q-options{display:flex;flex-wrap:wrap;gap:7px}
  .ia-q-opt{font-size:12.5px;padding:5px 12px;border-radius:6px;background:var(--surface3);border:1px solid var(--border);color:var(--text2);display:flex;align-items:center;gap:5px}
  .ia-q-opt.correct{background:var(--gold-muted);border-color:var(--gold-border);color:var(--gold);font-weight:700}
  .ia-q-tf{font-size:12.5px;color:var(--text2);font-weight:500}
  .ia-q-written-note{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--warning);font-weight:600;background:var(--warning-bg);border:1px solid rgba(154,98,0,0.18);padding:7px 12px;border-radius:6px;width:fit-content}
  .ia-add-more-btn{display:flex;align-items:center;gap:8px;justify-content:center;background:none;border:1px dashed var(--gold-border);color:var(--gold);padding:13px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;transition:all 0.15s;font-family:'Cairo',sans-serif;width:100%}
  .ia-add-more-btn:hover{border-color:var(--gold);background:var(--gold-muted)}
  .ia-overlay{position:fixed;inset:0;background:rgba(11,11,12,0.55);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px;backdrop-filter:blur(2px)}
  .ia-modal{background:var(--surface);border:1px solid var(--gold-border);border-radius:14px;padding:26px;width:100%;max-width:540px;display:flex;flex-direction:column;gap:20px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-md)}
  .ia-modal-head{display:flex;align-items:center;justify-content:space-between}
  .ia-modal-title{font-size:17px;font-weight:800;color:var(--black)}
  .ia-type-row{display:flex;gap:8px}
  .ia-type-btn{flex:1;padding:9px 6px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;border:1px solid var(--border2);background:var(--surface3);color:var(--text2);transition:all 0.15s;font-family:'Cairo',sans-serif}
  .ia-type-btn.active{background:var(--gold-muted);border-color:var(--gold);color:var(--gold)}
  .ia-options{display:flex;flex-direction:column;gap:8px}
  .ia-opt-row{display:flex;align-items:center;gap:9px}
  .ia-radio{width:22px;height:22px;border-radius:50%;border:2px solid var(--border2);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;transition:all 0.15s}
  .ia-radio.sel{border-color:var(--gold);background:var(--gold-muted)}
  .ia-add-opt-btn{display:flex;align-items:center;gap:6px;background:none;border:1px dashed var(--gold-border);color:var(--text3);padding:8px 13px;border-radius:7px;cursor:pointer;font-size:12.5px;font-family:'Cairo',sans-serif;transition:all 0.15s;width:fit-content;font-weight:600}
  .ia-add-opt-btn:hover{border-color:var(--gold);color:var(--gold)}
  .ia-tf-row{display:flex;gap:10px}
  .ia-tf-btn{flex:1;padding:11px;border-radius:9px;font-size:14px;font-weight:800;cursor:pointer;border:1px solid var(--border2);background:var(--surface3);color:var(--text2);transition:all 0.15s;font-family:'Cairo',sans-serif}
  .ia-tf-btn.sel{background:var(--gold-muted);border-color:var(--gold);color:var(--gold)}
  .ia-written-note{display:flex;align-items:center;gap:9px;background:var(--warning-bg);border:1px solid rgba(154,98,0,0.2);color:var(--warning);font-size:13px;font-weight:600;padding:12px 14px;border-radius:8px}
  .ia-modal-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:4px;border-top:1px solid var(--border)}
`;
