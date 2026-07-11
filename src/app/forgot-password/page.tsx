"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    eyebrow: "استعادة الوصول",
    title: "نسيت كلمة المرور؟",
    sub: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.",
    emailLabel: "البريد الإلكتروني",
    emailPh: "example@email.com",
    btn: "إرسال رابط الاستعادة",
    loading: "جارٍ الإرسال...",
    backToLogin: "العودة إلى تسجيل الدخول",
    sentTitle: "تحقق من بريدك الإلكتروني",
    sentMsg: "أرسلنا رابط إعادة تعيين كلمة المرور إلى",
    sentNote: "الرابط صالح لمدة ساعة واحدة. تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تجده.",
    sentBtn: "الانتقال إلى تسجيل الدخول",
    errEmpty: "يرجى إدخال البريد الإلكتروني",
    errInvalid: "صيغة البريد الإلكتروني غير صحيحة",
    errServer: "تعذر الإرسال، حاول مرة أخرى",
  },
  sq: {
    eyebrow: "Rikthim aksesi",
    title: "Keni harruar fjalëkalimin?",
    sub: "Shkruani email-in tuaj dhe do t'ju dërgojmë një link për të rivendosur fjalëkalimin.",
    emailLabel: "Email",
    emailPh: "shembull@email.com",
    btn: "Dërgo linkun e rivendosjes",
    loading: "Duke dërguar...",
    backToLogin: "Kthehu te hyrja",
    sentTitle: "Kontrolloni emailin tuaj",
    sentMsg: "Kemi dërguar një link rivendosjeje në",
    sentNote: "Linku është i vlefshëm për një orë. Kontrolloni dosjen spam nëse nuk e gjeni mesazhin.",
    sentBtn: "Shko te hyrja",
    errEmpty: "Ju lutemi shkruani email-in tuaj",
    errInvalid: "Formati i email-it është i pasaktë",
    errServer: "Dërgimi dështoi, provoni përsëri",
  },
} as const;

