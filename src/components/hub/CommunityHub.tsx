"use client";
/* User-generated and local preview URLs do not have stable dimensions for next/image. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cachedFetch } from "@/lib/api-cache";
import { useConfirm } from "@/lib/confirm-dialog";
import { ProfileAvatar } from "@/components/hub/ProfileAvatar";
import { useLang } from "@/lib/language-context";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ReactionType = "LIKE" | "LOVE" | "DISLIKE" | "HAHA" | "SAD";
type Lang = "ar" | "sq";
export type CommunityPersona = "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

interface Reaction { id: string; type: ReactionType; author_id: string; }
interface Author   { id: string; full_name: string; role: string; avatar_url: string | null; }
interface Post {
  id: string; content: string | null; image_url: string | null;
  created_at: string; reply_to_id: string | null;
  author: Author; reactions: Reaction[]; _count: { replies: number };
}
interface Me {
  id: string; name: string; role: string;
  school: { id: string; name: string; name_alt?: string | null; language: string } | null;
}

// ─── LOCALIZATION ─────────────────────────────────────────────────────────────

const T: Record<Lang, {
  today: string; yesterday: string; community: string; react: string;
  replyLabel: string; replies: string; teacher: string; admin: string;
  composerPH: string; replyPH: string; loadMore: string; loading: string;
  emptyTitle: string; emptySub: string; noSchoolTitle: string; noSchoolSub: string;
  del: string; img: string; send: string; delConfirmTip: string;
  sendFailed: string; loadFailed: string; imageError: string; retry: string; close: string;
  newMsg: (n: number) => string;
}> = {
  ar: {
    today: "اليوم", yesterday: "أمس", community: "مجتمع المدرسة", react: "تفاعل",
    replyLabel: "رد", replies: "ردود", teacher: "معلم", admin: "مشرف",
    composerPH: "شارك فكرة، تحديثًا، أو لحظة مع مجتمع مدرستك...", replyPH: "اكتب ردًا واضحًا ولطيفًا...",
    loadMore: "عرض رسائل أقدم", loading: "جارٍ التحميل...",
    emptyTitle: "المساحة جاهزة لأول مشاركة", emptySub: "ابدأ حوارًا يقرّب مجتمع المدرسة من بعضه.",
    noSchoolTitle: "لم يتم تعيينك في مدرسة بعد",
    noSchoolSub: "تواصل مع المدير لتفعيل حسابك",
    del: "حذف", img: "صورة", send: "إرسال",
    delConfirmTip: "اضغط مرة أخرى للتأكيد",
    sendFailed: "تعذر الإرسال. تحقق من اتصالك وحاول مرة أخرى.",
    loadFailed: "تعذر تحميل المجتمع الآن.", imageError: "اختر صورة بصيغة JPG أو PNG أو WebP أو GIF أو AVIF وبحجم لا يتجاوز 8 ميجابايت.", retry: "إعادة المحاولة", close: "إغلاق",
    newMsg: (n) => `${n} رسالة جديدة · اضغط للتحديث`,
  },
  sq: {
    today: "Sot", yesterday: "Dje", community: "Komuniteti", react: "Reagoj",
    replyLabel: "Përgjigje", replies: "përgjigje", teacher: "Mësues", admin: "Drejtori",
    composerPH: "Ndaj një ide, përditësim ose moment me komunitetin...", replyPH: "Shkruaj një përgjigje të qartë dhe miqësore...",
    loadMore: "Shfaq mesazhe më të vjetra", loading: "Po ngarkohet...",
    emptyTitle: "Hapësira është gati për postimin e parë", emptySub: "Nis një bisedë që afron komunitetin e shkollës.",
    noSchoolTitle: "Nuk jeni caktuar në asnjë shkollë",
    noSchoolSub: "Kontaktoni administratorin për aktivizimin",
    del: "Fshij", img: "Foto", send: "Dërgo",
    delConfirmTip: "Shtypni përsëri për të konfirmuar",
    sendFailed: "Mesazhi nuk u dërgua. Kontrolloni lidhjen dhe provoni përsëri.",
    loadFailed: "Komuniteti nuk mund të ngarkohej tani.", imageError: "Zgjidhni JPG, PNG, WebP, GIF ose AVIF deri në 8 MB.", retry: "Provo përsëri", close: "Mbyll",
    newMsg: (n) => `${n} mesazhe të reja · shtypni për rifreskuar`,
  },
};

function moderationNote(persona: CommunityPersona, lang: Lang) {
  if (persona === "SCHOOL_ADMIN") {
    return lang === "ar"
      ? "وضع الإشراف · يمكنك إدارة جميع المشاركات والردود"
      : "Modaliteti i administratorit · Mund të menaxhoni të gjitha postimet dhe përgjigjet";
  }
  return lang === "ar"
    ? "وضع المعلم · يمكنك إدارة مشاركات الطلاب وردودهم"
    : "Modaliteti i mësuesit · Mund të menaxhoni postimet dhe përgjigjet e nxënësve";
}

const RX: { type: ReactionType; emoji: string; label: Record<Lang, string> }[] = [
  { type: "LIKE",    emoji: "👍", label: { ar: "أعجبني",    sq: "Pëlqej" } },
  { type: "LOVE",    emoji: "❤️",  label: { ar: "أحببته",    sq: "Dashuri" } },
  { type: "HAHA",    emoji: "😂", label: { ar: "مضحك",      sq: "Qesharak" } },
  { type: "SAD",     emoji: "😢", label: { ar: "حزين",      sq: "Trishtim" } },
  { type: "DISLIKE", emoji: "👎", label: { ar: "لم يعجبني", sq: "Nuk pëlqej" } },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────

function formatDate(d: string, lang: Lang) {
  const date = new Date(d);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  const loc  = lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL";
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
  const loc = lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL";
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

function canDeleteCommunityPost(me: Me, author: Author) {
  if (author.id === me.id) return true;
  if (me.role === "SCHOOL_ADMIN") return true;
  return me.role === "TEACHER" && author.role === "STUDENT";
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

const AV_COLORS = [
  { bg: "#6B1E2D", text: "#6B1E2D" }, { bg: "#1B5E20", text: "#1B5E20" },
  { bg: "#6B1E2D", text: "#6B1E2D" }, { bg: "#8C8274", text: "#1A1A1A" },
  { bg: "#B8A082", text: "#6B1E2D" }, { bg: "#8C8274", text: "#1A1A1A" },
  { bg: "#6B1E2D", text: "#6B1E2D" }, { bg: "#8C8274", text: "#1A1A1A" },
];

function getAvColor(name: string, isStaff: boolean) {
  if (isStaff) return { bg: "#1A1A1A", text: "#B8A082" };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

function Av({ name, role, avatarUrl, size = 40 }: { name: string; role: string; avatarUrl?: string | null; size?: number }) {
  const isStaff = role === "TEACHER" || role === "SCHOOL_ADMIN";
  const col = getAvColor(name, isStaff);
  return (
    <div className="av" style={{ width: size, height: size, minWidth: size, fontSize: size * 0.36, background: col.bg, color: col.text }}>
      {avatarUrl ? (
        <img className="av-img" src={avatarUrl} alt="" />
      ) : initials(name)}
      {isStaff && <span className="av-badge">✦</span>}
    </div>
  );
}

// ─── REACTION BAR ─────────────────────────────────────────────────────────────

function RxBar({ postId, reactions, myId, lang, onReact, compact = false, alignEnd = false }: {
  postId: string; reactions: Reaction[]; myId: string; lang: Lang;
  onReact: (pid: string, type: ReactionType) => Promise<void>;
  compact?: boolean; alignEnd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mine   = reactions.find((r) => r.author_id === myId);
  const grp    = grouped(reactions);
  const mineRx = RX.find((r) => r.type === mine?.type);
  const tr = T[lang];

  const open_  = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const close_ = () => { timer.current = setTimeout(() => setOpen(false), 280); };
  const choose = async (type: ReactionType) => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    try {
      await onReact(postId, type);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rxbar ${alignEnd ? "rxbar-end" : ""}`} onMouseLeave={close_}>
      {open && (
        <div className={`rx-picker ${alignEnd ? "rx-picker-end" : ""}`} onMouseEnter={open_}>
          {RX.map((r, i) => (
            <button key={r.type} type="button" className={`rx-pick-btn ${mine?.type === r.type ? "on" : ""}`}
              onClick={() => choose(r.type)} disabled={busy}
              aria-label={r.label[lang]} title={r.label[lang]} style={{ animationDelay: `${i * 0.035}s` }}>
              <span className="rx-em">{r.emoji}</span>
              <span className="rx-lbl">{r.label[lang]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="rx-row">
        <button type="button" className={`rx-btn ${mine ? "rx-on" : ""} ${compact ? "rx-compact" : ""}`}
          onMouseEnter={open_}
          disabled={busy} aria-expanded={open}
          onClick={() => mine ? choose(mine.type) : setOpen((v) => !v)}>
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
  const [invalid, setInvalid] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const pick = (f: File) => {
    const supported = ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"];
    if (!supported.includes(f.type) || f.size <= 0 || f.size > 8 * 1024 * 1024) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };
  const clear = () => { setFile(null); setPreview(null); setInvalid(false); if (ref.current) ref.current.value = ""; };
  return { file, preview, invalid, ref, pick, clear };
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

function Replies({ postId, me, lang, onCountChange }: {
  postId: string; me: Me; lang: Lang; onCountChange: (delta: number) => void;
}) {
  const confirm = useConfirm();
  const [replies, setReplies] = useState<Post[]>([]);
  const [busy, setBusy]       = useState(true);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const img    = useImgUpload();
  const endRef = useRef<HTMLDivElement>(null);
  const tr = T[lang];

  useEffect(() => {
    let active = true;
    fetch(`/api/hub/posts/${postId}/replies`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("replies");
        return r.json();
      })
      .then((d) => { if (active) setReplies(d.replies ?? []); })
      .catch(() => { if (active) setError(T[lang].loadFailed); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [postId, lang]);

  const handleReplyReact = async (pid: string, type: ReactionType) => {
    const before = replies.find((reply) => reply.id === pid)?.reactions ?? null;
    setReplies((prev) =>
      prev.map((r) => r.id === pid ? { ...r, reactions: applyReaction(r.reactions, me.id, type) } : r)
    );
    try {
      const res = await fetch(`/api/hub/posts/${pid}/reactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("reaction");
    } catch {
      if (before) setReplies((prev) => prev.map((r) => r.id === pid ? { ...r, reactions: before } : r));
      setError(tr.sendFailed);
      throw new Error("reaction");
    }
  };

  const send = async () => {
    if (sending || (!text.trim() && !img.file)) return;
    setSending(true);
    setError("");
    const form = new FormData();
    if (text.trim()) form.append("content", text.trim());
    if (img.file) form.append("file", img.file);
    try {
      const res = await fetch(`/api/hub/posts/${postId}/replies`, { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.reply) throw new Error("reply");
      setReplies((p) => [...p, d.reply as Post]);
      setText("");
      img.clear();
      onCountChange(1);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    } catch {
      setError(tr.sendFailed);
    } finally {
      setSending(false);
    }
  };

  const del = async (id: string) => {
    const ok = await confirm({
      message: lang === "ar" ? "حذف هذا الرد؟" : "Fshi këtë përgjigje?",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/hub/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      setReplies((p) => p.filter((r) => r.id !== id));
      onCountChange(-1);
    } catch {
      setError(tr.sendFailed);
    }
  };

  const byDay: { day: string; items: Post[] }[] = [];
  [...replies].forEach((r) => {
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
                const canDeleteReply = canDeleteCommunityPost(me, r.author);
                return (
                  <div key={r.id} className={`msg-row ${isMe ? "msg-mine" : "msg-theirs"}`}>
                    {!isMe && <ProfileAvatar author={r.author} size={32} lang={lang} />}
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
                        {canDeleteReply && (
                          <button className="del-micro" onClick={() => del(r.id)} title={tr.del}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            </svg>
                          </button>
                        )}
                        <RxBar postId={r.id} reactions={r.reactions} myId={me.id} lang={lang}
                          onReact={handleReplyReact} compact alignEnd={isMe} />
                      </div>
                    </div>
                    {isMe && <ProfileAvatar author={r.author} size={32} lang={lang} alignEnd />}
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
          {(error || img.invalid) && <div className="composer-error" role="alert">{img.invalid ? tr.imageError : error}</div>}
          <div className="reply-composer-row">
            <textarea className="reply-input" placeholder={tr.replyPH} rows={1}
              value={text} onChange={(e) => setText(e.target.value)} dir="auto"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <input ref={img.ref} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && img.pick(e.target.files[0])} />
            <button type="button" className="reply-icon-btn" onClick={() => img.ref.current?.click()} title={tr.img} aria-label={tr.img}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button type="button" className="reply-send-btn" disabled={sending || (!text.trim() && !img.file)} onClick={send} aria-label={tr.send}>
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

// ─── POST CARD (teacher moderation, two-step confirm) ─────────────────────────

function PostCard({ post, me, lang, onDelete, onReact, index }: {
  post: Post; me: Me; lang: Lang;
  onDelete: (id: string) => void;
  onReact: (pid: string, type: ReactionType) => Promise<void>;
  index: number;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyCt, setReplyCt] = useState(post._count.replies);
  const [imgOpen, setImgOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const isMe    = post.author.id === me.id;
  const isStaff = post.author.role === "TEACHER" || post.author.role === "SCHOOL_ADMIN";
  const isAdmin = post.author.role === "SCHOOL_ADMIN";
  const canDeletePost = canDeleteCommunityPost(me, post.author);
  const tr = T[lang];

  // Two-step delete confirm
  const del = async () => {
    if (!delConfirm) {
      setDelConfirm(true);
      setTimeout(() => setDelConfirm(false), 3000);
      return;
    }
    const res = await fetch(`/api/hub/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) return;
    onDelete(post.id);
  };

  return (
    <div className={`chat-row ${isMe ? "chat-mine" : "chat-theirs"}`}
      style={{ animationDelay: `${index * 0.04}s` }}>
      {!isMe && (
        <div className="chat-av-wrap">
          <ProfileAvatar author={post.author} size={42} lang={lang} alignEnd />
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

        <div className={`chat-bubble ${isMe ? "chat-bubble-mine" : "chat-bubble-theirs"} ${isStaff && !isMe ? "chat-bubble-staff" : ""} ${canDeletePost ? "has-delete" : ""}`}>
          {canDeletePost && (
            <button
              type="button"
              className={`bubble-del teacher-del ${delConfirm ? "bubble-del-confirm" : ""}`}
              onClick={del}
              aria-label={delConfirm ? tr.delConfirmTip : tr.del}
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
          )}

          {post.content && <p className="chat-text" dir="auto">{post.content}</p>}

          {post.image_url && (
            <button type="button" className={`chat-img-wrap ${imgOpen ? "expanded" : ""}`}
              onClick={() => setImgOpen((v) => !v)} aria-expanded={imgOpen}>
              <img src={post.image_url} className="chat-img" alt="" />
            </button>
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
          <button type="button" className={`reply-toggle-btn ${showReplies ? "reply-toggle-active" : ""}`}
            onClick={() => setShowReplies((v) => !v)} aria-expanded={showReplies}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {replyCt > 0 ? `${replyCt} ${tr.replies}` : tr.replyLabel}
          </button>
        </div>

        {showReplies && (
          <div className="replies-container">
            <Replies postId={post.id} me={me} lang={lang}
              onCountChange={(delta) => setReplyCt((count) => Math.max(0, count + delta))} />
          </div>
        )}
      </div>

      {isMe && (
        <div className="chat-av-wrap">
          <ProfileAvatar author={post.author} size={42} lang={lang} />
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
  const [error, setError]     = useState("");
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
    if (sending || (!text.trim() && !img.file)) return;
    setSending(true);
    setError("");
    const form = new FormData();
    form.append("school_id", me.school!.id);
    if (text.trim()) form.append("content", text.trim());
    if (img.file) form.append("file", img.file);
    try {
      const res = await fetch("/api/hub/posts", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.post) throw new Error("post");
      onPosted(d.post as Post);
      setText("");
      img.clear();
      setFocused(false);
    } catch {
      setError(tr.sendFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`composer ${focused ? "composer-focused" : ""}`}>
      {img.preview && (
        <div className="composer-img-preview">
          <img src={img.preview} className="composer-img-preview-img" alt="" />
          <button className="composer-img-x" onClick={img.clear}>✕</button>
        </div>
      )}
      {(error || img.invalid) && <div className="composer-error composer-error-main" role="alert">{img.invalid ? tr.imageError : error}</div>}
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
          <button type="button" className="composer-img-btn" onClick={() => img.ref.current?.click()} title={tr.img} aria-label={tr.img}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button type="button" className="composer-send-btn" disabled={sending || (!text.trim() && !img.file)}
            onClick={submit} title={tr.send} aria-label={tr.send}>
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

interface IdentityResponse {
  profile?: { full_name?: string };
  school?: { id: string; name: string; name_alt?: string | null; language: string } | null;
  adminName?: string;
}

export function CommunityHub({ persona }: { persona: CommunityPersona }) {
  const { lang: uiLang } = useLang();
  const [me, setMe]               = useState<Me | null>(null);
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor]       = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const supabase = useMemo(() => createClient(), []);
  const topRef   = useRef<HTMLDivElement>(null);
  const feedRef  = useRef<HTMLDivElement>(null);
  const schoolId = me?.school?.id ?? null;

  useEffect(() => {
    let active = true;
    const loadIdentity = async () => {
      setLoadError(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("auth");
        const endpoint = persona === "SCHOOL_ADMIN" ? "/api/school-admin/stats" : persona === "TEACHER" ? "/api/teacher" : "/api/student";
        const ttl = persona === "TEACHER" ? 300_000 : 60_000;
        const d = await cachedFetch<IdentityResponse>(endpoint, ttl);
        if (!active) return;
        const fallback = persona === "SCHOOL_ADMIN" ? "Drejtori" : persona === "TEACHER" ? "Mësues" : "Nxënës";
        setMe({
          id: user.id,
          name: d.adminName ?? d.profile?.full_name ?? fallback,
          role: persona,
          school: d.school ?? null,
        });
        if (!d.school) setLoading(false);
      } catch {
        if (active) { setLoadError(true); setLoading(false); }
      }
    };
    loadIdentity();
    return () => { active = false; };
  }, [persona, supabase, loadRevision]);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    fetch(`/api/hub/posts?school_id=${schoolId}&limit=30`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("posts");
        return r.json();
      })
      .then((d) => {
        if (!active) return;
        setPosts(d.posts ?? []);
        setCursor(d.nextCursor ?? null);
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [schoolId, loadRevision]);

  /* scroll-to-bottom-on-load */
  useEffect(() => {
    if (loading) return;
    const el = feedRef.current;
    if (!el) return;
    // Run on next frame so the DOM is laid out.
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [loading]);

  useEffect(() => {
    if (!schoolId || !me) return;
    const ch = supabase.channel(`hub-${persona.toLowerCase()}:${schoolId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "posts",
        filter: `school_id=eq.${schoolId}`,
      }, (payload) => {
        const p = payload.new as { reply_to_id: string | null; author_id: string };
        if (p.reply_to_id || p.author_id === me.id) return;
        // Re-fetch the freshest top-level so we get author + reactions populated.
        fetch(`/api/hub/posts?school_id=${schoolId}&limit=1`, { cache: "no-store" })
          .then(async (r) => {
            if (!r.ok) throw new Error("post");
            return r.json();
          })
          .then((d) => {
            const fresh = (d.posts ?? [])[0];
            if (!fresh) return;
            setPosts((prev) => prev.some((q) => q.id === fresh.id) ? prev : [fresh, ...prev]);
            requestAnimationFrame(() => {
              const el = feedRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            });
          })
          .catch(() => {});
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [schoolId, me, persona, supabase]);

  const loadMore = async () => {
    if (!cursor || !schoolId) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/hub/posts?school_id=${schoolId}&cursor=${cursor}&limit=30`, { cache: "no-store" });
      if (!res.ok) throw new Error("posts");
      const d = await res.json();
      setPosts((p) => [...p, ...(d.posts ?? [])]);
      setCursor(d.nextCursor ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePosted = (p: Post) => {
    setPosts((prev) => [p, ...prev]);
    setTimeout(() => {
      const el = feedRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 80);
  };
  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));
  const handleReact = async (pid: string, type: ReactionType) => {
    if (!me) return;
    const before = posts.find((post) => post.id === pid)?.reactions ?? null;
    setPosts((prev) => prev.map((p) => p.id !== pid ? p : { ...p, reactions: applyReaction(p.reactions, me.id, type) }));
    try {
      const res = await fetch(`/api/hub/posts/${pid}/reactions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("reaction");
    } catch {
      if (before) setPosts((prev) => prev.map((post) => post.id === pid ? { ...post, reactions: before } : post));
      throw new Error("reaction");
    }
  };

  const lang: Lang = uiLang === "ar" ? "ar" : "sq";
  const isRtl = lang === "ar";
  const dir   = isRtl ? "rtl" : "ltr";
  const tr    = T[lang];

  const byDay: { day: string; items: Post[] }[] = [];
  // Reverse the desc-from-API list so chat reads oldest → newest top-to-bottom.
  [...posts].reverse().forEach((p) => {
    const day = getDayLabel(p.created_at, lang);
    const last = byDay[byDay.length - 1];
    if (!last || last.day !== day) byDay.push({ day, items: [p] });
    else last.items.push(p);
  });

  if (loadError && !loading && posts.length === 0)
    return (
      <div className="hub hub-state" dir={dir}>
        <div className="state-card" role="alert">
          <div className="state-icon">!</div>
          <h2>{tr.loadFailed}</h2>
          <button type="button" onClick={() => setLoadRevision((value) => value + 1)}>{tr.retry}</button>
        </div>
        <style>{`${css}\n${premiumCss}`}</style>
      </div>
    );

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
        <style>{`${css}\n${premiumCss}`}</style>
      </div>
    );

  if (!me.school)
    return (
      <div className="hub hub-no-school" dir={dir}>
        <div className="no-school-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 className="no-school-title">{tr.noSchoolTitle}</h2>
        <p className="no-school-sub">{tr.noSchoolSub}</p>
        <style>{`${css}\n${premiumCss}`}</style>
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
              <p className="hub-subtitle">{lang !== "ar" && me.school.name_alt && me.school.name_alt.trim() ? me.school.name_alt : me.school.name}</p>
            </div>
          </div>
        </div>
      </header>

      {persona !== "STUDENT" && (
        <div className={`mode-bar ${persona === "SCHOOL_ADMIN" ? "mode-bar-admin" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>{moderationNote(persona, lang)}</span>
        </div>
      )}

      {/* new-posts banner removed — posts auto-append */}

      <div className="hub-feed" ref={feedRef}>
        {cursor && (
          <div className="load-more-wrap">
            <button type="button" className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
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
        <div data-write="true"><Composer me={me} lang={lang} onPosted={handlePosted} /></div>
      </div>

      <style>{`${css}\n${premiumCss}`}</style>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `/* hub-viral-pack */
@keyframes hubBlob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.07)}66%{transform:translate(-30px,30px) scale(.94)}}
@keyframes hubBlob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,40px) scale(1.1)}}
@keyframes burstFloat{0%{opacity:0;transform:translateY(0) scale(.6)}25%{opacity:1;transform:translateY(-20px) scale(1.3)}100%{opacity:0;transform:translateY(-70px) scale(.9)}}
.hub-bg-pattern::before,.hub-bg-pattern::after{content:'';position:absolute;border-radius:50%;filter:blur(80px);opacity:.45;pointer-events:none;}
.hub-bg-pattern::before{width:520px;height:520px;background:radial-gradient(circle,#B8A082 0%,transparent 70%);top:-120px;inset-inline-end:-120px;animation:hubBlob 18s ease-in-out infinite;}
.hub-bg-pattern::after{width:460px;height:460px;background:radial-gradient(circle,#6B1E2D 0%,transparent 70%);bottom:-140px;inset-inline-start:-100px;animation:hubBlob2 22s ease-in-out infinite;opacity:.22;}
.chat-bubble-staff{position:relative;overflow:visible;}
.chat-bubble-staff::after{content:'';position:absolute;inset:-1.5px;border-radius:inherit;background:linear-gradient(135deg,rgba(184,160,130,.55),rgba(184,160,130,0) 50%,rgba(184,160,130,.45));z-index:-1;}
.rx-burst{position:absolute;font-size:22px;pointer-events:none;animation:burstFloat .9s ease-out forwards;left:50%;top:0;transform-origin:center;}
.composer{background:linear-gradient(135deg,#fff,#FFFBF5)!important;}
.composer-focused{background:#fff!important;}

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
  --cream:#F7F3EB;--cream2:#EFEAE0;--cream3:#E5E0D5;--cream4:#D9C9B0;
  --graphite:#1A1A1A;--graphite2:#4A0E1C;
  --gold:#B8A082;--gold2:#B8A082;--gold3:#D9C9B0;
  --gold-dim:rgba(184,160,130,.10);--gold-mid:rgba(184,160,130,.18);--gold-border:rgba(184,160,130,.35);
  --text:#6B1E2D;--text2:#6B1E2D;--text3:#8C8274;
  --mine-bg:#B8A082;--mine-fg:#6B1E2D;
  --their-bg:#FFFFFF;--their-fg:#6B1E2D;--their-border:rgba(26,26,26,.08);
  --staff-bg:rgba(184,160,130,.06);--staff-border:rgba(184,160,130,.20);
  --r:16px;--r-sm:12px;--r-xs:8px;--r-pill:100px;
  --font:'Cairo','IBM Plex Sans Arabic',-apple-system,sans-serif;
  --sh-soft:0 2px 12px rgba(107,30,45,.08);--sh-med:0 4px 24px rgba(107,30,45,.12);--sh-lift:0 8px 40px rgba(107,30,45,.16);
  --ease:cubic-bezier(.4,0,.2,1);--ease-b:cubic-bezier(.34,1.56,.64,1);
}

.hub{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cream);font-family:var(--font);color:var(--text);position:relative;overflow:hidden;}
.hub-bg-pattern{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(circle at 20% 20%,rgba(184,160,130,.07) 0%,transparent 50%),radial-gradient(circle at 80% 80%,rgba(26,26,26,.04) 0%,transparent 50%);}

/* skeleton */
.skel-header{height:72px;background:var(--graphite);flex-shrink:0;}
.skel-mode-bar{height:38px;background:rgba(184,160,130,.12);flex-shrink:0;border-bottom:1px solid rgba(184,160,130,.15);}
.skel-body{flex:1;padding:20px 16px;display:flex;flex-direction:column;gap:16px;overflow:hidden;}
.skel-row{display:flex;align-items:flex-end;gap:10px;}.skel-mine{flex-direction:row-reverse;}
.skel-av{width:42px;height:42px;border-radius:50%;background:var(--cream3);flex-shrink:0;}
.skel-bubble{height:64px;border-radius:var(--r);width:min(65%,260px);background:linear-gradient(90deg,var(--cream2) 25%,var(--cream3) 50%,var(--cream2) 75%);background-size:600px 100%;animation:shimmer 1.5s ease infinite;}

/* header */
.hub-header{background:var(--graphite);position:relative;z-index:100;flex-shrink:0;box-shadow:0 4px 24px rgba(26,26,26,.45);}
.hub-header-stripe{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold) 30%,#B8A082 60%,transparent);}
.hub-header-inner{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;max-width:860px;margin:0 auto;}
.hub-brand{display:flex;align-items:center;gap:14px;}
.hub-brand-icon{width:44px;height:44px;border-radius:13px;flex-shrink:0;background:rgba(184,160,130,.15);border:1.5px solid rgba(184,160,130,.30);display:flex;align-items:center;justify-content:center;color:var(--gold);transition:all .3s var(--ease-b);}
.hub-brand-icon:hover{background:rgba(184,160,130,.25);transform:scale(1.08) rotate(-3deg);}
.hub-title{font-size:16px;font-weight:800;color:#F7F3EB;letter-spacing:-.2px;line-height:1.25;}
.hub-subtitle{font-size:11px;color:rgba(184,160,130,.60);font-weight:500;margin-top:2px;}

/* mode bar */
.mode-bar{display:flex;align-items:center;gap:8px;padding:9px 20px;background:rgba(184,160,130,.10);border-bottom:1px solid rgba(184,160,130,.18);font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0;z-index:90;position:relative;}

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
.date-divider-label{font-size:11px;font-weight:600;color:var(--text3);background:rgba(255,255,255,.8);backdrop-filter:blur(8px);border:1px solid rgba(26,26,26,.07);padding:5px 14px;border-radius:var(--r-pill);box-shadow:var(--sh-soft);}

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
.chat-bubble-mine{background:var(--mine-bg);color:var(--mine-fg);border-bottom-right-radius:5px;box-shadow:0 3px 16px rgba(184,160,130,.3),0 1px 4px rgba(184,160,130,.2);}
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
.bubble-del{position:absolute;top:8px;inset-inline-end:8px;background:rgba(26,26,26,.08);border:none;cursor:pointer;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:currentColor;opacity:0.5;transition:all .2s var(--ease);}
.bubble-del:hover{opacity:1;background:rgba(184,160,130,.2);color:var(--graphite);}
.teacher-del{opacity:0.45;}
.teacher-del:hover{opacity:1 !important;background:rgba(107,30,45,.12);color:#6B1E2D;}
.bubble-del-confirm{opacity:1 !important;background:rgba(184,160,130,.25);color:var(--graphite);animation:shake .3s var(--ease);}

/* confirm toast */
.del-confirm-toast{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--gold);background:rgba(184,160,130,.12);border:1px solid rgba(184,160,130,.28);border-radius:var(--r-pill);padding:5px 12px;margin-top:4px;animation:fadeUp .2s var(--ease);}

/* actions */
.chat-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:2px 4px;}
.chat-actions-mine{flex-direction:row-reverse;}
.reply-toggle-btn{display:flex;align-items:center;gap:6px;background:none;border:1px solid rgba(26,26,26,.1);color:var(--text2);font-size:11px;font-weight:600;font-family:var(--font);padding:5px 12px;border-radius:var(--r-pill);cursor:pointer;transition:all .2s var(--ease);white-space:nowrap;}
.reply-toggle-btn:hover{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);}
.reply-toggle-active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);}

/* replies */
.replies-container{margin-top:6px;background:rgba(26,26,26,.025);border:1px solid rgba(26,26,26,.07);border-radius:var(--r);overflow:hidden;width:min(480px,100%);}
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
.bubble-mine{background:var(--mine-bg);color:var(--mine-fg);border-bottom-right-radius:4px;box-shadow:0 2px 10px rgba(184,160,130,.25);}
[dir="rtl"] .bubble-mine{border-bottom-right-radius:14px;border-bottom-left-radius:4px;}
.bubble-theirs{background:var(--their-bg);color:var(--their-fg);border:1px solid var(--their-border);border-bottom-left-radius:4px;box-shadow:0 1px 6px rgba(26,26,26,.07);}
[dir="rtl"] .bubble-theirs{border-bottom-left-radius:14px;border-bottom-right-radius:4px;}
.bubble-text{font-size:13px;line-height:1.7;font-weight:400;}
.bubble-time{display:block;font-size:9px;opacity:.55;text-align:end;margin-top:4px;}
.bubble-img{max-width:180px;max-height:160px;border-radius:8px;margin-top:6px;display:block;cursor:pointer;object-fit:cover;}
.msg-meta{display:flex;align-items:center;gap:4px;padding:0 4px;}
.msg-meta-mine{flex-direction:row-reverse;}
.del-micro{background:none;border:none;cursor:pointer;color:var(--text3);padding:2px 4px;display:flex;align-items:center;border-radius:4px;transition:all .15s var(--ease);opacity:0.55;}
.del-micro:hover{color:var(--graphite);background:var(--gold-dim);opacity:1;}

/* reply composer */
.reply-composer{display:flex;gap:8px;align-items:flex-end;padding:10px 12px;background:rgba(255,255,255,.6);border-top:1px solid rgba(26,26,26,.07);}
.reply-composer-inner{flex:1;min-width:0;}
.img-preview-mini{position:relative;display:inline-block;margin-bottom:6px;}
.img-preview-mini-img{max-height:80px;border-radius:8px;display:block;object-fit:cover;border:1px solid var(--cream4);}
.img-preview-mini-x{position:absolute;top:4px;right:4px;background:rgba(26,26,26,.6);border:none;color:#fff;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;}
.reply-composer-row{display:flex;align-items:center;gap:6px;}
.reply-input{flex:1;border:1.5px solid var(--cream4);border-radius:var(--r-pill);padding:9px 15px;font-size:13px;font-family:var(--font);color:var(--text);background:#fff;outline:none;transition:all .2s var(--ease);}
.reply-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(184,160,130,.12);}
.reply-input::placeholder{color:var(--text3);}
.reply-icon-btn{background:none;border:1.5px solid var(--cream4);color:var(--text2);width:36px;height:36px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);}
.reply-icon-btn:hover{border-color:var(--gold);color:var(--graphite);background:var(--gold-dim);}
.reply-send-btn{background:var(--graphite);border:none;color:#F7F3EB;width:36px;height:36px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease-b);box-shadow:0 3px 14px rgba(26,26,26,.25);}
.reply-send-btn:hover:not(:disabled){background:var(--gold);color:var(--mine-fg);transform:scale(1.1);}
.reply-send-btn:disabled{opacity:.35;cursor:not-allowed;}

/* chips */
.chip-staff{font-size:9px;font-weight:700;color:var(--gold);background:var(--gold-dim);border:1px solid rgba(184,160,130,.28);padding:2px 8px;border-radius:var(--r-pill);}
.chip-admin{color:#B8A082;background:rgba(184,160,130,.1);border-color:rgba(184,160,130,.32);}

/* avatar */
.av{border-radius:50%;flex-shrink:0;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 2px 8px rgba(26,26,26,.15),0 0 0 2px rgba(255,255,255,.8);transition:transform .2s var(--ease-b);}
.av:hover{transform:scale(1.07);}
.av-img{width:100%;height:100%;border-radius:inherit;object-fit:cover;display:block;}
.av-badge{position:absolute;bottom:-1px;right:-1px;width:14px;height:14px;border-radius:50%;background:var(--gold);border:2px solid #fff;font-size:6px;font-weight:900;color:var(--graphite);display:flex;align-items:center;justify-content:center;}

/* reactions */
.rxbar{position:relative;display:flex;flex-direction:column;gap:4px;}
.rx-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
.rx-btn{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.7);border:1px solid rgba(26,26,26,.1);color:var(--text2);font-size:11px;font-weight:600;font-family:var(--font);padding:5px 12px;border-radius:var(--r-pill);cursor:pointer;transition:all .2s var(--ease);backdrop-filter:blur(8px);}
.rx-btn:hover{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);transform:scale(1.04);}
.rx-on{background:var(--gold-dim);border-color:var(--gold-border);color:var(--graphite2);}
.rx-compact{padding:4px 9px;}
.rx-btn-emoji{font-size:14px;line-height:1;}
.rx-counts{display:flex;gap:4px;flex-wrap:wrap;}
.rx-pill{display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:var(--text2);background:rgba(255,255,255,.7);border:1px solid rgba(26,26,26,.09);padding:3px 9px;border-radius:var(--r-pill);transition:all .2s var(--ease);backdrop-filter:blur(8px);}
.rx-pill:hover{background:var(--gold-dim);border-color:var(--gold-border);transform:translateY(-1px);}
.rx-picker{position:absolute;bottom:calc(100% + 8px);inset-inline-start:0;background:rgba(255,255,255,.95);backdrop-filter:blur(20px);border:1px solid rgba(26,26,26,.1);border-radius:var(--r);padding:8px 10px;display:flex;gap:2px;box-shadow:var(--sh-lift);z-index:200;animation:popIn .28s var(--ease-b) backwards;}
.rx-picker-end{inset-inline-start:auto;inset-inline-end:0;}
.rx-pick-btn{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:8px 10px;border-radius:10px;transition:all .18s var(--ease);font-family:var(--font);animation:popIn .28s var(--ease-b) backwards;}
.rx-pick-btn:hover,.rx-pick-btn.on{background:var(--gold-dim);}
.rx-em{font-size:22px;line-height:1;display:block;transition:transform .2s var(--ease-b);}
.rx-pick-btn:hover .rx-em{transform:scale(1.4) translateY(-4px);}
.rx-lbl{font-size:9px;color:var(--text3);font-weight:600;white-space:nowrap;}

/* composer */
.hub-composer-wrap{padding:12px 16px 16px;flex-shrink:0;background:rgba(247,243,235,.92);backdrop-filter:blur(20px);border-top:1px solid rgba(26,26,26,.08);position:relative;z-index:50;}
.composer{max-width:860px;margin:0 auto;background:#fff;border:1.5px solid var(--cream4);border-radius:28px;padding:8px 8px 8px 14px;box-shadow:var(--sh-med);transition:border-color .25s var(--ease),box-shadow .25s var(--ease);}
.composer-focused{border-color:var(--gold);box-shadow:var(--sh-med),0 0 0 3px rgba(184,160,130,.12);}
.composer-img-preview{padding:8px 8px 0;position:relative;display:inline-block;margin-bottom:4px;}
.composer-img-preview-img{max-height:120px;border-radius:12px;display:block;object-fit:cover;border:1px solid var(--cream4);}
.composer-img-x{position:absolute;top:12px;right:12px;background:rgba(26,26,26,.6);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;}
.composer-row{display:flex;align-items:center;gap:10px;}
.composer-field-wrap{flex:1;min-width:0;}
.composer-ta{width:100%;border:none;outline:none;resize:none;overflow:hidden;font-family:var(--font);font-size:15px;color:var(--text);background:transparent;line-height:1.7;min-height:26px;max-height:160px;}
.composer-ta::placeholder{color:var(--text3);}
.composer-btns{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.composer-img-btn{background:none;border:none;cursor:pointer;color:var(--text3);width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);}
.composer-img-btn:hover{background:var(--gold-dim);color:var(--graphite);}
.composer-send-btn{background:var(--graphite);border:none;color:#F7F3EB;width:42px;height:42px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .22s var(--ease-b);box-shadow:0 3px 16px rgba(26,26,26,.25);}
.composer-send-btn:hover:not(:disabled){background:var(--gold);color:var(--mine-fg);transform:scale(1.08);}
.composer-send-btn:active:not(:disabled){transform:scale(.93);}
.composer-send-btn:disabled{opacity:.3;cursor:not-allowed;}

/* spinner */
.mini-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(26,26,26,.1);border-top-color:currentColor;animation:spin .7s linear infinite;display:inline-block;flex-shrink:0;}
.s-light{border-color:rgba(239,234,224,.2);border-top-color:#F7F3EB;}

/* load more */
.load-more-wrap{display:flex;justify-content:center;margin-bottom:8px;}
.load-more-btn{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.7);border:1px solid rgba(26,26,26,.1);backdrop-filter:blur(8px);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font);padding:8px 18px;border-radius:var(--r-pill);cursor:pointer;transition:all .2s var(--ease);}
.load-more-btn:hover:not(:disabled){background:#fff;border-color:var(--gold);color:var(--graphite2);}
.load-more-btn:disabled{opacity:.4;cursor:not-allowed;}

/* empty */
.hub-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;gap:14px;animation:fadeUp .5s var(--ease);}
.hub-empty-icon{color:rgba(184,160,130,.38);}
.hub-empty-title{font-size:20px;font-weight:800;color:var(--text);}
.hub-empty-sub{font-size:14px;color:var(--text2);max-width:240px;text-align:center;line-height:1.7;}

/* no school */
.hub-no-school{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:0;gap:16px;text-align:center;padding:24px;}
.no-school-icon{color:rgba(184,160,130,.42);margin-bottom:4px;}
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

/* community UX refresh */
.hub{background:
  radial-gradient(circle at 18% 0%,rgba(184,160,130,.18),transparent 28%),
  linear-gradient(180deg,#F7F3EB 0%,#E5E0D5 100%);
}
.hub-header{background:rgba(26,26,26,.96);backdrop-filter:blur(18px);box-shadow:0 14px 38px rgba(26,26,26,.24);}
.hub-header-inner{max-width:980px;padding:14px 22px;}
.hub-brand-icon{border-radius:16px;background:linear-gradient(145deg,rgba(184,160,130,.22),rgba(184,160,130,.08));}
.hub-title{font-size:18px;letter-spacing:0;}
.hub-subtitle{max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(239,234,224,.78);}
.mode-bar{justify-content:center;background:rgba(255,251,245,.72);backdrop-filter:blur(16px);color:#6B1E2D;border-bottom:1px solid rgba(107,30,45,.22);}
.hub-feed{max-width:980px;padding:22px 22px 16px;}
@media(min-width:900px){
  .hub-feed::before{content:"";position:sticky;display:block;top:0;height:0;z-index:-1;}
  .hub-feed{background:rgba(255,251,245,.42);border-inline:1px solid rgba(107,30,45,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.7);}
}
.chat-row{margin-bottom:12px;gap:12px;}
.chat-col{max-width:min(72%,680px);}
.chat-bubble{padding:11px 14px;border-radius:20px;box-shadow:0 8px 22px rgba(107,30,45,.08);}
.chat-bubble-mine{background:linear-gradient(145deg,#6B1E2D,#B8A082);box-shadow:0 10px 24px rgba(107,30,45,.22);}
.chat-bubble-theirs{background:rgba(255,255,255,.94);border-color:rgba(107,30,45,.06);}
.chat-text{font-size:15.5px;line-height:1.78;}
.chat-actions{opacity:.78;transition:opacity .18s ease;}
.chat-row:hover .chat-actions{opacity:1;}
.reply-toggle-btn,.rx-btn,.rx-pill{min-height:30px;border-color:rgba(107,30,45,.08);background:rgba(255,255,255,.72);}
.replies-container{width:min(540px,100%);background:rgba(255,255,255,.46);backdrop-filter:blur(14px);border-color:rgba(107,30,45,.18);}
.replies-scroll{max-height:360px;}
.hub-composer-wrap{padding:12px 18px max(14px,env(safe-area-inset-bottom));background:rgba(247,243,235,.82);backdrop-filter:blur(24px);border-top:1px solid rgba(107,30,45,.20);}
.composer{max-width:980px;border-radius:24px;border-color:rgba(107,30,45,.24);box-shadow:0 14px 36px rgba(107,30,45,.13);padding:9px 10px 9px 16px;}
.composer-focused{box-shadow:0 18px 44px rgba(107,30,45,.16),0 0 0 4px rgba(184,160,130,.12);}
.composer-send-btn,.reply-send-btn{min-width:42px;min-height:42px;}
@media(max-width:640px){
  .hub{height:100svh;}
  .hub-header-inner{padding:11px 12px;}
  .hub-title{font-size:15px;}
  .hub-feed{padding:14px 8px 8px;}
  .chat-row{gap:7px;margin-bottom:10px;}
  .chat-av-wrap .av,.msg-row .av{transform:scale(.92);}
  .chat-col{max-width:86%;}
  .chat-bubble{padding:10px 12px;border-radius:18px;}
  .chat-text{font-size:15px;line-height:1.68;}
  .chat-actions{opacity:1;}
  .rx-picker{position:fixed;left:10px;right:10px;bottom:82px;inset-inline-start:10px;inset-inline-end:10px;justify-content:space-around;}
  .rx-picker-end{inset-inline-start:10px;inset-inline-end:10px;}
  .rx-pick-btn{padding:8px 6px;}
  .hub-composer-wrap{padding:8px 8px max(10px,env(safe-area-inset-bottom));}
  .composer{border-radius:22px;padding:7px 7px 7px 12px;}
  .composer-img-btn{width:40px;height:40px;}
  .composer-send-btn{width:44px;height:44px;}
}

/* community UX polish v2 */
.hub{background:
  radial-gradient(circle at 12% 8%,rgba(184,160,130,.18),transparent 30%),
  radial-gradient(circle at 88% 10%,rgba(107,30,45,.16),transparent 28%),
  linear-gradient(180deg,#F7F3EB 0%,#E5E0D5 46%,#E5E0D5 100%);
}
.hub-bg-pattern{opacity:.34;background-size:26px 26px;}
.hub-header{background:linear-gradient(135deg,rgba(26,26,26,.98),rgba(107,30,45,.96));border-bottom:1px solid rgba(184,160,130,.22);box-shadow:0 18px 46px rgba(26,26,26,.28);}
.hub-header-stripe{height:3px;background:linear-gradient(90deg,transparent 0%,#B8A082 16%,#D9C9B0 48%,#B8A082 82%,transparent 100%);}
.hub-header-inner{max-width:1040px;padding:15px clamp(14px,3vw,30px);}
.hub-brand{min-width:0;gap:13px;}
.hub-brand-icon{width:50px;height:50px;border-radius:19px;background:linear-gradient(145deg,rgba(217,201,176,.28),rgba(184,160,130,.08));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 12px 28px rgba(26,26,26,.24);}
.hub-title{font-size:clamp(17px,2vw,22px);line-height:1.2;}
.hub-subtitle{font-size:12px;color:rgba(239,234,224,.72);}
.hub-feed{max-width:1040px;padding:26px clamp(10px,3vw,28px) 18px;}
@media(min-width:940px){
  .hub-feed{width:calc(100% - 32px);margin-top:14px;border-radius:30px 30px 0 0;background:linear-gradient(180deg,rgba(255,251,245,.58),rgba(255,251,245,.30));border:1px solid rgba(107,30,45,.16);border-bottom:0;box-shadow:0 -10px 34px rgba(107,30,45,.08),inset 0 1px 0 rgba(255,255,255,.74);}
}
.date-divider-label{background:rgba(255,255,255,.78);border:1px solid rgba(107,30,45,.18);box-shadow:0 8px 24px rgba(107,30,45,.08);backdrop-filter:blur(14px);}
.chat-row{margin-bottom:15px;gap:13px;}
.chat-av-wrap{padding-top:4px;}
.chat-col{max-width:min(70%,700px);}
.chat-bubble{border-radius:24px;padding:13px 16px;box-shadow:0 12px 30px rgba(107,30,45,.10);transition:transform .18s ease,box-shadow .18s ease;}
.chat-bubble:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(107,30,45,.13);}
.chat-bubble-mine{background:linear-gradient(135deg,#D9C9B0 0%,#B8A082 100%);border:1px solid rgba(107,30,45,.12);box-shadow:0 14px 30px rgba(107,30,45,.22);}
.chat-bubble-theirs{background:rgba(255,255,255,.90);border:1px solid rgba(107,30,45,.08);backdrop-filter:blur(16px);}
.chat-bubble-staff{background:linear-gradient(145deg,rgba(255,255,255,.95),rgba(247,243,235,.92));}
.chat-author-name{font-size:12.5px;letter-spacing:.01em;}
.chat-text{font-size:15.75px;line-height:1.8;}
.chat-time{font-size:10.5px;}
.replies-container{border-radius:19px;background:rgba(255,255,255,.64);box-shadow:0 12px 28px rgba(107,30,45,.08);}
.hub-composer-wrap{padding:14px clamp(10px,3vw,20px) max(16px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(247,243,235,.55),rgba(247,243,235,.92));border-top:1px solid rgba(107,30,45,.22);}
.composer{max-width:1040px;border-radius:30px;border:1px solid rgba(107,30,45,.30);background:rgba(255,255,255,.94)!important;box-shadow:0 18px 42px rgba(107,30,45,.15);}
.composer-ta{line-height:1.65;}
.composer-send-btn{background:linear-gradient(135deg,#32101A,#6B1E2D);box-shadow:0 10px 22px rgba(107,30,45,.22);}
@media(max-width:640px){
  .hub-header-inner{padding:10px 12px;}
  .hub-brand{gap:10px;}
  .hub-brand-icon{width:42px;height:42px;border-radius:16px;}
  .hub-title{font-size:16px;}
  .hub-subtitle{max-width:230px;font-size:11px;}
  .hub-feed{padding:12px 7px 8px;}
  .chat-row{gap:8px;margin-bottom:12px;}
  .chat-col{max-width:88%;}
  .chat-bubble{border-radius:20px;padding:11px 13px;}
  .chat-text{font-size:15.25px;line-height:1.72;}
  .hub-composer-wrap{padding:8px 8px max(10px,env(safe-area-inset-bottom));}
  .composer{border-radius:25px;padding:7px 7px 7px 12px;}
}
`;

const premiumCss = `
/* Shared premium community system — final layer */
.tl-content--hub,.sl-content--hub,.sa-content--hub{
  min-height:0!important;
  height:calc(100dvh - 72px);
  overflow:hidden;
}
.tl-content--hub .tl-content-inner,.sl-content--hub .sl-content-inner,.sa-content--hub .sa-content-inner{
  height:100%;min-height:0;
}
.hub{
  height:100%;min-height:0;
  background:
    linear-gradient(rgba(247,243,235,.94),rgba(239,234,224,.97)),
    radial-gradient(circle at 12% 8%,rgba(184,160,130,.24),transparent 34%);
  isolation:isolate;
}
.hub-bg-pattern{opacity:.55;background-image:
  linear-gradient(115deg,transparent 0 46%,rgba(184,160,130,.055) 46% 47%,transparent 47% 100%),
  radial-gradient(circle at 86% 18%,rgba(107,30,45,.12),transparent 30%);
}
.hub-bg-pattern::before{width:420px;height:420px;filter:blur(110px);opacity:.24;animation:none;}
.hub-bg-pattern::after{width:360px;height:360px;filter:blur(120px);opacity:.12;animation:none;}
.hub-header{
  background:linear-gradient(115deg,#6B1E2D 0%,#4A0E1C 56%,#6B1E2D 100%);
  box-shadow:0 14px 40px rgba(107,30,45,.22);
}
.hub-header::after{content:"";position:absolute;inset:0;pointer-events:none;background:
  radial-gradient(circle at 15% 30%,rgba(217,201,176,.13),transparent 27%),
  linear-gradient(90deg,transparent,rgba(255,255,255,.035),transparent);}
.hub-header-inner{width:100%;max-width:1120px;min-height:76px;padding:13px clamp(14px,3vw,30px);position:relative;z-index:1;}
.hub-brand-icon{width:48px;height:48px;border-radius:17px;border-color:rgba(217,201,176,.42);background:linear-gradient(145deg,rgba(217,201,176,.24),rgba(184,160,130,.08));box-shadow:inset 0 1px rgba(255,255,255,.18),0 12px 26px rgba(26,26,26,.22);}
.hub-title{font-size:clamp(18px,2vw,23px);font-weight:900;color:#FFFBF5;}
.hub-subtitle{font-size:11.5px;color:rgba(239,234,224,.76);max-width:min(54vw,520px);}
.mode-bar{min-height:38px;justify-content:center;padding:8px 16px;background:rgba(255,251,245,.86);color:#6B1E2D;border-color:rgba(107,30,45,.14);box-shadow:0 7px 22px rgba(107,30,45,.055);font-size:11.5px;line-height:1.55;text-align:center;}
.mode-bar-admin{background:linear-gradient(90deg,rgba(217,201,176,.88),rgba(255,251,245,.94),rgba(217,201,176,.88));}
.hub-feed{width:min(calc(100% - 28px),1080px);max-width:1080px;min-height:0;margin:14px auto 0;padding:20px clamp(10px,2.6vw,28px) 18px;border:1px solid rgba(107,30,45,.13);border-bottom:0;border-radius:28px 28px 0 0;background:linear-gradient(180deg,rgba(255,251,245,.74),rgba(255,255,255,.38));box-shadow:0 -8px 34px rgba(107,30,45,.07),inset 0 1px rgba(255,255,255,.9);overscroll-behavior:contain;scrollbar-gutter:stable;}
.date-divider{margin:14px 0 16px;}
.date-divider-label{padding:5px 14px;color:#6B1E2D;background:rgba(255,251,245,.88);border-color:rgba(107,30,45,.15);box-shadow:0 6px 18px rgba(107,30,45,.06);}
.chat-row{gap:11px;margin-bottom:15px;min-width:0;}
.chat-col{max-width:min(76%,720px);min-width:0;}
.chat-author{max-width:100%;min-width:0;}
.chat-author-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.chat-bubble{max-width:100%;padding:12px 15px;border-radius:21px;box-shadow:0 10px 26px rgba(107,30,45,.09);}
.chat-bubble.has-delete{padding-inline-end:48px;}
.chat-bubble-mine{background:linear-gradient(145deg,#D9C9B0 0%,#B8A082 100%);color:#32101A;border:1px solid rgba(107,30,45,.12);box-shadow:0 12px 28px rgba(107,30,45,.17);}
.chat-bubble-theirs{background:rgba(255,255,255,.94);color:#32101A;border-color:rgba(107,30,45,.085);}
.chat-bubble-staff{background:linear-gradient(145deg,#FFFFFF,#F7F3EB);}
.chat-text{font-size:15.5px;line-height:1.8;overflow-wrap:anywhere;white-space:pre-wrap;}
.bubble-del{top:9px;inset-inline-end:9px;width:30px;height:30px;opacity:.62;background:rgba(107,30,45,.075);z-index:2;}
.chat-img-wrap{display:block;width:100%;max-width:520px;padding:0;border:0;background:transparent;text-align:inherit;}
.chat-img{max-height:340px;}
.chat-actions{max-width:100%;gap:6px;opacity:1;}
.reply-toggle-btn,.rx-btn,.rx-pill{min-height:32px;background:rgba(255,255,255,.82);border-color:rgba(107,30,45,.12);color:#6B1E2D;}
.reply-toggle-btn:focus-visible,.rx-btn:focus-visible,.rx-pick-btn:focus-visible,.composer button:focus-visible,.reply-composer button:focus-visible,.state-card button:focus-visible{outline:3px solid rgba(184,160,130,.42);outline-offset:2px;}
.rx-btn:disabled,.rx-pick-btn:disabled{opacity:.56;cursor:wait;}
.rx-picker{z-index:320;max-width:min(420px,calc(100vw - 28px));padding:7px;border-color:rgba(107,30,45,.16);background:rgba(255,251,245,.98);box-shadow:0 20px 54px rgba(107,30,45,.2);}
.rx-pick-btn{min-width:56px;padding:8px 7px;}
.replies-container{width:min(600px,100%);max-width:100%;border-color:rgba(107,30,45,.14);background:rgba(255,251,245,.72);box-shadow:0 12px 28px rgba(107,30,45,.07);}
.replies-scroll{max-height:min(42vh,390px);padding:13px;overscroll-behavior:contain;}
.msg-row,.msg-col{min-width:0;}
.msg-col{max-width:84%;}
.bubble-text{overflow-wrap:anywhere;white-space:pre-wrap;}
.reply-composer{padding:11px 12px;background:rgba(255,255,255,.76);align-items:flex-end;}
.reply-composer-inner{display:grid;gap:5px;}
.reply-composer-row{min-width:0;}
.reply-input{width:100%;min-width:0;min-height:40px;max-height:112px;resize:vertical;padding:9px 14px;line-height:1.55;overflow:auto;}
.reply-icon-btn,.reply-send-btn{width:40px;height:40px;min-width:40px;min-height:40px;}
.composer-error{color:#6B1E2D;background:rgba(107,30,45,.075);border:1px solid rgba(107,30,45,.16);border-radius:9px;padding:6px 9px;font-size:10.5px;font-weight:700;line-height:1.55;}
.composer-error-main{margin:4px 8px 8px;}
.hub-composer-wrap{padding:11px clamp(10px,2.5vw,20px) max(13px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(247,243,235,.62),rgba(247,243,235,.96));border-color:rgba(107,30,45,.16);}
.hub-composer-wrap>div{max-width:1080px;margin:0 auto;}
.composer{max-width:none;border-radius:25px;padding:8px 9px 8px 14px;border-color:rgba(107,30,45,.22);box-shadow:0 14px 38px rgba(107,30,45,.12);}
.composer-row{min-width:0;}
.composer-field-wrap{min-width:0;}
.composer-ta{font-size:15.5px;overflow-y:auto;}
.composer-img-btn{border:1px solid transparent;}
.composer-send-btn{width:44px;height:44px;min-width:44px;background:linear-gradient(135deg,#32101A,#6B1E2D);}
.hub-empty{min-height:55%;padding:60px 24px;}
.hub-empty-icon{width:82px;height:82px;border-radius:28px;display:grid;place-items:center;color:#6B1E2D;background:linear-gradient(145deg,rgba(217,201,176,.48),rgba(255,255,255,.72));border:1px solid rgba(107,30,45,.12);box-shadow:0 18px 44px rgba(107,30,45,.09);}
.hub-empty-title{color:#32101A;}
.hub-empty-sub{color:#796A62;max-width:360px;}
.hub-state,.hub-no-school{height:100%;min-height:0;background:linear-gradient(145deg,#F7F3EB,#E5E0D5);}
.state-card{width:min(420px,calc(100% - 32px));margin:auto;padding:34px 26px;text-align:center;border-radius:26px;background:rgba(255,251,245,.92);border:1px solid rgba(107,30,45,.14);box-shadow:0 24px 64px rgba(107,30,45,.13);}
.state-icon{width:54px;height:54px;margin:0 auto 14px;border-radius:18px;display:grid;place-items:center;color:#FFFBF5;background:linear-gradient(135deg,#32101A,#6B1E2D);font-size:24px;font-weight:900;}
.state-card h2{font-size:18px;color:#32101A;line-height:1.65;}
.state-card button{margin-top:18px;border:0;border-radius:13px;padding:11px 22px;background:#6B1E2D;color:#fff;font:800 13px var(--font);cursor:pointer;}
@media(max-width:767px){
  .tl-content--hub{height:calc(100dvh - var(--tl-topbar-h) - env(safe-area-inset-top,0px));}
  .sl-content--hub,.sa-content--hub{height:calc(100dvh - 72px);}
  .hub-header-inner{min-height:64px;padding:9px 11px;}
  .hub-brand{gap:9px;min-width:0;}
  .hub-brand-icon{width:41px;height:41px;border-radius:14px;}
  .hub-title{font-size:16px;}
  .hub-subtitle{max-width:66vw;font-size:10.5px;}
  .mode-bar{min-height:34px;padding:6px 10px;font-size:10px;}
  .hub-feed{width:100%;margin:0;border:0;border-radius:0;padding:12px 8px 8px;background:linear-gradient(180deg,rgba(255,251,245,.58),rgba(255,255,255,.28));box-shadow:none;scrollbar-gutter:auto;}
  .date-divider{margin:11px 0 13px;}
  .chat-row{gap:7px;margin-bottom:12px;}
  .chat-av-wrap{width:34px;}
  .chat-av-wrap .hpa-trigger .av{width:34px!important;height:34px!important;min-width:34px!important;font-size:12px!important;}
  .chat-col{max-width:calc(100% - 42px);}
  .chat-bubble{padding:10px 12px;border-radius:18px;}
  .chat-bubble.has-delete{padding-inline-end:43px;}
  .chat-text{font-size:14.5px;line-height:1.72;}
  .chat-actions{padding-inline:1px;gap:4px;}
  .reply-toggle-btn,.rx-btn{min-height:32px;padding:5px 9px;font-size:10.5px;}
  .rx-counts{gap:3px;}
  .rx-pill{min-height:28px;padding:3px 7px;}
  .rx-picker,.rx-picker-end{position:absolute;left:auto;right:auto;bottom:calc(100% + 8px);inset-inline-start:0;inset-inline-end:auto;display:grid;grid-template-columns:repeat(5,minmax(48px,1fr));width:min(330px,calc(100vw - 24px));justify-content:stretch;}
  .rx-picker-end{inset-inline-start:auto;inset-inline-end:0;}
  .rx-pick-btn{min-width:0;padding:7px 3px;}
  .rx-em{font-size:20px;}.rx-lbl{font-size:8px;max-width:54px;overflow:hidden;text-overflow:ellipsis;}
  .replies-container{width:calc(100vw - 58px);max-width:calc(100vw - 58px);}
  .replies-scroll{max-height:34vh;padding:10px 8px;}
  .reply-composer{padding:9px 8px;gap:6px;}
  .reply-composer>.av{display:none;}
  .reply-input{font-size:16px;min-height:42px;padding:9px 12px;}
  .reply-icon-btn,.reply-send-btn{width:42px;height:42px;min-width:42px;}
  .hub-composer-wrap{padding:7px 7px max(10px,env(safe-area-inset-bottom));position:relative;z-index:80;}
  .composer{padding:6px 6px 6px 10px;border-radius:22px;}
  .composer-row{gap:6px;}
  .composer-row>.av{width:34px!important;height:34px!important;min-width:34px!important;font-size:12px!important;}
  .composer-ta{font-size:16px;line-height:1.55;}
  .composer-btns{gap:3px;}
  .composer-img-btn{width:40px;height:40px;}
  .composer-send-btn{width:43px;height:43px;min-width:43px;}
}
@media(max-width:390px){
  .hub-subtitle{max-width:58vw;}
  .chat-av-wrap{display:none;}
  .chat-col{max-width:94%;}
  .chat-theirs .chat-col{margin-inline-end:auto;}.chat-mine .chat-col{margin-inline-start:auto;}
  .replies-container{width:calc(100vw - 30px);max-width:calc(100vw - 30px);}
  .composer-row>.av{display:none;}
  .composer{padding-inline-start:11px;}
  .composer-img-btn{width:37px;height:40px;}
  .composer-send-btn{width:41px;height:41px;min-width:41px;}
}
@media(prefers-reduced-motion:reduce){
  .hub *,.hub *::before,.hub *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important;}
}
`;
