"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface School {
  id: string;
  name: string;
  name_alt: string | null;
  language: string;
  slug: string;
  description: string | null;
}

/* ─── Mandala ─── */
const r2 = (n: number) => Math.round(n * 1000) / 1000;
const STAR_LINES = Array.from({ length: 12 }, (_, i) => {
  const a1 = (i * 30 * Math.PI) / 180;
  const a2 = ((i * 30 + 15) * Math.PI) / 180;
  return {
    x1: r2(100 + 80 * Math.sin(a1)),
    y1: r2(100 - 80 * Math.cos(a1)),
    x2: r2(100 + 40 * Math.sin(a2)),
    y2: r2(100 - 40 * Math.cos(a2)),
  };
});
const PETAL_CIRCLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return { cx: r2(100 + 52 * Math.sin(a)), cy: r2(100 - 52 * Math.cos(a)) };
});
const INNER_PETALS = Array.from({ length: 4 }, (_, i) => {
  const a = (i * 90 * Math.PI) / 180;
  return { cx: r2(100 + 24 * Math.sin(a)), cy: r2(100 - 24 * Math.cos(a)) };
});

function Mandala({
  size = 200,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <svg viewBox="0 0 200 200" fill="none" width="100%" height="100%">
        <circle
          cx="100"
          cy="100"
          r="92"
          stroke="#B8A082"
          strokeWidth="0.3"
          opacity="0.08"
        />
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke="#B8A082"
          strokeWidth="0.3"
          opacity="0.06"
        />
        {PETAL_CIRCLES.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="52"
            stroke="#B8A082"
            strokeWidth="0.5"
            opacity="0.13"
            fill="none"
          />
        ))}
        <circle
          cx="100"
          cy="100"
          r="74"
          stroke="#B8A082"
          strokeWidth="0.4"
          opacity="0.16"
          strokeDasharray="3 8"
        />
        <circle
          cx="100"
          cy="100"
          r="62"
          stroke="#B8A082"
          strokeWidth="0.35"
          opacity="0.13"
        />
        <circle
          cx="100"
          cy="100"
          r="50"
          stroke="#B8A082"
          strokeWidth="0.5"
          opacity="0.18"
          strokeDasharray="5 5"
        />
        <circle
          cx="100"
          cy="100"
          r="38"
          stroke="#B8A082"
          strokeWidth="0.35"
          opacity="0.15"
        />
        <circle
          cx="100"
          cy="100"
          r="28"
          stroke="#B8A082"
          strokeWidth="0.45"
          opacity="0.22"
          strokeDasharray="3 4"
        />
        <circle
          cx="100"
          cy="100"
          r="18"
          stroke="#B8A082"
          strokeWidth="0.35"
          opacity="0.24"
        />
        <circle
          cx="100"
          cy="100"
          r="9"
          stroke="#B8A082"
          strokeWidth="0.55"
          opacity="0.30"
        />
        {STAR_LINES.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#B8A082"
            strokeWidth="0.35"
            opacity="0.16"
          />
        ))}
        {INNER_PETALS.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="24"
            stroke="#B8A082"
            strokeWidth="0.45"
            opacity="0.20"
            fill="none"
          />
        ))}
        <line
          x1="100"
          y1="73"
          x2="100"
          y2="127"
          stroke="#B8A082"
          strokeWidth="0.6"
          opacity="0.24"
        />
        <line
          x1="76"
          y1="87"
          x2="124"
          y2="113"
          stroke="#B8A082"
          strokeWidth="0.6"
          opacity="0.24"
        />
        <line
          x1="124"
          y1="87"
          x2="76"
          y2="113"
          stroke="#B8A082"
          strokeWidth="0.6"
          opacity="0.24"
        />
        <circle
          cx="100"
          cy="100"
          r="7"
          fill="none"
          stroke="#B8A082"
          strokeWidth="0.7"
          opacity="0.45"
        />
        <circle
          cx="100"
          cy="100"
          r="4"
          fill="none"
          stroke="#B8A082"
          strokeWidth="0.45"
          opacity="0.55"
        />
        <circle cx="100" cy="100" r="2" fill="#B8A082" opacity="0.7" />
      </svg>
    </div>
  );
}

/* ─── Rule ornament ─── */
function Rule({ dim = false }: { dim?: boolean }) {
  const c = dim ? "rgba(184,160,130,0.35)" : "rgba(184,160,130,0.5)";
  return (
    <div className="lp-rule">
      <div
        className="lp-rule-line"
        style={{
          background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
        }}
      />
      <div className="lp-rule-diamond" style={{ background: c }} />
      <div
        className="lp-rule-line"
        style={{
          background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
        }}
      />
    </div>
  );
}

