"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import OwnerReportView, { type ReportViewData } from "@/components/OwnerReportView";
import { pickReportLang } from "@/lib/owner-reports";

const BACK = {
  ar: "← العودة إلى تقارير المالك",
  sq: "← Kthehu te raportet",
} as const;

export default function AdminOwnerReportViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = pickReportLang(lang);
  const dir = L === "ar" ? "rtl" : "ltr";

  const [report, setReport] = useState<ReportViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/school-admin/owner-reports/${id}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404 || r.status === 403) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d?.report) setReport(d.report); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MandalaLoader />;
  if (notFound || !report) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#8B6915", fontFamily: "'Cairo',sans-serif" }} dir={dir}>
        {L === "ar" ? "هذا التقرير غير متاح." : "Ky raport nuk është i disponueshëm."}
      </div>
    );
  }

  return (
    <div>
      <div className="ovrv-toolbar" dir={dir}>
        <Link href="/school-admin/owner-reports" className="ovrv-back">{BACK[L]}</Link>
      </div>
      <OwnerReportView report={report} lang={L} />
      <style>{`
        .ovrv-toolbar { padding: 12px 20px; max-width: 880px; margin: 0 auto; }
        .ovrv-back {
          font-family: 'Cairo', sans-serif;
          font-size: 13px; font-weight: 800; color: #6B4F1E;
          text-decoration: none;
        }
        .ovrv-back:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
