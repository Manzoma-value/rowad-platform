/* eslint-disable react-hooks/exhaustive-deps */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cachedFetch } from "@/lib/api-cache";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ReactionType = "LIKE" | "LOVE" | "DISLIKE" | "HAHA" | "SAD";
type Lang = "ar" | "sq";

interface Reaction { id: string; type: ReactionType; author_id: string; }
interface Author   { id: string; full_name: string; role: string; }
interface Post {
  id: string; content: string | null; image_url: string | null;
  created_at: string; reply_to_id: string | null;
  author: Author; reactions: Reaction[]; _count: { replies: number };
}
interface Me {
  id: string; name: string; role: string;
  school: { id: string; name: string; language: string } | null;
}

// ─── LOCALIZATION ─────────────────────────────────────────────────────────────

const T: Record<Lang, {
  today: string; yesterday: string; community: string; react: string;
  replyLabel: string; replies: string; teacher: string; admin: string;
  composerPH: string; replyPH: string; loadMore: string; loading: string;
  emptyTitle: string; emptySub: string; noSchoolTitle: string; noSchoolSub: string;
  del: string; img: string; send: string; modeBar: string; delConfirmTip: string;
  newMsg: (n: number) => string;
}> = {
  ar: {
    today: "اليوم", yesterday: "أمس", community: "المجتمع", react: "تفاعل",
    replyLabel: "رد", replies: "ردود", teacher: "معلم", admin: "مشرف",
    composerPH: "اكتب إعلاناً أو رسالة لطلابك...", replyPH: "اكتب رداً...",
    loadMore: "رسائل أقدم", loading: "تحميل...",
    emptyTitle: "لا توجد رسائل بعد", emptySub: "كن أول من يكتب إعلاناً",
    noSchoolTitle: "لم يتم تعيينك في مدرسة بعد",
    noSchoolSub: "تواصل مع المدير لتفعيل حسابك",
    del: "حذف", img: "صورة", send: "إرسال",
    modeBar: "وضع المشرف · يمكنك حذف أي منشور أو رد",
    delConfirmTip: "اضغط مرة أخرى للتأكيد",
    newMsg: (n) => `${n} رسالة جديدة · اضغط للتحديث`,
  },
  sq: {
    today: "Sot", yesterday: "Dje", community: "Komuniteti", react: "Reagoj",
    replyLabel: "Përgjigje", replies: "përgjigje", teacher: "Mësues", admin: "Drejtori",
    composerPH: "Shkruaj një njoftim për nxënësit tuaj...", replyPH: "Shkruaj një përgjigje...",
    loadMore: "Mesazhe më të vjetra", loading: "Po ngarkohet...",
    emptyTitle: "Nuk ka mesazhe ende", emptySub: "Ji i pari që shkruan një njoftim",
    noSchoolTitle: "Nuk jeni caktuar në asnjë shkollë",
    noSchoolSub: "Kontaktoni administratorin për aktivizimin",
    del: "Fshij", img: "Foto", send: "Dërgo",
    modeBar: "Mënyra e mbikëqyrësit · Mund të fshini çdo mesazh",
    delConfirmTip: "Shtypni përsëri për të konfirmuar",
    newMsg: (n) => `${n} mesazhe të reja · shtypni për rifreskuar`,
  },
};

const RX: { type: ReactionType; emoji: string; label: Record<Lang, string> }[] = [
  { type: "LIKE",    emoji: "👍", label: { ar: "أعجبني",    sq: "Pëlqej" } },
  { type: "LOVE",    emoji: "❤️",  label: { ar: "أحببته",    sq: "Dashuri" } },
  { type: "HAHA",    emoji: "😂", label: { ar: "مضحك",      sq: "Qesharak" } },
  { type: "SAD",     emoji: "😢", label: { ar: "حزين",      sq: "Trishtim" } },
  { type: "DISLIKE", emoji: "👎", label: { ar: "لم يعجبني", sq: "Nuk pëlqej" } },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────

function getLang(school: Me["school"]): Lang {
  return school?.language === "ar" ? "ar" : "sq";
}

function formatDate(d: string, lang: Lang) {
  const date = new Date(d);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  const loc  = lang === "ar" ? "ar-SA" : "sq-AL";
  const time = date.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: lang === "ar" });
  if (diff === 0) return time;
  if (diff === 1) return `${T[lang].yesterday} · ${time}`;
  if (diff < 7) return `${date.toLocaleDateString(loc, { weekday: "long" })} · ${time}`;
  return date.toLocaleDateString(loc, { day: "numeric", month: "long" }) + ` · ${time}`;
}

function getDayLabel(d: string, lang: Lang) {
  const date = new Date(d);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return T[lang].today;
  if (diff === 1) return T[lang].yesterday;
  const loc = lang === "ar" ? "ar-SA" : "sq-AL";
  return date.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
}

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

function grouped(reactions: Reaction[]) {
  const m = new Map<ReactionType, number>();
  reactions.forEach((r) => m.set(r.type, (m.get(r.type) ?? 0) + 1));
  return RX.filter((r) => m.has(r.type)).map((r) => ({ ...r, count: m.get(r.type)! }));
}

