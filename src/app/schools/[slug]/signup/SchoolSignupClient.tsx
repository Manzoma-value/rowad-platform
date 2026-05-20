"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface School {
  id: string;
  name: string;
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

function Mandala({ size = 200, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={className} style={{ width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 200 200" fill="none" width="100%" height="100%">
        <circle cx="100" cy="100" r="92" stroke="#C8A96A" strokeWidth="0.3" opacity="0.08" />
        <circle cx="100" cy="100" r="86" stroke="#C8A96A" strokeWidth="0.3" opacity="0.06" />
        {PETAL_CIRCLES.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r="52" stroke="#C8A96A" strokeWidth="0.5" opacity="0.13" fill="none" />
        ))}
        <circle cx="100" cy="100" r="74" stroke="#C8A96A" strokeWidth="0.4" opacity="0.16" strokeDasharray="3 8" />
        <circle cx="100" cy="100" r="62" stroke="#E5B93C" strokeWidth="0.35" opacity="0.13" />
        <circle cx="100" cy="100" r="50" stroke="#C8A96A" strokeWidth="0.5" opacity="0.18" strokeDasharray="5 5" />
        <circle cx="100" cy="100" r="38" stroke="#C8A96A" strokeWidth="0.35" opacity="0.15" />
        <circle cx="100" cy="100" r="28" stroke="#E5B93C" strokeWidth="0.45" opacity="0.22" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="18" stroke="#C8A96A" strokeWidth="0.35" opacity="0.24" />
        <circle cx="100" cy="100" r="9" stroke="#E5B93C" strokeWidth="0.55" opacity="0.30" />
        {STAR_LINES.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#C8A96A" strokeWidth="0.35" opacity="0.16" />
        ))}
        {INNER_PETALS.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r="24" stroke="#C8A96A" strokeWidth="0.45" opacity="0.20" fill="none" />
        ))}
        <line x1="100" y1="73" x2="100" y2="127" stroke="#E5B93C" strokeWidth="0.6" opacity="0.24" />
        <line x1="76" y1="87" x2="124" y2="113" stroke="#E5B93C" strokeWidth="0.6" opacity="0.24" />
        <line x1="124" y1="87" x2="76" y2="113" stroke="#E5B93C" strokeWidth="0.6" opacity="0.24" />
        <circle cx="100" cy="100" r="7" fill="none" stroke="#E5B93C" strokeWidth="0.7" opacity="0.45" />
        <circle cx="100" cy="100" r="4" fill="none" stroke="#C8A96A" strokeWidth="0.45" opacity="0.55" />
        <circle cx="100" cy="100" r="2" fill="#E5B93C" opacity="0.7" />
      </svg>
    </div>
  );
}

function Rule({ dim = false }: { dim?: boolean }) {
  const c = dim ? "rgba(200,169,106,0.35)" : "rgba(200,169,106,0.5)";
  return (
    <div className="sp-rule">
      <div className="sp-rule-line" style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }} />
      <div className="sp-rule-diamond" style={{ background: c }} />
      <div className="sp-rule-line" style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }} />
    </div>
  );
}

/* ─── i18n ─── */
const STRINGS = {
  ar: {
    dir: "rtl" as const,
    title: "إنشاء حساب",
    sub: "أدخل بياناتك للانضمام إلى المدرسة",
    nameLabel: "الاسم الكامل",
    namePlaceholder: "محمد أحمد",
    emailLabel: "البريد الإلكتروني",
    passLabel: "كلمة المرور",
    cityLabel: "المدينة",
    cityPlaceholder: "الرياض",
    ageLabel: "العمر",
    agePlaceholder: "18",
    avatarLabel: "الصورة الشخصية",
    avatarHint: "اختياري — JPG أو PNG",
    avatarChange: "تغيير الصورة",
    btn: "إنشاء الحساب",
    loadingBtn: "جارٍ إنشاء الحساب...",
    uploadingBtn: "جارٍ رفع الصورة...",
    errEmpty: "من فضلك أدخل جميع الحقول المطلوبة",
    errAge: "العمر يجب أن يكون رقمًا صحيحًا",
    errPass: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    errServer: "تعذر الاتصال بالخادم، حاول مرة أخرى",
    haveAccount: "لديك حساب بالفعل؟",
    login: "تسجيل الدخول",
    poweredBy: "مدعومة من",
    backTo: "العودة إلى الصفحة الرئيسية",
    or: "أو",
  },
  sq: {
    dir: "ltr" as const,
    title: "Regjistrohu",
    sub: "Plotësoni të dhënat tuaja për t'u bashkuar me shkollën",
    nameLabel: "Emri i plotë",
    namePlaceholder: "Emri Mbiemri",
    emailLabel: "Email",
    passLabel: "Fjalëkalimi",
    cityLabel: "Qyteti",
    cityPlaceholder: "Tiranë",
    ageLabel: "Mosha",
    agePlaceholder: "18",
    avatarLabel: "Foto profili",
    avatarHint: "Opsionale — JPG ose PNG",
    avatarChange: "Ndrysho foton",
    btn: "Krijo llogarinë",
    loadingBtn: "Duke krijuar llogarinë...",
    uploadingBtn: "Duke ngarkuar foton...",
    errEmpty: "Ju lutemi plotësoni të gjitha fushat e kërkuara",
    errAge: "Mosha duhet të jetë një numër i vlefshëm",
    errPass: "Fjalëkalimi duhet të ketë të paktën 6 karaktere",
    errServer: "Gabim lidhjeje, provoni përsëri",
    haveAccount: "Keni tashmë një llogari?",
    login: "Hyrje",
    poweredBy: "E mundësuar nga",
    backTo: "Kthehu te faqja kryesore",
    or: "ose",
  },
} as const;

