/* eslint-disable react-hooks/set-state-in-effect */
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { cachedFetch } from "@/lib/api-cache";

interface Submission {
  id: string;
  submitted_at: string;
  review_status: "PENDING" | "REVIEWED";
  score: number | null;
  total: number | null;
  student: { profile: { full_name: string }; school: { name: string } | null };
  assessment: { title: string };
  assigned_school: { name: string } | null;
  reviewer: { full_name: string } | null;
}

/* ─── Mandala Loader (shared) ─────────────────────────────────────────────── */
function MandalaLoader({ label = "جارٍ تحميل الإجابات" }: { label?: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 360), 16);
    return () => clearInterval(t);
  }, []);

  const rings = [
    { r: 70, dashLen: 7, gapLen: 14, speed: 0.4, opacity: 0.18, strokeW: 0.5 },
    { r: 55, dashLen: 11, gapLen: 9, speed: -0.7, opacity: 0.28, strokeW: 0.8 },
    { r: 40, dashLen: 4, gapLen: 9, speed: 1.0, opacity: 0.2, strokeW: 0.4 },
    { r: 26, dashLen: 13, gapLen: 7, speed: -1.4, opacity: 0.33, strokeW: 0.9 },
    { r: 14, dashLen: 6, gapLen: 4, speed: 2.0, opacity: 0.25, strokeW: 0.6 },
  ];

  return (
    <div className="ml-wrap">
      <div className="ml-panel">
        <div className="ml-ornament">
          <div className="ml-orn-line" />
          <div className="ml-orn-diamond" />
          <div className="ml-orn-line" />
        </div>
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{ margin: "0 0 12px" }}
        >
          <circle
            cx="90"
            cy="90"
            r="82"
            stroke="rgba(184,160,130,0.05)"
            strokeWidth="1"
            fill="none"
          />
          {rings.map((ring, ri) => {
            const offset = (phase * ring.speed) % (2 * Math.PI * ring.r);
            return (
              <circle
                key={ri}
                cx="90"
                cy="90"
                r={ring.r}
                fill="none"
                stroke="#B8A082"
                strokeWidth={ring.strokeW}
                opacity={ring.opacity}
                strokeDasharray={`${ring.dashLen} ${ring.gapLen}`}
                strokeDashoffset={-offset}
              />
            );
          })}
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={90 + 40 * Math.sin(a)}
                cy={90 - 40 * Math.cos(a)}
                r={40}
                fill="none"
                stroke="#B8A082"
                strokeWidth="0.4"
                opacity="0.10"
              />
            );
          })}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = ((i * 30 + phase * 0.15) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={90 + 14 * Math.sin(a)}
                y1={90 - 14 * Math.cos(a)}
                x2={90 + 70 * Math.sin(a)}
                y2={90 - 70 * Math.cos(a)}
                stroke="#B8A082"
                strokeWidth="0.4"
                opacity={
                  0.06 +
                  0.1 *
                    Math.abs(Math.sin(((i * 30 + phase * 0.5) * Math.PI) / 180))
                }
              />
            );
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const a1 = ((i * 60 + phase * 0.3) * Math.PI) / 180;
            const a2 = ((i * 60 + 30 + phase * 0.3) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={90 + 26 * Math.sin(a1)}
                y1={90 - 26 * Math.cos(a1)}
                x2={90 + 14 * Math.sin(a2)}
                y2={90 - 14 * Math.cos(a2)}
                stroke="#B8A082"
                strokeWidth="0.7"
                opacity="0.28"
              />
            );
          })}
          <circle
            cx="90"
            cy="90"
            r="6"
            fill="none"
            stroke="#B8A082"
            strokeWidth="0.5"
            opacity="0.2"
          />
          <circle
            cx="90"
            cy="90"
            r="2.5"
            fill="#B8A082"
            opacity={0.35 + 0.25 * Math.sin(phase * 0.06)}
          />
        </svg>
        <div className="ml-label">{label}</div>
        <div className="ml-dots">
          {[0, 200, 400].map((d, i) => (
            <div
              key={i}
              className="ml-dot"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </div>
        <div className="ml-ornament" style={{ marginTop: 16 }}>
          <div className="ml-orn-line" />
          <div className="ml-orn-diamond" />
          <div className="ml-orn-line" />
        </div>
      </div>
      <style>{`
        @keyframes mlBlink { 0%,80%,100%{opacity:0.18;transform:scaleY(0.5)} 40%{opacity:1;transform:scaleY(1)} }
        @keyframes mlIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .ml-wrap { display:flex; align-items:center; justify-content:center; min-height:380px; }
        .ml-panel { display:flex;flex-direction:column;align-items:center;padding:28px 36px 24px;background:#fff;border:1px solid #E2D9CA;border-top:2px solid #B8A082;border-radius:12px;box-shadow:0 8px 32px rgba(11,11,12,0.08);animation:mlIn 0.4s ease; }
        .ml-ornament { display:flex;align-items:center;width:100%;margin-bottom:18px; }
        .ml-orn-line { flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,0.22),transparent); }
        .ml-orn-diamond { width:5px;height:5px;background:rgba(184,160,130,0.38);transform:rotate(45deg);margin:0 10px;flex-shrink:0; }
        .ml-label { font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;color:#8A7A5A;margin-bottom:10px; }
        .ml-dots { display:flex;gap:5px;align-items:center;height:16px; }
        .ml-dot { width:3px;height:14px;border-radius:2px;background:#B8A082;opacity:0.2;animation:mlBlink 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ─── Submissions Content ─────────────────────────────────────────────────── */
function SubmissionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get("status") ?? "";
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = statusFilter
      ? `/api/owner/submissions?status=${statusFilter}`
      : "/api/owner/submissions";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setSubmissions(d.submissions ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const setFilter = (f: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (f) params.set("status", f);
    else params.delete("status");
    router.push(`/owner/submissions?${params.toString()}`);
  };

  const pending = submissions.filter(
    (s) => s.review_status === "PENDING",
  ).length;
  const reviewed = submissions.filter(
    (s) => s.review_status === "REVIEWED",
  ).length;

  return (
    <div className="s-page" dir="rtl">
      {/* ── Header ── */}
      <div className="s-header">
        <div className="s-header-text">
          <div className="s-eyebrow">
            <div className="s-eyebrow-line" />
            <span>إدارة الطلبات</span>
            <div className="s-eyebrow-line" />
          </div>
          <h1 className="s-title">مراجعة إجابات الطلاب</h1>
          <p className="s-subtitle">
            مراجعة وتقييم الإجابات المُقدَّمة وتعيين المدارس
          </p>
        </div>
        {pending > 0 && (
          <div className="s-pending-badge">
            <div className="s-pending-dot" />
            {pending.toLocaleString("en")} في الانتظار
          </div>
        )}
      </div>

      {/* ── Summary Bar ── */}
      <div className="s-summary">
        {[
          {
            num: submissions.length,
            lab: "إجمالي الإجابات",
            cls: "",
            icon: "📊",
          },
          { num: pending, lab: "في انتظار المراجعة", cls: "warn", icon: "⏳" },
          { num: reviewed, lab: "تمت المراجعة", cls: "done", icon: "✅" },
        ].map((item, i) => (
          <div key={i} className="s-sum-item">
            <span className="s-sum-icon">{item.icon}</span>
            <span className={`s-sum-num ${item.cls}`}>
              {item.num.toLocaleString("en")}
            </span>
            <span className="s-sum-lab">{item.lab}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="s-filters">
        {[
          { val: "", label: "جميع الإجابات" },
          { val: "PENDING", label: "في الانتظار" },
          { val: "REVIEWED", label: "تمت المراجعة" },
        ].map((f) => (
          <button
            key={f.val}
            className={`s-filter-btn ${statusFilter === f.val ? "active" : ""}`}
            onClick={() => setFilter(f.val)}
          >
            {f.label}
            {f.val === "PENDING" && pending > 0 && (
              <span className="s-filter-count">
                {pending.toLocaleString("en")}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <MandalaLoader />
      ) : submissions.length === 0 ? (
        <div className="s-empty">
          <div className="s-empty-icon">
            <svg
              width="36"
              height="36"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
              <path d="M12 11v6M9 14l3 3 3-3" />
            </svg>
          </div>
          <p className="s-empty-text">لا توجد إجابات مطابقة.</p>
          <p className="s-empty-sub">
            جرّب تغيير الفلتر أو انتظر تقديم الطلاب لإجاباتهم.
          </p>
        </div>
      ) : (
        <div className="s-list">
          {submissions.map((s, i) => {
            const isReviewed = s.review_status === "REVIEWED";
            const pct =
              s.score !== null && s.total
                ? Math.round((s.score / s.total) * 100)
                : null;
            return (
              <Link
                key={s.id}
                href={`/owner/submissions/${s.id}`}
                className="s-row"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className="s-row-accent"
                  style={{ background: isReviewed ? "#1B5E20" : "#9a6200" }}
                />
                <div className="s-avatar">
                  {s.student.profile.full_name.charAt(0)}
                </div>
                <div className="s-body">
                  <div className="s-name">{s.student.profile.full_name}</div>
                  <div className="s-meta">
                    <span className="s-meta-item">
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {new Date(s.submitted_at).toLocaleDateString("ar-SA-u-nu-latn", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="s-meta-dot" />
                    <span className="s-meta-item">{s.assessment.title}</span>
                    {s.assigned_school && (
                      <>
                        <span className="s-meta-dot" />
                        <span className="s-meta-item school">
                          {s.assigned_school.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="s-right">
                  {isReviewed && pct !== null && (
                    <div className="s-score-block">
                      <div className="s-score-num">
                        {s.score!.toLocaleString("en")}/
                        {s.total!.toLocaleString("en")}
                      </div>
                      <div className="s-score-bar-wrap">
                        <div
                          className="s-score-bar"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct >= 70
                                ? "#1B5E20"
                                : pct >= 50
                                  ? "#9a6200"
                                  : "#6B1E2D",
                          }}
                        />
                      </div>
                      <div className="s-score-pct">{pct}%</div>
                    </div>
                  )}
                  <div className={`s-chip ${isReviewed ? "done" : "pending"}`}>
                    {isReviewed ? "تمت المراجعة" : "في الانتظار"}
                  </div>
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ color: "var(--text3)", flexShrink: 0 }}
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

export default function OwnerSubmissionsPage() {
  return (
    <Suspense fallback={<MandalaLoader label="جارٍ التحميل" />}>
      <SubmissionsContent />
    </Suspense>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  :root {
    --gold: #B8A082; --gold2: #B8A082;
    --black: #0A0A0B;
    --text: #1A1A1A; --text2: #3E3526; --text3: #8A7A5A;
    --surface: #FFFFFF; --surface2: #FAF8F4; --surface3: #F3EEE5;
    --border: #E2D9CA; --border2: #CEC2AD;
    --success: #1B5E20; --success-bg: rgba(26,107,60,0.07);
    --warning: #9a6200; --warning-bg: rgba(154,98,0,0.07);
    --danger: #6B1E2D;
    --radius: 10px;
    --shadow-sm: 0 1px 4px rgba(11,11,12,0.05);
    --shadow: 0 4px 16px rgba(11,11,12,0.08);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes rowIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }

  .s-page { display:flex;flex-direction:column;gap:20px;font-family:'Cairo',sans-serif; }

  /* Header */
  .s-header {
    display:flex;align-items:flex-end;justify-content:space-between;
    flex-wrap:wrap;gap:16px;padding-bottom:24px;
    border-bottom:1px solid var(--border);position:relative;
  }
  .s-header::after {
    content:'';position:absolute;bottom:-1px;right:0;
    width:60px;height:2px;
    background:linear-gradient(90deg,var(--gold),transparent);
  }
  .s-eyebrow { display:flex;align-items:center;gap:10px;margin-bottom:8px; }
  .s-eyebrow-line { flex:1;height:1px;max-width:22px;background:rgba(184,160,130,0.35); }
  .s-eyebrow span { font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold); }
  .s-title { font-size:24px;font-weight:900;color:var(--black);letter-spacing:-0.4px; }
  .s-subtitle { font-size:13px;color:var(--text3);margin-top:4px;font-weight:500; }
  .s-pending-badge {
    display:flex;align-items:center;gap:7px;
    background:var(--warning-bg);border:1px solid rgba(154,98,0,0.2);
    color:var(--warning);font-size:12.5px;font-weight:800;
    padding:8px 16px;border-radius:20px;
  }
  .s-pending-dot { width:7px;height:7px;border-radius:50%;background:currentColor;animation:blink 2s infinite; }

  /* Summary */
  .s-summary {
    display:flex;background:var(--surface);
    border:1px solid var(--border);border-radius:12px;
    overflow:hidden;box-shadow:var(--shadow-sm);
    position:relative;
  }
  .s-summary::before {
    content:'';position:absolute;top:0;left:0;right:0;
    height:2px;background:linear-gradient(90deg,transparent,rgba(184,160,130,0.3) 40%,rgba(184,160,130,0.4) 50%,rgba(184,160,130,0.3) 60%,transparent);
  }
  .s-sum-item {
    flex:1;display:flex;flex-direction:column;align-items:center;
    padding:18px 12px;gap:5px;
    border-left:1px solid var(--border);
  }
  .s-sum-item:last-child { border-left:none; }
  .s-sum-icon { font-size:18px;line-height:1; }
  .s-sum-num {
    font-size:24px;font-weight:900;color:var(--black);
    font-family:'IBM Plex Mono',monospace;letter-spacing:-0.5px;
  }
  .s-sum-num.warn { color:var(--warning); }
  .s-sum-num.done { color:var(--success); }
  .s-sum-lab { font-size:11.5px;color:var(--text3);font-weight:600;text-align:center; }

  /* Filters */
  .s-filters { display:flex;gap:8px;flex-wrap:wrap; }
  .s-filter-btn {
    display:flex;align-items:center;gap:7px;
    background:var(--surface);border:1px solid var(--border);
    color:var(--text2);padding:8px 16px;border-radius:8px;
    font-size:13px;font-weight:600;cursor:pointer;
    transition:all 0.16s;font-family:'Cairo',sans-serif;
    box-shadow:var(--shadow-sm);
  }
  .s-filter-btn:hover { border-color:rgba(184,160,130,0.3);color:var(--text); }
  .s-filter-btn.active {
    background:rgba(184,160,130,0.09);
    border-color:rgba(184,160,130,0.32);
    color:var(--gold);
  }
  .s-filter-count {
    background:var(--warning-bg);color:var(--warning);
    font-size:10px;font-weight:800;
    padding:1px 7px;border-radius:20px;
    border:1px solid rgba(154,98,0,0.2);
    font-family:'IBM Plex Mono',monospace;
  }

  /* Empty */
  .s-empty {
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:72px 40px;gap:10px;
    background:var(--surface);border:1px solid var(--border);
    border-radius:12px;box-shadow:var(--shadow-sm);
  }
  .s-empty-icon {
    width:64px;height:64px;border-radius:16px;
    background:rgba(184,160,130,0.08);border:1px solid rgba(184,160,130,0.18);
    display:flex;align-items:center;justify-content:center;
    color:rgba(184,160,130,0.5);margin-bottom:6px;
  }
  .s-empty-text { font-size:14px;font-weight:700;color:var(--text2); }
  .s-empty-sub { font-size:12.5px;color:var(--text3);font-weight:500; }

  /* List */
  .s-list { display:flex;flex-direction:column;gap:8px; }
  .s-row {
    display:flex;align-items:center;gap:14px;
    background:var(--surface);border:1px solid var(--border);
    border-radius:11px;padding:14px 18px;text-decoration:none;color:var(--text);
    transition:all 0.18s;box-shadow:var(--shadow-sm);
    animation:rowIn 0.4s ease both;
    position:relative;overflow:hidden;
  }
  .s-row:hover { border-color:rgba(184,160,130,0.3);box-shadow:var(--shadow); }
  .s-row-accent { position:absolute;right:0;top:8px;bottom:8px;width:2.5px;border-radius:2px; }

  .s-avatar {
    width:42px;height:42px;border-radius:10px;flex-shrink:0;
    background:var(--black);display:flex;align-items:center;justify-content:center;
    font-size:15px;font-weight:900;color:var(--gold);
    border:1px solid rgba(184,160,130,0.15);
  }
  .s-body { flex:1;min-width:0; }
  .s-name { font-size:14px;font-weight:700;color:var(--black); }
  .s-meta {
    font-size:12px;color:var(--text3);margin-top:4px;
    display:flex;align-items:center;gap:6px;flex-wrap:wrap;
  }
  .s-meta-item { display:flex;align-items:center;gap:4px; }
  .s-meta-item.school { color:var(--gold);font-weight:600; }
  .s-meta-dot { width:3px;height:3px;border-radius:50%;background:currentColor;opacity:0.3;flex-shrink:0; }

  .s-right { display:flex;align-items:center;gap:10px;flex-shrink:0; }

  .s-score-block {
    display:flex;flex-direction:column;align-items:center;gap:3px;
    min-width:60px;
  }
  .s-score-num {
    font-size:12.5px;font-weight:800;
    font-family:'IBM Plex Mono',monospace;color:var(--gold);
  }
  .s-score-bar-wrap {
    width:52px;height:3px;background:var(--surface3);
    border-radius:99px;overflow:hidden;
  }
  .s-score-bar { height:100%;border-radius:99px;transition:width 0.5s ease; }
  .s-score-pct {
    font-size:10px;color:var(--text3);font-weight:700;
    font-family:'IBM Plex Mono',monospace;
  }

  .s-chip {
    font-size:11px;font-weight:700;
    padding:4px 12px;border-radius:20px;border:1px solid;white-space:nowrap;
  }
  .s-chip.pending { background:var(--warning-bg);color:var(--warning);border-color:rgba(154,98,0,0.2); }
  .s-chip.done { background:rgba(26,107,60,0.07);color:var(--success);border-color:rgba(26,107,60,0.2); }

  @media (max-width:700px) {
    .s-score-block { display:none; }
    .s-row { padding:12px 14px; }
  }
`;
