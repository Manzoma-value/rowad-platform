"use client";
import { useState, useRef } from "react";
import { Icons } from "./icons";
import type { LessonContent } from "./types";
import { useLang } from "@/lib/language-context";

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const T = {
  ar: {
    textTitle: (e: boolean) => e ? "تعديل النص" : "إضافة محتوى نصي",
    textSub: "أضف محتوى نصياً تعليمياً للدرس",
    textLabel: "محتوى النص",
    textPh: "اكتب محتوى الدرس هنا...",
    chars: "حرف",
    save: "حفظ التعديلات",
    add: "إضافة",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ...",
    uploading: "جارٍ الرفع...",
    required: "هذا الحقل مطلوب",
    imageTitle: (e: boolean) => e ? "تعديل الصورة" : "رفع صورة",
    imageSub: "أضف صورة توضيحية للدرس",
    dropHere: "اسحب الصورة هنا",
    orClick: "أو اضغط للاختيار من جهازك",
    altLabel: "النص البديل",
    altHint: "(اختياري — يُحسّن إمكانية الوصول)",
    altPh: "وصف موجز للصورة...",
    selectImage: "يجب اختيار صورة",
    onlyImages: "يُسمح فقط برفع ملفات الصور",
    tooLarge: "حجم الصورة يتجاوز 10 ميغابايت",
    upload: "رفع الصورة",
    change: "تغيير",
    videoTitle: (e: boolean) => e ? "تعديل الفيديو" : "إضافة فيديو",
    videoSub: "أضف رابط فيديو يوتيوب للدرس",
    videoLabel: "رابط الفيديو",
    videoPh: "https://www.youtube.com/watch?v=...",
    videoNeeded: "أدخل رابط يوتيوب صالح للمعاينة",
    videoTitleLabel: "عنوان الفيديو",
    videoTitleHint: "(اختياري)",
    videoTitlePh: "مثال: شرح الدرس الأول",
    videoMissing: "رابط الفيديو مطلوب",
    addVideo: "إضافة الفيديو",
    addText: "إضافة النص",
  },
  sq: {
    textTitle: (e: boolean) => e ? "Modifiko tekstin" : "Shto përmbajtje tekstuale",
    textSub: "Shto përmbajtje tekstuale mësimore",
    textLabel: "Përmbajtja e tekstit",
    textPh: "Shkruani përmbajtjen e mësimit këtu...",
    chars: "karaktere",
    save: "Ruaj ndryshimet",
    add: "Shto",
    cancel: "Anulo",
    saving: "Duke ruajtur...",
    uploading: "Duke ngarkuar...",
    required: "Kjo fushë është e detyrueshme",
    imageTitle: (e: boolean) => e ? "Modifiko imazhin" : "Ngarko imazh",
    imageSub: "Shto një imazh ilustrues",
    dropHere: "Tërhiq imazhin këtu",
    orClick: "ose kliko për ta zgjedhur",
    altLabel: "Teksti alternativ",
    altHint: "(opsionale)",
    altPh: "Përshkrim i shkurtër...",
    selectImage: "Duhet të zgjidhni një imazh",
    onlyImages: "Lejohen vetëm imazhe",
    tooLarge: "Imazhi tejkalon 10 MB",
    upload: "Ngarko imazhin",
    change: "Ndrysho",
    videoTitle: (e: boolean) => e ? "Modifiko videon" : "Shto video",
    videoSub: "Shto një link YouTube",
    videoLabel: "Linku i videos",
    videoPh: "https://www.youtube.com/watch?v=...",
    videoNeeded: "Vendos një link YouTube të vlefshëm",
    videoTitleLabel: "Titulli i videos",
    videoTitleHint: "(opsionale)",
    videoTitlePh: "P.sh.: Shpjegimi i mësimit",
    videoMissing: "Linku i videos është i detyrueshëm",
    addVideo: "Shto videon",
    addText: "Shto tekstin",
  },
} as const;

function useT() {
  const { lang } = useLang();
  return T[lang === "sq" ? "sq" : "ar"];
}

