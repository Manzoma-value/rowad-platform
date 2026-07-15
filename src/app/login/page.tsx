"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import MandalaLoader from "@/components/MandalaLoader";
import { authPremiumCss } from "@/lib/auth-premium-css";

/* ─── Geometry ─── */
const r2 = (n: number) => Math.round(n * 1000) / 1000;
const STAR_LINES = Array.from({ length: 12 }, (_, i) => {
  const a1 = (i * 30 * Math.PI) / 180;
  const a2 = ((i * 30 + 15) * Math.PI) / 180;
  return { x1: r2(100 + 80 * Math.sin(a1)), y1: r2(100 - 80 * Math.cos(a1)), x2: r2(100 + 40 * Math.sin(a2)), y2: r2(100 - 40 * Math.cos(a2)) };
});
const PETAL_CIRCLES = Array.from({ length: 8 }, (_, i) => { const a = (i * 45 * Math.PI) / 180; return { cx: r2(100 + 52 * Math.sin(a)), cy: r2(100 - 52 * Math.cos(a)) }; });
const INNER_PETALS  = Array.from({ length: 4 }, (_, i) => { const a = (i * 90 * Math.PI) / 180; return { cx: r2(100 + 24 * Math.sin(a)), cy: r2(100 - 24 * Math.cos(a)) }; });

