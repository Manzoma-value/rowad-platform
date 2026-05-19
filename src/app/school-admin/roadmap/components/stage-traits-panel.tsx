"use client";

import { useState } from "react";
import type { StageTrait, Maqsad } from "./types";

const MAQASID: { value: Maqsad; label: string; color: string; bg: string }[] = [
  {
    value: "DEEN",
    label: "الدين",
    color: "#7A6020",
    bg: "rgba(229,185,60,0.10)",
  },
  {
    value: "AQL",
    label: "العقل",
    color: "#4A2080",
    bg: "rgba(74,32,128,0.08)",
  },
  {
    value: "NAFS",
    label: "النفس",
    color: "#1A5C3A",
    bg: "rgba(26,92,58,0.09)",
  },
  {
    value: "NASL",
    label: "النسل",
    color: "#7A1E1E",
    bg: "rgba(122,30,30,0.08)",
  },
  { value: "MAL", label: "المال", color: "#5A4A10", bg: "rgba(154,98,0,0.09)" },
];

function getMaqsadMeta(m: Maqsad) {
  return MAQASID.find((x) => x.value === m) ?? MAQASID[0];
}

interface Props {
  stageId: string;
  traits: StageTrait[];
  onRefresh: () => void;
}

interface TraitFormState {
  maqsad: Maqsad;
  name: string;
  definition: string;
}

