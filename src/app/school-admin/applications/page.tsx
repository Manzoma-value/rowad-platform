"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import {
  APP_CURRENT_ROLES,
  APP_QUALIFICATIONS,
  APP_EXPERIENCE_RANGES,
  APP_GENDERS,
  CURRENT_ROLE_L,
  QUALIFICATION_L,
  EXPERIENCE_RANGE_L,
  GENDER_L,
  pickLang,
} from "@/lib/teacher-application";

type Row = {
  id: string;
  onboarding_status: "PENDING_APPLICATION" | "UNDER_REVIEW" | "ACTIVE" | "REJECTED";
  created_at: string;
  profile: { full_name: string; email: string | null };
  application: null | {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    gender: "MALE" | "FEMALE";
    current_role: string;
    qualification: string;
    years_of_experience: string;
    submitted_at: string;
    reviewed_at: string | null;
  };
};

const UI = {
  ar: {
    title: "Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†",
    sub: "Ø±Ø§Ø¬Ø¹ Ø·Ù„Ø¨Ø§Øª Ø§Ù„ØªÙ‚Ø¯ÙŠÙ… ÙˆØ­Ø¯Ø¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø£Ùˆ Ø§Ù„Ø±ÙØ¶. ÙŠÙ…ÙƒÙ†Ùƒ ØªØµÙÙŠØ© Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© ÙˆØªØµØ¯ÙŠØ± ÙƒÙ„ Ø·Ù„Ø¨ ÙƒÙ…Ù„Ù PDF.",
    search: "Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù…ØŒ Ø§Ù„Ø¨Ø±ÙŠØ¯ØŒ Ø§Ù„Ø¬ÙˆØ§Ù„ Ø£Ùˆ Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©",
    filters: "ØªØµÙÙŠØ©",
    statusUnderReview: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
    statusActive: "Ù…ÙØ¹Ù‘Ù„",
    statusRejected: "Ù…Ø±ÙÙˆØ¶",
    statusAll: "Ø§Ù„ÙƒÙ„",
    allRoles: "ÙƒÙ„ Ø§Ù„Ø£Ø¯ÙˆØ§Ø±",
    allQualifications: "ÙƒÙ„ Ø§Ù„Ù…Ø¤Ù‡Ù„Ø§Øª",
    allYears: "ÙƒÙ„ Ø³Ù†ÙˆØ§Øª Ø§Ù„Ø®Ø¨Ø±Ø©",
    allGenders: "Ø§Ù„Ø¬Ù†Ø³",
    country: "Ø§Ù„Ø¯ÙˆÙ„Ø©",
    empty: "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø©.",
    name: "Ø§Ù„Ø§Ø³Ù…",
    role: "Ø§Ù„Ø¯ÙˆØ±",
    qualification: "Ø§Ù„Ù…Ø¤Ù‡Ù„",
    years: "Ø§Ù„Ø®Ø¨Ø±Ø©",
    countryCol: "Ø§Ù„Ø¯ÙˆÙ„Ø©/Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©",
    submittedAt: "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø¯ÙŠÙ…",
    statusCol: "Ø§Ù„Ø­Ø§Ù„Ø©",
    view: "Ø¹Ø±Ø¶ Ø§Ù„Ø·Ù„Ø¨",
    yetToApply: "(Ù„Ù… ÙŠÙ‚Ø¯Ù… Ø¨Ø¹Ø¯)",
  },
  sq: {
    title: "Aplikimet e mÃ«suesve",
    sub: "Shqyrto aplikimet dhe vendos miratim ose refuzim. Mund tÃ« filtrosh listÃ«n dhe tÃ« eksportosh Ã§do aplikim si PDF.",
    search: "KÃ«rko sipas emrit, e-mail, telefonit ose qytetit",
    filters: "Filtra",
    statusUnderReview: "NÃ« shqyrtim",
    statusActive: "Aktiv",
    statusRejected: "Refuzuar",
    statusAll: "TÃ« gjitha",
    allRoles: "TÃ« gjithÃ« rolet",
    allQualifications: "TÃ« gjitha kualifikimet",
    allYears: "TÃ« gjitha vitet",
    allGenders: "Gjinia",
    country: "Shteti",
    empty: "AsnjÃ« aplikim nuk u gjet.",
    name: "Emri",
    role: "Roli",
    qualification: "Kualifikimi",
    years: "PÃ«rvoja",
    countryCol: "Shteti/Qyteti",
    submittedAt: "Data e dÃ«rgimit",
    statusCol: "Statusi",
    view: "Shih aplikimin",
    yetToApply: "(Nuk ka aplikuar ende)",
  },
} as const;