/* ─── i18n strings ─── */
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const STRINGS = {
  sq: {
    loginTitle: "Hyrje",
    sub: "Hyni në llogarinë tuaj",
    emailLabel: "Email",
    passLabel: "Fjalëkalimi",
    btn: "Hyni",
    loadingBtn: "Duke hyrë...",
    errEmpty: "Ju lutemi plotësoni të gjitha fushat",
    errEmailInvalid: "Formati i email-it është i pasaktë",
    errWrong: "Email ose fjalëkalim i gabuar",
    errNotConfirmed: "Ju lutemi konfirmoni email-in tuaj — kontrolloni kutinë hyrëse dhe klikoni lidhjen e konfirmimit",
    errProfile: "Nuk mund të ngarkohen të dhënat e llogarisë",
    errServer: "Gabim lidhje, provoni përsëri",
    emailSuccess: "Email i vlefshëm ✓",
    haveAccount: "Nuk keni llogari?",
    signup: "Regjistrohu",
    poweredBy: "E mundësuar nga",
    backTo: "Kthehu te faqja kryesore",
    or: "ose",
    forgotPw: "Keni harruar fjalëkalimin?",
  },
  ar: {
    loginTitle: "تسجيل الدخول",
    sub: "أدخل بياناتك للوصول إلى لوحتك",
    emailLabel: "البريد الإلكتروني",
    passLabel: "كلمة المرور",
    btn: "دخول",
    loadingBtn: "جارٍ تسجيل الدخول...",
    errEmpty: "من فضلك أدخل البريد الإلكتروني وكلمة المرور",
    errEmailInvalid: "صيغة البريد الإلكتروني غير صحيحة",
    errWrong: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    errNotConfirmed: "يرجى تأكيد بريدك الإلكتروني أولاً — تحقق من صندوق الوارد وانقر على رابط التأكيد",
    errProfile: "تعذر جلب بيانات الحساب",
    errServer: "تعذر الاتصال بالخادم، حاول مرة أخرى",
    emailSuccess: "بريد إلكتروني صحيح ✓",
    haveAccount: "لا تملك حسابًا؟",
    signup: "إنشاء حساب",
    poweredBy: "مدعومة من",
    backTo: "العودة إلى الصفحة الرئيسية",
    or: "أو",
    forgotPw: "نسيت كلمة المرور؟",
  },
} as const;

type Lang = "sq" | "ar";

/* ─── Language toggle pill ─── */
function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="lp-lang-toggle" dir="ltr">
      <button
        type="button"
        className={`lp-lang-btn${lang === "sq" ? " lp-lang-btn--active" : ""}`}
        onClick={() => onChange("sq")}
        aria-label="Switch to Albanian"
      >
        <span className="lp-lang-flag">🇦🇱</span>
        <span className="lp-lang-name">Shqip</span>
      </button>

      <div className="lp-lang-sep" />

      <button
        type="button"
        className={`lp-lang-btn${lang === "ar" ? " lp-lang-btn--active" : ""}`}
        onClick={() => onChange("ar")}
        aria-label="Switch to Arabic"
      >
        <span className="lp-lang-flag">🇸🇦</span>
        <span className="lp-lang-name">العربية</span>
      </button>
    </div>
  );
}

