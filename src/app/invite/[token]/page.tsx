"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type InviteState =
  | { status: "loading" }
  | { status: "invalid"; reason: string }
  | { status: "valid"; school_name: string; type: string }
  | { status: "success"; school_name: string };

// ─── ERROR MESSAGES ───────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<
  string,
  { title: string; sub: string; icon: string }
> = {
  not_found: {
    icon: "🔗",
    title: "رابط الدعوة غير صالح",
    sub: "تأكد من الرابط أو تواصل مع مدير المدرسة للحصول على رابط جديد.",
  },
  disabled: {
    icon: "🚫",
    title: "تم تعطيل هذه الدعوة",
    sub: "قام مدير المدرسة بتعطيل هذا الرابط. تواصل معه للحصول على دعوة جديدة.",
  },
  expired: {
    icon: "⏰",
    title: "انتهت صلاحية الدعوة",
    sub: "انتهت مدة هذا الرابط. تواصل مع مدير المدرسة للحصول على رابط جديد.",
  },
  used: {
    icon: "✅",
    title: "تم استخدام هذه الدعوة مسبقاً",
    sub: "هذا الرابط مخصص لشخص واحد فقط وقد تم استخدامه. تواصل مع مدير المدرسة.",
  },
};

// ─── MINI MANDALA ─────────────────────────────────────────────────────────────

function MiniMandala() {
  const rings = [140, 120, 100, 82, 66, 52, 38, 26, 16];
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return {
      x2: Math.round((160 + 140 * Math.sin(a)) * 100) / 100,
      y2: Math.round((160 - 140 * Math.cos(a)) * 100) / 100,
    };
  });
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return {
      cx: Math.round((160 + 100 * Math.sin(a)) * 100) / 100,
      cy: Math.round((160 - 100 * Math.cos(a)) * 100) / 100,
    };
  });
  return (
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
      style={{ opacity: 0.1 }}
    >
      {rings.map((r, i) => (
        <circle
          key={i}
          cx="160"
          cy="160"
          r={r}
          stroke="#C8A96A"
          strokeWidth={i === 0 ? 0.7 : 0.4}
          opacity={0.08 + i * 0.08}
          strokeDasharray={i % 3 === 1 ? "3 5" : i % 3 === 2 ? "1 4" : "none"}
        />
      ))}
      {spokes.map((s, i) => (
        <line
          key={i}
          x1="160"
          y1="160"
          x2={s.x2}
          y2={s.y2}
          stroke="#C8A96A"
          strokeWidth="0.4"
          opacity="0.1"
        />
      ))}
      {petals.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r="28"
          stroke="#C8A96A"
          strokeWidth="0.4"
          opacity="0.08"
        />
      ))}
      <circle
        cx="160"
        cy="160"
        r="8"
        fill="none"
        stroke="#E5B93C"
        strokeWidth="0.6"
        opacity="0.3"
      />
      <circle cx="160" cy="160" r="3.5" fill="#E5B93C" opacity="0.5" />
    </svg>
  );
}

