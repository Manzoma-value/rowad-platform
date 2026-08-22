"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageCircle,
  Radio,
  Trash2,
  Users,
} from "lucide-react";
import { useLang, type Lang } from "@/lib/language-context";

type NotificationItem = {
  id: string;
  type: string;
  title_ar: string;
  title_sq: string;
  title_en: string;
  body_ar: string | null;
  body_sq: string | null;
  body_en: string | null;
  href: string;
  read_at: string | null;
  created_at: string;
  actor: { full_name: string; avatar_url: string | null } | null;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unread_count: number;
};

const words = {
  ar: {
    title: "الإشعارات",
    subtitle: "آخر ما يحدث في منصتك",
    markAll: "تحديد الكل كمقروء",
    markRead: "تحديد كمقروء",
    delete: "حذف الإشعار",
    deleteAll: "حذف الكل",
    deleteAllConfirm: "هل تريد حذف جميع الإشعارات نهائياً؟",
    empty: "لا توجد إشعارات بعد",
    emptyBody: "ستظهر هنا التحديثات الجديدة في المجتمع والورش والمنصة.",
    latest: "أحدث الإشعارات",
    hide: "إخفاء",
    show: "إظهار",
    newBadge: (n: number) => `${n} جديد${n === 1 ? "" : ""}`,
  },
  sq: {
    title: "Njoftimet",
    subtitle: "Çfarë ka të re në platformë",
    markAll: "Shënoji të gjitha si të lexuara",
    markRead: "Shëno si të lexuar",
    delete: "Fshi njoftimin",
    deleteAll: "Fshiji të gjitha",
    deleteAllConfirm: "Të fshihen përgjithmonë të gjitha njoftimet?",
    empty: "Ende nuk ka njoftime",
    emptyBody: "Përditësimet nga komuniteti, trajnimet dhe platforma do të shfaqen këtu.",
    latest: "Njoftimet më të reja",
    hide: "Fshih",
    show: "Shfaq",
    newBadge: (n: number) => `${n} të reja`,
  },
  en: {
    title: "Notifications",
    subtitle: "What’s new across your platform",
    markAll: "Mark all as read",
    markRead: "Mark as read",
    delete: "Delete notification",
    deleteAll: "Delete all",
    deleteAllConfirm: "Permanently delete all notifications?",
    empty: "No notifications yet",
    emptyBody: "New community, workshop, and platform updates will appear here.",
    latest: "Latest notifications",
    hide: "Hide",
    show: "Show",
    newBadge: (n: number) => `${n} new`,
  },
} as const;

function localized(item: NotificationItem, lang: Lang) {
  return {
    title: lang === "ar" ? item.title_ar : lang === "sq" ? item.title_sq : item.title_en,
    body: lang === "ar" ? item.body_ar : lang === "sq" ? item.body_sq : item.body_en,
  };
}

function resolveHref(href: string, basePath: string) {
  if (href === "/hub" || href.startsWith("/hub?")) return `${basePath}${href}`;
  if (href === "/workshops" || href.startsWith("/workshops/")) return `${basePath}${href}`;
  return href;
}

function iconFor(type: string) {
  if (type.startsWith("COMMUNITY")) return <MessageCircle size={17} />;
  if (type === "WORKSHOP_LIVE") return <Radio size={17} />;
  if (type === "WORKSHOP_ANSWER") return <CheckCheck size={17} />;
  if (type === "WORKSHOP_VIDEO" || type === "WORKSHOP_MATERIAL") return <FileText size={17} />;
  if (type.startsWith("WORKSHOP")) return <BookOpen size={17} />;
  return <Users size={17} />;
}

function relativeTime(value: string, lang: Lang) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  const formatter = new Intl.RelativeTimeFormat(lang === "ar" ? "ar" : lang === "sq" ? "sq" : "en", { numeric: "auto" });
  if (seconds < 60) return formatter.format(-seconds, "second");
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  return formatter.format(-Math.floor(seconds / 86400), "day");
}