export default function ApplicationsListPage() {
  const { lang } = useLang();
  const L = pickLang(lang);
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [currentRole, setCurrentRole] = useState("");
  const [qualification, setQualification] = useState("");
  const [years, setYears] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (q.trim()) u.set("q", q.trim());
    if (currentRole) u.set("current_role", currentRole);
    if (qualification) u.set("qualification", qualification);
    if (years) u.set("years", years);
    if (gender) u.set("gender", gender);
    if (country.trim()) u.set("country", country.trim());
    return u.toString();
  }, [status, q, currentRole, qualification, years, gender, country]);

  useEffect(() => {
    fetch(`/api/school-admin/applications?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d?.teachers ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [params]);

  function fmtDate(s: string | null | undefined) {
    if (!s) return "â€”";
    try {
      return new Date(s).toLocaleDateString(L === "ar" ? "ar" : "sq");
    } catch {
      return s;
    }
  }

  return (
    <div className="ap-page" dir={dir}>
      <header className="ap-hero">
        <h1 className="ap-title">{T.title}</h1>
        <p className="ap-sub">{T.sub}</p>
      </header>

      <div className="ap-toolbar">
        <input
          className="ap-search"
          placeholder={T.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="ap-filter-row">
          <select className="ap-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="UNDER_REVIEW">{T.statusUnderReview}</option>
            <option value="ACTIVE">{T.statusActive}</option>
            <option value="REJECTED">{T.statusRejected}</option>
            <option value="all">{T.statusAll}</option>
          </select>
          <select className="ap-select" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)}>
            <option value="">{T.allRoles}</option>
            {APP_CURRENT_ROLES.map((c) => (
              <option key={c} value={c}>{CURRENT_ROLE_L[c][L]}</option>
            ))}
          </select>
          <select className="ap-select" value={qualification} onChange={(e) => setQualification(e.target.value)}>
            <option value="">{T.allQualifications}</option>
            {APP_QUALIFICATIONS.map((c) => (
              <option key={c} value={c}>{QUALIFICATION_L[c][L]}</option>
            ))}
          </select>
          <select className="ap-select" value={years} onChange={(e) => setYears(e.target.value)}>
            <option value="">{T.allYears}</option>
            {APP_EXPERIENCE_RANGES.map((c) => (
              <option key={c} value={c}>{EXPERIENCE_RANGE_L[c][L]}</option>
            ))}
          </select>
          <select className="ap-select" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">{T.allGenders}</option>
            {APP_GENDERS.map((c) => (
              <option key={c} value={c}>{GENDER_L[c][L]}</option>
            ))}
          </select>
          <input
            className="ap-select"
            placeholder={T.country}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>

      <div className="ap-table-wrap">
        {loading ? (
          <div className="ap-empty">â€¦</div>
        ) : rows.length === 0 ? (
          <div className="ap-empty">{T.empty}</div>
        ) : (
          <table className="ap-table">
            <thead>
              <tr>
                <th>{T.name}</th>
                <th>{T.role}</th>
                <th>{T.qualification}</th>
                <th>{T.years}</th>
                <th>{T.countryCol}</th>
                <th>{T.submittedAt}</th>
                <th>{T.statusCol}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = r.application;
                const statusLabel =
                  r.onboarding_status === "UNDER_REVIEW" ? T.statusUnderReview :
                  r.onboarding_status === "ACTIVE"       ? T.statusActive :
                  r.onboarding_status === "REJECTED"     ? T.statusRejected :
                  T.yetToApply;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="ap-name">{a?.full_name ?? r.profile.full_name}</div>
                      <div className="ap-sub-text">{a?.email ?? r.profile.email ?? "â€”"}</div>
                    </td>
                    <td>{a ? CURRENT_ROLE_L[a.current_role as keyof typeof CURRENT_ROLE_L]?.[L] ?? a.current_role : "â€”"}</td>
                    <td>{a ? QUALIFICATION_L[a.qualification as keyof typeof QUALIFICATION_L]?.[L] ?? a.qualification : "â€”"}</td>
                    <td>{a ? EXPERIENCE_RANGE_L[a.years_of_experience as keyof typeof EXPERIENCE_RANGE_L]?.[L] ?? a.years_of_experience : "â€”"}</td>
                    <td>{a ? `${a.country} / ${a.city}` : "â€”"}</td>
                    <td>{fmtDate(a?.submitted_at ?? null)}</td>
                    <td>
                      <span className={`ap-status st-${r.onboarding_status}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      {a && (
                        <Link className="ap-view" href={`/school-admin/applications/${r.id}`}>
                          {T.view}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .ap-page { font-family: 'Cairo', sans-serif; }
        .ap-hero { margin-bottom: 22px; }
        .ap-title { font-size: 24px; font-weight: 900; color: #1B1810; margin: 0 0 6px; }
        .ap-sub { font-size: 13.5px; color: #5E5A52; max-width: 740px; line-height: 1.85; margin: 0; }
        .ap-toolbar {
          background: #FBF8F1; border: 1px solid rgba(74,14,28,0.07);
          border-radius: 14px; padding: 14px; margin-bottom: 18px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .ap-search {
          width: 100%; padding: 10px 14px; font-size: 14px;
          border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px;
          background: #FFF; font-family: inherit; outline: none;
          transition: border-color 0.15s;
        }
        .ap-search:focus { border-color: #8F765B; }
        .ap-filter-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .ap-select {
          padding: 8px 12px; font-size: 13px; font-family: inherit;
          border: 1.5px solid rgba(194,160,89,0.32); border-radius: 10px;
          background: #FFF; color: #2E2210; cursor: pointer; outline: none;
        }
        .ap-table-wrap { background: #FBF8F1; border: 1px solid rgba(74,14,28,0.07); border-radius: 14px; overflow: auto; }
        .ap-empty { padding: 60px 20px; text-align: center; color: #8A8478; font-weight: 700; }
        .ap-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .ap-table th {
          text-align: start; padding: 12px 14px; font-size: 11.5px;
          color: #6B4F1E; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; border-bottom: 1px solid rgba(194,160,89,0.22);
          background: rgba(194,160,89,0.06);
        }
        .ap-table td {
          padding: 14px; font-size: 13.5px; color: #2E2210;
          border-bottom: 1px solid rgba(74,14,28,0.06); vertical-align: top;
        }
        .ap-name { font-weight: 800; color: #1B1810; }
        .ap-sub-text { font-size: 12px; color: #7A7468; margin-top: 2px; }
        .ap-status {
          display: inline-block; padding: 3px 10px; border-radius: 99px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.02em;
        }
        .ap-status.st-UNDER_REVIEW { background: rgba(194,160,89,0.16); color: #6B4F1E; }
        .ap-status.st-ACTIVE { background: rgba(45,138,74,0.12); color: #1E5C2E; }
        .ap-status.st-REJECTED { background: rgba(139,26,26,0.10); color: #7A1E1E; }
        .ap-status.st-PENDING_APPLICATION { background: rgba(74,14,28,0.06); color: #5E5A52; }
        .ap-view {
          display: inline-block; padding: 7px 14px;
          background: linear-gradient(180deg,#D8B96A,#8F765B); color: #1E1605;
          border-radius: 9px; font-size: 12.5px; font-weight: 800;
          text-decoration: none; white-space: nowrap;
        }
        .ap-view:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