function Mandala({ size = 200, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={className} style={{ width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 200 200" fill="none" width="100%" height="100%">
        <circle cx="100" cy="100" r="92" stroke="#B8A082" strokeWidth="0.3" opacity="0.08"/>
        <circle cx="100" cy="100" r="86" stroke="#B8A082" strokeWidth="0.3" opacity="0.06"/>
        {PETAL_CIRCLES.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r="52" stroke="#B8A082" strokeWidth="0.5" opacity="0.13" fill="none"/>)}
        <circle cx="100" cy="100" r="74" stroke="#B8A082" strokeWidth="0.4" opacity="0.16" strokeDasharray="3 8"/>
        <circle cx="100" cy="100" r="62" stroke="#B8A082" strokeWidth="0.35" opacity="0.13"/>
        <circle cx="100" cy="100" r="50" stroke="#B8A082" strokeWidth="0.5" opacity="0.18" strokeDasharray="5 5"/>
        <circle cx="100" cy="100" r="38" stroke="#B8A082" strokeWidth="0.35" opacity="0.15"/>
        <circle cx="100" cy="100" r="28" stroke="#B8A082" strokeWidth="0.45" opacity="0.22" strokeDasharray="3 4"/>
        <circle cx="100" cy="100" r="18" stroke="#B8A082" strokeWidth="0.35" opacity="0.24"/>
        <circle cx="100" cy="100" r="9"  stroke="#B8A082" strokeWidth="0.55" opacity="0.30"/>
        {STAR_LINES.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#B8A082" strokeWidth="0.35" opacity="0.16"/>)}
        {INNER_PETALS.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r="24" stroke="#B8A082" strokeWidth="0.45" opacity="0.20" fill="none"/>)}
        <line x1="100" y1="73" x2="100" y2="127" stroke="#B8A082" strokeWidth="0.6" opacity="0.24"/>
        <line x1="76"  y1="87" x2="124" y2="113" stroke="#B8A082" strokeWidth="0.6" opacity="0.24"/>
        <line x1="124" y1="87" x2="76"  y2="113" stroke="#B8A082" strokeWidth="0.6" opacity="0.24"/>
        <circle cx="100" cy="100" r="7" fill="none" stroke="#B8A082" strokeWidth="0.7" opacity="0.45"/>
        <circle cx="100" cy="100" r="4" fill="none" stroke="#B8A082" strokeWidth="0.45" opacity="0.55"/>
        <circle cx="100" cy="100" r="2" fill="#B8A082" opacity="0.7"/>
      </svg>
    </div>
  );
}

/* ─── i18n ─── */
const STRINGS = {
  ar: {
    dir: "rtl" as const,
    brand: "بناء الأهلية",
    tagline: "جيل الرواد · تمكين الإنسان · بناء المستقبل",
    albania: "من ألبانيا إلى مستقبلٍ يصنعه الرواد",
    albanianValues: "Dije · Vlerë · E ardhme",
    welcome: "مرحبًا بعودتك",
    loginTitle: "تسجيل الدخول",
    sub: "أدخل بياناتك للوصول إلى لوحتك",
    emailLabel: "البريد الإلكتروني",
    passLabel: "كلمة المرور",
    btn: "دخول",
    loadingBtn: "جارٍ تسجيل الدخول...",
    forgotPw: "نسيت كلمة المرور؟",
    noAccount: "لا تملك حسابًا؟",
    signup: "إنشاء حساب",
    workshopNoAccount: "ليس لديك حساب معلم؟",
    workshopSignup: "أنشئ حسابًا وتابع نموذج التقديم",
    or: "أو",
    errEmpty: "من فضلك أدخل البريد الإلكتروني وكلمة المرور",
    errEmailInvalid: "صيغة البريد الإلكتروني غير صحيحة",
    errWrong: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    errNotConfirmed: "يرجى تأكيد بريدك الإلكتروني أولاً — تحقق من صندوق الوارد وانقر على رابط التأكيد",
    errProfile: "تعذر جلب بيانات الحساب",
    errServer: "تعذر الاتصال بالخادم، حاول مرة أخرى",
    emailSuccess: "بريد إلكتروني صحيح ✓",
    poweredBy: "جميع الحقوق محفوظة © منظومة 2026",
  },
  en: {
    dir: "ltr" as const,
    brand: "Binaa Al-Ahliya",
    tagline: "Pioneers · Empowering people · Building the future",
    albania: "From Albania to a future built by pioneers",
    albanianValues: "Knowledge · Values · Future",
    welcome: "Welcome back",
    loginTitle: "Sign in",
    sub: "Enter your details to access your dashboard",
    emailLabel: "Email",
    passLabel: "Password",
    btn: "Sign in",
    loadingBtn: "Signing in...",
    forgotPw: "Forgot password?",
    noAccount: "Don't have an account?",
    signup: "Create one",
    workshopNoAccount: "Don't have a teacher account?",
    workshopSignup: "Create an account and complete the application",
    or: "or",
    errEmpty: "Please enter your email and password",
    errEmailInvalid: "Invalid email format",
    errWrong: "Incorrect email or password",
    errNotConfirmed: "Please confirm your email first — check your inbox and click the verification link",
    errProfile: "Could not load account data",
    errServer: "Connection failed, please try again",
    emailSuccess: "Valid email ✓",
    poweredBy: "All rights reserved © Manzoma 2026",
  },
} as const;

type Lang = "ar" | "en";
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* ─── Language toggle ─── */
function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="lp-lang-toggle" dir="ltr" role="group" aria-label="Language">
      <span
        className="lp-lang-thumb"
        style={{ transform: lang === "ar" ? "translateX(100%)" : "translateX(0%)" }}
        aria-hidden="true"
      />
      <button
        type="button"
        className={`lp-lang-btn${lang === "en" ? " lp-lang-btn--active" : ""}`}
        onClick={() => onChange("en")}
        aria-pressed={lang === "en"}
        aria-label="English"
      >
        <span className="lp-lang-name">EN</span>
      </button>
      <button
        type="button"
        className={`lp-lang-btn${lang === "ar" ? " lp-lang-btn--active" : ""}`}
        onClick={() => onChange("ar")}
        aria-pressed={lang === "ar"}
        aria-label="العربية"
      >
        <span className="lp-lang-name">AR</span>
      </button>
    </div>
  );
}

/* ─── Rule ─── */
function Rule() {
  return (
    <div className="lp-rule">
      <div className="lp-rule-line"/>
      <div className="lp-rule-diamond"/>
      <div className="lp-rule-line"/>
    </div>
  );
}