/* ─── Main component ─── */
export default function SchoolLoginClient({ school }: { school: School }) {
  const [lang, setLang] = useState<Lang>(
    school.language === "sq" ? "sq" : "ar",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const L = STRINGS[lang];
  const dir = lang === "sq" ? "ltr" : "rtl";

  // Latin-script name in non-Arabic UIs when available; else the Arabic name.
  const displayName =
    lang !== "ar" && school.name_alt && school.name_alt.trim()
      ? school.name_alt
      : school.name;

  // Clean paths on a tenant subdomain; school-scoped paths on the owner host.
  const [onSubdomain, setOnSubdomain] = useState(false);
  useEffect(() => {
    setOnSubdomain(!window.location.pathname.startsWith("/schools/"));
  }, []);
  const signupPath  = onSubdomain ? "/signup" : `/schools/${school.slug}/signup`;
  const landingPath = onSubdomain ? "/"       : `/schools/${school.slug}`;

  const showEmailError   = emailTouched && email.trim().length > 0 && !isValidEmail(email);
  const showEmailSuccess = emailTouched && isValidEmail(email);

  const handleLangChange = (l: Lang) => {
    setLang(l);
    setError("");
  };

  const handleLogin = async () => {
    setError("");
    setEmailTouched(true);
    if (!email.trim() || !password) {
      setError(L.errEmpty);
      return;
    }
    if (!isValidEmail(email)) {
      setError(L.errEmailInvalid);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        { email: email.trim(), password },
      );
      if (authError) {
        if (authError.code === "email_not_confirmed") {
          setError(L.errNotConfirmed);
        } else {
          setError(L.errWrong);
        }
        return;
      }
      if (!data.user) {
        setError(L.errWrong);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError(L.errProfile);
        return;
      }

      const roleRoutes: Record<string, string> = {
        OWNER: "/owner",
        SCHOOL_ADMIN: "/school-admin",
        TEACHER: "/teacher",
        STUDENT: "/student",
      };
      const dest = roleRoutes[profile.role];
      if (dest) window.location.href = dest;
      else setError("نوع الحساب غير معروف: " + profile.role);
    } catch {
      setError(L.errServer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="lp-shell" dir={dir}>
        {/* ── Brand panel ── */}
        <div className="lp-panel">
          <div className="lp-corner lp-corner-tl" />
          <div className="lp-corner lp-corner-br" />

          <div className="lp-panel-inner">
            <Mandala size={220} className="lp-mandala" />

            <div className="lp-brand-text">
              <Rule />
              <div className="lp-school-badge">{displayName.charAt(0)}</div>
              <h2 className="lp-brand-name">{displayName}</h2>
              {school.description && (
                <p className="lp-brand-desc">{school.description}</p>
              )}
              <Rule />
            </div>

            {/* Toggle lives in the dark panel on desktop */}
            <LangToggle lang={lang} onChange={handleLangChange} />

            <div className="lp-panel-footer">
              <p className="lp-panel-quote">
                {L.poweredBy}{" "}
                <span
                  style={{ color: "rgba(184,160,130,0.5)", fontWeight: 700 }}
                >
                  بناء الأهلية
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="lp-form-side">
          <div className="lp-form-wrap">
            {/* Mobile-only toggle — shown above the form on small screens */}
            <div className="lp-lang-toggle-mobile">
              <LangToggle lang={lang} onChange={handleLangChange} />
            </div>

            <div className="lp-form-ornament">
              <Rule dim />
            </div>

            <div className="lp-form-header">
              <h1 className="lp-form-title">{L.loginTitle}</h1>
              <p className="lp-form-sub">{L.sub}</p>
            </div>

            <div className="lp-fields">
              <div className="lp-field">
                <label className="lp-label">
                  <span className="lp-label-icon">
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  {L.emailLabel}
                </label>
                <input
                  type="email"
                  className={`lp-input${showEmailError ? " lp-input--error" : showEmailSuccess ? " lp-input--valid" : ""}`}
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  disabled={loading}
                  dir="ltr"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  suppressHydrationWarning
                />
                {showEmailError && (
                  <span className="lp-field-msg lp-field-msg--error">{L.errEmailInvalid}</span>
                )}
                {showEmailSuccess && (
                  <span className="lp-field-msg lp-field-msg--success">{L.emailSuccess}</span>
                )}
              </div>

              <div className="lp-field">
                <label className="lp-label">
                  <span className="lp-label-icon">
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  {L.passLabel}
                </label>
                <div className="lp-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="lp-input lp-password-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    dir="ltr"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    className="lp-eye-btn"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2 2 0 002.83 2.83" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 4.24A10.9 10.9 0 0112 4c5.52 0 9 5 9 8a8.7 8.7 0 01-2.36 4.75M6.61 6.61C4.31 8.09 3 10.29 3 12c0 3 3.48 8 9 8 1.56 0 2.96-.4 4.17-1.03" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.5-7 9.75-7 9.75 7 9.75 7-3.5 7-9.75 7-9.75-7-9.75-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lp-error">
                  <svg
                    width="13"
                    height="13"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </div>
              )}

              <div style={{ textAlign: "end", marginTop: -6 }}>
                <Link href="/forgot-password" className="lp-forgot">
                  {L.forgotPw}
                </Link>
              </div>

              <button
                className="lp-btn"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="lp-spin" />
                    {L.loadingBtn}
                  </>
                ) : (
                  L.btn
                )}
              </button>
            </div>

            <div className="lp-divider">
              <div className="lp-divider-line" />
              <span className="lp-divider-text">{L.or}</span>
              <div className="lp-divider-line" />
            </div>

            <p className="lp-footer-text">
              {L.haveAccount}{" "}
              <Link href={signupPath} className="lp-link">
                {L.signup}
              </Link>
            </p>

            <div className="lp-form-ornament" style={{ marginTop: 28 }}>
              <Rule dim />
            </div>

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <Link href={landingPath} className="lp-back-link">
                ← {L.backTo}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <style>{css}</style>
    </>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }

  :root {
    --gold:      #B8A082;
    --gold2:     #B8A082;
    --black:     #4A0E1C;
    --off-white: #F7F3EB;
    --cream:     #EDE8DF;
    --text:      #1a1610;
    --text2:     #4a3f2e;
    --text3:     #8a7a5a;
    --border:    #DDD5C4;
  }

  html, body { height: 100%; }

  .lp-shell {
    height: 100vh;
    display: flex;
    font-family: 'Cairo', sans-serif;
    background: var(--off-white);
    overflow: hidden;   /* desktop: panels fill viewport exactly */
  }

  /* ── Brand panel ── */
  .lp-panel {
    width: 420px;
    flex-shrink: 0;
    background: var(--black);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    animation: fadeIn 0.5s ease;
    min-height: 100vh;
  }
  .lp-panel::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 50% 20%, rgba(184,160,130,0.10) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(184,160,130,0.06) 0%, transparent 50%);
    pointer-events: none;
  }

  .lp-corner { position: absolute; width: 80px; height: 80px; pointer-events: none; }
  .lp-corner-tl { top: 0; right: 0; border-top: 1px solid rgba(184,160,130,0.25); border-right: 1px solid rgba(184,160,130,0.25); }
  .lp-corner-br { bottom: 0; left: 0; border-bottom: 1px solid rgba(184,160,130,0.25); border-left: 1px solid rgba(184,160,130,0.25); }

  .lp-panel-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    position: relative;
    z-index: 1;
    gap: 22px;
  }

  .lp-mandala { opacity: 0.95; }

  .lp-brand-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    width: 100%;
  }

  .lp-school-badge {
    width: 48px; height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #B8A082 0%, #B8A082 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900;
    color: var(--black);
    margin: 4px 0;
    box-shadow: 0 4px 16px rgba(184,160,130,0.25);
  }

  .lp-brand-name {
    font-size: 28px; font-weight: 900;
    color: var(--gold);
    letter-spacing: -0.5px;
    font-family: 'Cairo', sans-serif;
    line-height: 1.15;
  }

  .lp-brand-desc {
    font-size: 12px;
    color: rgba(184,160,130,0.45);
    font-weight: 500;
    max-width: 280px;
    line-height: 1.6;
  }

  .lp-panel-footer {
    position: absolute;
    bottom: 32px; left: 0; right: 0;
    text-align: center;
  }
  .lp-panel-quote {
    font-size: 11px;
    color: rgba(184,160,130,0.22);
    font-weight: 400;
  }

  .lp-rule { display: flex; align-items: center; width: 100%; }
  .lp-rule-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(184,160,130,0.35), transparent);
  }
  .lp-rule-diamond {
    width: 5px; height: 5px;
    background: rgba(184,160,130,0.5);
    transform: rotate(45deg);
    margin: 0 10px; flex-shrink: 0;
  }

  /* ── Language toggle ── */
  .lp-lang-toggle {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(184,160,130,0.2);
    border-radius: 10px;
    padding: 3px;
  }

  .lp-lang-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: rgba(184,160,130,0.4);
    font-size: 12px;
    font-weight: 700;
    font-family: 'Cairo', sans-serif;
    cursor: pointer;
    transition: background 0.18s, color 0.18s;
    white-space: nowrap;
    line-height: 1;
  }
  .lp-lang-btn:hover:not(.lp-lang-btn--active) {
    color: rgba(184,160,130,0.7);
    background: rgba(184,160,130,0.07);
  }
  .lp-lang-btn--active {
    background: rgba(184,160,130,0.16);
    color: var(--gold);
    box-shadow: inset 0 1px 0 rgba(184,160,130,0.1);
  }

  .lp-lang-flag { font-size: 15px; line-height: 1; }
  .lp-lang-name { font-size: 11.5px; }

  .lp-lang-sep {
    width: 1px; height: 18px;
    background: rgba(184,160,130,0.15);
    flex-shrink: 0;
  }

  /* Mobile: hide panel toggle, show above form */
  .lp-lang-toggle-mobile {
    display: none;
    justify-content: center;
    margin-bottom: 20px;
  }
  /* On mobile the toggle goes on the light side — restyle for light bg */
  .lp-lang-toggle-mobile .lp-lang-toggle {
    background: rgba(11,11,12,0.04);
    border-color: rgba(184,160,130,0.3);
  }
  .lp-lang-toggle-mobile .lp-lang-btn { color: var(--text3); }
  .lp-lang-toggle-mobile .lp-lang-btn--active {
    background: var(--black);
    color: var(--gold);
  }
  .lp-lang-toggle-mobile .lp-lang-btn:hover:not(.lp-lang-btn--active) {
    color: var(--text2);
    background: rgba(11,11,12,0.06);
  }
  .lp-lang-toggle-mobile .lp-lang-sep { background: var(--border); }

  /* ── Form side ── */
  .lp-form-side {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    background: var(--off-white);
    position: relative;
    min-height: 100vh;
    align-self: stretch;
  }
  .lp-form-side::before {
    content: '';
    position: absolute;
    top: -100px; left: -100px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(184,160,130,0.04) 0%, transparent 65%);
    pointer-events: none;
  }
  .lp-form-side::after {
    content: '';
    position: absolute;
    bottom: -60px; right: -60px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(184,160,130,0.03) 0%, transparent 65%);
    pointer-events: none;
  }

  .lp-form-wrap {
    width: 100%;
    max-width: 420px;
    animation: scaleIn 0.45s cubic-bezier(0.4,0,0.2,1) both;
    position: relative;
    z-index: 1;
  }

  .lp-form-ornament { margin-bottom: 24px; }

  .lp-form-header { margin-bottom: 32px; text-align: end; }
  .lp-form-title {
    font-size: 26px; font-weight: 900;
    color: var(--text);
    letter-spacing: -0.4px;
    font-family: 'Cairo', sans-serif;
  }
  .lp-form-title::after {
    content: '';
    display: block;
    width: 40px; height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--gold2));
    border-radius: 2px;
    margin-top: 8px;
  }
  .lp-form-sub { font-size: 13px; color: var(--text3); margin-top: 6px; font-weight: 500; }

  .lp-fields { display: flex; flex-direction: column; gap: 16px; }
  .lp-field  { display: flex; flex-direction: column; gap: 7px; }
  .lp-label  {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 700;
    color: var(--text2);
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .lp-label-icon {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    background: rgba(184,160,130,0.12);
    border-radius: 5px;
    color: var(--gold);
    flex-shrink: 0;
  }

  .lp-input {
    width: 100%;
    padding: 13px 16px;
    background: #FFFFFF;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 16px; /* ≥16px prevents iOS auto-zoom on focus */
    font-family: 'Cairo', sans-serif;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    box-shadow: 0 1px 3px rgba(11,11,12,0.04);
  }
  .lp-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(184,160,130,0.12), 0 1px 3px rgba(11,11,12,0.04);
    background: #FFFDF9;
  }
  .lp-input::placeholder { color: #bbb0a0; }
  .lp-input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--cream); }
  .lp-password-wrap { position: relative; }
  .lp-password-input { padding-inline-end: 48px; }
  .lp-eye-btn {
    position: absolute; top: 50%; inset-inline-end: 10px; transform: translateY(-50%);
    width: 34px; height: 34px; border: 0; border-radius: 9px;
    background: transparent; color: var(--text3);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.18s, color 0.18s, opacity 0.18s;
  }
  .lp-eye-btn:hover:not(:disabled) { background: rgba(184,160,130,0.10); color: var(--text2); }
  .lp-eye-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .lp-input--error {
    border-color: #6B1E2D !important;
    box-shadow: 0 0 0 3px rgba(192,57,43,0.10), 0 1px 3px rgba(11,11,12,0.04) !important;
  }
  .lp-input--valid {
    border-color: #1B5E20 !important;
    box-shadow: 0 0 0 3px rgba(39,174,96,0.10), 0 1px 3px rgba(11,11,12,0.04) !important;
  }
  .lp-field-msg {
    font-size: 12px; font-weight: 600;
    display: flex; align-items: center; gap: 5px;
    margin-top: 2px;
  }
  .lp-field-msg--error { color: #6B1E2D; }
  .lp-field-msg--success { color: #1B5E20; }

  .lp-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(139,26,26,0.06);
    border: 1px solid rgba(139,26,26,0.2);
    color: #6B1E2D;
    font-size: 12.5px;
    padding: 11px 14px;
    border-radius: 9px;
    font-weight: 600;
  }

  .lp-btn {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    width: 100%; padding: 14px;
    background: var(--black);
    color: var(--gold);
    border: 1px solid rgba(184,160,130,0.25);
    border-radius: 10px;
    font-size: 15px; font-weight: 800;
    cursor: pointer;
    transition: all 0.18s;
    font-family: 'Cairo', sans-serif;
    margin-top: 4px;
    position: relative;
    overflow: hidden;
  }
  .lp-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(184,160,130,0.08) 0%, transparent 60%);
    pointer-events: none;
  }
  .lp-btn:hover:not(:disabled) {
    background: #1A1A1A;
    border-color: rgba(184,160,130,0.5);
    box-shadow: 0 4px 20px rgba(11,11,12,0.15);
    color: var(--gold2);
  }
  .lp-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .lp-spin {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(184,160,130,0.25);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .lp-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 24px 0 16px;
  }
  .lp-divider-line { flex: 1; height: 1px; background: var(--border); }
  .lp-divider-text { font-size: 12px; color: var(--text3); font-weight: 600; flex-shrink: 0; }

  .lp-footer-text { text-align: center; font-size: 13px; color: var(--text3); font-weight: 500; }
  .lp-forgot { font-size: 12px; font-weight: 700; color: var(--gold); text-decoration: none; opacity: 0.8; transition: opacity 0.15s; }
  .lp-forgot:hover { opacity: 1; text-decoration: underline; }
  .lp-link {
    color: var(--black);
    font-weight: 800;
    text-decoration: none;
    border-bottom: 1.5px solid var(--gold);
    padding-bottom: 1px;
    transition: color 0.15s, border-color 0.15s;
  }
  .lp-link:hover { color: #4a3012; border-color: var(--gold2); }

  .lp-back-link {
    font-size: 12px;
    color: var(--text3);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.15s;
  }
  .lp-back-link:hover { color: var(--text2); }

  /* ── Responsive ── */
  @media (max-width: 820px) {
    /*
     * Mobile layout: single column, panel becomes a compact header bar at the
     * top, form flows below it — no vertical centering so nothing is clipped.
     */
    .lp-shell {
      flex-direction: column;   /* panel (header) on top, form below */
      height: auto;
      min-height: 100dvh;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* ── Compact dark header bar ── */
    .lp-panel { width: 100%; flex-shrink: 0; min-height: auto; }
    .lp-panel-inner {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
      height: auto;
      gap: 10px;
    }

    /* Hide big mandala — no room in a compact header */
    .lp-mandala { display: none; }

    /* Brand text becomes a horizontal badge + name row */
    .lp-brand-text {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      text-align: start;
      flex: 1;
      min-width: 0;   /* allow text-overflow to work */
    }
    /* Hide ornament Rules inside the panel on mobile */
    .lp-panel .lp-brand-text .lp-rule { display: none; }
    .lp-school-badge {
      width: 34px; height: 34px; font-size: 14px;
      border-radius: 9px; margin: 0; flex-shrink: 0;
    }
    .lp-brand-name {
      font-size: 14px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .lp-brand-desc { display: none; }
    .lp-panel-footer { display: none; }

    /* Keep lang toggle in the dark header — colours already work on dark bg */
    .lp-panel .lp-lang-toggle { display: flex; flex-shrink: 0; }
    /* No need for the duplicate toggle above the form */
    .lp-lang-toggle-mobile { display: none; }

    /* ── Form: aligned to top so NOTHING is clipped ── */
    .lp-form-side {
      flex: none;
      width: 100%;
      min-height: 0;
      align-items: flex-start;   /* ← critical: prevents top-clipping bug */
      padding: 28px 20px;
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 40px);
    }
    .lp-form-wrap { max-width: 100%; }
    .lp-form-ornament { margin-bottom: 14px; }
    .lp-form-header { margin-bottom: 22px; }
    .lp-btn { padding: 16px; font-size: 16px; }
    .lp-lang-btn { padding: 8px 14px; }
    .lp-lang-name { font-size: 11px; }
  }

  @media (max-width: 400px) {
    .lp-panel-inner {
      padding: 10px 16px;
      padding-top: calc(env(safe-area-inset-top, 0px) + 10px);
    }
    .lp-form-side {
      padding: 22px 16px;
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
    }
    .lp-form-title { font-size: 21px; }
    .lp-lang-btn { padding: 7px 10px; }
    .lp-lang-flag { font-size: 13px; }
  }
`;