/* ═════════ TEXT MODAL ═════════ */
export function TextModal({
  lessonId, content, onClose, onSaved,
}: {
  lessonId: string;
  content?: LessonContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [body, setBody] = useState(content?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!content;

  const save = async () => {
    if (!body.trim()) { setError(t.required); return; }
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/teacher/lessons/contents/${content!.id}`
        : `/api/teacher/lessons/${lessonId}/contents`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TEXT", body: body.trim() }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? "Save failed");
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  };

  return (
    <div className="lb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb-modal">
        <div className="lb-modal-hd">
          <div className="lb-modal-icon dark">{Icons.text}</div>
          <div className="lb-modal-hd-text">
            <h3 className="lb-modal-title">{t.textTitle(isEdit)}</h3>
            <p className="lb-modal-sub">{t.textSub}</p>
          </div>
          <button className="lb-close-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <div className="lb-modal-body">
          <div className="lb-field">
            <label className="lb-label">
              {t.textLabel}
              <span className="lb-label-hint" style={{ marginInlineStart: "auto" }}>
                {body.length > 0 ? `${body.length} ${t.chars}` : ""}
              </span>
            </label>
            <textarea
              className="lb-textarea"
              rows={10}
              placeholder={t.textPh}
              value={body}
              onChange={(e) => { setBody(e.target.value); setError(""); }}
              dir="auto"
              style={{ minHeight: 200 }}
            />
          </div>
          {error && <div className="lb-error">{Icons.x}{error}</div>}
        </div>
        <div className="lb-modal-ft">
          <button className="lb-btn-primary" onClick={save} disabled={loading}>
            {loading ? <><span className="lb-btn-spinner" />{t.saving}</>
              : isEdit ? <>{Icons.check}{t.save}</> : <>{Icons.plus}{t.addText}</>}
          </button>
          <button className="lb-btn-ghost" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

/* ═════════ IMAGE MODAL ═════════ */
export function ImageModal({
  lessonId, content, onClose, onSaved,
}: {
  lessonId: string;
  content?: LessonContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = !!content;
  const [altText, setAltText] = useState(content?.alt_text ?? "");
  const [preview, setPreview] = useState<string | null>(content?.image_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError(t.onlyImages); return; }
    if (f.size > 10 * 1024 * 1024) { setError(t.tooLarge); return; }
    setError("");
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const save = async () => {
    if (!file && !content) { setError(t.selectImage); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("type", "IMAGE");
      if (file) formData.append("file", file);
      if (altText) formData.append("alt_text", altText);
      const url = isEdit
        ? `/api/teacher/lessons/contents/${content!.id}`
        : `/api/teacher/lessons/${lessonId}/contents`;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: formData });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? "Upload failed");
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  };

  const fileSize = file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : null;

  return (
    <div className="lb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb-modal">
        <div className="lb-modal-hd">
          <div className="lb-modal-icon" style={{ background: "rgba(200,169,106,0.1)", color: "#7A6020" }}>{Icons.image}</div>
          <div className="lb-modal-hd-text">
            <h3 className="lb-modal-title">{t.imageTitle(isEdit)}</h3>
            <p className="lb-modal-sub">{t.imageSub}</p>
          </div>
          <button className="lb-close-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <div className="lb-modal-body">
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {preview ? (
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(200,169,106,0.15)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="lb-img-preview" style={{ borderRadius: 0, border: "none" }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent, rgba(11,11,12,0.8))",
                padding: "24px 16px 14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                {fileSize && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                    {file?.name} · {fileSize}
                  </span>
                )}
                <button
                  onClick={() => { setPreview(null); setFile(null); inputRef.current?.click(); }}
                  style={{
                    background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
                    padding: "7px 14px", cursor: "pointer", color: "#fff",
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 700, fontFamily: "'Cairo',sans-serif",
                  }}
                >
                  {Icons.x} {t.change}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="lb-upload-zone"
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                borderColor: dragOver ? "#C8A96A" : undefined,
                background: dragOver ? "rgba(229,185,60,0.08)" : undefined,
                transform: dragOver ? "scale(1.01)" : undefined,
              }}
            >
              <div className="icon-wrap">{Icons.upload}</div>
              <p style={{ fontSize: 14 }}><strong>{t.dropHere}</strong></p>
              <p>{t.orClick}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {["PNG", "JPG", "WEBP"].map((fmt) => (
                  <span key={fmt} style={{
                    fontSize: 10, fontWeight: 700, color: "#9A8A70",
                    background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.12)",
                    padding: "3px 10px", borderRadius: 100,
                  }}>{fmt}</span>
                ))}
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9A8A70", padding: "3px 6px" }}>≤ 10MB</span>
              </div>
            </div>
          )}
          <div className="lb-field">
            <label className="lb-label">
              {t.altLabel} <span className="lb-label-hint">{t.altHint}</span>
            </label>
            <input className="lb-input" type="text" placeholder={t.altPh}
              value={altText} onChange={(e) => setAltText(e.target.value)} dir="auto" />
          </div>
          {error && <div className="lb-error">{Icons.x}{error}</div>}
        </div>
        <div className="lb-modal-ft">
          <button className="lb-btn-primary" onClick={save} disabled={loading}>
            {loading ? <><span className="lb-btn-spinner" />{t.uploading}</>
              : isEdit ? <>{Icons.check}{t.save}</> : <>{Icons.upload}{t.upload}</>}
          </button>
          <button className="lb-btn-ghost" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

/* ═════════ VIDEO MODAL ═════════ */
export function VideoModal({
  lessonId, content, onClose, onSaved,
}: {
  lessonId: string;
  content?: LessonContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = !!content;
  const [url, setUrl] = useState(content?.video_url ?? "");
  const [title, setTitle] = useState(content?.video_title ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ytId = extractYoutubeId(url);

  const save = async () => {
    if (!url.trim()) { setError(t.videoMissing); return; }
    setLoading(true);
    try {
      const endpoint = isEdit
        ? `/api/teacher/lessons/contents/${content!.id}`
        : `/api/teacher/lessons/${lessonId}/contents`;
      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VIDEO",
          video_url: url.trim(),
          video_title: title.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? "Save failed");
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  };

  return (
    <div className="lb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb-modal">
        <div className="lb-modal-hd">
          <div className="lb-modal-icon red">{Icons.video}</div>
          <div className="lb-modal-hd-text">
            <h3 className="lb-modal-title">{t.videoTitle(isEdit)}</h3>
            <p className="lb-modal-sub">{t.videoSub}</p>
          </div>
          <button className="lb-close-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <div className="lb-modal-body">
          <div className="lb-field">
            <label className="lb-label">{t.videoLabel}</label>
            <input className="lb-input" type="url" placeholder={t.videoPh}
              value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} dir="ltr" />
            {!ytId && url.trim() && (
              <span style={{ fontSize: 11, color: "#9A8A70", fontWeight: 500 }}>{t.videoNeeded}</span>
            )}
          </div>
          {ytId && (
            <div className="lb-yt-preview" style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="YouTube preview" style={{ width: "100%", display: "block" }} />
              <div style={{
                position: "absolute", bottom: 12, right: 12,
                background: "rgba(11,11,12,0.75)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "5px 12px",
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#E5B93C"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                YouTube
              </div>
            </div>
          )}
          <div className="lb-field">
            <label className="lb-label">
              {t.videoTitleLabel} <span className="lb-label-hint">{t.videoTitleHint}</span>
            </label>
            <input className="lb-input" type="text" placeholder={t.videoTitlePh}
              value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" />
          </div>
          {error && <div className="lb-error">{Icons.x}{error}</div>}
        </div>
        <div className="lb-modal-ft">
          <button className="lb-btn-primary" onClick={save} disabled={loading}>
            {loading ? <><span className="lb-btn-spinner" />{t.saving}</>
              : isEdit ? <>{Icons.check}{t.save}</> : <>{Icons.video}{t.addVideo}</>}
          </button>
          <button className="lb-btn-ghost" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
