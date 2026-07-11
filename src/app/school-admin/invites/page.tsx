"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import IdentityStar from "@/components/IdentityStar";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Invite {
  id: string;
  token: string;
  type: string;
  is_active: boolean;
  use_count: number;
  max_uses: number | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  creator: { full_name: string } | null;
  usedBy: { full_name: string } | null;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function getOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function inviteUrl(token: string) {
  return `${getOrigin()}/invite/${token}`;
}

function daysLeft(expires_at: string | null): string {
  if (!expires_at) return "لا تنتهي";
  const diff = new Date(expires_at).getTime() - Date.now();
  if (diff < 0) return "منتهية";
  const d = Math.ceil(diff / 86400000);
  if (d === 1) return "تنتهي غداً";
  return `${d} أيام متبقية`;
}

function getStatus(invite: Invite): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (!invite.is_active && invite.used_at)
    return {
      label: "مُستخدمة",
      color: "#1B5E20",
      bg: "rgba(45,138,74,0.08)",
      border: "rgba(45,138,74,0.2)",
    };
  if (!invite.is_active)
    return {
      label: "معطّلة",
      color: "#6B1E2D",
      bg: "rgba(107,30,45,0.07)",
      border: "rgba(107,30,45,0.2)",
    };
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return {
      label: "منتهية",
      color: "#796A62",
      bg: "rgba(138,123,96,0.08)",
      border: "rgba(138,123,96,0.2)",
    };
  return {
    label: "نشطة",
    color: "#B8A082",
    bg: "rgba(184,160,130,0.08)",
    border: "rgba(184,160,130,0.25)",
  };
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────

function CopyBtn({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className={`inv-copy-btn ${copied ? "copied" : ""}`} onClick={copy}>
      {copied ? (
        <>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          تم النسخ
        </>
      ) : (
        <>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          نسخ الرابط
        </>
      )}
    </button>
  );
}

// ─── INVITE CARD ─────────────────────────────────────────────────────────────

