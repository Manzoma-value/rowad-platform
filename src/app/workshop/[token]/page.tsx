"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Public signup landing scanned from the workshop QR. Teachers land here,
// enter email + password + name, and are redirected into the platform to
// complete their teacher application.

const UI = {
  ar: {
    title: "التسجيل في الورشة",
    sub: "أدخل بياناتك للانضمام. سنقوم بإنشاء حسابك مباشرة، ثم ستكمل نموذج التقديم.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submit: "متابعة",
    submitting: "جارٍ الإنشاء…",
    successGoing: "تم إنشاء الحساب — جارٍ تسجيل الدخول…",
    checkingAccount: "جارٍ التحقق من حسابك…",
    joiningWorkshop: "جارٍ ربط حسابك بالورشة…",
    loginAgain: "تسجيل الدخول بحساب آخر",
    err_missing_fields: "الرجاء تعبئة جميع الحقول.",
    err_weak_password: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    err_invalid_email: "البريد الإلكتروني غير صحيح.",
    err_email_taken: "هذا البريد مسجَّل بالفعل — سجّل الدخول من الصفحة الرئيسية.",
    err_invalid_token: "رابط الورشة غير صحيح.",
    err_workshop_closed: "هذه الورشة مغلقة حالياً.",
    err_not_teacher: "هذا الحساب ليس حساب معلم. سجّل الدخول بحساب معلم للانضمام إلى الورشة.",
    err_account_inactive: "حساب المعلم معطّل حالياً. تواصل مع إدارة المدرسة.",
    err_school_mismatch: "حسابك مرتبط بمدرسة أخرى ولا يمكن ربطه بهذه الورشة.",
    err_default: "تعذر إنشاء الحساب. حاول مرة أخرى.",
    footer: "منظومة · Manzoma",
  },
  sq: {
    title: "Regjistrimi në Forum",
    sub: "Fut të dhënat për t'u bashkuar. Do të krijojmë llogarinë menjëherë, pastaj do të plotësosh formularin e aplikimit.",
    fullName: "Emri i plotë",
    email: "E-mail",
    password: "Fjalëkalimi",
    submit: "Vazhdo",
    submitting: "Po krijohet…",
    successGoing: "Llogaria u krijua — po hyn…",
    checkingAccount: "Po kontrollojmë llogarinë…",
    joiningWorkshop: "Po lidhim llogarinë me forumin…",
    loginAgain: "Hyni me një llogari tjetër",
    err_missing_fields: "Të lutem plotëso të gjitha fushat.",
    err_weak_password: "Fjalëkalimi duhet të ketë të paktën 8 karaktere.",
    err_invalid_email: "E-mail-i nuk është i saktë.",
    err_email_taken: "Ky e-mail është regjistruar tashmë — hyr nga faqja kryesore.",
    err_invalid_token: "Lidhja e forumit nuk është e vlefshme.",
    err_workshop_closed: "Ky forum është i mbyllur.",
    err_not_teacher: "Kjo nuk është llogari mësuesi. Hyni me një llogari mësuesi.",
    err_account_inactive: "Llogaria e mësuesit është çaktivizuar. Kontaktoni administratën.",
    err_school_mismatch: "Llogaria juaj i përket një shkolle tjetër dhe nuk mund të lidhet me këtë forum.",
    err_default: "Krijimi dështoi. Provo përsëri.",
    footer: "Manzoma",
  },
} as const;

function workshopLoginUrl(token: string) {
  const workshopPath = `/workshop/${encodeURIComponent(token)}`;
  const params = new URLSearchParams({
    redirectTo: workshopPath,
    signupTo: `${workshopPath}?mode=signup`,
  });
  return `/login?${params.toString()}`;
}

