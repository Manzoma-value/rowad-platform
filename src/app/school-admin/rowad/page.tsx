"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

type Submission = {
  id: string;
  stage: "STAGE1" | "STAGE2";
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  score: number | null;
  total: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  teacher: { id: string; profile: { full_name: string } };
};

const L = {
  ar: {
    title: "النموذج التعليمي للرواد",
    sub: "مراجعة محاولات المعلمين والموافقة على المراحل",
    teacher: "المعلم",
    stage: "المرحلة",
    status: "الحالة",
    score: "الدرجة",
    date: "تاريخ الإرسال",
    action: "إجراء",
    review: "مراجعة",
    view: "عرض",
    stage1: "المرحلة الأولى",
    stage2: "المرحلة الثانية",
    empty: "لا توجد محاولات بعد",
    emptySub: "ستظهر هنا محاولات المعلمين بعد إرسالها.",
    SUBMITTED: "بانتظار المراجعة",
    APPROVED: "تمت الموافقة",
    REJECTED: "مرفوضة",
  },
  en: {
    title: "Rowad Educational Model",
    sub: "Review teacher attempts and approve stages",
    teacher: "Teacher",
    stage: "Stage",
    status: "Status",
    score: "Score",
    date: "Submitted",
    action: "Action",
    review: "Review",
    view: "View",
    stage1: "Stage 1",
    stage2: "Stage 2",
    empty: "No attempts yet",
    emptySub: "Teacher attempts will appear here once submitted.",
    SUBMITTED: "Awaiting review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  },
} as const;

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  SUBMITTED: { bg: "rgba(229,185,60,.14)", fg: "#9a6d12" },
  APPROVED: { bg: "rgba(63,138,79,.14)", fg: "#2f7a40" },
  REJECTED: { bg: "rgba(139,26,26,.10)", fg: "#8b1a1a" },
};

export default function SchoolAdminRowadPage() {
  const { lang } = useLang();
  const tr = L[lang === "en" ? "en" : "ar"];
  const dir = lang === "en" ? "ltr" : "rtl";

  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school-admin/rowad", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSubs(d.submissions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MandalaLoader />;

  return (
    <div className="sr-page" dir={dir}>
      <div className="sr-head">
        <h1 className="sr-title">{tr.title}</h1>
        <p className="sr-sub">{tr.sub}</p>
      </div>

      {subs.length === 0 ? (
        <div className="sr-empty">
          <div className="sr-empty-icon">📋</div>
          <h2>{tr.empty}</h2>
          <p>{tr.emptySub}</p>
        </div>
      ) : (
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th>{tr.teacher}</th>
                <th>{tr.stage}</th>
                <th>{tr.status}</th>
                <th>{tr.score}</th>
                <th>{tr.date}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.SUBMITTED;
                return (
                  <tr key={s.id}>
                    <td className="sr-name">{s.teacher.profile.full_name}</td>
                    <td>{s.stage === "STAGE1" ? tr.stage1 : tr.stage2}</td>
                    <td>
                      <span className="sr-badge" style={{ background: st.bg, color: st.fg }}>
                        {tr[s.status]}
                      </span>
                    </td>
                    <td className="sr-score">
                      {s.score != null ? `${s.score} / ${s.total}` : "—"}
                    </td>
                    <td className="sr-date">
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleDateString(
                            lang === "en" ? "en-GB" : "ar-EG",
                            { year: "numeric", month: "short", day: "numeric" },
                          )
                        : "—"}
                    </td>
                    <td>
                      <Link href={`/school-admin/rowad/${s.id}`} className="sr-link">
                        {s.stage === "STAGE1" && s.status === "SUBMITTED" ? tr.review : tr.view}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .sr-page{font-family:'Cairo',sans-serif;color:#2b2417}
        .sr-head{margin-bottom:22px}
        .sr-title{font-size:24px;font-weight:900;color:#0B0B0C;margin:0}
        .sr-title::after{content:'';display:block;width:46px;height:3px;border-radius:2px;margin-top:8px;background:linear-gradient(90deg,#C8A96A,#E5B93C)}
        .sr-sub{font-size:13.5px;color:#8A7B60;margin-top:10px}
        .sr-table-wrap{background:#fff;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.03)}
        .sr-table{width:100%;border-collapse:collapse}
        .sr-table thead th{text-align:start;font-size:11.5px;font-weight:800;color:#8A7B60;text-transform:uppercase;letter-spacing:.5px;padding:14px 18px;background:#FBF8F1;border-bottom:1px solid #EFE7D8}
        .sr-table tbody td{padding:14px 18px;font-size:13.5px;border-bottom:1px solid #F3ECDD}
        .sr-table tbody tr:last-child td{border-bottom:none}
        .sr-table tbody tr:hover{background:#FDFBF6}
        .sr-name{font-weight:700;color:#0B0B0C}
        .sr-score{font-weight:800;font-variant-numeric:tabular-nums}
        .sr-date{color:#8A7B60}
        .sr-badge{display:inline-block;padding:4px 11px;border-radius:99px;font-size:11.5px;font-weight:800}
        .sr-link{display:inline-block;background:#0B0B0C;color:#C8A96A;padding:7px 16px;border-radius:9px;font-size:12.5px;font-weight:800;text-decoration:none;transition:all .15s}
        .sr-link:hover{background:#26210f;color:#E5B93C}
        .sr-empty{background:#fff;border:1px solid #E4DDD0;border-radius:18px;padding:60px;text-align:center}
        .sr-empty-icon{font-size:38px;margin-bottom:8px}
        .sr-empty h2{font-size:17px;font-weight:800;color:#0B0B0C;margin:0 0 6px}
        .sr-empty p{font-size:13px;color:#8A7B60;margin:0}
        @media(max-width:640px){.sr-table thead{display:none}.sr-table tbody td{display:flex;justify-content:space-between;padding:9px 14px;border:none}.sr-table tbody tr{display:block;border-bottom:1px solid #EFE7D8;padding:8px 0}}
      `}</style>
    </div>
  );
}
