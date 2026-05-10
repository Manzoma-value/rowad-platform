"use client";
import { useState, useRef } from "react";
import { Icons } from "./icons";
import type { ModuleContent } from "./types";

/* ── helpers ── */
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ═══════════════════════════════════════════════════════════
   TEXT MODAL
   ═══════════════════════════════════════════════════════════ */
export function TextModal({
  moduleId,
  content,
  onClose,
  onSaved,
}: {
  moduleId: string;
  content?: ModuleContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState(content?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!body.trim()) {
      setError("المحتوى مطلوب");
      return;
    }
    setLoading(true);
    try {
      const url = content
        ? `/api/school-admin/roadmap/contents/${content.id}`
        : `/api/school-admin/roadmap/modules/${moduleId}/contents`;
      const res = await fetch(url, {
        method: content ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TEXT", body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rb-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rb-modal">
        <div className="rb-modal-hd">
          <div className="rb-modal-icon dark">{Icons.text}</div>
          <div className="rb-modal-hd-text">
            <h3 className="rb-modal-title">
              {content ? "تعديل النص" : "إضافة نص"}
            </h3>
            <p className="rb-modal-sub">أضف محتوى نصياً للدرس</p>
          </div>
          <button className="rb-close-btn" onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-field">
            <label className="rb-label">محتوى النص</label>
            <textarea
              className="rb-textarea"
              rows={8}
              placeholder="اكتب محتوى الدرس هنا..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              dir="rtl"
              style={{ minHeight: 160 }}
            />
          </div>
          {error && (
            <div className="rb-error">
              <span>{Icons.x}</span>
              {error}
            </div>
          )}
        </div>
        <div className="rb-modal-ft">
          <button className="rb-btn-primary" onClick={save} disabled={loading}>
            {loading ? (
              <>
                <span className="rb-btn-spinner" />
                جارٍ الحفظ...
              </>
            ) : content ? (
              "حفظ التعديلات"
            ) : (
              "إضافة النص"
            )}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IMAGE MODAL
   ═══════════════════════════════════════════════════════════ */
export function ImageModal({
  moduleId,
  content,
  onClose,
  onSaved,
}: {
  moduleId: string;
  content?: ModuleContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [altText, setAltText] = useState(content?.alt_text ?? "");
  const [preview, setPreview] = useState<string | null>(
    content?.image_url ?? null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const save = async () => {
    if (!file && !content) {
      setError("يجب اختيار صورة");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("type", "IMAGE");
      if (file) formData.append("file", file);
      if (altText) formData.append("alt_text", altText);

      const url = content
        ? `/api/school-admin/roadmap/contents/${content.id}`
        : `/api/school-admin/roadmap/modules/${moduleId}/contents`;
      const res = await fetch(url, {
        method: content ? "PUT" : "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rb-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rb-modal">
        <div className="rb-modal-hd">
          <div
            className="rb-modal-icon"
            style={{ background: "rgba(200,169,106,0.12)", color: "#7A6020" }}
          >
            {Icons.image}
          </div>
          <div className="rb-modal-hd-text">
            <h3 className="rb-modal-title">
              {content ? "تعديل الصورة" : "إضافة صورة"}
            </h3>
            <p className="rb-modal-sub">ارفع صورة للدرس</p>
          </div>
          <button className="rb-close-btn" onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        <div className="rb-modal-body">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          {preview ? (
            <div style={{ position: "relative" }}>
              <img src={preview} alt="preview" className="rb-img-preview" />
              <button
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(11,11,12,.7)",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 7px",
                  cursor: "pointer",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontFamily: "Tajawal",
                }}
              >
                {Icons.x} <span>تغيير</span>
              </button>
            </div>
          ) : (
            <div
              className="rb-upload-zone"
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="icon">{Icons.upload}</div>
              <p>
                <strong>اسحب صورة هنا</strong> أو اضغط للاختيار
              </p>
              <p style={{ fontSize: 11 }}>PNG، JPG، WEBP</p>
            </div>
          )}
          <div className="rb-field">
            <label className="rb-label">
              النص البديل <span className="rb-label-hint">(اختياري)</span>
            </label>
            <input
              className="rb-input"
              type="text"
              placeholder="وصف الصورة..."
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              dir="rtl"
            />
          </div>
          {error && (
            <div className="rb-error">
              <span>{Icons.x}</span>
              {error}
            </div>
          )}
        </div>
        <div className="rb-modal-ft">
          <button className="rb-btn-primary" onClick={save} disabled={loading}>
            {loading ? (
              <>
                <span className="rb-btn-spinner" />
                جارٍ الرفع...
              </>
            ) : content ? (
              "حفظ التعديلات"
            ) : (
              "رفع الصورة"
            )}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIDEO MODAL
   ═══════════════════════════════════════════════════════════ */
export function VideoModal({
  moduleId,
  content,
  onClose,
  onSaved,
}: {
  moduleId: string;
  content?: ModuleContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(content?.video_url ?? "");
  const [title, setTitle] = useState(content?.video_title ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ytId = extractYoutubeId(url);

  const save = async () => {
    if (!url.trim()) {
      setError("رابط الفيديو مطلوب");
      return;
    }
    setLoading(true);
    try {
      const endpoint = content
        ? `/api/school-admin/roadmap/contents/${content.id}`
        : `/api/school-admin/roadmap/modules/${moduleId}/contents`;
      const res = await fetch(endpoint, {
        method: content ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VIDEO",
          video_url: url.trim(),
          video_title: title.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rb-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rb-modal">
        <div className="rb-modal-hd">
          <div className="rb-modal-icon red">{Icons.video}</div>
          <div className="rb-modal-hd-text">
            <h3 className="rb-modal-title">
              {content ? "تعديل الفيديو" : "إضافة فيديو"}
            </h3>
            <p className="rb-modal-sub">أضف رابط فيديو يوتيوب</p>
          </div>
          <button className="rb-close-btn" onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-field">
            <label className="rb-label">رابط الفيديو</label>
            <input
              className="rb-input"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              dir="ltr"
            />
          </div>
          {ytId && (
            <div className="rb-yt-preview">
              <img
                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                alt="YouTube thumbnail"
                style={{ width: "100%", display: "block" }}
              />
            </div>
          )}
          <div className="rb-field">
            <label className="rb-label">
              عنوان الفيديو <span className="rb-label-hint">(اختياري)</span>
            </label>
            <input
              className="rb-input"
              type="text"
              placeholder="عنوان الفيديو..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              dir="rtl"
            />
          </div>
          {error && (
            <div className="rb-error">
              <span>{Icons.x}</span>
              {error}
            </div>
          )}
        </div>
        <div className="rb-modal-ft">
          <button className="rb-btn-primary" onClick={save} disabled={loading}>
            {loading ? (
              <>
                <span className="rb-btn-spinner" />
                جارٍ الحفظ...
              </>
            ) : content ? (
              "حفظ التعديلات"
            ) : (
              "إضافة الفيديو"
            )}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
