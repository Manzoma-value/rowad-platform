// login/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

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
          stroke="#C8A96A"
          strokeWidth="0.3"
          opacity="0.08"
        />
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke="#C8A96A"
          strokeWidth="0.3"
          opacity="0.06"
        />
        {PETAL_CIRCLES.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="52"
            stroke="#C8A96A"
            strokeWidth="0.5"
            opacity="0.13"
            fill="none"
          />
        ))}
        <circle
          cx="100"
          cy="100"
          r="74"
          stroke="#C8A96A"
          strokeWidth="0.4"
          opacity="0.16"
          strokeDasharray="3 8"
        />
        <circle
          cx="100"
          cy="100"
          r="62"
          stroke="#E5B93C"
          strokeWidth="0.35"
          opacity="0.13"
        />
        <circle
          cx="100"
          cy="100"
          r="50"
          stroke="#C8A96A"
          strokeWidth="0.5"
          opacity="0.18"
          strokeDasharray="5 5"
        />
        <circle
          cx="100"
          cy="100"
          r="38"
          stroke="#C8A96A"
          strokeWidth="0.35"
          opacity="0.15"
        />
        <circle
          cx="100"
          cy="100"
          r="28"
          stroke="#E5B93C"
          strokeWidth="0.45"
          opacity="0.22"
          strokeDasharray="3 4"
        />
        <circle
          cx="100"
          cy="100"
          r="18"
          stroke="#C8A96A"
          strokeWidth="0.35"
          opacity="0.24"
        />
        <circle
          cx="100"
          cy="100"
          r="9"
          stroke="#E5B93C"
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
            stroke="#C8A96A"
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
            stroke="#C8A96A"
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
          stroke="#E5B93C"
          strokeWidth="0.6"
          opacity="0.24"
        />
        <line
          x1="76"
          y1="87"
          x2="124"
          y2="113"
          stroke="#E5B93C"
          strokeWidth="0.6"
          opacity="0.24"
        />
        <line
          x1="124"
          y1="87"
          x2="76"
          y2="113"
          stroke="#E5B93C"
          strokeWidth="0.6"
          opacity="0.24"
        />
        <circle
          cx="100"
          cy="100"
          r="7"
          fill="none"
          stroke="#E5B93C"
          strokeWidth="0.7"
          opacity="0.45"
        />
        <circle
          cx="100"
          cy="100"
          r="4"
          fill="none"
          stroke="#C8A96A"
          strokeWidth="0.45"
          opacity="0.55"
        />
        <circle cx="100" cy="100" r="2" fill="#E5B93C" opacity="0.7" />
      </svg>
    </div>
  );
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");

  // Read URL params on the client side
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rd = params.get("redirectTo") ?? "";
    const err = params.get("error") ?? "";
    // Accept only same-origin relative paths
    if (rd.startsWith("/") && !rd.startsWith("//")) setRedirectTo(rd);
    if (err === "link_invalid")
      setError("رابط التأكيد غير صالح أو منتهي الصلاحية — يرجى التسجيل مجدداً أو طلب رابط جديد");
    else if (err === "oauth_failed")
      setError("فشل تسجيل الدخول عبر الجهة الخارجية");
    else if (err === "session_error")
      setError("حدث خطأ في الجلسة — يرجى المحاولة مجدداً");
  }, []);

  const showEmailError   = emailTouched && email.trim().length > 0 && !isValidEmail(email);
  const showEmailSuccess = emailTouched && isValidEmail(email);

  const handleLogin = async () => {
    setError("");
    setEmailTouched(true);
    if (!email.trim() || !password) {
      setError("من فضلك أدخل البريد الإلكتروني وكلمة المرور");
      return;
    }
    if (!isValidEmail(email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
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
          setError("يرجى تأكيد بريدك الإلكتروني أولاً — تحقق من صندوق الوارد وانقر على رابط التأكيد");
        } else {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }
        return;
      }
      if (!data.user) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || !profile) {
        setError("تعذر جلب بيانات الحساب");
        return;
      }
      const roleRoutes: Record<string, string> = {
        OWNER: "/owner",
        SCHOOL_ADMIN: "/school-admin",
        TEACHER: "/teacher",
        STUDENT: "/student",
      };
      // Use the redirectTo param if present and valid, otherwise fall back to role route
      const dest = (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//"))
        ? redirectTo
        : roleRoutes[profile.role];
      if (dest) window.location.href = dest;
      else setError("نوع الحساب غير معروف: " + profile.role);
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lp-shell" dir="rtl">
      {/* ── Left panel: brand ── */}
      <div className="lp-panel">
        {/* Corner ornament */}
        <div className="lp-corner lp-corner-tl" />
        <div className="lp-corner lp-corner-br" />

        <div className="lp-panel-inner">
          <Mandala size={220} className="lp-mandala" />

          <div className="lp-brand-text">
            <div className="lp-rule">
              <div className="lp-rule-line" />
              <div className="lp-rule-diamond" />
              <div className="lp-rule-line" />
            </div>
            <h2 className="lp-brand-name">بناء الأهلية</h2>
            <p className="lp-brand-tag">تمكين الإنسان .. بناء المستقبل</p>
            <div className="lp-rule" style={{ marginTop: 14 }}>
              <div className="lp-rule-line" />
              <div className="lp-rule-diamond" />
              <div className="lp-rule-line" />
            </div>
          </div>

          <div className="lp-panel-footer">
            <p className="lp-panel-quote">
              نمط دائري هندسي يعكس التركيز والنمو والاستمرار
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="lp-form-side">
        <div className="lp-form-wrap">
          {/* Top ornament */}
          <div className="lp-form-ornament">
            <div className="lp-rule">
              <div
                className="lp-rule-line"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(200,169,106,0.3), transparent)",
                }}
              />
              <div
                className="lp-rule-diamond"
                style={{ background: "rgba(200,169,106,0.4)" }}
              />
              <div
                className="lp-rule-line"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(200,169,106,0.3), transparent)",
                }}
              />
            </div>
          </div>

          <div className="lp-form-header">
            <h1 className="lp-form-title">تسجيل الدخول</h1>
            <p className="lp-form-sub">أدخل بياناتك للوصول إلى لوحتك</p>
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
                البريد الإلكتروني
              </label>
              <input
                type="email"
                className={`lp-input${showEmailError ? " lp-input--error" : showEmailSuccess ? " lp-input--valid" : ""}`}
                suppressHydrationWarning
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                disabled={loading}
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              {showEmailError && (
                <span className="lp-field-msg lp-field-msg--error">صيغة البريد الإلكتروني غير صحيحة</span>
              )}
              {showEmailSuccess && (
                <span className="lp-field-msg lp-field-msg--success">بريد إلكتروني صحيح ✓</span>
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
                كلمة المرور
              </label>
              <input
                type="password"
                className="lp-input"
                suppressHydrationWarning   
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
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
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button className="lp-btn" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <>
                  <span className="lp-spin" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                "دخول"
              )}
            </button>
          </div>

          <div className="lp-divider">
            <div className="lp-divider-line" />
            <span className="lp-divider-text">أو</span>
            <div className="lp-divider-line" />
          </div>

          <p className="lp-footer-text">
            لا تملك حسابًا؟{" "}
            <Link href="/signup" className="lp-link">
              إنشاء حساب طالب
            </Link>
          </p>

          {/* Bottom ornament */}
          <div className="lp-form-ornament" style={{ marginTop: 28 }}>
            <div className="lp-rule">
              <div
                className="lp-rule-line"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(200,169,106,0.3), transparent)",
                }}
              />
              <div
                className="lp-rule-diamond"
                style={{ background: "rgba(200,169,106,0.4)" }}
              />
              <div
                className="lp-rule-line"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(200,169,106,0.3), transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{css}</style>
    </main>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }

  :root {
    --gold:       #C8A96A;
    --gold2:      #E5B93C;
    --black:      #0B0B0C;
    --off-white:  #F5F3EE;
    --cream:      #EDE8DF;
    --text:       #1a1610;
    --text2:      #4a3f2e;
    --text3:      #8a7a5a;
    --border:     #DDD5C4;
  }

  html, body { height: 100%; }

  /* ── Shell: split layout ── */
