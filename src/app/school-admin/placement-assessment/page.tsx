/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
export const dynamic = "force-dynamic";
import MandalaLoader from "@/components/MandalaLoader";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";

type QuestionType = "MCQ" | "TF" | "WRITTEN";
interface Option { id: string; text: string; order: number; }
interface Question {
  id: string; type: QuestionType; text: string;
  correct_answer: string | null; order: number; options: Option[];
}
interface Assessment {
  id: string; title: string; is_active: boolean; questions: Question[];
}

const TYPE_COLORS: Record<QuestionType, string> = {
  MCQ: "#6B1E2D", TF: "#1B5E20", WRITTEN: "#f59e0b",
};
const EMPTY_FORM = {
  type: "MCQ" as QuestionType, text: "", correct_answer: "",
  options: [{ text: "" }, { text: "" }],
};

export default function PlacementAssessmentPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const confirm = useConfirm();

  const TYPE_LABELS: Record<QuestionType, string> = {
    MCQ: tr.mcq, TF: tr.tf, WRITTEN: tr.written,
  };

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState<string>(tr.defaultAssessmentTitle);
  const [creating, setCreating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    const d = await cachedFetch<{ assessment: Assessment | null }>(
      "/api/school-admin/placement-assessment", 120_000,
    );
    setAssessment(d.assessment ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    setCreating(true);
    const r = await fetch("/api/school-admin/placement-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const d = await r.json();
    if (d.assessment) {
      invalidateCache("/api/school-admin/placement-assessment");
      setAssessment({ ...d.assessment, questions: [] });
    }
    setCreating(false);
  }

  async function handleTitleSave() {
    if (!assessment) return;
    await fetch(`/api/school-admin/placement-assessment/${assessment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft }),
    });
    invalidateCache("/api/school-admin/placement-assessment");
    setAssessment((a) => (a ? { ...a, title: titleDraft } : a));
    setEditingTitle(false);
  }

  async function handleToggleActive() {
    if (!assessment) return;
    await fetch(`/api/school-admin/placement-assessment/${assessment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !assessment.is_active }),
    });
    invalidateCache("/api/school-admin/placement-assessment");
    setAssessment((a) => (a ? { ...a, is_active: !a.is_active } : a));
  }

  function openAdd() {
    setForm(EMPTY_FORM); setModalMode("add"); setEditingQId(null); setModalOpen(true);
  }
  function openEdit(q: Question) {
    setForm({
      type: q.type, text: q.text, correct_answer: q.correct_answer ?? "",
      options: q.options.length > 0 ? q.options.map((o) => ({ text: o.text })) : [{ text: "" }, { text: "" }],
    });
    setModalMode("edit"); setEditingQId(q.id); setModalOpen(true);
  }

  async function handleSave() {
    if (!assessment) return;
    setSaving(true);
    try {
      const body: any = {
        type: form.type, text: form.text,
        correct_answer: form.correct_answer || null, options: [],
      };
      if (form.type === "MCQ") body.options = form.options.filter((o) => o.text.trim());
      if (modalMode === "add") {
        const r = await fetch(
          `/api/school-admin/placement-assessment/${assessment.id}/questions`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        );
        const d = await r.json();
        if (d.question) setAssessment((a) => a ? { ...a, questions: [...a.questions, d.question] } : a);
        invalidateCache("/api/school-admin/placement-assessment");
      } else if (editingQId) {
        const r = await fetch(
          `/api/school-admin/placement-assessment/${assessment.id}/questions/${editingQId}`,
          { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        );
        const d = await r.json();
        if (d.question)
          setAssessment((a) => a
            ? { ...a, questions: a.questions.map((q) => q.id === editingQId ? d.question : q) }
            : a);
        invalidateCache("/api/school-admin/placement-assessment");
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(qid: string) {
    if (!assessment) return;
    if (!(await confirm({ message: tr.deleteQuestionConfirm }))) return;
    setDeleting(qid);
    await fetch(
      `/api/school-admin/placement-assessment/${assessment.id}/questions/${qid}`,
      { method: "DELETE" },
    );
    setAssessment((a) => a ? { ...a, questions: a.questions.filter((q) => q.id !== qid) } : a);
    invalidateCache("/api/school-admin/placement-assessment");
    setDeleting(null);
  }

  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, { text: "" }] }));
  const removeOption = (i: number) => setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  const updateOption = (i: number, text: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { text } : o)) }));

  const dir = lang === "ar" ? "rtl" : "ltr";

  if (loading) return <MandalaLoader label={tr.loading} />;

  if (!assessment) return (
    <div className="pa-page" dir={dir}>
      <h1 className="pa-title">{tr.placementAssessment}</h1>
      <p className="pa-sub">{tr.notCreatedYet}</p>
      <div className="create-card">
        <div style={{ fontSize: 44 }}>📋</div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{tr.createAssessment}</h2>
        <p style={{ fontSize: 13, color: "#6b7280" }}>{tr.createPlacementDesc}</p>
        <input className="pa-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          placeholder={tr.assessmentTitle} dir={dir} />
        <button className="pa-btn primary" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
          {creating ? tr.creatingAssessment : tr.createAssessment}
        </button>
      </div>
      <style>{sharedStyles}</style>
    </div>
  );

  return (
    <div className="pa-page" dir={dir}>
      <div className="pa-header">
        <div className="pa-title-row">
          {editingTitle ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <input className="pa-input title-inp" value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)} autoFocus dir={dir} />
              <button className="pa-btn primary sm" onClick={handleTitleSave}>{tr.save}</button>
              <button className="pa-btn ghost sm" onClick={() => setEditingTitle(false)}>{tr.cancel}</button>
            </div>
          ) : (
            <>
              <h1 className="pa-title">{assessment.title}</h1>
              <button className="icon-btn" onClick={() => { setTitleDraft(assessment.title); setEditingTitle(true); }}>✏️</button>
            </>
          )}
        </div>
        <div className="pa-meta">
          <div className={`active-badge ${assessment.is_active ? "on" : "off"}`}>
            <div className="active-dot" />
            {assessment.is_active ? tr.enabled : tr.disabled}
          </div>
          <button className="pa-btn ghost sm" onClick={handleToggleActive}>
            {assessment.is_active ? tr.disable : tr.enable}
          </button>
          <span style={{ fontSize: 12, color: "#9ca3af", marginInlineStart: "auto" }}>
            {assessment.questions.length} {tr.questionCount}
          </span>
        </div>
      </div>

      <div className="q-list">
        {assessment.questions.length === 0 && <div className="q-empty">{tr.noQuestionsYet}</div>}
        {assessment.questions.map((q, idx) => (
          <div key={q.id} className="q-card">
            <div className="q-card-top">
              <span className="q-num">{tr.question[0]}{idx + 1}</span>
              <span className="q-type" style={{ color: TYPE_COLORS[q.type], background: `${TYPE_COLORS[q.type]}15` }}>
                {TYPE_LABELS[q.type]}
              </span>
              <div style={{ marginInlineStart: "auto", display: "flex", gap: 5 }}>
                <button className="icon-btn" onClick={() => openEdit(q)}>✏️</button>
                <button className="icon-btn danger" onClick={() => handleDelete(q.id)} disabled={deleting === q.id}>🗑️</button>
              </div>
            </div>
            <div className="q-text">{q.text}</div>
            {q.type === "MCQ" && (
              <div className="q-opts">
                {q.options.map((o) => (
                  <div key={o.id} className={`q-opt ${o.text === q.correct_answer ? "correct" : ""}`}>{o.text}</div>
                ))}
              </div>
            )}
            {q.type === "TF" && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {tr.correctAnswer}: <strong>{q.correct_answer === "true" ? tr.trueAnswer : tr.falseAnswer}</strong>
              </div>
            )}
            {q.type === "WRITTEN" && (
              <div style={{ fontSize: 11.5, color: "#f59e0b", fontStyle: "italic" }}>{tr.manualGrade}</div>
            )}
          </div>
        ))}
      </div>

      <button className="add-q-btn" onClick={openAdd}>+ {tr.addQuestion}</button>

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" dir={dir}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 15, fontWeight: 800 }}>
                {modalMode === "add" ? tr.addQuestionTitle : tr.editQuestionTitle}
              </h2>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-field">
              <label className="field-label">{tr.questionType}</label>
              <div style={{ display: "flex", gap: 7 }}>
                {(["MCQ", "TF", "WRITTEN"] as QuestionType[]).map((type) => (
                  <button key={type} className={`type-btn ${form.type === type ? "sel" : ""}`}
                    style={{ "--tc": TYPE_COLORS[type] } as never}
                    onClick={() => setForm((f) => ({ ...f, type, correct_answer: "", options: type === "MCQ" ? [{ text: "" }, { text: "" }] : [] }))}>
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-field">
              <label className="field-label">{tr.questionText}</label>
              <textarea className="pa-textarea" placeholder={tr.questionPlaceholder} value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={3} dir={dir} />
            </div>
            {form.type === "MCQ" && (
              <div className="modal-field">
                <label className="field-label">
                  {tr.options} <span style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 400 }}>({tr.chooseCorrect})</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {form.options.map((o, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <button className={`correct-radio ${form.correct_answer === o.text && o.text ? "sel" : ""}`}
                        type="button" onClick={() => o.text && setForm((f) => ({ ...f, correct_answer: o.text }))}>
                        {form.correct_answer === o.text && o.text && "✓"}
                      </button>
                      <input className="pa-input" style={{ flex: 1 }} placeholder={`${tr.options} ${i + 1}`}
                        value={o.text} onChange={(e) => updateOption(i, e.target.value)} dir={dir} />
                      {form.options.length > 2 && (
                        <button className="icon-btn danger" onClick={() => removeOption(i)}>✕</button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button className="add-opt-btn" onClick={addOption}>{tr.addOption}</button>
                  )}
                </div>
              </div>
            )}
            {form.type === "TF" && (
              <div className="modal-field">
                <label className="field-label">{tr.correctAnswer}</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ val: "true", label: tr.correctTrue }, { val: "false", label: tr.correctFalse }].map((opt) => (
                    <button key={opt.val} className={`tf-btn ${form.correct_answer === opt.val ? "sel" : ""} ${opt.val}`}
                      onClick={() => setForm((f) => ({ ...f, correct_answer: opt.val }))}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.type === "WRITTEN" && <div className="written-note">{tr.manualGradeNote}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              <button className="pa-btn ghost" onClick={() => setModalOpen(false)}>{tr.cancel}</button>
              <button className="pa-btn primary" onClick={handleSave} disabled={saving || !form.text.trim()}>
                {saving ? tr.saving : modalMode === "add" ? tr.add : tr.saveEdits}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{sharedStyles}</style>
    </div>
  );
}

const sharedStyles = `
  .pa-page{display:flex;flex-direction:column;gap:20px;font-family:Tajawal,sans-serif}
  .pa-header{display:flex;flex-direction:column;gap:8px}
  .pa-title-row{display:flex;align-items:center;gap:10px}
  .pa-title{font-size:21px;font-weight:800;color:#111827}
  .pa-sub{font-size:13px;color:#6b7280}
  .pa-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .active-badge{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:4px 10px;border-radius:6px}
  .active-badge.on{background:rgba(16,185,129,0.1);color:#1B5E20}
  .active-badge.off{background:rgba(239,68,68,0.1);color:#6B1E2D}
  .active-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
  .create-card{background:#fff;border:1px dashed #d1d5db;border-radius:16px;padding:36px 28px;max-width:460px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
  .pa-input{width:100%;padding:9px 12px;background:#f7f8fa;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:13px;font-family:Tajawal,sans-serif;outline:none;transition:border-color 0.15s}
  .pa-input:focus{border-color:#6B1E2D}
  .title-inp{font-size:16px;font-weight:700}
  .pa-textarea{width:100%;padding:10px 12px;background:#f7f8fa;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:13px;font-family:Tajawal,sans-serif;outline:none;resize:vertical;line-height:1.6}
  .pa-textarea:focus{border-color:#6B1E2D}
  .pa-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .pa-btn.primary{background:#6B1E2D;color:white}
  .pa-btn.primary:hover:not(:disabled){opacity:0.87}
  .pa-btn.primary:disabled{opacity:0.4;cursor:not-allowed}
  .pa-btn.ghost{background:none;border:1.5px solid #d1d5db;color:#6b7280}
  .pa-btn.ghost:hover{border-color:#6B1E2D;color:#6B1E2D}
  .pa-btn.sm{padding:6px 12px;font-size:12px}
  .icon-btn{background:none;border:1px solid #e5e7eb;color:#9ca3af;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;flex-shrink:0;font-size:13px}
  .icon-btn:hover{border-color:#6B1E2D;color:#6B1E2D}
  .icon-btn.danger:hover{border-color:#6B1E2D;color:#6B1E2D}
  .q-list{display:flex;flex-direction:column;gap:10px}
  .q-empty{background:#fff;border:1px dashed #d1d5db;border-radius:10px;padding:28px;text-align:center;color:#9ca3af;font-size:13px}
  .q-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:15px 16px;display:flex;flex-direction:column;gap:9px}
  .q-card-top{display:flex;align-items:center;gap:8px}
  .q-num{font-size:10.5px;font-weight:700;color:#9ca3af;background:#f1f3f6;padding:2px 7px;border-radius:4px}
  .q-type{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px}
  .q-text{font-size:14px;color:#111827;line-height:1.55}
  .q-opts{display:flex;flex-wrap:wrap;gap:6px}
  .q-opt{font-size:12px;padding:3px 10px;border-radius:6px;background:#f1f3f6;border:1px solid #e5e7eb;color:#6b7280}
  .q-opt.correct{background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.3);color:#1B5E20}
  .add-q-btn{display:flex;align-items:center;justify-content:center;gap:7px;background:none;border:1.5px dashed #d1d5db;color:#6b7280;padding:12px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;transition:all 0.15s;font-family:Tajawal,sans-serif;width:100%}
  .add-q-btn:hover{border-color:#6B1E2D;color:#6B1E2D}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}
  .modal{background:#fff;border:1px solid #d1d5db;border-radius:16px;padding:22px;width:100%;max-width:500px;display:flex;flex-direction:column;gap:16px;max-height:90vh;overflow-y:auto}
  .modal-field{display:flex;flex-direction:column;gap:7px}
  .field-label{font-size:12px;font-weight:700;color:#6b7280}
  .type-btn{flex:1;padding:8px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid #e5e7eb;background:#f7f8fa;color:#6b7280;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .type-btn.sel{background:color-mix(in srgb,var(--tc) 12%,transparent);border-color:var(--tc);color:var(--tc)}
  .correct-radio{width:20px;height:20px;border-radius:50%;border:2px solid #d1d5db;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1B5E20;flex-shrink:0;font-size:10px;font-weight:700}
  .correct-radio.sel{border-color:#1B5E20;background:rgba(16,185,129,0.1)}
  .add-opt-btn{background:none;border:1px dashed #d1d5db;color:#9ca3af;padding:6px 12px;border-radius:7px;cursor:pointer;font-size:12px;font-family:Tajawal,sans-serif;transition:all 0.15s;width:fit-content}
  .add-opt-btn:hover{border-color:#6B1E2D;color:#6B1E2D}
  .tf-btn{flex:1;padding:10px;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;border:1.5px solid #e5e7eb;background:#f7f8fa;color:#374151;transition:all 0.15s;font-family:Tajawal,sans-serif}
  .tf-btn.sel.true{background:rgba(16,185,129,0.1);border-color:#1B5E20;color:#1B5E20}
  .tf-btn.sel.false{background:rgba(239,68,68,0.1);border-color:#6B1E2D;color:#6B1E2D}
  .written-note{background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);color:#b45309;font-size:12.5px;padding:10px 12px;border-radius:8px}

  /* ─── Mobile ─── */
  @media (max-width: 600px) {
    .q-card { padding: 13px 14px; gap: 7px; }
    .q-text { font-size: 13.5px; }
    .q-type { font-size: 10px; }
    .q-opt { font-size: 11.5px; }
    .modal { padding: 18px; border-radius: 14px; max-height: 92vh; }
    .modal-field { gap: 6px; }
    .field-label { font-size: 11.5px; }
    .type-btn { padding: 7px 6px; font-size: 11.5px; }
    .tf-btn { padding: 9px; font-size: 13px; }
    .add-q-btn { padding: 11px; font-size: 12.5px; }
  }
  @media (max-width: 400px) {
    .q-card { padding: 11px 12px; }
    .modal-overlay { padding: 10px; }
    .modal { padding: 16px; }
  }
`;