function applyReaction(reactions: Reaction[], myId: string, type: ReactionType): Reaction[] {
  const ex = reactions.find((r) => r.author_id === myId);
  let rxs = [...reactions];
  if (ex) {
    rxs = ex.type === type
      ? rxs.filter((r) => r.author_id !== myId)
      : rxs.map((r) => (r.author_id === myId ? { ...r, type } : r));
  } else {
    rxs.push({ id: "opt", type, author_id: myId });
  }
  return rxs;
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

const AV_COLORS = [
  { bg: "#D4A96A", text: "#3D1A00" }, { bg: "#7BAF7B", text: "#0D2A0D" },
  { bg: "#B87A6B", text: "#2A0D0A" }, { bg: "#9B7BB8", text: "#1A0A2A" },
  { bg: "#B8A46B", text: "#2A1F00" }, { bg: "#6BA8A8", text: "#0A2020" },
  { bg: "#B86B8A", text: "#2A0A15" }, { bg: "#6B9BB8", text: "#0A2535" },
];

function getAvColor(name: string, isStaff: boolean) {
  if (isStaff) return { bg: "#0B0B0C", text: "#C8A96A" };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

function Av({ name, role, size = 40 }: { name: string; role: string; size?: number }) {
  const isStaff = role === "TEACHER" || role === "SCHOOL_ADMIN";
  const col = getAvColor(name, isStaff);
  return (
    <div className="av" style={{ width: size, height: size, minWidth: size, fontSize: size * 0.36, background: col.bg, color: col.text }}>
      {initials(name)}
      {isStaff && <span className="av-badge">✦</span>}
    </div>
  );
}

// ─── REACTION BAR ─────────────────────────────────────────────────────────────

function RxBar({ postId, reactions, myId, lang, onReact, compact = false, alignEnd = false }: {
  postId: string; reactions: Reaction[]; myId: string; lang: Lang;
  onReact: (pid: string, type: ReactionType) => void;
  compact?: boolean; alignEnd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mine   = reactions.find((r) => r.author_id === myId);
  const grp    = grouped(reactions);
  const mineRx = RX.find((r) => r.type === mine?.type);
  const tr = T[lang];

  const open_  = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const close_ = () => { timer.current = setTimeout(() => setOpen(false), 280); };

  return (
    <div className={`rxbar ${alignEnd ? "rxbar-end" : ""}`} onMouseLeave={close_}>
      {open && (
        <div className={`rx-picker ${alignEnd ? "rx-picker-end" : ""}`} onMouseEnter={open_}>
          {RX.map((r, i) => (
            <button key={r.type} className={`rx-pick-btn ${mine?.type === r.type ? "on" : ""}`}
              onClick={() => { onReact(postId, r.type); setOpen(false); }}
              title={r.label[lang]} style={{ animationDelay: `${i * 0.035}s` }}>
              <span className="rx-em">{r.emoji}</span>
              <span className="rx-lbl">{r.label[lang]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="rx-row">
        <button className={`rx-btn ${mine ? "rx-on" : ""} ${compact ? "rx-compact" : ""}`}
          onMouseEnter={open_}
          onClick={() => mine ? onReact(postId, mine.type) : setOpen((v) => !v)}>
          <span className="rx-btn-emoji">{mine ? mineRx?.emoji : "👍"}</span>
          {!compact && <span>{mine ? mineRx?.label[lang] : tr.react}</span>}
        </button>
        {grp.length > 0 && (
          <div className="rx-counts">
            {grp.map((r) => (
              <span key={r.type} className="rx-pill">{r.emoji} {r.count}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IMAGE UPLOAD HOOK ────────────────────────────────────────────────────────

function useImgUpload() {
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const pick = (f: File) => {
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };
  const clear = () => { setFile(null); setPreview(null); };
  return { file, preview, ref, pick, clear };
}

// ─── DATE DIVIDER ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="date-divider">
      <span className="date-divider-label">{label}</span>
    </div>
  );
}

// ─── REPLIES ──────────────────────────────────────────────────────────────────

function Replies({ postId, me, lang, onReact }: {
  postId: string; me: Me; lang: Lang;
  onReact: (pid: string, type: ReactionType) => void;
}) {
  const [replies, setReplies] = useState<Post[]>([]);
  const [busy, setBusy]       = useState(true);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const img    = useImgUpload();
  const endRef = useRef<HTMLDivElement>(null);
  const tr = T[lang];

  useEffect(() => {
    fetch(`/api/hub/posts/${postId}/replies`)
      .then((r) => r.json())
      .then((d) => { setReplies(d.replies ?? []); setBusy(false); });
  }, [postId]);

  const handleReplyReact = async (pid: string, type: ReactionType) => {
    setReplies((prev) =>
      prev.map((r) => r.id !== pid ? r : { ...r, reactions: applyReaction(r.reactions, me.id, type) })
    );
    await fetch(`/api/hub/posts/${pid}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  };

  const send = async () => {
    if (!text.trim() && !img.file) return;
    setSending(true);
    const form = new FormData();
    if (text.trim()) form.append("content", text.trim());
    if (img.file) form.append("file", img.file);
    const res = await fetch(`/api/hub/posts/${postId}/replies`, { method: "POST", body: form });
    const d = await res.json();
    if (d.reply) {
      setReplies((p) => [...p, d.reply]);
      setText(""); img.clear();
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
    setSending(false);
  };

  const del = async (id: string) => {
    await fetch(`/api/hub/posts/${id}`, { method: "DELETE" });
    setReplies((p) => p.filter((r) => r.id !== id));
  };

  const byDay: { day: string; items: Post[] }[] = [];
  replies.forEach((r) => {
    const day = getDayLabel(r.created_at, lang);
    const last = byDay[byDay.length - 1];
    if (!last || last.day !== day) byDay.push({ day, items: [r] });
    else last.items.push(r);
  });

  return (
    <div className="replies-panel">
      <div className="replies-scroll">
        {busy ? (
          <div className="replies-loading"><div className="mini-spin" /></div>
        ) : (
          byDay.map((group) => (
            <div key={group.day}>
              <DateDivider label={group.day} />
              {group.items.map((r) => {
                const isMe    = r.author.id === me.id;
                const isStaff = r.author.role === "TEACHER" || r.author.role === "SCHOOL_ADMIN";
                return (
                  <div key={r.id} className={`msg-row ${isMe ? "msg-mine" : "msg-theirs"}`}>
                    {!isMe && <Av name={r.author.full_name} role={r.author.role} size={32} />}
                    <div className="msg-col">
                      {!isMe && (
                        <div className="msg-sender">
                          <span className="msg-sender-name">{r.author.full_name}</span>
                          {isStaff && (
                            <span className={`chip-staff ${r.author.role === "SCHOOL_ADMIN" ? "chip-admin" : ""}`}>
                              {r.author.role === "SCHOOL_ADMIN" ? tr.admin : tr.teacher}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={`bubble ${isMe ? "bubble-mine" : "bubble-theirs"}`}>
                        {r.content && <p className="bubble-text" dir="auto">{r.content}</p>}
                        {r.image_url && (
                          <img src={r.image_url} className="bubble-img" alt=""
                            onClick={() => window.open(r.image_url!, "_blank")} />
                        )}
                        <span className="bubble-time">{formatDate(r.created_at, lang)}</span>
                      </div>
                      <div className={`msg-meta ${isMe ? "msg-meta-mine" : ""}`}>
                        {/* Teacher can always delete replies */}
                        <button className="del-micro" onClick={() => del(r.id)} title={tr.del}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          </svg>
                        </button>
                        <RxBar postId={r.id} reactions={r.reactions} myId={me.id} lang={lang}
                          onReact={handleReplyReact} compact alignEnd={isMe} />
                      </div>
                    </div>
                    {isMe && <Av name={r.author.full_name} role={r.author.role} size={32} />}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="reply-composer">
        <Av name={me.name} role={me.role} size={34} />
        <div className="reply-composer-inner">
          {img.preview && (
            <div className="img-preview-mini">
              <img src={img.preview} className="img-preview-mini-img" alt="" />
              <button className="img-preview-mini-x" onClick={img.clear}>✕</button>
            </div>
          )}
          <div className="reply-composer-row">
            <input className="reply-input" placeholder={tr.replyPH}
              value={text} onChange={(e) => setText(e.target.value)} dir="auto"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <input ref={img.ref} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && img.pick(e.target.files[0])} />
            <button className="reply-icon-btn" onClick={() => img.ref.current?.click()} title={tr.img}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button className="reply-send-btn" disabled={sending || (!text.trim() && !img.file)} onClick={send}>
              {sending ? <div className="mini-spin s-light" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── POST CARD (teacher: always-visible delete, two-step confirm) ─────────────

function PostCard({ post, me, lang, onDelete, onReact, index }: {
  post: Post; me: Me; lang: Lang;
  onDelete: (id: string) => void;
  onReact: (pid: string, type: ReactionType) => void;
  index: number;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyCt] = useState(post._count.replies);
  const [imgOpen, setImgOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const isMe    = post.author.id === me.id;
  const isStaff = post.author.role === "TEACHER" || post.author.role === "SCHOOL_ADMIN";
  const isAdmin = post.author.role === "SCHOOL_ADMIN";
  const tr = T[lang];

  // Two-step delete confirm
  const del = async () => {
    if (!delConfirm) {
      setDelConfirm(true);
      setTimeout(() => setDelConfirm(false), 3000);
      return;
    }
    await fetch(`/api/hub/posts/${post.id}`, { method: "DELETE" });
    onDelete(post.id);
  };

  return (
    <div className={`chat-row ${isMe ? "chat-mine" : "chat-theirs"}`}
      style={{ animationDelay: `${index * 0.04}s` }}>
      {!isMe && (
        <div className="chat-av-wrap">
          <Av name={post.author.full_name} role={post.author.role} size={42} />
        </div>
      )}

      <div className="chat-col">
        {!isMe && (
          <div className="chat-author">
            <span className="chat-author-name">{post.author.full_name}</span>
            {isStaff && (
              <span className={`chip-staff ${isAdmin ? "chip-admin" : ""}`}>
                {isAdmin ? tr.admin : tr.teacher}
              </span>
            )}
          </div>
        )}

        <div className={`chat-bubble ${isMe ? "chat-bubble-mine" : "chat-bubble-theirs"} ${isStaff && !isMe ? "chat-bubble-staff" : ""}`}>
          {/* Teacher: always-visible delete with two-step confirm */}
          <button
            className={`bubble-del teacher-del ${delConfirm ? "bubble-del-confirm" : ""}`}
            onClick={del}
            title={delConfirm ? tr.delConfirmTip : tr.del}>
            {delConfirm ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            )}
          </button>

          {post.content && <p className="chat-text" dir="auto">{post.content}</p>}

          {post.image_url && (
            <div className={`chat-img-wrap ${imgOpen ? "expanded" : ""}`}
              onClick={() => setImgOpen((v) => !v)}>
              <img src={post.image_url} className="chat-img" alt="" />
            </div>
          )}

          <div className={`chat-time-row ${isMe ? "chat-time-row-mine" : ""}`}>
            <span className="chat-time">{formatDate(post.created_at, lang)}</span>
            {isMe && (
              <svg className="read-tick" width="14" height="10" viewBox="0 0 16 11" fill="none">
                <path d="M1 5.5L5 9.5L15 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 5.5L9 9.5L19 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            )}
          </div>
        </div>

        {/* Confirm toast */}
        {delConfirm && (
          <div className="del-confirm-toast">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {tr.delConfirmTip}
          </div>
        )}

        <div className={`chat-actions ${isMe ? "chat-actions-mine" : ""}`}>
          <RxBar postId={post.id} reactions={post.reactions} myId={me.id} lang={lang}
            onReact={onReact} compact alignEnd={isMe} />
          <button className={`reply-toggle-btn ${showReplies ? "reply-toggle-active" : ""}`}
            onClick={() => setShowReplies((v) => !v)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {replyCt > 0 ? `${replyCt} ${tr.replies}` : tr.replyLabel}
          </button>
        </div>

        {showReplies && (
          <div className="replies-container">
            <Replies postId={post.id} me={me} lang={lang} onReact={onReact} />
          </div>
        )}
      </div>

      {isMe && (
        <div className="chat-av-wrap">
          <Av name={post.author.full_name} role={post.author.role} size={42} />
        </div>
      )}
    </div>
  );
}

// ─── COMPOSER ─────────────────────────────────────────────────────────────────

function Composer({ me, lang, onPosted }: { me: Me; lang: Lang; onPosted: (p: Post) => void }) {
  const [text, setText]       = useState("");
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const img   = useImgUpload();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const tr = T[lang];

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [text]);

  const submit = async () => {
    if (!text.trim() && !img.file) return;
    setSending(true);
    const form = new FormData();
    form.append("school_id", me.school!.id);
    if (text.trim()) form.append("content", text.trim());
    if (img.file) form.append("file", img.file);
    const res = await fetch("/api/hub/posts", { method: "POST", body: form });
    const d = await res.json();
    if (d.post) { onPosted(d.post); setText(""); img.clear(); setFocused(false); }
    setSending(false);
  };

  return (
    <div className={`composer ${focused ? "composer-focused" : ""}`}>
      {img.preview && (
        <div className="composer-img-preview">
          <img src={img.preview} className="composer-img-preview-img" alt="" />
          <button className="composer-img-x" onClick={img.clear}>✕</button>
        </div>
      )}
      <div className="composer-row">
        <Av name={me.name} role={me.role} size={40} />
        <div className="composer-field-wrap">
          <textarea ref={taRef} className="composer-ta"
            placeholder={tr.composerPH} value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { if (!text.trim() && !img.file) setFocused(false); }}
            rows={1} dir="auto"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        </div>
        <div className="composer-btns">
          <input ref={img.ref} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && img.pick(e.target.files[0])} />
          <button className="composer-img-btn" onClick={() => img.ref.current?.click()} title={tr.img}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button className="composer-send-btn" disabled={sending || (!text.trim() && !img.file)}
            onClick={submit} title={tr.send}>
            {sending ? <div className="mini-spin s-light" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TeacherHubPage() {
  const [me, setMe]               = useState<Me | null>(null);
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor]       = useState<string | null>(null);
  const [newCount, setNewCount]   = useState(0);
  const supabase = createClient();
  const topRef   = useRef<HTMLDivElement>(null);
  const feedRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      cachedFetch<{
        profile: { full_name: string };
        school: { id: string; name: string; language: string } | null;
      }>("/api/teacher", 300_000).then((d) => {
        setMe({
          id: user.id,
          name: d.profile?.full_name ?? "Mësues",
          role: "TEACHER",
          school: d.school ?? null,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!me?.school?.id) return;
    fetch(`/api/hub/posts?school_id=${me.school.id}&limit=30`)
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts ?? []); setCursor(d.nextCursor ?? null); setLoading(false); });
  }, [me?.school?.id]);

  useEffect(() => {
    if (!me?.school?.id) return;
    const ch = supabase.channel(`hub-teacher:${me.school.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "posts",
        filter: `school_id=eq.${me.school.id}`,
      }, (payload) => {
        const p = payload.new as Post;
        if (!p.reply_to_id && p.author?.id !== me.id) setNewCount((c) => c + 1);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.school?.id, me?.id]);

  const refresh = useCallback(async () => {
    if (!me?.school?.id) return;
    const d = await fetch(`/api/hub/posts?school_id=${me.school.id}&limit=30`).then((r) => r.json());
    setPosts(d.posts ?? []); setCursor(d.nextCursor ?? null); setNewCount(0);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [me?.school?.id]);

  const loadMore = async () => {
    if (!cursor || !me?.school?.id) return;
    setLoadingMore(true);
    const d = await fetch(`/api/hub/posts?school_id=${me.school.id}&cursor=${cursor}&limit=30`).then((r) => r.json());
    setPosts((p) => [...p, ...(d.posts ?? [])]);
    setCursor(d.nextCursor ?? null); setLoadingMore(false);
  };

  const handlePosted = (p: Post) => {
    setPosts((prev) => [p, ...prev]);
    setTimeout(() => feedRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };
  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));
  const handleReact = async (pid: string, type: ReactionType) => {
    if (!me) return;
    setPosts((prev) => prev.map((p) => p.id !== pid ? p : { ...p, reactions: applyReaction(p.reactions, me.id, type) }));
    await fetch(`/api/hub/posts/${pid}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }),
    });
  };

  const lang  = getLang(me?.school ?? null);
  const isRtl = lang === "ar";
  const dir   = isRtl ? "rtl" : "ltr";
  const tr    = T[lang];

  const byDay: { day: string; items: Post[] }[] = [];
  posts.forEach((p) => {
    const day = getDayLabel(p.created_at, lang);
    const last = byDay[byDay.length - 1];
    if (!last || last.day !== day) byDay.push({ day, items: [p] });
    else last.items.push(p);
  });

  if (loading || !me)
    return (
      <div className="hub" dir="ltr">
        <div className="skel-header" />
        <div className="skel-mode-bar" />
        <div className="skel-body">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`skel-row ${i % 2 === 0 ? "skel-theirs" : "skel-mine"}`}>
              {i % 2 === 0 && <div className="skel-av" />}
              <div className="skel-bubble" style={{ animationDelay: `${i * 0.15}s` }} />
              {i % 2 !== 0 && <div className="skel-av" />}
            </div>
          ))}
        </div>
        <style>{css}</style>
      </div>
    );

  if (!me.school)
    return (
      <div className="hub hub-no-school" dir="ltr">
        <div className="no-school-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 className="no-school-title">{tr.noSchoolTitle}</h2>
        <p className="no-school-sub">{tr.noSchoolSub}</p>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="hub" dir={dir}>
      <div className="hub-bg-pattern" />

      <header className="hub-header" ref={topRef}>
        <div className="hub-header-stripe" />
        <div className="hub-header-inner">
          <div className="hub-brand">
            <div className="hub-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <h1 className="hub-title">{tr.community}</h1>
              <p className="hub-subtitle">{me.school.name}</p>
            </div>
          </div>
          <div className="hub-live-badge">
            <span className="hub-live-dot" />
            <span>Live</span>
          </div>
        </div>
      </header>

      {/* Teacher mode bar */}
      <div className="mode-bar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>{tr.modeBar}</span>
      </div>

      {newCount > 0 && (
        <button className="new-posts-banner" onClick={refresh}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {tr.newMsg(newCount)}
        </button>
      )}

      <div className="hub-feed" ref={feedRef}>
        {cursor && (
          <div className="load-more-wrap">
            <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <><div className="mini-spin" /><span>{tr.loading}</span></>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg><span>{tr.loadMore}</span></>
              )}
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="hub-empty">
            <div className="hub-empty-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="hub-empty-title">{tr.emptyTitle}</h3>
            <p className="hub-empty-sub">{tr.emptySub}</p>
          </div>
        ) : (
          byDay.map((group) => (
            <div key={group.day}>
              <DateDivider label={group.day} />
              {group.items.map((p, i) => (
                <PostCard key={p.id} post={p} me={me} lang={lang}
                  onDelete={handleDelete} onReact={handleReact} index={i} />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="hub-composer-wrap">
        <Composer me={me} lang={lang} onPosted={handlePosted} />
      </div>

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes popIn{0%{opacity:0;transform:scale(.75) translateY(6px)}65%{transform:scale(1.03)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}
@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes blobIn{0%{opacity:0;transform:scale(.88) translateY(6px)}70%{transform:scale(1.02)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}

:root{
  --cream:#F7F2EA;--cream2:#EFE8DC;--cream3:#E6DDD0;--cream4:#DDD2C2;
  --graphite:#0B0B0C;--graphite2:#1A1208;
  --gold:#C8A96A;--gold2:#D4B87A;--gold3:#E0C98A;
  --gold-dim:rgba(200,169,106,.10);--gold-mid:rgba(200,169,106,.18);--gold-border:rgba(200,169,106,.35);
  --text:#2A1A0A;--text2:#6B5A4A;--text3:#9A8A7A;
  --mine-bg:#C8A96A;--mine-fg:#1A0D00;
  --their-bg:#FFFFFF;--their-fg:#2A1A0A;--their-border:rgba(0,0,0,.08);
  --staff-bg:rgba(200,169,106,.06);--staff-border:rgba(200,169,106,.20);
  --r:16px;--r-sm:12px;--r-xs:8px;--r-pill:100px;
  --font:'Cairo','IBM Plex Sans Arabic',-apple-system,sans-serif;
  --sh-soft:0 2px 12px rgba(42,26,10,.08);--sh-med:0 4px 24px rgba(42,26,10,.12);--sh-lift:0 8px 40px rgba(42,26,10,.16);
  --ease:cubic-bezier(.4,0,.2,1);--ease-b:cubic-bezier(.34,1.56,.64,1);
}

.hub{display:flex;flex-direction:column;height:100dvh;height:100vh;background:var(--cream);font-family:var(--font);color:var(--text);position:relative;overflow:hidden;}
.hub-bg-pattern{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(circle at 20% 20%,rgba(200,169,106,.07) 0%,transparent 50%),radial-gradient(circle at 80% 80%,rgba(11,11,12,.04) 0%,transparent 50%);}

/* skeleton */
.skel-header{height:72px;background:var(--graphite);flex-shrink:0;}
.skel-mode-bar{height:38px;background:rgba(200,169,106,.12);flex-shrink:0;border-bottom:1px solid rgba(200,169,106,.15);}
.skel-body{flex:1;padding:20px 16px;display:flex;flex-direction:column;gap:16px;overflow:hidden;}
.skel-row{display:flex;align-items:flex-end;gap:10px;}.skel-mine{flex-direction:row-reverse;}
.skel-av{width:42px;height:42px;border-radius:50%;background:var(--cream3);flex-shrink:0;}
.skel-bubble{height:64px;border-radius:var(--r);width:min(65%,260px);background:linear-gradient(90deg,var(--cream2) 25%,var(--cream3) 50%,var(--cream2) 75%);background-size:600px 100%;animation:shimmer 1.5s ease infinite;}

/* header */
.hub-header{background:var(--graphite);position:relative;z-index:100;flex-shrink:0;box-shadow:0 4px 24px rgba(11,11,12,.45);}
.hub-header-stripe{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold) 30%,#E5B93C 60%,transparent);}
.hub-header-inner{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;max-width:860px;margin:0 auto;}
.hub-brand{display:flex;align-items:center;gap:14px;}
.hub-brand-icon{width:44px;height:44px;border-radius:13px;flex-shrink:0;background:rgba(200,169,106,.15);border:1.5px solid rgba(200,169,106,.30);display:flex;align-items:center;justify-content:center;color:var(--gold);transition:all .3s var(--ease-b);}
.hub-brand-icon:hover{background:rgba(200,169,106,.25);transform:scale(1.08) rotate(-3deg);}
.hub-title{font-size:16px;font-weight:800;color:#F7EDD8;letter-spacing:-.2px;line-height:1.25;}
.hub-subtitle{font-size:11px;color:rgba(200,169,106,.60);font-weight:500;margin-top:2px;}
.hub-live-badge{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:rgba(110,231,183,.9);background:rgba(110,231,183,.1);border:1px solid rgba(110,231,183,.22);padding:5px 13px;border-radius:var(--r-pill);}
.hub-live-dot{width:6px;height:6px;border-radius:50%;background:#6EE7B7;animation:pulse 2s ease-in-out infinite;flex-shrink:0;}

/* mode bar */
.mode-bar{display:flex;align-items:center;gap:8px;padding:9px 20px;background:rgba(200,169,106,.10);border-bottom:1px solid rgba(200,169,106,.18);font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0;z-index:90;position:relative;}

/* new posts */
.new-posts-banner{width:100%;padding:10px 20px;border:none;cursor:pointer;background:linear-gradient(90deg,var(--gold),var(--gold2));color:var(--text);font-size:13px;font-weight:700;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:8px;z-index:50;position:relative;flex-shrink:0;animation:slideDown .35s var(--ease);transition:filter .2s;}
.new-posts-banner:hover{filter:brightness(1.06);}

/* feed */
.hub-feed{flex:1;overflow-y:auto;padding:16px 12px 8px;max-width:860px;width:100%;margin:0 auto;scroll-behavior:smooth;position:relative;z-index:10;}
.hub-feed::-webkit-scrollbar{width:5px;}
.hub-feed::-webkit-scrollbar-track{background:transparent;}
.hub-feed::-webkit-scrollbar-thumb{background:var(--cream3);border-radius:10px;}

/* date divider */
.date-divider{display:flex;align-items:center;justify-content:center;margin:20px 0 14px;}
.date-divider-label{font-size:11px;font-weight:600;color:var(--text3);background:rgba(255,255,255,.8);backdrop-filter:blur(8px);border:1px solid rgba(0,0,0,.07);padding:5px 14px;border-radius:var(--r-pill);box-shadow:var(--sh-soft);}

/* chat rows */
.chat-row{display:flex;align-items:flex-end;gap:10px;margin-bottom:16px;animation:blobIn .35s var(--ease-b) backwards;}
.chat-mine{flex-direction:row-reverse;}.chat-theirs{flex-direction:row;}
.chat-av-wrap{flex-shrink:0;align-self:flex-end;}
.chat-col{display:flex;flex-direction:column;max-width:72%;gap:4px;}
.chat-mine .chat-col{align-items:flex-end;}.chat-theirs .chat-col{align-items:flex-start;}
.chat-author{display:flex;align-items:center;gap:7px;padding:0 4px;margin-bottom:3px;}
.chat-author-name{font-size:12px;font-weight:700;color:var(--graphite2);}

/* bubbles */
.chat-bubble{padding:12px 15px;border-radius:18px;position:relative;word-break:break-word;transition:transform .2s var(--ease);max-width:100%;}
.chat-bubble:hover{transform:scale(1.005);}
.chat-bubble-mine{background:var(--mine-bg);color:var(--mine-fg);border-bottom-right-radius:5px;box-shadow:0 3px 16px rgba(200,169,106,.3),0 1px 4px rgba(200,169,106,.2);}
[dir="rtl"] .chat-bubble-mine{border-bottom-right-radius:18px;border-bottom-left-radius:5px;}
.chat-bubble-theirs{background:var(--their-bg);color:var(--their-fg);border:1px solid var(--their-border);border-bottom-left-radius:5px;box-shadow:var(--sh-soft);}
[dir="rtl"] .chat-bubble-theirs{border-bottom-left-radius:18px;border-bottom-right-radius:5px;}
.chat-bubble-staff{background:var(--staff-bg);border-color:var(--staff-border);}
.chat-text{font-size:15px;line-height:1.8;font-weight:400;}
.chat-img-wrap{margin-top:8px;border-radius:var(--r-sm);overflow:hidden;cursor:zoom-in;max-height:280px;transition:max-height .4s var(--ease);}
.chat-img-wrap.expanded{max-height:none;cursor:zoom-out;}
.chat-img{width:100%;display:block;object-fit:cover;max-height:280px;border-radius:var(--r-sm);}
.chat-time-row{display:flex;align-items:center;gap:5px;justify-content:flex-end;margin-top:6px;}
.chat-time{font-size:10px;opacity:.65;font-weight:500;white-space:nowrap;}
.chat-bubble-mine .chat-time{color:var(--mine-fg);}.chat-bubble-theirs .chat-time{color:var(--text3);}
.read-tick{color:var(--mine-fg);opacity:.55;}

/* teacher delete button — always visible */
.bubble-del{position:absolute;top:8px;inset-inline-end:8px;background:rgba(0,0,0,.08);border:none;cursor:pointer;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:currentColor;opacity:0.5;transition:all .2s var(--ease);}
.bubble-del:hover{opacity:1;background:rgba(200,169,106,.2);color:var(--graphite);}
.teacher-del{opacity:0.45;}
.teacher-del:hover{opacity:1 !important;background:rgba(200,0,0,.12);color:#c00;}
.bubble-del-confirm{opacity:1 !important;background:rgba(200,169,106,.25);color:var(--graphite);animation:shake .3s var(--ease);}

/* confirm toast */
.del-confirm-toast{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--gold);background:rgba(200,169,106,.12);border:1px solid rgba(200,169,106,.28);border-radius:var(--r-pill);padding:5px 12px;margin-top:4px;animation:fadeUp .2s var(--ease);}

/* actions */
.chat-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:2px 4px;}
.chat-actions-mine{flex-direction:row-reverse;}
.reply-toggle-btn{display:flex;align-items:center;gap:6px;background:none;border:1px solid rgba(0,0,0,.1);color:var(--text2);font-size:11px;font-weight:600;font-family:var(--font);padding:5px 12px;border-radius:var(--r-pill);cursor:pointer;transition:all .2s var(--ease);white-space:nowrap;}
.reply-toggle-btn:hover{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);}
.reply-toggle-active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);}

/* replies */
.replies-container{margin-top:6px;background:rgba(0,0,0,.025);border:1px solid rgba(0,0,0,.07);border-radius:var(--r);overflow:hidden;width:min(480px,100%);}
.replies-panel{display:flex;flex-direction:column;}
.replies-scroll{padding:12px 12px 8px;display:flex;flex-direction:column;gap:2px;max-height:320px;overflow-y:auto;}
.replies-scroll::-webkit-scrollbar{width:3px;}
.replies-scroll::-webkit-scrollbar-thumb{background:var(--cream3);border-radius:6px;}
.replies-loading{display:flex;justify-content:center;padding:20px;}
.msg-row{display:flex;align-items:flex-end;gap:8px;margin-bottom:8px;animation:blobIn .25s var(--ease-b) backwards;}
.msg-mine{flex-direction:row-reverse;}.msg-theirs{flex-direction:row;}
.msg-col{display:flex;flex-direction:column;gap:2px;max-width:80%;}
.msg-mine .msg-col{align-items:flex-end;}.msg-theirs .msg-col{align-items:flex-start;}
.msg-sender{display:flex;align-items:center;gap:5px;padding:0 4px;}
.msg-sender-name{font-size:10px;font-weight:700;color:var(--graphite2);}
.bubble{border-radius:14px;padding:9px 13px;word-break:break-word;position:relative;}
.bubble-mine{background:var(--mine-bg);color:var(--mine-fg);border-bottom-right-radius:4px;box-shadow:0 2px 10px rgba(200,169,106,.25);}
[dir="rtl"] .bubble-mine{border-bottom-right-radius:14px;border-bottom-left-radius:4px;}
.bubble-theirs{background:var(--their-bg);color:var(--their-fg);border:1px solid var(--their-border);border-bottom-left-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.07);}
[dir="rtl"] .bubble-theirs{border-bottom-left-radius:14px;border-bottom-right-radius:4px;}
.bubble-text{font-size:13px;line-height:1.7;font-weight:400;}
.bubble-time{display:block;font-size:9px;opacity:.55;text-align:end;margin-top:4px;}
.bubble-img{max-width:180px;max-height:160px;border-radius:8px;margin-top:6px;display:block;cursor:pointer;object-fit:cover;}
.msg-meta{display:flex;align-items:center;gap:4px;padding:0 4px;}
.msg-meta-mine{flex-direction:row-reverse;}
.del-micro{background:none;border:none;cursor:pointer;color:var(--text3);padding:2px 4px;display:flex;align-items:center;border-radius:4px;transition:all .15s var(--ease);opacity:0.55;}
.del-micro:hover{color:var(--graphite);background:var(--gold-dim);opacity:1;}

/* reply composer */
.reply-composer{display:flex;gap:8px;align-items:flex-end;padding:10px 12px;background:rgba(255,255,255,.6);border-top:1px solid rgba(0,0,0,.07);}
.reply-composer-inner{flex:1;min-width:0;}
.img-preview-mini{position:relative;display:inline-block;margin-bottom:6px;}
.img-preview-mini-img{max-height:80px;border-radius:8px;display:block;object-fit:cover;border:1px solid var(--cream4);}
.img-preview-mini-x{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);border:none;color:#fff;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;}
.reply-composer-row{display:flex;align-items:center;gap:6px;}
.reply-input{flex:1;border:1.5px solid var(--cream4);border-radius:var(--r-pill);padding:9px 15px;font-size:13px;font-family:var(--font);color:var(--text);background:#fff;outline:none;transition:all .2s var(--ease);}
.reply-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,169,106,.12);}
.reply-input::placeholder{color:var(--text3);}
.reply-icon-btn{background:none;border:1.5px solid var(--cream4);color:var(--text2);width:36px;height:36px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);}
.reply-icon-btn:hover{border-color:var(--gold);color:var(--graphite);background:var(--gold-dim);}
.reply-send-btn{background:var(--graphite);border:none;color:#F7EDD8;width:36px;height:36px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease-b);box-shadow:0 3px 14px rgba(11,11,12,.25);}
.reply-send-btn:hover:not(:disabled){background:var(--gold);color:var(--mine-fg);transform:scale(1.1);}
.reply-send-btn:disabled{opacity:.35;cursor:not-allowed;}

/* chips */
.chip-staff{font-size:9px;font-weight:700;color:var(--gold);background:var(--gold-dim);border:1px solid rgba(200,169,106,.28);padding:2px 8px;border-radius:var(--r-pill);}
.chip-admin{color:#E5B93C;background:rgba(229,185,60,.1);border-color:rgba(229,185,60,.32);}

/* avatar */
.av{border-radius:50%;flex-shrink:0;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.15),0 0 0 2px rgba(255,255,255,.8);transition:transform .2s var(--ease-b);}
.av:hover{transform:scale(1.07);}
.av-badge{position:absolute;bottom:-1px;right:-1px;width:14px;height:14px;border-radius:50%;background:var(--gold);border:2px solid #fff;font-size:6px;font-weight:900;color:var(--graphite);display:flex;align-items:center;justify-content:center;}

/* reactions */
.rxbar{position:relative;display:flex;flex-direction:column;gap:4px;}
.rx-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
.rx-btn{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.7);border:1px solid rgba(0,0,0,.1);color:var(--text2);font-size:11px;font-weight:600;font-family:var(--font);padding:5px 12px;border-radius:var(--r-pill);cursor:pointer;transition:all .2s var(--ease);backdrop-filter:blur(8px);}
.rx-btn:hover{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);transform:scale(1.04);}
.rx-on{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);}
.rx-compact{padding:4px 9px;}
.rx-btn-emoji{font-size:14px;line-height:1;}
.rx-counts{display:flex;gap:4px;flex-wrap:wrap;}
.rx-pill{display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:var(--text2);background:rgba(255,255,255,.7);border:1px solid rgba(0,0,0,.09);padding:3px 9px;border-radius:var(--r-pill);transition:all .2s var(--ease);backdrop-filter:blur(8px);}
.rx-pill:hover{background:var(--gold-dim);border-color:var(--gold-border);transform:translateY(-1px);}
.rx-picker{position:absolute;bottom:calc(100% + 8px);inset-inline-start:0;background:rgba(255,255,255,.95);backdrop-filter:blur(20px);border:1px solid rgba(0,0,0,.1);border-radius:var(--r);padding:8px 10px;display:flex;gap:2px;box-shadow:var(--sh-lift);z-index:200;animation:popIn .28s var(--ease-b) backwards;}
.rx-picker-end{inset-inline-start:auto;inset-inline-end:0;}
.rx-pick-btn{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:8px 10px;border-radius:10px;transition:all .18s var(--ease);font-family:var(--font);animation:popIn .28s var(--ease-b) backwards;}
.rx-pick-btn:hover,.rx-pick-btn.on{background:var(--gold-dim);}
.rx-em{font-size:22px;line-height:1;display:block;transition:transform .2s var(--ease-b);}
.rx-pick-btn:hover .rx-em{transform:scale(1.4) translateY(-4px);}
.rx-lbl{font-size:9px;color:var(--text3);font-weight:600;white-space:nowrap;}

/* composer */
.hub-composer-wrap{padding:12px 16px 16px;flex-shrink:0;background:rgba(247,242,234,.92);backdrop-filter:blur(20px);border-top:1px solid rgba(0,0,0,.08);position:relative;z-index:50;}
.composer{max-width:860px;margin:0 auto;background:#fff;border:1.5px solid var(--cream4);border-radius:28px;padding:8px 8px 8px 14px;box-shadow:var(--sh-med);transition:border-color .25s var(--ease),box-shadow .25s var(--ease);}
.composer-focused{border-color:var(--gold);box-shadow:var(--sh-med),0 0 0 3px rgba(200,169,106,.12);}
.composer-img-preview{padding:8px 8px 0;position:relative;display:inline-block;margin-bottom:4px;}
.composer-img-preview-img{max-height:120px;border-radius:12px;display:block;object-fit:cover;border:1px solid var(--cream4);}
.composer-img-x{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.6);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;}
.composer-row{display:flex;align-items:center;gap:10px;}
.composer-field-wrap{flex:1;min-width:0;}
.composer-ta{width:100%;border:none;outline:none;resize:none;overflow:hidden;font-family:var(--font);font-size:15px;color:var(--text);background:transparent;line-height:1.7;min-height:26px;max-height:160px;}
.composer-ta::placeholder{color:var(--text3);}
.composer-btns{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.composer-img-btn{background:none;border:none;cursor:pointer;color:var(--text3);width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);}
.composer-img-btn:hover{background:var(--gold-dim);color:var(--graphite);}
.composer-send-btn{background:var(--graphite);border:none;color:#F7EDD8;width:42px;height:42px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .22s var(--ease-b);box-shadow:0 3px 16px rgba(11,11,12,.25);}
.composer-send-btn:hover:not(:disabled){background:var(--gold);color:var(--mine-fg);transform:scale(1.08);}
.composer-send-btn:active:not(:disabled){transform:scale(.93);}
.composer-send-btn:disabled{opacity:.3;cursor:not-allowed;}

/* spinner */
.mini-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(0,0,0,.1);border-top-color:currentColor;animation:spin .7s linear infinite;display:inline-block;flex-shrink:0;}
.s-light{border-color:rgba(247,237,216,.2);border-top-color:#F7EDD8;}

/* load more */
.load-more-wrap{display:flex;justify-content:center;margin-bottom:8px;}
.load-more-btn{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.7);border:1px solid rgba(0,0,0,.1);backdrop-filter:blur(8px);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font);padding:8px 18px;border-radius:var(--r-pill);cursor:pointer;transition:all .2s var(--ease);}
.load-more-btn:hover:not(:disabled){background:#fff;border-color:var(--gold);color:var(--graphite2);}
.load-more-btn:disabled{opacity:.4;cursor:not-allowed;}

/* empty */
.hub-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;gap:14px;animation:fadeUp .5s var(--ease);}
.hub-empty-icon{color:rgba(200,169,106,.38);}
.hub-empty-title{font-size:20px;font-weight:800;color:var(--text);}
.hub-empty-sub{font-size:14px;color:var(--text2);max-width:240px;text-align:center;line-height:1.7;}

/* no school */
.hub-no-school{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;text-align:center;padding:24px;}
.no-school-icon{color:rgba(200,169,106,.42);margin-bottom:4px;}
.no-school-title{font-size:20px;font-weight:800;color:var(--text);}
.no-school-sub{font-size:14px;color:var(--text2);}

/* responsive */
@media(max-width:640px){
  .hub-feed{padding:12px 8px 6px;}
  .hub-composer-wrap{padding:8px 10px 12px;}
  .hub-header-inner{padding:12px 14px;}
  .chat-col{max-width:82%;}
  .replies-container{width:100%;}
  .chat-bubble{padding:10px 13px;}
  .composer{padding:6px 6px 6px 12px;}
  .hub-brand-icon{width:38px;height:38px;}
  .hub-title{font-size:14px;}
  .composer-ta{font-size:16px;}
  .reply-input{font-size:16px;}
  .chat-col{max-width:88%;}
  .msg-col{max-width:86%;}
}
@media(max-width:380px){
  .hub-header-inner{padding:10px 12px;}
  .hub-subtitle{display:none;}
  .chat-text{font-size:14px;}
  .composer{padding:5px 5px 5px 10px;}
}
`;