export default function WorkshopSignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [lang, setLang] = useState<"ar" | "sq">(() => {
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

  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [entryMode, setEntryMode] = useState<"checking" | "signup" | "error">("checking");
  const [entryError, setEntryError] = useState("");

  // Persist language preference on this device.
  useEffect(() => {
    try {
      localStorage.setItem("workshop_lang", lang);
      localStorage.setItem("workshop_language_preference_v2", "1");
    } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntryMode("signup");
      return;
    }

    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(workshopLoginUrl(token));
        return;
      }

      const response = await fetch("/api/workshop-enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace(workshopLoginUrl(token));
        return;
      }
      if (!response.ok) {
        const key = `err_${data.error ?? "default"}`;
        setEntryError((T as Record<string, string>)[key] ?? T.err_default);
        setEntryMode("error");
        return;
      }

      if (data.onboarding_status === "PENDING_APPLICATION") {
        window.location.replace("/teacher/application");
      } else if (data.onboarding_status === "UNDER_REVIEW" || data.onboarding_status === "WAITING_LIST") {
        window.location.replace("/teacher/under-review");
      } else if (data.onboarding_status === "REJECTED") {
        window.location.replace("/teacher/rejected");
      } else {
        window.location.replace(data.workshop_id ? `/teacher/workshops/${data.workshop_id}` : "/teacher");
      }
    })().catch(() => {
      setEntryError(T.err_default);
      setEntryMode("error");
    });
  }, [T, router, token]);

  async function loginWithAnotherAccount() {
    await createClient().auth.signOut();
    router.replace(workshopLoginUrl(token));
  }

  async function submit() {
    setErr(null);
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setErr(T.err_missing_fields); return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/workshop-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form, email: form.email.trim().toLowerCase() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const key = ("err_" + (d.error ?? "default")) as keyof typeof T;
        setErr((T as Record<string, string>)[key] ?? T.err_default);
        setSubmitting(false);
        return;
      }

      // Auto-login via Supabase and route into the app.
      const supa = createClient();
      const { error: signInErr } = await supa.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (signInErr) {
        // Fallback — send them to the login page.
        router.replace(workshopLoginUrl(token));
        return;
      }
      setDone(true);
      // Use a full navigation so the new auth cookie is available before the
      // application route guard runs. The short QR form is only account setup;
      // the full application is always the next screen.
      setTimeout(() => window.location.replace("/teacher/application"), 400);
    } catch {
      setErr(T.err_default);
      setSubmitting(false);
    }
  }

  if (entryMode !== "signup") {
    return (
      <div
        dir={dir}
        style={{
          minHeight: "100vh", display: "grid", placeItems: "center", padding: 20,
          background: "linear-gradient(160deg,#F7EFDD 0%,#EEE1C2 100%)", fontFamily: "'Cairo','Tajawal',sans-serif",
        }}
      >
        <div style={{ width: "min(440px,100%)", padding: "36px 28px", textAlign: "center", borderRadius: 20, background: "#FFFBF5", border: "1.5px solid #B8A082", boxShadow: "0 20px 60px rgba(150,115,50,.18)" }}>
          <div style={{ color: "#6B1E2D", fontSize: 28, marginBottom: 10 }}>✦</div>
          <h1 style={{ margin: "0 0 10px", color: "#32101A", fontSize: 22 }}>
            {entryMode === "checking" ? T.checkingAccount : T.title}
          </h1>
          <p style={{ margin: 0, color: "#6B1E2D", lineHeight: 1.8, fontSize: 13 }}>
            {entryMode === "checking" ? T.joiningWorkshop : entryError}
          </p>
          {entryMode === "error" && (
            <button
              type="button"
              onClick={() => void loginWithAnotherAccount()}
              style={{ width: "100%", marginTop: 20, padding: 12, border: 0, borderRadius: 12, cursor: "pointer", background: "linear-gradient(180deg,#5B1526,#32101A)", color: "#D9C9B0", fontFamily: "inherit", fontWeight: 800 }}
            >
              {T.loginAgain}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page" dir={dir}>
      <div className="ws-lang">
        <button className={lang === "ar" ? "on" : ""} onClick={() => setLang("ar")}>عربي</button>
        <button className={lang === "sq" ? "on" : ""} onClick={() => setLang("sq")}>Shqip</button>
      </div>

      <div className="ws-card">
        <div className="ws-mark" aria-hidden>✦</div>
        <h1 className="ws-title">{T.title}</h1>
        <p className="ws-sub">{T.sub}</p>

        <label className="ws-lbl">{T.fullName}</label>
        <input
          className="ws-input"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          autoComplete="name"
          autoFocus
        />

        <label className="ws-lbl">{T.email}</label>
        <input
          className="ws-input"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
          dir="ltr"
        />

        <label className="ws-lbl">{T.password}</label>
        <div className="ws-password-wrap">
          <input
            className="ws-input ws-password-input"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            dir="ltr"
            minLength={8}
          />
          <button
            type="button"
            className="ws-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12a11.7 11.7 0 0 1 5.06-5.94" />
                <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                <path d="M3 3l18 18" />
                <path d="M9.9 4.24A10.77 10.77 0 0 1 12 4c5 0 9.27 3.11 11 8a11.76 11.76 0 0 1-2.23 3.4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {err && <div className="ws-err">{err}</div>}

        <button
          className="ws-btn"
          onClick={submit}
          disabled={submitting || done}
        >
          {done ? T.successGoing : submitting ? T.submitting : T.submit}
        </button>

        <div className="ws-footer">{T.footer}</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        html, body { background: linear-gradient(160deg,#F7EFDD 0%,#EEE1C2 100%); min-height: 100vh; margin: 0; }
        .ws-page { min-height: 100vh; padding: 24px 16px 40px; font-family: 'Cairo', 'Tajawal', sans-serif; display: flex; flex-direction: column; align-items: center; }
        .ws-lang { display: flex; gap: 6px; align-self: flex-end; margin-bottom: 16px; }
        .ws-lang button { background: rgba(255,255,255,0.6); border: 1px solid rgba(184,155,94,0.32); color: #6B1E2D; padding: 6px 14px; border-radius: 99px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
        .ws-lang button.on { background: #1A1A1A; color: #B8A082; border-color: transparent; }

        .ws-card { width: 100%; max-width: 440px; background: #FFFBF5; border: 1.5px solid #B8A082; border-radius: 20px; padding: 34px 26px 26px; box-shadow: 0 20px 60px rgba(150,115,50,0.18), inset 0 0 0 4px #E5E0D5, inset 0 0 0 5.5px rgba(194,160,89,0.4); }
        .ws-mark { text-align: center; font-size: 26px; color: #6B1E2D; margin-bottom: 6px; }
        .ws-title { text-align: center; font-size: 24px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .ws-sub { text-align: center; font-size: 13px; color: #6B1E2D; line-height: 1.85; margin: 0 0 20px; }
        .ws-lbl { display: block; font-size: 12px; font-weight: 800; color: #6B1E2D; margin: 12px 0 4px; letter-spacing: 0.02em; }
        .ws-input { width: 100%; padding: 11px 14px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 11px; font-family: inherit; font-size: 14px; background: #FFF; outline: none; transition: border-color .15s; }
        .ws-input:focus { border-color: #B8A082; }
        .ws-password-wrap { position: relative; }
        .ws-password-input { padding-inline-end: 48px; }
        .ws-eye-btn { position: absolute; top: 50%; inset-inline-end: 10px; transform: translateY(-50%); width: 34px; height: 34px; border: 0; border-radius: 9px; background: transparent; color: #8F765B; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .ws-eye-btn:hover { background: rgba(194,160,89,0.10); color: #4A0E1C; }
        .ws-err { background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.32); color: #6B1E2D; font-weight: 700; font-size: 12.5px; padding: 8px 12px; border-radius: 10px; margin-top: 12px; }
        .ws-btn { display: block; width: 100%; margin-top: 18px; background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 12px; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 900; cursor: pointer; letter-spacing: 0.02em; box-shadow: 0 8px 20px rgba(0,0,0,0.14); }
        .ws-btn:disabled { opacity: 0.6; cursor: progress; }
        .ws-footer { text-align: center; font-size: 10.5px; color: #8F765B; margin-top: 18px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 800; }
      `}</style>
    </div>
  );
}