export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async () => {
    if (!email.trim()) { setError(T.errEmpty); return; }
    if (!isValid) { setError(T.errInvalid); return; }
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = window.location.origin;
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${siteUrl}/auth/callback` },
      );
      if (sbError) { setError(T.errServer); return; }
      setSent(true);
    } catch {
      setError(T.errServer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-shell" dir={dir}>
      <nav className="fp-nav">
        <Link href="/login" className="fp-nav-back">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            {dir === "rtl"
              ? <path d="M19 12H5M12 5l7 7-7 7" />
              : <path d="M5 12h14M12 5l-7 7 7 7" />}
          </svg>
          {T.backToLogin}
        </Link>
      </nav>

      <div className="fp-center">
        {sent ? (
          <div className="fp-card fp-card--sent">
            <div className="fp-sent-icon">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#B8A082" strokeWidth={1.4}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="fp-title">{T.sentTitle}</h1>
            <p className="fp-sent-msg">
              {T.sentMsg}{" "}
              <strong className="fp-sent-addr" dir="ltr">{email.trim()}</strong>
            </p>
            <p className="fp-sent-note">{T.sentNote}</p>
            <Link href="/login" className="fp-btn fp-btn--gold">{T.sentBtn}</Link>
          </div>
        ) : (
          <div className="fp-card">
            <p className="fp-eyebrow">{T.eyebrow}</p>
            <h1 className="fp-title">{T.title}</h1>
            <p className="fp-sub">{T.sub}</p>

            <div className="fp-rule">
              <div className="fp-rule-line" />
              <div className="fp-rule-diamond" />
              <div className="fp-rule-line" />
            </div>

            <div className="fp-field">
              <label className="fp-label">{T.emailLabel}</label>
              <input
                className={`fp-input${error ? " fp-input--error" : isValid && email ? " fp-input--ok" : ""}`}
                type="email"
                placeholder={T.emailPh}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                dir="ltr"
                autoComplete="email"
              />
              {error && (
                <span className="fp-field-err">
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </span>
              )}
            </div>

            <button className="fp-btn fp-btn--dark" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <><span className="fp-spin" />{T.loading}</>
              ) : T.btn}
            </button>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fp-spin{to{transform:rotate(360deg)}}
@keyframes pop{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}

:root{
  --gold:#B8A082;--gold2:#B8A082;
  --black:#4A0E1C;--text:#1A1A1A;--text2:#4A0E1C;--text3:#796A62;
  --surface:#FFFFFF;--bg:#F7F3EB;--border:#E5E0D5;
  --red:#6B1E2D;--red-l:rgba(107,30,45,0.07);--red-b:rgba(107,30,45,0.2);
  --font:'Cairo',sans-serif;
}

.fp-shell{min-height:100vh;background:var(--bg);font-family:var(--font);display:flex;flex-direction:column}

.fp-nav{height:56px;padding:0 24px;display:flex;align-items:center;background:rgba(245,243,238,0.92);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,160,130,0.12)}
.fp-nav-back{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text3);text-decoration:none;transition:color 0.15s}
.fp-nav-back:hover{color:var(--text2)}

.fp-center{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 16px}

.fp-card{
  background:var(--surface);border:1px solid var(--border);border-radius:20px;
  padding:40px 36px;width:100%;max-width:420px;
  display:flex;flex-direction:column;gap:16px;
  box-shadow:0 6px 32px rgba(11,11,12,0.07);
  animation:fadeUp 0.35s ease;
}
.fp-card--sent{
  border-color:rgba(184,160,130,0.25);
  box-shadow:0 6px 32px rgba(184,160,130,0.1);
  animation:pop 0.4s cubic-bezier(0.22,1,0.36,1);
  text-align:center;align-items:center;
}

.fp-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}
.fp-title{font-size:22px;font-weight:900;color:var(--black);letter-spacing:-0.3px;margin-top:-4px}
.fp-sub{font-size:13.5px;color:var(--text3);line-height:1.65;margin-top:-4px}

.fp-rule{display:flex;align-items:center;gap:10px;margin:4px 0}
.fp-rule-line{flex:1;height:1px;background:var(--border)}
.fp-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.5;flex-shrink:0}

.fp-field{display:flex;flex-direction:column;gap:6px}
.fp-label{font-size:12.5px;font-weight:700;color:var(--text2)}
.fp-input{
  padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;
  font-family:var(--font);font-size:16px;color:var(--text);background:#FAFAF7;
  outline:none;transition:border-color 0.15s,box-shadow 0.15s;width:100%;
}
.fp-input:focus{border-color:rgba(184,160,130,0.5);box-shadow:0 0 0 3px rgba(184,160,130,0.1);background:var(--surface)}
.fp-input--error{border-color:var(--red-b);background:var(--red-l)}
.fp-input--ok{border-color:rgba(45,138,74,0.4);box-shadow:0 0 0 3px rgba(45,138,74,0.08)}
.fp-field-err{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--red)}

.fp-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 24px;border-radius:11px;
  font-family:var(--font);font-size:14px;font-weight:800;
  cursor:pointer;transition:all 0.18s;border:1px solid;text-decoration:none;
}
.fp-btn--dark{background:var(--black);color:var(--gold);border-color:rgba(184,160,130,0.25);width:100%}
.fp-btn--dark:hover:not(:disabled){background:#1A1A1A;border-color:rgba(184,160,130,0.5);color:var(--gold2)}
.fp-btn--dark:disabled{opacity:0.45;cursor:not-allowed}
.fp-btn--gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--black);border-color:transparent;margin-top:8px}
.fp-btn--gold:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(184,160,130,0.35)}

.fp-spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(184,160,130,0.25);border-top-color:var(--gold);border-radius:50%;animation:fp-spin 0.65s linear infinite;flex-shrink:0}

/* Sent screen */
.fp-sent-icon{width:72px;height:72px;border-radius:50%;background:rgba(184,160,130,0.08);border:1.5px solid rgba(184,160,130,0.2);display:flex;align-items:center;justify-content:center;margin-bottom:4px}
.fp-sent-msg{font-size:14px;color:var(--text3);line-height:1.65}
.fp-sent-addr{color:var(--black);font-weight:800;font-size:13px;font-family:monospace}
.fp-sent-note{font-size:12.5px;color:var(--text3);line-height:1.6;max-width:300px}

@media(max-width:480px){
  .fp-card{padding:32px 24px;border-radius:16px}
}
`;
