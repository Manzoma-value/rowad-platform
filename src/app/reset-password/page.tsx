"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    eyebrow: "تعيين كلمة مرور جديدة",
    title: "كلمة المرور الجديدة",
    sub: "اختر كلمة مرور قوية لحسابك.",
    newPwLabel: "كلمة المرور الجديدة",
    newPwPh: "8 أحرف على الأقل",
    newPwHint: "يُنصح باستخدام حروف كبيرة وأرقام ورموز",
    confirmLabel: "تأكيد كلمة المرور",
    confirmPh: "أعد كتابة كلمة المرور",
    btn: "تعيين كلمة المرور",
    loading: "جارٍ الحفظ...",
    backToLogin: "العودة إلى تسجيل الدخول",
    // validation
    pwRequired: "كلمة المرور مطلوبة",
    pwMin: "يجب أن تكون 8 أحرف على الأقل",
    pwMismatch: "كلمتا المرور غير متطابقتين",
    // strength
    pwWeak: "ضعيفة",
    pwFair: "مقبولة",
    pwGood: "جيدة",
    pwStrong: "قوية",
    // success
    doneTitle: "تم تعيين كلمة المرور بنجاح",
    doneSub: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    doneBtn: "تسجيل الدخول",
    // errors
    errNoSession: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.",
    errServer: "حدث خطأ، حاول مرة أخرى",
    errExpiredLink: "انتهت صلاحية الرابط. اطلب رابطًا جديدًا.",
    errSamePassword: "كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة",
    tryAgain: "طلب رابط جديد",
    redirecting: "جارٍ التحويل إلى تسجيل الدخول...",
  },
  sq: {
    eyebrow: "Cakto fjalëkalim të ri",
    title: "Fjalëkalimi i ri",
    sub: "Zgjidhni një fjalëkalim të fortë për llogarinë tuaj.",
    newPwLabel: "Fjalëkalimi i ri",
    newPwPh: "Minimum 8 karaktere",
    newPwHint: "Rekomandohet shkronja të mëdha, numra dhe simbole",
    confirmLabel: "Konfirmo fjalëkalimin",
    confirmPh: "Rishkruani fjalëkalimin",
    btn: "Cakto fjalëkalimin",
    loading: "Duke ruajtur...",
    backToLogin: "Kthehu te hyrja",
    // validation
    pwRequired: "Fjalëkalimi është i detyrueshëm",
    pwMin: "Duhet të ketë të paktën 8 karaktere",
    pwMismatch: "Fjalëkalimet nuk përputhen",
    // strength
    pwWeak: "E dobët",
    pwFair: "E pranueshme",
    pwGood: "E mirë",
    pwStrong: "E fortë",
    // success
    doneTitle: "Fjalëkalimi u caktua me sukses",
    doneSub: "Tani mund të hyni me fjalëkalimin tuaj të ri.",
    doneBtn: "Hyr në llogari",
    // errors
    errNoSession: "Linku i rivendosjes është i pavlefshëm ose ka skaduar.",
    errServer: "Ndodhi një gabim, provoni përsëri",
    errExpiredLink: "Linku ka skaduar. Kërkoni një link të ri.",
    errSamePassword: "Fjalëkalimi i ri duhet të jetë i ndryshëm nga i vjetri",
    tryAgain: "Kërko link të ri",
    redirecting: "Duke ju ridrejtuar te hyrja...",
  },
} as const;