export default function LoginPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [capsOn, setCapsOn]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError]       = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [redirectTo, setRedirectTo]     = useState("");
  const [signupTo, setSignupTo]         = useState("");

  const L = STRINGS[lang];

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    // Albanian was previously the second option; if a user has "sq" in
    // localStorage from another page, fall back to Arabic on this one.
    const effectiveLang: Lang = saved === "en" || saved === "ar" ? saved : "ar";
    if (effectiveLang !== "ar") setLang(effectiveLang);
    const params = new URLSearchParams(window.location.search);
    const rd  = params.get("redirectTo") ?? "";
    const su  = params.get("signupTo") ?? "";
    const err = params.get("error") ?? "";
    if (rd.startsWith("/") && !rd.startsWith("//")) setRedirectTo(rd);
    if (su.startsWith("/") && !su.startsWith("//")) setSignupTo(su);
    const isEn = effectiveLang === "en";
    if (err === "link_invalid")       setError(isEn ? "Verification link is invalid or expired" : "رابط التأكيد غير صالح أو منتهي الصلاحية");
    else if (err === "oauth_failed")  setError(isEn ? "Sign-in failed" : "فشل تسجيل الدخول");
    else if (err === "session_error") setError(isEn ? "Session error, please try again" : "حدث خطأ في الجلسة");
  }, []);

  const handleLangChange = (l: Lang) => { setLang(l); setError(""); localStorage.setItem("lang", l); };

  const showEmailError = emailTouched && email.trim().length > 0 && !isValidEmail(email);

  const handleLogin = async () => {
    setError("");
    setEmailTouched(true);
    if (!email.trim() || !password) { setError(L.errEmpty); return; }
    if (!isValidEmail(email))        { setError(L.errEmailInvalid); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError(authError.code === "email_not_confirmed" ? L.errNotConfirmed : L.errWrong);
        return;
      }
      if (!data.user) { setError(L.errWrong); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile) { setError(L.errProfile); return; }
      const roleRoutes: Record<string, string> = { OWNER: "/owner", SCHOOL_ADMIN: "/school-admin", TEACHER: "/teacher", STUDENT: "/student" };
      const dest = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : roleRoutes[profile.role];
      if (dest) {
        // Show the full-screen mandala loader while we navigate.
        setRedirecting(true);
        window.location.href = dest;
      } else {
        setError(lang === "en" ? "Unknown account type: " + profile.role : "نوع الحساب غير معروف: " + profile.role);
      }
    } catch { setError(L.errServer); }
    finally { setLoading(false); }
  };

  // Full-screen mandala while we navigate after successful auth.
  if (redirecting) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse at center, rgba(184,160,130,0.06), transparent 60%), #EFEAE0",
      }}>
        <MandalaLoader
          label={lang === "ar" ? "جارٍ تحويلك..." : "Redirecting..."}
          sublabel={lang === "ar" ? "لحظة من فضلك" : "One moment please"}
        />
      </div>
    );
  }

  return (
    <>
      <main className="lp-shell" dir={L.dir}>
        <div className="lp-identity-watermark" aria-hidden="true"/>
        {/* ── Brand panel ── */}
        <div className="lp-panel">
          <div className="lp-corner lp-corner-tl"/>
          <div className="lp-corner lp-corner-br"/>
          <div className="lp-panel-inner">
            <div className="lp-location" dir="ltr">
              <span className="lp-location-dot"/>
              TIRANË <span>41.3275° N · 19.8187° E</span>
            </div>
            <div className="lp-brand-emblem">
              <Mandala size={176} className="lp-mandala"/>
              <Image src="/newIdentityBG.png" alt="" fill sizes="92px" className="lp-brand-logo" aria-hidden="true" priority />
            </div>
            <div className="lp-brand-text">
              <Rule/>
              <p className="lp-brand-kicker">{L.albania}</p>
              <h2 className="lp-brand-name">{L.brand}</h2>
              <p className="lp-brand-tag">{L.tagline}</p>
              <Rule/>
            </div>
            <div className="lp-albanian-values" dir="ltr">
              <span className="lp-albania-monogram">AL</span>
              <span>{L.albanianValues}</span>
            </div>
            <LangToggle lang={lang} onChange={handleLangChange}/>
            <div className="lp-panel-footer">
              <p className="lp-panel-quote">{L.poweredBy}</p>
            </div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="lp-form-side">
          <div className="lp-form-wrap">
            <div className="lp-form-topline">
              <span className="lp-form-eyebrow">{L.welcome}</span>
              <span className="lp-secure-badge"><i/> SECURE PORTAL</span>
            </div>
            <div className="lp-lang-toggle-mobile">
              <LangToggle lang={lang} onChange={handleLangChange}/>
            </div>
            <div className="lp-form-ornament"><Rule/></div>
            <div className="lp-form-header">
              <h1 className="lp-form-title">{L.loginTitle}</h1>
              <p className="lp-form-sub">{L.sub}</p>
            </div>

            <form
              className="lp-fields"
              onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
              noValidate
            >
              <div className="lp-field">
                <label htmlFor="lp-email" className="lp-label">
                  <span className="lp-label-icon">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  {L.emailLabel}
                </label>
                <input
                  id="lp-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  autoCapitalize="off"
                  className={`lp-input${showEmailError ? " lp-input--error" : ""}`}
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  disabled={loading}
                  dir="ltr"
                  suppressHydrationWarning
                />
                {showEmailError && (
                  <span className="lp-field-msg lp-field-msg--error">{L.errEmailInvalid}</span>
                )}
              </div>

              <div className="lp-field">
                <label htmlFor="lp-password" className="lp-label">
                  <span className="lp-label-icon">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  {L.passLabel}
                </label>
                <div className="lp-input-wrap">
                  <input
                    id="lp-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="lp-input lp-input--with-action"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                    onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                    disabled={loading}
                    dir="ltr"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    className="lp-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {capsOn && password.length > 0 && (
                  <span className="lp-field-msg lp-field-msg--warn">
                    {lang === "ar" ? "Caps Lock مُفعَّل" : "Caps Lock is on"}
                  </span>
                )}
              </div>

              {error && (
                <div className="lp-error" role="alert">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  {error}
                </div>
              )}

              <div style={{ textAlign: "end", marginTop: -6 }}>
                <Link href="/forgot-password" className="lp-forgot">{L.forgotPw}</Link>
              </div>

              <button type="submit" className="lp-btn" disabled={loading}>
                {loading ? <><span className="lp-spin"/>{L.loadingBtn}</> : L.btn}
              </button>
            </form>

            <div className="lp-divider">
              <div className="lp-divider-line"/>
              <span className="lp-divider-text">{L.or}</span>
              <div className="lp-divider-line"/>
            </div>

            <p className="lp-footer-text">
              {signupTo ? L.workshopNoAccount : L.noAccount}{" "}
              <Link href={signupTo || "/signup"} className="lp-link">
                {signupTo ? L.workshopSignup : L.signup}
              </Link>
            </p>

            <div className="lp-form-ornament" style={{ marginTop: 28 }}><Rule/></div>
          </div>
        </div>
      </main>
      <style>{css}</style>
    </>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @keyframes spin   {to{transform:rotate(360deg)}}
  @keyframes fadeIn {from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}

  :root{
    --gold:#B8A082; --gold2:#D9C9B0; --black:#4A0E1C;
    --off-white:#F7F3EB; --cream:#EDE8DF;
    --text:#1a1610; --text2:#4a3f2e; --text3:#8a7a5a; --border:#DDD5C4;
  }
  html,body{height:100%;}

  .lp-shell{height:100vh;display:flex;font-family:'Cairo',sans-serif;background:var(--off-white);overflow:hidden;isolation:isolate;}

  /* Brand panel */
  .lp-panel{width:min(46vw,620px);flex-shrink:0;background:linear-gradient(145deg,#32101A 0%,#4A0E1C 48%,#210A11 100%);display:flex;flex-direction:column;position:relative;overflow:hidden;animation:fadeIn .5s ease;min-height:100vh;box-shadow:24px 0 70px rgba(50,16,26,.18);}
  .lp-panel::before{content:'';position:absolute;inset:-8%;background-image:linear-gradient(180deg,rgba(50,16,26,.16),rgba(50,16,26,.82)),url('/newIdentityBG.png');background-repeat:no-repeat;background-position:center;background-size:min(88%,680px);opacity:.42;filter:saturate(.82) contrast(1.08);pointer-events:none;}
  .lp-panel::after{content:'';position:absolute;inset:18px;border:1px solid rgba(217,201,176,.13);border-radius:26px;pointer-events:none;}

  .lp-corner{position:absolute;width:80px;height:80px;pointer-events:none;}
  .lp-corner-tl{top:0;right:0;border-top:1px solid rgba(184,160,130,.25);border-right:1px solid rgba(184,160,130,.25);}
  .lp-corner-br{bottom:0;left:0;border-bottom:1px solid rgba(184,160,130,.25);border-left:1px solid rgba(184,160,130,.25);}

  .lp-panel-inner{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 54px;position:relative;z-index:1;gap:26px;}
  .lp-mandala{opacity:.95;}
  .lp-brand-text{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;width:100%;}
  .lp-brand-name{font-size:clamp(30px,3vw,44px);font-weight:900;color:#EFEAE0;letter-spacing:-.8px;line-height:1.2;text-shadow:0 8px 30px rgba(0,0,0,.22);}
  .lp-brand-tag{font-size:12.5px;color:rgba(217,201,176,.78);font-weight:600;letter-spacing:.04em;}
  .lp-panel-footer{position:absolute;bottom:28px;left:0;right:0;text-align:center;}
  .lp-panel-quote{font-size:11px;color:rgba(184,160,130,.22);font-weight:500;letter-spacing:.1em;}

  .lp-rule{display:flex;align-items:center;width:100%;}
  .lp-rule-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,.35),transparent);}
  .lp-rule-diamond{width:5px;height:5px;background:rgba(184,160,130,.5);transform:rotate(45deg);margin:0 10px;flex-shrink:0;}

  /* Lang toggle */
  /* Modern segmented language toggle with sliding gold thumb */
  .lp-lang-toggle{
    position:relative;display:grid;grid-template-columns:1fr 1fr;align-items:stretch;
    background:rgba(255,255,255,.05);
    border:1px solid rgba(184,160,130,.22);border-radius:11px;
    padding:4px;width:120px;overflow:hidden;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
  }
  .lp-lang-thumb{
    position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);
    border-radius:8px;
    background:linear-gradient(135deg,#D9C9B0 0%,#B8A082 60%,#B8A082 100%);
    box-shadow:0 2px 8px rgba(184,160,130,.30),inset 0 1px 0 rgba(255,255,255,.25);
    transition:transform .32s cubic-bezier(0.34,1.56,0.64,1);
    z-index:0;pointer-events:none;
  }
  .lp-lang-btn{
    position:relative;z-index:1;
    display:flex;align-items:center;justify-content:center;
    padding:7px 0;border-radius:8px;border:none;background:transparent;
    color:rgba(255,247,237,.85);font-size:12px;font-weight:800;letter-spacing:.05em;
    font-family:'Cairo',sans-serif;cursor:pointer;
    transition:color .22s ease,transform .15s ease;
  }
  .lp-lang-btn:hover:not(.lp-lang-btn--active){color:#FFF8E6;}
  .lp-lang-btn:active{transform:scale(.97);}
  .lp-lang-btn--active{color:var(--black);}
  .lp-lang-name{font-size:12px;}
  .lp-lang-toggle-mobile{display:none;justify-content:center;margin-bottom:20px;}
  .lp-lang-toggle-mobile .lp-lang-toggle{
    background:rgba(11,11,12,.04);border-color:rgba(168,134,62,.30);
  }
  .lp-lang-toggle-mobile .lp-lang-btn{color:#6B5A38;}
  .lp-lang-toggle-mobile .lp-lang-btn:hover:not(.lp-lang-btn--active){color:#3D3320;}
  .lp-lang-toggle-mobile .lp-lang-btn--active{color:var(--black);}

  /* Form side */
  .lp-form-side{flex:1;display:flex;align-items:center;justify-content:center;padding:46px 34px;background:radial-gradient(circle at 82% 12%,rgba(184,160,130,.17),transparent 28%),linear-gradient(145deg,#EFEAE0 0%,#F8F5EE 54%,#E5E0D5 100%);position:relative;min-height:100vh;align-self:stretch;overflow:hidden;}
  .lp-form-side::before{content:'';position:absolute;width:min(76vw,760px);aspect-ratio:1;inset-inline-end:-32%;bottom:-45%;background:url('/newIdentityBG.png') center/contain no-repeat;opacity:.10;pointer-events:none;}
  .lp-form-wrap{width:100%;max-width:490px;animation:scaleIn .45s cubic-bezier(.4,0,.2,1) both;position:relative;z-index:1;padding:clamp(28px,4vw,46px);border:1px solid rgba(184,160,130,.30);border-radius:28px;background:rgba(255,251,245,.78);box-shadow:0 30px 90px rgba(50,16,26,.11),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(18px);}
  .lp-form-ornament{margin-bottom:24px;}
  .lp-form-header{margin-bottom:32px;text-align:end;}
  .lp-form-title{font-size:26px;font-weight:900;color:var(--text);letter-spacing:-.4px;}
  .lp-form-title::after{content:'';display:block;width:40px;height:3px;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:2px;margin-top:8px;}
  .lp-form-sub{font-size:13px;color:var(--text3);margin-top:6px;font-weight:500;}

  .lp-fields{display:flex;flex-direction:column;gap:16px;}
  .lp-field{display:flex;flex-direction:column;gap:7px;}
  .lp-label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;}
  .lp-label-icon{display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:rgba(184,160,130,.12);border-radius:5px;color:var(--gold);flex-shrink:0;}
  .lp-input{width:100%;padding:14px 16px;background:rgba(255,255,255,.88);border:1px solid rgba(184,160,130,.36);border-radius:14px;color:var(--text);font-size:16px;font-family:'Cairo',sans-serif;outline:none;transition:border-color .18s,box-shadow .18s,transform .18s;box-shadow:0 8px 22px rgba(50,16,26,.035),inset 0 1px 0 rgba(255,255,255,.9);}
  .lp-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(184,160,130,.12),0 1px 3px rgba(11,11,12,.04);background:#FFFDF9;}
  .lp-input::placeholder{color:#bbb0a0;}
  .lp-input:disabled{opacity:.55;cursor:not-allowed;background:var(--cream);}
  .lp-input--error{border-color:#6B1E2D!important;box-shadow:0 0 0 3px rgba(192,57,43,.10)!important;}
  .lp-input--valid{border-color:#1B5E20!important;box-shadow:0 0 0 3px rgba(39,174,96,.10)!important;}
  .lp-field-msg{font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;margin-top:2px;}
  .lp-field-msg--error{color:#6B1E2D;}
  .lp-field-msg--success{color:#1B5E20;}
  .lp-field-msg--warn{color:#a8651e;}

  /* Password input with show/hide button */
  .lp-input-wrap{position:relative;display:flex;align-items:center;}
  .lp-input--with-action{padding-inline-end:42px;}
  .lp-eye{
    position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);
    display:flex;align-items:center;justify-content:center;
    width:30px;height:30px;border-radius:8px;
    border:none;background:transparent;cursor:pointer;
    color:var(--text3,#8A7A5A);transition:color .15s,background .15s;
  }
  .lp-eye:hover{color:var(--text2,#4A0E1C);background:rgba(184,160,130,.10);}
  .lp-eye:focus-visible{outline:2px solid rgba(184,160,130,.4);outline-offset:2px;}
  .lp-error{display:flex;align-items:center;gap:8px;background:rgba(139,26,26,.06);border:1px solid rgba(139,26,26,.2);color:#6B1E2D;font-size:12.5px;padding:11px 14px;border-radius:9px;font-weight:600;}
  .lp-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:15px;background:linear-gradient(135deg,#6B1E2D,#32101A);color:#EFEAE0;border:1px solid rgba(217,201,176,.38);border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;transition:all .18s;font-family:'Cairo',sans-serif;margin-top:4px;position:relative;overflow:hidden;box-shadow:0 12px 28px rgba(50,16,26,.20),inset 0 1px 0 rgba(255,255,255,.08);}
  .lp-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(184,160,130,.08),transparent 60%);pointer-events:none;}
  .lp-btn:hover:not(:disabled){background:linear-gradient(135deg,#7A2537,#3D111E);border-color:rgba(217,201,176,.65);box-shadow:0 18px 34px rgba(50,16,26,.28);color:#FFF;transform:translateY(-2px);}
  .lp-btn:disabled{opacity:.45;cursor:not-allowed;}
  .lp-spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(184,160,130,.25);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;}
  .lp-divider{display:flex;align-items:center;gap:12px;margin:24px 0 16px;}
  .lp-divider-line{flex:1;height:1px;background:var(--border);}
  .lp-divider-text{font-size:12px;color:var(--text3);font-weight:600;flex-shrink:0;}
  .lp-footer-text{text-align:center;font-size:13px;color:var(--text3);font-weight:500;}
  .lp-forgot{font-size:12px;font-weight:700;color:var(--gold);text-decoration:none;opacity:.8;transition:opacity .15s;}
  .lp-forgot:hover{opacity:1;text-decoration:underline;}
  .lp-link{color:var(--black);font-weight:800;text-decoration:none;border-bottom:1.5px solid var(--gold);padding-bottom:1px;transition:color .15s,border-color .15s;}
  .lp-link:hover{color:#4a3012;border-color:var(--gold2);}

  /* Responsive */
  @media(max-width:820px){
    .lp-shell{flex-direction:column;height:auto;min-height:100dvh;overflow-y:auto;overflow-x:hidden;}
    .lp-panel{width:100%;min-height:auto;flex-shrink:0;}
    .lp-panel-inner{flex-direction:row;align-items:center;justify-content:space-between;padding:12px 20px;padding-top:calc(env(safe-area-inset-top,0px) + 12px);height:auto;gap:10px;}
    .lp-mandala{display:none;}
    .lp-brand-text{flex-direction:row;align-items:center;gap:10px;text-align:start;flex:1;min-width:0;}
    .lp-panel .lp-brand-text .lp-rule{display:none;}
    .lp-brand-name{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .lp-brand-tag{display:none;}
    .lp-panel-footer{display:none;}
    .lp-panel .lp-lang-toggle{display:flex;flex-shrink:0;}
    .lp-lang-toggle-mobile{display:none;}
    .lp-form-side{flex:none;width:100%;min-height:0;align-items:flex-start;padding:28px 20px;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 40px);}
    .lp-form-wrap{max-width:100%;padding:26px 22px;border-radius:22px;}
    .lp-form-ornament{margin-bottom:14px;}
    .lp-form-header{margin-bottom:22px;}
    .lp-btn{padding:16px;font-size:16px;}
    .lp-lang-toggle{width:108px;}
  }
  @media(max-width:400px){
    .lp-panel-inner{padding:10px 16px;padding-top:calc(env(safe-area-inset-top,0px) + 10px);}
    .lp-form-side{padding:22px 16px;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 32px);}
    .lp-form-title{font-size:21px;}
    .lp-lang-toggle{width:100px;}
    .lp-lang-btn{padding:6px 0;font-size:11.5px;}
  }
` + authPremiumCss;
