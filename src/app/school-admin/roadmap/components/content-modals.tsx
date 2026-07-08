"use client";
import { useState, useRef } from "react";
import { Icons } from "./icons";
import type { ModuleContent } from "./types";

/* â”€â”€ helpers â”€â”€ */
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TEXT MODAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

  const charCount = body.length;

  const save = async () => {
    if (!body.trim()) {
      setError("Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ù…Ø·Ù„ÙˆØ¨");
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
      if (!res.ok) throw new Error(data.error ?? "ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ø®Ø·Ø£");
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
              {content ? "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù†Øµ" : "Ø¥Ø¶Ø§ÙØ© Ù…Ø­ØªÙˆÙ‰ Ù†ØµÙŠ"}
            </h3>
            <p className="rb-modal-sub">Ø£Ø¶Ù Ù…Ø­ØªÙˆÙ‰ Ù†ØµÙŠØ§Ù‹ ØªØ¹Ù„ÙŠÙ…ÙŠØ§Ù‹ Ù„Ù„Ø¯Ø±Ø³</p>
          </div>
          <button className="rb-close-btn" onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-field">
            <label className="rb-label">
              Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù†Øµ
              <span className="rb-label-hint" style={{ marginRight: "auto", direction: "ltr" }}>
                {charCount > 0 ? `${charCount} Ø­Ø±Ù` : ""}
              </span>
            </label>
            <textarea
              className="rb-textarea"
              rows={10}
              placeholder="Ø§ÙƒØªØ¨ Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¯Ø±Ø³ Ù‡Ù†Ø§... ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ø¶Ø§ÙØ© Ø´Ø±Ø­ ØªÙØµÙŠÙ„ÙŠØŒ Ø£Ù…Ø«Ù„Ø©ØŒ ÙˆÙ…Ù„Ø§Ø­Ø¸Ø§Øª Ù…Ù‡Ù…Ø©"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError("");
              }}
              dir="rtl"
              style={{ minHeight: 200 }}
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
                Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸...
              </>
            ) : content ? (
              <>
                {Icons.check}
                Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª
              </>
            ) : (
              <>
                {Icons.plus}
                Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù†Øµ
              </>
            )}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            Ø¥Ù„ØºØ§Ø¡
          </button>
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   IMAGE MODAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("ÙŠÙØ³Ù…Ø­ ÙÙ‚Ø· Ø¨Ø±ÙØ¹ Ù…Ù„ÙØ§Øª Ø§Ù„ØµÙˆØ±");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Ø­Ø¬Ù… Ø§Ù„ØµÙˆØ±Ø© ÙŠØªØ¬Ø§ÙˆØ² 10 Ù…ÙŠØºØ§Ø¨Ø§ÙŠØª");
      return;
    }
    setFile(f);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const save = async () => {
    if (!file && !content) {
      setError("ÙŠØ¬Ø¨ Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø©");
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
      if (!res.ok) throw new Error(data.error ?? "ÙØ´Ù„ Ø§Ù„Ø±ÙØ¹");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ø®Ø·Ø£");
    } finally {
      setLoading(false);
    }
  };

  const fileSize = file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : null;

  return (
    <div
      className="rb-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rb-modal">
        <div className="rb-modal-hd">
          <div className="rb-modal-icon" style={{ background: "rgba(184,160,130,0.1)", color: "#7A6020", borderColor: "rgba(184,160,130,0.2)" }}>
            {Icons.image}
          </div>
          <div className="rb-modal-hd-text">
            <h3 className="rb-modal-title">
              {content ? "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØµÙˆØ±Ø©" : "Ø±ÙØ¹ ØµÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©"}
            </h3>
            <p className="rb-modal-sub">Ø£Ø¶Ù ØµÙˆØ±Ø© ØªÙˆØ¶ÙŠØ­ÙŠØ© Ù„Ù„Ø¯Ø±Ø³</p>
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
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(184,160,130,0.15)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="rb-img-preview" style={{ borderRadius: 0, border: "none" }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent, rgba(11,11,12,0.8))",
                padding: "24px 16px 14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                {fileSize && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                    {file?.name} Â· {fileSize}
                  </span>
                )}
                <button
                  onClick={() => { setPreview(null); setFile(null); }}
                  style={{
                    background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
                    padding: "7px 14px", cursor: "pointer", color: "#fff",
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {Icons.x} ØªØºÙŠÙŠØ±
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rb-upload-zone"
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                borderColor: dragOver ? "#B8A082" : undefined,
                background: dragOver ? "rgba(217,201,176,0.08)" : undefined,
                transform: dragOver ? "scale(1.01)" : undefined,
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: "rgba(184,160,130,0.08)", border: "1px solid rgba(184,160,130,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 4,
              }}>
                <div className="icon">{Icons.upload}</div>
              </div>
              <p style={{ fontSize: 14 }}>
                <strong>Ø§Ø³Ø­Ø¨ Ø§Ù„ØµÙˆØ±Ø© Ù‡Ù†Ø§</strong>
              </p>
              <p>Ø£Ùˆ Ø§Ø¶ØºØ· Ù„Ù„Ø§Ø®ØªÙŠØ§Ø± Ù…Ù† Ø¬Ù‡Ø§Ø²Ùƒ</p>
              <div style={{
                display: "flex", gap: 8, marginTop: 4,
              }}>
                {["PNG", "JPG", "WEBP"].map((fmt) => (
                  <span key={fmt} style={{
                    fontSize: 10, fontWeight: 700, color: "#9A8A70",
                    background: "rgba(184,160,130,0.08)", border: "1px solid rgba(184,160,130,0.12)",
                    padding: "3px 10px", borderRadius: 100,
                  }}>
                    {fmt}
                  </span>
                ))}
                <span style={{
                  fontSize: 10, fontWeight: 600, color: "#9A8A70",
                  padding: "3px 6px",
                }}>
                  Ø­ØªÙ‰ 10MB
                </span>
              </div>
            </div>
          )}
          <div className="rb-field">
            <label className="rb-label">
              Ø§Ù„Ù†Øµ Ø§Ù„Ø¨Ø¯ÙŠÙ„ <span className="rb-label-hint">(Ø§Ø®ØªÙŠØ§Ø±ÙŠ â€” ÙŠÙØ­Ø³Ù‘Ù† Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„)</span>
            </label>
            <input
              className="rb-input"
              type="text"
              placeholder="ÙˆØµÙ Ù…ÙˆØ¬Ø² Ù„Ù„ØµÙˆØ±Ø©..."
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
                Ø¬Ø§Ø±Ù Ø§Ù„Ø±ÙØ¹...
              </>
            ) : content ? (
              <>
                {Icons.check}
                Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª
              </>
            ) : (
              <>
                {Icons.upload ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                ) : null}
                Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©
              </>
            )}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            Ø¥Ù„ØºØ§Ø¡
          </button>
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   VIDEO MODAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
      setError("Ø±Ø§Ø¨Ø· Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ù…Ø·Ù„ÙˆØ¨");
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
      if (!res.ok) throw new Error(data.error ?? "ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ø®Ø·Ø£");
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
              {content ? "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ" : "Ø¥Ø¶Ø§ÙØ© ÙÙŠØ¯ÙŠÙˆ"}
            </h3>
            <p className="rb-modal-sub">Ø£Ø¶Ù Ø±Ø§Ø¨Ø· ÙÙŠØ¯ÙŠÙˆ ÙŠÙˆØªÙŠÙˆØ¨ Ù„Ù„Ø¯Ø±Ø³</p>
          </div>
          <button className="rb-close-btn" onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-field">
            <label className="rb-label">Ø±Ø§Ø¨Ø· Ø§Ù„ÙÙŠØ¯ÙŠÙˆ</label>
            <input
              className="rb-input"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              dir="ltr"
            />
            {!ytId && url.trim() && (
              <span style={{ fontSize: 11, color: "#9A8A70", fontWeight: 500 }}>
                Ø£Ø¯Ø®Ù„ Ø±Ø§Ø¨Ø· ÙŠÙˆØªÙŠÙˆØ¨ ØµØ§Ù„Ø­ Ù„Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©
              </span>
            )}
          </div>
          {ytId && (
            <div className="rb-yt-preview" style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="YouTube thumbnail"
                style={{ width: "100%", display: "block" }}
              />
              <div style={{
                position: "absolute", bottom: 12, right: 12,
                background: "rgba(11,11,12,0.75)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "5px 12px",
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#D9C9B0">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                YouTube
              </div>
            </div>
          )}
          <div className="rb-field">
            <label className="rb-label">
              Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ÙÙŠØ¯ÙŠÙˆ <span className="rb-label-hint">(Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</span>
            </label>
            <input
              className="rb-input"
              type="text"
              placeholder="Ù…Ø«Ø§Ù„: Ø´Ø±Ø­ Ø§Ù„Ø¯Ø±Ø³ Ø§Ù„Ø£ÙˆÙ„ â€” Ø§Ù„Ù…Ù‚Ø¯Ù…Ø©"
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
                Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸...
              </>
            ) : content ? (
              <>
                {Icons.check}
                Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª
              </>
            ) : (
              <>
                {Icons.video}
                Ø¥Ø¶Ø§ÙØ© Ø§Ù„ÙÙŠØ¯ÙŠÙˆ
              </>
            )}
          </button>
          <button className="rb-btn-ghost" onClick={onClose}>
            Ø¥Ù„ØºØ§Ø¡
          </button>
        </div>
      </div>
    </div>
  );
}

