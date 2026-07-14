"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
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
  onboarding_status: "PENDING_APPLICATION" | "UNDER_REVIEW" | "WAITING_LIST" | "ACTIVE" | "REJECTED";
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
    title: "طلبات المعلمين",
    sub: "راجع طلبات التقديم وحدد الموافقة أو الرفض. يمكنك تصفية القائمة وتصدير كل طلب كملف PDF.",
    search: "بحث بالاسم، البريد، الجوال أو المدينة",
    filters: "تصفية",
    statusUnderReview: "قيد المراجعة",
    statusActive: "مفعّل",
    statusRejected: "مرفوض",
    statusAll: "الكل",
    allRoles: "كل الأدوار",
    allQualifications: "كل المؤهلات",
    allYears: "كل سنوات الخبرة",
    allGenders: "الجنس",
    country: "الدولة",
    empty: "لا توجد طلبات مطابقة.",
    name: "الاسم",
    role: "الدور",
    qualification: "المؤهل",
    years: "الخبرة",
    countryCol: "الدولة/المدينة",
    submittedAt: "تاريخ التقديم",
    statusCol: "الحالة",
    view: "عرض الطلب",
    yetToApply: "(لم يقدم بعد)",
    exportExcel: "تصدير كل الطلبات Excel",
    exporting: "جاري التصدير...",
  },
  sq: {
    title: "Aplikimet e mësuesve",
    sub: "Shqyrto aplikimet dhe vendos miratim ose refuzim. Mund të filtrosh listën dhe të eksportosh çdo aplikim si PDF.",
    search: "Kërko sipas emrit, e-mail, telefonit ose qytetit",
    filters: "Filtra",
    statusUnderReview: "Në shqyrtim",
    statusActive: "Aktiv",
    statusRejected: "Refuzuar",
    statusAll: "Të gjitha",
    allRoles: "Të gjithë rolet",
    allQualifications: "Të gjitha kualifikimet",
    allYears: "Të gjitha vitet",
    allGenders: "Gjinia",
    country: "Shteti",
    empty: "Asnjë aplikim nuk u gjet.",
    name: "Emri",
    role: "Roli",
    qualification: "Kualifikimi",
    years: "Përvoja",
    countryCol: "Shteti/Qyteti",
    submittedAt: "Data e dërgimit",
    statusCol: "Statusi",
    view: "Shih aplikimin",
    yetToApply: "(Nuk ka aplikuar ende)",
    exportExcel: "Eksporto të gjitha në Excel",
    exporting: "Duke eksportuar...",
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
  const [exporting, setExporting] = useState(false);

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
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(L === "ar" ? "ar-u-nu-latn" : "sq");
    } catch {
      return s;
    }
  }

  async function exportAllApplications() {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await fetch("/api/school-admin/applications?export=1", { cache: "no-store" });
      if (!response.ok) throw new Error("export_failed");
      const payload = await response.json() as {
        teachers?: Array<{
          id: string;
          onboarding_status: string;
          created_at: string;
          profile: { full_name: string; email: string | null; is_active: boolean };
          application: Record<string, unknown> | null;
        }>;
      };
      const XLSX = await import("xlsx");
      const cell = (value: unknown) => {
        if (value == null) return "";
        if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join(" | ");
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      };
      const rowsForExport = (payload.teachers ?? []).map((teacher) => {
        const a = teacher.application;
        return {
          [L === "ar" ? "الاسم" : "Emri"]: cell(a?.full_name ?? teacher.profile.full_name),
          [L === "ar" ? "البريد الإلكتروني" : "E-mail"]: cell(a?.email ?? teacher.profile.email),
          [L === "ar" ? "الهاتف" : "Telefoni"]: cell(a?.phone),
          [L === "ar" ? "الحالة" : "Statusi"]: teacher.onboarding_status,
          [L === "ar" ? "الحساب نشط" : "Llogaria aktive"]: teacher.profile.is_active ? (L === "ar" ? "نعم" : "Po") : (L === "ar" ? "لا" : "Jo"),
          [L === "ar" ? "العمر" : "Mosha"]: cell(a?.age),
          [L === "ar" ? "الجنس" : "Gjinia"]: cell(a?.gender),
          [L === "ar" ? "الدولة" : "Shteti"]: cell(a?.country),
          [L === "ar" ? "المدينة" : "Qyteti"]: cell(a?.city),
          [L === "ar" ? "الدور الحالي" : "Roli aktual"]: cell(a?.current_role),
          [L === "ar" ? "المؤهل" : "Kualifikimi"]: cell(a?.qualification),
          [L === "ar" ? "التخصص" : "Specializimi"]: cell(a?.specialization),
          [L === "ar" ? "جهة التخرج" : "Institucioni"]: cell(a?.graduation_institution),
          [L === "ar" ? "سنوات الخبرة" : "Vitet e përvojës"]: cell(a?.years_of_experience),
          [L === "ar" ? "مجالات الخبرة" : "Fushat e përvojës"]: cell(a?.experience_areas),
          [L === "ar" ? "الفئات المستهدفة" : "Grupet e synuara"]: cell(a?.target_groups),
          [L === "ar" ? "المساهمات" : "Kontributet"]: cell(a?.contributions),
          [L === "ar" ? "اللغات" : "Gjuhët"]: cell(a?.languages),
          [L === "ar" ? "نبذة وملاحظات" : "Shënime"]: cell(a?.notes),
          [L === "ar" ? "تاريخ التقديم" : "Data e aplikimit"]: cell(a?.submitted_at),
          [L === "ar" ? "تاريخ المراجعة" : "Data e shqyrtimit"]: cell(a?.reviewed_at),
          [L === "ar" ? "ملاحظات المراجع" : "Shënimet e shqyrtuesit"]: cell(a?.reviewer_notes),
        };
      });
      const sheet = XLSX.utils.json_to_sheet(rowsForExport);
      sheet["!cols"] = Object.keys(rowsForExport[0] ?? {}).map((key) => ({ wch: Math.min(44, Math.max(14, key.length + 5)) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, L === "ar" ? "طلبات المعلمين" : "Aplikimet");
      XLSX.writeFile(workbook, `teacher-applications-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="ap-page" dir={dir}>
      <header className="ap-hero">
        <h1 className="ap-title">{T.title}</h1>
        <p className="ap-sub">{T.sub}</p>
      </header>

      <div className="ap-toolbar">
        <div className="ap-toolbar-top">
        <input
          className="ap-search"
          placeholder={T.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="ap-export" type="button" onClick={() => void exportAllApplications()} disabled={exporting}>
          <Download size={16} />{exporting ? T.exporting : T.exportExcel}
        </button>
        </div>
        <div className="ap-filter-row">
          <select className="ap-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="UNDER_REVIEW">{T.statusUnderReview}</option>
            <option value="WAITING_LIST">{L === "ar" ? "قائمة الانتظار" : "Në pritje"}</option>
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
          <div className="ap-empty">…</div>
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
                  r.onboarding_status === "WAITING_LIST"  ? (L === "ar" ? "قائمة الانتظار" : "Në pritje") :
                  r.onboarding_status === "ACTIVE"       ? T.statusActive :
                  r.onboarding_status === "REJECTED"     ? T.statusRejected :
                  T.yetToApply;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="ap-name">{a?.full_name ?? r.profile.full_name}</div>
                      <div className="ap-sub-text">{a?.email ?? r.profile.email ?? "—"}</div>
                    </td>
                    <td>{a ? CURRENT_ROLE_L[a.current_role as keyof typeof CURRENT_ROLE_L]?.[L] ?? a.current_role : "—"}</td>
                    <td>{a ? QUALIFICATION_L[a.qualification as keyof typeof QUALIFICATION_L]?.[L] ?? a.qualification : "—"}</td>
                    <td>{a ? EXPERIENCE_RANGE_L[a.years_of_experience as keyof typeof EXPERIENCE_RANGE_L]?.[L] ?? a.years_of_experience : "—"}</td>
                    <td>{a ? `${a.country} / ${a.city}` : "—"}</td>
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
        .ap-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .ap-sub { font-size: 13.5px; color: #655B53; max-width: 740px; line-height: 1.85; margin: 0; }
        .ap-toolbar {
          background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07);
          border-radius: 14px; padding: 14px; margin-bottom: 18px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .ap-search {
          flex: 1; min-width: 240px; padding: 10px 14px; font-size: 14px;
          border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px;
          background: #FFF; font-family: inherit; outline: none;
          transition: border-color 0.15s;
        }
        .ap-search:focus { border-color: #B8A082; }
        .ap-toolbar-top { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .ap-export { min-height:43px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 16px; border-radius:11px; border:1px solid rgba(184,160,130,.38); background:linear-gradient(180deg,#5B1526,#32101A); color:#D9C9B0; font:800 12.5px 'Cairo',sans-serif; cursor:pointer; white-space:nowrap; }
        .ap-export:disabled { opacity:.6; cursor:wait; }
        .ap-filter-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .ap-select {
          padding: 8px 12px; font-size: 13px; font-family: inherit;
          border: 1.5px solid rgba(194,160,89,0.32); border-radius: 10px;
          background: #FFF; color: #4A0E1C; cursor: pointer; outline: none;
        }
        .ap-table-wrap { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; overflow: auto; }
        .ap-empty { padding: 60px 20px; text-align: center; color: #8C8274; font-weight: 700; }
        .ap-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .ap-table th {
          text-align: start; padding: 12px 14px; font-size: 11.5px;
          color: #6B1E2D; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; border-bottom: 1px solid rgba(194,160,89,0.22);
          background: rgba(194,160,89,0.06);
        }
        .ap-table td {
          padding: 14px; font-size: 13.5px; color: #4A0E1C;
          border-bottom: 1px solid rgba(26,26,26,0.06); vertical-align: top;
        }
        .ap-name { font-weight: 800; color: #32101A; }
        .ap-sub-text { font-size: 12px; color: #7A7468; margin-top: 2px; }
        .ap-status {
          display: inline-block; padding: 3px 10px; border-radius: 99px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.02em;
        }
        .ap-status.st-UNDER_REVIEW { background: rgba(194,160,89,0.16); color: #6B1E2D; }
        .ap-status.st-WAITING_LIST { background: rgba(184,160,130,0.18); color: #4A0E1C; }
        .ap-status.st-ACTIVE { background: rgba(45,138,74,0.12); color: #1B5E20; }
        .ap-status.st-REJECTED { background: rgba(139,26,26,0.10); color: #6B1E2D; }
        .ap-status.st-PENDING_APPLICATION { background: rgba(26,26,26,0.06); color: #655B53; }
        .ap-view {
          display: inline-block; padding: 7px 14px;
          background: linear-gradient(180deg,#D8B96A,#B8A082); color: #4A0E1C;
          border-radius: 9px; font-size: 12.5px; font-weight: 800;
          text-decoration: none; white-space: nowrap;
        }
        .ap-view:hover { transform: translateY(-1px); }
        @media(max-width:620px){ .ap-export{width:100%}.ap-search{min-width:100%} }
      `}</style>
    </div>
  );
}