function NotificationList({
  items,
  basePath,
  lang,
  onRead,
  onDelete,
  compact = false,
}: {
  items: NotificationItem[];
  basePath: string;
  lang: Lang;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const copy = words[lang];
  if (!items.length) {
    return (
      <div className="nc-empty">
        <Bell size={24} />
        <strong>{copy.empty}</strong>
        <span>{copy.emptyBody}</span>
      </div>
    );
  }
  return (
    <div className={`nc-list${compact ? " compact" : ""}`}>
      {items.map((item) => {
        const text = localized(item, lang);
        return (
          <article className={`nc-item${item.read_at ? "" : " unread"}`} key={item.id}>
            <Link
              href={resolveHref(item.href, basePath)}
              className="nc-item-link"
              onClick={() => onRead(item.id)}
            >
              <span className="nc-icon">{iconFor(item.type)}</span>
              <span className="nc-copy">
                <strong>{text.title}</strong>
                {text.body && <span>{text.body}</span>}
                <time>{relativeTime(item.created_at, lang)}</time>
              </span>
              {!item.read_at && <i aria-label="Unread" />}
            </Link>
            <span className="nc-actions">
              {!item.read_at && (
                <button type="button" onClick={() => onRead(item.id)} title={copy.markRead} aria-label={copy.markRead}>
                  <Check size={14} />
                </button>
              )}
              <button type="button" className="danger" onClick={() => onDelete(item.id)} title={copy.delete} aria-label={copy.delete}>
                <Trash2 size={14} />
              </button>
            </span>
          </article>
        );
      })}
    </div>
  );
}

export function NotificationCenter({
  basePath,
  buttonClassName,
}: {
  basePath: "/teacher" | "/school-admin" | "/student";
  buttonClassName?: string;
}) {
  const { lang } = useLang();
  const copy = words[lang];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationResponse>({ notifications: [], unread_count: 0 });

  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications?limit=15", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    setData(await response.json());
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 15_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function markRead(id: string) {
    setData((current) => ({
      unread_count: Math.max(0, current.unread_count - (current.notifications.find((item) => item.id === id)?.read_at ? 0 : 1)),
      notifications: current.notifications.map((item) => item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item),
    }));
    setOpen(false);
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
      keepalive: true,
    }).then((response) => { if (!response.ok) void refresh(); }).catch(() => void refresh());
  }

  function markAll() {
    setData((current) => ({
      unread_count: 0,
      notifications: current.notifications.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
    }));
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).then((response) => { if (!response.ok) void refresh(); }).catch(() => void refresh());
  }

  function deleteOne(id: string) {
    setData((current) => {
      const removed = current.notifications.find((item) => item.id === id);
      return {
        unread_count: Math.max(0, current.unread_count - (removed && !removed.read_at ? 1 : 0)),
        notifications: current.notifications.filter((item) => item.id !== id),
      };
    });
    void fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).then((response) => { if (!response.ok) void refresh(); }).catch(() => void refresh());
  }

  function deleteAll() {
    if (!window.confirm(copy.deleteAllConfirm)) return;
    setData({ notifications: [], unread_count: 0 });
    void fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).then((response) => { if (!response.ok) void refresh(); }).catch(() => void refresh());
  }

  return (
    <div className="nc-wrap" ref={wrapRef}>
      <button
        type="button"
        className={buttonClassName ?? "nc-bell"}
        aria-label={copy.title}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          void refresh();
        }}
      >
        <Bell size={16} strokeWidth={1.8} />
        {data.unread_count > 0 && <b className="nc-count">{Math.min(data.unread_count, 99)}</b>}
      </button>
      {open && (
        <div className="nc-panel" role="dialog" aria-label={copy.title}>
          <header>
            <div><strong>{copy.title}</strong><span>{copy.subtitle}</span></div>
            <span className="nc-head-actions">
              {data.unread_count > 0 && <button onClick={markAll}><CheckCheck size={14} />{copy.markAll}</button>}
              {data.notifications.length > 0 && <button className="danger" onClick={deleteAll}><Trash2 size={14} />{copy.deleteAll}</button>}
            </span>
          </header>
          <NotificationList items={data.notifications} basePath={basePath} lang={lang} onRead={markRead} onDelete={deleteOne} />
        </div>
      )}
      <style>{sharedStyles}</style>
    </div>
  );
}