// ─── TEXT FIELD ───────────────────────────────────────────────────────────────

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="if-field">
      <label className="if-label">{label}</label>
      {hint && <span className="if-hint">{hint}</span>}
      <div className="if-input-wrap">
        <input
          type={isPassword && show ? "text" : type}
          className={`if-input ${error ? "error" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir="auto"
          autoComplete={
            type === "email"
              ? "email"
              : type === "password"
                ? "new-password"
                : "name"
          }
        />
        {isPassword && (
          <button
            type="button"
            className="if-eye"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
          >
            {show ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <span className="if-error">{error}</span>}
    </div>
  );
}

// ─── AVATAR UPLOAD ────────────────────────────────────────────────────────────

function AvatarUpload({
  preview,
  name,
  onFile,
}: {
  preview: string | null;
  name: string;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("") || "م";
  return (
    <div className="if-avatar-section">
      <button
        type="button"
        className="if-avatar-btn"
        onClick={() => ref.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="صورة الملف الشخصي"
            className="if-avatar-img"
          />
        ) : (
          <div className="if-avatar-placeholder">
            <span className="if-avatar-initials">{initials}</span>
            <div className="if-avatar-overlay">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
        )}
        {preview && (
          <div className="if-avatar-overlay-img">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0]);
        }}
      />
      <div className="if-avatar-info">
        <p className="if-avatar-label">الصورة الشخصية</p>
        <p className="if-avatar-sub">اختياري · PNG أو JPG · بحد أقصى 5MB</p>
      </div>
    </div>
  );
}

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "ضعيفة", "مقبولة", "جيدة", "قوية"];
  const colors = ["", "#7A1E1E", "#C8A96A", "#A8863E", "#2D8A4A"];
  return (
    <div className="if-strength">
      <div className="if-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="if-strength-bar"
            style={{ background: i <= score ? colors[score] : "var(--border)" }}
          />
        ))}
      </div>
      <span className="if-strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;

  const [inviteState, setInviteState] = useState<InviteState>({
    status: "loading",
  });
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // step 1 = basic info, step 2 = password

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid)
          setState({
            status: "valid",
            school_name: d.school_name,
            type: d.type,
          });
        else setState({ status: "invalid", reason: d.reason });
      })
      .catch(() => setState({ status: "invalid", reason: "not_found" }));

    function setState(s: InviteState) {
      setInviteState(s);
    }
  }, [token]);

  const handleAvatar = (f: File) => {
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "الاسم الكامل مطلوب";
    else if (form.full_name.trim().length < 3)
      errs.full_name = "الاسم يجب أن يكون 3 أحرف على الأقل";
    if (!form.email.trim()) errs.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "بريد إلكتروني غير صالح";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.password) errs.password = "كلمة المرور مطلوبة";
    else if (form.password.length < 8)
      errs.password = "يجب أن تكون 8 أحرف على الأقل";
    if (form.confirm !== form.password)
      errs.confirm = "كلمتا المرور غير متطابقتين";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setSubmitting(true);
    setSubmitError(null);

    // Build multipart form if there's an avatar, otherwise JSON
    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (avatarFile) {
      const fd = new FormData();
      fd.append("full_name", form.full_name.trim());
      fd.append("email", form.email.trim().toLowerCase());
      fd.append("password", form.password);
      fd.append("avatar", avatarFile);
      body = fd;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
    }

    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers,
      body,
    });
    const d = await res.json();

    if (d.success) {
      const schoolName =
        inviteState.status === "valid" ? inviteState.school_name : "";
      setInviteState({ status: "success", school_name: schoolName });
    } else {
      setSubmitError(d.error ?? "حدث خطأ. حاول مجدداً.");
    }
    setSubmitting(false);
  };

  // ── LOADING ──
  if (inviteState.status === "loading") {
    return (
      <div className="if-shell">
        <div className="if-loading">
          <div className="if-big-spin" />
          <span>جارٍ التحقق من الدعوة...</span>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── INVALID ──
  if (inviteState.status === "invalid") {
    const msg = ERROR_MESSAGES[inviteState.reason] ?? ERROR_MESSAGES.not_found;
    return (
      <div className="if-shell">
        <div className="if-bg-mandala">
          <MiniMandala />
        </div>
        <nav className="if-nav">
          <Image
            src="/ahlia.png"
            alt="بناء الأهلية"
            width={120}
            height={40}
            style={{
              objectFit: "contain",
              height: 32,
              width: "auto",
              opacity: 0.85,
            }}
            priority
          />
        </nav>
        <div className="if-center">
          <div className="if-error-card">
            <div className="if-error-icon">{msg.icon}</div>
            <h1 className="if-error-title">{msg.title}</h1>
            <p className="if-error-sub">{msg.sub}</p>
            <Link href="/login" className="if-back-btn">
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── SUCCESS ──
  if (inviteState.status === "success") {
    return (
      <div className="if-shell">
        <div className="if-bg-mandala">
          <MiniMandala />
        </div>
        <nav className="if-nav">
          <Image
            src="/ahlia.png"
            alt="بناء الأهلية"
            width={120}
            height={40}
            style={{
              objectFit: "contain",
              height: 32,
              width: "auto",
              opacity: 0.85,
            }}
            priority
          />
        </nav>
        <div className="if-center">
          <div className="if-success-card">
            <div className="if-success-anim">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="var(--border)"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="#2D8A4A"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="201"
                  strokeDashoffset="0"
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "36px 36px",
                  }}
                />
                <polyline
                  points="22,36 31,45 50,27"
                  stroke="#2D8A4A"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="if-success-title">تم إنشاء حسابك بنجاح! 🎉</h1>
            <p className="if-success-sub">
              مرحباً بك في <strong>{inviteState.school_name}</strong>.<br />
              يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور.
            </p>
            <Link href="/login" className="if-login-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              تسجيل الدخول الآن
            </Link>
          </div>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── VALID — SIGNUP FORM ──
  return (
    <div className="if-shell">
      <div className="if-bg-mandala">
        <MiniMandala />
      </div>

      <nav className="if-nav">
        <Image
          src="/ahlia.png"
          alt="بناء الأهلية"
          width={120}
          height={40}
          style={{
            objectFit: "contain",
            height: 32,
            width: "auto",
            opacity: 0.85,
          }}
          priority
        />
        <Link href="/login" className="if-nav-login">
          لدي حساب بالفعل
        </Link>
      </nav>

      <div className="if-center" dir="rtl">
        <div className="if-card">
          {/* Gold top bar */}
          <div className="if-card-bar" />

          {/* Header */}
          <div className="if-card-header">
            <div className="if-school-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p className="if-school-name">{inviteState.school_name}</p>
              <h1 className="if-card-title">إنشاء حساب معلم</h1>
            </div>
          </div>

          {/* Invite strip */}
          <div className="if-strip">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.52 9.11a19.79 19.79 0 01-3.07-8.67A2 2 0 012.46 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.54 6.54l1.27-.65a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            لقد تلقيت دعوة للانضمام كمعلم. أكمل بياناتك أدناه لإنشاء حسابك.
          </div>

          {/* Step indicator */}
          <div className="if-steps">
            <div className={`if-step ${step >= 1 ? "done" : ""}`}>
              <div className="if-step-dot">{step > 1 ? "✓" : "1"}</div>
              <span>المعلومات الأساسية</span>
            </div>
            <div className="if-step-line" />
            <div className={`if-step ${step >= 2 ? "active" : ""}`}>
              <div className="if-step-dot">{step >= 2 ? "2" : "2"}</div>
              <span>كلمة المرور</span>
            </div>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="if-step-body">
              {/* Avatar */}
              <AvatarUpload
                preview={avatarPreview}
                name={form.full_name}
                onFile={handleAvatar}
              />

              <Field
                label="الاسم الكامل"
                value={form.full_name}
                onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
                placeholder="مثال: محمد أحمد العلي"
                error={errors.full_name}
              />

              <Field
                label="البريد الإلكتروني"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="teacher@school.com"
                error={errors.email}
              />

              <button className="if-next-btn" onClick={goToStep2}>
                التالي
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="if-step-body">
              <button
                className="if-back-step"
                onClick={() => {
                  setStep(1);
                  setErrors({});
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                رجوع
              </button>

              <Field
                label="كلمة المرور"
                type="password"
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                placeholder="8 أحرف على الأقل"
                hint="يُنصح باستخدام حروف كبيرة وأرقام ورموز"
                error={errors.password}
              />

              <PasswordStrength password={form.password} />

              <Field
                label="تأكيد كلمة المرور"
                type="password"
                value={form.confirm}
                onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
                placeholder="أعد كتابة كلمة المرور"
                error={errors.confirm}
              />

              {submitError && (
                <div className="if-submit-error">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {submitError}
                </div>
              )}

              <button
                className="if-submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="if-mini-spin" />
                    جارٍ إنشاء الحساب...
                  </>
                ) : (
                  <>إنشاء الحساب والانضمام ✦</>
                )}
              </button>

              <p className="if-note">
                بإنشاء الحساب يمكنك لاحقاً تسجيل الدخول من{" "}
                <Link href="/login" className="if-note-link">
                  صفحة الدخول
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes float-m{0%,100%{transform:translate(-50%,-50%) rotate(0deg)}50%{transform:translate(-50%,-50%) rotate(0.5deg)}}
@keyframes success-pop{from{opacity:0;transform:scale(0.88) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes step-in{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}

:root{
  --gold:#C8A96A;--gold2:#E5B93C;--gold-l:rgba(200,169,106,0.08);--gold-b:rgba(200,169,106,0.18);
  --black:#0B0B0C;--text:#1E1C18;--text2:#3A3020;--text3:#8A7860;
  --surface:#FFFFFF;--border:#E4DDD0;--bg:#F5F3EE;
  --red:#7A1E1E;--red-l:rgba(122,30,30,0.07);--red-b:rgba(122,30,30,0.2);
  --green:#2D8A4A;
  --font:'Cairo',sans-serif;
}

.if-shell{min-height:100vh;background:var(--bg);font-family:var(--font);display:flex;flex-direction:column;position:relative;overflow:hidden}
.if-bg-mandala{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;animation:float-m 14s ease-in-out infinite;z-index:0}

/* Nav */
.if-nav{position:sticky;top:0;z-index:20;height:60px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;background:rgba(245,243,238,0.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(200,169,106,0.12)}
.if-nav-login{font-size:13px;font-weight:700;color:var(--text3);text-decoration:none;border:1px solid var(--border);padding:7px 16px;border-radius:9px;transition:all 0.15s}
.if-nav-login:hover{border-color:var(--gold-b);color:var(--text2)}

/* Center */
.if-center{flex:1;display:flex;align-items:center;justify-content:center;padding:28px 16px;position:relative;z-index:1}

/* Loading */
.if-loading{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--text3);font-size:14px;font-weight:600}
.if-big-spin{width:40px;height:40px;border:3px solid var(--gold-b);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}

/* Error */
.if-error-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:48px 40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;max-width:420px;width:100%;box-shadow:0 4px 24px rgba(26,26,31,0.06);animation:fadeUp 0.4s ease}
.if-error-icon{font-size:48px}
.if-error-title{font-size:20px;font-weight:900;color:var(--black);letter-spacing:-0.3px}
.if-error-sub{font-size:14px;color:var(--text3);line-height:1.7;max-width:320px}
.if-back-btn{display:inline-flex;align-items:center;gap:8px;background:var(--black);color:var(--gold);padding:11px 24px;border-radius:10px;font-size:13.5px;font-weight:700;text-decoration:none;margin-top:8px;transition:all 0.15s}
.if-back-btn:hover{background:#1a1a1f}

/* Success */
.if-success-card{background:var(--surface);border:1px solid rgba(45,138,74,0.2);border-radius:20px;padding:48px 40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;max-width:440px;width:100%;box-shadow:0 4px 24px rgba(45,138,74,0.08);animation:success-pop 0.5s cubic-bezier(0.22,1,0.36,1)}
.if-success-anim{margin-bottom:4px}
.if-success-title{font-size:21px;font-weight:900;color:var(--black)}
.if-success-sub{font-size:14px;color:var(--text3);line-height:1.75}
.if-success-sub strong{color:var(--black);font-weight:800}
.if-login-btn{display:inline-flex;align-items:center;gap:9px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--black);padding:13px 28px;border-radius:12px;font-size:14px;font-weight:900;text-decoration:none;margin-top:4px;transition:all 0.18s;box-shadow:0 4px 16px rgba(200,169,106,0.3)}
.if-login-btn:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(200,169,106,0.45)}

/* Form card */
.if-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;width:100%;max-width:480px;display:flex;flex-direction:column;gap:0;box-shadow:0 8px 40px rgba(26,26,31,0.08);animation:fadeUp 0.4s ease;position:relative;overflow:hidden}
.if-card-bar{height:3px;background:linear-gradient(90deg,var(--gold),var(--gold2));flex-shrink:0}
.if-card-header{display:flex;align-items:center;gap:14px;padding:24px 28px 0}
.if-school-icon{width:48px;height:48px;border-radius:14px;background:var(--black);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0}
.if-school-name{font-size:12px;font-weight:600;color:var(--text3);margin-bottom:2px}
.if-card-title{font-size:20px;font-weight:900;color:var(--black);letter-spacing:-0.3px}
.if-strip{display:flex;align-items:flex-start;gap:9px;background:var(--gold-l);border-top:1px solid var(--gold-b);border-bottom:1px solid var(--gold-b);padding:12px 28px;font-size:12.5px;color:var(--text2);line-height:1.65;margin-top:20px}

/* Steps */
.if-steps{display:flex;align-items:center;gap:0;padding:20px 28px 0}
.if-step{display:flex;align-items:center;gap:8px;flex:1}
.if-step-dot{width:26px;height:26px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--text3);flex-shrink:0;transition:all 0.2s}
.if-step.done .if-step-dot,.if-step.active .if-step-dot{border-color:var(--gold);background:var(--gold);color:var(--black)}
.if-step span{font-size:12px;font-weight:600;color:var(--text3)}
.if-step.done span,.if-step.active span{color:var(--text2)}
.if-step-line{flex:1;height:1.5px;background:var(--border);margin:0 8px}

/* Step body */
.if-step-body{display:flex;flex-direction:column;gap:16px;padding:20px 28px 28px;animation:step-in 0.25s ease}

/* Avatar */
.if-avatar-section{display:flex;align-items:center;gap:16px;background:#FAFAF7;border:1px solid var(--border);border-radius:14px;padding:14px}
.if-avatar-btn{width:64px;height:64px;border-radius:50%;border:2px dashed var(--gold-b);cursor:pointer;background:none;position:relative;overflow:hidden;flex-shrink:0;transition:border-color 0.15s}
.if-avatar-btn:hover{border-color:var(--gold)}
.if-avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--gold-l);border-radius:50%}
.if-avatar-initials{font-size:18px;font-weight:900;color:var(--gold);font-family:var(--font)}
.if-avatar-overlay,.if-avatar-overlay-img{position:absolute;inset:0;background:rgba(11,11,12,0.5);display:flex;align-items:center;justify-content:center;color:white;border-radius:50%;opacity:0;transition:opacity 0.15s}
.if-avatar-btn:hover .if-avatar-overlay,.if-avatar-btn:hover .if-avatar-overlay-img{opacity:1}
.if-avatar-img{width:100%;height:100%;object-fit:cover;display:block}
.if-avatar-info{display:flex;flex-direction:column;gap:3px}
.if-avatar-label{font-size:13px;font-weight:700;color:var(--text2)}
.if-avatar-sub{font-size:11.5px;color:var(--text3)}

/* Fields */
.if-field{display:flex;flex-direction:column;gap:5px}
.if-label{font-size:12.5px;font-weight:700;color:var(--text2)}
.if-hint{font-size:11.5px;color:var(--text3);margin-top:-2px}
.if-input-wrap{position:relative}
.if-input{width:100%;border:1.5px solid var(--border);border-radius:10px;padding:11px 14px;font-size:14px;font-family:var(--font);color:var(--text);background:#FAFAF7;outline:none;transition:border-color 0.15s,background 0.15s}
.if-input:focus{border-color:var(--gold-b);background:var(--surface);box-shadow:0 0 0 3px rgba(200,169,106,0.08)}
.if-input.error{border-color:var(--red-b);background:var(--red-l)}
.if-input::placeholder{color:var(--text3)}
.if-eye{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text3);display:flex;padding:2px;transition:color 0.15s}
.if-eye:hover{color:var(--text2)}
.if-error{font-size:11.5px;color:var(--red);font-weight:600}

/* Password strength */
.if-strength{display:flex;align-items:center;gap:10px;margin-top:-4px}
.if-strength-bars{display:flex;gap:4px;flex:1}
.if-strength-bar{flex:1;height:3px;border-radius:99px;transition:background 0.3s}
.if-strength-label{font-size:11.5px;font-weight:700;min-width:36px;text-align:start}

/* Submit error */
.if-submit-error{display:flex;align-items:center;gap:8px;background:var(--red-l);border:1px solid var(--red-b);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--red);font-weight:600}

/* Buttons */
.if-next-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--black);color:var(--gold);border:none;padding:13px;border-radius:11px;font-size:14px;font-weight:800;font-family:var(--font);cursor:pointer;transition:all 0.18s;margin-top:4px}
.if-next-btn:hover{background:#1a1a1f;box-shadow:0 4px 16px rgba(200,169,106,0.2)}
.if-submit-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--black);border:none;padding:13px;border-radius:11px;font-size:14.5px;font-weight:900;font-family:var(--font);cursor:pointer;transition:all 0.18s;box-shadow:0 4px 16px rgba(200,169,106,0.25)}
.if-submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(200,169,106,0.4)}
.if-submit-btn:disabled{opacity:0.55;cursor:not-allowed}
.if-back-step{display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);color:var(--text3);font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:9px;cursor:pointer;font-family:var(--font);transition:all 0.15s;width:fit-content}
.if-back-step:hover{border-color:var(--gold-b);color:var(--text2)}

/* Mini spin */
.if-mini-spin{width:13px;height:13px;border:2px solid rgba(0,0,0,0.15);border-top-color:var(--black);border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block;flex-shrink:0}

/* Note */
.if-note{font-size:12px;color:var(--text3);text-align:center;line-height:1.6}
.if-note-link{color:var(--gold);font-weight:700;text-decoration:none}
.if-note-link:hover{text-decoration:underline}

@media(max-width:520px){
  .if-card{border-radius:0;border-left:none;border-right:none;box-shadow:none}
  .if-card-header,.if-step-body,.if-steps{padding-left:20px;padding-right:20px}
  .if-strip{padding-left:20px;padding-right:20px}
  .if-center{padding:0;align-items:flex-start}
}
`;
