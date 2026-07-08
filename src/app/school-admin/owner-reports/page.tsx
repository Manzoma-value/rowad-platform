"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

type Row = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  report_date: string | null;
  published_at: string | null;
  author: { full_name: string } | null;
};

const UI = {
  ar: {
    title: "ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø§Ù„Ùƒ",
    sub: "ØªÙ‚Ø§Ø±ÙŠØ± Ø±Ø³Ù…ÙŠØ© Ù…ÙØµØ¯ÙŽØ±Ø© Ù…Ù† Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµØ© ÙˆÙ…ÙˆØ¬ÙŽÙ‘Ù‡Ø© Ù„Ù…Ø¯Ø±Ø³ØªÙƒ.",
    empty: "Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ‚Ø§Ø±ÙŠØ± Ù…Ù†Ø´ÙˆØ±Ø© Ø¨Ø¹Ø¯.",
    formal: "ØªÙ‚Ø±ÙŠØ± Ø±Ø³Ù…ÙŠ",
    open: "Ø§ÙØªØ­ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
    issuedBy: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµØ©",
    publishedOn: "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ø´Ø±",
  },
  sq: {
    title: "Raportet e pronarit",
    sub: "Raporte zyrtare tÃ« lÃ«shuara nga administrata e platformÃ«s pÃ«r shkollÃ«n tuaj.",
    empty: "Nuk ka raporte tÃ« publikuara.",
    formal: "Raport zyrtar",
    open: "Hap raportin",
    issuedBy: "Administrata e platformÃ«s",
    publishedOn: "Publikuar mÃ«",
  },
} as const;

export default function AdminOwnerReportsListPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school-admin/owner-reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d?.reports ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  function fmt(s: string | null) {
    if (!s) return "";
    try { return new Date(s).toLocaleDateString(L === "ar" ? "ar-SA" : "sq-AL", { year: "numeric", month: "long", day: "numeric" }); } catch { return s; }
  }

  if (loading) return <MandalaLoader />;

  return (
    <div className="aor" dir={dir}>
      <header className="aor-hero">
        <h1 className="aor-title">{T.title}</h1>
        <p className="aor-sub">{T.sub}</p>
      </header>

      {rows.length === 0 ? (
        <div className="aor-empty">
          <div className="aor-empty-mark" aria-hidden>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p>{T.empty}</p>
        </div>
      ) : (
        <div className="aor-grid">
          {rows.map((r) => (
            <Link key={r.id} href={`/school-admin/owner-reports/${r.id}`} className="aor-card">
              <span className="aor-tag">
                <span className="aor-tag-dot" />
                {T.formal}
              </span>
              <h2 className="aor-card-title">{r.title}</h2>
              {r.subtitle && <p className="aor-card-sub">{r.subtitle}</p>}
              {r.description && <p className="aor-card-desc">{r.description}</p>}
              <div className="aor-meta">
                <span><strong>{T.publishedOn}:</strong> {fmt(r.published_at)}</span>
                <span className="aor-issuer">{T.issuedBy}</span>
              </div>
              <span className="aor-open">{T.open} â†’</span>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=El+Messiri:wght@500;600;700&display=swap');
        .aor { font-family:'Cairo',sans-serif; }
        .aor-hero { margin-bottom:22px; }
        .aor-title { font-family:'El Messiri','Cairo',serif; font-size:26px; font-weight:700; color:#1B1810; margin:0 0 8px; }
        .aor-sub { font-size:13.5px; color:#5E5A52; max-width:680px; line-height:1.85; margin:0; }

        .aor-empty { padding:80px 24px; text-align:center; background:linear-gradient(165deg,#FCF6E6,#F4EBD3); border:1.5px solid rgba(194,160,89,0.32); border-radius:18px; color:#8B6915; }
        .aor-empty-mark { color:#B8A082; display:inline-flex; margin-bottom:14px; opacity:0.7; }
        .aor-empty p { font-weight:700; font-size:14px; margin:0; }

        .aor-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px; }
        .aor-card {
          position:relative;
          display:flex; flex-direction:column; gap:8px;
          padding:24px 24px 20px;
          background:linear-gradient(165deg,#FCF6E6 0%,#F4EBD3 100%);
          border:1.5px solid #C0A063;
          border-radius:16px;
          text-decoration:none; color:inherit;
          box-shadow:0 6px 22px rgba(150,115,50,0.10), inset 0 0 0 4px #EFE6D1, inset 0 0 0 5.5px rgba(194,160,89,0.4);
          transition:all .2s cubic-bezier(.22,1,.36,1);
        }
        .aor-card:hover { transform:translateY(-2px); box-shadow:0 14px 36px rgba(150,115,50,0.18), inset 0 0 0 4px #EFE6D1, inset 0 0 0 5.5px rgba(194,160,89,0.55); }
        .aor-card::before { content:''; position:absolute; top:14px; inset-inline-start:14px; width:20px; height:20px; border-top:1.5px solid rgba(122,30,30,0.55); border-inline-start:1.5px solid rgba(122,30,30,0.55); pointer-events:none; }
        .aor-card::after  { content:''; position:absolute; bottom:14px; inset-inline-end:14px; width:20px; height:20px; border-bottom:1.5px solid rgba(122,30,30,0.55); border-inline-end:1.5px solid rgba(122,30,30,0.55); pointer-events:none; }

        .aor-tag { display:inline-flex; align-items:center; gap:7px; font-size:10.5px; font-weight:800; color:#7A1E1E; letter-spacing:0.18em; text-transform:uppercase; align-self:flex-start; }
        .aor-tag-dot { width:6px; height:6px; background:#7A1E1E; transform:rotate(45deg); border-radius:1px; }

        .aor-card-title { font-family:'El Messiri','Cairo',serif; font-size:19px; font-weight:700; color:#1B1810; margin:4px 0 0; line-height:1.4; }
        .aor-card-sub { font-size:13.5px; color:#5E4A20; font-weight:600; margin:0; line-height:1.7; }
        .aor-card-desc { font-size:12.5px; color:#7A6440; margin:0; line-height:1.75; font-style:italic; }

        .aor-meta { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; font-size:11.5px; color:#8B6915; margin-top:8px; padding-top:10px; border-top:1px solid rgba(194,160,89,0.32); }
        .aor-meta strong { color:#6B4F1E; font-weight:800; }
        .aor-issuer { color:#7A1E1E; font-weight:800; letter-spacing:0.04em; }
        .aor-open { font-size:12.5px; font-weight:800; color:#6B4F1E; margin-top:6px; }
      `}</style>
    </div>
  );
}

