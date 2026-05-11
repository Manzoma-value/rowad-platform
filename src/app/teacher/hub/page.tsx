/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable react-hooks/refs */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cachedFetch } from "@/lib/api-cache";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ReactionType = "LIKE" | "LOVE" | "DISLIKE" | "HAHA" | "SAD";

interface Reaction {
  id: string;
  type: ReactionType;
  author_id: string;
}
interface Author {
  id: string;
  full_name: string;
  role: string;
}
interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  reply_to_id: string | null;
  author: Author;
  reactions: Reaction[];
  _count: { replies: number };
}
interface Me {
  id: string;
  name: string;
  role: string;
  school: { id: string; name: string; language: string } | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const RX: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "LIKE", emoji: "👍", label: "أعجبني" },
  { type: "LOVE", emoji: "❤️", label: "أحببته" },
  { type: "HAHA", emoji: "😂", label: "مضحك" },
  { type: "SAD", emoji: "😢", label: "حزين" },
  { type: "DISLIKE", emoji: "👎", label: "لم يعجبني" },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────

function ago(d: string) {
  const s = Math.floor((Date.now() - +new Date(d)) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} يوم`;
}
function initials(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}
function grouped(reactions: Reaction[]) {
  const m = new Map<ReactionType, number>();
  reactions.forEach((r) => m.set(r.type, (m.get(r.type) ?? 0) + 1));
  return RX.filter((r) => m.has(r.type)).map((r) => ({
    ...r,
    count: m.get(r.type)!,
  }));
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Av({
  name,
  role,
  size = 38,
}: {
  name: string;
  role: string;
  size?: number;
}) {
  const isStaff = role === "TEACHER" || role === "SCHOOL_ADMIN";
  return (
    <div
      className={`av ${isStaff ? "staff" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
      {isStaff && <span className="av-crown">★</span>}
    </div>
  );
}

// ─── IMAGE UPLOAD HOOK ────────────────────────────────────────────────────────

function useImgUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const pick = (f: File) => {
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };
  const clear = () => {
    setFile(null);
    setPreview(null);
  };
  return { file, preview, ref, pick, clear };
}

// ─── REACTION BAR ────────────────────────────────────────────────────────────