type Lang = "ar" | "sq";

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="sp-lang-toggle" dir="ltr">
      <button type="button" className={`sp-lang-btn${lang === "sq" ? " sp-lang-btn--active" : ""}`} onClick={() => onChange("sq")}>
        <span className="sp-lang-flag">🇦🇱</span>
        <span className="sp-lang-name">Shqip</span>
      </button>
      <div className="sp-lang-sep" />
      <button type="button" className={`sp-lang-btn${lang === "ar" ? " sp-lang-btn--active" : ""}`} onClick={() => onChange("ar")}>
        <span className="sp-lang-flag">🇸🇦</span>
        <span className="sp-lang-name">العربية</span>
      </button>
    </div>
  );
}

export default function SchoolSignupClient({ school }: { school: School }) {
  const [lang, setLang] = useState<Lang>(school.language === "sq" ? "sq" : "ar");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "creating" | "uploading">("idle");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const L = STRINGS[lang];
  const dir = L.dir;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignup = async () => {
    setError("");
    if (!fullName.trim() || !email.trim() || !password || !city.trim() || !age.trim()) {
      setError(L.errEmpty);
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 5 || ageNum > 120) {
      setError(L.errAge);
      return;
    }
    if (password.length < 6) {
      setError(L.errPass);
      return;
    }

    setLoading(true);
    setPhase("creating");

    try {
      const res = await fetch("/api/auth/school-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_slug: school.slug,
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          city: city.trim(),
          age: ageNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? L.errServer);
        return;
      }

      /* Upload avatar using the now-authenticated session */
      if (avatarFile) {
        setPhase("uploading");
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const ext = avatarFile.name.split(".").pop() ?? "jpg";
            const path = `profiles/${user.id}/avatar.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(path, avatarFile, { upsert: true });
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
              await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar_url: urlData.publicUrl, avatar_path: path }),
              });
            }
          }
        } catch {
          // Avatar upload failure is non-fatal — student can update it later
        }
      }

      window.location.href = "/student";
    } catch {
      setError(L.errServer);
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  };

  const btnLabel =
    phase === "uploading" ? L.uploadingBtn : phase === "creating" ? L.loadingBtn : L.btn;

  return (
    <>
      <main className="sp-shell" dir={dir}>
        {/* ── Brand panel ── */}
        <div className="sp-panel">
          <div className="sp-corner sp-corner-tl" />
          <div className="sp-corner sp-corner-br" />
          <div className="sp-panel-inner">
            <Mandala size={200} className="sp-mandala" />
            <div className="sp-brand-text">
              <Rule />
              <div className="sp-school-badge">{school.name.charAt(0)}</div>
              <h2 className="sp-brand-name">{school.name}</h2>
              {school.description && <p className="sp-brand-desc">{school.description}</p>}
              <Rule />
            </div>
            <LangToggle lang={lang} onChange={(l) => { setLang(l); setError(""); }} />
            <div className="sp-panel-footer">
              <p className="sp-panel-quote">
                {L.poweredBy}{" "}
                <span style={{ color: "rgba(200,169,106,0.5)", fontWeight: 700 }}>بناء الأهلية</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="sp-form-side">
          <div className="sp-form-wrap">
            <div className="sp-lang-toggle-mobile">
              <LangToggle lang={lang} onChange={(l) => { setLang(l); setError(""); }} />
            </div>

            <div className="sp-form-ornament"><Rule dim /></div>

            <div className="sp-form-header">
              <h1 className="sp-form-title">{L.title}</h1>
              <p className="sp-form-sub">{L.sub}</p>
            </div>

            {/* Avatar picker */}
            <div className="sp-avatar-section">
              <div className="sp-avatar-wrap" onClick={() => fileRef.current?.click()}>
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="avatar" className="sp-avatar-img" />
                ) : (
                  <div className="sp-avatar-placeholder">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
                <div className="sp-avatar-overlay">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              </div>
              <div className="sp-avatar-meta">
                <span className="sp-avatar-label">{L.avatarLabel}</span>
                <span className="sp-avatar-hint">{L.avatarHint}</span>
                {avatarPreview && (
                  <button type="button" className="sp-avatar-change" onClick={() => fileRef.current?.click()}>
                    {L.avatarChange}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
            </div>

            <div className="sp-fields">
              <div className="sp-field">
                <label className="sp-label">
                  <span className="sp-label-icon">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                    </svg>
                  </span>
                  {L.nameLabel}
                </label>
                <input type="text" className="sp-input" placeholder={L.namePlaceholder} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} suppressHydrationWarning />
              </div>

              <div className="sp-field">
                <label className="sp-label">
                  <span className="sp-label-icon">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  {L.emailLabel}
                </label>
                <input type="email" className="sp-input" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} dir="ltr" suppressHydrationWarning />
              </div>

              <div className="sp-field">
                <label className="sp-label">
                  <span className="sp-label-icon">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  {L.passLabel}
                </label>
                <input type="password" className="sp-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} dir="ltr" suppressHydrationWarning />
              </div>

              <div className="sp-row">
                <div className="sp-field sp-field-grow">
                  <label className="sp-label">
                    <span className="sp-label-icon">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </span>
                    {L.cityLabel}
                  </label>
                  <input type="text" className="sp-input" placeholder={L.cityPlaceholder} value={city} onChange={(e) => setCity(e.target.value)} disabled={loading} suppressHydrationWarning />
                </div>
                <div className="sp-field sp-field-age">
                  <label className="sp-label">
                    <span className="sp-label-icon">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    {L.ageLabel}
                  </label>
                  <input type="number" className="sp-input" placeholder={L.agePlaceholder} value={age} onChange={(e) => setAge(e.target.value)} disabled={loading} min={5} max={120} dir="ltr" suppressHydrationWarning />
                </div>
              </div>

              {error && (
                <div className="sp-error">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </div>
              )}

              <button className="sp-btn" onClick={handleSignup} disabled={loading}>
                {loading ? <><span className="sp-spin" />{btnLabel}</> : L.btn}
              </button>
            </div>

            <div className="sp-divider">
              <div className="sp-divider-line" />
              <span className="sp-divider-text">{L.or}</span>
              <div className="sp-divider-line" />
            </div>

            <p className="sp-footer-text">
              {L.haveAccount}{" "}
              <Link href={`/schools/${school.slug}/login`} className="sp-link">{L.login}</Link>
            </p>

            <div className="sp-form-ornament" style={{ marginTop: 28 }}><Rule dim /></div>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <Link href={`/schools/${school.slug}`} className="sp-back-link">← {L.backTo}</Link>
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
    --gold: #C8A96A; --gold2: #E5B93C; --black: #0B0B0C;
    --off-white: #F5F3EE; --cream: #EDE8DF;
    --text: #1a1610; --text2: #4a3f2e; --text3: #8a7a5a; --border: #DDD5C4;
  }
  html, body { height: 100%; }
  .sp-shell { min-height: 100vh; display: flex; font-family: 'Cairo', sans-serif; background: var(--off-white); }
  .sp-panel {
    width: 420px; flex-shrink: 0; background: var(--black);
    display: flex; flex-direction: column; position: relative; overflow: hidden; animation: fadeIn 0.5s ease;
  }
  .sp-panel::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 20%, rgba(200,169,106,0.10) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 80%, rgba(229,185,60,0.06) 0%, transparent 50%);
    pointer-events: none;
  }
  .sp-corner { position: absolute; width: 80px; height: 80px; pointer-events: none; }
  .sp-corner-tl { top: 0; right: 0; border-top: 1px solid rgba(200,169,106,0.25); border-right: 1px solid rgba(200,169,106,0.25); }
  .sp-corner-br { bottom: 0; left: 0; border-bottom: 1px solid rgba(200,169,106,0.25); border-left: 1px solid rgba(200,169,106,0.25); }
  .sp-panel-inner {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 40px; position: sticky; top: 0; height: 100vh; z-index: 1; gap: 22px;
  }
  .sp-mandala { opacity: 0.95; }
  .sp-brand-text { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; width: 100%; }
  .sp-school-badge {
    width: 48px; height: 48px; border-radius: 12px;
    background: linear-gradient(135deg, #C8A96A 0%, #E5B93C 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900; color: var(--black); margin: 4px 0;
    box-shadow: 0 4px 16px rgba(200,169,106,0.25);
  }
  .sp-brand-name { font-size: 28px; font-weight: 900; color: var(--gold); letter-spacing: -0.5px; line-height: 1.15; }
  .sp-brand-desc { font-size: 12px; color: rgba(200,169,106,0.45); font-weight: 500; max-width: 280px; line-height: 1.6; }
  .sp-panel-footer { position: absolute; bottom: 32px; left: 0; right: 0; text-align: center; }
  .sp-panel-quote { font-size: 11px; color: rgba(200,169,106,0.22); font-weight: 400; }
  .sp-rule { display: flex; align-items: center; width: 100%; }
  .sp-rule-line { flex: 1; height: 1px; }
  .sp-rule-diamond { width: 5px; height: 5px; transform: rotate(45deg); margin: 0 10px; flex-shrink: 0; }
  .sp-lang-toggle {
    display: flex; align-items: center;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(200,169,106,0.2); border-radius: 10px; padding: 3px;
  }
  .sp-lang-btn {
    display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 7px; border: none;
    background: transparent; color: rgba(200,169,106,0.4); font-size: 12px; font-weight: 700;
    font-family: 'Cairo', sans-serif; cursor: pointer; transition: background 0.18s, color 0.18s; white-space: nowrap;
  }
  .sp-lang-btn:hover:not(.sp-lang-btn--active) { color: rgba(200,169,106,0.7); background: rgba(200,169,106,0.07); }
  .sp-lang-btn--active { background: rgba(200,169,106,0.16); color: var(--gold); }
  .sp-lang-flag { font-size: 15px; line-height: 1; }
  .sp-lang-name { font-size: 11.5px; }
  .sp-lang-sep { width: 1px; height: 18px; background: rgba(200,169,106,0.15); flex-shrink: 0; }
  .sp-lang-toggle-mobile { display: none; justify-content: center; margin-bottom: 20px; }
  .sp-lang-toggle-mobile .sp-lang-toggle { background: rgba(11,11,12,0.04); border-color: rgba(200,169,106,0.3); }
  .sp-lang-toggle-mobile .sp-lang-btn { color: var(--text3); }
  .sp-lang-toggle-mobile .sp-lang-btn--active { background: var(--black); color: var(--gold); }
  .sp-lang-toggle-mobile .sp-lang-sep { background: var(--border); }
  .sp-form-side {
    flex: 1; display: flex; align-items: flex-start; justify-content: center;
    padding: 60px 24px; background: var(--off-white); position: relative;
  }
  .sp-form-wrap { width: 100%; max-width: 440px; animation: scaleIn 0.45s cubic-bezier(0.4,0,0.2,1) both; position: relative; z-index: 1; }
  .sp-form-ornament { margin-bottom: 24px; }
  .sp-form-header { margin-bottom: 28px; text-align: right; }
  .sp-form-title { font-size: 26px; font-weight: 900; color: var(--text); letter-spacing: -0.4px; }
  .sp-form-title::after {
    content: ''; display: block; width: 40px; height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--gold2)); border-radius: 2px; margin-top: 8px;
  }
  .sp-form-sub { font-size: 13px; color: var(--text3); margin-top: 6px; font-weight: 500; }
  .sp-avatar-section {
    display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
    padding: 16px; background: white; border: 1px solid var(--border); border-radius: 14px;
  }
  .sp-avatar-wrap {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(200,169,106,0.08); border: 2px solid rgba(200,169,106,0.2);
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    position: relative; overflow: hidden; transition: border-color 0.18s;
  }
  .sp-avatar-wrap:hover { border-color: rgba(200,169,106,0.5); }
  .sp-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .sp-avatar-placeholder { color: rgba(200,169,106,0.4); display: flex; align-items: center; justify-content: center; }
  .sp-avatar-overlay {
    position: absolute; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    color: white; opacity: 0; transition: opacity 0.18s; border-radius: 50%;
  }
  .sp-avatar-wrap:hover .sp-avatar-overlay { opacity: 1; }
  .sp-avatar-meta { display: flex; flex-direction: column; gap: 4px; }
  .sp-avatar-label { font-size: 13px; font-weight: 700; color: var(--text2); }
  .sp-avatar-hint { font-size: 11px; color: var(--text3); }
  .sp-avatar-change {
    font-size: 11px; font-weight: 700; color: var(--gold); background: none; border: none;
    cursor: pointer; font-family: 'Cairo', sans-serif; padding: 0; text-align: start;
  }
  .sp-avatar-change:hover { color: var(--gold2); }
  .sp-fields { display: flex; flex-direction: column; gap: 14px; }
  .sp-field { display: flex; flex-direction: column; gap: 7px; }
  .sp-field-grow { flex: 1; }
  .sp-field-age { width: 110px; flex-shrink: 0; }
  .sp-row { display: flex; gap: 12px; }
  .sp-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px;
  }
  .sp-label-icon {
    display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;
    background: rgba(200,169,106,0.12); border-radius: 5px; color: var(--gold); flex-shrink: 0;
  }
  .sp-input {
    width: 100%; padding: 12px 16px; background: #FFFFFF;
    border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px;
    font-family: 'Cairo', sans-serif; outline: none;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    box-shadow: 0 1px 3px rgba(11,11,12,0.04);
  }
  .sp-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200,169,106,0.12); background: #FFFDF9; }
  .sp-input::placeholder { color: #bbb0a0; }
  .sp-input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--cream); }
  input[type=number].sp-input::-webkit-inner-spin-button { opacity: 0.4; }
  .sp-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.2);
    color: #8b1a1a; font-size: 12.5px; padding: 11px 14px; border-radius: 9px; font-weight: 600;
  }
  .sp-btn {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    width: 100%; padding: 14px; background: var(--black); color: var(--gold);
    border: 1px solid rgba(200,169,106,0.25); border-radius: 10px;
    font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.18s;
    font-family: 'Cairo', sans-serif; margin-top: 4px; position: relative; overflow: hidden;
  }
  .sp-btn::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(200,169,106,0.08) 0%, transparent 60%); pointer-events: none;
  }
  .sp-btn:hover:not(:disabled) { background: #1a1a1e; border-color: rgba(200,169,106,0.5); color: var(--gold2); }
  .sp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .sp-spin {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(200,169,106,0.25); border-top-color: var(--gold);
    border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  .sp-divider { display: flex; align-items: center; gap: 12px; margin: 22px 0 14px; }
  .sp-divider-line { flex: 1; height: 1px; background: var(--border); }
  .sp-divider-text { font-size: 12px; color: var(--text3); font-weight: 600; flex-shrink: 0; }
  .sp-footer-text { text-align: center; font-size: 13px; color: var(--text3); font-weight: 500; }
  .sp-link {
    color: var(--black); font-weight: 800; text-decoration: none;
    border-bottom: 1.5px solid var(--gold); padding-bottom: 1px; transition: color 0.15s, border-color 0.15s;
  }
  .sp-link:hover { color: #4a3012; border-color: var(--gold2); }
  .sp-back-link { font-size: 12px; color: var(--text3); text-decoration: none; font-weight: 600; transition: color 0.15s; }
  .sp-back-link:hover { color: var(--text2); }
  @media (max-width: 820px) {
    .sp-shell { flex-direction: column-reverse; }
    .sp-panel { width: 100%; }
    .sp-panel-inner { padding: 32px 24px; gap: 14px; height: auto; position: static; }
    .sp-mandala { width: 110px !important; height: 110px !important; }
    .sp-brand-name { font-size: 22px; }
    .sp-school-badge { width: 40px; height: 40px; font-size: 18px; }
    .sp-panel-footer { display: none; }
    .sp-panel .sp-lang-toggle { display: none; }
    .sp-lang-toggle-mobile { display: flex; }
    .sp-form-side { padding: 32px 20px; }
    .sp-form-ornament { margin-bottom: 16px; }
    .sp-form-header { margin-bottom: 20px; }
  }
  @media (max-width: 420px) {
    .sp-row { flex-direction: column; }
    .sp-field-age { width: 100%; }
  }
`;