function PasswordStrength({ password, lang }: { password: string; lang: "ar" | "sq" }) {
  if (!password) return null;
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const T = S[lang];
  const labels = ["", T.pwWeak, T.pwFair, T.pwGood, T.pwStrong];
  const colors = ["", "#7A1E1E", "#C8A96A", "#A8863E", "#2D8A4A"];
  return (
    <div className="rp-strength">
      <div className="rp-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rp-strength-bar" style={{ background: i <= score ? colors[score] : "#E4DDD0" }} />
        ))}
      </div>
      <span className="rp-strength-label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    // Verify there is an active session from the recovery link
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
    });
  }, []);

  const validate = () => {
    const e: { pw?: string; confirm?: string } = {};
    if (!password) e.pw = T.pwRequired;
    else if (password.length < 8) e.pw = T.pwMin;
    if (confirm !== password) e.confirm = T.pwMismatch;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setGlobalError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const msg = error.message.toLowerCase();
        // Supabase 422: "New password should be different from the old password"
        const isSame =
          msg.includes("different") ||
          msg.includes("same") ||
          msg.includes("should be different");
        const isExpired = msg.includes("expired") || msg.includes("invalid");
        if (isSame) setGlobalError(T.errSamePassword);
        else if (isExpired) setGlobalError(T.errExpiredLink);
        else setGlobalError(T.errServer);
        return;
      }
      // CRITICAL: sign out so the user must log in with the new password.
      // Without this, the user stays authenticated and the proxy redirects
      // them straight to their role dashboard, skipping login entirely.
      await supabase.auth.signOut();
      setDone(true);
      // Hard navigation to clear any cached auth state, then redirect to login
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch {
      setGlobalError(T.errServer);
    } finally {
      setLoading(false);
    }
  };

  // No session = the recovery link was invalid or already used
  if (sessionReady === false) {
    return (
      <div className="rp-shell" dir={dir}>
        <style>{css}</style>
        <div className="rp-center">
          <div className="rp-card rp-card--error">
            <div className="rp-error-icon">🔗</div>
            <h1 className="rp-title">{T.errNoSession}</h1>
            <Link href="/forgot-password" className="rp-btn rp-btn--dark">{T.tryAgain}</Link>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (done) {
    return (
      <div className="rp-shell" dir={dir}>
        <style>{css}</style>
        <div className="rp-center">
          <div className="rp-card rp-card--success">
            <div className="rp-success-icon">
              <svg width="48" height="48" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="32" stroke="rgba(45,138,74,0.2)" strokeWidth="2" fill="none" />
                <circle cx="36" cy="36" r="32" stroke="#2D8A4A" strokeWidth="2.5" fill="none"
                  strokeLinecap="round" strokeDasharray="201" strokeDashoffset="0"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "36px 36px" }} />
                <polyline points="22,36 31,45 50,27" stroke="#2D8A4A" strokeWidth="3"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="rp-title rp-title--success">{T.doneTitle}</h1>
            <p className="rp-sub">{T.doneSub}</p>
            <p className="rp-sub" style={{ fontSize: 12, fontStyle: "italic", marginTop: -8 }}>
              {T.redirecting}
            </p>
            <a
              href="/login"
              className="rp-btn rp-btn--gold"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/login";
              }}
            >
              {T.doneBtn}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-shell" dir={dir}>
      <nav className="rp-nav">
        <Link href="/login" className="rp-nav-back">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            {dir === "rtl"
              ? <path d="M19 12H5M12 5l7 7-7 7" />
              : <path d="M5 12h14M12 5l-7 7 7 7" />}
          </svg>
          {T.backToLogin}
        </Link>
      </nav>

      <div className="rp-center">
        <div className="rp-card">
          <p className="rp-eyebrow">{T.eyebrow}</p>
          <h1 className="rp-title">{T.title}</h1>
          <p className="rp-sub">{T.sub}</p>

          <div className="rp-rule">
            <div className="rp-rule-line" /><div className="rp-rule-diamond" /><div className="rp-rule-line" />
          </div>

          {/* New password */}
          <div className="rp-field">
            <label className="rp-label">{T.newPwLabel}</label>
            <span className="rp-hint">{T.newPwHint}</span>
            <div className="rp-input-wrap">
              <input
                className={`rp-input${errors.pw ? " rp-input--error" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder={T.newPwPh}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((v) => ({ ...v, pw: undefined })); }}
                dir="ltr"
                autoComplete="new-password"
              />
              <button type="button" className="rp-eye" onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
                {showPw
                  ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /></svg>
                  : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>
            {errors.pw && <span className="rp-field-err">{errors.pw}</span>}
          </div>

          <PasswordStrength password={password} lang={lang === "sq" ? "sq" : "ar"} />

          {/* Confirm password */}
          <div className="rp-field">
            <label className="rp-label">{T.confirmLabel}</label>
            <div className="rp-input-wrap">
              <input
                className={`rp-input${errors.confirm ? " rp-input--error" : ""}`}
                type={showConfirm ? "text" : "password"}
                placeholder={T.confirmPh}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors((v) => ({ ...v, confirm: undefined })); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                dir="ltr"
                autoComplete="new-password"
              />
              <button type="button" className="rp-eye" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                {showConfirm
                  ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /></svg>
                  : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>
            {errors.confirm && <span className="rp-field-err">{errors.confirm}</span>}
          </div>

          {globalError && (
            <div className="rp-global-err">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
              </svg>
              {globalError}
              {globalError === T.errExpiredLink && (
                <Link href="/forgot-password" className="rp-try-again">{T.tryAgain}</Link>
              )}
            </div>
          )}

          <button className="rp-btn rp-btn--dark" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="rp-spin" />{T.loading}</> : T.btn}
          </button>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes rp-spin{to{transform:rotate(360deg)}}
@keyframes pop{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}

:root{
  --gold:#C8A96A;--gold2:#E5B93C;
  --black:#0B0B0C;--text:#1E1C18;--text2:#3A3020;--text3:#8A7860;
  --surface:#FFFFFF;--bg:#F5F3EE;--border:#E4DDD0;
  --red:#7A1E1E;--red-l:rgba(122,30,30,0.07);--red-b:rgba(122,30,30,0.2);
  --font:'Cairo',sans-serif;
}

.rp-shell{min-height:100vh;background:var(--bg);font-family:var(--font);display:flex;flex-direction:column}

.rp-nav{height:56px;padding:0 24px;display:flex;align-items:center;background:rgba(245,243,238,0.92);backdrop-filter:blur(14px);border-bottom:1px solid rgba(200,169,106,0.12)}
.rp-nav-back{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text3);text-decoration:none;transition:color 0.15s}
.rp-nav-back:hover{color:var(--text2)}

.rp-center{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 16px}

.rp-card{
  background:var(--surface);border:1px solid var(--border);border-radius:20px;
  padding:40px 36px;width:100%;max-width:420px;
  display:flex;flex-direction:column;gap:16px;
  box-shadow:0 6px 32px rgba(11,11,12,0.07);
  animation:fadeUp 0.35s ease;
}
.rp-card--success{
  border-color:rgba(45,138,74,0.2);
  box-shadow:0 6px 32px rgba(45,138,74,0.08);
  text-align:center;align-items:center;
  animation:pop 0.4s cubic-bezier(0.22,1,0.36,1);
}
.rp-card--error{
  text-align:center;align-items:center;
  animation:pop 0.35s ease;
}

.rp-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}
.rp-title{font-size:22px;font-weight:900;color:var(--black);letter-spacing:-0.3px;margin-top:-4px}
.rp-title--success{color:#1a6b3c}
.rp-sub{font-size:13.5px;color:var(--text3);line-height:1.65;margin-top:-4px}

.rp-rule{display:flex;align-items:center;gap:10px;margin:4px 0}
.rp-rule-line{flex:1;height:1px;background:var(--border)}
.rp-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.5;flex-shrink:0}

.rp-field{display:flex;flex-direction:column;gap:5px}
.rp-label{font-size:12.5px;font-weight:700;color:var(--text2)}
.rp-hint{font-size:11.5px;color:var(--text3);margin-top:-2px}
.rp-input-wrap{position:relative}
.rp-input{
  width:100%;padding:11px 40px 11px 14px;border:1.5px solid var(--border);border-radius:10px;
  font-family:var(--font);font-size:14px;color:var(--text);background:#FAFAF7;
  outline:none;transition:border-color 0.15s,box-shadow 0.15s;
}
.rp-input:focus{border-color:rgba(200,169,106,0.5);box-shadow:0 0 0 3px rgba(200,169,106,0.1);background:var(--surface)}
.rp-input--error{border-color:var(--red-b);background:var(--red-l)}
.rp-eye{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text3);display:flex;padding:2px;transition:color 0.15s}
.rp-eye:hover{color:var(--text2)}
.rp-field-err{font-size:11.5px;font-weight:600;color:var(--red)}

.rp-strength{display:flex;align-items:center;gap:10px;margin-top:-8px}
.rp-strength-bars{display:flex;gap:4px;flex:1}
.rp-strength-bar{flex:1;height:3px;border-radius:99px;transition:background 0.3s}
.rp-strength-label{font-size:11.5px;font-weight:700;min-width:36px;text-align:start}

.rp-global-err{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  background:var(--red-l);border:1px solid var(--red-b);border-radius:9px;
  padding:10px 14px;font-size:13px;color:var(--red);font-weight:600;
}
.rp-try-again{margin-inline-start:4px;color:var(--red);font-weight:800;text-decoration:underline;cursor:pointer}

.rp-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 24px;border-radius:11px;
  font-family:var(--font);font-size:14px;font-weight:800;
  cursor:pointer;transition:all 0.18s;border:1px solid;text-decoration:none;
}
.rp-btn--dark{background:var(--black);color:var(--gold);border-color:rgba(200,169,106,0.25);width:100%}
.rp-btn--dark:hover:not(:disabled){background:#1a1a1e;border-color:rgba(200,169,106,0.5);color:var(--gold2)}
.rp-btn--dark:disabled{opacity:0.45;cursor:not-allowed}
.rp-btn--gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--black);border-color:transparent}
.rp-btn--gold:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(200,169,106,0.35)}

.rp-spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(200,169,106,0.25);border-top-color:var(--gold);border-radius:50%;animation:rp-spin 0.65s linear infinite;flex-shrink:0}

.rp-success-icon{margin-bottom:4px}
.rp-error-icon{font-size:48px;margin-bottom:4px}

@media(max-width:480px){
  .rp-card{padding:32px 24px;border-radius:16px}
}
`;