export function NotificationFeed({
  basePath,
}: {
  basePath: "/teacher" | "/school-admin" | "/student";
}) {
  const { lang } = useLang();
  const copy = words[lang];
  const storageKey = `rowad:notification-feed:${basePath}`;
  // Manual collapse/expand preference — only consulted when there is
  // nothing unread. Unread notifications always force the card open,
  // no matter what was chosen last time.
  const [manuallyHidden, setManuallyHidden] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications?limit=8", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json() as NotificationResponse;
    setItems(data.notifications ?? []);
    setUnreadCount(data.unread_count ?? 0);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      setManuallyHidden(localStorage.getItem(storageKey) === "hidden");
      void refresh();
    }, 0);
    const timer = window.setInterval(() => void refresh(), 15_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, storageKey]);

  const hasUnread = unreadCount > 0;
  const visible = hasUnread || !manuallyHidden;

  function toggle() {
    setManuallyHidden((current) => {
      const next = !current;
      localStorage.setItem(storageKey, next ? "hidden" : "visible");
      return next;
    });
  }

  function markRead(id: string) {
    const wasUnread = items.some((item) => item.id === id && !item.read_at);
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, read_at: item.read_at ?? new Date().toISOString() }
      : item));
    if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1));
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
      keepalive: true,
    }).then((response) => { if (!response.ok) void refresh(); }).catch(() => void refresh());
  }

  function deleteOne(id: string) {
    const wasUnread = items.some((item) => item.id === id && !item.read_at);
    setItems((current) => current.filter((item) => item.id !== id));
    if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1));
    void fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).then((response) => { if (!response.ok) void refresh(); }).catch(() => void refresh());
  }

  return (
    <section className={`nf-card ${hasUnread ? "nf-unread" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      <header>
        <div>
          <span><Bell size={17} /></span>
          <strong>{copy.latest}</strong>
          {hasUnread && <em className="nf-badge">{copy.newBadge(unreadCount)}</em>}
        </div>
        {/* Toggle is only meaningful once there's nothing unread forcing it open. */}
        {!hasUnread && (
          <button onClick={toggle}>{visible ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{visible ? copy.hide : copy.show}</button>
        )}
      </header>
      {visible && <NotificationList compact items={items} basePath={basePath} lang={lang} onRead={markRead} onDelete={deleteOne} />}
      <style>{sharedStyles + feedStyles}</style>
    </section>
  );
}

const sharedStyles = `
.nc-wrap{position:relative;display:inline-flex}.nc-bell{position:relative;width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(217,201,176,.32);border-radius:50%;background:rgba(255,251,245,.08);color:#F7F3EB;cursor:pointer}.nc-count{position:absolute;inset-block-start:-5px;inset-inline-start:-5px;min-width:18px;height:18px;display:grid;place-items:center;border:2px solid #4A0E1C;border-radius:999px;background:#D9C9B0;padding:0 4px;color:#4A0E1C;font:900 8px 'Cairo',sans-serif}.nc-panel{position:absolute;z-index:4000;inset-block-start:calc(100% + 10px);inset-inline-end:0;width:min(420px,calc(100vw - 24px));overflow:hidden;border:1px solid rgba(217,201,176,.55);border-radius:16px;background:#FFFBF5;box-shadow:0 22px 58px rgba(26,26,26,.28);color:#32101A}.nc-panel>header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;background:linear-gradient(120deg,#32101A,#6B1E2D);color:#fff}.nc-panel>header>div{display:flex;flex-direction:column}.nc-panel>header strong{font-size:13px}.nc-panel>header span{color:#D9C9B0;font-size:8.5px}.nc-head-actions{display:flex!important;flex-direction:row!important;align-items:center;justify-content:flex-end;gap:5px}.nc-panel>header button{display:flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.08);padding:6px 8px;color:#fff;font:800 8.5px 'Cairo',sans-serif;cursor:pointer}.nc-panel>header button.danger{color:#D9C9B0;border-color:rgba(217,201,176,.26)}.nc-list{display:flex;max-height:min(480px,calc(100dvh - 160px));flex-direction:column;gap:6px;overflow-y:auto;padding:8px}.nc-item{position:relative;display:flex;align-items:center;gap:6px;border:1px solid #E5E0D5;border-radius:11px;background:#fff;padding:5px;color:#32101A;transition:.15s}.nc-item:hover{border-color:#B8A082;background:#F7F3EB;transform:translateY(-1px)}.nc-item.unread{border-inline-start:3px solid #6B1E2D;background:linear-gradient(120deg,rgba(107,30,45,.045),#fff)}.nc-item-link{display:grid;grid-template-columns:38px minmax(0,1fr) 7px;flex:1;gap:9px;align-items:start;min-width:0;padding:5px;color:inherit;text-decoration:none}.nc-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:#EFEAE0;color:#6B1E2D}.nc-copy{min-width:0;display:flex;flex-direction:column}.nc-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px}.nc-copy>span{display:-webkit-box;overflow:hidden;margin-top:2px;color:#655B53;font-size:9.5px;line-height:1.55;-webkit-line-clamp:2;-webkit-box-orient:vertical}.nc-copy time{margin-top:4px;color:#8C8274;font-size:8px}.nc-item-link>i{width:7px;height:7px;margin-top:5px;border-radius:50%;background:#6B1E2D}.nc-actions{display:flex;flex-direction:column;gap:4px;flex:0 0 auto}.nc-actions button{width:28px;height:28px;display:grid;place-items:center;border:1px solid #D9C9B0;border-radius:8px;background:#FFFBF5;color:#6B1E2D;cursor:pointer}.nc-actions button:hover{background:#EFEAE0;border-color:#B8A082}.nc-actions button.danger:hover{background:#EFEAE0;border-color:#B8A082;color:#6B1E2D}.nc-empty{min-height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:24px;text-align:center;color:#8C8274}.nc-empty svg{color:#6B1E2D}.nc-empty strong{color:#32101A;font-size:11px}.nc-empty span{max-width:260px;font-size:9.5px;line-height:1.7}@media(max-width:460px){.nc-panel>header{align-items:flex-start}.nc-head-actions{flex-direction:column!important;align-items:stretch}.nc-panel>header button{justify-content:center;padding:5px 7px}.nc-actions{flex-direction:row}}
`;

const feedStyles = `
.nf-card{margin-bottom:24px;overflow:hidden;border:1px solid #E5E0D5;border-radius:18px;background:#FFFBF5;box-shadow:0 10px 32px rgba(107,30,45,.055);font-family:'Cairo',sans-serif}.nf-card>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #E5E0D5;background:linear-gradient(120deg,#FFFBF5,#EFEAE0)}.nf-card>header>div{display:flex;align-items:center;gap:9px;color:#32101A}.nf-card>header>div>span{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#6B1E2D;color:#fff}.nf-card>header strong{font-size:13px}.nf-card>header button{display:flex;align-items:center;gap:5px;border:1px solid #D9C9B0;border-radius:9px;background:#fff;padding:7px 10px;color:#6B1E2D;font:800 9px 'Cairo',sans-serif;cursor:pointer}.nf-card .nc-list.compact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-height:none;padding:12px}.nf-card .nc-empty{min-height:130px}@media(max-width:680px){.nf-card .nc-list.compact{grid-template-columns:1fr}}
.nf-card.nf-unread{border-color:#6B1E2D;box-shadow:0 14px 40px rgba(107,30,45,.16),0 0 0 1px rgba(107,30,45,.08)}
.nf-card.nf-unread>header{background:linear-gradient(120deg,#32101A,#6B1E2D)}
.nf-card.nf-unread>header>div{color:#FFFBF5}
.nf-card.nf-unread>header>div>span{background:#D9C9B0;color:#4A0E1C;animation:nf-ring 1.8s ease-in-out infinite}
.nf-badge{border-radius:999px;background:#D9C9B0;padding:4px 10px;color:#4A0E1C;font:900 10px 'Cairo',sans-serif;animation:nf-pulse 1.8s ease-in-out infinite}
@keyframes nf-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.85;transform:scale(1.05)}}
@keyframes nf-ring{0%,100%{transform:rotate(0)}10%{transform:rotate(-12deg)}20%{transform:rotate(10deg)}30%{transform:rotate(-8deg)}40%{transform:rotate(0)}}
`;
