"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

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
        <circle cx="100" cy="100" r="92" stroke="#C8A96A" strokeWidth="0.3" opacity="0.08"/>
        <circle cx="100" cy="100" r="86" stroke="#C8A96A" strokeWidth="0.3" opacity="0.06"/>
        {PETAL_CIRCLES.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r="52" stroke="#C8A96A" strokeWidth="0.5" opacity="0.13" fill="none"/>)}
        <circle cx="100" cy="100" r="74" stroke="#C8A96A" strokeWidth="0.4" opacity="0.16" strokeDasharray="3 8"/>
        <circle cx="100" cy="100" r="62" stroke="#E5B93C" strokeWidth="0.35" opacity="0.13"/>
        <circle cx="100" cy="100" r="50" stroke="#C8A96A" strokeWidth="0.5" opacity="0.18" strokeDasharray="5 5"/>
        <circle cx="100" cy="100" r="38" stroke="#C8A96A" strokeWidth="0.35" opacity="0.15"/>
        <circle cx="100" cy="100" r="28" stroke="#E5B93C" strokeWidth="0.45" opacity="0.22" strokeDasharray="3 4"/>
        <circle cx="100" cy="100" r="18" stroke="#C8A96A" strokeWidth="0.35" opacity="0.24"/>
        <circle cx="100" cy="100" r="9"  stroke="#E5B93C" strokeWidth="0.55" opacity="0.30"/>
        {STAR_LINES.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#C8A96A" strokeWidth="0.35" opacity="0.16"/>)}
        {INNER_PETALS.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r="24" stroke="#C8A96A" strokeWidth="0.45" opacity="0.20" fill="none"/>)}
        <line x1="100" y1="73" x2="100" y2="127" stroke="#E5B93C" strokeWidth="0.6" opacity="0.24"/>
        <line x1="76"  y1="87" x2="124" y2="113" stroke="#E5B93C" strokeWidth="0.6" opacity="0.24"/>
        <line x1="124" y1="87" x2="76"  y2="113" stroke="#E5B93C" strokeWidth="0.6" opacity="0.24"/>
        <circle cx="100" cy="100" r="7" fill="none" stroke="#E5B93C" strokeWidth="0.7" opacity="0.45"/>
        <circle cx="100" cy="100" r="4" fill="none" stroke="#C8A96A" strokeWidth="0.45" opacity="0.55"/>
        <circle cx="100" cy="100" r="2" fill="#E5B93C" opacity="0.7"/>
      </svg>
    </div>
  );
}

/* ─── i18n ─── */
const STRINGS = {
  ar: {
    dir: "rtl" as const,
    brand: "جيل الرواد",
    tagline: "تمكين الإنسان · بناء المستقبل",
    loginTitle: "تسجيل الدخول",
    sub: "أدخل بياناتك للوصول إلى لوحتك",
    emailLabel: "البريد الإلكتروني",
    passLabel: "كلمة المرور",
    btn: "دخول",
    loadingBtn: "جارٍ تسجيل الدخول...",
    forgotPw: "نسيت كلمة المرور؟",
    noAccount: "لا تملك حسابًا؟",
    signup: "إنشاء حساب",
    or: "أو",
    errEmpty: "من فضلك أدخل البريد الإلكتروني وكلمة المرور",
    errEmailInvalid: "صيغة البريد الإلكتروني غير صحيحة",
    errWrong: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    errNotConfirmed: "يرجى تأكيد بريدك الإلكتروني أولاً — تحقق من صندوق الوارد وانقر على رابط التأكيد",
    errProfile: "تعذر جلب بيانات الحساب",
    errServer: "تعذر الاتصال بالخادم، حاول مرة أخرى",
    emailSuccess: "بريد إلكتروني صحيح ✓",
    poweredBy: "منصة الرواد",
  },
  sq: {
    dir: "ltr" as const,
    brand: "Brezi i Pionierëve",
    tagline: "Fuqizimi i Njeriut · Ndërtimi i së Ardhmes",
    loginTitle: "Hyrje",
    sub: "Hyni në llogarinë tuaj",
    emailLabel: "Email",
    passLabel: "Fjalëkalimi",
    btn: "Hyni",
    loadingBtn: "Duke hyrë...",
    forgotPw: "Keni harruar fjalëkalimin?",
    noAccount: "Nuk keni llogari?",
    signup: "Regjistrohu",
    or: "ose",
    errEmpty: "Ju lutemi plotësoni të gjitha fushat",
    errEmailInvalid: "Formati i email-it është i pasaktë",
    errWrong: "Email ose fjalëkalim i gabuar",
    errNotConfirmed: "Konfirmoni email-in tuaj — kontrolloni kutinë hyrëse dhe klikoni lidhjen",
    errProfile: "Nuk mund të ngarkohen të dhënat e llogarisë",
    errServer: "Gabim lidhje, provoni përsëri",
    emailSuccess: "Email i vlefshëm ✓",
    poweredBy: "Platforma Alrowad",
  },
} as const;