function RxBar({
  postId,
  reactions,
  myId,
  onReact,
}: {
  postId: string;
  reactions: Reaction[];
  myId: string;
  onReact: (pid: string, type: ReactionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mine = reactions.find((r) => r.author_id === myId);
  const grp = grouped(reactions);
  const mineRx = RX.find((r) => r.type === mine?.type);

  const open_ = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const close_ = () => {
    timer.current = setTimeout(() => setOpen(false), 280);
  };

  return (
    <div className="rxbar" onMouseLeave={close_}>
      {open && (
        <div className="rx-picker" onMouseEnter={open_}>
          {RX.map((r) => (
            <button
              key={r.type}
              className={`rx-pick-btn ${mine?.type === r.type ? "on" : ""}`}
              onClick={() => {
                onReact(postId, r.type);
                setOpen(false);
              }}
              title={r.label}
            >
              <span className="rx-em">{r.emoji}</span>
              <span className="rx-lbl">{r.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="rx-row">
        <button
          className={`rx-btn ${mine ? "on" : ""}`}
          onMouseEnter={open_}
          onClick={() =>
            mine ? onReact(postId, mine.type) : setOpen((v) => !v)
          }
        >
          <span>{mine ? mineRx?.emoji : "👍"}</span>
          <span>{mine ? mineRx?.label : "تفاعل"}</span>
        </button>
        {grp.length > 0 && (
          <div className="rx-counts">
            {grp.map((r) => (
              <span key={r.type} className="rx-pill">
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REPLY THREAD ─────────────────────────────────────────────────────────────

function Replies({
  postId,
  me,
  onReact,
}: {
  postId: string;
  me: Me;
  onReact: (pid: string, type: ReactionType) => void;
}) {
  const [replies, setReplies] = useState<Post[]>([]);
  const [busy, setBusy] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const img = useImgUpload();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/hub/posts/${postId}/replies`)
      .then((r) => r.json())
      .then((d) => {
        setReplies(d.replies ?? []);
        setBusy(false);
      });
  }, [postId]);

  const send = async () => {
    if (!text.trim() && !img.file) return;
    setSending(true);
    const form = new FormData();
    if (text.trim()) form.append("content", text.trim());
    if (img.file) form.append("file", img.file);
    const res = await fetch(`/api/hub/posts/${postId}/replies`, {
      method: "POST",
      body: form,
    });
    const d = await res.json();
    if (d.reply) {
      setReplies((p) => [...p, d.reply]);
      setText("");
      img.clear();
      setTimeout(
        () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    }
    setSending(false);
  };

  const del = async (id: string) => {
    await fetch(`/api/hub/posts/${id}`, { method: "DELETE" });
    setReplies((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="replies">
      {busy ? (
        <div className="replies-loading">
          <div className="mini-spin" />
        </div>
      ) : (
        replies.map((r) => (
          <div key={r.id} className="reply-row">
            <Av name={r.author.full_name} role={r.author.role} size={28} />
            <div className="reply-body">
              <div className="reply-head">
                <span className="reply-name">{r.author.full_name}</span>
                {(r.author.role === "TEACHER" ||
                  r.author.role === "SCHOOL_ADMIN") && (
                  <span className="tag-staff">معلم</span>
                )}
                <span className="reply-time">{ago(r.created_at)}</span>
                {/* Teacher can always delete */}
                <button className="del-btn" onClick={() => del(r.id)}>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
              {r.content && <p className="reply-text">{r.content}</p>}
              {r.image_url && (
                <img
                  src={r.image_url}
                  className="post-img sm"
                  alt=""
                  onClick={() => window.open(r.image_url!, "_blank")}
                />
              )}
              <RxBar
                postId={r.id}
                reactions={r.reactions}
                myId={me.id}
                onReact={onReact}
              />
            </div>
          </div>
        ))
      )}
      <div ref={endRef} />

      <div className="reply-compose">
        <Av name={me.name} role={me.role} size={26} />
        <div className="reply-compose-inner">
          {img.preview && (
            <div className="img-preview-wrap">
              <img src={img.preview} className="img-preview" alt="" />
              <button className="img-preview-x" onClick={img.clear}>
                ✕
              </button>
            </div>
          )}
          <div className="reply-compose-row">
            <input
              className="reply-input"
              placeholder="اكتب رداً..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              dir="auto"
            />
            <input
              ref={img.ref}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) =>
                e.target.files?.[0] && img.pick(e.target.files[0])
              }
            />
            <button
              className="compose-icon-btn"
              onClick={() => img.ref.current?.click()}
              title="إرفاق صورة"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button
              className="reply-send-btn"
              disabled={sending || (!text.trim() && !img.file)}
              onClick={send}
            >
              {sending ? (
                <div className="mini-spin" />
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
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

// ─── POST CARD ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  me,
  onDelete,
  onReact,
}: {
  post: Post;
  me: Me;
  onDelete: (id: string) => void;
  onReact: (pid: string, type: ReactionType) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const isOwn = post.author.id === me.id;
  const isStaff =
    post.author.role === "TEACHER" || post.author.role === "SCHOOL_ADMIN";

  const del = async () => {
    await fetch(`/api/hub/posts/${post.id}`, { method: "DELETE" });
    onDelete(post.id);
  };

  return (
    <article
      className={`post-card ${isOwn ? "own" : ""} ${isStaff ? "staff-post" : ""}`}
    >
      {isStaff && <div className="staff-stripe" />}

      <div className="post-head">
        <Av name={post.author.full_name} role={post.author.role} size={44} />
        <div className="post-meta">
          <div className="post-name-row">
            <span className="post-author">{post.author.full_name}</span>
            {isStaff && <span className="tag-staff">معلم</span>}
            {isOwn && <span className="tag-own">أنت</span>}
          </div>
          <span className="post-time">{ago(post.created_at)}</span>
        </div>
        {/* Teacher always sees delete */}
        <button
          className="del-btn post-del always-visible"
          onClick={del}
          title="حذف"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>

      {post.content && (
        <p className="post-text" dir="auto">
          {post.content}
        </p>
      )}

      {post.image_url && (
        <div
          className={`post-img-wrap ${imgOpen ? "expanded" : ""}`}
          onClick={() => setImgOpen((v) => !v)}
        >
          <img src={post.image_url} className="post-img" alt="" />
          <div className="post-img-overlay">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </div>
        </div>
      )}

      <div className="post-footer">
        <RxBar
          postId={post.id}
          reactions={post.reactions}
          myId={me.id}
          onReact={onReact}
        />
        <button
          className="reply-toggle-btn"
          onClick={() => setShowReplies((v) => !v)}
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
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span>
            {post._count.replies > 0 ? `${post._count.replies} رد` : "رد"}
          </span>
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <polyline
              points={showReplies ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}
            />
          </svg>
        </button>
      </div>

      {showReplies && <Replies postId={post.id} me={me} onReact={onReact} />}
    </article>
  );
}

// ─── COMPOSER ─────────────────────────────────────────────────────────────────

function Composer({ me, onPosted }: { me: Me; onPosted: (p: Post) => void }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const img = useImgUpload();
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
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
    if (d.post) {
      onPosted(d.post);
      setText("");
      img.clear();
      setFocused(false);
    }
    setSending(false);
  };

  return (
    <div className={`composer ${focused ? "open" : ""}`}>
      <div className="composer-top">
        <Av name={me.name} role={me.role} size={42} />
        <div
          className="composer-field"
          onClick={() => {
            setFocused(true);
            setTimeout(() => taRef.current?.focus(), 50);
          }}
        >
          <textarea
            ref={taRef}
            className="composer-ta"
            placeholder={
              focused
                ? "اكتب إعلاناً أو رسالة لطلابك..."
                : "شارك شيئاً مع المجتمع..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            rows={1}
            dir="auto"
          />
        </div>
      </div>

      {img.preview && (
        <div className="img-preview-wrap" style={{ margin: "12px 0 0 54px" }}>
          <img src={img.preview} className="img-preview" alt="" />
          <button className="img-preview-x" onClick={img.clear}>
            ✕
          </button>
        </div>
      )}

      {focused && (
        <div className="composer-foot">
          <div className="composer-tools">
            <input
              ref={img.ref}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) =>
                e.target.files?.[0] && img.pick(e.target.files[0])
              }
            />
            <button
              className="composer-tool-btn"
              onClick={() => img.ref.current?.click()}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>صورة</span>
            </button>
          </div>
          <div className="composer-actions">
            <button
              className="btn-cancel"
              onClick={() => {
                setFocused(false);
                setText("");
                img.clear();
              }}
            >
              إلغاء
            </button>
            <button
              className="btn-post"
              disabled={sending || (!text.trim() && !img.file)}
              onClick={submit}
            >
              {sending ? (
                <>
                  <div className="mini-spin white" />
                  جارٍ النشر...
                </>
              ) : (
                <>نشر ✦</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TeacherHubPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const supabase = createClient();
  const topRef = useRef<HTMLDivElement>(null);

  // Load teacher info
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      cachedFetch<{
        profile: { full_name: string };
        school: { id: string; name: string; language: string } | null;
      }>("/api/teacher", 300_000).then((d) => {
        setMe({
          id: user.id,
          name: d.profile?.full_name ?? "معلم",
          role: "TEACHER",
          school: d.school ?? null,
        });
      });
    });
  }, []);

  // Load posts
  useEffect(() => {
    if (!me?.school?.id) return;
    fetch(`/api/hub/posts?school_id=${me.school.id}&limit=30`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? []);
        setCursor(d.nextCursor ?? null);
        setLoading(false);
      });
  }, [me?.school?.id]);

  // Realtime
  useEffect(() => {
    if (!me?.school?.id) return;
    const ch = supabase
      .channel(`hub-teacher:${me.school.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `school_id=eq.${me.school.id}`,
        },
        (payload) => {
          const p = payload.new as Post;
          if (!p.reply_to_id && p.author?.id !== me.id) {
            setNewCount((c) => c + 1);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me?.school?.id, me?.id]);

  const refresh = useCallback(async () => {
    if (!me?.school?.id) return;
    const d = await fetch(
      `/api/hub/posts?school_id=${me.school.id}&limit=30`,
    ).then((r) => r.json());
    setPosts(d.posts ?? []);
    setCursor(d.nextCursor ?? null);
    setNewCount(0);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [me?.school?.id]);

  const loadMore = async () => {
    if (!cursor || !me?.school?.id) return;
    setLoadingMore(true);
    const d = await fetch(
      `/api/hub/posts?school_id=${me.school.id}&cursor=${cursor}&limit=30`,
    ).then((r) => r.json());
    setPosts((p) => [...p, ...(d.posts ?? [])]);
    setCursor(d.nextCursor ?? null);
    setLoadingMore(false);
  };

  const handlePosted = (p: Post) => setPosts((prev) => [p, ...prev]);
  const handleDelete = (id: string) =>
    setPosts((prev) => prev.filter((p) => p.id !== id));

  const handleReact = async (pid: string, type: ReactionType) => {
    if (!me) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== pid) return p;
        const ex = p.reactions.find((r) => r.author_id === me.id);
        let rxs = [...p.reactions];
        if (ex) {
          rxs =
            ex.type === type
              ? rxs.filter((r) => r.author_id !== me.id)
              : rxs.map((r) => (r.author_id === me.id ? { ...r, type } : r));
        } else {
          rxs.push({ id: "opt", type, author_id: me.id });
        }
        return { ...p, reactions: rxs };
      }),
    );
    await fetch(`/api/hub/posts/${pid}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  };

  const dir = me?.school?.language === "ar" ? "rtl" : "ltr";

  if (loading || !me)
    return (
      <div className="hub" dir="rtl">
        <div className="hub-skeleton-header" />
        <div className="hub-skeleton-composer" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="hub-skeleton-post"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
        <style>{css}</style>
      </div>
    );

  if (!me.school)
    return (
      <div className="hub" dir="rtl">
        <div className="hub-no-school">
          <div className="hub-no-school-icon">🏫</div>
          <h2>لم يتم تعيينك في مدرسة بعد</h2>
        </div>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="hub" dir={dir}>
      {/* ── HEADER ── */}
      <div className="hub-header" ref={topRef}>
        <div className="hub-header-brand">
          <div className="hub-brand-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div>
            <h1 className="hub-title">مجتمع المدرسة</h1>
            <p className="hub-subtitle">{me.school.name} · عرض المعلم</p>
          </div>
        </div>
      </div>

      {/* ── TEACHER MODE BANNER ── */}
      <div className="hub-teacher-mode-bar">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        وضع المشرف — يمكنك حذف أي منشور أو رد
      </div>

      {/* ── NEW POSTS BANNER ── */}
      {newCount > 0 && (
        <button className="hub-new-banner" onClick={refresh}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {newCount} منشور جديد — اضغط لتحديث الصفحة
        </button>
      )}

      {/* ── COMPOSER ── */}
      <div className="hub-composer-wrap">
        <Composer me={me} onPosted={handlePosted} />
      </div>

      {/* ── FEED ── */}
      <div className="hub-feed">
        {posts.length === 0 ? (
          <div className="hub-empty">
            <div className="hub-empty-glyph">✦</div>
            <h3>لا توجد منشورات بعد</h3>
            <p>كن أول من يبدأ المحادثة مع الطلاب</p>
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              me={me}
              onDelete={handleDelete}
              onReact={handleReact}
            />
          ))
        )}

        {cursor && (
          <button
            className="hub-load-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <div className="mini-spin" />
                تحميل...
              </>
            ) : (
              "عرض المزيد من المنشورات"
            )}
          </button>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes popIn{from{opacity:0;transform:scale(0.8) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(200,169,106,0)}50%{box-shadow:0 0 20px 4px rgba(200,169,106,0.18)}}

:root{
  --gold:#C8A96A; --gold2:#E5B93C; --gold-l:rgba(200,169,106,0.09); --gold-b:rgba(200,169,106,0.22);
  --red:#7A1E1E; --red-l:rgba(122,30,30,0.07); --red-b:rgba(122,30,30,0.2);
  --black:#1A1A1F; --ink:#1E1C18; --ink2:#3A3020; --ink3:#8A7860;
  --bg:#F5F3EE; --sf:#FFFFFF; --sf2:#FAFAF7; --bd:#EDE8DF;
  --radius:20px; --font:'Cairo',sans-serif;
}

.hub{min-height:100vh;background:var(--bg);font-family:var(--font);display:flex;flex-direction:column;padding-bottom:80px}

/* Skeletons */
.hub-skeleton-header,.hub-skeleton-composer,.hub-skeleton-post{
  background:linear-gradient(90deg,#ede8df 25%,#f5f3ee 50%,#ede8df 75%);
  background-size:400px 100%;animation:shimmer 1.4s ease-in-out infinite;border-radius:16px;margin:0 16px;
}
.hub-skeleton-header{height:72px;margin:0;border-radius:0;margin-bottom:12px}
.hub-skeleton-composer{height:80px;margin-bottom:12px}
.hub-skeleton-post{height:140px;margin-bottom:10px}

/* Header */
.hub-header{
  display:flex;align-items:center;justify-content:space-between;padding:16px 20px;
  background:var(--black);position:sticky;top:0;z-index:40;
  border-bottom:2px solid rgba(200,169,106,0.35);
}
.hub-header::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,106,0.5) 50%,transparent)}
.hub-header-brand{display:flex;align-items:center;gap:11px}
.hub-brand-icon{
  width:42px;height:42px;border-radius:13px;flex-shrink:0;
  background:linear-gradient(135deg,var(--red),#a83030);
  display:flex;align-items:center;justify-content:center;color:#fff;
  box-shadow:0 4px 12px rgba(122,30,30,0.4);
}
.hub-title{font-size:17px;font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1.1}
.hub-subtitle{font-size:11.5px;color:rgba(200,169,106,0.45);font-weight:600}
.hub-live-badge{
  display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;
  color:#4CAF50;background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.28);
  padding:5px 13px;border-radius:99px;
}
.hub-live-dot{width:7px;height:7px;border-radius:50%;background:#4CAF50;animation:pulse 2s ease-in-out infinite;flex-shrink:0}

/* Teacher mode bar */
.hub-teacher-mode-bar{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:9px 20px;font-size:12.5px;font-weight:700;
  background:var(--red-l);border-bottom:1px solid var(--red-b);color:var(--red);
}

/* New banner */
.hub-new-banner{
  width:100%;padding:12px 20px;border:none;cursor:pointer;
  background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold));
  background-size:200% 100%;
  color:var(--black);font-size:13px;font-weight:800;font-family:var(--font);
  display:flex;align-items:center;justify-content:center;gap:8px;
  animation:slideDown 0.3s ease;transition:filter 0.15s;
}
.hub-new-banner:hover{filter:brightness(1.06)}

/* Composer wrap */
.hub-composer-wrap{padding:14px 16px 4px}

/* Composer */
.composer{background:var(--sf);border:1.5px solid var(--bd);border-radius:var(--radius);padding:16px;transition:border-color 0.2s,box-shadow 0.2s;box-shadow:0 2px 10px rgba(26,26,31,0.05)}
.composer.open{border-color:var(--red-b);box-shadow:0 6px 28px rgba(122,30,30,0.1)}
.composer-top{display:flex;align-items:flex-start;gap:12px}
.composer-field{flex:1;cursor:text}
.composer-ta{width:100%;border:none;outline:none;resize:none;overflow:hidden;font-family:var(--font);font-size:15px;color:var(--ink);background:transparent;line-height:1.7;min-height:24px;max-height:200px}
.composer-ta::placeholder{color:var(--ink3)}
.composer-foot{display:flex;align-items:center;gap:10px;margin-top:13px;padding-top:13px;border-top:1px solid var(--bd)}
.composer-tools{display:flex;gap:6px;flex:1}
.composer-tool-btn{display:flex;align-items:center;gap:6px;background:var(--red-l);border:1.5px solid var(--red-b);color:var(--red);font-size:12.5px;font-weight:700;padding:7px 14px;border-radius:99px;cursor:pointer;font-family:var(--font);transition:all 0.15s}
.composer-tool-btn:hover{background:rgba(122,30,30,0.12)}
.composer-actions{display:flex;gap:8px}
.btn-cancel{background:none;border:1.5px solid var(--bd);color:var(--ink3);font-size:13px;font-weight:600;padding:8px 18px;border-radius:10px;cursor:pointer;font-family:var(--font);transition:all 0.15s}
.btn-cancel:hover{border-color:var(--ink3);color:var(--ink)}
.btn-post{display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,var(--red),#a83030);color:#fff;font-size:13.5px;font-weight:900;padding:9px 22px;border-radius:10px;border:none;cursor:pointer;font-family:var(--font);transition:all 0.18s;box-shadow:0 3px 12px rgba(122,30,30,0.3)}
.btn-post:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(122,30,30,0.4)}
.btn-post:disabled{opacity:0.45;cursor:not-allowed}

/* Image preview */
.img-preview-wrap{position:relative;display:inline-block}
.img-preview{max-height:180px;border-radius:12px;border:1px solid var(--bd);display:block}
.img-preview-x{position:absolute;top:6px;right:6px;background:rgba(26,26,31,0.72);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center}

/* Feed */
.hub-feed{padding:10px 16px;display:flex;flex-direction:column;gap:10px}
.hub-empty{text-align:center;padding:64px 24px;display:flex;flex-direction:column;align-items:center;gap:14px}
.hub-empty-glyph{font-size:48px;color:var(--gold);animation:pulse 3s ease-in-out infinite}
.hub-empty h3{font-size:21px;font-weight:900;color:var(--ink)}
.hub-empty p{font-size:14px;color:var(--ink3)}
.hub-no-school{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:12px;text-align:center}
.hub-no-school-icon{font-size:52px}
.hub-no-school h2{font-size:19px;font-weight:800;color:var(--ink)}

/* Post card */
.post-card{background:var(--sf);border:1px solid var(--bd);border-radius:var(--radius);padding:18px;transition:border-color 0.18s,box-shadow 0.18s,transform 0.18s;animation:fadeUp 0.38s ease both;box-shadow:0 1px 6px rgba(26,26,31,0.04);position:relative;overflow:hidden}
.post-card:hover{border-color:var(--gold-b);box-shadow:0 5px 22px rgba(200,169,106,0.1);transform:translateY(-1px)}
.post-card.own{background:linear-gradient(160deg,#FFFDFB,#FEF9F0);border-color:var(--gold-b)}
.staff-stripe{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--red),#a83030)}
.staff-post{border-color:var(--red-b)}
.post-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;position:relative}
.post-meta{flex:1;display:flex;flex-direction:column;gap:4px}
.post-name-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.post-author{font-size:14.5px;font-weight:800;color:var(--ink)}
.post-time{font-size:11.5px;color:var(--ink3);font-weight:500}
.post-del{align-self:flex-start}
.always-visible{opacity:1!important}
.tag-staff{font-size:10px;font-weight:800;color:var(--red);background:var(--red-l);border:1px solid var(--red-b);padding:1.5px 8px;border-radius:99px}
.tag-own{font-size:10px;font-weight:800;color:#7A6820;background:var(--gold-l);border:1px solid var(--gold-b);padding:1.5px 8px;border-radius:99px}
.post-text{font-size:15px;color:var(--ink);line-height:1.78;margin-bottom:12px;word-break:break-word}
.post-img-wrap{margin-bottom:12px;border-radius:14px;overflow:hidden;cursor:zoom-in;position:relative;max-height:420px;transition:max-height 0.4s ease}
.post-img-wrap.expanded{max-height:none;cursor:zoom-out}
.post-img{width:100%;display:block;object-fit:cover;max-height:420px;transition:transform 0.25s}
.post-img-wrap.expanded .post-img{max-height:none;object-fit:contain}
.post-img-wrap:hover .post-img{transform:scale(1.01)}
.post-img-overlay{position:absolute;bottom:10px;right:10px;background:rgba(26,26,31,0.55);border-radius:8px;padding:5px 7px;display:flex;align-items:center;justify-content:center;color:white;opacity:0;transition:opacity 0.2s}
.post-img-wrap:hover .post-img-overlay{opacity:1}
.post-img.sm{max-height:140px;border-radius:10px;margin-top:8px;cursor:pointer;object-fit:cover;width:auto}
.post-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px solid var(--bd);flex-wrap:wrap}

/* Del btn */
.del-btn{background:none;border:none;cursor:pointer;color:var(--ink3);padding:5px;border-radius:7px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0}
.del-btn:hover{background:var(--red-l);color:var(--red)}

/* Reply toggle */
.reply-toggle-btn{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--ink3);font-size:12.5px;font-weight:700;font-family:var(--font);padding:6px 10px;border-radius:9px;transition:all 0.15s;white-space:nowrap}
.reply-toggle-btn:hover{background:var(--gold-l);color:var(--ink2)}

/* Avatar */
.av{border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--black),#2A2835);color:var(--gold);font-weight:900;letter-spacing:-.5px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 2px 8px rgba(26,26,31,0.18)}
.av.staff{background:linear-gradient(135deg,var(--red),#5c1616)}
.av-crown{position:absolute;bottom:-2px;right:-2px;width:15px;height:15px;border-radius:50%;background:var(--red);border:2px solid var(--sf);font-size:7px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center}

/* Reactions */
.rxbar{position:relative;display:flex;flex-direction:column;gap:6px}
.rx-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rx-btn{display:flex;align-items:center;gap:5px;background:none;border:1.5px solid var(--bd);color:var(--ink3);font-size:12.5px;font-weight:700;padding:5px 13px;border-radius:99px;cursor:pointer;font-family:var(--font);transition:all 0.15s}
.rx-btn:hover{border-color:var(--gold-b);color:var(--ink2);background:var(--gold-l)}
.rx-btn.on{border-color:var(--gold);background:var(--gold-l);color:var(--ink2);animation:glow 2s ease-in-out}
.rx-counts{display:flex;gap:5px;flex-wrap:wrap}
.rx-pill{display:flex;align-items:center;gap:3px;font-size:12px;font-weight:700;color:var(--ink2);background:var(--sf2);border:1px solid var(--bd);padding:3px 9px;border-radius:99px}
.rx-picker{position:absolute;bottom:calc(100% + 10px);inset-inline-start:0;background:var(--sf);border:1px solid var(--bd);border-radius:18px;padding:8px 10px;display:flex;gap:2px;align-items:flex-start;box-shadow:0 10px 40px rgba(26,26,31,0.16),0 2px 8px rgba(26,26,31,0.08);z-index:60;animation:popIn 0.22s cubic-bezier(0.34,1.56,0.64,1);white-space:nowrap}
.rx-pick-btn{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:8px 10px;border-radius:12px;transition:all 0.15s;font-family:var(--font)}
.rx-pick-btn:hover,.rx-pick-btn.on{background:var(--gold-l)}
.rx-em{font-size:24px;line-height:1;display:block;transition:transform 0.18s}
.rx-pick-btn:hover .rx-em{transform:scale(1.25) translateY(-3px)}
.rx-lbl{font-size:9.5px;color:var(--ink3);font-weight:700;white-space:nowrap}

/* Replies */
.replies{margin-top:14px;padding-top:14px;border-top:1px solid var(--bd);display:flex;flex-direction:column;gap:10px;animation:fadeUp 0.25s ease}
.replies-loading{display:flex;align-items:center;justify-content:center;padding:18px}
.reply-row{display:flex;gap:10px;align-items:flex-start}
.reply-body{flex:1;min-width:0}
.reply-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px}
.reply-name{font-size:13px;font-weight:800;color:var(--ink)}
.reply-time{font-size:11px;color:var(--ink3);font-weight:500}
.reply-text{font-size:13.5px;color:var(--ink);line-height:1.65;word-break:break-word;margin-bottom:7px}

/* Reply composer */
.reply-compose{display:flex;gap:10px;align-items:flex-start;margin-top:6px}
.reply-compose-inner{flex:1;min-width:0}
.reply-compose-row{display:flex;align-items:center;gap:6px}
.reply-input{flex:1;border:1.5px solid var(--bd);border-radius:99px;padding:8px 16px;font-size:13.5px;font-family:var(--font);color:var(--ink);background:var(--sf2);outline:none;transition:border-color 0.15s,background 0.15s}
.reply-input:focus{border-color:var(--red-b);background:var(--sf)}
.reply-input::placeholder{color:var(--ink3)}
.compose-icon-btn{background:none;border:1.5px solid var(--bd);color:var(--ink3);width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
.compose-icon-btn:hover{border-color:var(--red-b);color:var(--red);background:var(--red-l)}
.reply-send-btn{background:linear-gradient(135deg,var(--red),#a83030);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.18s;box-shadow:0 2px 8px rgba(122,30,30,0.3)}
.reply-send-btn:hover:not(:disabled){transform:scale(1.1);box-shadow:0 4px 14px rgba(122,30,30,0.45)}
.reply-send-btn:disabled{opacity:0.4;cursor:not-allowed}

/* Mini spinner */
.mini-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(0,0,0,0.12);border-top-color:currentColor;animation:spin 0.6s linear infinite;display:inline-block;flex-shrink:0}
.mini-spin.white{border-color:rgba(255,255,255,0.25);border-top-color:#fff}

/* Load more */
.hub-load-more{width:100%;padding:14px;background:var(--sf);border:1.5px solid var(--bd);border-radius:14px;color:var(--ink2);font-size:13.5px;font-weight:700;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s}
.hub-load-more:hover:not(:disabled){border-color:var(--gold-b);background:var(--gold-l)}
.hub-load-more:disabled{opacity:0.55;cursor:not-allowed}

@media(max-width:600px){
  .hub-feed{padding:8px 12px}
  .hub-composer-wrap{padding:12px 12px 4px}
  .post-card{border-radius:16px;padding:14px}
  .rx-picker{padding:6px 8px}
  .rx-pick-btn{padding:6px 8px}
  .rx-em{font-size:21px}
  .del-btn{opacity:1}
}
`;
