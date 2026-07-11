/* eslint-disable react-hooks/set-state-in-effect */
"use client";
export const dynamic = "force-dynamic";
import { cachedFetch } from "@/lib/api-cache";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";

interface Submission {
  id: string;
  submitted_at: string;
  review_status: "PENDING" | "REVIEWED";
  score: number | null;
  total: number | null;
  student: { profile: { full_name: string }; class: { name: string } | null };
  assessment: { title: string };
  assigned_class: { name: string } | null;
}

function SubmissionsContent() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get("status") ?? "";
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = statusFilter
      ? `/api/school-admin/submissions?status=${statusFilter}`
      : "/api/school-admin/submissions";
    cachedFetch<{ submissions: Submission[] }>(url, 15_000)
      .then((d) => setSubmissions(d.submissions ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);
  const setFilter = (f: string) => {
    const params = new URLSearchParams();
    if (f) params.set("status", f);
    router.push(`/school-admin/submissions${f ? `?${params}` : ""}`);
  };

  const pending = submissions.filter(
    (s) => s.review_status === "PENDING",
  ).length;

  const filters = [
    { val: "", label: tr.filterAll },
    { val: "PENDING", label: tr.filterPending },
    { val: "REVIEWED", label: tr.filterReviewed },
  ];

  return (
    <div className="sub-page" dir={dir}>
      {/* Header */}
      <div className="sub-header">
        <div>
          <p className="sub-eyebrow">
            {lang === "ar" ? "نتائج التقييم" : "Rezultatet"}
          </p>
          <h1 className="sub-title">{tr.placementResults}</h1>
          <p className="sub-desc">{tr.reviewDesc}</p>
        </div>
        {pending > 0 && (
          <div className="pending-badge">
            <div className="pending-pulse" />
            <span>
              {pending} {tr.awaitingReview}
            </span>
          </div>
        )}
      </div>

      {/* Rule */}
      <div className="sub-rule">
        <div className="sub-rule-line" />
        <div className="sub-rule-diamond" />
        <div className="sub-rule-line" />
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f.val}
            className={`filter-tab ${statusFilter === f.val ? "active" : ""}`}
            onClick={() => setFilter(f.val)}
          >
            {f.label}
            {f.val === "PENDING" && pending > 0 && (
              <span className="filter-count">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <MandalaLoader label={tr.loading} />
      ) : submissions.length === 0 ? (
        <div className="sub-empty">
          <div className="sub-empty-icon">
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
              <path d="M12 11v6M9 14l3 3 3-3" />
            </svg>
          </div>
          <p>{tr.noSubmissions}</p>
        </div>
      ) : (
        <div className="sub-list">
          {submissions.map((s, i) => (
            <Link
              key={s.id}
              href={`/school-admin/submissions/${s.id}`}
              className="sub-row"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              {/* Avatar */}
              <div className="sub-av">
                {s.student.profile.full_name.charAt(0)}
              </div>

              {/* Body */}
              <div className="sub-body">
                <div className="sub-name">{s.student.profile.full_name}</div>
                <div className="sub-meta">
                  <span>
                    {new Date(s.submitted_at).toLocaleDateString(
                      lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </span>
                  <span className="meta-sep">·</span>
                  <span>{s.assessment.title}</span>
                </div>
              </div>

              {/* Status & score */}
              <div className="sub-right">
                {s.review_status === "REVIEWED" ? (
                  <>
                    {s.score !== null && s.total !== null && (
                      <span className="sub-score">
                        {s.score}/{s.total}
                      </span>
                    )}
                    <span className="status-chip status-reviewed">
                      {tr.chipReviewed}
                    </span>
                    {s.assigned_class && (
                      <span className="status-chip status-class">
                        {s.assigned_class.name}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="status-chip status-pending">
                    {tr.chipPending}
                  </span>
                )}
                <div className="sub-chevron">
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{
                      transform: dir === "rtl" ? "rotate(180deg)" : "none",
                    }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.2} }

        :root {
          --gold: #C8A96A;
          --gold-pale: rgba(200,169,106,0.07);
          --gold-border: rgba(200,169,106,0.18);
          --black: #0B0B0C;
          --off-white: #F5F3EE;
          --text: #0B0B0C;
          --text2: #3D3526;
          --text3: #8A7B60;
          --surface: #FFFFFF;
          --border: #E4DDD0;
          --font: 'Cairo', sans-serif;
        }

        .sub-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: var(--font);
          animation: fadeUp 0.3s ease;
        }

        /* Header */
        .sub-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .sub-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 4px;
        }
        .sub-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--black);
          letter-spacing: -0.4px;
        }
        .sub-desc { font-size: 12.5px; color: var(--text3); margin-top: 3px; font-weight: 500; }

        .pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(200,169,106,0.08);
          border: 1px solid rgba(200,169,106,0.22);
          color: #6B4E18;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 7px;
          white-space: nowrap;
        }
        .pending-pulse {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--gold);
          animation: pulse 2s infinite;
        }

        /* Rule */
        .sub-rule { display: flex; align-items: center; gap: 10px; }
        .sub-rule-line { flex: 1; height: 1px; background: var(--border); }
        .sub-rule-diamond { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); opacity: 0.45; flex-shrink: 0; }

        /* Filter bar */
        .filter-bar {
          display: flex;
          gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 4px;
          width: fit-content;
        }
        .filter-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text3);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font);
        }
        .filter-tab:hover { color: var(--text); }
        .filter-tab.active {
          background: var(--black);
          color: var(--gold);
          font-weight: 700;
        }
        .filter-count {
          background: var(--gold);
          color: var(--black);
          font-size: 10px;
          font-weight: 900;
          width: 18px; height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Empty */
        .sub-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 64px 20px;
          color: var(--text3);
          font-size: 13px;
          font-weight: 500;
        }
        .sub-empty-icon {
          width: 60px; height: 60px;
          border-radius: 13px;
          background: var(--surface);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          opacity: 0.6;
        }

        /* Submissions list */
        .sub-list { display: flex; flex-direction: column; gap: 6px; }
        .sub-row {
          display: flex;
          align-items: center;
          gap: 13px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 14px 18px;
          text-decoration: none;
          color: var(--text);
          transition: border-color 0.15s, box-shadow 0.15s;
          animation: fadeUp 0.35s ease both;
        }
        .sub-row:hover {
          border-color: rgba(200,169,106,0.38);
          box-shadow: 0 2px 12px rgba(200,169,106,0.07);
        }

        /* Avatar */
        .sub-av {
          width: 38px; height: 38px;
          border-radius: 8px;
          background: var(--black);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          color: var(--gold);
          flex-shrink: 0;
        }

        .sub-body { flex: 1; min-width: 0; }
        .sub-name { font-size: 13.5px; font-weight: 700; color: var(--text); }
        .sub-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--text3);
          margin-top: 2px;
          font-weight: 500;
        }
        .meta-sep { opacity: 0.4; }

        .sub-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .sub-score {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.5px;
        }

        .status-chip {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 5px;
          letter-spacing: 0.3px;
        }
        .status-pending {
          background: rgba(200,169,106,0.1);
          color: #6B4E18;
          border: 1px solid rgba(200,169,106,0.22);
        }
        .status-reviewed {
          background: rgba(26,107,60,0.07);
          color: #1a6b3c;
          border: 1px solid rgba(26,107,60,0.18);
        }
        .status-class {
          background: var(--off-white);
          color: var(--text2);
          border: 1px solid var(--border);
        }

        .sub-chevron {
          color: rgba(200,169,106,0.3);
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }
        .sub-row:hover .sub-chevron { color: var(--gold); }

        @media (max-width: 700px) {
          .sub-page { gap: 14px; }
          .sub-title { font-size: 20px; }
          .sub-desc { font-size: 12.5px; }
          .sub-eyebrow { font-size: 10px; }
          .sub-row { padding: 12px 14px; gap: 10px; flex-wrap: wrap; }
          .sub-right { flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
          .sub-empty { padding: 40px 18px; }
        }
        @media (max-width: 420px) {
          .sub-row { padding: 10px 12px; gap: 8px; }
        }
      `}</style>
    </div>
  );
}

export default function SchoolAdminSubmissionsPage() {
  const { lang } = useLang();
  const tr = t[lang];
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 40,
            color: "#8A7B60",
            fontFamily: "Cairo, sans-serif",
          }}
        >
          {tr.loading}
        </div>
      }
    >
      <SubmissionsContent />
    </Suspense>
  );
}