type Lang = "ar" | "sq";
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* ─── Language toggle ─── */
function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="lp-lang-toggle" dir="ltr">
      <button type="button" className={`lp-lang-btn${lang === "sq" ? " lp-lang-btn--active" : ""}`} onClick={() => onChange("sq")} aria-label="Shqip">
        <span className="lp-lang-flag">🇦🇱</span><span className="lp-lang-name">Shqip</span>
      </button>
      <div className="lp-lang-sep"/>
      <button type="button" className={`lp-lang-btn${lang === "ar" ? " lp-lang-btn--active" : ""}`} onClick={() => onChange("ar")} aria-label="عربي">
        <span className="lp-lang-flag">🇸🇦</span><span className="lp-lang-name">العربية</span>
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
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [redirectTo, setRedirectTo]     = useState("");

  const L = STRINGS[lang];

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    const effectiveLang: Lang = saved === "sq" || saved === "ar" ? saved : "ar";
    if (effectiveLang !== "ar") setLang(effectiveLang);
    const params = new URLSearchParams(window.location.search);
    const rd  = params.get("redirectTo") ?? "";
    const err = params.get("error") ?? "";
    if (rd.startsWith("/") && !rd.startsWith("//")) setRedirectTo(rd);
    const isSq = effectiveLang === "sq";
    if (err === "link_invalid")       setError(isSq ? "Lidhja e konfirmimit është e pavlefshme ose e skaduar" : "رابط التأكيد غير صالح أو منتهي الصلاحية");
    else if (err === "oauth_failed")  setError(isSq ? "Hyrja dështoi" : "فشل تسجيل الدخول");
    else if (err === "session_error") setError(isSq ? "Gabim sesioni, provoni përsëri" : "حدث خطأ في الجلسة");
  }, []);

  const handleLangChange = (l: Lang) => { setLang(l); setError(""); localStorage.setItem("lang", l); };

  const showEmailError   = emailTouched && email.trim().length > 0 && !isValidEmail(email);
  const showEmailSuccess = emailTouched && isValidEmail(email);

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
      if (dest) window.location.href = dest;
      else setError(lang === "sq" ? "Lloji i llogarisë i panjohur: " + profile.role : "نوع الحساب غير معروف: " + profile.role);
    } catch { setError(L.errServer); }
    finally { setLoading(false); }
  };

  return (
    <>
      <main className="lp-shell" dir={L.dir}>
        {/* ── Brand panel ── */}
        <div className="lp-panel">
          <div className="lp-corner lp-corner-tl"/>
          <div className="lp-corner lp-corner-br"/>
          <div className="lp-panel-inner">
            <Mandala size={220} className="lp-mandala"/>
            <div className="lp-brand-text">
              <Rule/>
              <h2 className="lp-brand-name">{L.brand}</h2>
              <p className="lp-brand-tag">{L.tagline}</p>
              <Rule/>
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
            <div className="lp-lang-toggle-mobile">
              <LangToggle lang={lang} onChange={handleLangChange}/>
            </div>
            <div className="lp-form-ornament"><Rule/></div>
            <div className="lp-form-header">
              <h1 className="lp-form-title">{L.loginTitle}</h1>
              <p className="lp-form-sub">{L.sub}</p>
            </div>

            <div className="lp-fields">
              <div className="lp-field">
                <label className="lp-label">
                  <span className="lp-label-icon">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  {L.emailLabel}
                </label>
                <input type="email"
                  className={`lp-input${showEmailError ? " lp-input--error" : showEmailSuccess ? " lp-input--valid" : ""}`}
                  placeholder="example@mail.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)}
                  disabled={loading} dir="ltr" onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  suppressHydrationWarning/>
                {showEmailError   && <span className="lp-field-msg lp-field-msg--error">{L.errEmailInvalid}</span>}
                {showEmailSuccess && <span className="lp-field-msg lp-field-msg--success">{L.emailSuccess}</span>}
              </div>

              <div className="lp-field">
                <label className="lp-label">
                  <span className="lp-label-icon">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  {L.passLabel}
                </label>
                <input type="password" className="lp-input" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={loading} dir="ltr"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} suppressHydrationWarning/>
              </div>

              {error && (
                <div className="lp-error">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  {error}
                </div>
              )}

              <div style={{ textAlign: "end", marginTop: -6 }}>
                <Link href="/forgot-password" className="lp-forgot">{L.forgotPw}</Link>
              </div>

              <button className="lp-btn" onClick={handleLogin} disabled={loading}>
                {loading ? <><span className="lp-spin"/>{L.loadingBtn}</> : L.btn}
              </button>
            </div>

            <div className="lp-divider">
              <div className="lp-divider-line"/>
              <span className="lp-divider-text">{L.or}</span>
              <div className="lp-divider-line"/>
            </div>

            <p className="lp-footer-text">
              {L.noAccount}{" "}
              <Link href="/signup" className="lp-link">{L.signup}</Link>
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
    --gold:#C8A96A; --gold2:#E5B93C; --black:#0B0B0C;
    --off-white:#F5F3EE; --cream:#EDE8DF;
    --text:#1a1610; --text2:#4a3f2e; --text3:#8a7a5a; --border:#DDD5C4;
  }
  html,body{height:100%;}

  .lp-shell{height:100vh;display:flex;font-family:'Cairo',sans-serif;background:var(--off-white);overflow:hidden;}

  /* Brand panel */
  .lp-panel{width:420px;flex-shrink:0;background:var(--black);display:flex;flex-direction:column;position:relative;overflow:hidden;animation:fadeIn .5s ease;min-height:100vh;}
  .lp-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%,rgba(200,169,106,.10),transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(229,185,60,.06),transparent 50%);pointer-events:none;}

  .lp-corner{position:absolute;width:80px;height:80px;pointer-events:none;}
  .lp-corner-tl{top:0;right:0;border-top:1px solid rgba(200,169,106,.25);border-right:1px solid rgba(200,169,106,.25);}
  .lp-corner-br{bottom:0;left:0;border-bottom:1px solid rgba(200,169,106,.25);border-left:1px solid rgba(200,169,106,.25);}

  .lp-panel-inner{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;position:relative;z-index:1;gap:22px;}
  .lp-mandala{opacity:.95;}
  .lp-brand-text{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;width:100%;}
  .lp-brand-name{font-size:28px;font-weight:900;color:var(--gold);letter-spacing:-.5px;line-height:1.15;}
  .lp-brand-tag{font-size:12px;color:rgba(200,169,106,.45);font-weight:500;}
  .lp-panel-footer{position:absolute;bottom:28px;left:0;right:0;text-align:center;}
  .lp-panel-quote{font-size:11px;color:rgba(200,169,106,.22);font-weight:500;letter-spacing:.1em;}

  .lp-rule{display:flex;align-items:center;width:100%;}
  .lp-rule-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,106,.35),transparent);}
  .lp-rule-diamond{width:5px;height:5px;background:rgba(200,169,106,.5);transform:rotate(45deg);margin:0 10px;flex-shrink:0;}

  /* Lang toggle */
  .lp-lang-toggle{display:flex;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(200,169,106,.20);border-radius:10px;padding:3px;}
  .lp-lang-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:none;background:transparent;color:rgba(200,169,106,.4);font-size:12px;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;transition:all .18s;white-space:nowrap;}
  .lp-lang-btn:hover:not(.lp-lang-btn--active){color:rgba(200,169,106,.7);background:rgba(200,169,106,.07);}
  .lp-lang-btn--active{background:rgba(200,169,106,.16);color:var(--gold);}
  .lp-lang-flag{font-size:15px;line-height:1;}
  .lp-lang-name{font-size:11.5px;}
  .lp-lang-sep{width:1px;height:18px;background:rgba(200,169,106,.15);flex-shrink:0;}
  .lp-lang-toggle-mobile{display:none;justify-content:center;margin-bottom:20px;}
  .lp-lang-toggle-mobile .lp-lang-toggle{background:rgba(11,11,12,.04);border-color:rgba(200,169,106,.30);}
  .lp-lang-toggle-mobile .lp-lang-btn{color:var(--text3);}
  .lp-lang-toggle-mobile .lp-lang-btn--active{background:var(--black);color:var(--gold);}
  .lp-lang-toggle-mobile .lp-lang-sep{background:var(--border);}

  /* Form side */
  .lp-form-side{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 24px;background:var(--off-white);position:relative;min-height:100vh;align-self:stretch;}
  .lp-form-side::before{content:'';position:absolute;top:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(200,169,106,.04),transparent 65%);pointer-events:none;}
  .lp-form-wrap{width:100%;max-width:420px;animation:scaleIn .45s cubic-bezier(.4,0,.2,1) both;position:relative;z-index:1;}
  .lp-form-ornament{margin-bottom:24px;}
  .lp-form-header{margin-bottom:32px;text-align:end;}
  .lp-form-title{font-size:26px;font-weight:900;color:var(--text);letter-spacing:-.4px;}
  .lp-form-title::after{content:'';display:block;width:40px;height:3px;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:2px;margin-top:8px;}
  .lp-form-sub{font-size:13px;color:var(--text3);margin-top:6px;font-weight:500;}

  .lp-fields{display:flex;flex-direction:column;gap:16px;}
  .lp-field{display:flex;flex-direction:column;gap:7px;}
  .lp-label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;}
  .lp-label-icon{display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:rgba(200,169,106,.12);border-radius:5px;color:var(--gold);flex-shrink:0;}
  .lp-input{width:100%;padding:13px 16px;background:#fff;border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:16px;font-family:'Cairo',sans-serif;outline:none;transition:border-color .18s,box-shadow .18s;box-shadow:0 1px 3px rgba(11,11,12,.04);}
  .lp-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,169,106,.12),0 1px 3px rgba(11,11,12,.04);background:#FFFDF9;}
  .lp-input::placeholder{color:#bbb0a0;}
  .lp-input:disabled{opacity:.55;cursor:not-allowed;background:var(--cream);}
  .lp-input--error{border-color:#c0392b!important;box-shadow:0 0 0 3px rgba(192,57,43,.10)!important;}
  .lp-input--valid{border-color:#27ae60!important;box-shadow:0 0 0 3px rgba(39,174,96,.10)!important;}
  .lp-field-msg{font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;margin-top:2px;}
  .lp-field-msg--error{color:#c0392b;}
  .lp-field-msg--success{color:#27ae60;}
  .lp-error{display:flex;align-items:center;gap:8px;background:rgba(139,26,26,.06);border:1px solid rgba(139,26,26,.2);color:#8b1a1a;font-size:12.5px;padding:11px 14px;border-radius:9px;font-weight:600;}
  .lp-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:14px;background:var(--black);color:var(--gold);border:1px solid rgba(200,169,106,.25);border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;transition:all .18s;font-family:'Cairo',sans-serif;margin-top:4px;position:relative;overflow:hidden;}
  .lp-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(200,169,106,.08),transparent 60%);pointer-events:none;}
  .lp-btn:hover:not(:disabled){background:#1a1a1e;border-color:rgba(200,169,106,.5);box-shadow:0 4px 20px rgba(11,11,12,.15);color:var(--gold2);}
  .lp-btn:disabled{opacity:.45;cursor:not-allowed;}
  .lp-spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(200,169,106,.25);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;}
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
    .lp-form-wrap{max-width:100%;}
    .lp-form-ornament{margin-bottom:14px;}
    .lp-form-header{margin-bottom:22px;}
    .lp-btn{padding:16px;font-size:16px;}
    .lp-lang-btn{padding:8px 12px;}
  }
  @media(max-width:400px){
    .lp-panel-inner{padding:10px 16px;padding-top:calc(env(safe-area-inset-top,0px) + 10px);}
    .lp-form-side{padding:22px 16px;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 32px);}
    .lp-form-title{font-size:21px;}
    .lp-lang-btn{padding:7px 9px;}
    .lp-lang-flag{font-size:13px;}
  }
`;
