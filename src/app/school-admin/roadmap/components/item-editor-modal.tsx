"use client";

import { useEffect, useState } from "react";
import { Icons } from "./icons";

interface Props {
  endpoint: string;
  entityLabel: string;
  initialTitle: string;
  initialDescription?: string | null;
  showDescription?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ItemEditorModal({ endpoint, entityLabel, initialTitle, initialDescription = "", showDescription = false, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
  }, [initialDescription, initialTitle]);

  const save = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle, ...(showDescription && { description: description.trim() }) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "تعذر حفظ التغييرات");
      }
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rb-overlay" role="presentation" onMouseDown={onClose}>
      <section className="rb-modal rb-editor-modal" role="dialog" aria-modal="true" aria-labelledby="item-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="rb-modal-hd">
          <div className="rb-modal-icon">{Icons.edit}</div>
          <div className="rb-modal-hd-text">
            <h2 id="item-editor-title" className="rb-modal-title">تخصيص {entityLabel}</h2>
            <p className="rb-modal-sub">غيّر الاسم كما يظهر للمديرين والمستفيدين، ثم احفظ التعديل.</p>
          </div>
          <button className="rb-close-btn" onClick={onClose} aria-label="إغلاق">{Icons.close}</button>
        </div>
        <div className="rb-modal-body">
          <label className="rb-field">
            <span className="rb-label">اسم {entityLabel}</span>
            <input className="rb-input" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && save()} autoFocus />
          </label>
          {showDescription && (
            <label className="rb-field">
              <span className="rb-label">وصف مختصر <span className="rb-label-hint">اختياري</span></span>
              <textarea className="rb-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="أضف وصفاً يساعد فريقك على فهم هدف هذا المستوى" />
            </label>
          )}
          {error && <p className="rb-error">{error}</p>}
        </div>
        <div className="rb-modal-ft">
          <button className="rb-btn-primary" onClick={save} disabled={saving || !title.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}</button>
          <button className="rb-btn-secondary" onClick={onClose} disabled={saving}>إلغاء</button>
        </div>
      </section>
    </div>
  );
}