.lp-shell {
  height: 100vh;
  display: flex;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
  background: var(--off-white);
  overflow: hidden;
}

  /* ── Left (brand) panel ── */
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
      radial-gradient(ellipse at 50% 20%, rgba(200,169,106,0.10) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(229,185,60,0.06) 0%, transparent 50%);
    pointer-events: none;
  }

  /* Corner ornaments */
  .lp-corner {
    position: absolute;
    width: 80px; height: 80px;
    pointer-events: none;
  }
  .lp-corner-tl {
    top: 0; right: 0;
    border-top: 1px solid rgba(200,169,106,0.25);
    border-right: 1px solid rgba(200,169,106,0.25);
  }
  .lp-corner-br {
    bottom: 0; left: 0;
    border-bottom: 1px solid rgba(200,169,106,0.25);
    border-left: 1px solid rgba(200,169,106,0.25);
  }

  .lp-panel-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    position: relative;
    z-index: 1;
    gap: 28px;
  }

  .lp-mandala { opacity: 0.95; }

  .lp-brand-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  .lp-brand-name {
    font-size: 32px;
    font-weight: 900;
    color: var(--gold);
    letter-spacing: -0.5px;
    font-family: 'Cairo', sans-serif;
    line-height: 1.1;
  }
  .lp-brand-tag {
    font-size: 12px;
    color: rgba(200,169,106,0.45);
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .lp-panel-footer {
    position: absolute;
    bottom: 32px;
    left: 0; right: 0;
    text-align: center;
  }
  .lp-panel-quote {
    font-size: 11px;
    color: rgba(200,169,106,0.22);
    font-weight: 400;
    letter-spacing: 0.3px;
  }

  /* Ornamental rule */
  .lp-rule {
    display: flex; align-items: center; gap: 0;
    width: 100%;
  }
  .lp-rule-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.35), transparent);
  }
  .lp-rule-diamond {
    width: 5px; height: 5px;
    background: rgba(200,169,106,0.5);
    transform: rotate(45deg);
    margin: 0 10px; flex-shrink: 0;
  }

  /* ── Right (form) side ── */
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
  /* Subtle geometric watermark background */
  .lp-form-side::before {
    content: '';
    position: absolute;
    top: -100px; left: -100px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(200,169,106,0.04) 0%, transparent 65%);
    pointer-events: none;
  }
  .lp-form-side::after {
    content: '';
    position: absolute;
    bottom: -60px; right: -60px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(229,185,60,0.03) 0%, transparent 65%);
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

  .lp-form-header {
    margin-bottom: 32px;
    text-align: right;
  }
  .lp-form-title {
    font-size: 26px;
    font-weight: 900;
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
  .lp-form-sub {
    font-size: 13px;
    color: var(--text3);
    margin-top: 6px;
    font-weight: 500;
  }

  /* Fields */
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
    background: rgba(200,169,106,0.12);
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
    font-size: 14px;
    font-family: 'Cairo', sans-serif;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    box-shadow: 0 1px 3px rgba(11,11,12,0.04);
  }
  .lp-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(200,169,106,0.12), 0 1px 3px rgba(11,11,12,0.04);
    background: #FFFDF9;
  }
  .lp-input::placeholder { color: #bbb0a0; }
  .lp-input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--cream); }
  .lp-input--error {
    border-color: #c0392b !important;
    box-shadow: 0 0 0 3px rgba(192,57,43,0.10), 0 1px 3px rgba(11,11,12,0.04) !important;
  }
  .lp-input--valid {
    border-color: #27ae60 !important;
    box-shadow: 0 0 0 3px rgba(39,174,96,0.10), 0 1px 3px rgba(11,11,12,0.04) !important;
  }
  .lp-field-msg {
    font-size: 12px; font-weight: 600;
    display: flex; align-items: center; gap: 5px;
    margin-top: 2px;
  }
  .lp-field-msg--error { color: #c0392b; }
  .lp-field-msg--success { color: #27ae60; }

  .lp-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(139,26,26,0.06);
    border: 1px solid rgba(139,26,26,0.2);
    color: #8b1a1a;
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
    border: 1px solid rgba(200,169,106,0.25);
    border-radius: 10px;
    font-size: 15px; font-weight: 800;
    cursor: pointer;
    transition: all 0.18s;
    font-family: 'Cairo', sans-serif;
    letter-spacing: -0.1px;
    margin-top: 4px;
    position: relative;
    overflow: hidden;
  }
  .lp-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(200,169,106,0.08) 0%, transparent 60%);
    pointer-events: none;
  }
  .lp-btn:hover:not(:disabled) {
    background: #1a1a1e;
    border-color: rgba(200,169,106,0.5);
    box-shadow: 0 4px 20px rgba(11,11,12,0.15);
    color: var(--gold2);
  }
  .lp-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .lp-spin {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(200,169,106,0.25);
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

  .lp-footer-text {
    text-align: center;
    font-size: 13px;
    color: var(--text3);
    font-weight: 500;
  }
  .lp-forgot {
    font-size: 12px; font-weight: 700;
    color: var(--gold); text-decoration: none;
    opacity: 0.8; transition: opacity 0.15s;
  }
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

  /* ── Responsive ── */
  @media (max-width: 820px) {
    .lp-shell { flex-direction: column-reverse; }
    .lp-panel {
      width: 100%;
      padding: 0;
      min-height: 260px;
    }
    .lp-panel-inner { padding: 36px 24px; gap: 20px; }
    .lp-mandala { width: 140px !important; height: 140px !important; }
    .lp-brand-name { font-size: 26px; }
    .lp-form-side { padding: 32px 20px; }
    .lp-form-ornament { margin-bottom: 16px; }
    .lp-form-header { margin-bottom: 24px; }
    .lp-panel-footer { display: none; }
  }
`;