function InviteCard({
  invite,
  onDisable,
}: {
  invite: Invite;
  onDisable: (id: string) => void;
}) {
  const status = getStatus(invite);
  const isLive =
    invite.is_active &&
    (!invite.expires_at || new Date(invite.expires_at) > new Date());
  const [disabling, setDisabling] = useState(false);

  const handleDisable = async () => {
    setDisabling(true);
    await fetch(`/api/school-admin/invites/${invite.id}`, { method: "PATCH" });
    onDisable(invite.id);
    setDisabling(false);
  };

  return (
    <div className={`inv-card ${!isLive ? "inactive" : ""}`}>
      {/* Status pill + days left */}
      <div className="inv-card-top">
        <span
          className="inv-status"
          style={{
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.border}`,
          }}
        >
          <span
            className="inv-status-dot"
            style={{ background: status.color }}
          />
          {status.label}
        </span>
        {invite.is_active && invite.expires_at && (
          <span className="inv-days">{daysLeft(invite.expires_at)}</span>
        )}
        {invite.usedBy && (
          <span className="inv-used-by">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {invite.usedBy.full_name}
          </span>
        )}
      </div>

      {/* Token link */}
      <div className="inv-link-row">
        <div className="inv-link-box">
          <span className="inv-link-prefix">{getOrigin()}/invite/</span>
          <span className="inv-link-token">{invite.token.slice(0, 16)}...</span>
        </div>
        {isLive && <CopyBtn token={invite.token} />}
      </div>

      {/* Meta */}
      <div className="inv-meta-row">
        <span className="inv-meta">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {new Date(invite.created_at).toLocaleDateString("ar-SA-u-nu-latn", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        {invite.expires_at && (
          <span className="inv-meta">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            تنتهي{" "}
            {new Date(invite.expires_at).toLocaleDateString("ar-SA-u-nu-latn", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        <span className="inv-meta">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {invite.use_count}/{invite.max_uses ?? "∞"} استخدام
        </span>
      </div>

      {/* Actions */}
      {isLive && (
        <div className="inv-actions" data-write-area="true">
          <button
            data-write="true"
            className="inv-disable-btn"
            onClick={handleDisable}
            disabled={disabling}
          >
            {disabling ? (
              <div className="inv-mini-spin" />
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            )}
            تعطيل الدعوة
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newInvite, setNewInvite] = useState<Invite | null>(null);

  useEffect(() => {
    fetch("/api/school-admin/invites")
      .then((r) => r.json())
      .then((d) => {
        setInvites(d.invites ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const createInvite = async () => {
    setCreating(true);
    const res = await fetch("/api/school-admin/invites", { method: "POST" });
    const d = await res.json();
    if (d.invite) {
      setInvites((prev) => [d.invite, ...prev]);
      setNewInvite(d.invite);
      setTimeout(() => setNewInvite(null), 8000);
    }
    setCreating(false);
  };

  const handleDisable = (id: string) => {
    setInvites((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, is_active: false } : inv)),
    );
  };

  const activeInvites = invites.filter(
    (i) =>
      i.is_active && (!i.expires_at || new Date(i.expires_at) > new Date()),
  );
  const inactiveInvites = invites.filter(
    (i) =>
      !i.is_active || (i.expires_at && new Date(i.expires_at) <= new Date()),
  );

  return (
    <div className="inv-page" dir="rtl">
      {/* Header */}
      <div className="inv-header">
        <div>
          <p className="inv-eyebrow">
            <IdentityStar size={11} strokeWidth={5} />
            إدارة الوصول
          </p>
          <h1 className="inv-title">دعوات المعلمين</h1>
        </div>
        <button
          data-write="true"
          className="inv-create-btn"
          onClick={createInvite}
          disabled={creating}
        >
          {creating ? (
            <>
              <div className="inv-mini-spin white" />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              إنشاء دعوة جديدة
            </>
          )}
        </button>
      </div>

      <div className="inv-rule">
        <div className="inv-rule-line" />
        <div className="inv-rule-diamond" />
        <div className="inv-rule-line" />
      </div>

      {/* How it works */}
      <div className="inv-how-it-works">
        <div className="inv-how-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <p>
          أنشئ رابط دعوة وشاركه مع المعلم عبر واتساب أو البريد الإلكتروني.
          الرابط صالح لمدة <strong>14 يوماً</strong> ويُستخدم مرة واحدة فقط. بعد
          قبول الدعوة، يمكن للمعلم تسجيل الدخول بشكل طبيعي.
        </p>
      </div>

      {/* New invite flash */}
      {newInvite && (
        <div className="inv-new-flash">
          <div className="inv-new-flash-top">
            <div className="inv-new-flash-icon">✦</div>
            <span className="inv-new-flash-title">تم إنشاء رابط الدعوة!</span>
            <span className="inv-new-flash-sub">
              انسخ الرابط وشاركه مع المعلم الآن
            </span>
          </div>
          <div className="inv-new-flash-link">
            <span className="inv-new-flash-url">
              {inviteUrl(newInvite.token)}
            </span>
            <CopyBtn token={newInvite.token} />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="inv-loading">
          <div className="inv-spinner" />
          <span>جارٍ التحميل...</span>
        </div>
      ) : invites.length === 0 ? (
        <div className="inv-empty">
          <div className="inv-empty-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M18 8h1a4 4 0 010 8h-1" />
              <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <h3>لا توجد دعوات بعد</h3>
          <p>أنشئ دعوة أولى لإضافة معلم إلى مدرستك</p>
          <button
            data-write="true"
            className="inv-create-btn"
            onClick={createInvite}
            disabled={creating}
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
              <path d="M12 5v14M5 12h14" />
            </svg>
            إنشاء أول دعوة
          </button>
        </div>
      ) : (
        <>
          {/* Active invites */}
          {activeInvites.length > 0 && (
            <div className="inv-section">
              <div className="inv-section-hd">
                <h2 className="inv-section-title">الدعوات النشطة</h2>
                <span className="inv-section-count">
                  {activeInvites.length}
                </span>
                <div className="inv-section-rule" />
              </div>
              <div className="inv-grid">
                {activeInvites.map((inv) => (
                  <InviteCard
                    key={inv.id}
                    invite={inv}
                    onDisable={handleDisable}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive invites */}
          {inactiveInvites.length > 0 && (
            <div className="inv-section">
              <div className="inv-section-hd">
                <h2 className="inv-section-title">السجل</h2>
                <span className="inv-section-count muted">
                  {inactiveInvites.length}
                </span>
                <div className="inv-section-rule" />
              </div>
              <div className="inv-grid">
                {inactiveInvites.map((inv) => (
                  <InviteCard
                    key={inv.id}
                    invite={inv}
                    onDisable={handleDisable}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@500;700&family=Cairo:wght@400;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes flash-in{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}

:root{
  --gold:#B8A082;--gold2:#B8A082;--gold-l:rgba(184,160,130,0.08);--gold-b:rgba(184,160,130,0.18);
  --black:#1A1A1A;--text:#1E1C18;--text2:#3A3020;--text3:#8A7860;
  --surface:#FFFFFF;--border:#E5E0D5;--bg:#F7F3EB;
  --red:#6B1E2D;--red-l:rgba(107,30,45,0.07);
  --font:'Cairo',sans-serif;
  --font-head:'Noto Kufi Arabic','Cairo',sans-serif;
}

.inv-page{display:flex;flex-direction:column;gap:20px;font-family:var(--font);color:var(--text);animation:fadeUp 0.35s ease}

/* Header */
.inv-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.inv-eyebrow{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--gold);margin-bottom:6px}
.inv-title{font-family:var(--font-head);font-size:24px;font-weight:700;color:var(--black)}

/* Rule */
.inv-rule{display:flex;align-items:center;gap:10px}
.inv-rule-line{flex:1;height:1px;background:var(--border)}
.inv-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.5;flex-shrink:0}

/* Create button */
.inv-create-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,#5B1526,#32101A);color:#D9C9B0;border:1px solid rgba(184,160,130,0.35);padding:11px 22px;border-radius:12px;font-size:13.5px;font-weight:700;font-family:var(--font);cursor:pointer;transition:all 0.18s;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(217,201,176,0.12)}
.inv-create-btn:hover:not(:disabled){background:linear-gradient(180deg,#6B1E2D,#4A0E1C);box-shadow:0 6px 20px rgba(184,160,130,0.28)}
.inv-create-btn:disabled{opacity:0.55;cursor:not-allowed}

/* How it works */
.inv-how-it-works{display:flex;align-items:flex-start;gap:12px;background:var(--gold-l);border:1px solid var(--gold-b);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--text2);line-height:1.7}
.inv-how-icon{width:30px;height:30px;border-radius:8px;background:var(--gold-b);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;margin-top:1px}
.inv-how-it-works strong{color:var(--black);font-weight:800}

/* New invite flash */
.inv-new-flash{background:radial-gradient(circle at 85% -30%,rgba(184,160,130,0.20),transparent 45%),linear-gradient(140deg,#32101A,#4A0E1C);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;animation:flash-in 0.3s ease;border:1px solid rgba(184,160,130,0.35);box-shadow:inset 0 1px 0 rgba(217,201,176,0.12)}
.inv-new-flash-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.inv-new-flash-icon{color:var(--gold);font-size:16px}
.inv-new-flash-title{font-size:14px;font-weight:800;color:var(--gold)}
.inv-new-flash-sub{font-size:12px;color:rgba(184,160,130,0.45);margin-inline-start:auto}
.inv-new-flash-link{display:flex;align-items:center;gap:10px;background:rgba(184,160,130,0.06);border:1px solid rgba(184,160,130,0.15);border-radius:9px;padding:10px 14px;flex-wrap:wrap}
.inv-new-flash-url{flex:1;font-size:12px;color:rgba(184,160,130,0.6);font-family:monospace;word-break:break-all;min-width:0}

/* Loading */
.inv-loading{display:flex;align-items:center;justify-content:center;gap:12px;height:180px;color:var(--text3);font-size:14px}
.inv-spinner{width:26px;height:26px;border:3px solid var(--gold-b);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
.inv-mini-spin{width:13px;height:13px;border:2px solid rgba(184,160,130,0.3);border-top-color:var(--gold);border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block;flex-shrink:0}
.inv-mini-spin.white{border-color:rgba(0,0,0,0.2);border-top-color:var(--black)}

/* Empty */
.inv-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:64px 24px;background:var(--surface);border:1px solid var(--border);border-radius:14px;text-align:center}
.inv-empty-icon{width:56px;height:56px;border-radius:14px;background:var(--gold-l);border:1px solid var(--gold-b);display:flex;align-items:center;justify-content:center;color:var(--gold);margin-bottom:4px}
.inv-empty h3{font-size:16px;font-weight:800;color:var(--black)}
.inv-empty p{font-size:13px;color:var(--text3);margin-bottom:8px}

/* Section */
.inv-section{display:flex;flex-direction:column;gap:12px}
.inv-section-hd{display:flex;align-items:center;gap:10px}
.inv-section-title{font-family:var(--font-head);font-size:12px;font-weight:700;color:var(--text);letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap}
.inv-section-count{font-size:11px;font-weight:800;color:var(--gold);background:var(--gold-l);border:1px solid var(--gold-b);padding:1px 8px;border-radius:99px}
.inv-section-count.muted{color:var(--text3);background:transparent;border-color:var(--border)}
.inv-section-rule{flex:1;height:1px;background:var(--border)}

/* Grid */
.inv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}

/* Card */
.inv-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:12px;transition:border-color 0.15s,box-shadow 0.15s;animation:fadeUp 0.3s ease both}
.inv-card:hover{border-color:var(--gold-b);box-shadow:0 3px 16px rgba(184,160,130,0.08)}
.inv-card.inactive{opacity:0.65}
.inv-card-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.inv-status{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px}
.inv-status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.inv-days{font-size:11px;color:var(--text3);font-weight:600;margin-inline-start:auto}
.inv-used-by{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3);font-weight:600}

/* Link row */
.inv-link-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.inv-link-box{flex:1;min-width:0;background:#F7F3EB;border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:12px;font-family:monospace;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:var(--text3)}
.inv-link-prefix{color:var(--text3)}
.inv-link-token{color:var(--black);font-weight:700}

/* Copy button */
.inv-copy-btn{display:flex;align-items:center;gap:6px;background:var(--gold-l);border:1px solid var(--gold-b);color:var(--text2);font-size:12px;font-weight:700;padding:7px 13px;border-radius:8px;cursor:pointer;font-family:var(--font);transition:all 0.15s;white-space:nowrap;flex-shrink:0}
.inv-copy-btn:hover{background:rgba(184,160,130,0.15);border-color:var(--gold)}
.inv-copy-btn.copied{background:rgba(45,138,74,0.08);border-color:rgba(45,138,74,0.25);color:#1B5E20}

/* Meta row */
.inv-meta-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.inv-meta{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3);font-weight:500}

/* Actions */
.inv-actions{padding-top:4px;border-top:1px solid var(--border)}
.inv-disable-btn{display:flex;align-items:center;gap:7px;background:none;border:1px solid var(--border);color:var(--text3);font-size:12px;font-weight:600;padding:7px 14px;border-radius:8px;cursor:pointer;font-family:var(--font);transition:all 0.15s}
.inv-disable-btn:hover:not(:disabled){border-color:rgba(107,30,45,0.3);color:var(--red);background:var(--red-l)}
.inv-disable-btn:disabled{opacity:0.5;cursor:not-allowed}

@media(max-width:700px){
  .inv-grid{grid-template-columns:1fr; gap:10px}
  .inv-new-flash-sub{display:none}
  .inv-disable-btn{font-size:11.5px; padding:6px 12px}
}
@media(max-width:420px){
  .inv-actions{flex-wrap:wrap; gap:6px}
}
`;
