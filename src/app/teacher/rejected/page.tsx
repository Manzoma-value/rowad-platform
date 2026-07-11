"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

const COPY = {
  ar: {
    badge: "نتيجة المراجعة",
    title: "لم تتم الموافقة على طلبك",
    body: "نشكرك على التقديم. يبدو أن طلبك لم يتم اعتماده في هذه المرحلة من قبل إدارة المدرسة. لأي استفسار يرجى التواصل مع الإدارة مباشرة.",
    notesLabel: "ملاحظات المراجع",
    noNotes: "لم تترك الإدارة ملاحظات.",
  },
  sq: {
    badge: "Rezultati i shqyrtimit",
    title: "Aplikimi yt nuk u miratua",
    body: "Të falënderojmë për aplikimin. Aplikimi yt nuk u miratua në këtë fazë nga administrata e shkollës. Për çdo paqartësi të lutem kontakto drejtpërdrejt administratën.",
    notesLabel: "Shënimet e shqyrtuesit",
    noNotes: "Administrata nuk la shënime.",
  },
} as const;

export default function RejectedPage() {
  const { lang } = useLang();
  const router = useRouter();
  const L = lang === "sq" ? "sq" : "ar";
  const C = COPY[L];
  const [notes, setNotes] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    fetch("/api/teacher/application", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setNotes(d?.application?.reviewer_notes ?? null))
      .catch(() => {});
  }, []);

  async function retryApplication() {
    setRetrying(true);
    setRetryError("");
    try {
      const r = await fetch("/api/teacher/application/retry", { method: "POST" });
      if (!r.ok) {
        setRetryError(L === "ar" ? "تعذر فتح نموذج جديد. حاول مرة أخرى." : "Formulari i ri nuk u hap. Provo përsëri.");
        setRetrying(false);
        return;
      }
      router.replace("/teacher/application");
    } catch {
      setRetryError(L === "ar" ? "تعذر فتح نموذج جديد. حاول مرة أخرى." : "Formulari i ri nuk u hap. Provo përsëri.");
      setRetrying(false);
    }
  }

  return (
    <div dir={L === "ar" ? "rtl" : "ltr"} className="rj-wrap">
      <div className="rj-card">
        <div className="rj-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <span className="rj-badge">{C.badge}</span>
        <h1 className="rj-title">{C.title}</h1>
        <p className="rj-body">{C.body}</p>
        <div className="rj-notes-block">
          <div className="rj-notes-label">{C.notesLabel}</div>
          <div className={`rj-notes${notes ? "" : " empty"}`}>{notes || C.noNotes}</div>
        </div>
        {retryError && <div className="rj-error">{retryError}</div>}
        <button className="rj-retry" onClick={retryApplication} disabled={retrying}>
          {retrying
            ? (L === "ar" ? "جاري التجهيز..." : "Po përgatitet...")
            : (L === "ar" ? "إرسال طلب جديد" : "Dërgo aplikim të ri")}
        </button>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .rj-wrap {
          min-height: 78vh; display:flex; align-items:center; justify-content:center;
          padding: 24px; font-family:'Cairo','Tajawal',sans-serif;
          background:
            radial-gradient(ellipse at 50% 10%, #EFEAE0 0%, transparent 55%),
            linear-gradient(160deg,#E5E0D5 0%,#E5E0D5 100%);
        }
        .rj-card {
          max-width: 560px; text-align:center;
          background: linear-gradient(160deg,#F7F3EB 0%,#EFEAE0 100%);
          border: 1.5px solid rgba(107,30,45,0.32); border-radius: 22px;
          padding: 48px 40px;
          box-shadow: 0 10px 40px rgba(107,30,45,0.10),
            inset 0 0 0 5px rgba(247,243,235,0.55);
          color: #6B1E2D;
        }
        .rj-icon {
          width: 88px; height: 88px; border-radius: 50%; margin: 0 auto 18px;
          display:flex; align-items:center; justify-content:center;
          background: rgba(107,30,45,0.10); color: #6B1E2D;
          border: 1.5px solid rgba(107,30,45,0.32);
        }
        .rj-badge {
          display:inline-block; font-size:11.5px; font-weight:800; color:#6B1E2D;
          background:rgba(107,30,45,.10); padding:4px 16px; border-radius:99px;
          margin-bottom:14px; letter-spacing:1.5px; text-transform:uppercase;
          border:1px solid rgba(107,30,45,0.30);
        }
        .rj-title { font-size:22px; font-weight:900; color:#6B1E2D; margin:0 0 14px; }
        .rj-body  { font-size:14px; color:#6B1E2D; line-height:1.9; margin:0 0 22px; }
        .rj-notes-block {
          background: #F7F3EB; border:1px solid rgba(107,30,45,0.20);
          border-radius:12px; padding:14px 16px; text-align:start;
        }
        .rj-notes-label {
          font-size: 11px; font-weight:800; color:#8F765B;
          letter-spacing:1.2px; text-transform:uppercase; margin-bottom:6px;
        }
        .rj-notes       { font-size:13.5px; color:#6B1E2D; line-height:1.85; font-weight:600; white-space:pre-wrap; }
        .rj-notes.empty { color:#796A62; font-style:italic; font-weight:500; }
        .rj-error { margin-top: 12px; color: #6B1E2D; font-size: 13px; font-weight: 800; }
        .rj-retry {
          margin-top: 18px; border: 0; border-radius: 12px; padding: 12px 24px;
          background: #4A0E1C; color: #D9C9B0; font-family: inherit;
          font-size: 14px; font-weight: 900; cursor: pointer;
          box-shadow: 0 10px 24px rgba(107,30,45,0.18);
        }
        .rj-retry:disabled { opacity: 0.6; cursor: progress; }
      `}</style>
    </div>
  );
}