export function StageTraitsPanel({ stageId, traits, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TraitFormState>({
    maqsad: "DEEN",
    name: "",
    definition: "",
  });
  const [formError, setFormError] = useState("");

  // Which trait card is expanded
  const [expandedTrait, setExpandedTrait] = useState<string | null>(null);

  // Edit trait inline
  const [editingTrait, setEditingTrait] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", definition: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Elements
  const [addingElementFor, setAddingElementFor] = useState<string | null>(null);
  const [elementText, setElementText] = useState("");
  const [elementSaving, setElementSaving] = useState(false);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editElementText, setEditElementText] = useState("");

  const usedMaqasid = new Set(traits.map((t) => t.maqsad));
  const availableMaqasid = MAQASID.filter((m) => !usedMaqasid.has(m.value));

  // ── Add trait ──
  async function handleAddTrait() {
    if (!form.name.trim()) {
      setFormError("اسم السمة مطلوب");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(
        `/api/school-admin/roadmap/stages/${stageId}/traits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maqsad: form.maqsad,
            name: form.name.trim(),
            definition: form.definition.trim() || null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "فشل الحفظ");
        return;
      }
      setForm({
        maqsad: availableMaqasid[1]?.value ?? "DEEN",
        name: "",
        definition: "",
      });
      setAdding(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  // ── Delete trait ──
  async function handleDeleteTrait(traitId: string) {
    if (!confirm("هل تريد حذف هذه السمة؟ سيتم إلغاء ربطها بأي مستوى.")) return;
    await fetch(`/api/school-admin/roadmap/traits/${traitId}`, {
      method: "DELETE",
    });
    onRefresh();
  }

  // ── Edit trait save ──
  async function handleSaveEdit(traitId: string) {
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    try {
      await fetch(`/api/school-admin/roadmap/traits/${traitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          definition: editForm.definition.trim() || null,
        }),
      });
      setEditingTrait(null);
      onRefresh();
    } finally {
      setEditSaving(false);
    }
  }

  // ── Add element ──
  async function handleAddElement(traitId: string) {
    if (!elementText.trim()) return;
    setElementSaving(true);
    try {
      await fetch(`/api/school-admin/roadmap/traits/${traitId}/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: elementText.trim() }),
      });
      setElementText("");
      setAddingElementFor(null);
      onRefresh();
    } finally {
      setElementSaving(false);
    }
  }

  // ── Edit element ──
  async function handleSaveElement(elementId: string) {
    if (!editElementText.trim()) return;
    await fetch(`/api/school-admin/roadmap/elements/${elementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editElementText.trim() }),
    });
    setEditingElement(null);
    setEditElementText("");
    onRefresh();
  }

  // ── Delete element ──
  async function handleDeleteElement(elementId: string) {
    await fetch(`/api/school-admin/roadmap/elements/${elementId}`, {
      method: "DELETE",
    });
    onRefresh();
  }

  return (
    <div className="traits-panel">
      {/* Section header */}
      <button className="traits-toggle" onClick={() => setOpen((v) => !v)}>
        <div className="traits-toggle-left">
          <div className="traits-icon-wrap">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <span className="traits-toggle-label">السمات</span>
          <span className="traits-count-pill">{traits.length} / 5</span>
        </div>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            color: "rgba(255,255,255,0.4)",
            transition: "transform 0.18s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="traits-body">
          {/* Maqasid quick overview */}
          <div className="maqasid-row">
            {MAQASID.map((m) => {
              const linked = traits.find((t) => t.maqsad === m.value);
              return (
                <div
                  key={m.value}
                  className={`maqsad-chip ${linked ? "linked" : "empty"}`}
                  style={
                    linked
                      ? {
                          background: m.bg,
                          borderColor: m.color + "44",
                          color: m.color,
                        }
                      : {}
                  }
                >
                  <span className="maqsad-chip-label">{m.label}</span>
                  {linked && (
                    <span className="maqsad-chip-name">{linked.name}</span>
                  )}
                  {!linked && (
                    <span className="maqsad-chip-empty">غير مرتبط</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trait cards */}
          {traits.length > 0 && (
            <div className="traits-list">
              {traits.map((trait) => {
                const meta = getMaqsadMeta(trait.maqsad);
                const isExpanded = expandedTrait === trait.id;
                const isEditing = editingTrait === trait.id;

                return (
                  <div key={trait.id} className="trait-card">
                    {/* Trait header */}
                    <div className="trait-card-head">
                      <div
                        className="trait-maqsad-badge"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </div>

                      {isEditing ? (
                        <div className="trait-edit-inline">
                          <input
                            className="rb-input"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            placeholder="اسم السمة"
                            dir="rtl"
                          />
                          <input
                            className="rb-input"
                            value={editForm.definition}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                definition: e.target.value,
                              }))
                            }
                            placeholder="التعريف (اختياري)"
                            dir="rtl"
                          />
                          <div className="trait-edit-actions">
                            <button
                              className="rb-btn-primary"
                              style={{ padding: "7px 16px", fontSize: 12 }}
                              onClick={() => handleSaveEdit(trait.id)}
                              disabled={editSaving}
                            >
                              {editSaving ? "..." : "حفظ"}
                            </button>
                            <button
                              className="rb-btn-ghost"
                              style={{ padding: "7px 14px", fontSize: 12 }}
                              onClick={() => setEditingTrait(null)}
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="trait-info"
                          onClick={() =>
                            setExpandedTrait(isExpanded ? null : trait.id)
                          }
                        >
                          <span className="trait-name">{trait.name}</span>
                          {trait.definition && (
                            <span className="trait-def">
                              {trait.definition}
                            </span>
                          )}
                        </div>
                      )}

                      {!isEditing && (
                        <div className="trait-card-actions">
                          <span className="trait-elements-count">
                            {trait.elements.length} عناصر
                          </span>
                          <button
                            className="rb-icon-btn"
                            onClick={() => {
                              setEditingTrait(trait.id);
                              setEditForm({
                                name: trait.name,
                                definition: trait.definition ?? "",
                              });
                              setExpandedTrait(trait.id);
                            }}
                            title="تعديل"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="rb-icon-btn danger"
                            onClick={() => handleDeleteTrait(trait.id)}
                            title="حذف"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                          </button>
                          <button
                            className="rb-icon-btn"
                            onClick={() =>
                              setExpandedTrait(isExpanded ? null : trait.id)
                            }
                            title="عناصر التقييم"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              style={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "none",
                                transition: "transform 0.18s",
                              }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Elements section */}
                    {isExpanded && !isEditing && (
                      <div className="trait-elements">
                        <div className="elements-label">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                          </svg>
                          عناصر التقييم
                        </div>

                        {trait.elements.length === 0 ? (
                          <div className="elements-empty">
                            لا توجد عناصر بعد — أضف معايير تساعد المعلم على
                            التقييم
                          </div>
                        ) : (
                          <div className="elements-list">
                            {trait.elements.map((el, idx) => (
                              <div key={el.id} className="element-row">
                                <span className="element-num">{idx + 1}</span>
                                {editingElement === el.id ? (
                                  <div className="element-edit">
                                    <input
                                      className="rb-input"
                                      value={editElementText}
                                      onChange={(e) =>
                                        setEditElementText(e.target.value)
                                      }
                                      dir="rtl"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleSaveElement(el.id);
                                        if (e.key === "Escape")
                                          setEditingElement(null);
                                      }}
                                    />
                                    <button
                                      className="rb-btn-primary"
                                      style={{
                                        padding: "6px 14px",
                                        fontSize: 12,
                                      }}
                                      onClick={() => handleSaveElement(el.id)}
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      className="rb-btn-ghost"
                                      style={{
                                        padding: "6px 12px",
                                        fontSize: 12,
                                      }}
                                      onClick={() => setEditingElement(null)}
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="element-text">
                                      {el.text}
                                    </span>
                                    <div className="element-actions">
                                      <button
                                        className="rb-icon-btn"
                                        onClick={() => {
                                          setEditingElement(el.id);
                                          setEditElementText(el.text);
                                        }}
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                        >
                                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        className="rb-icon-btn danger"
                                        onClick={() =>
                                          handleDeleteElement(el.id)
                                        }
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                        >
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {addingElementFor === trait.id ? (
                          <div className="element-add-row">
                            <input
                              className="rb-input"
                              value={elementText}
                              onChange={(e) => setElementText(e.target.value)}
                              placeholder="اكتب عنصر التقييم..."
                              dir="rtl"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleAddElement(trait.id);
                                if (e.key === "Escape") {
                                  setAddingElementFor(null);
                                  setElementText("");
                                }
                              }}
                            />
                            <button
                              className="rb-btn-primary"
                              style={{ padding: "8px 16px", fontSize: 12 }}
                              onClick={() => handleAddElement(trait.id)}
                              disabled={elementSaving}
                            >
                              {elementSaving ? "..." : "إضافة"}
                            </button>
                            <button
                              className="rb-btn-ghost"
                              style={{ padding: "8px 12px", fontSize: 12 }}
                              onClick={() => {
                                setAddingElementFor(null);
                                setElementText("");
                              }}
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            className="element-add-btn"
                            onClick={() => {
                              setAddingElementFor(trait.id);
                              setElementText("");
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            إضافة عنصر تقييم
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add trait form */}
          {availableMaqasid.length > 0 && (
            <>
              {adding ? (
                <div className="trait-add-form">
                  <div className="trait-add-form-title">إضافة سمة جديدة</div>

                  {/* Maqsad selector */}
                  <div className="rb-field">
                    <label className="rb-label">المقصد</label>
                    <div className="maqsad-selector">
                      {availableMaqasid.map((m) => (
                        <button
                          key={m.value}
                          className={`maqsad-option ${form.maqsad === m.value ? "active" : ""}`}
                          style={
                            form.maqsad === m.value
                              ? {
                                  background: m.bg,
                                  borderColor: m.color + "66",
                                  color: m.color,
                                }
                              : {}
                          }
                          onClick={() =>
                            setForm((f) => ({ ...f, maqsad: m.value }))
                          }
                          type="button"
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rb-field">
                    <label className="rb-label">اسم السمة</label>
                    <input
                      className="rb-input"
                      placeholder="مثال: الدراية"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      dir="rtl"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTrait()}
                    />
                  </div>

                  <div className="rb-field">
                    <label className="rb-label">
                      التعريف
                      <span className="rb-label-hint">(اختياري)</span>
                    </label>
                    <textarea
                      className="rb-textarea"
                      placeholder="مثال: قدرة الطالب على فهم سبب الفعل ودوره وواجبه"
                      value={form.definition}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, definition: e.target.value }))
                      }
                      dir="rtl"
                      rows={2}
                      style={{ minHeight: 60 }}
                    />
                  </div>

                  {formError && <div className="rb-error">{formError}</div>}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="rb-btn-primary"
                      onClick={handleAddTrait}
                      disabled={saving}
                    >
                      {saving ? "جارٍ الحفظ..." : "إضافة السمة"}
                    </button>
                    <button
                      className="rb-btn-ghost"
                      onClick={() => {
                        setAdding(false);
                        setFormError("");
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="trait-add-trigger"
                  onClick={() => {
                    setAdding(true);
                    setForm((f) => ({
                      ...f,
                      maqsad: availableMaqasid[0].value,
                    }));
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  إضافة سمة{" "}
                  {availableMaqasid.length < 5
                    ? `(${5 - traits.length} متبقية)`
                    : ""}
                </button>
              )}
            </>
          )}

          {traits.length === 5 && (
            <div className="traits-complete">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              اكتملت السمات الخمس لهذه المرحلة
            </div>
          )}
        </div>
      )}

      <style>{traitsCSS}</style>
    </div>
  );
}

const traitsCSS = `
.traits-panel {
  border-top: 1px solid rgba(229,185,60,0.15);
  background: rgba(11,11,12,0.97);
}

.traits-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: background 0.15s;
}
.traits-toggle:hover { background: rgba(229,185,60,0.04); }

.traits-toggle-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.traits-icon-wrap {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: rgba(229,185,60,0.10);
  display: flex; align-items: center; justify-content: center;
  color: #E5B93C;
  flex-shrink: 0;
}
.traits-toggle-label {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.75);
}
.traits-count-pill {
  font-size: 10px;
  font-weight: 700;
  background: rgba(229,185,60,0.12);
  color: #C8A96A;
  padding: 2px 8px;
  border-radius: 100px;
  border: 1px solid rgba(229,185,60,0.2);
}

.traits-body {
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Maqasid overview row */
.maqasid-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.maqsad-chip {
  flex: 1;
  min-width: 80px;
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: border-color 0.15s;
}
.maqsad-chip.linked { border-color: currentColor; opacity: 0.9; }
.maqsad-chip.empty { opacity: 0.4; }
.maqsad-chip-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: inherit;
}
.maqsad-chip-name {
  font-size: 12px;
  font-weight: 700;
  color: inherit;
}
.maqsad-chip-empty {
  font-size: 10px;
  color: rgba(255,255,255,0.3);
}

/* Trait cards list */
.traits-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.trait-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.trait-card:hover { border-color: rgba(229,185,60,0.2); }

.trait-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
}
.trait-maqsad-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 3px 9px;
  border-radius: 6px;
  flex-shrink: 0;
  white-space: nowrap;
}
.trait-info {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.trait-name {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
}
.trait-def {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trait-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.trait-elements-count {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  font-weight: 600;
  padding: 2px 7px;
  background: rgba(255,255,255,0.04);
  border-radius: 5px;
  white-space: nowrap;
}

/* Trait inline edit */
.trait-edit-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.trait-edit-actions {
  display: flex;
  gap: 6px;
}

/* Elements */
.trait-elements {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 12px 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0,0,0,0.15);
}
.elements-label {
  font-size: 10px;
  font-weight: 800;
  color: rgba(200,169,106,0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.elements-empty {
  font-size: 11.5px;
  color: rgba(255,255,255,0.25);
  padding: 8px 0;
  line-height: 1.5;
}
.elements-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.element-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border-radius: 7px;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
  transition: border-color 0.13s;
}
.element-row:hover { border-color: rgba(229,185,60,0.15); }
.element-num {
  width: 18px; height: 18px;
  border-radius: 5px;
  background: rgba(229,185,60,0.1);
  color: #C8A96A;
  font-size: 10px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.element-text {
  flex: 1;
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  line-height: 1.5;
  direction: rtl;
}
.element-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.13s;
  flex-shrink: 0;
}
.element-row:hover .element-actions { opacity: 1; }
.element-edit {
  flex: 1;
  display: flex;
  gap: 6px;
  align-items: center;
}
.element-add-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.element-add-btn {
  width: 100%;
  border: 1.5px dashed rgba(229,185,60,0.2);
  border-radius: 7px;
  background: rgba(229,185,60,0.04);
  color: rgba(200,169,106,0.5);
  font-size: 11.5px;
  font-weight: 700;
  font-family: 'Tajawal', sans-serif;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;
}
.element-add-btn:hover {
  border-color: rgba(229,185,60,0.4);
  color: #C8A96A;
  background: rgba(229,185,60,0.07);
}

/* Add trait form */
.trait-add-form {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(229,185,60,0.15);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.trait-add-form-title {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
}
.maqsad-selector {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.maqsad-option {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  font-size: 12px;
  font-weight: 700;
  font-family: 'Tajawal', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
}
.maqsad-option:hover { border-color: rgba(229,185,60,0.3); color: rgba(255,255,255,0.7); }
.maqsad-option.active { font-weight: 800; }

.trait-add-trigger {
  width: 100%;
  border: 2px dashed rgba(229,185,60,0.2);
  border-radius: 9px;
  background: rgba(229,185,60,0.04);
  color: rgba(200,169,106,0.5);
  font-size: 12.5px;
  font-weight: 700;
  font-family: 'Tajawal', sans-serif;
  padding: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all 0.15s;
}
.trait-add-trigger:hover {
  border-color: rgba(229,185,60,0.45);
  color: #C8A96A;
  background: rgba(229,185,60,0.07);
}

.traits-complete {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(26,122,58,0.8);
  background: rgba(26,122,58,0.08);
  border: 1px solid rgba(26,122,58,0.15);
  border-radius: 8px;
  padding: 9px 13px;
}

/* Override rb- inputs inside dark panel */
.traits-panel .rb-input,
.traits-panel .rb-textarea {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.85);
}
.traits-panel .rb-input::placeholder,
.traits-panel .rb-textarea::placeholder {
  color: rgba(255,255,255,0.25);
}
.traits-panel .rb-input:focus,
.traits-panel .rb-textarea:focus {
  border-color: rgba(229,185,60,0.5);
  box-shadow: 0 0 0 3px rgba(229,185,60,0.08);
}
.traits-panel .rb-label {
  color: rgba(255,255,255,0.45);
}
.traits-panel .rb-btn-ghost {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.traits-panel .rb-btn-ghost:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.18);
}
.traits-panel .rb-icon-btn {
  color: rgba(255,255,255,0.3);
}
.traits-panel .rb-icon-btn:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.1);
}
.traits-panel .rb-icon-btn.danger:hover {
  background: rgba(122,30,30,0.2);
  color: #e57373;
  border-color: rgba(122,30,30,0.3);
}
`;
