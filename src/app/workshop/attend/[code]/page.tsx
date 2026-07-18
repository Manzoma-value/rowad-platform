"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Attendance scan landing. The QR is permanent for the workshop; the API
// resolves the current scheduled work day when the teacher scans it.
//
// If the visitor is NOT signed in we send them to /login first (with a
// return_to param). Otherwise we POST immediately and show the result.

const UI = {
  ar: {
    checking: "جارٍ تسجيل الحضور…",
    success: (title: string) => `تم تسجيل حضورك في ${title}. شكراً لك!`,
    successCta: "فتح صفحة الورشة",
    errPrefix: "تعذر تسجيل الحضور:",
    err_not_signed_in: "الرجاء تسجيل الدخول أولاً.",
    err_not_a_teacher: "الحساب المستخدم ليس حساب معلم.",
    err_invalid_code: "رمز QR غير معروف — تأكد من صحة الرابط.",
    err_not_training_day: "اليوم ليس يوم تدريب مجدولاً لهذه الورشة.",
    err_wrong_school: "هذه الورشة تخص مدرسة أخرى.",
    err_workshop_closed: "الورشة مغلقة.",
    err_default: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    goLogin: "تسجيل الدخول",
  },
  sq: {
    checking: "Po regjistrohet prania…",
    success: (title: string) => `Prania jote u regjistrua për ${title}. Faleminderit!`,
    successCta: "Hap forumin",
    errPrefix: "Prania nuk u regjistrua:",
    err_not_signed_in: "Të lutem hyr fillimisht.",
    err_not_a_teacher: "Ky nuk është llogari mësuesi.",
    err_invalid_code: "Kodi QR nuk njihet — kontrollo lidhjen.",
    err_not_training_day: "Sot nuk është ditë trajnimi e planifikuar për këtë forum.",
    err_wrong_school: "Ky forum i përket një shkolle tjetër.",
    err_workshop_closed: "Forumi është i mbyllur.",
    err_default: "Diçka shkoi keq. Provo përsëri.",
    goLogin: "Hyr",
  },
} as const;

export default function AttendPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [lang] = useState<"ar" | "sq">(() => {
    if (typeof window === "undefined") return "sq";
    try {
      const saved = localStorage.getItem("workshop_lang");
      const hasChosenLanguage = localStorage.getItem("workshop_language_preference_v2") === "1";
      return hasChosenLanguage && saved === "ar" ? "ar" : "sq";
    } catch {
      return "sq";
    }
  });
  const T = UI[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [state, setState] = useState<"checking" | "ok" | "error">("checking");
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [loginUrl, setLoginUrl] = useState(`/login?redirectTo=${encodeURIComponent(`/workshop/attend/${code}`)}`);
  const [errKey, setErrKey] = useState<string>("default");

  useEffect(() => {
    (async () => {
      const supa = createClient();
      const returnPath = `/workshop/attend/${code}`;
      const [{ data: { user } }, metaResponse] = await Promise.all([
        supa.auth.getUser(),
        fetch(`/api/workshop-attend/${code}`, { cache: "no-store" }),
      ]);
      const meta = await metaResponse.json().catch(() => ({}));
      const resolvedLoginUrl = meta.school_slug
        ? `/schools/${encodeURIComponent(meta.school_slug)}/login?redirectTo=${encodeURIComponent(returnPath)}&signupTo=${encodeURIComponent(`/schools/${meta.school_slug}/signup`)}`
        : `/login?redirectTo=${encodeURIComponent(returnPath)}`;
      setLoginUrl(resolvedLoginUrl);
      if (!user) {
        router.replace(resolvedLoginUrl);
        return;
      }
      try {
        const r = await fetch(`/api/workshop-attend/${code}`, { method: "POST" });
        const d = await r.json().catch(() => ({}));
        if (r.ok) {
          setWorkshopTitle(d.workshop_title ?? "");
          setWorkshopId(d.workshop_id ?? "");
          setState("ok");
          return;
        }
        setErrKey(String(d.error ?? "default"));
        setState("error");
      } catch {
        setErrKey("default");
        setState("error");
      }
    })();
  }, [code, router]);

  const errMsg =
    ("err_" + errKey) in T
      ? String(T["err_" + errKey as keyof typeof T])
      : T.err_default;

  return (
    <div className="wa-page" dir={dir}>
      <div className="wa-card">
        {state === "checking" && (
          <>
            <div className="wa-spinner" aria-hidden />
            <p className="wa-msg">{T.checking}</p>
          </>
        )}

        {state === "ok" && (
          <>
            <div className="wa-check" aria-hidden>✓</div>
            <h1 className="wa-title">{T.success(workshopTitle)}</h1>
            <Link href={workshopId ? `/teacher/workshops/${workshopId}` : "/teacher/workshops"} className="wa-btn">{T.successCta}</Link>
          </>
        )}

        {state === "error" && (
          <>
            <div className="wa-x" aria-hidden>×</div>
            <h1 className="wa-title-err">{T.errPrefix}</h1>
            <p className="wa-err-msg">{errMsg}</p>
            {errKey === "not_signed_in" && (
              <Link href={loginUrl} className="wa-btn">
                {T.goLogin}
              </Link>
            )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        html, body { background: linear-gradient(160deg,#F7EFDD 0%,#EEE1C2 100%); min-height: 100vh; margin: 0; }
        .wa-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: 'Cairo', 'Tajawal', sans-serif; }
        .wa-card { width: 100%; max-width: 400px; background: #FFFBF5; border: 1.5px solid #B8A082; border-radius: 22px; padding: 40px 28px; text-align: center; box-shadow: 0 20px 60px rgba(150,115,50,0.20), inset 0 0 0 4px #E5E0D5, inset 0 0 0 5.5px rgba(194,160,89,0.4); }
        .wa-spinner { width: 44px; height: 44px; border: 3px solid rgba(184,155,94,0.24); border-top-color: #6B1E2D; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 18px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .wa-check { width: 68px; height: 68px; border-radius: 50%; background: rgba(76,107,60,0.14); color: #1B5E20; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 44px; font-weight: 900; }
        .wa-x { width: 68px; height: 68px; border-radius: 50%; background: rgba(163,59,46,0.14); color: #A33B2E; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 900; line-height: 1; }
        .wa-title { font-size: 18px; font-weight: 900; color: #32101A; margin: 8px 0 12px; line-height: 1.5; }
        .wa-title-err { font-size: 15px; font-weight: 900; color: #6B1E2D; margin: 8px 0 6px; }
        .wa-msg { font-size: 14px; color: #6B1E2D; margin: 0; }
        .wa-err-msg { font-size: 13px; color: #5A1818; margin: 4px 0 18px; line-height: 1.75; }
        .wa-btn { display: inline-block; background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; padding: 10px 22px; border-radius: 12px; font-family: inherit; font-size: 13.5px; font-weight: 900; text-decoration: none; letter-spacing: 0.02em; box-shadow: 0 6px 16px rgba(0,0,0,0.14); }
      `}</style>
    </div>
  );
}
